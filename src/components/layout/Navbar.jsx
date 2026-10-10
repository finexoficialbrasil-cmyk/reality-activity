import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Menu, X, Star, LogOut, User, ShieldCheck, Flame, LayoutDashboard, TrendingUp, Store } from 'lucide-react';
import { usePublicData } from '@/hooks/usePublicData';
import Logo from '@/components/layout/Logo';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [userPoints, setUserPoints] = useState(null);
  const [marketplaceBalance, setMarketplaceBalance] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const { data: publicData } = usePublicData();
  const burnedBalance = publicData?.burnedBalance || 0;
  const totalPrizePool = (publicData?.advertisements || []).reduce((sum, ad) => sum + (ad.budget_total || 0), 0);

  useEffect(() => {
    const loadUserData = async () => {
      const auth = await base44.auth.isAuthenticated();
      if (auth) {
        const me = await base44.auth.me();
        setUser(me);
        const pts = await base44.entities.UserPoints.filter({ user_email: me.email });
        if (pts.length > 0) setUserPoints(pts[0]);
        const marketplace = await base44.entities.PointsListing.aggregate({
          query: { status: 'active', seller_email: { $ne: me.email } },
          sum: 'points_amount'
        });
        setMarketplaceBalance(marketplace.rows[0]?.sum_points_amount || 0);
      }
    };

    loadUserData();

    // Subscribe to UserPoints changes for real-time updates
    const unsubscribe = base44.entities.UserPoints.subscribe((event) => {
      if (user && event.data.user_email === user.email) {
        setUserPoints(event.data);
      }
    });

    return () => unsubscribe();
  }, [location, user?.email]);

  const handleLogout = () => base44.auth.logout('/');

  const navLinks = [
    { href: '/', label: 'Início' },
    { href: '/vitrine', label: 'Holding' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'glass border-b border-border shadow-lg' : 'bg-transparent border-b border-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Logo size={52} withWordmark={false} />

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-6">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                to={l.href}
                className={`text-sm font-medium transition-colors ${
                  location.pathname === l.href
                    ? 'text-gold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {l.label}
              </Link>
            ))}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-xs font-semibold text-orange-400">{burnedBalance.toLocaleString('pt-BR')} queimados</span>
            </div>
            <Link to="/" className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all" title="Total disponível para ganhar compartilhando anúncios">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400">{totalPrizePool.toLocaleString('pt-BR')} pts em premiação</span>
            </Link>
          </div>

          {/* Right Side */}
          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <>
                <Link
                  to="/marketplace"
                  title="Saldo do marketplace disponível"
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-all"
                >
                  <Store className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs font-semibold text-blue-400">{marketplaceBalance.toLocaleString('pt-BR')} pts marketplace</span>
                </Link>
                {userPoints && (
                  <Link to="/dashboard" className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-coin/10 border border-coin/30 hover:bg-coin/20 transition-all">
                    <Star className="w-4 h-4 text-coin" />
                    <span className="text-sm font-semibold text-coin">{userPoints.balance?.toLocaleString() ?? 0} pts</span>
                  </Link>
                )}
                {user.role === 'admin' && (
                  <Link to="/admin">
                    <Button variant="outline" size="sm" className="border-accent/50 text-accent hover:bg-accent/10">
                      <ShieldCheck className="w-4 h-4 mr-1" /> Admin
                    </Button>
                  </Link>
                )}
                <Link to="/dashboard">
                  <Button size="sm" className="text-white font-bold border-0 hover:opacity-90"
                    style={{ background: 'linear-gradient(90deg, #E823E8 0%, #C026F7 50%, #8A2BE2 100%)', boxShadow: '0 0 18px rgba(232,35,232,0.55), inset 0 1px 0 rgba(255,255,255,0.3)' }}>
                    <LayoutDashboard className="w-4 h-4 mr-1.5" /> Dashboard
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => base44.auth.redirectToLogin()} className="text-muted-foreground">
                  Entrar
                </Button>
                <Button size="sm" onClick={() => base44.auth.redirectToLogin()} className="text-white font-semibold border-0 hover:opacity-90"
                  style={{ background: 'linear-gradient(90deg, #E823E8 0%, #C026F7 50%, #8A2BE2 100%)', boxShadow: '0 0 18px rgba(232,35,232,0.55), inset 0 1px 0 rgba(255,255,255,0.3)' }}>
                  Criar Conta
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button className="lg:hidden text-muted-foreground" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden glass border-t border-border px-4 py-4 space-y-3">
          {navLinks.map((l) => (
            <Link key={l.href} to={l.href} onClick={() => setMenuOpen(false)}
              className="block text-sm font-medium text-muted-foreground hover:text-foreground py-2">
              {l.label}
            </Link>
          ))}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-semibold text-orange-400">{burnedBalance.toLocaleString('pt-BR')} pts queimados</span>
          </div>
          <Link to="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-400">{totalPrizePool.toLocaleString('pt-BR')} pts em premiação</span>
          </Link>
          <Link to="/marketplace" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Store className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-blue-400">{marketplaceBalance.toLocaleString('pt-BR')} pts marketplace</span>
          </Link>
          <div className="border-t border-border pt-3">
            {user ? (
              <>
                <Link to="/dashboard" onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-white font-bold mb-2"
                  style={{ background: 'linear-gradient(90deg, #E823E8 0%, #C026F7 50%, #8A2BE2 100%)', boxShadow: '0 0 20px rgba(232,35,232,0.55), inset 0 1px 0 rgba(255,255,255,0.3)' }}>
                  <LayoutDashboard className="w-5 h-5" />
                  <span>Meu Dashboard</span>
                </Link>
                <Link to="/dashboard" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-coin/10 border border-coin/30 mb-2">
                  <Star className="w-4 h-4 text-coin" />
                  <span className="text-sm font-semibold text-coin">{userPoints?.balance?.toLocaleString() ?? 0} pontos</span>
                </Link>
                <div className="text-xs text-muted-foreground py-2">
                  Olá, <span className="font-medium text-foreground">{user.full_name?.split(' ')[0]}</span>
                </div>
                <button onClick={handleLogout} className="w-full text-sm text-destructive hover:text-destructive/80 py-2 font-medium">
                  Sair
                </button>
              </>
            ) : (
              <Button onClick={() => base44.auth.redirectToLogin()} className="w-full text-white border-0"
                style={{ background: 'linear-gradient(90deg, #E823E8 0%, #C026F7 50%, #8A2BE2 100%)', boxShadow: '0 0 20px rgba(232,35,232,0.5)' }}>
                Entrar / Criar Conta
              </Button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}