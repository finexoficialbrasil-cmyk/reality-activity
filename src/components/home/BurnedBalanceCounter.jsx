import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';

export default function BurnedBalanceCounter({ burnedBalance = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20"
    >
      <div className="w-9 h-9 rounded-xl bg-orange-500/15 flex items-center justify-center">
        <Flame className="w-5 h-5 text-orange-400" />
      </div>
      <div className="text-left">
        <p className="text-xs text-muted-foreground leading-none mb-0.5">Saldo já queimado pelo sistema</p>
        <p className="font-grotesk font-bold text-lg text-orange-400 leading-none">
          {burnedBalance.toLocaleString('pt-BR')} pts
        </p>
      </div>
    </motion.div>
  );
}