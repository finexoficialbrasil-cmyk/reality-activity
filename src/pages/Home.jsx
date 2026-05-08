import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Zap, Star, Play, ArrowRight, Users, Building2, Gift } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import VideoCard from '@/components/video/VideoCard';

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
    try {
      const [vids, comps] = await Promise.all([
        base44.entities.Video.filter({ is_active: true }, '-order', 12),
        base44.entities.Company.filter({ is_active: true }, 'order', 20)
      ]);
      setVideos(vids);
      setCompanies(comps);
    } catch (e) {
      console.error('Erro ao carregar vídeos/empresas:', e);
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
      console.error('Erro ao carregar usuário:', e);
    }

    setLoading(false);
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
      <section className="pt-20 pb-4 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/30 mb-2">
              <Zap className="w-3.5 h-3.5 text-gold" />
              <span className="text-xs font-medium text-gold">Assista. Ganhe. Resgate.</span>
            </div>
            <h1 className="font-grotesk font-bold text-2xl md:text-3xl leading-tight">
              Cada segundo que você <span className="text-gold">assiste</span> vale <span className="text-gold">pontos</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Passe o mouse nos vídeos, acumule pontos e resgate prêmios exclusivos.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {user ? (
              <Link to="/dashboard"
                className="inline-flex items-center gap-2 bg-gold text-background font-bold px-6 py-2.5 rounded-full hover:bg-gold-dark transition-all glow-gold whitespace-nowrap">
                <Star className="w-4 h-4" />
                {userPoints?.balance?.toLocaleString() ?? 0} pts
              </Link>
            ) : (
              <button
                onClick={() => base44.auth.redirectToLogin()}
                className="inline-flex items-center gap-2 bg-gold text-background font-bold px-6 py-2.5 rounded-full hover:bg-gold-dark transition-all glow-gold whitespace-nowrap"
              >
                <Zap className="w-4 h-4" />
                Começar Grátis
              </button>
            )}
            <Link to="/vitrine"
              className="inline-flex items-center gap-2 border border-border text-foreground font-semibold px-5 py-2.5 rounded-full hover:bg-secondary transition-all whitespace-nowrap text-sm">
              Ver Empresas <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Videos Feed — PRIMEIRO, logo abaixo do hero */}
      <section className="px-4 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-grotesk font-bold text-2xl md:text-3xl">Vídeos em Destaque</h2>
              <p className="text-muted-foreground text-sm mt-1">Passe o mouse para ganhar pontos</p>
            </div>
            <Link to="/vitrine" className="text-sm text-gold hover:underline flex items-center gap-1">
              Ver todos <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array(4).fill(0).map((_, i) => (
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
      </section>

      {/* Stats */}
      <section className="px-4 pb-12">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className="bg-card border border-border rounded-2xl p-4 text-center"
            >
              <s.icon className="w-6 h-6 text-gold mx-auto mb-2" />
              <div className="font-grotesk font-bold text-2xl text-gold">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 pb-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-grotesk font-bold text-2xl md:text-3xl mb-2">Como funciona</h2>
            <p className="text-muted-foreground">Simples, rápido e recompensador</p>
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
                className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden"
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

      {/* Companies strip */}
      {companies.length > 0 && (
        <section className="px-4 pb-16">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-grotesk font-bold text-xl mb-6 text-center">Nossas Empresas & Parceiros</h2>
            <div className="flex flex-wrap gap-4 justify-center">
              {companies.map((c) => (
                <Link key={c.id} to={`/vitrine`}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border hover:border-gold/50 transition-all">
                  {c.logo_url && <img src={c.logo_url} alt={c.name} className="w-5 h-5 rounded-full object-cover" />}
                  <span className="text-sm font-medium">{c.name}</span>
                  {c.is_partner && <span className="text-xs text-purple">Parceiro</span>}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border px-4 py-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gold flex items-center justify-center">
              <Zap className="w-4 h-4 text-background" />
            </div>
            <span className="font-grotesk font-bold text-sm">Points<span className="text-gold">Play</span></span>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 PointsPlay. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}