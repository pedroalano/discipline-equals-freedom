'use client';

import { useEffect, useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import type {
  CardPriority,
  CardResponse,
  CreateCardRequest,
  UpdateCardRequest,
} from '@zenfocus/types';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const COLOR_SWATCHES: { value: string; label: string }[] = [
  { value: '#ef4444', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#22c55e', label: 'Green' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', label: 'Violet' },
];

type Mode = 'create' | 'edit';

interface CreateProps {
  mode: 'create';
  listId: string;
  card?: undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateCardRequest) => Promise<void>;
}

interface EditProps {
  mode: 'edit';
  listId?: undefined;
  card: CardResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: UpdateCardRequest) => Promise<void>;
}

type Props = CreateProps | EditProps;

function toDateInput(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

export function CardEditorDialog(props: Props) {
  const { mode, open, onOpenChange } = props;
  const card = mode === 'edit' ? props.card : undefined;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<CardPriority | ''>('');
  const [dueDate, setDueDate] = useState('');
  const [labels, setLabels] = useState<string[]>([]);
  const [labelDraft, setLabelDraft] = useState('');
  const [color, setColor] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(card?.title ?? '');
    setDescription(card?.description ?? '');
    setPriority(card?.priority ?? '');
    setDueDate(toDateInput(card?.dueDate ?? null));
    setLabels(card?.labels ?? []);
    setLabelDraft('');
    setColor(card?.color ?? null);
    setSubmitting(false);
  }, [open, card]);

  function commitLabel() {
    const trimmed = labelDraft.trim().replace(/,$/, '').trim();
    if (!trimmed) return;
    if (labels.includes(trimmed)) {
      setLabelDraft('');
      return;
    }
    if (labels.length >= 10) return;
    setLabels([...labels, trimmed]);
    setLabelDraft('');
  }

  function handleLabelKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitLabel();
    } else if (e.key === 'Backspace' && !labelDraft && labels.length > 0) {
      setLabels(labels.slice(0, -1));
    }
  }

  function removeLabel(label: string) {
    setLabels(labels.filter((l) => l !== label));
  }

  async function handleSubmit() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    // Commit any pending label draft.
    let finalLabels = labels;
    const draft = labelDraft.trim().replace(/,$/, '').trim();
    if (draft && !labels.includes(draft) && labels.length < 10) {
      finalLabels = [...labels, draft];
    }

    const dueDateIso = dueDate ? new Date(dueDate + 'T00:00:00.000Z').toISOString() : null;
    const cleanedDescription = description.trim() || null;
    const cleanedColor = color ?? null;
    const cleanedPriority: CardPriority | null = priority === '' ? null : priority;

    setSubmitting(true);
    try {
      if (mode === 'create') {
        await props.onSubmit({
          title: trimmedTitle,
          listId: props.listId,
          description: cleanedDescription,
          priority: cleanedPriority,
          dueDate: dueDateIso,
          labels: finalLabels,
          color: cleanedColor,
        });
      } else {
        await props.onSubmit({
          title: trimmedTitle,
          description: cleanedDescription,
          priority: cleanedPriority,
          dueDate: dueDateIso,
          labels: finalLabels,
          color: cleanedColor,
        });
      }
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  const titleLabel = mode === 'create' ? 'New card' : 'Edit card';
  const submitLabel = mode === 'create' ? 'Create' : 'Save changes';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{titleLabel}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="card-title">
              Title
            </label>
            <Input
              id="card-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Card title"
              maxLength={200}
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="card-desc">
              Description
            </label>
            <Textarea
              id="card-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description…"
              rows={4}
              maxLength={2000}
            />
          </div>

          <div className="grid gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Priority</span>
            <ToggleGroup
              type="single"
              value={priority}
              onValueChange={(v) => setPriority((v as CardPriority | '') || '')}
              className="justify-start"
            >
              <ToggleGroupItem value="LOW">Low</ToggleGroupItem>
              <ToggleGroupItem value="MEDIUM">Medium</ToggleGroupItem>
              <ToggleGroupItem value="HIGH">High</ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="card-due">
              Due date
            </label>
            <div className="flex items-center gap-2">
              <input
                id="card-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              {dueDate && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setDueDate('')}>
                  Clear
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Labels <span className="text-muted-foreground/60">({labels.length}/10)</span>
            </span>
            <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background p-2">
              {labels.map((label) => (
                <Badge key={label} variant="secondary" className="gap-1 pr-1">
                  {label}
                  <button
                    type="button"
                    onClick={() => removeLabel(label)}
                    className="rounded hover:bg-muted-foreground/20"
                    aria-label={`Remove ${label}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <input
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                onKeyDown={handleLabelKey}
                onBlur={commitLabel}
                placeholder={labels.length === 0 ? 'Add label, press Enter…' : ''}
                className="flex-1 min-w-[120px] bg-transparent text-sm outline-none"
                disabled={labels.length >= 10}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Color</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setColor(null)}
                className={`h-7 w-7 rounded-full border border-dashed border-muted-foreground/40 bg-transparent text-xs text-muted-foreground transition ${
                  color === null ? 'ring-2 ring-ring ring-offset-2 ring-offset-background' : ''
                }`}
                aria-label="No color"
              >
                ∅
              </button>
              {COLOR_SWATCHES.map((swatch) => (
                <button
                  key={swatch.value}
                  type="button"
                  onClick={() => setColor(swatch.value)}
                  className={`h-7 w-7 rounded-full transition ${
                    color === swatch.value
                      ? 'ring-2 ring-ring ring-offset-2 ring-offset-background'
                      : ''
                  }`}
                  style={{ backgroundColor: swatch.value }}
                  aria-label={swatch.label}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={submitting || !title.trim()}>
            {submitting ? 'Saving…' : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { Mode as CardEditorMode };
