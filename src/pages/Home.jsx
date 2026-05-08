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
    const [vids, comps] = await Promise.all([
      base44.entities.Video.filter({ is_active: true }, '-order', 12),
      base44.entities.Company.filter({ is_active: true }, 'order', 20)
    ]);
    setVideos(vids);
    setCompanies(comps);

    const auth = await base44.auth.isAuthenticated();
    if (auth) {
      const me = await base44.auth.me();
      setUser(me);
      const pts = await base44.entities.UserPoints.filter({ user_email: me.email });
      if (pts.length > 0) setUserPoints(pts[0]);
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

      {/* Hero */}
      <section className="relative pt-24 pb-16 px-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full bg-gold/5 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-purple/5 blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/30 mb-6"
          >
            <Zap className="w-4 h-4 text-gold" />
            <span className="text-sm font-medium text-gold">Assista. Ganhe. Resgate.</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-grotesk font-bold text-4xl md:text-6xl lg:text-7xl mb-6 leading-tight"
          >
            Cada segundo que você{' '}
            <span className="text-gold">assiste</span>{' '}
            vale <span className="text-gold">pontos</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-lg md:text-xl mb-8 max-w-2xl mx-auto"
          >
            Passe o mouse sobre os vídeos para acumular pontos em tempo real. 
            Use seus pontos para resgatar produtos exclusivos das nossas empresas parceiras.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            {user ? (
              <Link to="/dashboard"
                className="inline-flex items-center gap-2 bg-gold text-background font-bold px-8 py-3.5 rounded-full hover:bg-gold-dark transition-all glow-gold">
                <Star className="w-5 h-5" />
                Meus Pontos: {userPoints?.balance?.toLocaleString() ?? 0}
              </Link>
            ) : (
              <button
                onClick={() => base44.auth.redirectToLogin()}
                className="inline-flex items-center gap-2 bg-gold text-background font-bold px-8 py-3.5 rounded-full hover:bg-gold-dark transition-all glow-gold"
              >
                <Zap className="w-5 h-5" />
                Começar a Ganhar Pontos
              </button>
            )}
            <Link to="/vitrine"
              className="inline-flex items-center gap-2 border border-border text-foreground font-semibold px-8 py-3.5 rounded-full hover:bg-secondary transition-all">
              Ver Empresas <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
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
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="rounded-2xl bg-card border border-border aspect-video animate-pulse" />
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