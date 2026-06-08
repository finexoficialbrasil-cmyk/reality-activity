import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function AdminAccountSettings({ user }) {
  const [saving, setSaving] = useState(false);
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
      await base44.auth.updateMe({
        admin_name: accountData.admin_name,
        pix_key_type: accountData.pix_key_type,
        pix_key: accountData.pix_key,
        bank_name: accountData.bank_name,
      });
      
      // Recarrega dados do usuário para confirmar salvamento
      const updatedUser = await base44.auth.me();
      if (updatedUser) {
        setAccountData({
          admin_name: updatedUser?.admin_name || updatedUser?.full_name || '',
          pix_key_type: updatedUser?.pix_key_type || '',
          pix_key: updatedUser?.pix_key || '',
          bank_name: updatedUser?.bank_name || '',
        });
      }
      
      toast.success('Configurações salvas com sucesso!');
    } catch (err) {
      toast.error('Erro ao salvar: ' + (err.message || 'Tente novamente'));
    } finally {
      setSaving(false);
    }
  };

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