import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

export default function StatsCounter({ value, label, icon: Icon }) {
  const [count, setCount] = useState(0);
  const [isInView, setIsInView] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !isInView) {
        setIsInView(true);
      }
    }, { threshold: 0.5 });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [isInView]);

  useEffect(() => {
    if (!isInView) return;
    
    const duration = 2000;
    const steps = 60;
    const stepDuration = duration / steps;
    const increment = parseInt(value.replace(/\D/g, '')) / steps;
    
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= parseInt(value.replace(/\D/g, ''))) {
        setCount(parseInt(value.replace(/\D/g, '')));
        clearInterval(interval);
      } else {
        setCount(Math.floor(current));
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [isInView, value]);

  const displayValue = value.includes('+') ? count + '+' : value.includes('∞') ? '∞' : count + (value.includes('K') ? 'K+' : '');

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      whileHover={{ y: -8, scale: 1.05, boxShadow: '0 0 30px hsl(45 100% 55% / 0.3)' }}
      className="bg-card border border-border rounded-2xl p-4 text-center cursor-pointer transition-all hover:border-gold/50"
    >
      <Icon className="w-6 h-6 text-gold mx-auto mb-2" />
      <div className="font-grotesk font-bold text-3xl text-gold">{displayValue}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </motion.div>
  );
}