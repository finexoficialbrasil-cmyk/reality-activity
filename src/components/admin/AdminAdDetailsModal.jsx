import { Button } from '@/components/ui/button';
import { Eye, Edit2, Trash2, Power, User, Mail, Calendar, Link as LinkIcon, Video } from 'lucide-react';

export default function AdminAdDetailsModal({ ad, onClose, onEdit, onToggleActive, onDelete }) {
  if (!ad) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const statusConfig = {
    pending: { label: 'Pendente', color: 'text-yellow-500' },
    approved: { label: 'Aprovado', color: 'text-green-500' },
    rejected: { label: 'Rejeitado', color: 'text-red-500' },
    inactive: { label: 'Inativo', color: 'text-gray-500' }
  };
  const sc = statusConfig[ad.status] || statusConfig.pending;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="text-lg font-bold text-foreground">Detalhes do Anúncio</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-2xl leading-none">&times;</button>
        </div>
        <div className="p-5 space-y-4">
          {ad.image_url && (
            <img src={ad.image_url} alt={ad.title} className="w-full max-h-48 object-cover rounded-lg" />
          )}
          {ad.video_url && (
            <div className="text-xs text-purple-400 flex items-center gap-1.5"><Video className="w-4 h-4" /> {ad.video_url}</div>
          )}

          <div>
            <label className="text-xs text-muted-foreground">Título</label>
            <p className="text-sm font-semibold text-foreground">{ad.title}</p>
          </div>

          {ad.description && (
            <div>
              <label className="text-xs text-muted-foreground">Descrição</label>
              <p className="text-sm text-foreground/80">{ad.description}</p>
            </div>
          )}

          {ad.link && (
            <div>
              <label className="text-xs text-muted-foreground flex items-center gap-1"><LinkIcon className="w-3 h-3" /> Link</label>
              <a href={ad.link} target="_blank" rel="noopener noreferrer" className="text-sm text-gold hover:underline break-all">{ad.link}</a>
            </div>
          )}

          {/* Publisher info */}
          <div className="bg-secondary/30 rounded-lg p-4 space-y-2 border border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1"><User className="w-3.5 h-3.5" /> Publicado por</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                <User className="w-5 h-5 text-gold" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{ad.user_name || '—'}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> {ad.user_email || '—'}</p>
              </div>
            </div>
          </div>

          {/* Grid de infos */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/30 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground">Categoria</p>
              <p className="text-sm font-medium text-foreground">{ad.category}</p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground">Tipo</p>
              <p className="text-sm font-medium text-foreground capitalize">{ad.type || 'image'}</p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground">Status</p>
              <p className={`text-sm font-semibold ${sc.color}`}>{sc.label}</p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground">Ativo</p>
              <p className={`text-sm font-semibold ${ad.is_active ? 'text-green-500' : 'text-red-500'}`}>{ad.is_active ? 'Sim' : 'Não'}</p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground">Orçamento Total</p>
              <p className="text-sm font-semibold text-gold">{ad.budget_total || 0} pts</p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground">Saldo Restante</p>
              <p className={`text-sm font-semibold ${ad.budget_remaining <= 0 ? 'text-destructive' : 'text-gold'}`}>{ad.budget_remaining || 0} pts</p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground">Recompensa/Share</p>
              <p className="text-sm font-semibold text-gold">{ad.reward_per_share || 0} pts</p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground">Total Distribuído</p>
              <p className="text-sm font-semibold text-gold">{ad.total_points_awarded || 0} pts</p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Criado em</p>
              <p className="text-sm font-medium text-foreground">{formatDate(ad.created_date)}</p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Atualizado em</p>
              <p className="text-sm font-medium text-foreground">{formatDate(ad.updated_date)}</p>
            </div>
          </div>

          {ad.cooldown_until && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
              <p className="text-sm text-orange-400 font-medium">⏳ Em cooldown até {formatDate(ad.cooldown_until)}</p>
            </div>
          )}

          {ad.rejection_reason && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Motivo da rejeição</p>
              <p className="text-sm text-red-400">{ad.rejection_reason}</p>
            </div>
          )}
        </div>
        <div className="p-5 border-t border-border flex gap-2 sticky bottom-0 bg-card">
          <Button size="sm" variant="outline" onClick={() => onToggleActive(ad)} className="flex-1">
            <Power className="w-4 h-4 mr-1" /> {ad.is_active ? 'Desativar' : 'Ativar'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => onEdit(ad)} className="flex-1">
            <Edit2 className="w-4 h-4 mr-1" /> Editar
          </Button>
          <Button size="sm" variant="destructive" onClick={() => onDelete(ad.id)} className="flex-1">
            <Trash2 className="w-4 h-4 mr-1" /> Deletar
          </Button>
        </div>
      </div>
    </div>
  );
}