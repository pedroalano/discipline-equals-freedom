'use client';

import { useEffect } from 'react';
import { usePomodoroStore } from '../store/pomodoro';

/**
 * Space = pause/resume  |  Escape = stop
 * Only active while a session is running or paused (not idle).
 */
export function useKeyboardShortcuts() {
  const status = usePomodoroStore((s) => s.status);
  const pause = usePomodoroStore((s) => s.pause);
  const resume = usePomodoroStore((s) => s.resume);
  const stop = usePomodoroStore((s) => s.stop);

  useEffect(() => {
    if (status === 'idle') return;

    function onKeyDown(e: KeyboardEvent) {
      // Don't intercept if the user is typing in an input
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (status === 'running') pause();
        else if (status === 'paused') resume();
      } else if (e.code === 'Escape') {
        stop();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [status, pause, resume, stop]);
}
