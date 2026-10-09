import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Save, Loader2, Video } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSiteSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    ceo_video_url: '',
    ceo_video_title: 'Mensagem do CEO',
    ceo_video_description: '',
    ceo_video_active: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const list = await base44.entities.SiteSettings.list();
      if (list.length > 0) {
        setSettings(list[0]);
        setForm({
          ceo_video_url: list[0].ceo_video_url || '',
          ceo_video_title: list[0].ceo_video_title || 'Mensagem do CEO',
          ceo_video_description: list[0].ceo_video_description || '',
          ceo_video_active: list[0].ceo_video_active !== false,
        });
      }
    } catch (e) {
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (settings) {
        await base44.entities.SiteSettings.update(settings.id, form);
      } else {
        await base44.entities.SiteSettings.create(form);
      }
      toast.success('Configurações salvas com sucesso!');
      loadSettings();
    } catch (e) {
      toast.error('Erro ao salvar: ' + (e.message || 'tente novamente'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center">
          <Video className="w-5 h-5 text-gold" />
        </div>
        <div>
          <h2 className="font-grotesk font-bold text-xl">Vídeo do CEO</h2>
          <p className="text-sm text-muted-foreground">Configuração exibida na página Holding</p>
        </div>
      </div>

      <div className="space-y-4 bg-card border border-border rounded-xl p-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold">Título do vídeo</label>
          <Input
            value={form.ceo_video_title}
            onChange={(e) => setForm({ ...form, ceo_video_title: e.target.value })}
            placeholder="Mensagem do CEO"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">URL do vídeo (YouTube)</label>
          <Input
            value={form.ceo_video_url}
            onChange={(e) => setForm({ ...form, ceo_video_url: e.target.value })}
            placeholder="https://youtu.be/..."
          />
          <p className="text-xs text-muted-foreground">
            Cole o link do YouTube (ex: https://youtu.be/SmQlaIQcdHs ou https://youtube.com/watch?v=...)
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">Descrição (opcional)</label>
          <Textarea
            value={form.ceo_video_description}
            onChange={(e) => setForm({ ...form, ceo_video_description: e.target.value })}
            placeholder="Texto exibido abaixo do vídeo"
            rows={3}
          />
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
          <div>
            <p className="text-sm font-semibold">Vídeo ativo</p>
            <p className="text-xs text-muted-foreground">Exibir na página Holding</p>
          </div>
          <Switch
            checked={form.ceo_video_active}
            onCheckedChange={(checked) => setForm({ ...form, ceo_video_active: checked })}
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-gradient-to-r from-gold to-gold-dark text-background hover:from-gold-dark hover:to-gold-dark font-bold"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>
    </div>
  );
}