import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_FONT, isFontOption, type FontOption } from '@/lib/fonts';

export { FONT_MAP, FONT_LABELS, type FontOption } from '@/lib/fonts';

interface FontState {
  font: FontOption;
  setFont: (font: FontOption) => void;
}

export const useFontStore = create<FontState>()(
  persist(
    (set) => ({
      font: DEFAULT_FONT,
      setFont: (font) => set({ font }),
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
    },
  ),
);
