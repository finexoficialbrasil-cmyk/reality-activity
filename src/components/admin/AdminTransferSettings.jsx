import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Save, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminTransferSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await base44.entities.TransferSettings.list('', 1);
      if (data[0]) {
        setSettings(data[0]);
      } else {
        const created = await base44.entities.TransferSettings.create({
          enabled: true,
          min_per_transfer: 100,
          max_per_transfer: 10000,
          daily_limit: 50000,
          daily_max_transfers: 10,
          risk_threshold: 5000,
          new_account_threshold: 3000,
          new_account_days: 7
        });
        setSettings(created);
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
      await base44.entities.TransferSettings.update(settings.id, {
        enabled: settings.enabled,
        min_per_transfer: Number(settings.min_per_transfer),
        max_per_transfer: Number(settings.max_per_transfer),
        daily_limit: Number(settings.daily_limit),
        daily_max_transfers: Number(settings.daily_max_transfers),
        risk_threshold: Number(settings.risk_threshold),
        new_account_threshold: Number(settings.new_account_threshold),
        new_account_days: Number(settings.new_account_days)
      });
      toast.success('Configurações salvas!');
    } catch (e) {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-border border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl space-y-6">
      <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2"><SlidersHorizontal className="w-4 h-4 text-gold" /> Transferência entre Usuários</h3>
          <p className="text-xs text-muted-foreground mt-1">Ative ou desative a função de transferência</p>
        </div>
        <Switch
          checked={settings.enabled}
          onCheckedChange={(v) => setSettings({ ...settings, enabled: v })}
        />
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h3 className="font-semibold">Limites de Transferência</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Mínimo por transferência</label>
            <Input type="number" value={settings.min_per_transfer} onChange={(e) => setSettings({ ...settings, min_per_transfer: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Máximo por transferência</label>
            <Input type="number" value={settings.max_per_transfer} onChange={(e) => setSettings({ ...settings, max_per_transfer: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Limite diário (pontos)</label>
            <Input type="number" value={settings.daily_limit} onChange={(e) => setSettings({ ...settings, daily_limit: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Máx. transferências/dia</label>
            <Input type="number" value={settings.daily_max_transfers} onChange={(e) => setSettings({ ...settings, daily_max_transfers: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h3 className="font-semibold">Regras de Análise de Risco</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Limite de risco (exige 2FA)</label>
            <Input type="number" value={settings.risk_threshold} onChange={(e) => setSettings({ ...settings, risk_threshold: e.target.value })} />
            <p className="text-xs text-muted-foreground mt-1">Transferências acima deste valor exigem código por e-mail</p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Limite conta nova</label>
            <Input type="number" value={settings.new_account_threshold} onChange={(e) => setSettings({ ...settings, new_account_threshold: e.target.value })} />
            <p className="text-xs text-muted-foreground mt-1">Contas novas acima deste valor são analisadas</p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Dias conta considerada nova</label>
            <Input type="number" value={settings.new_account_days} onChange={(e) => setSettings({ ...settings, new_account_days: e.target.value })} />
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="bg-gold text-background hover:bg-gold-dark">
        <Save className="w-4 h-4 mr-2" /> {saving ? 'Salvando...' : 'Salvar Configurações'}
      </Button>
    </motion.div>
  );
}