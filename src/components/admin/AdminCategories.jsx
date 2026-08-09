import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    value: '',
    label: '',
    icon: '',
    order: 0,
    is_active: true
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const cats = await base44.entities.Category.list('order', 200);
      setCategories(cats);
    } catch (e) {
      toast.error('Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.value || !formData.label) {
      toast.error('Preencha o identificador e o nome');
      return;
    }
    setSubmitting(true);
    try {
      const slug = formData.value.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const payload = { ...formData, value: slug };
      if (editing) {
        await base44.entities.Category.update(editing.id, payload);
        toast.success('Categoria atualizada');
      } else {
        await base44.entities.Category.create(payload);
        toast.success('Categoria criada');
      }
      setShowForm(false);
      setEditing(null);
      setFormData({ value: '', label: '', icon: '', order: 0, is_active: true });
      loadCategories();
    } catch (err) {
      toast.error('Erro: ' + (err.message || 'Tente novamente'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (cat) => {
    setEditing(cat);
    setFormData({
      value: cat.value,
      label: cat.label,
      icon: cat.icon || '',
      order: cat.order || 0,
      is_active: cat.is_active
    });
    setShowForm(true);
  };

  const handleDelete = async (cat) => {
    if (!confirm(`Deletar a categoria "${cat.label}"? Anúncios existentes desta categoria não serão afetados.`)) return;
    try {
      await base44.entities.Category.delete(cat.id);
      toast.success('Categoria deletada');
      loadCategories();
    } catch (err) {
      toast.error('Erro ao deletar');
    }
  };

  const toggleActive = async (cat) => {
    try {
      await base44.entities.Category.update(cat.id, { is_active: !cat.is_active });
      loadCategories();
    } catch (err) {
      toast.error('Erro ao atualizar');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><div className="animate-spin w-8 h-8 border-4 border-gold border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Categorias</h2>
          <p className="text-muted-foreground">Gerenciar categorias de anúncios</p>
        </div>
        <Button
          onClick={() => {
            setShowForm(!showForm);
            setEditing(null);
            setFormData({ value: '', label: '', icon: '', order: 0, is_active: true });
          }}
          className="bg-gold text-background hover:bg-gold-dark"
        >
          <Plus className="w-4 h-4 mr-2" /> Nova Categoria
        </Button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Identificador (slug) *</label>
                <Input
                  placeholder="ex: airbnb"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  disabled={!!editing}
                />
                <p className="text-xs text-muted-foreground mt-1">Usado internamente. Sem espaços ou acentos.</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nome exibido *</label>
                <Input
                  placeholder="ex: Airbnb"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Ícone (emoji)</label>
                <Input
                  placeholder="🏠"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Ordem</label>
                <Input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Ativa</label>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  className={`w-full px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    formData.is_active
                      ? 'bg-green-500/10 border-green-500/30 text-green-500'
                      : 'bg-secondary border-border text-muted-foreground'
                  }`}
                >
                  {formData.is_active ? '✅ Ativa' : '⛔ Inativa'}
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={submitting}>
                {submitting ? '⏳ Salvando...' : (editing ? 'Atualizar' : 'Criar Categoria')}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }} disabled={submitting}>
                Cancelar
              </Button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {categories.map((cat) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`bg-card border rounded-xl p-4 flex items-center gap-3 ${cat.is_active ? 'border-border' : 'border-border/50 opacity-60'}`}
          >
            <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center text-xl flex-shrink-0">
              {cat.icon || '📦'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">{cat.label}</p>
              <p className="text-xs text-muted-foreground">{cat.value} · ordem {cat.order || 0}</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => toggleActive(cat)} className="p-1.5 rounded hover:bg-secondary" title={cat.is_active ? 'Desativar' : 'Ativar'}>
                {cat.is_active ? <Eye className="w-4 h-4 text-green-500" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
              </button>
              <button onClick={() => handleEdit(cat)} className="p-1.5 rounded hover:bg-secondary">
                <Edit2 className="w-4 h-4 text-gold" />
              </button>
              <button onClick={() => handleDelete(cat)} className="p-1.5 rounded hover:bg-secondary">
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhuma categoria ainda. Clique em "Nova Categoria" para começar.
        </div>
      )}
    </div>
  );
}