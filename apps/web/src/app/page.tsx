import type { DailyImageResponse } from '@zenfocus/types';
import { ClockGreeting } from './components/ClockGreeting';
import { FocusPanel } from './components/FocusPanel';

async function getDailyImage(): Promise<DailyImageResponse | null> {
  const apiUrl = process.env['API_INTERNAL_URL'];
  if (!apiUrl) return null;

  try {
    const res = await fetch(`${apiUrl}/daily-image`, { cache: 'no-store' });
    if (!res.ok || res.status === 204) return null;
    return (await res.json()) as DailyImageResponse;
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const photo = await getDailyImage();

  return (
    <main
      className="relative flex min-h-screen flex-col items-center justify-center gap-10 bg-neutral-900 bg-cover bg-center px-4"
      style={photo ? { backgroundImage: `url(${photo.url})` } : undefined}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 flex flex-col items-center gap-10">
        <ClockGreeting />
        <FocusPanel />
      </div>

      {photo && (
        <a
          href={photo.authorUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-3 right-4 z-10 text-xs text-white/40 hover:text-white/70"
        >
          Photo by {photo.author} on Unsplash
        </a>
      )}
    </main>
  );
}
