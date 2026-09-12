import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Link2, MousePointerClick, Copy, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useMegaLink } from '@/hooks/useMegaLink';

export default function MegaLinkStats({ user }) {
  const [clicks, setClicks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const { megaLink } = useMegaLink(user);

  useEffect(() => {
    if (!user?.email) return;
    let cancelled = false;
    (async () => {
      try {
        const shares = await base44.entities.AdvertisementShare.filter(
          { user_email: user.email, platform: 'mega_link' },
          '-created_date',
          500
        );
        if (cancelled) return;
        // Conta visitantes únicos (visitor_ip) = cliques únicos no Mega-Link
        const uniqueVisitors = new Set(
          shares.map(s => s.visitor_ip).filter(Boolean)
        );
        setClicks(uniqueVisitors.size);
      } catch {
        if (!cancelled) setClicks(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.email]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(megaLink);
      setCopied(true);
      toast.success('Link copiado! 📋');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-purple/30 rounded-2xl p-5 mb-8"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-lg bg-purple/15 flex items-center justify-center">
          <Link2 className="w-5 h-5 text-purple" />
        </div>
        <div>
          <h2 className="font-semibold text-sm">Meu Mega-Link</h2>
          <p className="text-xs text-muted-foreground">Vitrine pessoal para compartilhar</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-secondary/60 border border-border min-w-0">
          <Link2 className="w-4 h-4 text-purple flex-shrink-0" />
          <p className="text-xs text-foreground truncate font-mono">{megaLink}</p>
        </div>
        <button
          onClick={handleCopy}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-purple/15 text-purple hover:bg-purple/25 transition-colors flex-shrink-0"
          title="Copiar link"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
        <a
          href={megaLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-purple/15 text-purple hover:bg-purple/25 transition-colors flex-shrink-0"
          title="Abrir vitrine"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-purple/5 border border-purple/20">
        <MousePointerClick className="w-4 h-4 text-purple" />
        <span className="text-xs text-muted-foreground">Cliques únicos no seu link:</span>
        <span className="text-sm font-bold text-purple ml-auto">
          {loading ? '...' : clicks}
        </span>
      </div>
    </motion.div>
  );
}