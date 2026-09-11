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

const FacebookIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
);
const WhatsAppIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
);
const TelegramIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
);
const XIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
);

const SHARE_PLATFORMS = [
  { id: 'whatsapp', name: 'WhatsApp', Icon: WhatsAppIcon, color: 'text-[#25D366]' },
  { id: 'telegram', name: 'Telegram', Icon: TelegramIcon, color: 'text-[#0088cc]' },
  { id: 'facebook', name: 'Facebook', Icon: FacebookIcon, color: 'text-[#1877F2]' },
  { id: 'twitter', name: 'X', Icon: XIcon, color: 'text-foreground' },
];

export default function ShareAllButton({ user, ads, onShared }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showShareOpts, setShowShareOpts] = useState(false);
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

  const handleShareToPlatform = (platform) => {
    const msg = `🚀 Confira estas ofertas que separei pra você! Veja minha vitrine: ${megaLink}`;
    const isMob = /iPhone|iPad|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    let url = '';
    switch (platform) {
      case 'whatsapp':
        url = isMob ? `whatsapp://send?text=${encodeURIComponent(msg)}` : `https://web.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
        break;
      case 'telegram':
        url = `https://t.me/share/url?url=${encodeURIComponent(megaLink)}&text=${encodeURIComponent(msg)}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(megaLink)}&quote=${encodeURIComponent(msg)}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}`;
        break;
    }
    if (url) window.open(url, '_blank');
    setShowShareOpts(false);
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
          onClick={() => setShowShareOpts(s => !s)}
          variant="outline"
          className="w-full h-12 border-purple/40 text-foreground hover:bg-purple/10 text-base font-semibold"
        >
          <Share2 className="w-5 h-5 text-purple" />
          Compartilhar
        </Button>
      </div>

      {/* Share options */}
      {showShareOpts && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {SHARE_PLATFORMS.map(p => (
            <button
              key={p.id}
              onClick={() => handleShareToPlatform(p.id)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border hover:border-purple/40 hover:bg-purple/5 transition-colors"
            >
              <div className="w-11 h-11 rounded-full flex items-center justify-center bg-secondary/60">
                <p.Icon className={`w-5 h-5 ${p.color}`} />
              </div>
              <span className="text-xs text-muted-foreground">{p.name}</span>
            </button>
          ))}
        </div>
      )}

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