'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ProfileResponse } from '@zenfocus/types';
import { UpdateNameForm } from './UpdateNameForm';
import { UpdatePasswordForm } from './UpdatePasswordForm';
import { AccountStatsCard } from './AccountStatsCard';
import { DangerZoneSection } from './DangerZoneSection';
import { Separator } from '@/components/ui/separator';

interface Props {
  initialProfile: ProfileResponse;
}

export function ProfileClient({ initialProfile }: Props) {
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<ProfileResponse>(initialProfile);

  return (
    <div className="space-y-8">
      {/* Account info */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Account</h2>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Email</p>
            <p className="text-sm text-foreground">{profile.email}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Member since
            </p>
            <p className="text-sm text-foreground">
              {new Date(profile.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
      </section>

      <Separator />

      {/* Stats */}
      <AccountStatsCard stats={profile.stats} />

      <Separator />

      {/* Update name */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Display Name</h2>
        <UpdateNameForm
          currentName={profile.name}
          onSuccess={(updated) => {
            setProfile(updated);
            queryClient.setQueryData<ProfileResponse>(['profile', 'modal'], updated);
          }}
        />
      </section>

      <Separator />

      {/* Change password */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Change Password</h2>
        <UpdatePasswordForm />
      </section>

      <Separator />

      {/* Danger zone */}
      <DangerZoneSection email={profile.email} />
    </div>
  );
}
