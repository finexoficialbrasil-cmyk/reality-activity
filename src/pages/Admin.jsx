import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import {
  Building2, Play, Package, Star, TrendingUp, Users,
  Gift, CheckCircle, XCircle, BarChart3, ShieldCheck,
  Plus, Eye, Settings
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

export default function Admin() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('stats');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (auth) => {
      if (!auth) { base44.auth.redirectToLogin('/admin'); return; }
      const me = await base44.auth.me();
      if (me.role !== 'admin') { window.location.href = '/'; return; }
      setUser(me);
      setLoading(false);
    });
  }, []);

  const tabs = [
    { id: 'stats', label: 'Dashboard', icon: BarChart3 },
    { id: 'companies', label: 'Empresas', icon: Building2 },
    { id: 'videos', label: 'Vídeos', icon: Play },
    { id: 'advertisements', label: 'Anúncios', icon: Star },
    { id: 'products', label: 'Produtos', icon: Package },
    { id: 'redemptions', label: 'Resgates', icon: Gift },
    { id: 'users', label: 'Usuários', icon: Users },
    { id: 'account', label: 'Conta', icon: Settings },
  ];

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-border border-t-gold rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Topbar */}
      <div className="fixed top-0 left-0 right-0 z-50 glass border-b border-border h-14 flex items-center px-4 gap-3">
        <Link to="/" className="flex items-center gap-2 mr-4">
          <div className="w-7 h-7 rounded-lg bg-gold flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-background" />
          </div>
          <span className="font-grotesk font-bold text-sm">Admin <span className="text-gold">Panel</span></span>
        </Link>

        <nav className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-gold/10 text-gold border border-gold/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:block">{user?.full_name}</span>
          <Link to="/" className="text-xs text-gold hover:underline">← Ver site</Link>
        </div>
      </div>

      {/* Content */}
       <div className="pt-14 p-6">
         {activeTab === 'stats' && <AdminStats />}
         {activeTab === 'companies' && <AdminCompanies />}
         {activeTab === 'videos' && <AdminVideos />}
         {activeTab === 'advertisements' && <AdminAdvertisements />}
         {activeTab === 'products' && <AdminProducts />}
         {activeTab === 'redemptions' && <AdminRedemptions />}
         {activeTab === 'users' && <AdminUsers />}
         {activeTab === 'account' && <AdminAccountSettings user={user} />}
       </div>
    </div>
  );
}