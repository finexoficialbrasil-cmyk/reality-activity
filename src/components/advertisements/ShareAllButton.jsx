import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Zap, AlertTriangle, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

const WhatsAppIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const FacebookIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const XIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const TelegramIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const PLATFORMS = [
  { id: 'whatsapp', name: 'WhatsApp', Icon: WhatsAppIcon, color: 'text-[#25D366]', bg: 'hover:bg-[#25D366]/10', limit: 1 },
  { id: 'facebook', name: 'Facebook', Icon: FacebookIcon, color: 'text-[#1877F2]', bg: 'hover:bg-[#1877F2]/10', limit: 5 },
  { id: 'twitter', name: 'X', Icon: XIcon, color: 'text-foreground', bg: 'hover:bg-secondary', limit: 5 },
  { id: 'telegram', name: 'Telegram', Icon: TelegramIcon, color: 'text-[#0088cc]', bg: 'hover:bg-[#0088cc]/10', limit: 10 },
];

export default function ShareAllButton({ user, ads, onShared }) {
  const [open, setOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [processing, setProcessing] = useState(false);

  const eligibleAds = (ads || []).filter(
    ad => ad.status === 'approved' && ad.is_active !== false && ad.is_bulk_shareable !== false && (ad.budget_remaining || 0) > 0 && ad.user_email !== user?.email
  );

  const handleOpen = () => {
    if (!user) {
      base44.auth.redirectToLogin();
      return;
    }
    if (eligibleAds.length === 0) {
      toast.info('Nenhum anúncio elegível para compartilhar agora.');
      return;
    }
    setOpen(true);
  };

  const selectPlatform = (platform) => {
    setSelectedPlatform(platform);
  };

  const buildShareUrl = (platform, adsToShare) => {
    const siteUrl = window.location.origin;
    const isMobile = /iPhone|iPad|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const lines = adsToShare.map(ad => `📌 ${ad.title}\n${ad.link}`).join('\n\n');
    const fullMsg = `${lines}\n\n—\n🚀 Acumulo pontos compartilhando ofertas. ${siteUrl}`;

    switch (platform.id) {
      case 'whatsapp':
        return isMobile
          ? `whatsapp://send?text=${encodeURIComponent(fullMsg)}`
          : `https://web.whatsapp.com/send?text=${encodeURIComponent(fullMsg)}`;
      case 'facebook':
        return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(adsToShare[0]?.link || siteUrl)}&quote=${encodeURIComponent(fullMsg)}`;
      case 'twitter':
        return `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullMsg)}`;
      case 'telegram':
        return `https://t.me/share/url?url=${encodeURIComponent(siteUrl)}&text=${encodeURIComponent(fullMsg)}`;
      default:
        return null;
    }
  };

  const confirmShare = async () => {
    if (!selectedPlatform) return;
    const limit = selectedPlatform.limit;
    const adsToShare = eligibleAds.slice(0, limit);

    setProcessing(true);
    try {
      const res = await base44.functions.invoke('bulkShareAdvertisements', {
        platform: selectedPlatform.id,
        max_ads: limit,
      });

      const data = res.data;
      if (data?.success) {
        // Open the share window for the selected platform
        const shareUrl = buildShareUrl(selectedPlatform, adsToShare);
        if (shareUrl) window.open(shareUrl, '_blank');

        if (data.sharedCount > 0) {
          toast.success(`🎉 ${data.sharedCount} anúncios compartilhados! +${data.totalPoints} pontos!`);
        } else {
          toast.info('Nenhum anúncio elegível para compartilhamento em massa.');
        }
        if (onShared) onShared();
        setOpen(false);
        setSelectedPlatform(null);
      } else {
        toast.error(data?.error || 'Erro ao compartilhar');
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.data?.error || err?.message;
      toast.error(msg || 'Erro ao compartilhar todos os anúncios');
    } finally {
      setProcessing(false);
    }
  };

  const resetSelection = () => setSelectedPlatform(null);

  const limit = selectedPlatform?.limit;
  const exceedsLimit = selectedPlatform && eligibleAds.length > limit;
  const willShareCount = selectedPlatform ? Math.min(eligibleAds.length, limit) : 0;

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
        <span className="text-xs font-medium opacity-80 ml-1">({eligibleAds.length} anúncios)</span>
      </motion.button>

      <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetSelection(); }}>
        <SheetContent side="bottom" className="rounded-t-2xl border-gold/20 p-0">
          <div className="mx-auto max-w-md w-full px-5 pb-8 pt-2">
            {/* Drag handle */}
            <div className="flex justify-center pt-2 pb-4">
              <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
            </div>

            <AnimatePresence mode="wait">
              {!selectedPlatform ? (
                <motion.div
                  key="select"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <SheetHeader className="text-center space-y-1 mb-4">
                    <SheetTitle className="text-xl font-bold text-foreground">
                      Compartilhar Tudo
                    </SheetTitle>
                    <SheetDescription>
                      Escolha a rede social para compartilhar {eligibleAds.length} {eligibleAds.length === 1 ? 'anúncio' : 'anúncios'}
                    </SheetDescription>
                  </SheetHeader>

                  <div className="space-y-2">
                    {PLATFORMS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => selectPlatform(p)}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card transition-all ${p.bg} hover:border-current/30 active:scale-[0.98]`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-secondary ${p.color}`}>
                          <p.Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-foreground">{p.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.limit === 1 ? '1 anúncio por vez' : `até ${p.limit} anúncios por vez`}
                          </p>
                        </div>
                        <Share2 className="w-4 h-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <SheetHeader className="text-center space-y-1 mb-4">
                    <SheetTitle className="text-xl font-bold text-foreground flex items-center justify-center gap-2">
                      <selectedPlatform.Icon className={`w-5 h-5 ${selectedPlatform.color}`} />
                      {selectedPlatform.name}
                    </SheetTitle>
                    <SheetDescription>
                      {exceedsLimit
                        ? `Você tem ${eligibleAds.length} anúncios, mas esta rede só permite ${limit} por vez`
                        : `Compartilhar ${willShareCount} ${willShareCount === 1 ? 'anúncio' : 'anúncios'} no ${selectedPlatform.name}`}
                    </SheetDescription>
                  </SheetHeader>

                  {exceedsLimit && (
                    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/30 mb-4">
                      <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-semibold text-orange-400 mb-0.5">Limite da rede</p>
                        <p className="text-muted-foreground text-xs">
                          Esta rede só permite compartilhar {limit} {limit === 1 ? 'anúncio' : 'anúncios'} por vez. Serão compartilhados apenas os primeiros {limit}.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={resetSelection}
                      disabled={processing}
                      className="flex-1 h-11"
                    >
                      Voltar
                    </Button>
                    <Button
                      onClick={confirmShare}
                      disabled={processing}
                      className="flex-1 h-11 bg-gradient-to-r from-gold to-yellow-300 text-background hover:from-gold-dark hover:to-yellow-400 font-bold"
                    >
                      {processing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Compartilhando...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          Confirmar ({willShareCount})
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}