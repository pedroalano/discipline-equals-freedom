'use client';

import { useEffect, useRef } from 'react';
import { usePomodoroStore } from '../store/pomodoro';
import { createAudioEngine } from '../lib/audioEngine';

/**
 * Manages Web Audio API noise playback and optional tick sound.
 * Must be mounted once at the island level.
 */
export function useAudioEngine() {
  const status = usePomodoroStore((s) => s.status);
  const phase = usePomodoroStore((s) => s.phase);
  const settings = usePomodoroStore((s) => s.settings);

  const engineRef = useRef(createAudioEngine());

  // Start/stop noise based on running state and phase
  useEffect(() => {
    const engine = engineRef.current;
    const { soundType, soundVolume, soundDuringBreaks } = settings;

    const isWork = phase === 'work';
    const shouldPlay =
      status === 'running' && soundType !== 'none' && (isWork || soundDuringBreaks);

    if (shouldPlay) {
      engine.start(soundType, soundVolume);
    } else {
      engine.stop();
    }

    return () => {
      engine.stop();
    };
  }, [status, phase, settings.soundType, settings.soundDuringBreaks, settings]);

  // Volume updates without restarting
  useEffect(() => {
    engineRef.current.setVolume(settings.soundVolume);
  }, [settings.soundVolume]);

  // Tick sound
  useEffect(() => {
    if (status !== 'running' || !settings.tickEnabled) return;

    const id = setInterval(() => {
      engineRef.current.tick();
    }, 1000);

    return () => clearInterval(id);
  }, [status, settings.tickEnabled]);
}
