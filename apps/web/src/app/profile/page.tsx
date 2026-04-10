import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ProfileResponse } from '@zenfocus/types';
import { PageShell } from '@/components/PageShell';
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
    <PageShell backHref="/" backLabel="Dashboard" title="Profile">
      <div className="p-8 max-w-2xl mx-auto w-full">
        <ProfileClient initialProfile={profile} />
      </div>
    </PageShell>
  );
}
