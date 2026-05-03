'use client';

import { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { motion } from 'framer-motion';
import { Calendar, Target, X } from 'lucide-react';
import type { CardPriority, CardResponse, UpdateCardRequest } from '@zenfocus/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CardEditorDialog } from './CardEditorDialog';

interface Props {
  card: CardResponse;
  index: number;
  onUpdate: (cardId: string, data: UpdateCardRequest) => Promise<void>;
  onDelete: (cardId: string) => Promise<void>;
  onMoveToToday: (cardId: string) => Promise<void>;
  shouldReduceMotion: boolean;
}

const PRIORITY_STYLES: Record<CardPriority, string> = {
  LOW: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30',
  MEDIUM: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30',
  HIGH: 'bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/30',
};

function formatDueDate(iso: string): { text: string; overdue: boolean } {
  const parts = iso.slice(0, 10).split('-').map(Number);
  const dueStart = new Date(parts[0] ?? 1970, (parts[1] ?? 1) - 1, parts[2] ?? 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((dueStart.getTime() - today.getTime()) / 86_400_000);
  let text: string;
  if (diffDays === 0) text = 'Today';
  else if (diffDays === 1) text = 'Tomorrow';
  else if (diffDays === -1) text = 'Yesterday';
  else if (diffDays > 1 && diffDays < 7) text = `In ${diffDays}d`;
  else
    text = dueStart.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  return { text, overdue: diffDays < 0 };
}

export function KanbanCard({
  card,
  index,
  onUpdate,
  onDelete,
  onMoveToToday,
  shouldReduceMotion,
}: Props) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  const ringClass = card.isToday
    ? 'ring-today-ring hover:ring-today-ring-hover'
    : 'ring-border hover:ring-primary/40';

  const due = card.dueDate ? formatDueDate(card.dueDate) : null;
  const hasMeta = !!(card.priority || due || card.labels.length > 0);

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
              className={`group relative flex flex-col p-3 rounded-md shadow-sm transition-all ring-1 ring-inset bg-card ${
                isDeleting ? 'opacity-50' : ''
              } ${snapshot.isDragging ? 'opacity-90 shadow-lg rotate-1 ring-border' : ringClass}`}
              style={
                card.color
                  ? { borderLeft: `4px solid ${card.color}`, paddingLeft: '0.5rem' }
                  : undefined
              }
            >
              {card.isToday && (
                <Badge
                  variant="outline"
                  className="absolute top-2 right-7 text-xs border-today-badge-border text-today-badge-text bg-today-badge-bg px-1.5 py-0.5 font-medium leading-tight"
                >
                  Today
                </Badge>
              )}
              <div className="flex items-start gap-2">
                <span className="opacity-20 group-hover:opacity-60 text-muted-foreground text-xs select-none shrink-0 mt-0.5 cursor-grab">
                  ⠿
                </span>
                <button
                  type="button"
                  className="flex-1 text-left text-sm text-foreground hover:text-primary"
                  onClick={() => setEditorOpen(true)}
                >
                  {card.title}
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  {!card.isToday && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 h-5 w-5 text-today-ring hover:text-today-ring-hover transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            void onMoveToToday(card.id);
                          }}
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
                        onClick={(e) => {
                          e.stopPropagation();
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

              {card.description && (
                <p className="mt-1 ml-5 text-xs text-foreground/70 line-clamp-2">
                  {card.description}
                </p>
              )}

              {hasMeta && (
                <div className="mt-2 ml-5 flex flex-wrap items-center gap-1">
                  {card.priority && (
                    <Badge
                      variant="outline"
                      className={`text-[10px] leading-tight px-1.5 py-0 ${PRIORITY_STYLES[card.priority]}`}
                    >
                      {card.priority.toLowerCase()}
                    </Badge>
                  )}
                  {due && (
                    <Badge
                      variant="outline"
                      className={`text-[10px] leading-tight px-1.5 py-0 gap-1 ${
                        due.overdue
                          ? 'bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/30'
                          : 'text-muted-foreground'
                      }`}
                    >
                      <Calendar className="h-2.5 w-2.5" />
                      {due.text}
                    </Badge>
                  )}
                  {card.labels.map((label) => (
                    <Badge
                      key={label}
                      variant="secondary"
                      className="text-[10px] leading-tight px-1.5 py-0"
                    >
                      {label}
                    </Badge>
                  ))}
                </div>
              )}
            </motion.div>

            <CardEditorDialog
              mode="edit"
              card={card}
              open={editorOpen}
              onOpenChange={setEditorOpen}
              onSubmit={(payload) => onUpdate(card.id, payload)}
            />
          </div>
        )}
      </Draggable>
    </TooltipProvider>
  );
}
