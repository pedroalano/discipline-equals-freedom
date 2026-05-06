import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FontOption =
  | 'cormorant'
  | 'inter'
  | 'roboto'
  | 'playfair'
  | 'montserrat'
  | 'fraunces'
  | 'dm-serif'
  | 'outfit'
  | 'bebas';

export const FONT_MAP: Record<FontOption, string> = {
  cormorant: "'Cormorant Garamond', Georgia, serif",
  inter: "'Inter', system-ui, sans-serif",
  roboto: "'Roboto', system-ui, sans-serif",
  playfair: "'Playfair Display', Georgia, serif",
  montserrat: "'Montserrat', system-ui, sans-serif",
  fraunces: "'Fraunces', Georgia, serif",
  'dm-serif': "'DM Serif Display', Georgia, serif",
  outfit: "'Outfit', system-ui, sans-serif",
  bebas: "'Bebas Neue', Impact, sans-serif",
};

export const FONT_LABELS: Record<FontOption, string> = {
  cormorant: 'Cormorant',
  inter: 'Inter',
  roboto: 'Roboto',
  playfair: 'Playfair Display',
  montserrat: 'Montserrat',
  fraunces: 'Fraunces',
  'dm-serif': 'DM Serif Display',
  outfit: 'Outfit',
  bebas: 'Bebas Neue',
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
      migrate: (persisted) => {
        const state = persisted as { font?: string } | undefined;
        if (state && state.font && !(state.font in FONT_MAP)) {
          return { font: 'cormorant' as FontOption };
        }
        return state as { font: FontOption };
      },
      version: 1,
    },
  ),
);
