import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle, ArrowRightLeft, Store, Search, Loader2,
  CheckCircle, XCircle, Star, Zap, Send, Tag, Clock,
  User, TrendingUp, ShieldCheck, ChevronRight, Filter, MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import ContactSellerDialog from '@/components/user/ContactSellerDialog';

const DEFAULT_PRICE_PER_POINT = 0.01; // R$ 0,01 por ponto (preço sugerido)

export default function TransferPointsModal({ user, isOpen, onClose, onSuccess, userPoints = 0 }) {
  const [activeTab, setActiveTab] = useState('marketplace'); // marketplace, history
  const [step, setStep] = useState('form'); // form, confirming, processing, success, error
  
  // Transferência direta
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [transferPoints, setTransferPoints] = useState('');
  const [transferPrice, setTransferPrice] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [useDefaultPrice, setUseDefaultPrice] = useState(true);

  // Marketplace
  const [listings, setListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [filterMinPts, setFilterMinPts] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [buyingListing, setBuyingListing] = useState(null);

  // Histórico
  const [transfers, setTransfers] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Vender pontos
  const [showSellForm, setShowSellForm] = useState(false);
  const [sellPoints, setSellPoints] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellWhatsapp, setSellWhatsapp] = useState('');
  const [creatingListing, setCreatingListing] = useState(false);
  const [contactListing, setContactListing] = useState(null);

  const points = parseInt(transferPoints) || 0;
  const calculatedPrice = useDefaultPrice
    ? (points * DEFAULT_PRICE_PER_POINT).toFixed(2)
    : parseFloat(transferPrice || '0').toFixed(2);

  // Buscar usuários
  const searchUsers = useCallback(async (query) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await base44.functions.invoke('searchUsers', { query });
      setSearchResults(res.data?.users || []);
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [user.email]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchEmail);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchEmail, searchUsers]);

  // Carregar listings do marketplace
  const loadListings = useCallback(async () => {
    setLoadingListings(true);
    try {
      const all = await base44.entities.PointsListing.filter({ status: 'active' }, '-created_date', 50);

      let filtered = all.filter(l => l.seller_email !== user.email);

      if (filterMinPts) {
        filtered = filtered.filter(l => l.points_amount >= parseInt(filterMinPts));
      }
      if (filterMaxPrice) {
        filtered = filtered.filter(l => l.total_price <= parseFloat(filterMaxPrice));
      }

      setListings(filtered);
    } catch (err) {
      console.error('Erro ao carregar marketplace:', err);
      setListings([]);
    } finally {
      setLoadingListings(false);
    }
  }, [user.email, filterMinPts, filterMaxPrice]);

  // Carregar histórico
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const [sent, received] = await Promise.all([
        base44.entities.PointsTransfer.filter({ sender_email: user.email }, '-created_date', 30),
        base44.entities.PointsTransfer.filter({ receiver_email: user.email }, '-created_date', 30)
      ]);
      const merged = [...sent, ...received]
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
        .slice(0, 30);
      setTransfers(merged);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
      setTransfers([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [user.email]);

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'marketplace') loadListings();
      if (activeTab === 'history') loadHistory();
    }
  }, [isOpen, activeTab, loadListings, loadHistory]);

  // Executar transferência direta
  const handleTransfer = async () => {
    if (!selectedUser || !points || points < 1) {
      toast.error('Preencha todos os campos corretamente');
      return;
    }
    if (points > userPoints) {
      toast.error('Você não tem pontos suficientes');
      return;
    }

    setStep('confirming');
  };

  const confirmTransfer = async () => {
    setStep('processing');
    try {
      const res = await base44.functions.invoke('transferPoints', {
        sender_email: user.email,
        sender_name: user.full_name,
        receiver_email: selectedUser.email,
        receiver_name: selectedUser.full_name,
        points_amount: points,
        transaction_value: parseFloat(calculatedPrice),
        note: transferNote,
        type: 'direct'
      });
      if (!res.data?.success) throw new Error(res.data?.error || 'Erro ao transferir');

      setStep('success');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF6347']
      });
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Erro na transferência:', err);
      setStep('error');
      toast.error(err.message || 'Erro ao transferir pontos');
    }
  };

  // Criar listing de venda
  const handleCreateListing = async () => {
    const pts = parseInt(sellPoints) || 0;
    const price = parseFloat(sellPrice) || 0;

    if (!pts || pts < 1) {
      toast.error('Digite a quantidade de pontos');
      return;
    }
    if (pts > userPoints) {
      toast.error('Você não tem pontos suficientes');
      return;
    }
    if (!price || price <= 0) {
      toast.error('Digite o valor da venda');
      return;
    }
    const whatsappDigits = (sellWhatsapp || '').replace(/\D/g, '');
    if (whatsappDigits.length < 10) {
      toast.error('Informe um número de WhatsApp válido (com DDD)');
      return;
    }

    setCreatingListing(true);
    try {
      await base44.entities.PointsListing.create({
        seller_email: user.email,
        seller_name: user.full_name,
        points_amount: pts,
        price_per_point: price / pts,
        total_price: price,
        whatsapp_number: whatsappDigits,
        status: 'active'
      });

      toast.success('Seus pontos foram colocados à venda!');
      setShowSellForm(false);
      setSellPoints('');
      setSellPrice('');
      setSellWhatsapp('');
      loadListings();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Erro ao criar listing:', err);
      toast.error('Erro ao criar anúncio de venda');
    } finally {
      setCreatingListing(false);
    }
  };

  // Reset do formulário
  const resetForm = () => {
    setStep('form');
    setSearchEmail('');
    setSearchResults([]);
    setSelectedUser(null);
    setTransferPoints('');
    setTransferPrice('');
    setTransferNote('');
    setUseDefaultPrice(true);
  };

  const formatCurrency = (val) => {
    return parseFloat(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gradient-to-b from-card to-card/80 border border-gold/20 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        >
          {/* Header Fixo */}
          <div className="p-6 pb-0 space-y-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div className="p-2.5 bg-gold/10 rounded-xl">
                  <ArrowRightLeft className="w-5 h-5 text-gold" />
                </motion.div>
                <div>
                  <h2 className="text-xl font-grotesk font-bold bg-gradient-to-r from-gold to-yellow-300 bg-clip-text text-transparent">
                    Mercado de Pontos
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Seu saldo: <span className="text-gold font-bold">{userPoints.toLocaleString('pt-BR')} pts</span>
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-secondary/50 rounded-xl">
              {[
                { id: 'marketplace', label: 'Marketplace', icon: Store },
                { id: 'history', label: 'Histórico', icon: Clock }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    resetForm();
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-gold to-yellow-300 text-background shadow-lg'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Conteúdo Scrollável */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">

            {/* ==================== TAB: MARKETPLACE ==================== */}
            {activeTab === 'marketplace' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                {/* Botão Vender */}
                {!showSellForm ? (
                  <Button
                    onClick={() => setShowSellForm(true)}
                    className="w-full h-12 bg-gradient-to-r from-gold to-yellow-300 text-background hover:from-gold-dark hover:to-yellow-400 font-bold rounded-xl"
                  >
                    <Tag className="w-4 h-4 mr-2" />
                    Vender Meus Pontos
                  </Button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-gradient-to-br from-gold/10 to-yellow-500/5 border border-gold/30 rounded-2xl p-5 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-gold">Criar Anúncio de Venda</h4>
                      <button onClick={() => setShowSellForm(false)}>
                        <XCircle className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1">Quantidade de pontos</label>
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
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gold text-xs font-bold">pts</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1">Valor total da venda (R$)</label>
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
                        {sellPoints && sellPrice && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Preço por ponto: R$ {(parseFloat(sellPrice) / parseInt(sellPoints)).toFixed(4)}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1">WhatsApp para contato *</label>
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
                        <p className="text-xs text-muted-foreground mt-1">Os interesses falarão com você por este número.</p>
                      </div>

                      <Button
                        onClick={handleCreateListing}
                        disabled={creatingListing}
                        className="w-full h-11 bg-gradient-to-r from-gold to-yellow-300 text-background font-bold rounded-xl text-sm disabled:opacity-50"
                      >
                        {creatingListing ? (
                          <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Publicando...</>
                        ) : (
                          'Publicar Anúncio'
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Filtros */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="number"
                      value={filterMinPts}
                      onChange={(e) => setFilterMinPts(e.target.value)}
                      placeholder="Min pts"
                      className="h-9 text-xs bg-secondary/50 border-border"
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      type="number"
                      step="0.01"
                      value={filterMaxPrice}
                      onChange={(e) => setFilterMaxPrice(e.target.value)}
                      placeholder="Máx R$"
                      className="h-9 text-xs bg-secondary/50 border-border"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadListings}
                    className="h-9 px-3"
                  >
                    <Filter className="w-3 h-3" />
                  </Button>
                </div>

                {/* Lista de Anúncios */}
                {loadingListings ? (
                  <div className="py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-gold mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Carregando marketplace...</p>
                  </div>
                ) : listings.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <Store className="w-12 h-12 text-muted-foreground/30 mx-auto" />
                    <p className="text-sm text-muted-foreground">Nenhum anúncio disponível no momento</p>
                    <p className="text-xs text-muted-foreground">Seja o primeiro a vender pontos!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {listings.map((listing, idx) => (
                      <motion.div
                        key={listing.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-card border border-border hover:border-gold/30 rounded-2xl p-4 transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold/20 to-yellow-500/10 flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-gold" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{listing.seller_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(listing.created_date)}
                              </p>
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0 ml-3">
                            <p className="text-lg font-bold text-gold">{listing.points_amount.toLocaleString('pt-BR')} <span className="text-xs font-normal text-muted-foreground">pts</span></p>
                            <p className="text-sm font-bold text-foreground">{formatCurrency(listing.total_price)}</p>
                            <p className="text-xs text-muted-foreground">R$ {listing.price_per_point?.toFixed(4)}/pt</p>
                          </div>
                        </div>

                        <Button
                          onClick={() => setContactListing(listing)}
                          className="w-full h-10 mt-3 bg-[#25D366] text-white hover:bg-[#1ebe5d] font-semibold rounded-xl text-sm"
                          size="sm"
                        >
                          <MessageCircle className="w-4 h-4 mr-2" /> Conversar no WhatsApp
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ==================== TAB: HISTÓRICO ==================== */}
            {activeTab === 'history' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                {loadingHistory ? (
                  <div className="py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-gold mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Carregando histórico...</p>
                  </div>
                ) : transfers.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <Clock className="w-12 h-12 text-muted-foreground/30 mx-auto" />
                    <p className="text-sm text-muted-foreground">Nenhuma transferência realizada</p>
                  </div>
                ) : (
                  transfers.map((t, idx) => {
                    const isSender = t.sender_email === user.email;
                    return (
                      <motion.div
                        key={t.id}
                        initial={{ opacity: 0, x: isSender ? -10 : 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="flex items-center gap-3 p-4 bg-card border border-border rounded-2xl"
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isSender ? 'bg-red-500/15' : 'bg-green-500/15'
                        }`}>
                          {isSender
                            ? <ArrowRightLeft className="w-4 h-4 text-red-400 rotate-180" />
                            : <ArrowRightLeft className="w-4 h-4 text-green-400" />
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
        </motion.div>
      </motion.div>
      <ContactSellerDialog listing={contactListing} onClose={() => setContactListing(null)} />
    </AnimatePresence>
  );
}