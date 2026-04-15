import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TimerPhase = 'work' | 'shortBreak' | 'longBreak';
export type TimerStatus = 'idle' | 'running' | 'paused';
export type SoundType = 'none' | 'white' | 'brown' | 'pink';

export interface PomodoroSettings {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsBeforeLong: number;
  autoStartBreak: boolean;
  autoStartWork: boolean;
  soundType: SoundType;
  soundVolume: number;
  soundMuted: boolean;
  soundDuringBreaks: boolean;
  tickEnabled: boolean;
}

interface PomodoroState {
  // Runtime (not persisted)
  status: TimerStatus;
  phase: TimerPhase;
  secondsLeft: number;
  sessionsDoneThisSet: number;

  // Persisted
  settings: PomodoroSettings;
  dailyCount: number;
  dailyCountDate: string; // YYYY-MM-DD

  // Actions
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  skip: () => void;
  _tick: () => void;
  _completeSession: (countSession: boolean) => void;
  updateSettings: (patch: Partial<PomodoroSettings>) => void;
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 10,
  sessionsBeforeLong: 4,
  autoStartBreak: false,
  autoStartWork: false,
  soundType: 'none',
  soundVolume: 0.3,
  soundMuted: false,
  soundDuringBreaks: false,
  tickEnabled: false,
};

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function nextPhase(current: TimerPhase, isSetComplete: boolean): TimerPhase {
  if (current === 'work') {
    return isSetComplete ? 'longBreak' : 'shortBreak';
  }
  return 'work';
}

export const usePomodoroStore = create<PomodoroState>()(
  persist(
    (set, get) => ({
      // Runtime defaults
      status: 'idle',
      phase: 'work',
      secondsLeft: DEFAULT_SETTINGS.workDuration * 60,
      sessionsDoneThisSet: 0,

      // Persisted defaults
      settings: DEFAULT_SETTINGS,
      dailyCount: 0,
      dailyCountDate: todayString(),

      start() {
        const { settings } = get();
        set({
          status: 'running',
          phase: 'work',
          secondsLeft: settings.workDuration * 60,
          sessionsDoneThisSet: 0,
        });
      },

      pause() {
        set({ status: 'paused' });
      },

      resume() {
        set({ status: 'running' });
      },

      stop() {
        const { settings } = get();
        set({
          status: 'idle',
          phase: 'work',
          secondsLeft: settings.workDuration * 60,
          sessionsDoneThisSet: 0,
        });
      },

      skip() {
        get()._completeSession(false);
      },

      _tick() {
        const { secondsLeft } = get();
        if (secondsLeft > 1) {
          set({ secondsLeft: secondsLeft - 1 });
        } else {
          set({ secondsLeft: 0 });
          get()._completeSession(true);
        }
      },

      _completeSession(countSession: boolean) {
        const { phase, sessionsDoneThisSet, settings, dailyCount, dailyCountDate } = get();

        const today = todayString();
        let newDailyCount = dailyCountDate === today ? dailyCount : 0;
        let newSessionsDone = sessionsDoneThisSet;
        let isSetComplete = false;

        if (countSession && phase === 'work') {
          newDailyCount += 1;
          newSessionsDone = sessionsDoneThisSet + 1;
          isSetComplete = newSessionsDone >= settings.sessionsBeforeLong;
          if (isSetComplete) {
            newSessionsDone = 0;
          }
        }

        const next = nextPhase(phase, isSetComplete);
        const shouldAutoStart =
          (next !== 'work' && settings.autoStartBreak) ||
          (next === 'work' && settings.autoStartWork);

        const secondsLeft =
          next === 'work'
            ? settings.workDuration * 60
            : next === 'shortBreak'
              ? settings.shortBreakDuration * 60
              : settings.longBreakDuration * 60;

        set({
          phase: next,
          secondsLeft,
          sessionsDoneThisSet: next === 'work' ? 0 : newSessionsDone,
          status: shouldAutoStart ? 'running' : 'paused',
          dailyCount: newDailyCount,
          dailyCountDate: today,
        });
      },

      updateSettings(patch: Partial<PomodoroSettings>) {
        const { settings, status, phase, sessionsDoneThisSet } = get();
        const next = { ...settings, ...patch };
        set({ settings: next });

        if (
          patch.sessionsBeforeLong !== undefined &&
          sessionsDoneThisSet >= next.sessionsBeforeLong
        ) {
          set({ sessionsDoneThisSet: next.sessionsBeforeLong - 1 });
        }

        // If idle, reset secondsLeft to reflect new duration
        if (status === 'idle') {
          set({ secondsLeft: next.workDuration * 60 });
        } else if (status === 'paused') {
          const secs =
            phase === 'work'
              ? next.workDuration * 60
              : phase === 'shortBreak'
                ? next.shortBreakDuration * 60
                : next.longBreakDuration * 60;
          set({ secondsLeft: secs });
        }
      },
    }),
    {
      name: 'zenfocus-pomodoro',
      partialize: (state) => ({
        settings: state.settings,
        dailyCount: state.dailyCount,
        dailyCountDate: state.dailyCountDate,
      }),
    },
  ),
);
