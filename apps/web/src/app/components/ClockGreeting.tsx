'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { PomodoroButton } from './PomodoroButton';
import { usePomodoroStore } from '../../store/pomodoro';
import type { TimerPhase } from '../../store/pomodoro';

function getGreeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const PHASE_LABELS: Record<TimerPhase, string> = {
  work: 'WORK SESSION',
  shortBreak: 'SHORT BREAK',
  longBreak: 'LONG BREAK',
};

function formatSeconds(secs: number): string {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function ClockGreeting({ name }: { name?: string }) {
  const [now, setNow] = useState<Date | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const status = usePomodoroStore((s) => s.status);
  const phase = usePomodoroStore((s) => s.phase);
  const secondsLeft = usePomodoroStore((s) => s.secondsLeft);
  const sessionsDoneThisSet = usePomodoroStore((s) => s.sessionsDoneThisSet);
  const settings = usePomodoroStore((s) => s.settings);
  const pause = usePomodoroStore((s) => s.pause);
  const resume = usePomodoroStore((s) => s.resume);
  const stop = usePomodoroStore((s) => s.stop);
  const skip = usePomodoroStore((s) => s.skip);

  const isActive = status !== 'idle';
  const dots = Array.from({ length: settings.sessionsBeforeLong }, (_, i) => i);

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

  const time =
    now?.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }) ?? '00:00';

  return (
    <div className="text-center">
      {isActive ? (
        <div className="flex flex-col items-center gap-2">
          {/* Phase label */}
          <p className="text-xs font-medium tracking-widest text-white/60 uppercase">
            {PHASE_LABELS[phase]}
          </p>

          {/* Countdown replacing the clock */}
          <p
            role="timer"
            aria-live="off"
            aria-label={`${formatSeconds(secondsLeft)} remaining`}
            className="text-9xl font-cormorant font-thin tracking-widest text-white drop-shadow"
          >
            {formatSeconds(secondsLeft)}
          </p>

          {/* Progress dots */}
          <div className="flex gap-2" aria-label="Session progress">
            {dots.map((i) => (
              <span
                key={i}
                className={`text-base transition-colors ${i < sessionsDoneThisSet ? 'text-white' : 'text-white/20'}`}
                aria-hidden="true"
              >
                ●
              </span>
            ))}
          </div>

          {/* Controls */}
          <div className="mt-1 flex gap-3 text-sm font-cormorant">
            <button
              type="button"
              onClick={status === 'running' ? pause : resume}
              className="flex items-center gap-1.5 rounded-lg bg-white/10 px-4 py-2 text-white hover:bg-white/20 transition-colors"
              aria-label={status === 'running' ? 'Pause' : 'Resume'}
            >
              {status === 'running' ? '⏸' : '▶'} {status === 'running' ? 'Pause' : 'Resume'}
            </button>
            <button
              type="button"
              onClick={skip}
              className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-white hover:bg-white/20 transition-colors"
              aria-label="Skip to next phase"
            >
              ⏭ Skip
            </button>
            <button
              type="button"
              onClick={stop}
              className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-white hover:bg-white/20 transition-colors"
              aria-label="Stop timer"
            >
              ✕ Stop
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <AnimatePresence mode="wait">
            <motion.p
              key={time}
              className="text-9xl font-cormorant font-thin tracking-widest text-white drop-shadow"
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: shouldReduceMotion ? 0 : 6 }}
              transition={{ duration: 0.3 }}
            >
              {now ? time : <span className="opacity-0">{time}</span>}
            </motion.p>
          </AnimatePresence>
          <PomodoroButton />
        </div>
      )}

      <p className="mt-2 text-4xl font-cormorant font-light tracking-wide text-white drop-shadow">
        {getGreeting(now?.getHours() ?? new Date().getHours())}
        {name ? `, ${name}` : ''}
      </p>
    </div>
  );
}
