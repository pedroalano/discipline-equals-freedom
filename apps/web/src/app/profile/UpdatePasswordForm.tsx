'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updatePasswordSchema } from '@zenfocus/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function UpdatePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const parsed = updatePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.errors) {
        const field = issue.path[0];
        if (typeof field === 'string') errs[field] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

    setIsSubmitting(true);
    const res = await fetch('/api/users/me/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setIsSubmitting(false);

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      setError(body.message ?? 'Failed to change password');
      return;
    }

    router.push('/login');
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3 max-w-sm">
      <div>
        <Input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Current password"
          className={fieldErrors['currentPassword'] ? 'border-destructive' : ''}
        />
        {fieldErrors['currentPassword'] && (
          <p className="text-xs text-destructive mt-1">{fieldErrors['currentPassword']}</p>
        )}
      </div>
      <div>
        <Input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="New password"
          className={fieldErrors['newPassword'] ? 'border-destructive' : ''}
        />
        {fieldErrors['newPassword'] && (
          <p className="text-xs text-destructive mt-1">{fieldErrors['newPassword']}</p>
        )}
      </div>
      <div>
        <Input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
          className={fieldErrors['confirmPassword'] ? 'border-destructive' : ''}
        />
        {fieldErrors['confirmPassword'] && (
          <p className="text-xs text-destructive mt-1">{fieldErrors['confirmPassword']}</p>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        You will be signed out of all sessions after changing your password.
      </p>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Changing…' : 'Change Password'}
      </Button>
    </form>
  );
}
