import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Gift, CheckCircle, AlertCircle, Download, FileText, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function UserCatalog({ user, userPoints, onRedeemed }) {
  const [products, setProducts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [prods, comps] = await Promise.all([
        base44.entities.Product.filter({ is_active: true }, 'points_cost'),
        base44.entities.Company.filter({ is_active: true }, 'order')
      ]);
      setProducts(prods);
      setCompanies(comps);
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
      toast.error('Erro ao carregar catálogo');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (product) => {
    if (!userPoints || userPoints.balance < product.points_cost) {
      toast.error(`Saldo insuficiente. Você precisa de ${product.points_cost} pontos.`);
      return;
    }

    setRedeeming(product.id);
    const company = companies.find(c => c.id === product.company_id);

    try {
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
            setSuccess({ name: product.name, digital: res.data.digital_content, message: res.data.message });
          }
        } catch (err) {
          console.error('Erro ao processar produto digital:', err);
        }
      } else {
        setSuccess({ name: product.name, message: 'Resgate solicitado! A empresa entrará em contato.' });
      }

      // Registra transação
      await base44.entities.PointsTransaction.create({
        user_email: user.email,
        user_name: user.full_name,
        type: 'spent_redemption',
        points: -product.points_cost,
        product_id: product.id,
        company_id: product.company_id,
        description: `Resgatou "${product.name}"`
      });

      // Atualiza saldo
      const newBalance = userPoints.balance - product.points_cost;
      await base44.entities.UserPoints.update(userPoints.id, {
        balance: newBalance,
        total_spent: (userPoints.total_spent || 0) + product.points_cost
      });

      toast.success('Resgate realizado com sucesso!');
      setTimeout(() => setSuccess(null), 5000);
      if (onRedeemed) onRedeemed();
    } catch (err) {
      console.error('Erro ao resgatar:', err);
      toast.error('Erro ao resgatar: ' + (err.message || 'Tente novamente'));
    } finally {
      setRedeeming(null);
    }
  };

  const companiesMap = companies.reduce((acc, c) => { acc[c.id] = c; return acc; }, {});
  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCompany = selectedCompany === 'all' || p.company_id === selectedCompany;
    return matchSearch && matchCompany;
  });

  return (
    <div className="space-y-6">
      {/* Success notification */}
      <AnimatePresence>
        {success && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex flex-col gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{success.message}</span>
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
                    toast.success('Copiado!');
                  }}
                  className="mt-2 w-full bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1.5 rounded transition-all"
                >
                  Copiar
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search and filter */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produtos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCompany} onValueChange={setSelectedCompany}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as empresas</SelectItem>
            {companies.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Products grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-40 bg-card rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Gift className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum produto encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((product) => {
            const company = companiesMap[product.company_id];
            const canAfford = userPoints && userPoints.balance >= product.points_cost;
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-secondary/50 border border-border rounded-xl overflow-hidden hover:border-gold/30 transition-all group"
              >
                <div className="aspect-video bg-muted relative overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Gift className="w-8 h-8 text-muted-foreground opacity-40" />
                    </div>
                  )}
                  {product.original_price && (
                    <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full px-2 py-1">
                      <span className="text-xs font-semibold text-foreground">R$ {product.original_price.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-sm mb-1 line-clamp-2">{product.name}</h3>
                  {company && (
                    <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                      {company.logo_url && <img src={company.logo_url} alt={company.name} className="w-3 h-3 rounded-full object-cover" />}
                      {company.name}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-gold" />
                      <span className="font-bold text-gold text-sm">{product.points_cost}</span>
                    </div>
                    <button
                      onClick={() => handleRedeem(product)}
                      disabled={redeeming === product.id || !canAfford}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all ${
                        canAfford
                          ? 'bg-gold text-background hover:bg-gold-dark'
                          : 'bg-muted text-muted-foreground cursor-not-allowed'
                      }`}
                    >
                      {redeeming === product.id ? '...' : canAfford ? 'Resgatar' : 'Sem pts'}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}