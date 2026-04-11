'use client';

import { useState, useRef, type KeyboardEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import type { FocusItemListResponse, FocusItemResponse } from '@zenfocus/types';
import { HabitBadge } from './HabitBadge';
import { HabitsModal } from './HabitsModal';

interface Props {
  date: string;
  initialData?: FocusItemListResponse;
}

async function fetchItems(date: string): Promise<FocusItemListResponse> {
  const res = await fetch(`/api/focus?date=${encodeURIComponent(date)}`);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json() as Promise<FocusItemListResponse>;
}

async function patchItem(id: string, body: Partial<FocusItemResponse>): Promise<FocusItemResponse> {
  const res = await fetch(`/api/focus/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to update');
  return res.json() as Promise<FocusItemResponse>;
}

function computeMoveUpPosition(items: FocusItemResponse[], idx: number): number {
  const prev = items[idx - 1]!;
  const prevPrev = items[idx - 2];
  return prevPrev ? (prevPrev.position + prev.position) / 2 : prev.position - 1;
}

function computeMoveDownPosition(items: FocusItemResponse[], idx: number): number {
  const next = items[idx + 1]!;
  const nextNext = items[idx + 2];
  return nextNext ? (next.position + nextNext.position) / 2 : next.position + 1;
}

const EMPTY: FocusItemListResponse = { items: [], total: 0, completed: 0 };

export function DailyList({ date, initialData }: Props) {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [habitsOpen, setHabitsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data = EMPTY } = useQuery({
    queryKey: ['focus', date],
    queryFn: () => fetchItems(date),
    initialData,
  });

  const { items = [], total = 0, completed = 0 } = data ?? {};
  const habitItems = items.filter((i) => i.habitId !== null);
  const taskItems = items.filter((i) => i.habitId === null);
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const addMutation = useMutation({
    mutationFn: async (itemText: string) => {
      const res = await fetch('/api/focus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: itemText, date }),
      });
      if (!res.ok) throw new Error('Failed to create');
      return res.json() as Promise<FocusItemResponse>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['focus', date] });
      setText('');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({
      id,
      completed: c,
    }: {
      id: string;
      completed: boolean;
      habitId: string | null;
    }) => patchItem(id, { completed: c }),
    onMutate: async ({ id, completed: c }) => {
      await queryClient.cancelQueries({ queryKey: ['focus', date] });
      const prev = queryClient.getQueryData<FocusItemListResponse>(['focus', date]);
      if (prev) {
        const nextItems = prev.items.map((i) => (i.id === id ? { ...i, completed: c } : i));
        queryClient.setQueryData<FocusItemListResponse>(['focus', date], {
          items: nextItems,
          total: prev.total,
          completed: nextItems.filter((i) => i.completed).length,
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['focus', date], ctx.prev);
    },
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['focus', date] });
      if (variables?.completed) {
        void queryClient.invalidateQueries({ queryKey: ['board', 'modal'] });
        if (variables.habitId) {
          void queryClient.invalidateQueries({ queryKey: ['habit-streak', variables.habitId] });
        }
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/focus/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete');
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['focus', date] });
      const prev = queryClient.getQueryData<FocusItemListResponse>(['focus', date]);
      if (prev) {
        const nextItems = prev.items.filter((i) => i.id !== id);
        queryClient.setQueryData<FocusItemListResponse>(['focus', date], {
          items: nextItems,
          total: nextItems.length,
          completed: nextItems.filter((i) => i.completed).length,
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['focus', date], ctx.prev);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['focus', date] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: ({ id, position }: { id: string; position: number }) => patchItem(id, { position }),
    onMutate: async ({ id, position }) => {
      await queryClient.cancelQueries({ queryKey: ['focus', date] });
      const prev = queryClient.getQueryData<FocusItemListResponse>(['focus', date]);
      if (prev) {
        const nextItems = prev.items
          .map((i) => (i.id === id ? { ...i, position } : i))
          .sort((a, b) => a.position - b.position);
        queryClient.setQueryData<FocusItemListResponse>(['focus', date], {
          ...prev,
          items: nextItems,
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['focus', date], ctx.prev);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['focus', date] });
    },
  });

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && text.trim()) {
      addMutation.mutate(text.trim());
    }
  }

  function moveUp(list: FocusItemResponse[], idx: number) {
    if (idx === 0) return;
    const newPos = computeMoveUpPosition(list, idx);
    reorderMutation.mutate({ id: list[idx]!.id, position: newPos });
  }

  function moveDown(list: FocusItemResponse[], idx: number) {
    if (idx === list.length - 1) return;
    const newPos = computeMoveDownPosition(list, idx);
    reorderMutation.mutate({ id: list[idx]!.id, position: newPos });
  }

  function renderItem(item: FocusItemResponse, idx: number, list: FocusItemResponse[]) {
    return (
      <li
        key={item.id}
        className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3"
      >
        {/* Reorder buttons */}
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => moveUp(list, idx)}
            disabled={idx === 0}
            className="text-muted-foreground/40 hover:text-foreground disabled:invisible leading-none text-xs transition"
            aria-label="Move up"
          >
            ▲
          </button>
          <button
            onClick={() => moveDown(list, idx)}
            disabled={idx === list.length - 1}
            className="text-muted-foreground/40 hover:text-foreground disabled:invisible leading-none text-xs transition"
            aria-label="Move down"
          >
            ▼
          </button>
        </div>

        {/* Checkbox */}
        <button
          onClick={() =>
            toggleMutation.mutate({
              id: item.id,
              completed: !item.completed,
              habitId: item.habitId,
            })
          }
          className="h-5 w-5 shrink-0 rounded border border-border flex items-center justify-center transition hover:border-foreground/60"
          aria-label={item.completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {item.completed && (
            <svg viewBox="0 0 20 20" fill="none" className="w-3 h-3 text-foreground">
              <path
                d="M4 10 L8 14 L16 6"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

        {/* Text */}
        <span
          className={`flex-1 text-sm font-medium leading-relaxed ${item.completed ? 'line-through text-muted-foreground/60' : 'text-foreground'}`}
        >
          {item.text}
        </span>

        {/* Habit streak badge */}
        {item.habitId && <HabitBadge habitId={item.habitId} />}

        {/* Delete */}
        <button
          onClick={() => deleteMutation.mutate(item.id)}
          className="shrink-0 text-muted-foreground/40 hover:text-foreground transition text-lg leading-none"
          aria-label="Delete task"
        >
          ×
        </button>
      </li>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>
            {completed} / {total} completed
          </span>
          <span>{progress}%</span>
        </div>
        <progress
          value={completed}
          max={total || 1}
          className="w-full h-1.5 rounded-full overflow-hidden [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-foreground/60 [&::-moz-progress-bar]:bg-foreground/60"
        />
      </div>

      {/* Habits section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold tracking-widest text-foreground uppercase">
            Habits
          </h3>
          <button
            onClick={() => setHabitsOpen(true)}
            className="text-foreground hover:opacity-70 transition"
            aria-label="Manage habits"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
            </svg>
          </button>
        </div>

        {habitItems.length > 0 ? (
          <ul className="space-y-2">
            {habitItems.map((item, idx) => renderItem(item, idx, habitItems))}
          </ul>
        ) : (
          <p className="py-3 text-center text-xs text-foreground">
            No habits for today.{' '}
            <button
              onClick={() => setHabitsOpen(true)}
              className="underline hover:opacity-70 transition"
            >
              Add one
            </button>
          </p>
        )}
      </div>

      {/* Tasks section */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold tracking-widest text-foreground uppercase">
          Today&apos;s Tasks
        </h3>

        {/* Add input */}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a task..."
            className="flex-1 rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring transition"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (text.trim()) addMutation.mutate(text.trim());
            }}
            disabled={!text.trim() || addMutation.isPending}
            className="px-4 py-3 h-auto"
          >
            Add
          </Button>
        </div>

        {taskItems.length > 0 ? (
          <ul className="space-y-2">
            {taskItems.map((item, idx) => renderItem(item, idx, taskItems))}
          </ul>
        ) : (
          <p className="py-3 text-center text-sm text-muted-foreground/60">
            No tasks yet. Add one above.
          </p>
        )}
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-muted-foreground/50 pt-4">
        Unfinished tasks will move to tomorrow
      </p>

      <HabitsModal open={habitsOpen} onOpenChange={setHabitsOpen} />
    </div>
  );
}
