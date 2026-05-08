import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Gift, Search, Building2, CheckCircle, AlertCircle, Download, FileText } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import DynamicSearchBar from '@/components/catalog/DynamicSearchBar';

export default function Catalog() {
  const [products, setProducts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [user, setUser] = useState(null);
  const [userPoints, setUserPoints] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(null);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [redemptions, setRedemptions] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [prods, comps] = await Promise.all([
        base44.entities.Product.filter({ is_active: true }, 'points_cost'),
        base44.entities.Company.filter({ is_active: true }, 'order')
      ]);
      setProducts(prods);
      setCompanies(comps);
    } catch (err) {
      console.error('Erro ao carregar produtos/empresas:', err);
      setProducts([]);
      setCompanies([]);
    }

    const auth = await base44.auth.isAuthenticated();
    if (auth) {
      try {
        const me = await base44.auth.me();
        setUser(me);
        const [pts, reds] = await Promise.all([
          base44.entities.UserPoints.filter({ user_email: me.email }),
          base44.entities.Redemption.filter({ user_email: me.email }, '-created_date')
        ]);
        if (pts.length > 0) setUserPoints(pts[0]);
        setRedemptions(reds || []);
      } catch (err) {
        console.error('Erro ao carregar dados do usuário:', err);
      }
    }
    setLoading(false);
  };

  const handleRedeem = async (product) => {
    if (!user) { base44.auth.redirectToLogin('/catalog'); return; }
    const balance = userPoints?.balance || 0;
    if (balance < product.points_cost) {
      setError('Pontos insuficientes para este resgate.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setRedeeming(product.id);
    const company = companies.find(c => c.id === product.company_id);

    // Cria o resgate
    const redemption = await base44.entities.Redemption.create({
      user_email: user.email,
      user_name: user.full_name,
      product_id: product.id,
      product_name: product.name,
      company_id: product.company_id,
      company_name: company?.name || '',
      points_spent: product.points_cost,
      status: 'pending'
    });

    // Se for digital, processa a entrega automática
    if (product.type === 'digital') {
      try {
        const res = await base44.functions.invoke('processProductRedemption', {
          product_id: product.id,
          redemption_id: redemption.id
        });
        if (res.data.success) {
          // Armazena o conteúdo digital para mostrar depois
          setSuccess({ name: product.name, digital: res.data.digital_content, message: res.data.message });
        }
      } catch (err) {
        console.error('Erro ao processar produto digital:', err);
      }
    } else {
      setSuccess({ name: product.name, message: 'Resgate solicitado! A empresa entrará em contato.' });
    }

    await base44.entities.PointsTransaction.create({
      user_email: user.email,
      user_name: user.full_name,
      type: 'spent_redemption',
      points: -product.points_cost,
      product_id: product.id,
      company_id: product.company_id,
      description: `Resgatou "${product.name}"`
    });

    const newBalance = balance - product.points_cost;
    if (userPoints) {
      await base44.entities.UserPoints.update(userPoints.id, {
        balance: newBalance,
        total_spent: (userPoints.total_spent || 0) + product.points_cost
      });
    }

    setUserPoints(prev => prev ? { ...prev, balance: newBalance } : null);
    setRedeeming(null);
    setTimeout(() => setSuccess(null), 5000);
  };

  const companiesMap = companies.reduce((acc, c) => { acc[c.id] = c; return acc; }, {});

  // Filter by search and category (for DynamicSearchBar)
  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = selectedCompany === 'all' || p.company_id === selectedCompany;
    return matchSearch && matchCategory;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="font-grotesk font-bold text-3xl md:text-4xl">
                Catálogo de <span className="text-gold">Prêmios</span>
              </h1>
              <p className="text-muted-foreground mt-1">Troque seus pontos por produtos exclusivos</p>
            </div>
            {user && userPoints && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gold/10 border border-gold/30">
                <Star className="w-5 h-5 text-gold" />
                <span className="font-grotesk font-bold text-lg text-gold">{userPoints.balance?.toLocaleString()} pts</span>
                <span className="text-xs text-muted-foreground">disponíveis</span>
              </div>
            )}
          </div>

          {/* Notifications */}
          <AnimatePresence>
            {success && (
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-4 flex flex-col gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium">
                    {typeof success === 'string' ? `Resgate de "${success}" solicitado!` : success.message}
                  </span>
                </div>
                {typeof success === 'object' && success.digital && (
                  <div className="mt-2 p-3 bg-green-600/20 rounded-lg border border-green-500/50">
                    <p className="text-xs font-semibold text-green-300 mb-2">Seu Produto Digital:</p>
                    <div className="bg-background/50 p-2 rounded text-xs text-foreground break-all font-mono">
                      {success.digital}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(success.digital);
                        alert('Copiado para a área de transferência!');
                      }}
                      className="mt-2 w-full bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1.5 rounded transition-all"
                    >
                      Copiar
                    </button>
                  </div>
                )}
              </motion.div>
            )}
            {error && (
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-4 flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Redemptions Section */}
          {user && redemptions.length > 0 && (
            <div className="mb-8 p-6 bg-card border border-gold/20 rounded-2xl">
              <h2 className="font-grotesk font-bold text-xl mb-4 text-gold">Seus Resgates</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {redemptions.map(red => {
                  const prod = products.find(p => p.id === red.product_id);
                  const hasFile = prod?.digital_content && (prod.digital_content.startsWith('http') || prod.digital_content.includes('.'));
                  return (
                    <div key={red.id} className="bg-secondary rounded-lg p-4 border border-border">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-sm">{red.product_name}</h3>
                          <p className="text-xs text-muted-foreground">{red.company_name}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          red.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                          red.status === 'approved' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {red.status === 'delivered' ? '✓ Entregue' : red.status === 'approved' ? '⚡ Aprovado' : '⏳ Pendente'}
                        </span>
                      </div>
                      {hasFile && red.status === 'delivered' && prod?.digital_content && (
                        <a
                          href={prod.digital_content}
                          download
                          className="inline-flex items-center gap-2 text-xs bg-gold text-background hover:bg-gold-dark px-3 py-1.5 rounded-lg font-semibold transition-all"
                        >
                          <Download className="w-3 h-3" />
                          Baixar Arquivo
                        </a>
                      )}
                      {red.delivery_info && (
                        <p className="text-xs text-muted-foreground mt-2 italic">📬 {red.delivery_info}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dynamic Search */}
          <div className="mb-8">
            <DynamicSearchBar 
              products={products}
              companies={companies}
              onSearchChange={setSearch}
              onCategoryChange={setSelectedCompany}
              searchValue={search}
              selectedCategory={selectedCompany}
            />
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array(8).fill(0).map((_, i) => <div key={i} className="h-64 bg-card rounded-2xl animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Gift className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Nenhum produto encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((product, i) => {
                const company = companiesMap[product.company_id];
                const canAfford = (userPoints?.balance || 0) >= product.points_cost;
                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-card border border-border rounded-2xl overflow-hidden hover:border-gold/30 transition-all group"
                  >
                    <div className="aspect-square bg-secondary relative overflow-hidden">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Gift className="w-12 h-12 text-muted-foreground opacity-40" />
                        </div>
                      )}
                      {product.original_price && (
                        <div className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm rounded-full px-2.5 py-1">
                          <span className="text-xs font-semibold text-foreground">R$ {product.original_price.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="mb-3">
                        <h3 className="font-semibold text-sm mb-1 line-clamp-2">{product.name}</h3>
                        {company && (
                          <div className="flex items-center gap-1">
                            {company.logo_url && <img src={company.logo_url} alt={company.name} className="w-3.5 h-3.5 rounded-full object-cover" />}
                            <span className="text-xs text-muted-foreground">{company.name}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-gold" />
                          <span className="font-bold text-gold">{product.points_cost.toLocaleString()}</span>
                          <span className="text-xs text-muted-foreground">pts</span>
                        </div>
                        <button
                          onClick={() => handleRedeem(product)}
                          disabled={redeeming === product.id || (!canAfford && !!user)}
                          className={`text-xs font-bold px-4 py-2 rounded-full transition-all ${
                            !user
                              ? 'bg-gold/20 text-gold border border-gold/30 hover:bg-gold/30'
                              : canAfford
                              ? 'bg-gold text-background hover:bg-gold-dark glow-gold'
                              : 'bg-muted text-muted-foreground cursor-not-allowed'
                          }`}
                        >
                          {redeeming === product.id ? '...' : !user ? 'Entrar' : canAfford ? 'Resgatar' : 'Sem pts'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}