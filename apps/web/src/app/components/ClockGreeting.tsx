'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

function getGreeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function ClockGreeting() {
  const [now, setNow] = useState<Date | null>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  if (!now) {
    return (
      <div className="text-center">
        <p className="text-7xl font-mono font-thin tracking-widest text-white drop-shadow opacity-0">
          00:00
        </p>
        <p className="mt-2 text-xl font-light text-white/80 drop-shadow opacity-0">Good morning</p>
      </div>
    );
  }

  const time = now.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <div className="text-center">
      <AnimatePresence mode="wait">
        <motion.p
          key={time}
          className="text-7xl font-mono font-thin tracking-widest text-white drop-shadow"
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: shouldReduceMotion ? 0 : 6 }}
          transition={{ duration: 0.3 }}
        >
          {time}
        </motion.p>
      </AnimatePresence>
      <p className="mt-2 text-xl font-light text-white/80 drop-shadow">
        {getGreeting(now.getHours())}
      </p>
    </div>
  );
}
