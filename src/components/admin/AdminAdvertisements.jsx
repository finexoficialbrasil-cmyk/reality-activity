import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Edit2, Trash2, Plus, Upload, Eye, Image as ImageIcon, Video, Power } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useCategories } from '@/hooks/useCategories';
import AdminAdDetailsModal from '@/components/admin/AdminAdDetailsModal';

export default function AdminAdvertisements() {
  const [ads, setAds] = useState([]);
  const { activeCategories } = useCategories();
  const CATEGORIES = activeCategories.map(c => ({ value: c.value, label: `${c.icon || ''} ${c.label}`.trim() }));
  const [domains, setDomains] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [detailsAd, setDetailsAd] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    link: '',
    category: 'outros',
    budget_total: 100,
    reward_per_share: 10
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [adsRes, domainsRes] = await Promise.all([
        base44.entities.Advertisement.list('-created_date', 100),
        base44.entities.ApprovedDomain.list('domain', 100)
      ]);
      setAds(adsRes);
      setDomains(domainsRes);
    } catch (err) {
      toast.error('Erro ao carregar dados');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const validateLink = async (link) => {
    try {
      const res = await base44.functions.invoke('validateAdvertisementLink', { link });
      if (!res.data.valid) {
        toast.error(res.data.message || 'Link inválido');
        return false;
      }
      return true;
    } catch (err) {
      console.error('Erro ao validar link:', err);
      toast.error('Erro ao validar link');
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.link || !formData.category) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setSubmitting(true);
    try {
      const isValid = await validateLink(formData.link);
      if (!isValid) {
        setSubmitting(false);
        return;
      }

      if (editingAd) {
        const currentBudgetTotal = editingAd.budget_total || 0;
        const budgetDifference = formData.budget_total - currentBudgetTotal;
        const newBudgetRemaining = Math.max(0, (editingAd.budget_remaining || 0) + Math.max(0, budgetDifference));

        const updatePayload = {
          ...formData,
          budget_remaining: newBudgetRemaining
        };

        // Reativa o anúncio automaticamente quando há saldo disponível
        if (newBudgetRemaining > 0) {
          updatePayload.status = 'approved';
          updatePayload.is_active = true;
          updatePayload.cooldown_until = null;
        }

        await base44.entities.Advertisement.update(editingAd.id, updatePayload);
        toast.success(newBudgetRemaining > 0 ? 'Anúncio atualizado e reativado!' : 'Anúncio atualizado');
      } else {
        const newAd = await base44.entities.Advertisement.create({
          ...formData,
          budget_remaining: formData.budget_total,
          user_email: 'admin@platform.com',
          user_name: 'Admin',
          status: 'approved'
        });
        toast.success('Anúncio criado (aprovado automaticamente pelo admin)');
      }
      
      setShowForm(false);
      setEditingAd(null);
      setFormData({
        title: '',
        description: '',
        image_url: '',
        link: '',
        category: 'outros',
        budget_total: 100,
        reward_per_share: 10
      });
      
      await loadData();
      setSubmitting(false);
    } catch (err) {
      console.error('Erro ao salvar anúncio:', err);
      toast.error('Erro ao salvar anúncio: ' + (err.message || 'Tente novamente'));
      setSubmitting(false);
    }
  };

  const handleEdit = (ad) => {
    setEditingAd(ad);
    let linkValue = ad.link;
    // Se for Mercado Livre, preserva o código completo
    if (ad.category === 'mercado_livre' && !linkValue.startsWith('https://meli.la/')) {
      linkValue = `https://meli.la/${linkValue}`;
    }
    setFormData({
      title: ad.title,
      description: ad.description || '',
      image_url: ad.image_url || '',
      link: linkValue,
      category: ad.category,
      budget_total: ad.budget_total || 100,
      reward_per_share: ad.reward_per_share || 10
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja deletar?')) return;
    try {
      await base44.entities.Advertisement.delete(id);
      toast.success('Anúncio deletado');
      loadData();
    } catch (err) {
      console.error('Erro ao deletar:', err);
      toast.error('Erro ao deletar');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const updateData = { status: newStatus };
      // Ao aprovar, limpa o cooldown e reativa a exibição
      if (newStatus === 'approved') {
        updateData.is_active = true;
        updateData.cooldown_until = null;
      }
      await base44.entities.Advertisement.update(id, updateData);
      toast.success(`Status alterado para ${newStatus}`);
      loadData();
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      toast.error('Erro ao atualizar status');
    }
  };

  const handleToggleActive = async (ad) => {
    try {
      await base44.entities.Advertisement.update(ad.id, { is_active: !ad.is_active });
      toast.success(ad.is_active ? 'Anúncio desativado' : 'Anúncio ativado');
      loadData();
    } catch (err) {
      console.error('Erro ao alternar status:', err);
      toast.error('Erro ao alternar status');
    }
  };

  const filteredAds = ads.filter(ad => {
    const matchSearch = !searchQuery ||
      ad.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ad.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ad.user_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || ad.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><div className="animate-spin w-8 h-8 border-4 border-gold border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Anúncios</h2>
          <p className="text-muted-foreground">Gerenciar anúncios compartilháveis</p>
        </div>
        <Button onClick={() => { setShowForm(!showForm); setEditingAd(null); }} className="bg-gold text-background hover:bg-gold-dark">
          <Plus className="w-4 h-4 mr-2" /> Novo Anúncio
        </Button>
      </div>

      {/* Formulário */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="Título do anúncio"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
            <Textarea
              placeholder="Descrição"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
            <Input
              placeholder="URL da imagem"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
            />
            {formData.category === 'mercado_livre' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Código Mercado Livre</label>
                <div className="flex gap-2 items-center">
                  <span className="text-muted-foreground text-sm">https://meli.la/</span>
                  <Input
                    placeholder="1B6VAmR"
                    value={formData.link.replace('https://meli.la/', '')}
                    onChange={(e) => setFormData({ ...formData, link: `https://meli.la/${e.target.value}` })}
                  />
                </div>
              </div>
            ) : (
              <Input
                placeholder="Link do anúncio (Shopee, Amazon, etc)"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              />
            )}
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                placeholder="Orçamento total (pts)"
                value={formData.budget_total}
                onChange={(e) => setFormData({ ...formData, budget_total: parseInt(e.target.value) })}
              />
              <Input
                type="number"
                placeholder="Pontos por compartilhamento"
                value={formData.reward_per_share}
                onChange={(e) => setFormData({ ...formData, reward_per_share: parseInt(e.target.value) })}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={submitting}>
                {submitting ? '⏳ Salvando...' : (editingAd ? 'Atualizar' : 'Criar')}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingAd(null); }} disabled={submitting}>
                Cancelar
              </Button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Buscar por título, usuário ou email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="approved">Aprovado</SelectItem>
            <SelectItem value="rejected">Rejeitado</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground self-center">{filteredAds.length} de {ads.length} anúncios</span>
      </div>

      {/* Lista de Anúncios */}
      <div className="rounded-xl border border-border overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead className="bg-secondary/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Título</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Publicado por</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Categoria</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Tipo</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
              <th className="px-4 py-3 text-center text-sm font-semibold">Shares</th>
              <th className="px-4 py-3 text-center text-sm font-semibold">Custo/Recompensa</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Data</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredAds.map((ad) => {
              return (
                <tr key={ad.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 max-w-[280px]">
                      {ad.image_url ? (
                        <img src={ad.image_url} alt={ad.title} className="w-10 h-10 rounded object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center flex-shrink-0">
                          {ad.type === 'video' ? <Video className="w-4 h-4 text-muted-foreground" /> : <ImageIcon className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      )}
                      <span className="text-sm font-medium text-foreground truncate">{ad.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-foreground">{ad.user_name || '—'}</div>
                    <div className="text-xs text-muted-foreground">{ad.user_email || '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{ad.category}</td>
                  <td className="px-4 py-3">
                    {ad.type === 'video' ? (
                      <span className="inline-flex items-center gap-1 text-xs text-purple-400"><Video className="w-3.5 h-3.5" /> Vídeo</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-blue-400"><ImageIcon className="w-3.5 h-3.5" /> Imagem</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Select value={ad.status} onValueChange={(value) => handleStatusChange(ad.id, value)}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">⏳ Pendente</SelectItem>
                        <SelectItem value="approved">✅ Aprovado</SelectItem>
                        <SelectItem value="rejected">❌ Rejeitado</SelectItem>
                        <SelectItem value="inactive">⊘ Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-semibold text-gold">{ad.shares_count || 0}</td>
                  <td className="px-4 py-3 text-center text-sm">
                    <span className={ad.budget_remaining <= 0 ? 'text-destructive font-semibold' : 'text-gold font-semibold'}>
                      {ad.budget_remaining || 0}/{ad.budget_total || 0} pts
                    </span>
                    <div className="text-xs text-muted-foreground">{ad.reward_per_share || 0}/share</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(ad.created_date)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setDetailsAd(ad)} title="Ver detalhes">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleToggleActive(ad)} title={ad.is_active ? 'Desativar' : 'Ativar'}>
                        <Power className={`w-4 h-4 ${ad.is_active ? 'text-green-500' : 'text-muted-foreground'}`} />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(ad)} title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(ad.id)} className="text-destructive" title="Deletar">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredAds.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">Nenhum anúncio encontrado</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Detalhes */}
      <AdminAdDetailsModal
        ad={detailsAd}
        onClose={() => setDetailsAd(null)}
        onEdit={(ad) => { handleEdit(ad); setDetailsAd(null); }}
        onToggleActive={handleToggleActive}
        onDelete={(id) => { handleDelete(id); setDetailsAd(null); }}
      />

      {/* Domínios Aprovados */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold text-lg mb-4">Domínios Aprovados ({domains.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {domains.map(d => (
            <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{d.domain}</p>
                <p className="text-xs text-muted-foreground">{d.company_name}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}