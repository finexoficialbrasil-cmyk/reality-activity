import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Zap, Star, ArrowRight, Search, Share2, Megaphone } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import AnimatedFooter from '@/components/home/AnimatedFooter';
import AdvertisementCard from '@/components/advertisements/AdvertisementCard';
import VideoAdvertisementCard from '@/components/advertisements/VideoAdvertisementCard';

export default function Home() {
  const [user, setUser] = useState(null);
  const [userPoints, setUserPoints] = useState(null);
  const [advertisements, setAdvertisements] = useState([]);
  const [filteredAds, setFilteredAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const CATEGORIES = [
    { value: 'all', label: 'Todos' },
    { value: 'mercado_livre', label: '💰 Mercado Livre' },
    { value: 'shopee', label: '🛒 Shopee' },
    { value: 'tiktok_shop', label: '🎵 TikTok Shop' },
    { value: 'amazon', label: '📦 Amazon' },
    { value: 'produtos_digitais', label: '💻 Produtos Digitais' },
    { value: 'servicos', label: '🔧 Serviços' },
    { value: 'outros', label: '⭐ Outros' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterAds();
  }, [searchQuery, selectedCategory, advertisements]);

  const loadData = async () => {
    try {
      const res = await base44.functions.invoke('getPublicData', {});
      const ads = res.data.advertisements || [];
      const approvedAds = ads.filter(a => a.status === 'approved' && a.is_active && a.budget_remaining > 0);
      setAdvertisements(approvedAds);
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
    }
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

      {/* Hero - Clean & Simple */}
      <section className="pt-20 pb-10 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="font-grotesk font-bold text-3xl md:text-4xl leading-tight mb-3">
              Compartilhe e Ganhe <span className="text-gold">Pontos</span>
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
              Descubra produtos incríveis, compartilhe com seus amigos e ganhe recompensas
            </p>
          </motion.div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
            {user ? (
              <Link to="/dashboard" className="inline-flex items-center gap-2 bg-gold text-background font-bold px-6 py-3 rounded-lg hover:bg-gold-dark transition-all glow-gold">
                <Star className="w-4 h-4" />
                {userPoints?.balance?.toLocaleString() ?? 0} pts
              </Link>
            ) : (
              <button
                onClick={() => base44.auth.redirectToLogin()}
                className="inline-flex items-center gap-2 bg-gold text-background font-bold px-6 py-3 rounded-lg hover:bg-gold-dark transition-all glow-gold"
              >
                <Zap className="w-4 h-4" />
                Começar Grátis
              </button>
            )}
            {user && (
              <Link to="/dashboard?tab=anuncios" className="inline-flex items-center gap-2 border border-border text-foreground font-semibold px-6 py-3 rounded-lg hover:bg-secondary transition-all">
                <Megaphone className="w-4 h-4" />
                Publicar Anúncio
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Search & Filter - Mobile optimized */}
      <section className="px-4 pb-8 sticky top-16 bg-background/95 backdrop-blur z-40">
        <div className="max-w-6xl mx-auto space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar anúncios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold"
            />
          </div>

          {/* Categories - Horizontal Scroll */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat.value
                    ? 'bg-gold text-background'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
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