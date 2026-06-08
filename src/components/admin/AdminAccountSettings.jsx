import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Save, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function AdminAccountSettings({ user }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [accountData, setAccountData] = useState({
    admin_name: '',
    pix_key_type: '',
    pix_key: '',
    bank_name: '',
  });

  useEffect(() => {
    loadAccountData();
  }, [user]);

  const loadAccountData = async () => {
    setAccountData({
      admin_name: user?.admin_name || user?.full_name || '',
      pix_key_type: user?.pix_key_type || '',
      pix_key: user?.pix_key || '',
      bank_name: user?.bank_name || '',
    });
  };

  const handleSave = async () => {
    if (!accountData.admin_name || !accountData.pix_key_type || !accountData.pix_key || !accountData.bank_name) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const response = await base44.auth.updateMe({
        admin_name: accountData.admin_name,
        pix_key_type: accountData.pix_key_type,
        pix_key: accountData.pix_key,
        bank_name: accountData.bank_name,
      });

      if (response) {
        setSaved(true);
        setEditing(false);
      }
    } catch (err) {
      console.error('Erro ao salvar:', err);
      toast.error('Erro ao salvar: ' + (err.message || 'Tente novamente'));
      setSaving(false);
    }
  };

  // Tela de sucesso
  if (saved && !editing) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
        <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/40 rounded-2xl p-8">
          <div className="text-center space-y-6">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }} className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-400 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </motion.div>
            <div>
              <h2 className="font-grotesk font-bold text-2xl text-foreground mb-2">Dados Salvos! ✓</h2>
              <p className="text-muted-foreground">Suas informações de conta PIX foram atualizadas com sucesso.</p>
            </div>

            <div className="bg-background/40 rounded-xl p-6 space-y-4 text-left">
              <div className="border-b border-border/30 pb-3">
                <p className="text-xs text-muted-foreground mb-1">Nome do Proprietário</p>
                <p className="font-semibold text-foreground">{accountData.admin_name}</p>
              </div>
              <div className="border-b border-border/30 pb-3">
                <p className="text-xs text-muted-foreground mb-1">Banco</p>
                <p className="font-semibold text-foreground capitalize">
                  {accountData.bank_name === 'nubank' ? 'NuBank' :
                   accountData.bank_name === 'itau' ? 'Itaú' :
                   accountData.bank_name === 'bradesco' ? 'Bradesco' :
                   accountData.bank_name === 'santander' ? 'Santander' :
                   accountData.bank_name === 'bb' ? 'Banco do Brasil' :
                   accountData.bank_name === 'caixa' ? 'Caixa Econômica' :
                   accountData.bank_name === 'inter' ? 'Inter' :
                   accountData.bank_name === 'c6' ? 'C6 Bank' :
                   accountData.bank_name === 'xp' ? 'XP Investimentos' :
                   'Outro'}
                </p>
              </div>
              <div className="border-b border-border/30 pb-3">
                <p className="text-xs text-muted-foreground mb-1">Tipo de Chave PIX</p>
                <p className="font-semibold text-foreground uppercase">{accountData.pix_key_type}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Chave PIX</p>
                <p className="font-semibold text-gold font-mono">{accountData.pix_key}</p>
              </div>
            </div>

            <Button
              onClick={() => setEditing(true)}
              className="bg-gold text-background hover:bg-gold-dark w-full"
            >
              Editar Informações
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
      <div className="bg-card border border-border rounded-2xl p-6">
        <h1 className="font-grotesk font-bold text-2xl mb-2">Dados da Conta</h1>
        <p className="text-sm text-muted-foreground mb-6">Adicione seus dados PIX e informações de conta para receber pagamentos</p>

        <div className="space-y-6">
          {/* Info Box */}
          <div className="flex items-start gap-3 p-4 bg-gold/10 border border-gold/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gold">
              Essas informações serão usadas para receber pagamentos de depósitos dos usuários. Mantenha-as atualizadas e seguras.
            </p>
          </div>

          {/* Admin Name */}
          <div>
            <label className="text-sm font-medium mb-2 block">Nome do Proprietário *</label>
            <Input
              placeholder="Seu nome completo"
              value={accountData.admin_name}
              onChange={(e) => setAccountData({ ...accountData, admin_name: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">Este nome será usado em comprovantes de recebimento</p>
          </div>

          {/* Banco */}
          <div>
            <label className="text-sm font-medium mb-2 block">Banco *</label>
            <Select 
              value={accountData.bank_name} 
              onValueChange={(value) => setAccountData({ ...accountData, bank_name: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione seu banco" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nubank">NuBank</SelectItem>
                <SelectItem value="itau">Itaú</SelectItem>
                <SelectItem value="bradesco">Bradesco</SelectItem>
                <SelectItem value="santander">Santander</SelectItem>
                <SelectItem value="bb">Banco do Brasil</SelectItem>
                <SelectItem value="caixa">Caixa Econômica</SelectItem>
                <SelectItem value="inter">Inter</SelectItem>
                <SelectItem value="c6">C6 Bank</SelectItem>
                <SelectItem value="xp">XP Investimentos</SelectItem>
                <SelectItem value="pix">Outro</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">A instituição financeira onde sua conta PIX está registrada</p>
          </div>

          {/* PIX Key Type */}
          <div>
            <label className="text-sm font-medium mb-2 block">Tipo de Chave PIX *</label>
            <Select 
              value={accountData.pix_key_type} 
              onValueChange={(value) => setAccountData({ ...accountData, pix_key_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de chave" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cpf">CPF</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
                <SelectItem value="phone">Telefone</SelectItem>
                <SelectItem value="random">Chave Aleatória</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">O tipo de chave PIX que será usado para receber</p>
          </div>

          {/* PIX Key */}
          <div>
            <label className="text-sm font-medium mb-2 block">Chave PIX *</label>
            <Input
              placeholder={
                accountData.pix_key_type === 'cpf' ? '00000000000' :
                accountData.pix_key_type === 'email' ? 'seu@email.com' :
                accountData.pix_key_type === 'phone' ? '(00) 00000-0000' :
                'Sua chave aleatória'
              }
              value={accountData.pix_key}
              onChange={(e) => setAccountData({ ...accountData, pix_key: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {accountData.pix_key_type === 'cpf' && 'Digite seu CPF sem pontos ou traços'}
              {accountData.pix_key_type === 'email' && 'Digite seu e-mail cadastrado no PIX'}
              {accountData.pix_key_type === 'phone' && 'Digite seu telefone com DDD'}
              {accountData.pix_key_type === 'random' && 'Sua chave PIX aleatória do banco'}
            </p>
          </div>

          {/* Save Button */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gold text-background hover:bg-gold-dark flex-1"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Configurações
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}