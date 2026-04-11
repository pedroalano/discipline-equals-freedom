'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import type { HabitFrequency, HabitListResponse, HabitResponse } from '@zenfocus/types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

async function fetchHabits(): Promise<HabitListResponse> {
  const res = await fetch('/api/habits');
  if (!res.ok) throw new Error('Failed to fetch habits');
  return res.json() as Promise<HabitListResponse>;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface HabitFormState {
  name: string;
  description: string;
  frequency: HabitFrequency;
  customDays: number[];
}

const EMPTY_FORM: HabitFormState = {
  name: '',
  description: '',
  frequency: 'DAILY',
  customDays: [],
};

export function HabitsModal({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<HabitFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ['habits'],
    queryFn: fetchHabits,
    enabled: open,
  });

  const habits = data?.habits ?? [];

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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['habits'] });
      void queryClient.invalidateQueries({ queryKey: ['focus'] });
      setForm(EMPTY_FORM);
    },
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['habits'] });
      void queryClient.invalidateQueries({ queryKey: ['focus'] });
      setEditingId(null);
      setForm(EMPTY_FORM);
    },
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['habits'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/habits/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete habit');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['habits'] });
      void queryClient.invalidateQueries({ queryKey: ['focus'] });
    },
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['habits'] });
    },
  });

  function startEdit(habit: HabitResponse) {
    setEditingId(habit.id);
    setForm({
      name: habit.name,
      description: habit.description ?? '',
      frequency: habit.frequency,
      customDays: habit.customDays ?? [],
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function handleSubmit() {
    if (!form.name.trim()) return;
    if (form.frequency === 'CUSTOM' && form.customDays.length === 0) return;

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...form, name: form.name.trim() });
    } else {
      createMutation.mutate({ ...form, name: form.name.trim() });
    }
  }

  function toggleDay(day: number) {
    setForm((f) => ({
      ...f,
      customDays: f.customDays.includes(day)
        ? f.customDays.filter((d) => d !== day)
        : [...f.customDays, day],
    }));
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    const prev = habits[idx - 1]!;
    const prevPrev = habits[idx - 2];
    const newPos = prevPrev ? (prevPrev.position + prev.position) / 2 : prev.position - 1;
    reorderMutation.mutate({ id: habits[idx]!.id, position: newPos });
  }

  function moveDown(idx: number) {
    if (idx === habits.length - 1) return;
    const next = habits[idx + 1]!;
    const nextNext = habits[idx + 2];
    const newPos = nextNext ? (next.position + nextNext.position) / 2 : next.position + 1;
    reorderMutation.mutate({ id: habits[idx]!.id, position: newPos });
  }

  const isPending = createMutation.isPending || updateMutation.isPending;
  const canSubmit =
    form.name.trim().length > 0 &&
    (form.frequency === 'DAILY' || form.customDays.length > 0) &&
    !isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Manage Habits</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Form */}
          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm font-medium text-foreground">
              {editingId ? 'Edit habit' : 'New habit'}
            </p>

            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
                if (e.key === 'Escape') cancelEdit();
              }}
              placeholder="Habit name..."
              maxLength={200}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring transition"
            />

            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Escape') cancelEdit();
              }}
              placeholder="Description (optional)..."
              maxLength={500}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring transition"
            />

            {/* Frequency */}
            <div className="flex gap-2">
              {(['DAILY', 'CUSTOM'] as HabitFrequency[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setForm((s) => ({ ...s, frequency: f }))}
                  className={`rounded-md border px-3 py-1.5 text-xs transition ${
                    form.frequency === f
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border text-muted-foreground hover:border-foreground/40'
                  }`}
                >
                  {f === 'DAILY' ? 'Every day' : 'Custom days'}
                </button>
              ))}
            </div>

            {/* Day-of-week selector */}
            {form.frequency === 'CUSTOM' && (
              <div className="flex gap-1 flex-wrap">
                {DAYS.map((label, idx) => (
                  <button
                    key={idx}
                    onClick={() => toggleDay(idx)}
                    className={`rounded-md border px-2 py-1 text-xs transition ${
                      form.customDays.includes(idx)
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border text-muted-foreground hover:border-foreground/40'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button size="sm" onClick={handleSubmit} disabled={!canSubmit} className="flex-1">
                {editingId ? 'Save' : 'Add habit'}
              </Button>
              {editingId && (
                <Button size="sm" variant="outline" onClick={cancelEdit}>
                  Cancel
                </Button>
              )}
            </div>
          </div>

          {/* Habit list */}
          {habits.length > 0 && (
            <ul className="space-y-2">
              {habits.map((habit, idx) => (
                <li
                  key={habit.id}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition ${
                    habit.isActive
                      ? 'border-border bg-muted/20'
                      : 'border-border/40 bg-muted/10 opacity-50'
                  }`}
                >
                  {/* Reorder */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0}
                      className="text-muted-foreground/40 hover:text-foreground disabled:invisible leading-none text-xs transition"
                      aria-label="Move up"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveDown(idx)}
                      disabled={idx === habits.length - 1}
                      className="text-muted-foreground/40 hover:text-foreground disabled:invisible leading-none text-xs transition"
                      aria-label="Move down"
                    >
                      ▼
                    </button>
                  </div>

                  {/* Name + frequency */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{habit.name}</p>
                    {habit.description && (
                      <p className="text-xs text-muted-foreground/70 truncate">
                        {habit.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground/60">
                      {habit.frequency === 'DAILY'
                        ? 'Every day'
                        : (habit.customDays ?? []).map((d) => DAYS[d]).join(', ')}
                    </p>
                  </div>

                  {/* Active toggle */}
                  <button
                    onClick={() =>
                      toggleActiveMutation.mutate({ id: habit.id, isActive: !habit.isActive })
                    }
                    className="text-xs text-muted-foreground/60 hover:text-foreground transition shrink-0"
                    aria-label={habit.isActive ? 'Pause habit' : 'Resume habit'}
                  >
                    {habit.isActive ? 'Pause' : 'Resume'}
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => startEdit(habit)}
                    className="text-xs text-muted-foreground/60 hover:text-foreground transition shrink-0"
                    aria-label="Edit habit"
                  >
                    Edit
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => deleteMutation.mutate(habit.id)}
                    className="text-muted-foreground/40 hover:text-foreground transition text-lg leading-none shrink-0"
                    aria-label="Delete habit"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          {habits.length === 0 && (
            <p className="text-center text-sm text-muted-foreground/60 py-4">
              No habits yet. Add your first one above.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
