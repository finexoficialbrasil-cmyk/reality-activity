import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, Play, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminVideos() {
  const [videos, setVideos] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  useEffect(() => { load(); }, []);

  const load = async () => {
    const [vids, comps] = await Promise.all([
      base44.entities.Video.list('-order'),
      base44.entities.Company.filter({ is_active: true }, 'order')
    ]);
    setVideos(vids);
    setCompanies(comps);
    setLoading(false);
  };

  const defaultForm = () => ({
    title: '', type: 'mp4', company_id: companies[0]?.id || '',
    video_url: '', banner_url: '', banner_link: '', thumbnail_url: '',
    description: '', points_per_second: 1, bonus_points: 50, duration_seconds: 30,
    is_active: true, order: 0
  });

  const openNew = () => { setEditing(null); setForm(defaultForm()); setShowForm(true); };
  const openEdit = (v) => { setEditing(v); setForm({ ...v }); setShowForm(true); };

  const handleSave = async () => {
    if (editing) await base44.entities.Video.update(editing.id, form);
    else await base44.entities.Video.create(form);
    setShowForm(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Excluir este vídeo?')) return;
    await base44.entities.Video.delete(id);
    load();
  };

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const companiesMap = companies.reduce((a, c) => { a[c.id] = c; return a; }, {});

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-grotesk font-bold text-2xl">Vídeos</h2>
        <Button onClick={openNew} className="bg-gold text-background hover:bg-gold-dark">
          <Plus className="w-4 h-4 mr-2" /> Novo Vídeo
        </Button>
      </div>

      {showForm && (
        <div className="bg-card border border-gold/30 rounded-2xl p-6 mb-6">
          <h3 className="font-semibold mb-4">{editing ? 'Editar Vídeo' : 'Novo Vídeo'}</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Título *</label>
              <input value={form.title || ''} onChange={e => set('title', e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tipo *</label>
              <select value={form.type || 'mp4'} onChange={e => set('type', e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none">
                <option value="mp4">🎬 Vídeo MP4</option>
                <option value="youtube">▶️ YouTube</option>
                <option value="banner">🖼️ Banner (imagem)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Empresa *</label>
              <select value={form.company_id || ''} onChange={e => set('company_id', e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none">
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {form.company_id && (() => {
                const c = companies.find(x => x.id === form.company_id);
                return c ? (
                  <div className="mt-1.5 text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                    {c.website
                      ? <span>🌐 <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">{c.website}</a></span>
                      : <span className="text-yellow-500/70">⚠️ Sem site</span>
                    }
                    {c.phone
                      ? <span>📱 <a href={`https://wa.me/${c.phone.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">{c.phone}</a></span>
                      : <span className="text-yellow-500/70">⚠️ Sem WhatsApp</span>
                    }
                    <span className="text-muted-foreground/50">— cadastre em Empresas</span>
                  </div>
                ) : null;
              })()}
            </div>

            {/* Campos condicionais por tipo */}
            {(form.type === 'mp4' || form.type === 'youtube') && (
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">
                  {form.type === 'youtube' ? '▶️ Link do YouTube (ex: https://youtu.be/abc ou https://youtube.com/watch?v=abc)' : '🎬 URL do Vídeo MP4'}
                </label>
                <input value={form.video_url || ''} onChange={e => set('video_url', e.target.value)}
                  placeholder={form.type === 'youtube' ? 'https://youtu.be/...' : 'https://...video.mp4'}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/50" />
              </div>
            )}

            {form.type === 'banner' && (<>
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">🖼️ URL da Imagem do Banner (Imgur, etc)</label>
                <input value={form.banner_url || ''} onChange={e => set('banner_url', e.target.value)}
                  placeholder="https://i.imgur.com/exemplo.jpg"
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/50" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">🔗 Link ao clicar no banner (opcional)</label>
                <input value={form.banner_link || ''} onChange={e => set('banner_link', e.target.value)}
                  placeholder="https://site-da-empresa.com"
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/50" />
              </div>
            </>)}

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">URL da Thumbnail (para lista)</label>
              <input value={form.thumbnail_url || ''} onChange={e => set('thumbnail_url', e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Duração (segundos)</label>
              <input type="number" value={form.duration_seconds || 30} onChange={e => set('duration_seconds', Number(e.target.value))}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Pontos por Segundo</label>
              <input type="number" value={form.points_per_second || 1} onChange={e => set('points_per_second', Number(e.target.value))}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Bônus ao Completar</label>
              <input type="number" value={form.bonus_points || 50} onChange={e => set('bonus_points', Number(e.target.value))}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Ordem</label>
              <input type="number" value={form.order || 0} onChange={e => set('order', Number(e.target.value))}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/50" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="v-active" checked={!!form.is_active} onChange={e => set('is_active', e.target.checked)} className="accent-gold" />
              <label htmlFor="v-active" className="text-sm cursor-pointer">Ativo</label>
            </div>
          </div>
          <div className="flex gap-3 mt-4 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} className="flex-1 bg-gold text-background hover:bg-gold-dark">Salvar</Button>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Vídeo</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden md:table-cell">Empresa</th>
              <th className="text-center px-4 py-3 text-muted-foreground font-medium hidden lg:table-cell">Pts/s</th>
              <th className="text-center px-4 py-3 text-muted-foreground font-medium hidden lg:table-cell">Bônus</th>
              <th className="text-center px-4 py-3 text-muted-foreground font-medium hidden md:table-cell">Status</th>
              <th className="text-right px-4 py-3 text-muted-foreground font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="px-4 py-3" colSpan={6}><div className="h-4 bg-secondary rounded animate-pulse" /></td>
                </tr>
              ))
            ) : videos.map(v => (
              <tr key={v.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-7 rounded bg-secondary overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {v.thumbnail_url ? <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover" /> : <Play className="w-3 h-3 text-muted-foreground" />}
                    </div>
                    <span className="font-medium line-clamp-1">{v.title}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{companiesMap[v.company_id]?.name}</td>
                <td className="px-4 py-3 text-center text-gold hidden lg:table-cell">{v.points_per_second}</td>
                <td className="px-4 py-3 text-center text-gold hidden lg:table-cell">+{v.bonus_points}</td>
                <td className="px-4 py-3 text-center hidden md:table-cell">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${v.is_active ? 'bg-green-500/10 text-green-400' : 'bg-muted text-muted-foreground'}`}>
                    {v.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(v)} className="h-7 w-7">
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id)} className="h-7 w-7 text-destructive hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}