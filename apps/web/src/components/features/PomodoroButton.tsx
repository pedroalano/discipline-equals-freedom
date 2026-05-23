'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { usePomodoroStore } from '../../store/pomodoro';
import { requestNotificationPermission } from '../../lib/pomodoroNotifications';

export function PomodoroButton() {
  const status = usePomodoroStore((s) => s.status);
  const start = usePomodoroStore((s) => s.start);
  const dailyCount = usePomodoroStore((s) => s.dailyCount);
  const dailyCountDate = usePomodoroStore((s) => s.dailyCountDate);
  const shouldReduceMotion = useReducedMotion();

  const today = new Date().toISOString().slice(0, 10);
  const count = dailyCountDate === today ? dailyCount : 0;

  function handleClick() {
    if (status !== 'idle') return;
    void requestNotificationPermission();
    start();
  }

  const isRunning = status === 'running';
  const isActive = status !== 'idle';

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isActive ? 'Pomodoro running' : 'Start Pomodoro'}
      className="relative flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-full"
    >
      <motion.span
        className="text-4xl select-none"
        style={{ opacity: isActive ? 1 : undefined }}
        animate={
          isRunning && !shouldReduceMotion
            ? { scale: [1, 1.15, 1], opacity: [1, 1, 1] }
            : { scale: 1, opacity: isActive ? 1 : 0.5 }
        }
        transition={
          isRunning ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }
        }
        whileHover={!isActive ? { opacity: 1 } : {}}
      >
        🍅
      </motion.span>

      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px] font-semibold text-white backdrop-blur-sm">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}
