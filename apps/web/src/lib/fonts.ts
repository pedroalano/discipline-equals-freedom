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

export const FONT_COOKIE = 'zenfocus-font-pref';
export const DEFAULT_FONT: FontOption = 'cormorant';

export function isFontOption(value: unknown): value is FontOption {
  return typeof value === 'string' && value in FONT_MAP;
}
