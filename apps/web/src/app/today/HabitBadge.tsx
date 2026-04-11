'use client';

import { useQuery } from '@tanstack/react-query';
import type { HabitStreakResponse } from '@zenfocus/types';

async function fetchStreak(habitId: string): Promise<HabitStreakResponse> {
  const res = await fetch(`/api/habits/${habitId}/streak`);
  if (!res.ok) throw new Error('Failed to fetch streak');
  return res.json() as Promise<HabitStreakResponse>;
}

interface Props {
  habitId: string;
}

export function HabitBadge({ habitId }: Props) {
  const { data } = useQuery({
    queryKey: ['habit-streak', habitId],
    queryFn: () => fetchStreak(habitId),
    staleTime: 5 * 60 * 1000,
  });

  const streak = data?.currentStreak ?? 0;

  return (
    <span className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground/70 select-none">
      <span className="text-xs">↻</span>
      {streak > 0 && <span className="font-medium text-amber-500">{streak}</span>}
    </span>
  );
}
