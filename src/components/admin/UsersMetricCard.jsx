import { useEffect, useState } from 'react';
import { animate, motion, useReducedMotion } from 'framer-motion';

export default function UsersMetricCard({ label, value, Icon, context, loading, error }) {
  const [display, setDisplay] = useState(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (loading || error) return;
    if (reduced) { setDisplay(value); return; }
    const control = animate(0, value, { delay: 0.4, duration: 2.4, ease: [0.16, 1, 0.3, 1], onUpdate: setDisplay });
    return () => control.stop();
  }, [value, loading, error, reduced]);
  return (
    <section className="admin-users-metric group relative h-[180px] min-w-0 overflow-hidden rounded-2xl border border-primary/30 p-5 font-inter flex flex-col justify-between" aria-label={label}>
      <div className="relative z-10 flex items-start justify-between gap-2">
        <motion.h3 initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-base font-medium text-foreground tracking-tight">{label}</motion.h3>
        <div className="flex flex-col items-end gap-1">
          <motion.div initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduced ? 0 : 2.8 }} className="rounded-lg bg-background/80 px-3 py-1.5 text-primary border border-primary/30">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </motion.div>
          <motion.p initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduced ? 0 : 3.2 }} className="text-xs text-foreground/80 text-right">{context}</motion.p>
        </div>
      </div>
      <div className="relative z-10 min-w-0">
        {loading ? <div className="h-10 w-2/3 rounded-lg bg-foreground/10 animate-pulse" /> : error ? <p className="text-sm text-foreground">Não foi possível carregar</p> : (
          <p title={value.toLocaleString('pt-BR')} className="text-3xl xl:text-4xl font-grotesk tracking-tighter tabular-nums text-foreground origin-left transition-transform group-hover:scale-[1.04] motion-reduce:transform-none">
            {Math.round(display).toLocaleString('pt-BR')}
          </p>
        )}
      </div>
    </section>
  );
}