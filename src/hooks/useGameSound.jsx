import { useRef } from 'react';

export default function useGameSound() {
  const audioContextRef = useRef(null);

  const playSound = (frequency = 440, duration = 100, type = 'sine') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = type;
      oscillator.frequency.value = frequency;

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration / 1000);
    } catch (err) {
      console.error('Erro ao tocar som:', err);
    }
  };

  const playHoverSound = () => {
    playSound(800, 80, 'sine');
    setTimeout(() => playSound(1000, 60, 'sine'), 50);
  };

  const playClickSound = () => {
    playSound(1200, 100, 'square');
    setTimeout(() => playSound(900, 80, 'square'), 60);
  };

  const playMoneySound = () => {
    playSound(1500, 120, 'sine');
    setTimeout(() => playSound(1800, 100, 'sine'), 80);
    setTimeout(() => playSound(2100, 80, 'sine'), 140);
  };

  return { playHoverSound, playClickSound, playMoneySound };
}