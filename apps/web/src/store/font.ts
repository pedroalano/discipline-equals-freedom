import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FontOption = 'cormorant' | 'lora' | 'inter' | 'spectral';

export const FONT_MAP: Record<FontOption, string> = {
  cormorant: "'Cormorant Garamond', Georgia, serif",
  lora: "'Lora', Georgia, serif",
  inter: "'Inter', system-ui, sans-serif",
  spectral: "'Spectral', Georgia, serif",
};

export const FONT_LABELS: Record<FontOption, string> = {
  cormorant: 'Cormorant',
  lora: 'Lora',
  inter: 'Inter',
  spectral: 'Spectral',
};

interface FontState {
  font: FontOption;
  setFont: (font: FontOption) => void;
}

export const useFontStore = create<FontState>()(
  persist(
    (set) => ({
      font: 'cormorant',
      setFont: (font) => {
        document.documentElement.style.setProperty('--font-display', FONT_MAP[font]);
        set({ font });
      },
    }),
    {
      name: 'zenfocus-font',
      partialize: (state) => ({ font: state.font }),
    },
  ),
);
