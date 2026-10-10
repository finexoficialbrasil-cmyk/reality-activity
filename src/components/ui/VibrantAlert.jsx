import { ShieldCheck, ShieldAlert, Info, AlertTriangle, Lightbulb } from 'lucide-react';

const SEVERITY = {
  critical: {
    color: '#FF4D4D',
    Icon: AlertTriangle,
  },
  warning: {
    color: '#FFD600',
    Icon: ShieldAlert,
  },
  info: {
    color: '#00E676',
    Icon: Info,
  },
  blue: {
    color: '#2979FF',
    Icon: Lightbulb,
  },
  success: {
    color: '#00E676',
    Icon: ShieldCheck,
  },
};

export default function VibrantAlert({ severity = 'info', icon: CustomIcon, children, className = '' }) {
  const config = SEVERITY[severity] || SEVERITY.info;
  const Icon = CustomIcon || config.Icon;
  const color = config.color;

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-2xl ${className}`}
      style={{
        background: `${color}1A`,
        border: `1px solid ${color}66`,
        boxShadow: `0 0 16px ${color}33, inset 0 0 12px ${color}0D`,
      }}
    >
      <Icon
        className="w-5 h-5 flex-shrink-0 mt-0.5"
        style={{ color, filter: `drop-shadow(0 0 4px ${color}AA)` }}
      />
      <p
        className="text-xs leading-relaxed font-medium"
        style={{ color: `${color}FF` }}
      >
        {children}
      </p>
    </div>
  );
}