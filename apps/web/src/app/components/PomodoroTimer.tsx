'use client';

import { useState } from 'react';
import { usePomodoroStore } from '../../store/pomodoro';
import type { TimerPhase } from '../../store/pomodoro';
import { PomodoroSettingsModal } from './PomodoroSettingsModal';

function formatSeconds(secs: number): string {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const PHASE_LABELS: Record<TimerPhase, string> = {
  work: 'WORK SESSION',
  shortBreak: 'SHORT BREAK',
  longBreak: 'LONG BREAK',
};

export function PomodoroTimer() {
  const status = usePomodoroStore((s) => s.status);
  const phase = usePomodoroStore((s) => s.phase);
  const secondsLeft = usePomodoroStore((s) => s.secondsLeft);
  const sessionsDoneThisSet = usePomodoroStore((s) => s.sessionsDoneThisSet);
  const settings = usePomodoroStore((s) => s.settings);
  const pause = usePomodoroStore((s) => s.pause);
  const resume = usePomodoroStore((s) => s.resume);
  const stop = usePomodoroStore((s) => s.stop);
  const skip = usePomodoroStore((s) => s.skip);

  const [showSettings, setShowSettings] = useState(false);

  const dots = Array.from({ length: settings.sessionsBeforeLong }, (_, i) => i);

  return (
    <>
      <div className="w-80 rounded-2xl border border-white/10 bg-black/30 p-6 text-white backdrop-blur-md shadow-2xl font-cormorant">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-medium tracking-widest text-white/60 uppercase">
            {PHASE_LABELS[phase]}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="text-white/40 hover:text-white transition-colors"
              aria-label="Open timer settings"
            >
              ⚙
            </button>
            <button
              type="button"
              onClick={stop}
              className="text-white/40 hover:text-white transition-colors"
              aria-label="Stop timer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Progress dots */}
        <div className="mb-4 flex justify-center gap-2" aria-label="Session progress">
          {dots.map((i) => (
            <span
              key={i}
              className={`text-base transition-colors ${
                i < sessionsDoneThisSet ? 'text-white' : 'text-white/20'
              }`}
              aria-hidden="true"
            >
              ●
            </span>
          ))}
        </div>

        {/* Countdown */}
        <div className="mb-6 text-center">
          <p
            role="timer"
            aria-live="off"
            aria-label={`${formatSeconds(secondsLeft)} remaining`}
            className="text-7xl font-thin tracking-widest"
          >
            {formatSeconds(secondsLeft)}
          </p>
        </div>

        {/* Controls */}
        <div className="mb-4 flex justify-center gap-4 text-sm">
          <button
            type="button"
            onClick={status === 'running' ? pause : resume}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20 transition-colors"
            aria-label={status === 'running' ? 'Pause' : 'Resume'}
          >
            {status === 'running' ? '⏸' : '▶'} {status === 'running' ? 'Pause' : 'Resume'}
          </button>
          <button
            type="button"
            onClick={skip}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 hover:bg-white/20 transition-colors"
            aria-label="Skip to next phase"
          >
            ⏭ Skip
          </button>
        </div>

        {/* Sound indicator */}
        {settings.soundType !== 'none' && status === 'running' && (
          <div className="flex items-center gap-2 text-xs text-white/50">
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
              className="flex-1 accent-white/60"
              aria-label="Sound volume"
            />
            <span className="capitalize">{settings.soundType} Noise</span>
          </div>
        )}
      </div>

      {showSettings && <PomodoroSettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}
