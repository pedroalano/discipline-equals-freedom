'use client';

import { useEffect } from 'react';
import { useFontStore } from '@/store/font';
import { FONT_COOKIE, FONT_MAP } from '@/lib/fonts';

const ONE_YEAR = 60 * 60 * 24 * 365;

export function useFontSync() {
  const font = useFontStore((s) => s.font);

  useEffect(() => {
    document.documentElement.style.setProperty('--font-display', FONT_MAP[font]);
    document.cookie = `${FONT_COOKIE}=${font}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
  }, [font]);
}
