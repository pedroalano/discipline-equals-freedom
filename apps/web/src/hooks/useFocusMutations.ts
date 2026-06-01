'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { FocusItemListResponse, FocusItemResponse } from '@zenfocus/types';

async function patchItem(id: string, body: Partial<FocusItemResponse>): Promise<FocusItemResponse> {
  const res = await fetch(`/api/focus/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to update');
  return res.json() as Promise<FocusItemResponse>;
}

export function useFocusMutations(date: string) {
  const queryClient = useQueryClient();

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
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({
      id,
      completed,
    }: {
      id: string;
      completed: boolean;
      habitId: string | null;
    }) => patchItem(id, { completed }),
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: ['focus', date] });
      const prev = queryClient.getQueryData<FocusItemListResponse>(['focus', date]);
      if (prev) {
        const nextItems = prev.items.map((i) => (i.id === id ? { ...i, completed } : i));
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
    mutationFn: ({ id, position }: { id: string; position: number }) =>
      patchItem(id, { position }),
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

  return { addMutation, toggleMutation, deleteMutation, reorderMutation };
}
