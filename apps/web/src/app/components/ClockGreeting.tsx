'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { PomodoroButton } from './PomodoroButton';

function getGreeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function ClockGreeting({ name }: { name?: string }) {
  const [now, setNow] = useState<Date | null>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const tick = () => setNow(new Date());

    // Tick immediately so the clock shows the correct time on mount.
    tick();

    // Schedule the first tick at the next minute boundary, then repeat every 60 s.
    const msUntilNextMinute = () => {
      const now = new Date();
      return 60_000 - (now.getSeconds() * 1_000 + now.getMilliseconds());
    };

    let interval: ReturnType<typeof setInterval>;
    const timeout = setTimeout(() => {
      tick();
      interval = setInterval(tick, 60_000);
    }, msUntilNextMinute());

    // Correct the display immediately when the tab becomes visible again.
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  if (!now) {
    return (
      <div className="text-center">
        <p className="text-9xl font-cormorant font-thin tracking-widest text-white drop-shadow opacity-0">
          00:00
        </p>
        <p className="mt-2 text-4xl font-cormorant font-light tracking-wide text-white drop-shadow opacity-0">
          Good morning
        </p>
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
      <div className="flex items-center justify-center gap-3">
        <AnimatePresence mode="wait">
          <motion.p
            key={time}
            className="text-9xl font-cormorant font-thin tracking-widest text-white drop-shadow"
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: shouldReduceMotion ? 0 : 6 }}
            transition={{ duration: 0.3 }}
          >
            {time}
          </motion.p>
        </AnimatePresence>
        <PomodoroButton />
      </div>
      <p className="mt-2 text-4xl font-cormorant font-light tracking-wide text-white drop-shadow">
        {getGreeting(now.getHours())}
        {name ? `, ${name}` : ''}
      </p>
    </div>
  );
}
