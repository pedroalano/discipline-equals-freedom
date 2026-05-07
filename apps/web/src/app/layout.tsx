import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import {
  Bebas_Neue,
  Cormorant_Garamond,
  DM_Serif_Display,
  Fraunces,
  Inter,
  Montserrat,
  Outfit,
  Playfair_Display,
  Roboto,
} from 'next/font/google';
import { Providers } from '@/lib/providers';
import { DEFAULT_FONT, FONT_COOKIE, FONT_MAP, isFontOption } from '@/lib/fonts';
import './globals.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-cormorant',
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700', '900'],
  display: 'swap',
  variable: '--font-roboto',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-montserrat',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fraunces',
});

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-dm-serif',
});

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
});

const bebas = Bebas_Neue({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-bebas',
});

const fontVariables = [
  cormorant.variable,
  inter.variable,
  roboto.variable,
  playfair.variable,
  montserrat.variable,
  fraunces.variable,
  dmSerif.variable,
  outfit.variable,
  bebas.variable,
].join(' ');

export const metadata: Metadata = {
  title: 'ZenFocus',
  description: 'Your daily focus dashboard',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const fontPref = cookieStore.get(FONT_COOKIE)?.value;
  const fontKey = isFontOption(fontPref) ? fontPref : DEFAULT_FONT;
  const fontDisplay = FONT_MAP[fontKey];

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={fontVariables}
      style={{ '--font-display': fontDisplay } as React.CSSProperties}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
