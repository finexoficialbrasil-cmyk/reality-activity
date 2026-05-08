import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Search, Building2, Star, ExternalLink } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import VideoCard from '@/components/video/VideoCard';

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
      console.error('Erro ao carregar dados públicos:', e);
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
          {/* Header */}
          <div className="text-center mb-10">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-grotesk font-bold text-3xl md:text-5xl mb-3"
            >
              Vitrine de <span className="text-gold">Empresas</span>
            </motion.h1>
            <p className="text-muted-foreground">Conheça nosso ecossistema de empresas e parceiros</p>
          </div>

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-14">
            {loading ? (
              Array(8).fill(0).map((_, i) => (
                <div key={i} className="h-48 bg-card rounded-2xl animate-pulse" />
              ))
            ) : filteredCompanies.map((company, i) => (
              <motion.div
                key={company.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setSelectedCompany(selectedCompany === company.id ? 'all' : company.id)}
                className={`bg-card border rounded-2xl p-5 cursor-pointer transition-all hover:scale-[1.02] ${
                  selectedCompany === company.id
                    ? 'border-gold glow-gold'
                    : 'border-border hover:border-gold/40'
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                    {company.logo_url ? (
                      <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3
                      className={`font-semibold text-sm truncate ${(company.website || company.phone) ? 'cursor-pointer hover:text-gold transition-colors' : ''}`}
                      onClick={e => {
                        e.stopPropagation();
                        if (company.website) window.open(company.website, '_blank');
                        else if (company.phone) window.open(`https://wa.me/${company.phone.replace(/\D/g, '')}`, '_blank');
                      }}
                    >{company.name}</h3>
                    <p className="text-xs text-muted-foreground">{company.category}</p>
                  </div>
                </div>
                {company.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{company.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {company.is_partner && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/30">Parceiro</span>
                    )}
                    {company.points_accepted && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20 flex items-center gap-1">
                        <Star className="w-2.5 h-2.5" /> Aceita pontos
                      </span>
                    )}
                  </div>
                  {company.website && (
                    <a href={company.website} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-muted-foreground hover:text-foreground">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </motion.div>
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