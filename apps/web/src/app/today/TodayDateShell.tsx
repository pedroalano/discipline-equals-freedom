'use client';

import { localDateISO } from '@/lib/date';
import { DailyList } from './DailyList';

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year!, month! - 1, day!);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function TodayDateShell() {
  const date = localDateISO();
  return (
    <>
      <p className="text-white/50 mb-8 text-sm">{formatDate(date)}</p>
      <DailyList date={date} />
    </>
  );
}
