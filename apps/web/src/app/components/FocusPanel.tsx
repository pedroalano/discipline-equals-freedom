'use client';

import { useState, useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { FocusItemListResponse, FocusItemResponse } from '@zenfocus/types';

function todayISO(): string {
  return new Date().toISOString().substring(0, 10);
}

async function fetchFocusItems(date: string): Promise<FocusItemResponse[]> {
  const res = await fetch(`/api/focus?date=${date}`);
  if (!res.ok) throw new Error('Failed to fetch focus items');
  const raw = (await res.json()) as unknown;
  if (Array.isArray(raw)) return raw as FocusItemResponse[];
  return ((raw as FocusItemListResponse).items ?? []) as FocusItemResponse[];
}

export function FocusPanel() {
  const date = todayISO();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const { data, isLoading } = useQuery({
    queryKey: ['focus', date],
    queryFn: () => fetchFocusItems(date),
  });
  const items: FocusItemResponse[] = Array.isArray(data)
    ? data
    : ((data as FocusItemListResponse | undefined)?.items ?? []);

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
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const res = await fetch(`/api/focus/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });
      if (!res.ok) throw new Error('Failed to update item');
      return res.json() as Promise<FocusItemResponse>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['focus', date] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/focus/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete item');
    },
    onSuccess: () => {
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
        if (first) toggleMutation.mutate({ id: first.id, completed: true });
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

  return (
    <div className="w-full max-w-md space-y-3">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What's your focus today?"
            rows={1}
            className="flex-1 resize-none rounded-lg border border-white/20 bg-black/30 px-4 py-3 text-white placeholder-white/40 backdrop-blur outline-none focus:border-white/50"
          />
          <button
            type="submit"
            disabled={!text.trim() || createMutation.isPending}
            className="rounded-lg bg-white/20 px-4 py-3 text-white backdrop-blur transition hover:bg-white/30 disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </form>

      <ul className="space-y-2">
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
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
                onClick={() => toggleMutation.mutate({ id: item.id, completed: !item.completed })}
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
                className={`flex-1 text-base leading-relaxed text-white ${item.completed ? 'line-through opacity-50' : ''}`}
              >
                {item.text}
              </span>
              <button
                onClick={() => deleteMutation.mutate(item.id)}
                className="shrink-0 text-white/30 transition hover:text-white/70"
                aria-label="Delete item"
              >
                ×
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {items.length === 0 && !isLoading && (
        <p className="select-none py-6 text-center text-base text-white/30">
          What matters most today?
        </p>
      )}
    </div>
  );
}
