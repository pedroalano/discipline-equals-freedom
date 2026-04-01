'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { usePomodoroStore } from '../../store/pomodoro';
import { usePomodoroTimer } from '../../hooks/usePomodoroTimer';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { useTabTitle } from '../../hooks/useTabTitle';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { PomodoroSettingsModal } from './PomodoroSettingsModal';

/**
 * Client island mounted once in page.tsx.
 * Boots all side-effect hooks and renders the bottom-right settings button.
 */
export function PomodoroIsland() {
  const status = usePomodoroStore((s) => s.status);
  const settings = usePomodoroStore((s) => s.settings);
  const [showSettings, setShowSettings] = useState(false);

  // Side-effect hooks
  usePomodoroTimer();
  useAudioEngine();
  useTabTitle();
  useKeyboardShortcuts();

  const shouldReduceMotion = useReducedMotion();
  const isActive = status !== 'idle';
  const isRunning = status === 'running';

  return (
    <>
      {/* Focus blur overlay — sits above background image, below all content */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            key="pomodoro-blur"
            className="fixed inset-0 z-[1] bg-black/50 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.5 }}
          />
        )}
      </AnimatePresence>

      {/* Bottom-right floating controls */}
      <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-2">
        {/* Live volume slider when sound is playing */}
        {settings.soundType !== 'none' && isRunning && (
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/60 backdrop-blur-sm">
            <span>🔊</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.soundVolume * 100)}
              onChange={(e) => {
                usePomodoroStore
                  .getState()
                  .updateSettings({ soundVolume: Number(e.target.value) / 100 });
              }}
              className="w-24 accent-white/60"
              aria-label="Sound volume"
            />
            <span className="capitalize">{settings.soundType}</span>
          </div>
        )}

        {/* Settings gear button — only visible in Pomodoro mode */}
        {isActive && (
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white/50 backdrop-blur-sm transition-colors hover:text-white"
            aria-label="Open timer settings"
          >
            ⚙
          </button>
        )}
      </div>

      {showSettings && isActive && <PomodoroSettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}
