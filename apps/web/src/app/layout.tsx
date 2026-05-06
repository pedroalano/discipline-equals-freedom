import type { Metadata } from 'next';
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={fontVariables}>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var f=JSON.parse(localStorage.getItem('zenfocus-font')||'{}');var m={cormorant:"var(--font-cormorant), Georgia, serif",inter:"var(--font-inter), system-ui, sans-serif",roboto:"var(--font-roboto), system-ui, sans-serif",playfair:"var(--font-playfair), Georgia, serif",montserrat:"var(--font-montserrat), system-ui, sans-serif",fraunces:"var(--font-fraunces), Georgia, serif","dm-serif":"var(--font-dm-serif), Georgia, serif",outfit:"var(--font-outfit), system-ui, sans-serif",bebas:"var(--font-bebas), Impact, sans-serif"};var k=f.state&&f.state.font;if(k&&m[k]){document.documentElement.style.setProperty('--font-display',m[k])}}catch(e){}})()`,
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
