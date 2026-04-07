'use client';

import { useState } from 'react';
import { updateNameSchema, type ProfileResponse } from '@zenfocus/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Props {
  currentName: string | null;
  onSuccess: (profile: ProfileResponse) => void;
}

export function UpdateNameForm({ currentName, onSuccess }: Props) {
  const [name, setName] = useState(currentName ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = updateNameSchema.safeParse({ name });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Invalid name');
      return;
    }

    setIsSubmitting(true);
    const res = await fetch('/api/users/me/name', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setIsSubmitting(false);

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      setError(body.message ?? 'Failed to update name');
      return;
    }

    const updated = (await res.json()) as ProfileResponse;
    onSuccess(updated);
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex gap-2 items-start">
      <div className="flex-1">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className={error ? 'border-destructive' : ''}
        />
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : 'Save'}
      </Button>
    </form>
  );
}
