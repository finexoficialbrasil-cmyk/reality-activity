import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, ToggleLeft, ToggleRight, Globe, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const CATEGORIES = [
  { value: 'mercado_livre', label: '💰 Mercado Livre' },
  { value: 'shopee', label: '🛒 Shopee' },
  { value: 'tiktok_shop', label: '🎵 TikTok Shop' },
  { value: 'amazon', label: '📦 Amazon' },
  { value: 'produtos_digitais', label: '💻 Produtos Digitais' },
  { value: 'servicos', label: '🔧 Serviços' },
  { value: 'outros', label: '⭐ Outros' },
];

const DEFAULT_DOMAINS = [
  { domain: 'mercadolivre.com.br', company_name: 'Mercado Livre', category: 'mercado_livre' },
  { domain: 'mercadolibre.com', company_name: 'Mercado Libre', category: 'mercado_livre' },
  { domain: 'meli.la', company_name: 'Mercado Livre (short)', category: 'mercado_livre' },
  { domain: 'shopee.com.br', company_name: 'Shopee', category: 'shopee' },
  { domain: 'shope.ee', company_name: 'Shopee (short)', category: 'shopee' },
  { domain: 'amazon.com.br', company_name: 'Amazon', category: 'amazon' },
  { domain: 'amzn.to', company_name: 'Amazon (short)', category: 'amazon' },
  { domain: 'youtu.be', company_name: 'YouTube (short)', category: 'outros' },
  { domain: 'youtube.com', company_name: 'YouTube', category: 'outros' },
  { domain: 'tiktok.com', company_name: 'TikTok Shop', category: 'tiktok_shop' },
];

export default function AdminApprovedDomains() {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState({ domain: '', company_name: '', category: 'outros', notes: '' });
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const data = await base44.entities.ApprovedDomain.list('-created_date');
    setDomains(data);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!form.domain || !form.company_name) {
      toast.error('Preencha domínio e nome da empresa');
      return;
    }
    setSaving(true);
    // Extrai apenas o domínio base (sem protocolo, path, etc.)
    let domain = form.domain.trim().toLowerCase();
    try { domain = new URL(domain.startsWith('http') ? domain : 'https://' + domain).hostname; } catch {}
    domain = domain.replace(/^www\./, '');

    await base44.entities.ApprovedDomain.create({
      domain,
      company_name: form.company_name,
      category: form.category,
      notes: form.notes,
      is_active: true,
    });
    toast.success('Domínio adicionado!');
    setForm({ domain: '', company_name: '', category: 'outros', notes: '' });
    setShowForm(false);
    setSaving(false);
    load();
  };

  const handleToggle = async (d) => {
    await base44.entities.ApprovedDomain.update(d.id, { is_active: !d.is_active });
    load();
  };

  const handleDelete = async () => {
    await base44.entities.ApprovedDomain.delete(deletingId);
    setDeletingId(null);
    load();
  };

  const seedDefaults = async () => {
    const existing = domains.map(d => d.domain);
    const toAdd = DEFAULT_DOMAINS.filter(d => !existing.includes(d.domain));
    if (toAdd.length === 0) { toast.info('Todos os domínios padrão já estão cadastrados'); return; }
    await base44.entities.ApprovedDomain.bulkCreate(toAdd.map(d => ({ ...d, is_active: true })));
    toast.success(`${toAdd.length} domínios padrão adicionados!`);
    load();
  };

  const categoryLabel = (cat) => CATEGORIES.find(c => c.value === cat)?.label || cat;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-grotesk font-bold text-2xl">Domínios Permitidos</h2>
          <p className="text-sm text-muted-foreground mt-1">Controle quais sites podem ser usados nos anúncios</p>
        </div>
        <div className="flex gap-2">
          {domains.length === 0 && (
            <Button variant="outline" onClick={seedDefaults} className="text-xs border-gold/40 text-gold hover:bg-gold/10">
              + Adicionar padrões
            </Button>
          )}
          <Button onClick={() => setShowForm(!showForm)} className="bg-gold text-background hover:bg-gold-dark">
            <Plus className="w-4 h-4 mr-2" /> Novo Domínio
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 p-4 bg-gold/10 border border-gold/20 rounded-lg mb-6">
        <AlertCircle className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
        <div className="text-sm text-gold">
          <p className="font-semibold">Como funciona</p>
          <p className="text-xs mt-1">Ao cadastrar <code className="bg-gold/20 px-1 rounded">youtu.be</code>, <strong>todos</strong> os links desse domínio serão aceitos (ex: https://youtu.be/qualquerID). Você pode desativar temporariamente sem excluir.</p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-card border border-gold/30 rounded-2xl p-5 mb-6 space-y-4">
          <h3 className="font-semibold">Novo Domínio</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Domínio ou URL *</label>
              <Input
                value={form.domain}
                onChange={e => setForm({ ...form, domain: e.target.value })}
                placeholder="youtu.be ou https://youtu.be/VIDEO"
              />
              <p className="text-xs text-muted-foreground mt-1">Cole qualquer link do domínio — o sistema extrai automaticamente</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nome / Empresa *</label>
              <Input
                value={form.company_name}
                onChange={e => setForm({ ...form, company_name: e.target.value })}
                placeholder="Ex: YouTube"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Categoria</label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Observações</label>
              <Input
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Opcional"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleAdd} disabled={saving} className="flex-1 bg-gold text-background hover:bg-gold-dark">
              {saving ? 'Salvando...' : 'Adicionar'}
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Domínio</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden md:table-cell">Empresa</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden lg:table-cell">Categoria</th>
              <th className="text-center px-4 py-3 text-muted-foreground font-medium">Status</th>
              <th className="text-right px-4 py-3 text-muted-foreground font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  <td colSpan={5} className="px-4 py-3"><div className="h-4 bg-secondary rounded animate-pulse" /></td>
                </tr>
              ))
            ) : domains.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  <Globe className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>Nenhum domínio cadastrado.</p>
                  <button onClick={seedDefaults} className="mt-2 text-gold hover:underline text-sm">Adicionar domínios padrão</button>
                </td>
              </tr>
            ) : domains.map(d => (
              <tr key={d.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-mono text-sm font-medium">{d.domain}</span>
                  </div>
                  {d.notes && <p className="text-xs text-muted-foreground mt-0.5 ml-6">{d.notes}</p>}
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{d.company_name}</td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{categoryLabel(d.category)}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => handleToggle(d)}>
                    {d.is_active
                      ? <span className="inline-flex items-center gap-1 text-xs text-green-400"><ToggleRight className="w-5 h-5" /> Ativo</span>
                      : <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><ToggleLeft className="w-5 h-5" /> Inativo</span>
                    }
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="icon" onClick={() => setDeletingId(d.id)} className="h-7 w-7 text-destructive hover:text-destructive">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AlertDialog open={!!deletingId} onOpenChange={open => { if (!open) setDeletingId(null); }}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir domínio?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. Links com este domínio serão recusados nos anúncios.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}