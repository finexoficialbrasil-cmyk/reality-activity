import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Star, TrendingUp, Gift, History, ArrowUpRight, ArrowDownRight, Megaphone, ShoppingCart, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/layout/Navbar';
import UserAdvertisementForm from '@/components/user/UserAdvertisementForm';
import UserCatalog from '@/components/user/UserCatalog';
import UserAdvertisementsManager from '@/components/user/UserAdvertisementsManager';
import BuyPointsModal from '@/components/user/BuyPointsModal';
import EditAdModal from '@/components/user/EditAdModal';
import { Link } from 'react-router-dom';

export default function UserDashboard() {
  const [user, setUser] = useState(null);
  const [userPoints, setUserPoints] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editingAd, setEditingAd] = useState(null);
  const [showBuyPoints, setShowBuyPoints] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const auth = await base44.auth.isAuthenticated();
    if (!auth) { base44.auth.redirectToLogin('/dashboard'); return; }

    const me = await base44.auth.me();
    setUser(me);

    const [pts, txs, reds] = await Promise.all([
      base44.entities.UserPoints.filter({ user_email: me.email }),
      base44.entities.PointsTransaction.filter({ user_email: me.email }, '-created_date', 20),
      base44.entities.Redemption.filter({ user_email: me.email }, '-created_date', 10)
    ]);

    if (pts.length > 0) setUserPoints(pts[0]);
    setTransactions(txs);
    setRedemptions(reds);
    setLoading(false);
  };

  const typeLabels = {
    earned_watch: { label: 'Assistiu vídeo', color: 'text-green-400', icon: ArrowUpRight },
    earned_bonus: { label: 'Bônus completou', color: 'text-gold', icon: Star },
    spent_redemption: { label: 'Resgatou produto', color: 'text-destructive', icon: ArrowDownRight },
    manual_adjust: { label: 'Ajuste manual', color: 'text-muted-foreground', icon: TrendingUp },
    transfer_sent: { label: 'Transferiu pontos', color: 'text-destructive', icon: ArrowDownRight },
    transfer_received: { label: 'Recebeu pontos', color: 'text-green-400', icon: ArrowUpRight },
    marketplace_bought: { label: 'Comprou no mercado', color: 'text-destructive', icon: ShoppingCart },
    marketplace_sold: { label: 'Vendeu no mercado', color: 'text-gold', icon: Star },
  };

  const statusColors = {
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    approved: 'bg-green-500/10 text-green-400 border-green-500/20',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
    delivered: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-border border-t-gold rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="font-grotesk font-bold text-2xl md:text-3xl">
              Olá, <span className="text-gold">{user?.full_name?.split(' ')[0]}</span> 👋
            </h1>
            <p className="text-muted-foreground mt-1">Acompanhe seus pontos e resgates</p>
          </motion.div>

          {/* Tabs */}
          <div className="flex gap-4 mb-8 border-b border-border flex-wrap">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`pb-3 px-2 font-medium text-sm transition-colors ${
                activeTab === 'dashboard'
                  ? 'text-gold border-b-2 border-gold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('anuncios')}
              className={`pb-3 px-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                activeTab === 'anuncios'
                  ? 'text-gold border-b-2 border-gold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Megaphone className="w-4 h-4" /> Anúncios
            </button>
            <button
              onClick={() => setActiveTab('resgatar')}
              className={`pb-3 px-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                activeTab === 'resgatar'
                  ? 'text-gold border-b-2 border-gold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Gift className="w-4 h-4" /> Resgatar
            </button>
          </div>

          {activeTab === 'anuncios' ? (
          <div className="space-y-8">
            <div>
              <h2 className="font-semibold text-lg mb-4">Publicar Novo Anúncio</h2>
              <UserAdvertisementForm
                user={user}
                userPoints={userPoints}
                onAdCreated={() => { loadData(); }}
              />
            </div>
             <div>
               <h2 className="font-semibold text-lg mb-4">Meus Anúncios</h2>
               <UserAdvertisementsManager user={user} onEditAd={setEditingAd} />
             </div>
           </div>
          ) : activeTab === 'resgatar' ? (
            <UserCatalog
              user={user}
              userPoints={userPoints}
              onRedeemed={loadData}
            />
          ) : (
            <>
          {/* Buy Points Button */}
          <div className="mb-8">
            <Button
              onClick={() => setShowBuyPoints(true)}
              className="bg-gold/20 text-gold hover:bg-gold/30 border border-gold/40"
            >
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Mercado de Pontos
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Saldo', value: (userPoints?.balance || 0).toLocaleString(), unit: 'pts', color: 'text-gold', icon: Star },
              { label: 'Total Ganho', value: (userPoints?.total_earned || 0).toLocaleString(), unit: 'pts', color: 'text-green-400', icon: TrendingUp },
              { label: 'Total Gasto', value: (userPoints?.total_spent || 0).toLocaleString(), unit: 'pts', color: 'text-destructive', icon: Gift },
              { label: 'Vídeos', value: (userPoints?.videos_watched || 0).toLocaleString(), unit: 'assistidos', color: 'text-accent', icon: ArrowUpRight },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-2xl p-4"
              >
                <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
                <div className={`font-grotesk font-bold text-2xl ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.unit} • {s.label}</div>
              </motion.div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Transactions */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2">
                  <History className="w-4 h-4 text-gold" /> Histórico
                </h2>
              </div>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {transactions.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">Nenhuma transação ainda</p>
                ) : transactions.map((tx) => {
                  const meta = typeLabels[tx.type] || typeLabels.manual_adjust;
                  const Icon = meta.icon;
                  return (
                    <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${meta.color}`} />
                        <div>
                          <p className="text-xs font-medium">{meta.label}</p>
                          <p className="text-xs text-muted-foreground">{tx.description}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${tx.points > 0 ? 'text-green-400' : 'text-destructive'}`}>
                        {tx.points > 0 ? '+' : ''}{tx.points} pts
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Redemptions */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2">
                  <Gift className="w-4 h-4 text-gold" /> Meus Resgates
                </h2>
                <Link to="/catalog" className="text-xs text-gold hover:underline">Resgatar mais</Link>
              </div>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {redemptions.length === 0 ? (
                  <div className="text-center py-8">
                    <Gift className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                    <p className="text-muted-foreground text-sm">Nenhum resgate ainda</p>
                    <Link to="/catalog" className="text-xs text-gold hover:underline mt-1 block">
                      Ver catálogo de prêmios →
                    </Link>
                  </div>
                ) : redemptions.map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-xs font-medium">{r.product_name}</p>
                      <p className="text-xs text-muted-foreground">{r.company_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-destructive font-semibold">-{r.points_spent} pts</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[r.status]}`}>
                        {r.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
            </>
          )}
          </div>
          </div>

          <EditAdModal
            ad={editingAd}
            user={user}
            userPoints={userPoints}
            onClose={() => setEditingAd(null)}
            onSaved={loadData}
          />
          <BuyPointsModal
          user={user}
          userPoints={userPoints?.balance || 0}
          isOpen={showBuyPoints}
          onClose={() => setShowBuyPoints(false)}
          onSuccess={() => loadData()}
          />
          </div>
          );
          }