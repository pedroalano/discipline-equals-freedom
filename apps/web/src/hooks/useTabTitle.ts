'use client';

import { useEffect } from 'react';
import { usePomodoroStore } from '../store/pomodoro';
import type { TimerPhase } from '../store/pomodoro';

const DEFAULT_TITLE = 'ZenFocus';

function phaseLabel(phase: TimerPhase): string {
  if (phase === 'work') return 'Work';
  if (phase === 'shortBreak') return 'Short Break';
  return 'Long Break';
}

function formatSeconds(secs: number): string {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * Updates document.title with the countdown while a session is running or paused.
 */
export function useTabTitle() {
  const status = usePomodoroStore((s) => s.status);
  const phase = usePomodoroStore((s) => s.phase);
  const secondsLeft = usePomodoroStore((s) => s.secondsLeft);

  useEffect(() => {
    if (status === 'idle') {
      document.title = DEFAULT_TITLE;
      return;
    }

    const time = formatSeconds(secondsLeft);
    document.title = `(${time}) ${phaseLabel(phase)} — ${DEFAULT_TITLE}`;

    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [status, phase, secondsLeft]);
}
