import type { Metadata } from 'next';
import { Cormorant_Garamond } from 'next/font/google';
import { Providers } from '@/lib/providers';
import './globals.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  variable: '--font-cormorant',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  title: 'ZenFocus',
  description: 'Your daily focus dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cormorant.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
