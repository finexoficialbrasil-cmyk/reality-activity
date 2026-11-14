import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Link2, MousePointerClick, Copy, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useMegaLink } from '@/hooks/useMegaLink';
import { useCategories } from '@/hooks/useCategories';

export default function MegaLinkStats({ user }) {
  const [clicks, setClicks] = useState(0);
  const [categoryClicks, setCategoryClicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const { megaLink } = useMegaLink(user);
  const { getCategoryLabel, categories } = useCategories();

  useEffect(() => {
    if (!user?.email) return;
    let cancelled = false;
    (async () => {
      try {
        // Total acumulado de todos os cliques (nunca reinicia)
        const [total, byCategory] = await Promise.all([
          base44.entities.MegaLinkClick.count({ owner_email: user.email }),
          base44.entities.MegaLinkClick.aggregate({
            query: { owner_email: user.email, click_type: 'ad_click' },
            groupBy: 'category',
          }),
        ]);
        if (cancelled) return;
        setClicks(total || 0);
        setCategoryClicks(
          (byCategory?.rows || [])
            .filter(r => r.category && r.count > 0)
            .sort((a, b) => b.count - a.count)
        );
      } catch {
        if (!cancelled) {
          setClicks(0);
          setCategoryClicks([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.email, categories.length]);

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
        <span className="text-xs text-muted-foreground">Total de cliques no seu link:</span>
        <span className="text-sm font-bold text-purple ml-auto">
          {loading ? '...' : clicks}
        </span>
      </div>

      {categoryClicks.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-muted-foreground mb-2">Cliques por categoria:</p>
          <div className="flex flex-wrap gap-2">
            {categoryClicks.map(c => (
              <div
                key={c.category}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary/60 border border-border"
              >
                <span className="text-xs text-foreground">{getCategoryLabel(c.category)}</span>
                <span className="text-xs font-bold text-purple">{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}