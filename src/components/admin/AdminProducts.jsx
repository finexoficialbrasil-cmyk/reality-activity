import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  useEffect(() => { load(); }, []);

  const load = async () => {
    const [prods, comps] = await Promise.all([
      base44.entities.Product.list('points_cost'),
      base44.entities.Company.filter({ is_active: true }, 'order')
    ]);
    setProducts(prods);
    setCompanies(comps);
    setLoading(false);
  };

  const defaultForm = () => ({
    name: '', company_id: companies[0]?.id || '', description: '', image_url: '',
    points_cost: 100, original_price: 0, category: '', stock: 999, is_active: true
  });

  const openNew = () => { setEditing(null); setForm(defaultForm()); setShowForm(true); };
  const openEdit = (p) => { setEditing(p); setForm({ ...p }); setShowForm(true); };

  const handleSave = async () => {
    if (editing) await base44.entities.Product.update(editing.id, form);
    else await base44.entities.Product.create(form);
    setShowForm(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Excluir este produto?')) return;
    await base44.entities.Product.delete(id);
    load();
  };

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const companiesMap = companies.reduce((a, c) => { a[c.id] = c; return a; }, {});

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-grotesk font-bold text-2xl">Produtos para Resgate</h2>
        <Button onClick={openNew} className="bg-gold text-background hover:bg-gold-dark">
          <Plus className="w-4 h-4 mr-2" /> Novo Produto
        </Button>
      </div>

      {showForm && (
        <div className="bg-card border border-gold/30 rounded-2xl p-6 mb-6">
          <h3 className="font-semibold mb-4">{editing ? 'Editar Produto' : 'Novo Produto'}</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nome *</label>
              <input value={form.name || ''} onChange={e => set('name', e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Empresa *</label>
              <select value={form.company_id || ''} onChange={e => set('company_id', e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm">
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Custo em Pontos *</label>
              <input type="number" value={form.points_cost || 100} onChange={e => set('points_cost', Number(e.target.value))}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Preço Original (R$)</label>
              <input type="number" value={form.original_price || 0} onChange={e => set('original_price', Number(e.target.value))}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">URL da Imagem</label>
              <input value={form.image_url || ''} onChange={e => set('image_url', e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Estoque</label>
              <input type="number" value={form.stock || 999} onChange={e => set('stock', Number(e.target.value))}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/50" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Descrição</label>
              <textarea value={form.description || ''} onChange={e => set('description', e.target.value)}
                rows={2} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-gold/50" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="p-active" checked={!!form.is_active} onChange={e => set('is_active', e.target.checked)} className="accent-gold" />
              <label htmlFor="p-active" className="text-sm cursor-pointer">Ativo</label>
            </div>
          </div>
          <div className="flex gap-3 mt-4 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} className="flex-1 bg-gold text-background hover:bg-gold-dark">Salvar</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          Array(8).fill(0).map((_, i) => <div key={i} className="h-48 bg-card rounded-xl animate-pulse" />)
        ) : products.map(p => (
          <div key={p.id} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="aspect-video bg-secondary relative">
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Gift className="w-8 h-8 text-muted-foreground opacity-40" />
                </div>
              )}
            </div>
            <div className="p-3">
              <h3 className="font-medium text-sm line-clamp-1">{p.name}</h3>
              <p className="text-xs text-muted-foreground">{companiesMap[p.company_id]?.name}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm font-bold text-gold">{p.points_cost.toLocaleString()} pts</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${p.is_active ? 'bg-green-500/10 text-green-400' : 'bg-muted text-muted-foreground'}`}>
                  {p.is_active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <div className="flex gap-1 mt-2">
                <Button variant="ghost" size="sm" onClick={() => openEdit(p)} className="flex-1 text-xs h-7">
                  <Pencil className="w-3 h-3 mr-1" /> Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} className="flex-1 text-xs h-7 text-destructive hover:text-destructive">
                  <Trash2 className="w-3 h-3 mr-1" /> Excluir
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}