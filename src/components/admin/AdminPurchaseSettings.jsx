import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Save, Plus, Trash2, Building2, Coins, SlidersHorizontal } from 'lucide-react';

export default function AdminPurchaseSettings() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await base44.entities.PurchaseSettings.list();
      if (data.length > 0) {
        setSettings(data[0]);
      } else {
        setSettings({
          price_per_point: 0.1,
          packages: [
            { points: 100, label: 'Iniciante', bonus: 0 },
            { points: 500, label: 'Popular', bonus: 25 },
            { points: 1000, label: 'Profissional', bonus: 100 },
            { points: 5000, label: 'Empresarial', bonus: 750 }
          ],
          bank_holder_name: 'MARCIO JOSE GOMES DE SOUZA',
          bank_cpf: '00568194128',
          bank_name: 'XP INVESTIMENTOS',
          bank_branch: '',
          bank_account: '',
          pix_key: '',
          min_purchase_points: 100,
          max_purchase_points: 100000,
          auto_approve_enabled: true,
          ai_analysis_enabled: true,
          instructions: 'Faça o pagamento via PIX ou transferência bancária usando os dados abaixo.'
        });
      }
    } catch (err) {
      console.error('Erro:', err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await base44.functions.invoke('saveFinancialSettings', {
        purchase_settings: settings
      });
      const data = response.data;
      if (data && data.financial_summary) {
        const s = data.financial_summary;
        const situacao = s.situation === 'prejuízo' ? '⚠️ PREJUÍZO' : s.situation === 'lucro' ? '✅ LUCRO' : '⚖️ EQUILÍBRIO';
        toast.success(`Configurações salvas! ${situacao} (venda R$ ${s.price_per_point.toFixed(2)}/pto • recompra máx R$ ${s.max_buyback_rate.toFixed(2)}/pto)`);
      } else {
        toast.success('Configurações salvas com sucesso!');
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.data?.message || err?.response?.data?.error || ('Erro ao salvar: ' + (err.message || ''));
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const updatePackage = (idx, field, value) => {
    const newPackages = [...(settings.packages || [])];
    newPackages[idx] = { ...newPackages[idx], [field]: field === 'points' || field === 'bonus' ? parseInt(value) || 0 : value };
    setSettings({ ...settings, packages: newPackages });
  };

  const addPackage = () => {
    setSettings({
      ...settings,
      packages: [...(settings.packages || []), { points: 100, label: 'Novo Pacote', bonus: 0 }]
    });
  };

  const removePackage = (idx) => {
    setSettings({ ...settings, packages: settings.packages.filter((_, i) => i !== idx) });
  };

  if (!settings) {
    return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-grotesk font-bold text-2xl">Configurações de Compra</h1>
          <p className="text-sm text-muted-foreground">Preços, pacotes e dados bancários</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-gold text-background hover:bg-gold-dark">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      {/* Preço e Limites */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Coins className="w-5 h-5 text-gold" />
          <h2 className="font-semibold">Preço e Limites</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Preço por ponto (R$)</label>
            <Input
              type="number"
              step="0.01"
              value={settings.price_per_point}
              onChange={(e) => setSettings({ ...settings, price_per_point: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Mínimo (pts)</label>
            <Input
              type="number"
              value={settings.min_purchase_points}
              onChange={(e) => setSettings({ ...settings, min_purchase_points: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Máximo (pts)</label>
            <Input
              type="number"
              value={settings.max_purchase_points}
              onChange={(e) => setSettings({ ...settings, max_purchase_points: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>
      </div>

      {/* Pacotes */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-gold" />
            <h2 className="font-semibold">Pacotes de Pontos</h2>
          </div>
          <Button size="sm" variant="outline" onClick={addPackage}>
            <Plus className="w-3 h-3 mr-1" /> Adicionar
          </Button>
        </div>
        <div className="space-y-2">
          {(settings.packages || []).map((pkg, idx) => (
            <div key={idx} className="flex items-center gap-2 p-3 bg-secondary/30 rounded-lg">
              <Input
                type="text"
                value={pkg.label}
                onChange={(e) => updatePackage(idx, 'label', e.target.value)}
                placeholder="Nome"
                className="flex-1"
              />
              <Input
                type="number"
                value={pkg.points}
                onChange={(e) => updatePackage(idx, 'points', e.target.value)}
                placeholder="Pontos"
                className="w-24"
              />
              <Input
                type="number"
                value={pkg.bonus}
                onChange={(e) => updatePackage(idx, 'bonus', e.target.value)}
                placeholder="Bônus"
                className="w-24"
              />
              <button onClick={() => removePackage(idx)} className="p-2 hover:bg-destructive/10 rounded-lg">
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Dados Bancários */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="w-5 h-5 text-gold" />
          <h2 className="font-semibold">Dados para Pagamento</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Nome do Titular</label>
            <Input
              value={settings.bank_holder_name}
              onChange={(e) => setSettings({ ...settings, bank_holder_name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">CPF</label>
            <Input
              value={settings.bank_cpf}
              onChange={(e) => setSettings({ ...settings, bank_cpf: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Banco</label>
            <Input
              value={settings.bank_name}
              onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Chave PIX</label>
            <Input
              value={settings.pix_key}
              onChange={(e) => setSettings({ ...settings, pix_key: e.target.value })}
              placeholder="email, CPF, telefone..."
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Agência</label>
            <Input
              value={settings.bank_branch}
              onChange={(e) => setSettings({ ...settings, bank_branch: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Conta</label>
            <Input
              value={settings.bank_account}
              onChange={(e) => setSettings({ ...settings, bank_account: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Instruções para o usuário</label>
          <Input
            value={settings.instructions}
            onChange={(e) => setSettings({ ...settings, instructions: e.target.value })}
          />
        </div>
      </div>

      {/* Regras de Aprovação */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <SlidersHorizontal className="w-5 h-5 text-gold" />
          <h2 className="font-semibold">Regras de Aprovação</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
            <div>
              <p className="text-sm font-medium">Aprovação automática</p>
              <p className="text-xs text-muted-foreground">Aprovar automaticamente quando a IA validar todos os dados</p>
            </div>
            <Switch
              checked={settings.auto_approve_enabled}
              onCheckedChange={(v) => setSettings({ ...settings, auto_approve_enabled: v })}
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
            <div>
              <p className="text-sm font-medium">Análise por IA</p>
              <p className="text-xs text-muted-foreground">Usar IA para validar comprovantes automaticamente</p>
            </div>
            <Switch
              checked={settings.ai_analysis_enabled}
              onCheckedChange={(v) => setSettings({ ...settings, ai_analysis_enabled: v })}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}