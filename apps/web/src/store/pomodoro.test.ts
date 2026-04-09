// Strip persist middleware so the store works without localStorage
jest.mock('zustand/middleware', () => ({
  persist: (fn: unknown) => fn,
}));

import { usePomodoroStore } from './pomodoro';
import type { PomodoroSettings } from './pomodoro';

// ── Helpers ───────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 10,
  sessionsBeforeLong: 4,
  autoStartBreak: false,
  autoStartWork: false,
  soundType: 'none',
  soundVolume: 0.3,
  soundDuringBreaks: false,
  tickEnabled: false,
};

const FIXED_DATE = '2026-04-08';

function resetStore(overrides?: Partial<ReturnType<typeof usePomodoroStore.getState>>) {
  usePomodoroStore.setState({
    status: 'idle',
    phase: 'work',
    secondsLeft: DEFAULT_SETTINGS.workDuration * 60,
    sessionsDoneThisSet: 0,
    settings: { ...DEFAULT_SETTINGS },
    dailyCount: 0,
    dailyCountDate: FIXED_DATE,
    ...overrides,
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(`${FIXED_DATE}T12:00:00Z`));
  resetStore();
});

afterEach(() => {
  jest.useRealTimers();
});

// ── _completeSession — cycle counting ─────────────────────────────────────────

describe('_completeSession — cycle counting', () => {
  it('transitions work → shortBreak on session 1', () => {
    resetStore({ phase: 'work', sessionsDoneThisSet: 0 });
    usePomodoroStore.getState()._completeSession(true);
    const { phase, sessionsDoneThisSet } = usePomodoroStore.getState();
    expect(phase).toBe('shortBreak');
    expect(sessionsDoneThisSet).toBe(1);
  });

  it('transitions work → shortBreak on session 2', () => {
    resetStore({ phase: 'work', sessionsDoneThisSet: 1 });
    usePomodoroStore.getState()._completeSession(true);
    expect(usePomodoroStore.getState().phase).toBe('shortBreak');
  });

  it('transitions work → shortBreak on session 3', () => {
    resetStore({ phase: 'work', sessionsDoneThisSet: 2 });
    usePomodoroStore.getState()._completeSession(true);
    expect(usePomodoroStore.getState().phase).toBe('shortBreak');
  });

  it('transitions work → longBreak on the 4th session (set complete)', () => {
    resetStore({ phase: 'work', sessionsDoneThisSet: 3 });
    usePomodoroStore.getState()._completeSession(true);
    const { phase, sessionsDoneThisSet } = usePomodoroStore.getState();
    expect(phase).toBe('longBreak');
    expect(sessionsDoneThisSet).toBe(0);
  });

  it('transitions longBreak → work and resets sessionsDoneThisSet', () => {
    resetStore({ phase: 'longBreak', sessionsDoneThisSet: 0 });
    usePomodoroStore.getState()._completeSession(true);
    const { phase, sessionsDoneThisSet } = usePomodoroStore.getState();
    expect(phase).toBe('work');
    expect(sessionsDoneThisSet).toBe(0);
  });

  it('transitions shortBreak → work and resets sessionsDoneThisSet', () => {
    resetStore({ phase: 'shortBreak', sessionsDoneThisSet: 2 });
    usePomodoroStore.getState()._completeSession(true);
    const { phase, sessionsDoneThisSet } = usePomodoroStore.getState();
    expect(phase).toBe('work');
    expect(sessionsDoneThisSet).toBe(0);
  });

  it('does NOT increment dailyCount when completing a break phase', () => {
    resetStore({ phase: 'shortBreak', dailyCount: 3 });
    usePomodoroStore.getState()._completeSession(true);
    expect(usePomodoroStore.getState().dailyCount).toBe(3);
  });
});

// ── _completeSession — daily count ────────────────────────────────────────────

describe('_completeSession — daily count', () => {
  it('increments dailyCount when a work session completes', () => {
    resetStore({ phase: 'work', dailyCount: 2, dailyCountDate: FIXED_DATE });
    usePomodoroStore.getState()._completeSession(true);
    expect(usePomodoroStore.getState().dailyCount).toBe(3);
  });

  it('resets dailyCount to 1 on a day boundary', () => {
    resetStore({ phase: 'work', dailyCount: 5, dailyCountDate: '2026-04-07' });
    usePomodoroStore.getState()._completeSession(true);
    const { dailyCount, dailyCountDate } = usePomodoroStore.getState();
    expect(dailyCount).toBe(1);
    expect(dailyCountDate).toBe(FIXED_DATE);
  });

  it('does NOT reset dailyCount when date matches today', () => {
    resetStore({ phase: 'work', dailyCount: 5, dailyCountDate: FIXED_DATE });
    usePomodoroStore.getState()._completeSession(true);
    expect(usePomodoroStore.getState().dailyCount).toBe(6);
  });
});

// ── skip() ────────────────────────────────────────────────────────────────────

