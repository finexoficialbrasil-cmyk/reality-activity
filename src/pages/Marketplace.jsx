import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/layout/Navbar';
import ContactSellerDialog from '@/components/user/ContactSellerDialog';
import { newRequestId } from '@/lib/requestId';
import {
  ArrowLeft, Store, Search, Loader2, Tag, Clock,
  User, ShieldCheck, Filter, MessageCircle, TrendingUp,
  Wallet, Plus, X, Sparkles, ArrowRightLeft, CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const DEFAULT_PRICE_PER_POINT = 0.01;

export default function Marketplace() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userPoints, setUserPoints] = useState(0);
  const [userPointsRecord, setUserPointsRecord] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [activeTab, setActiveTab] = useState('marketplace'); // marketplace | history

  // Marketplace
  const [listings, setListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [filterMinPts, setFilterMinPts] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('recent'); // recent | price_asc | points_desc
  const [contactListing, setContactListing] = useState(null);

  // Histórico
  const [transfers, setTransfers] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Vender pontos
  const [showSellForm, setShowSellForm] = useState(false);
  const [sellPoints, setSellPoints] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellWhatsapp, setSellWhatsapp] = useState('');
  const [creatingListing, setCreatingListing] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const auth = await base44.auth.isAuthenticated();
      if (!auth) { base44.auth.redirectToLogin('/marketplace'); return; }
      const me = await base44.auth.me();
      setUser(me);
      const pts = await base44.entities.UserPoints.filter({ user_email: me.email });
      if (pts.length > 0) {
        setUserPointsRecord(pts[0]);
        setUserPoints(pts[0].balance || 0);
      }
    } catch (err) {
      console.error('Erro ao carregar usuário:', err);
    } finally {
      setLoadingUser(false);
    }
  };

  const loadListings = useCallback(async () => {
    setLoadingListings(true);
    try {
      const [all, mine] = await Promise.all([
        base44.entities.PointsListing.filter({ status: 'active' }, '-created_date', 100),
        base44.entities.PointsListing.filter({ seller_email: user?.email, status: 'active' }, '-created_date', 50)
      ]);
      setMyListings(mine || []);

      let filtered = all.filter(l => l.seller_email !== user?.email);
      if (filterMinPts) filtered = filtered.filter(l => l.points_amount >= parseInt(filterMinPts));
      if (filterMaxPrice) filtered = filtered.filter(l => l.total_price <= parseFloat(filterMaxPrice));

      // Ordenação
      if (sortBy === 'price_asc') {
        filtered = [...filtered].sort((a, b) => a.price_per_point - b.price_per_point);
      } else if (sortBy === 'points_desc') {
        filtered = [...filtered].sort((a, b) => b.points_amount - a.points_amount);
      }
      setListings(filtered);
    } catch (err) {
      console.error('Erro ao carregar marketplace:', err);
      setListings([]);
    } finally {
      setLoadingListings(false);
    }
  }, [user?.email, filterMinPts, filterMaxPrice, sortBy]);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const [sent, received] = await Promise.all([
        base44.entities.PointsTransfer.filter({ sender_email: user.email }, '-created_date', 50),
        base44.entities.PointsTransfer.filter({ receiver_email: user.email }, '-created_date', 50)
      ]);
      const merged = [...sent, ...received]
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
        .slice(0, 50);
      setTransfers(merged);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
      setTransfers([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      if (activeTab === 'marketplace') loadListings();
      if (activeTab === 'history') loadHistory();
    }
  }, [user, activeTab, loadListings, loadHistory]);

  const handleCreateListing = async () => {
    const pts = parseInt(sellPoints) || 0;
    const price = parseFloat(sellPrice) || 0;

    if (!pts || pts < 1) { toast.error('Digite a quantidade de pontos'); return; }
    if (pts > userPoints) { toast.error('Você não tem pontos suficientes'); return; }
    if (!price || price <= 0) { toast.error('Digite o valor da venda'); return; }
    const whatsappDigits = (sellWhatsapp || '').replace(/\D/g, '');
    if (whatsappDigits.length < 10) { toast.error('Informe um número de WhatsApp válido (com DDD)'); return; }

    setCreatingListing(true);
    try {
      const res = await base44.functions.invoke('createPointsListing', {
        points_amount: pts,
        total_price: price,
        whatsapp_number: whatsappDigits,
        request_id: newRequestId()
      });
      if (!res.data?.success) throw new Error(res.data?.error || 'Erro ao criar anúncio');
      toast.success('Seus pontos foram colocados à venda (reservados)!');
      setShowSellForm(false);
      setSellPoints('');
      setSellPrice('');
      setSellWhatsapp('');
      loadUser();
      loadListings();
    } catch (err) {
      console.error('Erro ao criar listing:', err);
      toast.error(err.message || 'Erro ao criar anúncio de venda');
    } finally {
      setCreatingListing(false);
    }
  };

  const handleCancelListing = async (listing) => {
    try {
      const res = await base44.functions.invoke('cancelPointsListing', {
        listing_id: listing.id,
        request_id: newRequestId()
      });
      if (!res.data?.success) throw new Error(res.data?.error || 'Erro ao cancelar anúncio');
      toast.success(res.data?.message || 'Anúncio cancelado');
      loadUser();
      loadListings();
    } catch (err) {
      toast.error(err.message || 'Erro ao cancelar anúncio');
    }
  };

  const formatCurrency = (val) => parseFloat(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

  if (loadingUser) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-border border-t-gold rounded-full animate-spin" />
    </div>
  );

  // Estatísticas do marketplace
  const bestPrice = listings.length > 0 ? Math.min(...listings.map(l => l.price_per_point)) : 0;
  const totalPointsAvailable = listings.reduce((sum, l) => sum + l.points_amount, 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-gold transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar ao Dashboard
            </button>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-gold/20 to-yellow-500/10 rounded-2xl border border-gold/20">
                  <Store className="w-7 h-7 text-gold" />
                </div>
                <div>
                  <h1 className="font-grotesk font-bold text-2xl md:text-3xl bg-gradient-to-r from-gold to-gold-dark bg-clip-text text-transparent">
                    Mercado de Pontos
                  </h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Compre e venda pontos com outros usuários
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-card border border-gold/20 rounded-2xl px-5 py-3">
                <Wallet className="w-5 h-5 text-coin" />
                <div>
                  <p className="text-xs text-muted-foreground">Seu saldo</p>
                  <p className="text-lg font-grotesk font-bold text-coin">{userPoints.toLocaleString('pt-BR')} pts</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Anúncios ativos', value: listings.length, icon: Store, color: 'text-gold' },
              { label: 'Pontos disponíveis', value: totalPointsAvailable.toLocaleString('pt-BR'), icon: TrendingUp, color: 'text-green-400' },
              { label: 'Melhor preço', value: bestPrice > 0 ? `R$ ${bestPrice.toFixed(4)}/pt` : '—', icon: Tag, color: 'text-accent' }
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3"
              >
                <div className="p-2 bg-secondary/50 rounded-xl">
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="font-grotesk font-bold text-lg text-foreground">{s.value}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-secondary/50 rounded-xl mb-6 max-w-md">
            {[
              { id: 'marketplace', label: 'Marketplace', icon: Store },
              { id: 'history', label: 'Histórico', icon: Clock }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-[linear-gradient(90deg,#E823E8_0%,#C026F7_50%,#8A2BE2_100%)] text-white shadow-[0_0_18px_rgba(232,35,232,0.55),inset_0_1px_0_rgba(255,255,255,0.3)] shadow-lg'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* ==================== TAB: MARKETPLACE ==================== */}
          {activeTab === 'marketplace' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Vender Meus Pontos */}
              {!showSellForm ? (
                <Button
                  onClick={() => setShowSellForm(true)}
                  className="w-full h-14 bg-[linear-gradient(90deg,#E823E8_0%,#C026F7_50%,#8A2BE2_100%)] text-white shadow-[0_0_18px_rgba(232,35,232,0.55),inset_0_1px_0_rgba(255,255,255,0.3)] hover:opacity-90 font-bold rounded-2xl text-base"
                >
                  <Tag className="w-5 h-5 mr-2" />
                  Vender Meus Pontos
                </Button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-gradient-to-br from-gold/10 to-purple-500/5 border border-gold/30 rounded-2xl p-6 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-gold flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> Criar Anúncio de Venda
                    </h3>
                    <button onClick={() => setShowSellForm(false)} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between bg-secondary/40 rounded-xl px-4 py-2.5">
                    <span className="text-xs text-muted-foreground">Saldo disponível para vender</span>
                    <span className="text-sm font-bold text-coin">{Number(userPoints || 0).toLocaleString('pt-BR')} pts</span>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Quantidade de pontos</label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={sellPoints}
                          onChange={(e) => setSellPoints(e.target.value)}
                          placeholder="500"
                          className="h-11 pr-12 bg-secondary/50 border-gold/20 focus:border-gold"
                          min="1"
                          max={userPoints}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-coin text-xs font-bold">pts</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Valor total (R$)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                        <Input
                          type="number"
                          step="0.01"
                          value={sellPrice}
                          onChange={(e) => setSellPrice(e.target.value)}
                          placeholder="5,00"
                          className="h-11 pl-10 bg-secondary/50 border-gold/20 focus:border-gold"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">WhatsApp *</label>
                      <div className="relative">
                        <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#25D366]" />
                        <Input
                          type="tel"
                          value={sellWhatsapp}
                          onChange={(e) => setSellWhatsapp(e.target.value)}
                          placeholder="(11) 99999-9999"
                          className="h-11 pl-10 bg-secondary/50 border-gold/20 focus:border-gold"
                        />
                      </div>
                    </div>
                  </div>

                  {sellPoints && sellPrice && (
                    <p className="text-xs text-muted-foreground">
                      Preço por ponto: <span className="text-coin font-bold">R$ {(parseFloat(sellPrice) / parseInt(sellPoints)).toFixed(4)}</span>
                    </p>
                  )}

                  <Button
                    onClick={handleCreateListing}
                    disabled={creatingListing}
                    className="w-full h-12 bg-[linear-gradient(90deg,#E823E8_0%,#C026F7_50%,#8A2BE2_100%)] text-white shadow-[0_0_18px_rgba(232,35,232,0.55),inset_0_1px_0_rgba(255,255,255,0.3)] font-bold rounded-xl disabled:opacity-50"
                  >
                    {creatingListing ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Publicando...</>
                    ) : (
                      <><Plus className="w-4 h-4 mr-2" /> Publicar Anúncio</>
                    )}
                  </Button>
                </motion.div>
              )}

              {/* Meus anúncios ativos */}
              {myListings.length > 0 && (
                <div className="bg-card border border-gold/20 rounded-2xl p-5">
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
                    <User className="w-4 h-4 text-gold" /> Meus anúncios ativos
                  </h3>
                  <div className="space-y-2">
                    {myListings.map((l) => (
                      <div key={l.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl">
                        <div>
                          <p className="text-sm font-semibold text-gold">{l.points_amount.toLocaleString('pt-BR')} pts</p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(l.total_price)} • R$ {l.price_per_point?.toFixed(4)}/pt</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelListing(l)}
                          className="h-8 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                        >
                          Cancelar
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Filtros e ordenação */}
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-[120px]">
                  <Input
                    type="number"
                    value={filterMinPts}
                    onChange={(e) => setFilterMinPts(e.target.value)}
                    placeholder="Min pts"
                    className="h-10 text-sm bg-secondary/50 border-border"
                  />
                </div>
                <div className="relative flex-1 min-w-[120px]">
                  <Input
                    type="number"
                    step="0.01"
                    value={filterMaxPrice}
                    onChange={(e) => setFilterMaxPrice(e.target.value)}
                    placeholder="Máx R$"
                    className="h-10 text-sm bg-secondary/50 border-border"
                  />
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="h-10 px-3 rounded-md bg-secondary/50 border border-border text-sm text-foreground focus:border-gold focus:outline-none"
                >
                  <option value="recent">Mais recentes</option>
                  <option value="price_asc">Menor preço</option>
                  <option value="points_desc">Mais pontos</option>
                </select>
                <Button
                  variant="outline"
                  onClick={loadListings}
                  className="h-10 px-4"
                >
                  <Filter className="w-4 h-4 mr-2" /> Filtrar
                </Button>
              </div>

              {/* Lista de Anúncios */}
              {loadingListings ? (
                <div className="py-16 text-center">
                  <Loader2 className="w-10 h-10 animate-spin text-gold mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Carregando marketplace...</p>
                </div>
              ) : listings.length === 0 ? (
                <div className="py-16 text-center space-y-3 bg-card border border-border rounded-2xl">
                  <Store className="w-14 h-14 text-muted-foreground/30 mx-auto" />
                  <p className="text-sm font-medium text-foreground">Nenhum anúncio disponível no momento</p>
                  <p className="text-xs text-muted-foreground">Seja o primeiro a vender pontos!</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {listings.map((listing, idx) => (
                    <motion.div
                      key={listing.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="bg-card border border-border hover:border-gold/30 rounded-2xl p-5 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gold/20 to-yellow-500/10 flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-gold" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{listing.seller_name}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(listing.created_date)}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <p className="text-xl font-bold text-gold">{listing.points_amount.toLocaleString('pt-BR')} <span className="text-xs font-normal text-muted-foreground">pts</span></p>
                          <p className="text-sm font-bold text-foreground">{formatCurrency(listing.total_price)}</p>
                          <p className="text-xs text-muted-foreground">R$ {listing.price_per_point?.toFixed(4)}/pt</p>
                        </div>
                      </div>

                      <Button
                        onClick={() => setContactListing(listing)}
                        className="w-full h-11 bg-[#25D366] text-white hover:bg-[#1ebe5d] font-semibold rounded-xl text-sm"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" /> Conversar no WhatsApp
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Aviso de segurança */}
              <div className="flex items-start gap-3 p-4 bg-accent/10 border border-accent/20 rounded-2xl">
                <ShieldCheck className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                <p className="text-xs text-accent leading-relaxed">
                  A RealityActivity é apenas uma plataforma de intermediação. A negociação e o pagamento são combinados diretamente entre as partes via WhatsApp. Sempre confira os dados do vendedor antes de efetuar o pagamento.
                </p>
              </div>
            </motion.div>
          )}

          {/* ==================== TAB: HISTÓRICO ==================== */}
          {activeTab === 'history' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              {loadingHistory ? (
                <div className="py-16 text-center">
                  <Loader2 className="w-10 h-10 animate-spin text-gold mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Carregando histórico...</p>
                </div>
              ) : transfers.length === 0 ? (
                <div className="py-16 text-center space-y-3 bg-card border border-border rounded-2xl">
                  <Clock className="w-14 h-14 text-muted-foreground/30 mx-auto" />
                  <p className="text-sm font-medium text-foreground">Nenhuma transferência realizada</p>
                  <p className="text-xs text-muted-foreground">Suas transferências aparecerão aqui</p>
                </div>
              ) : (
                transfers.map((t, idx) => {
                  const isSender = t.sender_email === user?.email;
                  return (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, x: isSender ? -10 : 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="flex items-center gap-4 p-5 bg-card border border-border rounded-2xl hover:border-gold/20 transition-colors"
                    >
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isSender ? 'bg-red-500/15' : 'bg-green-500/15'
                      }`}>
                        {isSender
                          ? <ArrowRightLeft className="w-5 h-5 text-red-400 rotate-180" />
                          : <CheckCircle className="w-5 h-5 text-green-400" />
                        }
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {isSender ? `Para: ${t.receiver_name}` : `De: ${t.sender_name}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(t.created_date)}
                          {t.type === 'marketplace' && (
                            <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0 border-gold/30 text-gold">
                              Marketplace
                            </Badge>
                          )}
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className={`text-base font-bold ${isSender ? 'text-red-400' : 'text-green-400'}`}>
                          {isSender ? '-' : '+'}{t.points_amount?.toLocaleString('pt-BR')} pts
                        </p>
                        {t.transaction_value > 0 && (
                          <p className="text-xs text-muted-foreground">{formatCurrency(t.transaction_value)}</p>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          )}
        </div>
      </div>

      <ContactSellerDialog listing={contactListing} onClose={() => setContactListing(null)} />
    </div>
  );
}