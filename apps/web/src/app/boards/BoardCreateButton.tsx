'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function BoardCreateButton({ onBoardCreated }: { onBoardCreated?: () => void } = {}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const router = useRouter();

  async function handleSubmit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: trimmed }),
    });
    setTitle('');
    setOpen(false);
    onBoardCreated?.();
    router.refresh();
  }

  function handleOpenChange(value: boolean) {
    if (!value) setTitle('');
    setOpen(value);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ New Board</Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Board</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleSubmit();
            }}
            placeholder="Board title..."
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={!title.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
