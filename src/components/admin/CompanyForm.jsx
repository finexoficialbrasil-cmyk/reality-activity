import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const CATEGORIES = ['Alimentação', 'Tecnologia', 'Moda', 'Saúde', 'Educação', 'Entretenimento', 'Serviços', 'Varejo', 'Parceiro'];

export default function CompanyForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {
    name: '', slug: '', logo_url: '', cover_image_url: '', description: '',
    category: 'Serviços', website: '', phone: '', email: '',
    is_partner: false, is_active: true, points_accepted: true, order: 0
  });

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="bg-card border border-gold/30 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold">{initial ? 'Editar Empresa' : 'Nova Empresa'}</h3>
        <button onClick={onCancel}><X className="w-5 h-5 text-muted-foreground" /></button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Nome *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/50" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Categoria</label>
          <select value={form.category} onChange={e => set('category', e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">URL do Logo</label>
          <input value={form.logo_url} onChange={e => set('logo_url', e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/50" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Website</label>
          <input value={form.website} onChange={e => set('website', e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/50" />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Descrição</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)}
            rows={2}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/50 resize-none" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Email</label>
          <input value={form.email} onChange={e => set('email', e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/50" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Telefone</label>
          <input value={form.phone} onChange={e => set('phone', e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/50" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Ordem (exibição)</label>
          <input type="number" value={form.order} onChange={e => set('order', Number(e.target.value))}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/50" />
        </div>
        <div className="flex items-center gap-6">
          {[
            { key: 'is_active', label: 'Ativo' },
            { key: 'is_partner', label: 'É Parceiro' },
            { key: 'points_accepted', label: 'Aceita Pontos' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!form[key]} onChange={e => set(key, e.target.checked)}
                className="w-4 h-4 accent-gold" />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex gap-3 mt-5 pt-4 border-t border-border">
        <Button variant="outline" onClick={onCancel} className="flex-1">Cancelar</Button>
        <Button onClick={() => onSave(form)} className="flex-1 bg-gold text-background hover:bg-gold-dark">
          {initial ? 'Salvar Alterações' : 'Criar Empresa'}
        </Button>
      </div>
    </div>
  );
}