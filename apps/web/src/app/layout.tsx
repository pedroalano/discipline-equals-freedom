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
            __html: `(function(){try{var f=JSON.parse(localStorage.getItem('zenfocus-font')||'{}');var m={cormorant:"'Cormorant Garamond', Georgia, serif",lora:"'Lora', Georgia, serif",inter:"'Inter', system-ui, sans-serif",spectral:"'Spectral', Georgia, serif"};if(f.state&&f.state.font&&m[f.state.font]){document.documentElement.style.setProperty('--font-display',m[f.state.font])}}catch(e){}})()`,
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
