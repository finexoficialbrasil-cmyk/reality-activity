import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const CATEGORIES = [
  { value: 'mercado_livre', label: '💰 Mercado Livre' },
  { value: 'shopee', label: '🛒 Shopee' },
  { value: 'tiktok_shop', label: '🎵 TikTok Shop' },
  { value: 'amazon', label: '📦 Amazon' },
  { value: 'produtos_digitais', label: '💻 Produtos Digitais' },
  { value: 'servicos', label: '🔧 Serviços' },
  { value: 'outros', label: '⭐ Outros' }
];

export default function UserAdvertisementForm({ user, userPoints, onAdCreated }) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    link: '',
    category: 'outros',
    cost_to_publish: 100,
    reward_per_share: 10
  });

  const validateLink = async (link) => {
    try {
      const res = await base44.functions.invoke('validateAdvertisementLink', { link });
      return res.data.valid;
    } catch (err) {
      console.error('Erro ao validar link:', err);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.link || !formData.category) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (!userPoints || userPoints.balance < formData.cost_to_publish) {
      toast.error(`Saldo insuficiente. Você precisa de ${formData.cost_to_publish} pontos.`);
      return;
    }

    setSubmitting(true);
    try {
      const isValid = await validateLink(formData.link);
      if (!isValid) {
        toast.error('Link inválido ou não autorizado');
        setSubmitting(false);
        return;
      }

      // Cria o anúncio
      const newAd = await base44.entities.Advertisement.create({
        ...formData,
        user_email: user.email,
        user_name: user.full_name,
        status: 'pending'
      });

      // Debita pontos
      await base44.entities.UserPoints.update(userPoints.id, {
        balance: userPoints.balance - formData.cost_to_publish,
        total_spent: (userPoints.total_spent || 0) + formData.cost_to_publish
      });

      // Registra transação
      await base44.entities.PointsTransaction.create({
        user_email: user.email,
        user_name: user.full_name,
        type: 'spent_redemption',
        points: -formData.cost_to_publish,
        description: `Publicação de anúncio: ${formData.title}`
      });

      toast.success('Anúncio enviado para aprovação!');
      setFormData({
        title: '',
        description: '',
        image_url: '',
        link: '',
        category: 'outros',
        cost_to_publish: 100,
        reward_per_share: 10
      });

      if (onAdCreated) onAdCreated();
    } catch (err) {
      console.error('Erro ao criar anúncio:', err);
      toast.error('Erro ao criar anúncio: ' + (err.message || 'Tente novamente'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-400">
          <p className="font-semibold">💡 Como funciona</p>
          <p className="mt-1 text-xs">Publique um anúncio gastando {formData.cost_to_publish} pontos. Ganhe {formData.reward_per_share} pts cada vez que alguém compartilhar.</p>
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
          <label className="text-sm font-medium mb-2 block">URL da Imagem</label>
          <Input
            placeholder="https://exemplo.com/imagem.jpg"
            value={formData.image_url}
            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
          />
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

        {formData.category === 'mercado_livre' ? (
          <div>
            <label className="text-sm font-medium mb-2 block">Código Mercado Livre *</label>
            <div className="flex gap-2 items-center">
              <span className="text-muted-foreground text-sm whitespace-nowrap">https://meli.la/</span>
              <Input
                placeholder="1B6VAmR"
                value={formData.link.replace('https://meli.la/', '')}
                onChange={(e) => setFormData({ ...formData, link: `https://meli.la/${e.target.value}` })}
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="text-sm font-medium mb-2 block">Link do Anúncio *</label>
            <Input
              placeholder="https://exemplo.com/produto"
              value={formData.link}
              onChange={(e) => setFormData({ ...formData, link: e.target.value })}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Custo (pts)</label>
            <Input
              type="number"
              value={formData.cost_to_publish}
              onChange={(e) => setFormData({ ...formData, cost_to_publish: parseInt(e.target.value) })}
              min="1"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Recompensa/Compartilhamento</label>
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
            {userPoints && userPoints.balance >= formData.cost_to_publish ? (
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
            {' '} | Custo: <span className="font-semibold">{formData.cost_to_publish} pts</span>
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            type="submit"
            className="bg-gold text-background hover:bg-gold-dark flex-1"
            disabled={submitting || !userPoints || userPoints.balance < formData.cost_to_publish}
          >
            {submitting ? '⏳ Publicando...' : '🚀 Publicar Anúncio'}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}