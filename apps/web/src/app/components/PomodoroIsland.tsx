'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { usePomodoroStore } from '../../store/pomodoro';
import { usePomodoroTimer } from '../../hooks/usePomodoroTimer';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { useTabTitle } from '../../hooks/useTabTitle';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { PomodoroTimer } from './PomodoroTimer';

/**
 * Client island mounted once in page.tsx.
 * Boots all side-effect hooks and renders the overlay + timer panel.
 */
export function PomodoroIsland() {
  const status = usePomodoroStore((s) => s.status);
  const shouldReduceMotion = useReducedMotion();

  // Side-effect hooks
  usePomodoroTimer();
  useAudioEngine();
  useTabTitle();
  useKeyboardShortcuts();

  const isActive = status !== 'idle';

  return (
    <AnimatePresence>
      {isActive && (
        <>
          {/* Dim overlay */}
          <motion.div
            key="pomodoro-overlay"
            className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
            aria-hidden="true"
          />

          {/* Timer panel */}
          <div className="fixed inset-0 z-30 flex items-center justify-center">
            <motion.div
              key="pomodoro-timer"
              initial={{
                opacity: 0,
                scale: shouldReduceMotion ? 1 : 0.95,
                y: shouldReduceMotion ? 0 : 10,
              }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{
                opacity: 0,
                scale: shouldReduceMotion ? 1 : 0.95,
                y: shouldReduceMotion ? 0 : 10,
              }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.25 }}
            >
              <PomodoroTimer />
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
