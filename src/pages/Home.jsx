import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Zap, Star, Play, ArrowRight, Users, Building2, Gift } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import VideoCardWithBadges from '@/components/video/VideoCardWithBadges';
import StatsCounter from '@/components/home/StatsCounter';
import CompaniesCarousel from '@/components/home/CompaniesCarousel';
import AnimatedFooter from '@/components/home/AnimatedFooter';
import BannerCarousel from '@/components/home/BannerCarousel';
import CompanyOrbitView from '@/components/vitrine/CompanyOrbitView';
import CeoVideo from '@/components/home/CeoVideo';

export default function Home() {
  const [videos, setVideos] = useState([]);
  const [companies, setCompanies] = useState([]);
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
      const vids = res.data.videos || [];
      const comps = res.data.companies || [];
      setVideos(vids);
      setCompanies(comps);
    } catch (e) {
      console.error('Erro ao carregar via função, tentando direto:', e);
      // Fallback: carrega direto pelas entidades (RLS público)
      try {
        const [vids, comps] = await Promise.all([
          base44.entities.Video.filter({ is_active: true }, '-order', 20),
          base44.entities.Company.filter({ is_active: true }, 'order', 20)
        ]);
        setVideos(vids);
        setCompanies(comps);
      } catch (e2) {
        console.error('Fallback também falhou:', e2);
      }
    } finally {
      setLoading(false);
    }

    // Carrega dados do usuário logado em paralelo (não bloqueia o loading)
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
    if (!user) return;
    const pts = await base44.entities.UserPoints.filter({ user_email: user.email });
    if (pts.length > 0) setUserPoints(pts[0]);
  };

  const companiesMap = companies.reduce((acc, c) => { acc[c.id] = c; return acc; }, {});

  const stats = [
    { icon: Building2, value: companies.length + '+', label: 'Empresas Parceiras' },
    { icon: Play, value: videos.length + '+', label: 'Vídeos Disponíveis' },
    { icon: Users, value: '10K+', label: 'Usuários Ativos' },
    { icon: Gift, value: '∞', label: 'Prêmios para Resgatar' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero — compacto */}
      <section className="pt-20 pb-12 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple/20 rounded-full blur-3xl animate-pulse" />
        </div>
        <div className="max-w-7xl mx-auto flex flex-col gap-8 relative z-10">
          <div className="flex flex-col lg:flex-row gap-8 items-center">
            {/* Texto Hero */}
            <div className="flex-1">
              <motion.div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/30 mb-4 neon-glow"
                animate={{ boxShadow: ['0 0 20px hsl(45 100% 55% / 0.3)', '0 0 40px hsl(45 100% 55% / 0.6)', '0 0 20px hsl(45 100% 55% / 0.3)'] }}
                transition={{ duration: 3, repeat: Infinity }}>
                <Zap className="w-3.5 h-3.5 text-gold animate-pulse" />
                <span className="text-xs font-medium text-gold">Assista. Ganhe. Resgate.</span>
              </motion.div>
              <h1 className="font-grotesk font-bold text-3xl md:text-5xl leading-tight max-w-2xl">
                Cada segundo que você <span className="text-gold animate-pulse">assiste</span> vale <span className="text-purple">recompensas</span>
              </h1>
              <p className="text-muted-foreground text-sm md:text-base mt-3 max-w-lg">
                Assista conteúdo, acumule pontos e resgate recompensas incríveis!
              </p>
            </div>
            {/* Vídeo CEO */}
            <div className="w-full lg:flex-1">
              <CeoVideo />
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto flex items-center gap-3 flex-wrap">
            {user ? (
              <Link to="/dashboard"
                className="inline-flex items-center gap-2 bg-gold text-background font-bold px-8 py-3 rounded-full hover:bg-gold-dark transition-all glow-gold whitespace-nowrap">
                <Star className="w-4 h-4" />
                {userPoints?.balance?.toLocaleString() ?? 0} pts
              </Link>
            ) : (
              <button
                onClick={() => base44.auth.redirectToLogin()}
                className="inline-flex items-center gap-2 bg-gold text-background font-bold px-8 py-3 rounded-full hover:bg-gold-dark transition-all glow-gold whitespace-nowrap text-base"
              >
                <Zap className="w-4 h-4" />
                Começar Grátis
              </button>
            )}
            <Link to="/vitrine"
              className="inline-flex items-center gap-2 border border-border text-foreground font-semibold px-6 py-3 rounded-full hover:bg-secondary transition-all whitespace-nowrap">
              Ver Empresas <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
      </section>

      {/* Hero Section with Banner Carousel - Premium Experience */}
      {videos.length > 0 && (
        <section className="px-4 pb-16 relative overflow-hidden">
          <div className="max-w-7xl mx-auto relative z-10">
            {/* Banner Carousel */}
            <BannerCarousel 
              banners={videos.filter(v => v.type === 'banner').slice(0, 5)} 
              companies={companiesMap}
              interval={6000} 
            />
          </div>
        </section>
      )}

      {/* Videos Feed — PRIMEIRO, logo abaixo do hero */}
      <section className="px-4 pb-16">
        <div className="max-w-7xl mx-auto relative">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-gold/10 rounded-full blur-3xl opacity-30 pointer-events-none" />
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-grotesk font-bold text-2xl md:text-3xl">Vídeos em Destaque</h2>
              <p className="text-muted-foreground text-sm mt-1">✨ Passe o mouse para ganhar pontos</p>
            </div>
            <Link to="/vitrine" className="text-sm text-gold hover:underline flex items-center gap-1">
              Ver todos <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* CTA para não logados - REMOVIDO para evitar redundância */}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="rounded-2xl bg-card border border-border animate-pulse">
                  <div className="aspect-video bg-secondary/50 rounded-t-2xl" />
                  <div className="p-4 space-y-2">
                    <div className="h-3 bg-secondary rounded w-3/4" />
                    <div className="h-3 bg-secondary rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Play className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Nenhum vídeo disponível ainda</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {videos.map((video) => (
                <VideoCardWithBadges
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
      </section>

      {/* Stats */}
      <section className="px-4 pb-12 relative">
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute top-1/2 left-0 w-72 h-72 bg-gold rounded-full blur-3xl" />
        </div>
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
          {stats.map((s, i) => (
            <StatsCounter key={i} icon={s.icon} value={s.value} label={s.label} />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple rounded-full blur-3xl" />
        </div>
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-10">
            <h2 className="font-grotesk font-bold text-2xl md:text-3xl mb-2">Como funciona</h2>
            <p className="text-muted-foreground">Simples, rápido e recompensador ⚡</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: '01', icon: Play, title: 'Assista Vídeos', desc: 'Passe o mouse sobre qualquer banner de vídeo para começar a assistir' },
              { step: '02', icon: Star, title: 'Acumule Pontos', desc: 'Ganhe pontos por segundo assistido + bônus ao completar o vídeo inteiro' },
              { step: '03', icon: Gift, title: 'Resgate Prêmios', desc: 'Use seus pontos para resgatar produtos exclusivos de todas as empresas parceiras' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden transition-all hover:border-gold/40 hover:neon-glow"
              >
                <div className="absolute top-4 right-4 font-grotesk font-bold text-4xl text-gold/10">{item.step}</div>
                <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center mb-4">
                  <item.icon className="w-6 h-6 text-gold" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Companies Carousel */}
      {companies.length > 0 && (
        <section className="px-4 pb-16">
          <div className="max-w-7xl mx-auto">
            <CompaniesCarousel companies={companies} />
          </div>
        </section>
      )}

      {/* Animated Footer */}
      <AnimatedFooter />
    </div>
  );
}