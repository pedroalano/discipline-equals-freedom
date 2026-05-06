import type { Metadata } from 'next';
import { Providers } from '@/lib/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'ZenFocus',
  description: 'Your daily focus dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var f=JSON.parse(localStorage.getItem('zenfocus-font')||'{}');var m={cormorant:"'Cormorant Garamond', Georgia, serif",inter:"'Inter', system-ui, sans-serif",roboto:"'Roboto', system-ui, sans-serif",playfair:"'Playfair Display', Georgia, serif",montserrat:"'Montserrat', system-ui, sans-serif",fraunces:"'Fraunces', Georgia, serif","dm-serif":"'DM Serif Display', Georgia, serif",outfit:"'Outfit', system-ui, sans-serif",bebas:"'Bebas Neue', Impact, sans-serif"};var k=f.state&&f.state.font;if(k&&m[k]){document.documentElement.style.setProperty('--font-display',m[k])}}catch(e){}})()`,
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
