'use client';

import { useSyncExternalStore } from 'react';
import { localDateISO } from '@/lib/date';
import { DailyList } from './DailyList';

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year!, month! - 1, day!);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function TodayDateShell() {
  const date = useSyncExternalStore(
    () => () => {},
    () => localDateISO(),
    () => null,
  );

  if (!date) return null;

  return (
    <>
      <p className="text-muted-foreground mb-8 text-sm">{formatDate(date)}</p>
      <DailyList date={date} />
    </>
  );
}
