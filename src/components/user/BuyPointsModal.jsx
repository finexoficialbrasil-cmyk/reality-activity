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
import { newRequestId } from '@/lib/requestId';

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
      loadListings();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Erro ao criar listing:', err);
      toast.error(err.message || 'Erro ao criar anúncio de venda');
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
                  <h2 className="text-xl font-grotesk font-bold bg-gradient-to-r from-gold to-gold-dark bg-clip-text text-transparent">
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
                { id: 'transfer', label: 'Transferir', icon: Send },
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
                      ? 'bg-[linear-gradient(90deg,#E823E8_0%,#C026F7_50%,#8A2BE2_100%)] text-white shadow-[0_0_18px_rgba(232,35,232,0.55),inset_0_1px_0_rgba(255,255,255,0.3)] shadow-lg'
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

            {/* ==================== TAB: TRANSFERIR ==================== */}
            {activeTab === 'transfer' && step === 'form' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                {/* Info */}
                <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-gold/10 to-yellow-500/10 border border-gold/30 rounded-2xl">
                  <ShieldCheck className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gold font-medium leading-relaxed">
                    Transferência direta entre usuários. O pagamento é combinado entre as partes via WhatsApp. A plataforma apenas movimenta os pontos.
                  </p>
                </div>

                {/* Buscar Usuário */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground">Para quem deseja enviar?</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      value={searchEmail}
                      onChange={(e) => {
                        setSearchEmail(e.target.value);
                        setSelectedUser(null);
                      }}
                      placeholder="Email ou nome do usuário..."
                      className="h-12 pl-10 pr-10 bg-secondary/50 border-gold/20 focus:border-gold"
                    />
                    {searching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gold" />
                    )}
                  </div>

                  {/* Resultados da busca */}
                  <AnimatePresence>
                    {searchResults.length > 0 && !selectedUser && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute z-10 w-[calc(100%-3rem)] bg-card border border-gold/30 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto"
                      >
                        {searchResults.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => {
                              setSelectedUser(u);
                              setSearchEmail('');
                              setSearchResults([]);
                            }}
                            className="w-full flex items-center gap-3 p-3 hover:bg-gold/10 transition-colors text-left"
                          >
                            <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-gold" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{u.full_name}</p>
                              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                              <p className="text-xs text-gold truncate">Saldo: {(u.balance || 0).toLocaleString('pt-BR')} pts</p>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Usuário selecionado */}
                  {selectedUser && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center justify-between p-3 bg-gold/10 border border-gold/30 rounded-xl"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-gold" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{selectedUser.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{selectedUser.email}</p>
                          <p className="text-xs text-gold">Saldo: {(selectedUser.balance || 0).toLocaleString('pt-BR')} pts</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedUser(null)}
                        className="p-1.5 hover:bg-gold/20 rounded-lg transition-colors flex-shrink-0"
                      >
                        <XCircle className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </motion.div>
                  )}
                </div>

                {/* Quantidade de Pontos */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground">Quantidade de Pontos</label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={transferPoints}
                      onChange={(e) => setTransferPoints(e.target.value)}
                      placeholder="Ex: 500"
                      className="h-12 text-lg pr-16 bg-secondary/50 border-gold/20 focus:border-gold"
                      min="1"
                      max={userPoints}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gold font-bold text-sm">pts</span>
                  </div>
                  {points > userPoints && (
                    <p className="text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Saldo insuficiente
                    </p>
                  )}
                  {/* Sugestões */}
                  <div className="flex gap-2 flex-wrap">
                    {[50, 100, 250, 500].map((pts) => (
                      <button
                        key={pts}
                        onClick={() => setTransferPoints(pts.toString())}
                        className="px-3 py-1.5 rounded-lg bg-secondary/50 hover:bg-gold/10 border border-border hover:border-gold/30 transition-all text-xs font-medium"
                      >
                        {pts} pts
                      </button>
                    ))}
                  </div>
                </div>

                {/* Valor da Transação */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-semibold text-foreground">Valor da Transação</label>
                    <button
                      onClick={() => setUseDefaultPrice(!useDefaultPrice)}
                      className="text-xs text-gold hover:underline"
                    >
                      {useDefaultPrice ? 'Definir valor customizado' : 'Usar valor padrão'}
                    </button>
                  </div>
                  {useDefaultPrice ? (
                    <div className="p-4 bg-secondary/50 rounded-xl border border-border/50">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {points} pts × R$ {DEFAULT_PRICE_PER_POINT.toFixed(2)}
                        </span>
                        <span className="text-lg font-bold text-gold">
                          {formatCurrency(calculatedPrice)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={transferPrice}
                        onChange={(e) => setTransferPrice(e.target.value)}
                        placeholder="0,00"
                        className="h-12 pl-10 bg-secondary/50 border-gold/20 focus:border-gold"
                      />
                    </div>
                  )}
                </div>

                {/* Observação */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground">Observação (opcional)</label>
                  <Input
                    type="text"
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                    placeholder="Ex: Pagamento pelo anúncio X..."
                    className="h-11 bg-secondary/50 border-gold/20 focus:border-gold"
                    maxLength={100}
                  />
                </div>

                {/* Resumo e Botão */}
                {selectedUser && points > 0 && points <= userPoints && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-gold/15 to-yellow-500/10 border border-gold/30 rounded-2xl p-5 space-y-3"
                  >
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Resumo da Transferência</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Destinatário:</span>
                        <span className="font-medium text-foreground">{selectedUser.full_name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Pontos:</span>
                        <span className="font-bold text-gold">{points.toLocaleString('pt-BR')} pts</span>
                      </div>
                      <div className="h-px bg-gold/20" />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Valor combinado:</span>
                        <span className="font-bold text-foreground">{formatCurrency(calculatedPrice)}</span>
                      </div>
                    </div>
                    <Button
                      onClick={handleTransfer}
                      className="w-full h-12 bg-[linear-gradient(90deg,#E823E8_0%,#C026F7_50%,#8A2BE2_100%)] text-white shadow-[0_0_18px_rgba(232,35,232,0.55),inset_0_1px_0_rgba(255,255,255,0.3)] hover:opacity-90 font-bold rounded-xl text-base mt-2"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Confirmar Transferência
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Step: Confirmando */}
            {activeTab === 'transfer' && step === 'confirming' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="text-center space-y-3">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-20 h-20 rounded-full bg-gold/20 border-2 border-gold flex items-center justify-center mx-auto"
                  >
                    <ArrowRightLeft className="w-9 h-9 text-gold" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-foreground">Confirmar Transferência</h3>
                  <p className="text-sm text-muted-foreground">Revise os dados antes de confirmar</p>
                </div>

                <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-border">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">De</p>
                      <p className="text-sm font-semibold">{user.full_name}</p>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <div className="p-2 bg-gold/10 rounded-full">
                      <ArrowRightLeft className="w-5 h-5 text-gold rotate-90" />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-3 border-t border-border">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Para</p>
                      <p className="text-sm font-semibold">{selectedUser?.full_name}</p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-gold/15 to-yellow-500/10 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Pontos</span>
                      <span className="text-lg font-bold text-gold">{points.toLocaleString('pt-BR')} pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Valor</span>
                      <span className="text-lg font-bold">{formatCurrency(calculatedPrice)}</span>
                    </div>
                    {transferNote && (
                      <div className="pt-2 border-t border-gold/20">
                        <p className="text-xs text-muted-foreground">Obs: {transferNote}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep('form')}
                    className="flex-1 h-12 rounded-xl border-gold/20"
                  >
                    Voltar
                  </Button>
                  <Button
                    onClick={confirmTransfer}
                    className="flex-1 h-12 bg-[linear-gradient(90deg,#E823E8_0%,#C026F7_50%,#8A2BE2_100%)] text-white shadow-[0_0_18px_rgba(232,35,232,0.55),inset_0_1px_0_rgba(255,255,255,0.3)] font-bold rounded-xl"
                  >
                    Confirmar
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step: Processando */}
            {activeTab === 'transfer' && step === 'processing' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center space-y-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  className="w-16 h-16 rounded-full border-4 border-gold/30 border-t-gold mx-auto"
                />
                <p className="text-lg font-semibold text-foreground">Processando transferência...</p>
                <p className="text-sm text-muted-foreground">Movimentando os pontos</p>
              </motion.div>
            )}

            {/* Step: Sucesso */}
            {activeTab === 'transfer' && step === 'success' && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-8 text-center space-y-5">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-400 flex items-center justify-center mx-auto"
                >
                  <CheckCircle className="w-10 h-10 text-green-400" />
                </motion.div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground">Transferência Concluída!</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    <span className="text-gold font-bold">{points.toLocaleString('pt-BR')} pontos</span> enviados para {selectedUser?.full_name}
                  </p>
                </div>
                <Button
                  onClick={() => {
                    resetForm();
                    onClose();
                  }}
                  className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-400 text-background font-bold rounded-xl"
                >
                  Concluir
                </Button>
              </motion.div>
            )}

            {/* Step: Erro */}
            {activeTab === 'transfer' && step === 'error' && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-8 text-center space-y-5">
                <div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-400 flex items-center justify-center mx-auto">
                  <XCircle className="w-10 h-10 text-red-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground">Erro na Transferência</h3>
                  <p className="text-sm text-muted-foreground mt-2">Não foi possível completar a operação</p>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={resetForm}
                    className="flex-1 h-12 rounded-xl"
                  >
                    Tentar Novamente
                  </Button>
                  <Button
                    onClick={onClose}
                    className="flex-1 h-12 bg-secondary rounded-xl"
                  >
                    Fechar
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ==================== TAB: MARKETPLACE ==================== */}
            {activeTab === 'marketplace' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                {/* Botão Vender */}
                {!showSellForm ? (
                  <Button
                    onClick={() => setShowSellForm(true)}
                    className="w-full h-12 bg-[linear-gradient(90deg,#E823E8_0%,#C026F7_50%,#8A2BE2_100%)] text-white shadow-[0_0_18px_rgba(232,35,232,0.55),inset_0_1px_0_rgba(255,255,255,0.3)] hover:opacity-90 font-bold rounded-xl"
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

                    <div className="flex items-center justify-between bg-secondary/40 rounded-lg px-3 py-2">
                      <span className="text-xs text-muted-foreground">Saldo disponível para vender</span>
                      <span className="text-sm font-bold text-gold">{Number(userPoints || 0).toLocaleString('pt-BR')} pts</span>
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
                        className="w-full h-11 bg-[linear-gradient(90deg,#E823E8_0%,#C026F7_50%,#8A2BE2_100%)] text-white shadow-[0_0_18px_rgba(232,35,232,0.55),inset_0_1px_0_rgba(255,255,255,0.3)] font-bold rounded-xl text-sm disabled:opacity-50"
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