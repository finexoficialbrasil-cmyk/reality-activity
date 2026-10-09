import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Bitcoin, Wallet, Save, Settings } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminWithdrawalSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await base44.entities.WithdrawalSettings.list();
      if (data.length > 0) {
        setSettings(data[0]);
      } else {
        const created = await base44.entities.WithdrawalSettings.create({
          bch_enabled: true,
          pix_enabled: true,
          bch_buyback_rate: 0.80,
          pix_buyback_rate: 0.80,
          bch_warning: 'Seu saldo será recomprado pela empresa pelo valor definido pelo administrador.'
        });
        setSettings(created);
      }
    } catch (e) {
      console.error('Erro:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await base44.functions.invoke('saveFinancialSettings', {
        withdrawal_settings: {
          bch_enabled: settings.bch_enabled,
          pix_enabled: settings.pix_enabled,
          bch_buyback_rate: settings.bch_buyback_rate,
          pix_buyback_rate: settings.pix_buyback_rate,
          bch_warning: settings.bch_warning
        }
      });
      const data = response.data;
      if (data && data.financial_summary) {
        const s = data.financial_summary;
        const situacao = s.situation === 'prejuízo' ? '⚠️ PREJUÍZO' : s.situation === 'lucro' ? '✅ LUCRO' : '⚖️ EQUILÍBRIO';
        toast.success(`Configurações salvas! ${situacao} (venda R$ ${s.price_per_point.toFixed(2)}/pto • recompra máx R$ ${s.max_buyback_rate.toFixed(2)}/pto)`);
      } else {
        toast.success('Configurações salvas!');
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e?.data?.message || e?.response?.data?.error || 'Erro ao salvar';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-4 border-border border-t-gold rounded-full animate-spin" />
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl space-y-6">
      <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-gold" />
          <h2 className="font-semibold">Configurações de Saque</h2>
        </div>

        <div className="border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Bitcoin className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="font-semibold">Bitcoin Cash (BCH)</p>
                <p className="text-xs text-muted-foreground">Saque via recompra de saldo</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${settings.bch_enabled ? 'text-green-400' : 'text-muted-foreground'}`}>
                {settings.bch_enabled ? 'ATIVO' : 'INATIVO'}
              </span>
              <Switch
                checked={settings.bch_enabled}
                onCheckedChange={(v) => setSettings({ ...settings, bch_enabled: v })}
              />
            </div>
          </div>

          {settings.bch_enabled && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 pt-3 border-t border-border">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Valor de Recompra (R$ por ponto)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.bch_buyback_rate}
                  onChange={(e) => setSettings({ ...settings, bch_buyback_rate: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Ex: R$ {(settings.bch_buyback_rate || 0).toFixed(2).replace('.', ',')} por ponto → 1000 pts = R$ {((settings.bch_buyback_rate || 0) * 1000).toFixed(2).replace('.', ',')}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Aviso exibido ao usuário</label>
                <Input
                  value={settings.bch_warning}
                  onChange={(e) => setSettings({ ...settings, bch_warning: e.target.value })}
                />
              </div>
            </motion.div>
          )}
        </div>

        <div className="border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="font-semibold">PIX</p>
                <p className="text-xs text-muted-foreground">Saque via transferência PIX</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${settings.pix_enabled ? 'text-green-400' : 'text-muted-foreground'}`}>
                {settings.pix_enabled ? 'ATIVO' : 'INATIVO'}
              </span>
              <Switch
                checked={settings.pix_enabled}
                onCheckedChange={(v) => setSettings({ ...settings, pix_enabled: v })}
              />
            </div>
          </div>

          {settings.pix_enabled && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-3 border-t border-border">
              <label className="text-sm font-medium mb-1.5 block">Valor de Recompra (R$ por ponto)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={settings.pix_buyback_rate}
                onChange={(e) => setSettings({ ...settings, pix_buyback_rate: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ex: R$ {(settings.pix_buyback_rate || 0).toFixed(2).replace('.', ',')} por ponto → 1000 pts = R$ {((settings.pix_buyback_rate || 0) * 1000).toFixed(2).replace('.', ',')}
              </p>
            </motion.div>
          )}
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full bg-gold text-background hover:bg-gold-dark">
          <Save className="w-4 h-4 mr-2" />
          {saving ? '⏳ Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </motion.div>
  );
}