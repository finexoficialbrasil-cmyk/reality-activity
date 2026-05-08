import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Search, Building2 } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import VideoCard from '@/components/video/VideoCard';
import CompanyBanner from '@/components/vitrine/CompanyBanner';
import VitrineHero from '@/components/vitrine/VitrineHero';

export default function Vitrine() {
  const [companies, setCompanies] = useState([]);
  const [videos, setVideos] = useState([]);
  const [user, setUser] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [search, setSearch] = useState('');
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

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.category || '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredVideos = videos.filter(v => {
    const matchCompany = selectedCompany === 'all' || v.company_id === selectedCompany;
    return matchCompany;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Hero Banner */}
          <VitrineHero />

          {/* Search */}
          <div className="relative max-w-md mx-auto mb-10">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar empresas..."
              className="w-full bg-card border border-border rounded-full pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-gold/50 transition-colors"
            />
          </div>

          {/* Companies Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-14">
            {loading ? (
              Array(6).fill(0).map((_, i) => (
                <div key={i} className="h-64 bg-card rounded-2xl animate-pulse" />
              ))
            ) : filteredCompanies.map((company, i) => (
              <div key={company.id} style={{ animationDelay: `${i * 0.04}s` }}>
                <CompanyBanner
                  company={company}
                  isSelected={selectedCompany === company.id}
                  onClick={() => setSelectedCompany(selectedCompany === company.id ? 'all' : company.id)}
                />
              </div>
            ))}
          </div>

          {/* Videos by company */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-grotesk font-bold text-xl md:text-2xl">
                {selectedCompany === 'all'
                  ? 'Todos os Vídeos'
                  : `Vídeos: ${companies.find(c => c.id === selectedCompany)?.name}`}
              </h2>
              {selectedCompany !== 'all' && (
                <button onClick={() => setSelectedCompany('all')} className="text-sm text-muted-foreground hover:text-foreground">
                  Ver todos
                </button>
              )}
            </div>

            {filteredVideos.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>Nenhum vídeo disponível para esta empresa</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredVideos.map((video) => (
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