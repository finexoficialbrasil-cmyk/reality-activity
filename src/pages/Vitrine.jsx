import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Building2, Megaphone } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import VideoCard from '@/components/video/VideoCard';
import CompanyOrbitView from '@/components/vitrine/CompanyOrbitView';
import BannerCarousel from '@/components/home/BannerCarousel';
import AdvertisementCard from '@/components/advertisements/AdvertisementCard';

export default function Vitrine() {
  const [companies, setCompanies] = useState([]);
  const [videos, setVideos] = useState([]);
  const [advertisements, setAdvertisements] = useState([]);
  const [user, setUser] = useState(null);
  const [userPoints, setUserPoints] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Carrega dados públicos via backend (funciona sem login)
    try {
      const res = await base44.functions.invoke('getPublicData', {});
      setCompanies(res.data.companies || []);
      setVideos(res.data.videos || []);
    } catch (e) {
      console.error('Erro ao carregar via função, tentando direto:', e);
      // Fallback: carrega direto pelas entidades (RLS público)
         try {
           const [comps, vids, ads] = await Promise.all([
             base44.entities.Company.filter({ is_active: true }, 'order', 20),
             base44.entities.Video.filter({ is_active: true }, '-order', 50),
             base44.entities.Advertisement.list('-created_date', 50)
           ]);
           const approvedAds = ads.filter(a => a.status === 'approved' && a.is_active);
           setCompanies(comps);
           setVideos(vids);
           setAdvertisements(approvedAds);
         } catch (e2) {
           console.error('Fallback também falhou:', e2);
         }
    } finally {
      setLoading(false);
    }

    // Carrega usuário em paralelo
    try {
      const auth = await base44.auth.isAuthenticated();
      if (auth) {
        const me = await base44.auth.me();
        setUser(me);
        const pts = await base44.entities.UserPoints.filter({ user_email: me.email });
        if (pts.length > 0) setUserPoints(pts[0]);
      }
    } catch (e) {
      // não logado, ignora
    }
  };

  const handlePointsEarned = async () => {
    // Recarrega pontos do usuário após ganhar
    if (user) {
      try {
        const pts = await base44.entities.UserPoints.filter({ user_email: user.email });
        if (pts.length > 0) setUserPoints(pts[0]);
      } catch (e) {
        console.error('Erro ao recarregar pontos:', e);
      }
    }
  };

  const companiesMap = companies.reduce((acc, c) => { acc[c.id] = c; return acc; }, {});

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Featured Banner Carousel */}
          {videos.filter(v => v.type === 'banner').length > 0 && (
            <div className="mb-10">
              <BannerCarousel 
                banners={videos.filter(v => v.type === 'banner').slice(0, 5)} 
                companies={companiesMap}
                interval={6000} 
              />
            </div>
          )}

          {/* Orbit view - main navigation */}
          {!loading && companies.length > 0 && (
            <div className="mb-16">
              <CompanyOrbitView
                company={companies[0]}
                otherCompanies={companies.slice(1)}
              />
            </div>
          )}

          {/* Advertisements Section */}
          {advertisements.length > 0 && (
            <div className="mb-16">
              <h2 className="font-grotesk font-bold text-xl md:text-2xl mb-6 flex items-center gap-2">
                <Megaphone className="w-6 h-6 text-gold" /> Anúncios Compartilháveis
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {advertisements.map((ad) => (
                  <AdvertisementCard
                    key={ad.id}
                    ad={ad}
                    user={user}
                    onAdShared={handlePointsEarned}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All videos */}
          <div>
            <h2 className="font-grotesk font-bold text-xl md:text-2xl mb-6">Todos os Vídeos</h2>
            {videos.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>Nenhum vídeo disponível</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {videos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    company={companiesMap[video.company_id]}
                    user={user}
                    onPointsEarned={handlePointsEarned}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}