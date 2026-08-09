import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Zap, Star, ArrowRight, Search, Share2, Megaphone } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import AnimatedFooter from '@/components/home/AnimatedFooter';
import BurnedBalanceCounter from '@/components/home/BurnedBalanceCounter';
import AdvertisementCard from '@/components/advertisements/AdvertisementCard';
import VideoAdvertisementCard from '@/components/advertisements/VideoAdvertisementCard';
import { useCategories } from '@/hooks/useCategories';

export default function Home() {
  const [user, setUser] = useState(null);
  const [userPoints, setUserPoints] = useState(null);
  const [advertisements, setAdvertisements] = useState([]);
  const [filteredAds, setFilteredAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [burnedBalance, setBurnedBalance] = useState(0);

  const { activeCategories } = useCategories();
  const CATEGORIES = [{ value: 'all', label: 'Todos' }, ...activeCategories.map(c => ({ value: c.value, label: `${c.icon || ''} ${c.label}`.trim() }))];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterAds();
  }, [searchQuery, selectedCategory, advertisements]);

  const loadData = async () => {
    // Auth check e dados públicos rodam em paralelo
    const authPromise = (async () => {
      try {
        const auth = await base44.auth.isAuthenticated();
        if (auth) {
          const me = await base44.auth.me();
          setUser(me);
          const pts = await base44.entities.UserPoints.filter({ user_email: me.email });
          if (pts.length > 0) setUserPoints(pts[0]);
        }
      } catch (e) {
        // não logado
      } finally {
        setAuthLoading(false);
      }
    })();

    const dataPromise = (async () => {
      try {
        const res = await base44.functions.invoke('getPublicData', {});
        const ads = res.data.advertisements || [];
        const approvedAds = ads.filter(a => a.status === 'approved' && a.is_active && a.budget_remaining > 0);
        setAdvertisements(approvedAds);
        setBurnedBalance(res.data.burnedBalance || 0);
      } catch (e) {
        try {
          const ads = await base44.entities.Advertisement.list('-created_date', 50);
          const approvedAds = ads.filter(a => a.status === 'approved' && a.is_active && a.budget_remaining > 0);
          setAdvertisements(approvedAds);
        } catch (e2) {
          console.error('Erro ao carregar anúncios:', e2);
        }
      } finally {
        setLoading(false);
      }
    })();

    await Promise.all([authPromise, dataPromise]);
  };

  const filterAds = () => {
    let filtered = advertisements;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(ad => ad.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ad =>
        ad.title.toLowerCase().includes(query) ||
        ad.description?.toLowerCase().includes(query)
      );
    }

    setFilteredAds(filtered);
  };

  const handlePointsEarned = async () => {
    if (!user) return;
    const pts = await base44.entities.UserPoints.filter({ user_email: user.email });
    if (pts.length > 0) setUserPoints(pts[0]);
    // Recarrega anúncios para remover os com orçamento zerado
    loadData();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero - Premium Design */}
      <section className="relative pt-24 pb-12 px-4 overflow-hidden">
        {/* Radial glow background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gold/10 rounded-full blur-[120px]" />
          <div className="absolute top-10 left-1/4 w-[300px] h-[300px] bg-purple/10 rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-5 rounded-full glass border border-gold/20 text-xs font-medium text-gold/90">
              <Zap className="w-3.5 h-3.5" />
              Plataforma de Recompensas
            </div>
            <h1 className="font-grotesk font-bold text-4xl md:text-6xl leading-tight mb-4 tracking-tight">
              Compartilhe e Ganhe{' '}
              <span className="text-gold drop-shadow-[0_0_20px_hsl(45_100%_55%/0.5)]">Pontos</span>
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
              Descubra produtos incríveis, compartilhe com seus amigos e ganhe recompensas
            </p>
          </motion.div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-2">
            {authLoading ? (
              <div className="h-14 w-48 rounded-2xl bg-card/60 border border-border animate-pulse" />
            ) : user ? (
              <Link
                to="/dashboard"
                className="group inline-flex items-center gap-3 glass border border-gold/30 px-7 py-3.5 rounded-2xl hover:border-gold/60 transition-all hover:scale-105"
              >
                <div className="w-9 h-9 rounded-xl bg-gold/20 flex items-center justify-center">
                  <Star className="w-5 h-5 text-gold" />
                </div>
                <div className="text-left">
                  <div className="text-xs text-muted-foreground leading-none mb-0.5">Seu saldo</div>
                  <div className="font-grotesk font-bold text-lg text-gold leading-none">
                    {userPoints?.balance?.toLocaleString() ?? 0} pts
                  </div>
                </div>
              </Link>
            ) : (
              <button
                onClick={() => base44.auth.redirectToLogin()}
                className="inline-flex items-center gap-2 bg-gold text-background font-bold px-7 py-3.5 rounded-2xl hover:bg-gold-dark transition-all glow-gold hover:scale-105"
              >
                <Zap className="w-4 h-4" />
                Começar Grátis
              </button>
            )}
            {user && (
              <Link
                to="/dashboard?tab=anuncios"
                className="group inline-flex items-center gap-2 bg-gradient-to-r from-purple/20 to-purple/5 border border-purple/40 text-foreground font-semibold px-7 py-3.5 rounded-2xl hover:border-purple/70 transition-all hover:scale-105 neon-glow-purple"
              >
                <Megaphone className="w-4 h-4 text-purple group-hover:scale-110 transition-transform" />
                Publicar Anúncio
                <ArrowRight className="w-4 h-4 text-purple group-hover:translate-x-1 transition-transform" />
              </Link>
            )}
          </div>

          {/* Burned Balance Counter */}
          <div className="flex justify-center mt-8">
            <BurnedBalanceCounter burnedBalance={burnedBalance} />
          </div>
        </div>
      </section>

      {/* Search & Filter - Premium */}
      <section className="px-4 pb-8 sticky top-16 bg-background/80 backdrop-blur-xl z-40 border-b border-border/50">
        <div className="max-w-6xl mx-auto space-y-4 pt-4">
          {/* Search */}
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-gold transition-colors" />
            <input
              type="text"
              placeholder="Buscar anúncios incríveis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-card/80 backdrop-blur border border-border rounded-2xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/20 transition-all"
            />
          </div>

          {/* Categories - Chips */}
          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                  selectedCategory === cat.value
                    ? 'bg-gold text-background border-gold glow-gold scale-105'
                    : 'bg-card/60 border-border text-muted-foreground hover:text-foreground hover:border-gold/40 hover:bg-card'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Advertisements Grid */}
      <section className="px-4 pb-16">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="rounded-lg bg-card border border-border animate-pulse">
                  <div className="aspect-video bg-secondary/50 rounded-t-lg" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-secondary rounded w-3/4" />
                    <div className="h-2 bg-secondary rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredAds.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <Share2 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">Nenhum anúncio encontrado</p>
              <p className="text-muted-foreground text-sm mt-2">Tente ajustar seus filtros</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAds.map((ad) => (
                ad.type === 'video' ? (
                  <VideoAdvertisementCard
                    key={ad.id}
                    ad={ad}
                    user={user}
                    onPointsEarned={handlePointsEarned}
                  />
                ) : (
                  <AdvertisementCard
                    key={ad.id}
                    ad={ad}
                    user={user}
                    onPointsEarned={handlePointsEarned}
                  />
                )
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <AnimatedFooter />
    </div>
  );
}