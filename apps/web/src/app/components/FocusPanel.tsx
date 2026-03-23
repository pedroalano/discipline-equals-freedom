'use client';

import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { FocusItemResponse } from '@zenfocus/types';

function todayISO(): string {
  return new Date().toISOString().substring(0, 10);
}

async function fetchFocusItems(date: string): Promise<FocusItemResponse[]> {
  const res = await fetch(`/api/focus?date=${date}`);
  if (!res.ok) throw new Error('Failed to fetch focus items');
  return res.json() as Promise<FocusItemResponse[]>;
}

export function FocusPanel() {
  const date = todayISO();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');

  const { data: items = [] } = useQuery({
    queryKey: ['focus', date],
    queryFn: () => fetchFocusItems(date),
  });

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

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (text.trim()) createMutation.mutate(text.trim());
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (text.trim()) createMutation.mutate(text.trim());
    }
  }

  return (
    <div className="w-full max-w-md space-y-3">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-2">
          <textarea
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

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/20 px-4 py-3 backdrop-blur"
            >
              <button
                onClick={() => toggleMutation.mutate({ id: item.id, completed: !item.completed })}
                className="mt-0.5 h-5 w-5 shrink-0 rounded border border-white/40 transition hover:border-white/70"
                aria-label={item.completed ? 'Mark incomplete' : 'Mark complete'}
              >
                {item.completed && (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="text-white">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
              <span
                className={`flex-1 text-sm leading-relaxed text-white ${item.completed ? 'line-through opacity-50' : ''}`}
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
