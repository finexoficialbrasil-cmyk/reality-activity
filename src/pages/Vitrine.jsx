import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Building2 } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import VideoCard from '@/components/video/VideoCard';
import CompanyOrbitView from '@/components/vitrine/CompanyOrbitView';
import BannerCarousel from '@/components/home/BannerCarousel';

export default function Vitrine() {
  const [companies, setCompanies] = useState([]);
  const [videos, setVideos] = useState([]);
  const [user, setUser] = useState(null);
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
        const [comps, vids] = await Promise.all([
          base44.entities.Company.filter({ is_active: true }, 'order', 20),
          base44.entities.Video.filter({ is_active: true }, '-order', 50)
        ]);
        setCompanies(comps);
        setVideos(vids);
      } catch (e2) {
        console.error('Fallback também falhou:', e2);
      }
    } finally {
      setLoading(false);
    }

    // Carrega usuário em paralelo
    try {
      const auth = await base44.auth.isAuthenticated();
      if (auth) setUser(await base44.auth.me());
    } catch (e) {
      // não logado, ignora
    }
  };

  const handlePointsEarned = () => {};

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