'use client';

import { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { motion } from 'framer-motion';
import { Target, X } from 'lucide-react';
import type { CardResponse } from '@zenfocus/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  card: CardResponse;
  index: number;
  onUpdate: (cardId: string, data: { title?: string; description?: string }) => Promise<void>;
  onDelete: (cardId: string) => Promise<void>;
  onMoveToToday: (cardId: string) => Promise<void>;
  shouldReduceMotion: boolean;
}

export function KanbanCard({
  card,
  index,
  onUpdate,
  onDelete,
  onMoveToToday,
  shouldReduceMotion,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [editingDesc, setEditingDesc] = useState(false);
  const [desc, setDesc] = useState(card.description ?? '');
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleTitleSubmit() {
    const trimmed = title.trim();
    if (!trimmed || trimmed === card.title) {
      setTitle(card.title);
      setEditing(false);
      return;
    }
    await onUpdate(card.id, { title: trimmed });
    setEditing(false);
  }

  async function handleDescSubmit() {
    const trimmed = desc.trim();
    if (trimmed === (card.description ?? '')) {
      setEditingDesc(false);
      return;
    }
    await onUpdate(card.id, { description: trimmed || (null as unknown as string) });
    setEditingDesc(false);
  }

  const ringClass = card.isToday
    ? 'ring-amber-300 hover:ring-amber-400'
    : 'ring-border hover:ring-primary/40';

  return (
    <TooltipProvider>
      <Draggable draggableId={card.id} index={index}>
        {(provided, snapshot) => (
          <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
            <motion.div
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className={`group relative flex flex-col p-3 rounded-md shadow-sm transition-all ring-1 ring-inset ${
                editing || editingDesc ? 'bg-accent' : 'bg-card'
              } ${isDeleting ? 'opacity-50' : ''} ${
                snapshot.isDragging ? 'opacity-90 shadow-lg rotate-1 ring-border' : ringClass
              }`}
            >
              {card.isToday && (
                <Badge
                  variant="outline"
                  className="absolute top-2 right-7 text-xs border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 px-1.5 py-0.5 font-medium leading-tight"
                >
                  Today
                </Badge>
              )}
              <div className="flex items-start gap-2">
                <span className="opacity-20 group-hover:opacity-60 text-muted-foreground text-xs select-none shrink-0 mt-0.5 cursor-grab">
                  ⠿
                </span>
                {editing ? (
                  <Input
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={() => void handleTitleSubmit()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleTitleSubmit();
                      if (e.key === 'Escape') {
                        setTitle(card.title);
                        setEditing(false);
                      }
                    }}
                    className="flex-1 min-w-0 text-sm h-auto py-0 border-0 border-b rounded-none focus-visible:ring-0 bg-transparent"
                  />
                ) : (
                  <span
                    className="flex-1 text-sm cursor-pointer text-foreground"
                    onClick={() => setEditing(true)}
                  >
                    {card.title}
                  </span>
                )}
                <div className="flex items-center gap-1 shrink-0">
                  {!card.isToday && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 h-5 w-5 text-amber-400 hover:text-amber-600 transition-opacity"
                          onClick={() => void onMoveToToday(card.id)}
                          aria-label="Move to today"
                        >
                          <Target className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Move to Today</TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 h-5 w-5 text-muted-foreground hover:text-destructive transition-opacity"
                        onClick={() => {
                          setIsDeleting(true);
                          void onDelete(card.id);
                        }}
                        disabled={isDeleting}
                        aria-label="Delete card"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete card</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {editingDesc ? (
                <Textarea
                  autoFocus
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  onBlur={() => void handleDescSubmit()}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setDesc(card.description ?? '');
                      setEditingDesc(false);
                    }
                  }}
                  rows={3}
                  className="mt-2 ml-5 text-xs resize-none"
                />
              ) : (
                <div
                  className="mt-1 ml-5 text-xs text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => setEditingDesc(true)}
                >
                  {card.description ? (
                    <span className="text-foreground/70">{card.description}</span>
                  ) : (
                    <span className="italic">Add description…</span>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </Draggable>
    </TooltipProvider>
  );
}
