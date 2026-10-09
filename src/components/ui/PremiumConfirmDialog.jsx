import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

/**
 * Modal de confirmação premium — substitui o confirm() nativo do browser.
 * Props:
 *  - open: boolean
 *  - title: string
 *  - message: string | ReactNode
 *  - confirmLabel: string (default "Confirmar")
 *  - cancelLabel: string (default "Cancelar")
 *  - onConfirm: () => void
 *  - onCancel: () => void
 *  - variant: 'danger' | 'gold' (default 'danger')
 *  - icon: optional Lucide icon component (default AlertTriangle)
 *  - loading: boolean
 */
export default function PremiumConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  variant = 'danger',
  icon: Icon = AlertTriangle,
  loading = false,
}) {
  const isDanger = variant === 'danger';
  const accent = isDanger ? 'hsl(0 72% 51%)' : 'hsl(45 100% 55%)';
  const accentDark = isDanger ? 'hsl(0 72% 42%)' : 'hsl(38 90% 42%)';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 backdrop-blur-md"
            style={{ background: 'hsl(220 20% 4% / 0.75)' }}
            onClick={loading ? undefined : onCancel}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-sm rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, hsl(220 18% 11%) 0%, hsl(220 20% 7%) 100%)',
              border: `1px solid ${accent}30`,
              boxShadow: `0 24px 64px ${accent}15, 0 0 0 1px ${accent}10 inset`,
            }}
          >
            {/* Glow radial no topo */}
            <div
              className="absolute -top-16 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full opacity-25 blur-3xl pointer-events-none"
              style={{ background: `radial-gradient(circle, ${accent}, transparent 70%)` }}
            />

            {/* Fechar */}
            <button
              onClick={loading ? undefined : onCancel}
              disabled={loading}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative z-10 p-7 text-center">
              {/* Ícone */}
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
                className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center relative"
                style={{
                  background: `linear-gradient(135deg, ${accent}, ${accentDark})`,
                  boxShadow: `0 0 32px ${accent}50, inset 0 0 16px ${accent}25`,
                }}
              >
                <Icon className="w-8 h-8 text-white" strokeWidth={2.2} />
                {/* Anel pulsante */}
                <motion.div
                  className="absolute inset-0 rounded-2xl border-2"
                  style={{ borderColor: accent }}
                  animate={{ scale: [1, 1.25], opacity: [0.6, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                />
              </motion.div>

              {/* Título */}
              <h2 className="font-grotesk font-bold text-xl text-white mb-2 tracking-tight">
                {title}
              </h2>

              {/* Mensagem */}
              <div className="text-muted-foreground text-sm leading-relaxed mb-7">
                {message}
              </div>

              {/* Botões */}
              <div className="flex flex-col-reverse sm:flex-row gap-3">
                <button
                  onClick={onCancel}
                  disabled={loading}
                  className="flex-1 px-5 py-3.5 rounded-2xl font-semibold text-sm text-muted-foreground bg-secondary/60 border border-border hover:bg-secondary hover:text-foreground transition-all active:scale-[0.97] disabled:opacity-50"
                >
                  {cancelLabel}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={loading}
                  className="group relative flex-1 overflow-hidden flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-sm text-white transition-all active:scale-[0.97] disabled:opacity-70"
                  style={{
                    background: `linear-gradient(135deg, ${accent}, ${accentDark})`,
                    boxShadow: `0 8px 28px ${accent}40, inset 0 1px 0 ${accent}80`,
                  }}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span className="relative">Processando...</span>
                    </>
                  ) : (
                    <span className="relative">{confirmLabel}</span>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}