'use client';

import { useState, useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { FocusItemListResponse, FocusItemResponse } from '@zenfocus/types';
import { localDateISO } from '@/lib/date';
import { usePomodoroStore } from '../../store/pomodoro';
import { HabitBadge } from '../today/HabitBadge';
import { HabitsModal } from '../today/HabitsModal';

async function fetchFocusItems(date: string): Promise<FocusItemListResponse> {
  const res = await fetch(`/api/focus?date=${date}`);
  if (!res.ok) throw new Error('Failed to fetch focus items');
  const raw = (await res.json()) as unknown;
  if (Array.isArray(raw)) {
    const arr = raw as FocusItemResponse[];
    return { items: arr, total: arr.length, completed: arr.filter((i) => i.completed).length };
  }
  return raw as FocusItemListResponse;
}

export function FocusPanel() {
  const isPomodoro = usePomodoroStore((s) => s.status !== 'idle');
  const date = localDateISO();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [habitsOpen, setHabitsOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const { data, isLoading } = useQuery({
    queryKey: ['focus', date],
    queryFn: () => fetchFocusItems(date),
  });
  const items: FocusItemResponse[] = data?.items ?? [];
  const habitItems = items.filter((i) => i.habitId !== null && !i.completed);
  const taskItems = items.filter((i) => i.habitId === null && !i.completed);

  const createMutation = useMutation({
    mutationFn: async (itemText: string) => {
      const res = await fetch('/api/focus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: itemText, date }),
      });
      if (!res.ok) throw new Error('Failed to create item');
      return res.json() as Promise<FocusItemResponse>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['focus', date] });
      setText('');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({
      id,
      completed,
    }: {
      id: string;
      completed: boolean;
      habitId: string | null;
    }) => {
      const res = await fetch(`/api/focus/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });
      if (!res.ok) throw new Error('Failed to update item');
      return res.json() as Promise<FocusItemResponse>;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['focus', date] });
      if (variables.completed) {
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
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete item');
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

  useEffect(() => {
    function onKeyDown(e: globalThis.KeyboardEvent) {
      const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.key === 'n') {
        e.preventDefault();
        textareaRef.current?.focus();
      } else if (e.key === 'c') {
        const first = items.find((item) => !item.completed);
        if (first) toggleMutation.mutate({ id: first.id, completed: true, habitId: first.habitId });
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [items, toggleMutation]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (text.trim()) createMutation.mutate(text.trim());
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (text.trim()) createMutation.mutate(text.trim());
    }
    if (e.key === 'Escape') {
      textareaRef.current?.blur();
    }
  }

  function renderItem(item: FocusItemResponse) {
    return (
      <motion.li
        key={item.id}
        layout
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: shouldReduceMotion ? 0 : -20 }}
        transition={{ duration: 0.2 }}
        className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/20 px-4 py-3 backdrop-blur"
      >
        <button
          onClick={() =>
            toggleMutation.mutate({
              id: item.id,
              completed: !item.completed,
              habitId: item.habitId,
            })
          }
          className="mt-0.5 h-5 w-5 shrink-0 rounded border border-white/40 transition hover:border-white/70"
          aria-label={item.completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {item.completed && (
            <svg viewBox="0 0 20 20" fill="none" className="text-white">
              <motion.path
                d="M4 10 L8 14 L16 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
              />
            </svg>
          )}
        </button>
        <span
          className={`flex-1 text-base font-medium leading-relaxed text-white ${item.completed ? 'line-through opacity-50' : ''}`}
        >
          {item.text}
        </span>
        {item.habitId && <HabitBadge habitId={item.habitId} />}
        <button
          onClick={() => deleteMutation.mutate(item.id)}
          className="shrink-0 text-white/30 transition hover:text-white/70"
          aria-label="Delete item"
        >
          ×
        </button>
      </motion.li>
    );
  }

  return (
    <div
      className={`w-full max-w-md space-y-3 transition-opacity duration-500 ${isPomodoro ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      <label
        htmlFor="focus-input"
        className="block text-center text-2xl font-display font-bold tracking-wide text-white"
      >
        What&apos;s your focus today?
      </label>
      <form onSubmit={handleSubmit}>
        <div className="flex gap-2">
          <textarea
            id="focus-input"
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            className="flex-1 resize-none border-b border-white bg-transparent px-4 py-3 text-center text-white outline-none focus:border-white"
          />
          <button
            type="submit"
            disabled={!text.trim() || createMutation.isPending}
            className="hidden"
          >
            Add
          </button>
        </div>
      </form>

      {/* Habits */}
      {(habitItems.length > 0 || !isLoading) && (
        <div className="space-y-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold tracking-widest text-white uppercase">
              Habits
            </span>
            <button
              onClick={() => setHabitsOpen(true)}
              className="text-white hover:text-white/70 transition"
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
          <AnimatePresence mode="popLayout">
            {habitItems.map((item) => renderItem(item))}
          </AnimatePresence>
          {habitItems.length === 0 && (
            <p className="text-center text-xs text-white py-2">
              <button
                onClick={() => setHabitsOpen(true)}
                className="underline hover:text-white/70 transition"
              >
                Add habits
              </button>
            </p>
          )}
        </div>
      )}

      {/* Tasks */}
      {(taskItems.length > 0 || !isLoading) && (
        <div className="space-y-1">
          {(habitItems.length > 0 || taskItems.length > 0) && (
            <span className="block px-1 text-xs font-semibold tracking-widest text-white uppercase">
              Tasks
            </span>
          )}
          <AnimatePresence mode="popLayout">
            {taskItems.map((item) => renderItem(item))}
          </AnimatePresence>
        </div>
      )}

      {!isLoading && habitItems.length === 0 && taskItems.length === 0 && (
        <p className="select-none py-6 text-center text-base text-white/30">
          {items.length > 0 ? 'All done for today!' : 'What matters most today?'}
        </p>
      )}

      <HabitsModal open={habitsOpen} onOpenChange={setHabitsOpen} />
    </div>
  );
}
