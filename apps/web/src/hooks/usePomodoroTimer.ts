'use client';

import { useEffect, useRef } from 'react';
import { usePomodoroStore } from '../store/pomodoro';
import { notifySessionComplete } from '../lib/pomodoroNotifications';

/**
 * Drives the Pomodoro countdown. Must be mounted once at the island level.
 * Calls _tick() every second when status === 'running'.
 * Also fires a browser notification when a session completes (phase changes).
 */
export function usePomodoroTimer() {
  const status = usePomodoroStore((s) => s.status);
  const phase = usePomodoroStore((s) => s.phase);
  const _tick = usePomodoroStore((s) => s._tick);

  const prevPhaseRef = useRef(phase);

  useEffect(() => {
    if (prevPhaseRef.current !== phase) {
      // Phase changed → a session just completed — notify
      notifySessionComplete(prevPhaseRef.current);
      prevPhaseRef.current = phase;
    }
  }, [phase]);

  useEffect(() => {
    if (status !== 'running') return;

    const id = setInterval(() => {
      _tick();
    }, 1000);

    return () => clearInterval(id);
  }, [status, _tick]);
}