describe('skip()', () => {
  it('does NOT increment dailyCount', () => {
    resetStore({ phase: 'work', dailyCount: 3 });
    usePomodoroStore.getState().skip();
    expect(usePomodoroStore.getState().dailyCount).toBe(3);
  });

  it('does NOT increment sessionsDoneThisSet', () => {
    resetStore({ phase: 'work', sessionsDoneThisSet: 2 });
    usePomodoroStore.getState().skip();
    expect(usePomodoroStore.getState().sessionsDoneThisSet).toBe(2);
  });

  it('still transitions phase (work → shortBreak)', () => {
    resetStore({ phase: 'work', sessionsDoneThisSet: 0 });
    usePomodoroStore.getState().skip();
    expect(usePomodoroStore.getState().phase).toBe('shortBreak');
  });

  it('routes to shortBreak even on session 3 skip (no count → not set complete)', () => {
    resetStore({ phase: 'work', sessionsDoneThisSet: 3 });
    usePomodoroStore.getState().skip();
    expect(usePomodoroStore.getState().phase).toBe('shortBreak');
  });
});

// ── stop() ────────────────────────────────────────────────────────────────────

describe('stop()', () => {
  it('resets status to idle', () => {
    resetStore({ status: 'running' });
    usePomodoroStore.getState().stop();
    expect(usePomodoroStore.getState().status).toBe('idle');
  });

  it('resets phase to work', () => {
    resetStore({ phase: 'shortBreak' });
    usePomodoroStore.getState().stop();
    expect(usePomodoroStore.getState().phase).toBe('work');
  });

  it('resets sessionsDoneThisSet to 0', () => {
    resetStore({ sessionsDoneThisSet: 3 });
    usePomodoroStore.getState().stop();
    expect(usePomodoroStore.getState().sessionsDoneThisSet).toBe(0);
  });

  it('resets secondsLeft to workDuration * 60', () => {
    resetStore({ secondsLeft: 10 });
    usePomodoroStore.getState().stop();
    expect(usePomodoroStore.getState().secondsLeft).toBe(DEFAULT_SETTINGS.workDuration * 60);
  });

  it('does NOT reset dailyCount', () => {
    resetStore({ dailyCount: 7 });
    usePomodoroStore.getState().stop();
    expect(usePomodoroStore.getState().dailyCount).toBe(7);
  });
});

// ── updateSettings() ──────────────────────────────────────────────────────────

describe('updateSettings()', () => {
  it('applies a settings patch', () => {
    resetStore();
    usePomodoroStore.getState().updateSettings({ workDuration: 30 });
    expect(usePomodoroStore.getState().settings.workDuration).toBe(30);
  });

  it('clamps sessionsDoneThisSet when sessionsBeforeLong is reduced below current progress', () => {
    resetStore({
      sessionsDoneThisSet: 3,
      settings: { ...DEFAULT_SETTINGS, sessionsBeforeLong: 4 },
    });
    usePomodoroStore.getState().updateSettings({ sessionsBeforeLong: 2 });
    expect(usePomodoroStore.getState().sessionsDoneThisSet).toBe(1);
  });

  it('does NOT clamp sessionsDoneThisSet when sessionsBeforeLong increases', () => {
    resetStore({
      sessionsDoneThisSet: 3,
      settings: { ...DEFAULT_SETTINGS, sessionsBeforeLong: 4 },
    });
    usePomodoroStore.getState().updateSettings({ sessionsBeforeLong: 6 });
    expect(usePomodoroStore.getState().sessionsDoneThisSet).toBe(3);
  });

  it('does NOT clamp when only unrelated setting changes', () => {
    resetStore({ sessionsDoneThisSet: 2 });
    usePomodoroStore.getState().updateSettings({ workDuration: 30 });
    expect(usePomodoroStore.getState().sessionsDoneThisSet).toBe(2);
  });

  it('resets secondsLeft to new workDuration * 60 when status is idle', () => {
    resetStore({ status: 'idle' });
    usePomodoroStore.getState().updateSettings({ workDuration: 50 });
    expect(usePomodoroStore.getState().secondsLeft).toBe(50 * 60);
  });
});

// ── autoStart flags ───────────────────────────────────────────────────────────

describe('autoStart flags', () => {
  it('sets status to running after work ends when autoStartBreak is true', () => {
    resetStore({
      phase: 'work',
      sessionsDoneThisSet: 0,
      settings: { ...DEFAULT_SETTINGS, autoStartBreak: true },
    });
    usePomodoroStore.getState()._completeSession(true);
    expect(usePomodoroStore.getState().status).toBe('running');
  });

  it('sets status to paused after work ends when autoStartBreak is false', () => {
    resetStore({
      phase: 'work',
      sessionsDoneThisSet: 0,
      settings: { ...DEFAULT_SETTINGS, autoStartBreak: false },
    });
    usePomodoroStore.getState()._completeSession(true);
    expect(usePomodoroStore.getState().status).toBe('paused');
  });
});
