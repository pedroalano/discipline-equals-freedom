import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_FONT, FONT_COOKIE, FONT_MAP, isFontOption, type FontOption } from '@/lib/fonts';

export { FONT_MAP, FONT_LABELS, type FontOption } from '@/lib/fonts';

interface FontState {
  font: FontOption;
  setFont: (font: FontOption) => void;
}

function writeFontCookie(font: FontOption) {
  if (typeof document === 'undefined') return;
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${FONT_COOKIE}=${font}; path=/; max-age=${oneYear}; samesite=lax`;
}

export const useFontStore = create<FontState>()(
  persist(
    (set) => ({
      font: DEFAULT_FONT,
      setFont: (font) => {
        document.documentElement.style.setProperty('--font-display', FONT_MAP[font]);
        writeFontCookie(font);
        set({ font });
      },
    }),
    {
      name: 'zenfocus-font',
      partialize: (state) => ({ font: state.font }),
      migrate: (persisted) => {
        const state = persisted as { font?: string } | undefined;
        if (state && isFontOption(state.font)) {
          return { font: state.font };
        }
        return { font: DEFAULT_FONT };
      },
      version: 1,
      onRehydrateStorage: () => (state) => {
        if (state) writeFontCookie(state.font);
      },
    },
  ),
);
