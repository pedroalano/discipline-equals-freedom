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
  cormorant: 'var(--font-cormorant), Georgia, serif',
  inter: 'var(--font-inter), system-ui, sans-serif',
  roboto: 'var(--font-roboto), system-ui, sans-serif',
  playfair: 'var(--font-playfair), Georgia, serif',
  montserrat: 'var(--font-montserrat), system-ui, sans-serif',
  fraunces: 'var(--font-fraunces), Georgia, serif',
  'dm-serif': 'var(--font-dm-serif), Georgia, serif',
  outfit: 'var(--font-outfit), system-ui, sans-serif',
  bebas: 'var(--font-bebas), Impact, sans-serif',
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
