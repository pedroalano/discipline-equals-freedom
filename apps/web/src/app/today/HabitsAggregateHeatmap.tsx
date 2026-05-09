'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { HabitsAggregateCompletionResponse } from '@zenfocus/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const WINDOW_DAYS = 365;
const WEEKS = 53;
const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

async function fetchAggregate(): Promise<HabitsAggregateCompletionResponse> {
  const res = await fetch(`/api/habits/completion?days=${WINDOW_DAYS}`);
  if (!res.ok) throw new Error('Failed to fetch habits aggregate');
  return res.json() as Promise<HabitsAggregateCompletionResponse>;
}

interface Cell {
  date: string;
  count: number;
}

function bucketClass(count: number): string {
  if (count <= 0) return 'bg-muted';
  if (count === 1) return 'bg-primary/30';
  if (count === 2) return 'bg-primary/55';
  if (count === 3) return 'bg-primary/75';
  return 'bg-primary';
}

export function HabitsAggregateHeatmap() {
  const { data, isLoading } = useQuery({
    queryKey: ['habits-aggregate-completion'],
    queryFn: fetchAggregate,
    staleTime: 60_000,
  });

  const { columns, monthLabels } = useMemo(() => buildGrid(data?.days), [data]);

  return (
    <TooltipProvider delayDuration={120}>
      <div className="space-y-2 rounded-lg border border-border/40 bg-muted/10 p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-foreground">Last 365 days</p>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
            <span>Less</span>
            <span className="h-[10px] w-[10px] rounded-[2px] bg-muted" />
            <span className="h-[10px] w-[10px] rounded-[2px] bg-primary/30" />
            <span className="h-[10px] w-[10px] rounded-[2px] bg-primary/55" />
            <span className="h-[10px] w-[10px] rounded-[2px] bg-primary/75" />
            <span className="h-[10px] w-[10px] rounded-[2px] bg-primary" />
            <span>More</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="inline-flex flex-col gap-1">
            <div className="grid grid-flow-col auto-cols-[12px] gap-[2px] pl-6 text-[10px] text-muted-foreground/70">
              {monthLabels.map((label, i) => (
                <span key={i} className="leading-none">
                  {label}
                </span>
              ))}
            </div>
            <div className="flex gap-[2px]">
              <div className="flex flex-col gap-[2px] pr-1 text-[10px] text-muted-foreground/70 leading-none">
                <span className="h-[12px]" />
                <span className="h-[12px]">M</span>
                <span className="h-[12px]" />
                <span className="h-[12px]">W</span>
                <span className="h-[12px]" />
                <span className="h-[12px]">F</span>
                <span className="h-[12px]" />
              </div>
              <div className="grid grid-flow-col auto-cols-[12px] grid-rows-7 gap-[2px]">
                {columns.flat().map((cell, i) =>
                  cell ? (
                    <Tooltip key={`${cell.date}-${i}`}>
                      <TooltipTrigger asChild>
                        <div
                          className={`h-[10px] w-[10px] rounded-[2px] ${
                            isLoading ? 'bg-muted animate-pulse' : bucketClass(cell.count)
                          }`}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {cell.date} —{' '}
                        {cell.count === 0
                          ? 'No habits'
                          : `${cell.count} habit${cell.count === 1 ? '' : 's'}`}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <div key={`pad-${i}`} className="h-[10px] w-[10px]" />
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

function buildGrid(days: { date: string; count: number }[] | undefined): {
  columns: (Cell | null)[][];
  monthLabels: string[];
} {
  const placeholder: Cell[] = Array.from({ length: WINDOW_DAYS }, (_, i) => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - (WINDOW_DAYS - 1 - i));
    return { date: d.toISOString().substring(0, 10), count: 0 };
  });
  const source: Cell[] = days ?? placeholder;

  const firstDate = new Date(source[0]!.date + 'T00:00:00.000Z');
  const leadingPad = firstDate.getUTCDay();

  const columns: (Cell | null)[][] = Array.from({ length: WEEKS }, () =>
    Array<Cell | null>(7).fill(null),
  );

  let col = 0;
  let row = leadingPad;

  for (const day of source) {
    if (col >= WEEKS) break;
    columns[col]![row] = day;
    row++;
    if (row > 6) {
      row = 0;
      col++;
    }
  }

  const monthLabels: string[] = Array(WEEKS).fill('');
  let prevMonth = -1;
  for (let c = 0; c < WEEKS; c++) {
    const firstCell = columns[c]?.find((cell): cell is Cell => cell !== null);
    if (!firstCell) continue;
    const month = new Date(firstCell.date + 'T00:00:00.000Z').getUTCMonth();
    if (month !== prevMonth) {
      monthLabels[c] = MONTH_LABELS[month] ?? '';
      prevMonth = month;
    }
  }

  return { columns, monthLabels };
}
