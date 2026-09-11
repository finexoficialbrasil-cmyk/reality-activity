import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Zap, Copy, Check, Share2, Link as LinkIcon, Sparkles, Gift } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

const slugFromEmail = (email) =>
  btoa(email).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export default function ShareAllButton({ user, ads, onShared }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const isMobile = useIsMobile();

  const eligibleCount = (ads || []).filter(
    ad => ad.status === 'approved' && ad.is_active !== false && ad.is_bulk_shareable !== false && (ad.budget_remaining || 0) > 0
  ).length;

  const megaLink = user ? `${window.location.origin}/vitrine/u/${slugFromEmail(user.email)}` : '';

  const handleOpen = () => {
    if (!user) {
      base44.auth.redirectToLogin();
      return;
    }
    if (eligibleCount === 0) {
      toast.info('Nenhum anúncio elegível para compartilhar agora.');
      return;
    }
    setOpen(true);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(megaLink);
      setCopied(true);
      toast.success('Link copiado! Cole em qualquer rede social 📋');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Não foi possível copiar o link');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Reality Activity — Minha Vitrine',
          text: `Confira estas ofertas que separei pra você! 🚀`,
          url: megaLink,
        });
        toast.success('Link compartilhado! 🎉');
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return; // usuário cancelou
        // senão, segue para o fallback de copiar
      }
    }
    try {
      await navigator.clipboard.writeText(megaLink);
      setCopied(true);
      toast.success('Link copiado! Cole onde quiser 📋');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Não foi possível compartilhar o link');
    }
  };

  const modalBody = (
    <div className="mx-auto max-w-md w-full px-5 pb-6 pt-2">
      {/* Drag handle (mobile only) */}
      {isMobile && (
        <div className="flex justify-center pt-2 pb-4">
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
        </div>
      )}

      <div className="text-center space-y-1 mb-5">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-gold" />
          <h2 className="text-xl font-bold text-foreground">Seu Mega-Link</h2>
        </div>
        <p className="text-sm text-muted-foreground px-2">
          Um único link com todos os {eligibleCount} anúncios. Compartilhe em qualquer rede social — sem limite de caracteres.
        </p>
      </div>

      {/* Link preview card */}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/60 border border-border mb-4">
        <LinkIcon className="w-4 h-4 text-gold flex-shrink-0" />
        <p className="text-xs text-foreground truncate flex-1 font-mono">{megaLink}</p>
      </div>

      {/* Buttons */}
      <div className="space-y-2.5">
        <Button
          onClick={handleCopy}
          className="w-full h-12 bg-gradient-to-r from-gold to-yellow-300 text-background hover:from-gold-dark hover:to-yellow-400 font-bold text-base"
        >
          {copied ? (
            <>
              <Check className="w-5 h-5" />
              Copiado!
            </>
          ) : (
            <>
              <Copy className="w-5 h-5" />
              Copiar Link
            </>
          )}
        </Button>

        <Button
          onClick={handleNativeShare}
          variant="outline"
          className="w-full h-12 border-purple/40 text-foreground hover:bg-purple/10 text-base font-semibold"
        >
          <Share2 className="w-5 h-5 text-purple" />
          Compartilhar
        </Button>
      </div>

      {/* Info: clicks earn points */}
      <div className="mt-4 p-3 rounded-xl bg-purple/5 border border-purple/20">
        <p className="text-xs text-muted-foreground text-center">
          💡 Você ganha pontos quando alguém clica no seu link e visualiza a vitrine. Compartilhe em stories, grupos, status...
        </p>
      </div>

      {/* Info: client sharing earns extra points */}
      <div className="mt-2.5 p-3 rounded-xl bg-gold/5 border border-gold/30">
        <div className="flex items-start gap-2">
          <Gift className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
          <p className="text-xs text-foreground/90">
            <span className="font-bold text-gold">Bônus extra:</span> se o seu cliente abrir a vitrine e compartilhar um anúncio, <span className="font-semibold">você também ganha pontos</span> — quanto mais o seu link circular, mais você acumula!
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <motion.button
        onClick={handleOpen}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-gold to-yellow-300 text-background font-bold text-sm shadow-lg hover:from-gold-dark hover:to-yellow-400 transition-all"
      >
        <Zap className="w-5 h-5" />
        Compartilhar Tudo
        <span className="text-xs font-medium opacity-80 ml-1">({eligibleCount} anúncios)</span>
      </motion.button>

      {isMobile ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="rounded-t-2xl border-gold/20 p-0">
            {modalBody}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md p-0 overflow-hidden border-gold/20">
            {modalBody}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}