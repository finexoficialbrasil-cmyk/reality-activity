import { useState, useEffect, Fragment } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Check, X, ShieldAlert, Clock, CheckCircle, XCircle, Search, Ban, ChevronDown, ChevronUp, UserX, AlertTriangle, Globe, Fingerprint, Calendar, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';

const statusConfig = {
  completed: { label: 'Concluída', color: 'text-green-400 bg-green-500/10', icon: CheckCircle },
  under_review: { label: 'Em análise', color: 'text-yellow-400 bg-yellow-500/10', icon: Clock },
  blocked: { label: 'Bloqueada', color: 'text-red-400 bg-red-500/10', icon: XCircle },
  cancelled: { label: 'Cancelada', color: 'text-gray-400 bg-gray-500/10', icon: XCircle },
};

const riskConfig = {
  low: { label: 'Baixo', color: 'text-green-400' },
  medium: { label: 'Médio', color: 'text-yellow-400' },
  high: { label: 'Alto', color: 'text-red-400' },
};

function getAccountAge(createdDate) {
  if (!createdDate) return null;
  const days = Math.floor((Date.now() - new Date(createdDate).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return { label: 'Hoje', days, badge: 'bg-red-500/10 text-red-400', suspicious: true };
  if (days === 1) return { label: '1 dia', days, badge: 'bg-red-500/10 text-red-400', suspicious: true };
  if (days < 7) return { label: `${days} dias`, days, badge: 'bg-orange-500/10 text-orange-400', suspicious: true };
  if (days < 30) return { label: `${days} dias`, days, badge: 'bg-yellow-500/10 text-yellow-400', suspicious: false };
  return { label: `${Math.floor(days / 30)} meses`, days, badge: 'bg-green-500/10 text-green-400', suspicious: false };
}

export default function AdminTransfers() {
  const [transfers, setTransfers] = useState([]);
  const [keys, setKeys] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('30d');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('transfers');
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewAction, setReviewAction] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [t, k, users] = await Promise.all([
        base44.entities.PointsTransfer.list('-created_date', 500),
        base44.entities.UserTransferKey.list('-created_date', 500),
        base44.entities.User.list('-created_date', 500)
      ]);
      setTransfers(t);
      setKeys(k);
      const uMap = {};
      users.forEach(u => { uMap[u.email] = u; });
      setUsersMap(uMap);
    } catch (e) {
      console.error('Erro:', e);
    } finally {
      setLoading(false);
    }
  };

  const getDateCutoff = () => {
    const now = new Date();
    if (dateFilter === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    if (dateFilter === '7d') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    if (dateFilter === '30d') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    return '';
  };

  const filtered = transfers.filter(t => {
    if (filter === 'suspicious' && t.risk_level !== 'high' && t.risk_level !== 'medium') return false;
    if (filter !== 'all' && filter !== 'suspicious' && t.status !== filter) return false;
    if (dateFilter !== 'all') {
      const cutoff = getDateCutoff();
      if (new Date(t.created_date) < new Date(cutoff)) return false;
    }
    if (search) {
      const s = search.toLowerCase();
      if (!t.sender_name?.toLowerCase().includes(s) &&
          !t.receiver_name?.toLowerCase().includes(s) &&
          !t.transfer_id?.toLowerCase().includes(s) &&
          !t.sender_email?.toLowerCase().includes(s) &&
          !t.receiver_email?.toLowerCase().includes(s) &&
          !t.sender_ip?.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  // Suspicious activity summary
  const suspiciousStats = (() => {
    let newAccounts = 0;
    let highRisk = 0;
    let underReview = 0;
    let blockedKeys = 0;
    const ipMap = {};

    transfers.forEach(t => {
      if (t.risk_level === 'high') highRisk++;
      if (t.status === 'under_review') underReview++;
      if (t.sender_ip) {
        if (!ipMap[t.sender_ip]) ipMap[t.sender_ip] = new Set();
        ipMap[t.sender_ip].add(t.sender_email);
      }
      const senderUser = usersMap[t.sender_email];
      if (senderUser) {
        const age = getAccountAge(senderUser.created_date);
        if (age && age.suspicious) newAccounts++;
      }
    });

    keys.forEach(k => { if (k.is_blocked) blockedKeys++; });

    const sharedIps = Object.entries(ipMap).filter(([, emails]) => emails.size > 1).length;

    return { newAccounts, highRisk, underReview, blockedKeys, sharedIps };
  })();

  const handleReview = async () => {
    if (!reviewModal) return;
    try {
      if (reviewAction === 'approve') {
        await base44.entities.PointsTransfer.update(reviewModal.id, { status: 'completed' });
        toast.success('Transferência aprovada!');
      } else {
        const senderPoints = await base44.entities.UserPoints.filter({ user_email: reviewModal.sender_email });
        if (senderPoints[0]) {
          await base44.entities.UserPoints.update(senderPoints[0].id, {
            balance: senderPoints[0].balance + reviewModal.points_amount,
            total_spent: (senderPoints[0].total_spent || 0) - reviewModal.points_amount
          });
        }
        await base44.entities.PointsTransfer.update(reviewModal.id, { status: 'blocked' });
        await base44.entities.PointsTransaction.create({
          user_email: reviewModal.sender_email,
          user_name: reviewModal.sender_name,
          type: 'manual_adjust',
          points: reviewModal.points_amount,
          description: `Transferência ${reviewModal.transfer_id} rejeitada - pontos retornados`
        });
        toast.success('Transferência rejeitada e pontos devolvidos');
      }
      setReviewModal(null);
      loadData();
    } catch (e) {
      toast.error('Erro ao processar');
    }
  };

  const handleBlockKey = async (key) => {
    try {
      await base44.entities.UserTransferKey.update(key.id, { is_blocked: !key.is_blocked });
      toast.success(key.is_blocked ? 'Chave desbloqueada' : 'Chave bloqueada');
      loadData();
    } catch (e) {
      toast.error('Erro ao bloquear chave');
    }
  };

  const renderUserAudit = (email, name, role) => {
    const user = usersMap[email];
    const age = user ? getAccountAge(user.created_date) : null;
    const userKey = keys.find(k => k.user_email === email);

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">{role}</span>
          {age && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${age.badge} flex items-center gap-1`}>
              <Calendar className="w-3 h-3" /> Conta: {age.label}
            </span>
          )}
          {userKey?.is_blocked && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 flex items-center gap-1">
              <UserX className="w-3 h-3" /> Chave bloqueada
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div><span className="text-muted-foreground">Nome:</span> <span className="font-medium">{name}</span></div>
          <div><span className="text-muted-foreground">Email:</span> <span className="font-medium break-all">{email}</span></div>
          {user && <div><span className="text-muted-foreground">Criado em:</span> <span className="font-medium">{new Date(user.created_date).toLocaleDateString('pt-BR')} {new Date(user.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></div>}
          {userKey && <div><span className="text-muted-foreground">Chave:</span> <span className="font-mono">{userKey.transfer_key}</span></div>}
          {userKey && <div><span className="text-muted-foreground">Volume total:</span> <span className="font-medium text-gold">{(userKey.total_volume || 0).toLocaleString('pt-BR')} pts</span></div>}
          {userKey && <div><span className="text-muted-foreground">Transfers:</span> <span className="font-medium">{userKey.transfers_count || 0}</span></div>}
        </div>
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Suspicious Activity Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-card border border-red-500/20 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-xs text-muted-foreground">Risco Alto</span>
          </div>
          <p className="text-xl font-bold text-red-400">{suspiciousStats.highRisk}</p>
        </div>
        <div className="bg-card border border-yellow-500/20 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-muted-foreground">Em Análise</span>
          </div>
          <p className="text-xl font-bold text-yellow-400">{suspiciousStats.underReview}</p>
        </div>
        <div className="bg-card border border-orange-500/20 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-orange-400" />
            <span className="text-xs text-muted-foreground">Contas Novas</span>
          </div>
          <p className="text-xl font-bold text-orange-400">{suspiciousStats.newAccounts}</p>
        </div>
        <div className="bg-card border border-purple/20 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-4 h-4 text-purple" />
            <span className="text-xs text-muted-foreground">IPs Compartilhados</span>
          </div>
          <p className="text-xl font-bold text-purple">{suspiciousStats.sharedIps}</p>
        </div>
        <div className="bg-card border border-red-500/20 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <UserX className="w-4 h-4 text-red-400" />
            <span className="text-xs text-muted-foreground">Chaves Bloq.</span>
          </div>
          <p className="text-xl font-bold text-red-400">{suspiciousStats.blockedKeys}</p>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <button onClick={() => setView('transfers')} className={`px-4 py-2 rounded-lg text-sm font-medium ${view === 'transfers' ? 'bg-gold text-background' : 'bg-card border border-border'}`}>
          Transferências
        </button>
        <button onClick={() => setView('keys')} className={`px-4 py-2 rounded-lg text-sm font-medium ${view === 'keys' ? 'bg-gold text-background' : 'bg-card border border-border'}`}>
          Chaves de Usuários
        </button>
      </div>

      {view === 'transfers' ? (
        <>
          {/* Filters */}
          <div className="flex gap-2 flex-wrap items-center">
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-3 py-1.5 bg-card border border-border rounded-lg text-sm">
              <option value="all">Todos os status</option>
              <option value="completed">Concluídas</option>
              <option value="under_review">Em análise</option>
              <option value="blocked">Bloqueadas</option>
              <option value="suspicious">⚠️ Suspeitas</option>
            </select>
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="px-3 py-1.5 bg-card border border-border rounded-lg text-sm">
              <option value="today">Hoje</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="all">Todo o período</option>
            </select>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, email, ID ou IP..."
                className="w-full pl-9 pr-3 py-1.5 bg-card border border-border rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {loading ? (
              <div className="p-8 text-center"><div className="w-8 h-8 border-4 border-border border-t-gold rounded-full animate-spin mx-auto" /></div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Nenhuma transferência encontrada</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground w-8"></th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Remetente</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Destinatário</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Pontos</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Data</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Risco</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((t) => {
                      const sc = statusConfig[t.status] || statusConfig.completed;
                      const SIcon = sc.icon;
                      const rc = riskConfig[t.risk_level] || riskConfig.low;
                      const isExpanded = expandedRow === t.id;
                      const senderUser = usersMap[t.sender_email];
                      const receiverUser = usersMap[t.receiver_email];
                      const senderAge = senderUser ? getAccountAge(senderUser.created_date) : null;
                      const receiverAge = receiverUser ? getAccountAge(receiverUser.created_date) : null;
                      const showSuspicious = (senderAge?.suspicious || receiverAge?.suspicious || t.risk_level === 'high');

                      return (
                        <Fragment key={t.id}>
                          <tr
                            className={`border-b border-border hover:bg-secondary/20 cursor-pointer ${showSuspicious ? 'bg-red-500/5' : ''}`}
                            onClick={() => setExpandedRow(isExpanded ? null : t.id)}
                          >
                            <td className="px-3 py-3 text-center">
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                            </td>
                            <td className="px-4 py-3"><p className="text-xs font-mono">{t.transfer_id}</p></td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium">{t.sender_name}</p>
                                {senderAge?.suspicious && <span className="w-2 h-2 rounded-full bg-red-400" title="Conta nova" />}
                              </div>
                              <p className="text-xs text-muted-foreground">{t.sender_email}</p>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium">{t.receiver_name}</p>
                                {receiverAge?.suspicious && <span className="w-2 h-2 rounded-full bg-red-400" title="Conta nova" />}
                              </div>
                              <p className="text-xs text-muted-foreground">{t.receiver_email}</p>
                            </td>
                            <td className="px-4 py-3 text-right"><p className="font-semibold text-sm text-gold">{t.points_amount.toLocaleString('pt-BR')}</p></td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(t.created_date).toLocaleDateString('pt-BR')} {new Date(t.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-medium ${rc.color}`}>
                                {t.risk_level === 'high' && <ShieldAlert className="w-3 h-3 inline mr-1" />}
                                {rc.label}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-1 rounded-full inline-flex items-center gap-1 ${sc.color}`}>
                                <SIcon className="w-3 h-3" /> {sc.label}
                              </span>
                            </td>
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              {t.status === 'under_review' && (
                                <div className="flex items-center gap-1 justify-center">
                                  <button onClick={() => { setReviewModal(t); setReviewAction('approve'); }} title="Aprovar" className="p-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20">
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => { setReviewModal(t); setReviewAction('reject'); }} title="Rejeitar" className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                          {isExpanded && (
                          <tr>
                              <td colSpan={9} className="px-6 py-4 bg-secondary/20 border-b border-border">
                                <div className="grid md:grid-cols-2 gap-6">
                                  {/* Sender Audit */}
                                  <div className="space-y-3">
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Remetente</h4>
                                    {renderUserAudit(t.sender_email, t.sender_name, 'Enviou')}
                                  </div>
                                  {/* Receiver Audit */}
                                  <div className="space-y-3">
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Destinatário</h4>
                                    {renderUserAudit(t.receiver_email, t.receiver_name, 'Recebeu')}
                                  </div>
                                </div>

                                {/* Transfer Technical Details */}
                                <div className="mt-4 pt-4 border-t border-border grid md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dados Técnicos</h4>
                                    <div className="grid grid-cols-1 gap-1 text-xs">
                                      {t.sender_ip && (
                                        <div className="flex items-center gap-2">
                                          <Globe className="w-3 h-3 text-muted-foreground" />
                                          <span className="text-muted-foreground">IP:</span>
                                          <span className="font-mono">{t.sender_ip}</span>
                                        </div>
                                      )}
                                      {t.sender_user_agent && (
                                        <div className="flex items-start gap-2">
                                          <Fingerprint className="w-3 h-3 text-muted-foreground mt-0.5" />
                                          <span className="text-muted-foreground">User-Agent:</span>
                                          <span className="font-mono text-[10px] break-all">{t.sender_user_agent}</span>
                                        </div>
                                      )}
                                      <div className="flex items-center gap-2">
                                        <KeyRound className="w-3 h-3 text-muted-foreground" />
                                        <span className="text-muted-foreground">2FA:</span>
                                        <span>{t.requires_2fa ? 'Sim' : 'Não'}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Análise de Risco</h4>
                                    {t.risk_reason ? (
                                      <div className="flex items-start gap-2 text-xs">
                                        <ShieldAlert className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                                        <span className="text-yellow-400">{t.risk_reason}</span>
                                      </div>
                                    ) : (
                                      <p className="text-xs text-muted-foreground">Nenhum alerta de risco detectado</p>
                                    )}
                                    {t.processed_date && (
                                      <p className="text-xs text-muted-foreground">Processado em: {new Date(t.processed_date).toLocaleString('pt-BR')}</p>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Keys View */
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center"><div className="w-8 h-8 border-4 border-border border-t-gold rounded-full animate-spin mx-auto" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Usuário</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Chave</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Transferências</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Volume</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map(k => {
                    const user = usersMap[k.user_email];
                    const age = user ? getAccountAge(user.created_date) : null;
                    return (
                      <tr key={k.id} className="border-b border-border hover:bg-secondary/20">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium">{k.user_name}</p>
                            {age?.suspicious && <span className="w-2 h-2 rounded-full bg-red-400" title="Conta nova" />}
                          </div>
                          <p className="text-xs text-muted-foreground">{k.user_email}</p>
                          {age && <span className={`text-xs px-1.5 py-0.5 rounded ${age.badge}`}>{age.label}</span>}
                        </td>
                        <td className="px-4 py-3"><p className="text-xs font-mono">{k.transfer_key}</p></td>
                        <td className="px-4 py-3 text-right text-sm">{(k.transfers_count || 0).toLocaleString('pt-BR')}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-gold">{(k.total_volume || 0).toLocaleString('pt-BR')} pts</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${k.is_blocked ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                            {k.is_blocked ? 'Bloqueada' : 'Ativa'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => handleBlockKey(k)} className={`p-1.5 rounded-lg ${k.is_blocked ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'}`} title={k.is_blocked ? 'Desbloquear' : 'Bloquear'}>
                            {k.is_blocked ? <Check className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!reviewModal} onOpenChange={(o) => !o && setReviewModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reviewAction === 'approve' ? 'Aprovar Transferência' : 'Rejeitar Transferência'}</DialogTitle>
          </DialogHeader>
          {reviewModal && (
            <div className="space-y-3 py-4">
              <div className="bg-secondary/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">ID:</span><span className="font-mono">{reviewModal.transfer_id}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">De:</span><span className="font-semibold">{reviewModal.sender_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Para:</span><span className="font-semibold">{reviewModal.receiver_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Quantidade:</span><span className="font-semibold text-gold">{reviewModal.points_amount.toLocaleString('pt-BR')} pts</span></div>
                {reviewModal.risk_reason && <div className="text-xs text-yellow-400 pt-2 border-t border-border">⚠️ {reviewModal.risk_reason}</div>}
              </div>
              <p className="text-sm text-muted-foreground">
                {reviewAction === 'approve'
                  ? 'A transferência será marcada como concluída.'
                  : 'A transferência será bloqueada e os pontos devolvidos ao remetente.'}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewModal(null)}>Cancelar</Button>
            <Button
              onClick={handleReview}
              className={reviewAction === 'approve' ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-red-500 text-white hover:bg-red-600'}
            >
              {reviewAction === 'approve' ? 'Aprovar' : 'Rejeitar e Devolver'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}