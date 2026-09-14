import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Search, Share2 } from 'lucide-react';
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

  const advertisements = (publicData?.advertisements || []).filter(a => a.status === 'approved' && a.is_active && a.budget_remaining > 0);

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
          {!dataLoading && filteredAds.length > 0 && (
            <div className="flex justify-end mb-4">
              <ShareAllButton user={user} ads={filteredAds} onShared={handlePointsEarned} />
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