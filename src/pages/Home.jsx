import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Search, Share2, Megaphone } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import HeroSection from '@/components/home/HeroSection';
import AnimatedFooter from '@/components/home/AnimatedFooter';
import AdvertisementCard from '@/components/advertisements/AdvertisementCard';
import VideoAdvertisementCard from '@/components/advertisements/VideoAdvertisementCard';
import ShareAllButton from '@/components/advertisements/ShareAllButton';
import { useCategories } from '@/hooks/useCategories';
import { usePublicData } from '@/hooks/usePublicData';

export default function Home() {
  const [user, setUser] = useState(null);
  const [userPoints, setUserPoints] = useState(null);
  const [filteredAds, setFilteredAds] = useState([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { activeCategories } = useCategories();
  const { data: publicData, isLoading: dataLoading } = usePublicData();
  const CATEGORIES = [{ value: 'all', label: 'Todos' }, ...activeCategories.map(c => ({ value: c.value, label: `${c.icon || ''} ${c.label}`.trim() }))];

  const advertisements = (publicData?.advertisements || []).filter(a => a.is_active && a.budget_remaining > 0);

  useEffect(() => {
    (async () => {
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
  }, []);

  useEffect(() => {
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
  }, [searchQuery, selectedCategory, advertisements]);

  const handlePointsEarned = async () => {
    if (!user) return;
    const pts = await base44.entities.UserPoints.filter({ user_email: user.email });
    if (pts.length > 0) setUserPoints(pts[0]);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <HeroSection user={user} authLoading={authLoading} />

      {/* Search & Filter - Premium */}
      <section className="px-3 sm:px-4 pb-4 sm:pb-8 sticky top-14 sm:top-16 bg-background/80 backdrop-blur-xl z-40 border-b border-border/50">
        <div className="max-w-6xl mx-auto space-y-3 sm:space-y-4 pt-3 sm:pt-4">
          {/* Search */}
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground group-focus-within:text-gold transition-colors" />
            <input
              type="text"
              placeholder="Buscar anúncios incríveis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 sm:pl-12 pr-4 py-3 sm:py-3.5 bg-card/80 backdrop-blur border border-border rounded-2xl text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/20 transition-all"
            />
          </div>

          {/* Categories - Chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border flex-shrink-0 ${
                  selectedCategory === cat.value
                    ? 'text-white border-transparent scale-105 bg-[linear-gradient(90deg,#E823E8_0%,#C026F7_50%,#8A2BE2_100%)] shadow-[0_0_16px_rgba(232,35,232,0.5),inset_0_1px_0_rgba(255,255,255,0.3)]'
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
          {!dataLoading && (filteredAds.length > 0 || user) && (
            <div className="mb-4 flex flex-wrap items-center gap-3">
              {filteredAds.length > 0 && (
                <ShareAllButton user={user} ads={filteredAds} onShared={handlePointsEarned} />
              )}
              {user && (
                <Link
                  to="/dashboard?tab=anuncios"
                  className="group relative overflow-hidden inline-flex items-center gap-2.5 text-white font-bold px-6 py-3 rounded-xl border border-pink-500/30 hover:scale-105 active:scale-95 transition-all duration-300 ml-auto"
                  style={{ background: 'linear-gradient(90deg, #E823E8 0%, #C026F7 50%, #8A2BE2 100%)', boxShadow: '0 0 22px rgba(232,35,232,0.55), 0 6px 24px rgba(138,43,226,0.45), inset 0 1px 0 rgba(255,255,255,0.3)' }}
                >
                  <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <Megaphone className="w-4 h-4 relative z-10 group-hover:scale-110 transition-transform" />
                  <span className="relative z-10 tracking-wide">Publicar Anúncio</span>
                </Link>
              )}
            </div>
          )}
          {dataLoading ? (
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