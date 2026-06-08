import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Edit2, Trash2, Plus, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const CATEGORIES = [
  { value: 'mercado_livre', label: '💰 Mercado Livre' },
  { value: 'shopee', label: '🛒 Shopee' },
  { value: 'tiktok_shop', label: '🎵 TikTok Shop' },
  { value: 'amazon', label: '📦 Amazon' },
  { value: 'produtos_digitais', label: '💻 Produtos Digitais' },
  { value: 'servicos', label: '🔧 Serviços' },
  { value: 'outros', label: '⭐ Outros' }
];

export default function AdminAdvertisements() {
  const [ads, setAds] = useState([]);
  const [domains, setDomains] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    link: '',
    category: 'outros',
    cost_to_publish: 100,
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
        await base44.asServiceRole.entities.Advertisement.update(editingAd.id, formData);
        toast.success('Anúncio atualizado');
      } else {
        await base44.asServiceRole.entities.Advertisement.create(formData);
        toast.success('Anúncio criado');
      }
      
      setShowForm(false);
      setEditingAd(null);
      setFormData({
        title: '',
        description: '',
        image_url: '',
        link: '',
        category: 'outros',
        cost_to_publish: 100,
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
      cost_to_publish: ad.cost_to_publish || 100,
      reward_per_share: ad.reward_per_share || 10
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja deletar?')) return;
    try {
      await base44.asServiceRole.entities.Advertisement.delete(id);
      toast.success('Anúncio deletado');
      loadData();
    } catch {
      toast.error('Erro ao deletar');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await base44.asServiceRole.entities.Advertisement.update(id, { status: newStatus });
      toast.success(`Status alterado para ${newStatus}`);
      loadData();
    } catch {
      toast.error('Erro ao atualizar status');
    }
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
                placeholder="Custo para publicar (pts)"
                value={formData.cost_to_publish}
                onChange={(e) => setFormData({ ...formData, cost_to_publish: parseInt(e.target.value) })}
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

      {/* Lista de Anúncios */}
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-secondary/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Título</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Categoria</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
              <th className="px-4 py-3 text-center text-sm font-semibold">Compartilhamentos</th>
              <th className="px-4 py-3 text-center text-sm font-semibold">Custo/Recompensa</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ads.map((ad) => (
              <tr key={ad.id} className="hover:bg-secondary/30 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-foreground">{ad.title}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{ad.category}</td>
                <td className="px-4 py-3">
                  <Select value={ad.status} onValueChange={(value) => handleStatusChange(ad.id, value)}>
                    <SelectTrigger className="w-32">
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
                <td className="px-4 py-3 text-center text-sm font-semibold text-gold">{ad.shares_count}</td>
                <td className="px-4 py-3 text-center text-sm text-muted-foreground">{ad.cost_to_publish}pt / +{ad.reward_per_share}pt</td>
                <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(ad)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(ad.id)} className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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