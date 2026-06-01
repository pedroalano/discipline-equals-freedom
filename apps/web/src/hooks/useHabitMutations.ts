'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { HabitFrequency, HabitResponse } from '@zenfocus/types';

interface HabitFormState {
  name: string;
  description: string;
  frequency: HabitFrequency;
  customDays: number[];
}

export function useHabitMutations() {
  const queryClient = useQueryClient();

  function invalidateHabits() {
    void queryClient.invalidateQueries({ queryKey: ['habits'] });
  }
  function invalidateHabitsAndFocus() {
    invalidateHabits();
    void queryClient.invalidateQueries({ queryKey: ['focus'] });
  }

  const createMutation = useMutation({
    mutationFn: async (body: HabitFormState) => {
      const res = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: body.name,
          ...(body.description.trim() && { description: body.description.trim() }),
          frequency: body.frequency,
          ...(body.frequency === 'CUSTOM' && { customDays: body.customDays }),
        }),
      });
      if (!res.ok) throw new Error('Failed to create habit');
      return res.json() as Promise<HabitResponse>;
    },
    onSuccess: invalidateHabitsAndFocus,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...body }: HabitFormState & { id: string }) => {
      const res = await fetch(`/api/habits/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: body.name,
          description: body.description.trim() || undefined,
          frequency: body.frequency,
          customDays: body.frequency === 'CUSTOM' ? body.customDays : undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to update habit');
      return res.json() as Promise<HabitResponse>;
    },
    onSuccess: invalidateHabitsAndFocus,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/habits/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error('Failed to update habit');
      return res.json() as Promise<HabitResponse>;
    },
    onSuccess: invalidateHabits,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/habits/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete habit');
    },
    onSuccess: invalidateHabitsAndFocus,
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ id, position }: { id: string; position: number }) => {
      const res = await fetch(`/api/habits/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position }),
      });
      if (!res.ok) throw new Error('Failed to reorder habit');
      return res.json() as Promise<HabitResponse>;
    },
    onSuccess: invalidateHabits,
  });

  return { createMutation, updateMutation, toggleActiveMutation, deleteMutation, reorderMutation };
}
