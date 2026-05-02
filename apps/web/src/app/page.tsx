import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import type { DailyImageResponse } from '@zenfocus/types';
import { ClockGreeting } from './components/ClockGreeting';
import { FocusPanel } from './components/FocusPanel';
import { ImageFader } from './components/ImageFader';
import { PomodoroIsland } from './components/PomodoroIsland';
import { AppearanceIsland } from './components/AppearanceIsland';
import { FeatureOverlay } from '@/components/FeatureOverlay';
import { NavLinks } from './components/NavLinks';
import { PhotoAttribution } from './components/PhotoAttribution';

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

async function getNameFromToken(): Promise<string | undefined> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token')?.value;
    if (!token) return undefined;
    const payload = decodeJwt(token);
    return typeof payload['name'] === 'string' ? payload['name'] : undefined;
  } catch {
    return undefined;
  }
}

export default async function DashboardPage() {
  const [photo, userName] = await Promise.all([getDailyImage(), getNameFromToken()]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-10 bg-neutral-900 px-4">
      {/* Background crossfade — fades in once the photo loads client-side */}
      {photo && <ImageFader url={photo.url} />}

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Grain texture */}
      <div className="absolute inset-0 bg-grain" />

      <div className="relative z-10 flex flex-col items-center gap-10">
        <ClockGreeting name={userName} />
        <FocusPanel />
      </div>

      <NavLinks />

      <PomodoroIsland />
      <AppearanceIsland />
      <FeatureOverlay />

      {photo && <PhotoAttribution author={photo.author} authorUrl={photo.authorUrl} />}
    </main>
  );
}
