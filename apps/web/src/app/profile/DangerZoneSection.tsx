'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface Props {
  email: string;
}

export function DangerZoneSection({ email }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  function handleOpenChange(value: boolean) {
    if (!value) setConfirmation('');
    setError(null);
    setOpen(value);
  }

  async function handleDelete() {
    if (confirmation !== email) return;
    setError(null);
    setIsDeleting(true);

    const res = await fetch('/api/users/me/delete', { method: 'DELETE' });

    if (!res.ok && res.status !== 204) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      setError(body.message ?? 'Failed to delete account');
      setIsDeleting(false);
      return;
    }

    router.push('/login');
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-destructive mb-2">Danger Zone</h2>
      <div className="border border-destructive rounded-lg p-4 space-y-3">
        <div>
          <p className="text-sm font-medium text-foreground">Delete account</p>
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
        </div>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          Delete Account
        </Button>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete account</DialogTitle>
            <DialogDescription>
              This will permanently delete your account, all focus items, boards, and data. Type
              your email address to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Type <span className="font-mono font-medium text-foreground">{email}</span> to confirm
            </p>
            <Input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={email}
              autoFocus
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={confirmation !== email || isDeleting}
              onClick={() => void handleDelete()}
            >
              {isDeleting ? 'Deleting…' : 'Delete Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
