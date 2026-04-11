'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import type { BoardSummaryResponse } from '@zenfocus/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';

const COLOR_OPTIONS = [
  { key: 'indigo', swatch: 'bg-indigo-500', label: 'Indigo' },
  { key: 'rose', swatch: 'bg-rose-500', label: 'Rose' },
  { key: 'amber', swatch: 'bg-amber-500', label: 'Amber' },
  { key: 'emerald', swatch: 'bg-emerald-500', label: 'Emerald' },
  { key: 'sky', swatch: 'bg-sky-500', label: 'Sky' },
  { key: 'violet', swatch: 'bg-violet-500', label: 'Violet' },
];

interface BoardSettingsPanelProps {
  board: BoardSummaryResponse;
  onClose: () => void;
  onDeleteSuccess?: () => void;
}

export function BoardSettingsPanel({ board, onClose, onDeleteSuccess }: BoardSettingsPanelProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(board.title);
  const [description, setDescription] = useState(board.description ?? '');
  const [color, setColor] = useState<string | null>(board.color);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/boards/${board.id}`, { method: 'DELETE' });
    if (onDeleteSuccess) {
      onDeleteSuccess();
      onClose();
    } else {
      router.push('/boards');
    }
  }

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/boards/${board.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim() || board.title, description, color }),
    });
    setSaving(false);
    void queryClient.invalidateQueries({ queryKey: ['boards', 'modal'] });
    void queryClient.invalidateQueries({ queryKey: ['board', 'modal', board.id] });
    onClose();
  }

  return (
    <div className="flex flex-col h-full">
      <SheetHeader className="px-5 py-4 border-b border-border">
        <SheetTitle>Board Settings</SheetTitle>
      </SheetHeader>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Title */}
        <div>
          <label htmlFor="board-title" className="block text-sm font-medium text-foreground mb-1">
            Title
          </label>
          <Input
            id="board-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
          />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="board-description"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Description
          </label>
          <Textarea
            id="board-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="Add a description…"
            className="resize-none"
          />
        </div>

        {/* Theme */}
        <div>
          <span className="block text-sm font-medium text-foreground mb-2">Theme</span>
          <div className="flex gap-3 flex-wrap">
            {COLOR_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setColor(option.key)}
                title={option.label}
                aria-label={option.label}
                className={`w-8 h-8 rounded-full ${option.swatch} transition-all ${
                  color === option.key ? 'ring-2 ring-offset-2 ring-foreground' : ''
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <SheetFooter className="px-5 py-4 border-t border-border flex-col gap-3 sm:flex-col">
        <Button onClick={() => void handleSave()} disabled={saving} className="w-full">
          {saving ? 'Saving…' : 'Save'}
        </Button>

        {confirmDelete ? (
          <div className="text-sm space-y-2">
            <p className="text-muted-foreground">Are you sure? This cannot be undone.</p>
            <div className="flex items-center gap-3">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => void handleDelete()}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="destructive" onClick={() => setConfirmDelete(true)} className="w-full">
            Delete board
          </Button>
        )}
      </SheetFooter>
    </div>
  );
}
