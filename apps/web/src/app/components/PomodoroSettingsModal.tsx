'use client';

import { usePomodoroStore } from '../../store/pomodoro';
import type { SoundType } from '../../store/pomodoro';

interface Props {
  onClose: () => void;
}

const SOUND_OPTIONS: { value: SoundType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'white', label: 'White Noise' },
  { value: 'brown', label: 'Brown Noise' },
  { value: 'pink', label: 'Pink Noise' },
];

export function PomodoroSettingsModal({ onClose }: Props) {
  const settings = usePomodoroStore((s) => s.settings);
  const updateSettings = usePomodoroStore((s) => s.updateSettings);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed bottom-20 right-6 z-50 w-80 rounded-2xl border border-white/10 bg-black/60 p-6 text-white backdrop-blur-md shadow-2xl"
        role="dialog"
        aria-label="Pomodoro settings"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-cormorant text-xl font-light tracking-wide">Timer Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors text-lg leading-none"
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 text-sm">
          {/* Work duration */}
          <SliderRow
            label="Work"
            value={settings.workDuration}
            min={5}
            max={60}
            unit="min"
            onChange={(v) => updateSettings({ workDuration: v })}
          />

          {/* Short break */}
          <SliderRow
            label="Short Break"
            value={settings.shortBreakDuration}
            min={1}
            max={30}
            unit="min"
            onChange={(v) => updateSettings({ shortBreakDuration: v })}
          />

          {/* Long break */}
          <SliderRow
            label="Long Break"
            value={settings.longBreakDuration}
            min={5}
            max={60}
            unit="min"
            onChange={(v) => updateSettings({ longBreakDuration: v })}
          />

          {/* Sessions before long break */}
          <SliderRow
            label="Sessions before long break"
            value={settings.sessionsBeforeLong}
            min={1}
            max={8}
            unit=""
            onChange={(v) => updateSettings({ sessionsBeforeLong: v })}
          />

          <hr className="border-white/10" />

          {/* Auto-start toggles */}
          <ToggleRow
            label="Auto-start breaks"
            checked={settings.autoStartBreak}
            onChange={(v) => updateSettings({ autoStartBreak: v })}
          />
          <ToggleRow
            label="Auto-start work"
            checked={settings.autoStartWork}
            onChange={(v) => updateSettings({ autoStartWork: v })}
          />

          <hr className="border-white/10" />

          {/* Sound selector */}
          <div>
            <span className="mb-1.5 block text-white/70">Ambient sound</span>
            <div className="flex gap-2 flex-wrap">
              {SOUND_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateSettings({ soundType: opt.value })}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    settings.soundType === opt.value
                      ? 'bg-white/20 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Volume */}
          {settings.soundType !== 'none' && (
            <SliderRow
              label="Volume"
              value={Math.round(settings.soundVolume * 100)}
              min={0}
              max={100}
              unit="%"
              onChange={(v) => updateSettings({ soundVolume: v / 100 })}
            />
          )}

          {/* Sound during breaks */}
          {settings.soundType !== 'none' && (
            <ToggleRow
              label="Sound during breaks"
              checked={settings.soundDuringBreaks}
              onChange={(v) => updateSettings({ soundDuringBreaks: v })}
            />
          )}

          {/* Tick sound */}
          <ToggleRow
            label="Tick sound"
            checked={settings.tickEnabled}
            onChange={(v) => updateSettings({ tickEnabled: v })}
          />
        </div>
      </div>
    </>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-white/70">{label}</span>
        <span className="text-white font-medium">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-white/80"
        aria-label={label}
      />
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/70">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition-colors ${
          checked ? 'bg-white/40' : 'bg-white/10'
        }`}
        aria-label={label}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}
