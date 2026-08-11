import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Check, X, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useCategories } from '@/hooks/useCategories';

export default function UserAdvertisementForm({ user, userPoints, onAdCreated, ad }) {
  const [submitting, setSubmitting] = useState(false);
  const { activeCategories } = useCategories();
  const CATEGORIES = activeCategories.map(c => ({ value: c.value, label: `${c.icon || ''} ${c.label}`.trim() }));
  const [success, setSuccess] = useState(null);
  const [linkError, setLinkError] = useState(null);
  const [formData, setFormData] = useState(ad ? {
    title: ad.title,
    description: ad.description,
    type: ad.type || 'image',
    link: ad.link,
    category: ad.category,
    add_credit: 0,
    reward_per_share: ad.reward_per_share,
    image_url: ad.image_url || '',
    video_url: ad.video_url || ''
  } : {
    title: '',
    description: '',
    type: 'image',
    link: '',
    category: 'outros',
    budget_total: 100,
    reward_per_share: 10,
    image_url: '',
    video_url: ''
  });

  useEffect(() => {
    if (ad) {
      setFormData({
        title: ad.title,
        description: ad.description,
        type: ad.type || 'image',
        link: ad.link,
        category: ad.category,
        add_credit: 0,
        reward_per_share: ad.reward_per_share,
        image_url: ad.image_url || '',
        video_url: ad.video_url || ''
      });
    }
  }, [ad]);

  const validateLink = async (link) => {
    try {
      const res = await base44.functions.invoke('validateAdvertisementLink', { link });
      setLinkError(res.data.valid ? null : res.data);
      if (res.data.blocked) {
        toast.error('Conta bloqueada: ' + res.data.message);
      }
      return res.data.valid;
    } catch (err) {
      console.error('Erro ao validar link:', err);
      setLinkError({ message: 'Erro ao validar link' });
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.link || !formData.category) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (ad) {
      const addAmount = Math.max(0, parseInt(formData.add_credit) || 0);
      if (addAmount > 0 && userPoints.balance < addAmount) {
        toast.error(`Saldo insuficiente. Você precisa de ${addAmount} pontos.`);
        return;
      }
    } else {
      if (!userPoints || userPoints.balance < formData.budget_total) {
        toast.error(`Saldo insuficiente. Você precisa de ${formData.budget_total} pontos.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const isValid = await validateLink(formData.link);
      if (!isValid) {
        toast.error('Link inválido ou não autorizado');
        setSubmitting(false);
        return;
      }

      // Processa create/edit no servidor (valida saldo, propriedade e debita pontos de forma segura)
      const response = await base44.functions.invoke('saveAdvertisement', {
        mode: ad ? 'edit' : 'create',
        ad_id: ad?.id,
        title: formData.title,
        description: formData.description,
        type: formData.type,
        link: formData.link,
        category: formData.category,
        budget_total: parseInt(formData.budget_total) || 0,
        add_credit: Math.max(0, parseInt(formData.add_credit) || 0),
        reward_per_share: parseInt(formData.reward_per_share) || 10,
        image_url: formData.image_url,
        video_url: formData.video_url
      });

      const result = response.data;

      // Mostra tela de sucesso com relatório
      setSuccess({
        title: formData.title,
        cost: result.cost,
        reward: formData.reward_per_share,
        newBalance: result.new_balance,
        isEdit: !!ad
      });

      // Limpa o formulário
      if (ad) {
        setFormData({
          title: ad.title,
          description: ad.description,
          type: ad.type || 'image',
          link: ad.link,
          category: ad.category,
          add_credit: 0,
          reward_per_share: ad.reward_per_share,
          image_url: ad.image_url || '',
          video_url: ad.video_url || ''
        });
      } else {
        setFormData({
          title: '',
          description: '',
          type: 'image',
          link: '',
          category: 'outros',
          budget_total: 100,
          reward_per_share: 10,
          image_url: '',
          video_url: ''
        });
      }

      if (onAdCreated) onAdCreated();

      // Volta para o dashboard após 3 segundos
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Erro ao criar anúncio:', err);
      toast.error('Erro ao criar anúncio: ' + (err.message || 'Tente novamente'));
    } finally {
      setSubmitting(false);
    }
  };

  // Tela de sucesso
  if (success) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/40 rounded-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }} className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-400 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-green-400" />
          </motion.div>
          <h2 className="font-grotesk font-bold text-2xl text-foreground">{success.isEdit ? 'Anúncio Atualizado!' : 'Anúncio Publicado!'} 🎉</h2>
          <p className="text-muted-foreground">{success.isEdit ? 'Suas alterações foram salvas' : 'Seu anúncio está ativo e pronto para compartilhar'}</p>
        </div>

        <div className="bg-background/40 rounded-lg p-6 space-y-4">
          <div className="border-b border-border/30 pb-4">
            <p className="text-sm text-muted-foreground mb-1">Título do Anúncio</p>
            <p className="font-semibold text-foreground">{success.title}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-destructive/10 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Orçamento Debitado</p>
              <p className="font-bold text-lg text-destructive">-{success.cost} pts</p>
            </div>
            <div className="bg-green-500/10 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Por Compartilhamento</p>
              <p className="font-bold text-lg text-green-400">+{success.reward} pts</p>
            </div>
          </div>

          <div className="bg-gold/10 rounded-lg p-4 border border-gold/20">
            <p className="text-xs text-muted-foreground mb-1">Novo Saldo</p>
            <p className="font-grotesk font-bold text-2xl text-gold">{success.newBalance} pts</p>
          </div>
        </div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-center text-xs text-muted-foreground">
          Voltando para dashboard em alguns segundos...
        </motion.p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div className="flex items-start gap-3 p-4 bg-gold/10 border border-gold/20 rounded-lg">
        <AlertCircle className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
        <div className="text-sm text-gold">
          <p className="font-semibold">💡 Como funciona</p>
          <p className="mt-1 text-xs">Você investe os pontos que desejar para publicar este anúncio. Cada pessoa que compartilhar ganha os pontos que você definir — você paga, seus amigos ganham! 🚀</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Título *</label>
          <Input
            placeholder="Ex: Promoção Black Friday"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Descrição</label>
          <Textarea
            placeholder="Descreva seu anúncio..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Tipo de Anúncio *</label>
          <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="image">🖼️ Anúncio com Imagem</SelectItem>
              <SelectItem value="video">🎥 Anúncio com Vídeo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Categoria *</label>
          <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {formData.type === 'video' ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-accent/10 border border-accent/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
              <p className="text-xs text-accent">📹 Vídeos geram pontos por segundo assistido, não por compartilhamento. O vídeo rodará automaticamente ao clicar.</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Link do Vídeo YouTube *</label>
              <Input
                placeholder="https://youtu.be/... ou https://youtube.com/watch?v=..."
                value={formData.video_url}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Link do Anúncio (onde leva ao clicar) *</label>
              <Input
                placeholder="https://exemplo.com/produto"
                value={formData.link}
                onChange={(e) => {
                  setFormData({ ...formData, link: e.target.value });
                  setLinkError(null);
                }}
              />
              {linkError && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-2 p-3 bg-red-600/20 border-2 border-red-600 rounded-lg">
                  <p className="text-sm font-bold text-red-500">🚫 {linkError.message}</p>
                </motion.div>
              )}
            </div>
          </div>
        ) : formData.category === 'mercado_livre' ? (
           <div className="space-y-3">
             <div>
              <label className="text-sm font-medium mb-2 block">Link Mercado Livre *</label>
              <Input
                placeholder="https://meli.la/1B6VAmR ou link completo"
                value={formData.link}
                onChange={(e) => {
                  const link = e.target.value;
                  setFormData({ ...formData, link });
                  setLinkError(null);

                  // Busca imagem automaticamente se link foi preenchido
                  if (link && !formData.image_url) {
                    base44.functions.invoke('extractMercadoLivreImage', {
                      link
                    }).then(res => {
                      if (res.data.image_url) {
                        setFormData(prev => ({ ...prev, image_url: res.data.image_url }));
                      }
                    }).catch(() => {});
                  }
                }}
              />
              {linkError && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-2 p-3 bg-red-600/20 border-2 border-red-600 rounded-lg">
                  <p className="text-sm font-bold text-red-500">🚫 {linkError.message}</p>
                </motion.div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">URL da Imagem (opcional - se automática não funcionar)</label>
              <Input
                placeholder="https://exemplo.com/imagem.jpg"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              />
              {formData.image_url && (
                <div className="mt-2 rounded-lg overflow-hidden border border-border h-32">
                  <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div>
              <label className="text-sm font-medium mb-2 block">Link do Anúncio *</label>
              <Input
                placeholder="https://exemplo.com/produto"
                value={formData.link}
                onChange={(e) => {
                  setFormData({ ...formData, link: e.target.value });
                  setLinkError(null);
                }}
              />
              {linkError && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-2 p-3 bg-red-600/20 border-2 border-red-600 rounded-lg">
                  <p className="text-sm font-bold text-red-500">🚫 {linkError.message}</p>
                </motion.div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">URL da Imagem</label>
              <Input
                placeholder="https://exemplo.com/imagem.jpg"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              />
              {formData.image_url && (
                <div className="mt-2 rounded-lg overflow-hidden border border-border h-32">
                  <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </>
        ) }

        <div className="grid grid-cols-2 gap-4">
          {ad ? (
            <div>
              <label className="text-sm font-medium mb-2 block">Adicionar Créditos (pts)</label>
              <Input
                type="number"
                value={formData.add_credit}
                onChange={(e) => setFormData({ ...formData, add_credit: parseInt(e.target.value) || 0 })}
                min="0"
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Saldo atual do anúncio: <span className="text-gold font-semibold">{ad.budget_remaining || 0} pts</span>
              </p>
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium mb-2 block">Orçamento Total (pts)</label>
              <Input
                type="number"
                value={formData.budget_total}
                onChange={(e) => setFormData({ ...formData, budget_total: parseInt(e.target.value) })}
                min="1"
              />
            </div>
          )}
          <div>
            <label className="text-sm font-medium mb-2 block">Pagamento por Compartilhamento (pts)</label>
            <Input
              type="number"
              value={formData.reward_per_share}
              onChange={(e) => setFormData({ ...formData, reward_per_share: parseInt(e.target.value) })}
              min="1"
            />
          </div>
        </div>

        <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            {userPoints && userPoints.balance >= (ad ? (Math.max(0, parseInt(formData.add_credit) || 0)) : formData.budget_total) ? (
              <>
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium">Saldo suficiente</span>
              </>
            ) : (
              <>
                <X className="w-4 h-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">Saldo insuficiente</span>
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Seu saldo: <span className="text-gold font-semibold">{userPoints?.balance || 0} pts</span>
            {ad
              ? <> {' | '} Crédito a adicionar: <span className="font-semibold">{Math.max(0, parseInt(formData.add_credit) || 0)} pts</span></>
              : <> {' | '} Orçamento: <span className="font-semibold">{formData.budget_total} pts</span></>
            }
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            type="submit"
            className="bg-gold text-background hover:bg-gold-dark flex-1"
            disabled={submitting || !userPoints || (ad ? userPoints.balance < (Math.max(0, parseInt(formData.add_credit) || 0)) : userPoints.balance < formData.budget_total)}
          >
            {submitting ? (ad ? '⏳ Atualizando...' : '⏳ Publicando...') : (ad ? '✏️ Atualizar Anúncio' : '🚀 Publicar Anúncio')}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}