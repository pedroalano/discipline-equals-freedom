import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { ProfileResponse } from '@zenfocus/types';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ProfileClient } from './ProfileClient';

const API_URL = process.env['API_INTERNAL_URL'] ?? 'http://localhost:3001';

async function getProfile(): Promise<ProfileResponse | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';
  const res = await fetch(`${API_URL}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json() as Promise<ProfileResponse>;
}

export default async function ProfilePage() {
  const profile = await getProfile();
  if (!profile) redirect('/login');

  return (
    <main className="min-h-screen flex flex-col bg-background">
      <header className="px-6 py-4 border-b border-border bg-background flex items-center gap-3">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground text-sm shrink-0"
          aria-label="Back to dashboard"
        >
          ← Dashboard
        </Link>
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-xl font-bold text-foreground flex-1">Profile</h1>
        <ThemeToggle />
      </header>
      <div className="flex-1 p-8 max-w-2xl mx-auto w-full">
        <ProfileClient initialProfile={profile} />
      </div>
    </main>
  );
}
