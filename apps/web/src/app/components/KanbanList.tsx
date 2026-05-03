'use client';

import { useState } from 'react';
import { Droppable, type DraggableProvided } from '@hello-pangea/dnd';
import { AnimatePresence, useReducedMotion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { KanbanCard } from './KanbanCard';
import { CardEditorDialog } from './CardEditorDialog';
import type {
  CardResponse,
  CreateCardRequest,
  ListResponse,
  UpdateCardRequest,
} from '@zenfocus/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  list: ListResponse;
  onCardUpdate: (cardId: string, data: UpdateCardRequest) => Promise<void>;
  onCardDelete: (cardId: string) => Promise<void>;
  onCardCreate: (payload: CreateCardRequest) => Promise<void>;
  onListDelete: (listId: string) => Promise<void>;
  onListUpdate: (listId: string, data: { title: string }) => Promise<void>;
  onMoveToToday: (cardId: string) => Promise<void>;
  dragProvided?: DraggableProvided;
}

export function KanbanList({
  list,
  onCardUpdate,
  onCardDelete,
  onCardCreate,
  onListDelete,
  onListUpdate,
  onMoveToToday,
  dragProvided,
}: Props) {
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [isDeletingList, setIsDeletingList] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(list.title);
  const shouldReduceMotion = useReducedMotion();

  const sortedCards = [...list.cards].sort(
    (a: CardResponse, b: CardResponse) => a.position - b.position,
  );

  async function handleDeleteList() {
    if (!confirm('Delete this list and all its cards?')) return;
    setIsDeletingList(true);
    await onListDelete(list.id);
  }

  async function handleTitleSubmit() {
    const trimmed = titleValue.trim();
    if (!trimmed || trimmed === list.title) {
      setTitleValue(list.title);
      setEditingTitle(false);
      return;
    }
    await onListUpdate(list.id, { title: trimmed });
    setEditingTitle(false);
  }

  return (
    <TooltipProvider>
      <div
        ref={dragProvided?.innerRef}
        {...dragProvided?.draggableProps}
        className="flex flex-col w-72 shrink-0 bg-card shadow-md rounded-2xl p-3 gap-2"
      >
        <div
          {...dragProvided?.dragHandleProps}
          className={`flex items-center justify-between border-b border-border pb-2 mb-1 ${dragProvided ? 'cursor-grab active:cursor-grabbing' : ''} ${editingTitle ? 'bg-accent -mx-3 px-3 pt-1 rounded-t-xl' : ''}`}
        >
          {editingTitle ? (
            <Input
              autoFocus
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={() => void handleTitleSubmit()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleTitleSubmit();
                if (e.key === 'Escape') {
                  setTitleValue(list.title);
                  setEditingTitle(false);
                }
              }}
              className="font-bold text-base h-auto py-0 border-0 border-b rounded-none focus-visible:ring-0 flex-1 mr-2"
            />
          ) : (
            <h3
              className="font-bold text-base cursor-pointer hover:text-primary flex-1 text-foreground"
              onClick={() => setEditingTitle(true)}
            >
              {list.title}
              <Badge variant="secondary" className="ml-1 text-xs font-normal">
                {list.cards.length}
              </Badge>
            </h3>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => void handleDeleteList()}
                disabled={isDeletingList}
                aria-label="Delete list"
              >
                {isDeletingList ? (
                  <span className="text-xs">…</span>
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete list</TooltipContent>
          </Tooltip>
        </div>

        <Droppable droppableId={list.id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`flex flex-col gap-3 min-h-[60px] rounded transition-colors ${
                snapshot.isDraggingOver ? 'bg-accent/60 ring-1 ring-ring/30' : ''
              }`}
            >
              <AnimatePresence>
                {sortedCards.map((card, index) => (
                  <KanbanCard
                    key={card.id}
                    card={card}
                    index={index}
                    onUpdate={onCardUpdate}
                    onDelete={onCardDelete}
                    onMoveToToday={onMoveToToday}
                    shouldReduceMotion={shouldReduceMotion ?? false}
                  />
                ))}
              </AnimatePresence>
              {sortedCards.length === 0 && !snapshot.isDraggingOver && (
                <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
                  Drop cards here
                </p>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCreatorOpen(true)}
          className="justify-start text-muted-foreground hover:text-foreground w-full"
        >
          + Add card
        </Button>

        <CardEditorDialog
          mode="create"
          listId={list.id}
          open={creatorOpen}
          onOpenChange={setCreatorOpen}
          onSubmit={onCardCreate}
        />
      </div>
    </TooltipProvider>
  );
}
