import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Building2, Play, Package, Star, TrendingUp, Users,
  Gift, BarChart3, ShieldCheck, Settings, Coins, Target,
  ChevronLeft, ChevronRight, Globe
} from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminCompanies from '@/components/admin/AdminCompanies';
import AdminVideos from '@/components/admin/AdminVideos';
import AdminProducts from '@/components/admin/AdminProducts';
import AdminRedemptions from '@/components/admin/AdminRedemptions';
import AdminUsers from '@/components/admin/AdminUsers';
import AdminStats from '@/components/admin/AdminStats';
import AdminAdvertisements from '@/components/admin/AdminAdvertisements';
import AdminAccountSettings from '@/components/admin/AdminAccountSettings';
import AdminPointsPurchases from '@/components/admin/AdminPointsPurchases';
import AdminAdvertisersSpending from '@/components/admin/AdminAdvertisersSpending';
import AdminCampaignsAnalytics from '@/components/admin/AdminCampaignsAnalytics';
import AdminApprovedDomains from '@/components/admin/AdminApprovedDomains';

const tabs = [
  { id: 'stats', label: 'Dashboard', icon: BarChart3 },
  { id: 'spending', label: 'Gastos', icon: TrendingUp },
  { id: 'campaigns', label: 'Campanhas', icon: Target },
  { id: 'companies', label: 'Empresas', icon: Building2 },
  { id: 'videos', label: 'Vídeos', icon: Play },
  { id: 'advertisements', label: 'Anúncios', icon: Star },
  { id: 'products', label: 'Produtos', icon: Package },
  { id: 'purchases', label: 'Compras', icon: Coins },
  { id: 'redemptions', label: 'Resgates', icon: Gift },
  { id: 'users', label: 'Usuários', icon: Users },
  { id: 'domains', label: 'Domínios', icon: Globe },
  { id: 'account', label: 'Conta', icon: Settings },
];

export default function Admin() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('stats');
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (auth) => {
      if (!auth) { base44.auth.redirectToLogin('/admin'); return; }
      const me = await base44.auth.me();
      if (me.role !== 'admin') { window.location.href = '/'; return; }
      setUser(me);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-border border-t-gold rounded-full animate-spin" />
    </div>
  );

  const activeTabData = tabs.find(t => t.id === activeTab);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full z-50 flex flex-col glass border-r border-border transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'}`}>
        {/* Logo */}
        <div className={`flex items-center gap-2 h-14 px-4 border-b border-border ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-7 h-7 rounded-lg bg-gold flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4 h-4 text-background" />
          </div>
          {!collapsed && (
            <span className="font-grotesk font-bold text-sm">
              Admin <span className="text-gold">Panel</span>
            </span>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              title={collapsed ? tab.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gold/10 text-gold border border-gold/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <tab.icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{tab.label}</span>}
            </button>
          ))}
        </nav>

        {/* Bottom: user + ver site */}
        <div className={`border-t border-border px-3 py-3 space-y-2`}>
          {!collapsed && (
            <div className="text-xs text-muted-foreground truncate px-1">{user?.full_name}</div>
          )}
          <Link
            to="/"
            className={`flex items-center gap-2 text-xs text-gold hover:underline px-1 ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? 'Ver site' : undefined}
          >
            <ChevronLeft className="w-3 h-3 flex-shrink-0" />
            {!collapsed && 'Ver site'}
          </Link>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center hover:bg-muted transition-all"
        >
          {collapsed
            ? <ChevronRight className="w-3 h-3 text-muted-foreground" />
            : <ChevronLeft className="w-3 h-3 text-muted-foreground" />
          }
        </button>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 min-h-screen transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-56'}`}>
        {/* Top bar */}
        <div className="sticky top-0 z-40 glass border-b border-border h-14 flex items-center px-6 gap-3">
          {activeTabData && (
            <div className="flex items-center gap-2">
              <activeTabData.icon className="w-4 h-4 text-gold" />
              <span className="font-semibold text-sm">{activeTabData.label}</span>
            </div>
          )}
        </div>

        {/* Page Content */}
        <div className="p-6">
          {activeTab === 'stats' && <AdminStats />}
          {activeTab === 'spending' && <AdminAdvertisersSpending />}
          {activeTab === 'campaigns' && <AdminCampaignsAnalytics />}
          {activeTab === 'companies' && <AdminCompanies />}
          {activeTab === 'videos' && <AdminVideos />}
          {activeTab === 'advertisements' && <AdminAdvertisements />}
          {activeTab === 'products' && <AdminProducts />}
          {activeTab === 'purchases' && <AdminPointsPurchases />}
          {activeTab === 'redemptions' && <AdminRedemptions />}
          {activeTab === 'users' && <AdminUsers />}
          {activeTab === 'domains' && <AdminApprovedDomains />}
          {activeTab === 'account' && <AdminAccountSettings user={user} />}
        </div>
      </main>
    </div>
  );
}