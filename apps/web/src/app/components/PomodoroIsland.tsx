'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { usePomodoroStore } from '../../store/pomodoro';
import { Button } from '@/components/ui/button';
import { Settings, Volume2, VolumeX } from 'lucide-react';
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
            <button
              type="button"
              onClick={() =>
                usePomodoroStore.getState().updateSettings({ soundMuted: !settings.soundMuted })
              }
              className={`shrink-0 cursor-pointer rounded p-0.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 ${settings.soundMuted ? 'text-red-400 hover:text-red-300' : 'hover:text-white/90'}`}
              aria-label={settings.soundMuted ? 'Unmute sound' : 'Mute sound'}
              aria-pressed={settings.soundMuted}
            >
              {settings.soundMuted ? (
                <VolumeX className="h-3 w-3" />
              ) : (
                <Volume2 className="h-3 w-3" />
              )}
            </button>
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
          <Button
            variant="glass"
            size="icon"
            className="rounded-full backdrop-blur-sm"
            onClick={() => setShowSettings(true)}
            aria-label="Open timer settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showSettings && isActive && <PomodoroSettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}
