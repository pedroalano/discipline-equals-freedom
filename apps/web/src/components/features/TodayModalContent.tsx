'use client';

import { ModalShell } from '@/components/ModalShell';
import { TodayDateShell } from '@/app/today/TodayDateShell';
import { useFeaturesStore } from '@/store/features';

export function TodayModalContent() {
  const closeFeature = useFeaturesStore((s) => s.closeFeature);

  return (
    <ModalShell title="Today" onClose={closeFeature}>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <TodayDateShell />
      </div>
    </ModalShell>
  );
}
