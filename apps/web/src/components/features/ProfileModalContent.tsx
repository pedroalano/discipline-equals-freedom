'use client';

import { useQuery } from '@tanstack/react-query';
import type { ProfileResponse } from '@zenfocus/types';
import { ModalShell } from '@/components/ModalShell';
import { ProfileClient } from '@/app/profile/ProfileClient';
import { useFeaturesStore } from '@/store/features';

export function ProfileModalContent() {
  const closeFeature = useFeaturesStore((s) => s.closeFeature);
  const { data, isLoading, isError } = useQuery<ProfileResponse>({
    queryKey: ['profile', 'modal'],
    queryFn: () => fetch('/api/users/me').then((r) => r.json() as Promise<ProfileResponse>),
  });

  return (
    <ModalShell title="Profile" onClose={closeFeature}>
      <div className="p-8 max-w-2xl mx-auto w-full">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {isError && <p className="text-sm text-destructive">Failed to load profile.</p>}
        {data && <ProfileClient initialProfile={data} />}
      </div>
    </ModalShell>
  );
}
