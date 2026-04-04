'use client';

import { useState } from 'react';
import { Droppable, type DraggableProvided } from '@hello-pangea/dnd';
import { AnimatePresence, useReducedMotion } from 'framer-motion';
import { KanbanCard } from './KanbanCard';
import type { CardResponse, ListResponse } from '@zenfocus/types';

const ACCENT_COLORS = [
  'border-t-rose-400',
  'border-t-amber-400',
  'border-t-emerald-400',
  'border-t-sky-400',
  'border-t-violet-400',
  'border-t-pink-400',
];

function listAccent(id: string): string {
  const hash = id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return ACCENT_COLORS[hash % ACCENT_COLORS.length] ?? ACCENT_COLORS[0]!;
}

interface Props {
  list: ListResponse;
  onCardUpdate: (cardId: string, data: { title?: string; description?: string }) => Promise<void>;
  onCardDelete: (cardId: string) => Promise<void>;
  onCardCreate: (listId: string, title: string) => Promise<void>;
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
  const [addingCard, setAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isDeletingList, setIsDeletingList] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(list.title);
  const shouldReduceMotion = useReducedMotion();

  const sortedCards = [...list.cards].sort(
    (a: CardResponse, b: CardResponse) => a.position - b.position,
  );

  async function handleAddCard() {
    const trimmed = newCardTitle.trim();
    if (!trimmed) return;
    setIsCreating(true);
    await onCardCreate(list.id, trimmed);
    setIsCreating(false);
    setNewCardTitle('');
    setAddingCard(false);
  }

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
    <div
      ref={dragProvided?.innerRef}
      {...dragProvided?.draggableProps}
      className={`flex flex-col w-72 shrink-0 bg-white shadow-md rounded-2xl p-3 gap-2 border-t-4 ${listAccent(list.id)}`}
    >
      <div
        {...dragProvided?.dragHandleProps}
        className={`flex items-center justify-between border-b border-gray-200 pb-2 mb-1 ${dragProvided ? 'cursor-grab active:cursor-grabbing' : ''} ${editingTitle ? 'bg-blue-50 -mx-3 px-3 pt-1 rounded-t-xl' : ''}`}
      >
        {editingTitle ? (
          <input
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
            className="font-bold text-base border-b border-blue-500 outline-none flex-1 mr-2"
          />
        ) : (
          <h3
            className="font-bold text-base cursor-pointer hover:text-blue-700 flex-1"
            onClick={() => setEditingTitle(true)}
          >
            {list.title}
            <span className="text-xs text-gray-400 ml-1 font-normal">({list.cards.length})</span>
          </h3>
        )}
        <button
          type="button"
          onClick={() => void handleDeleteList()}
          disabled={isDeletingList}
          className="text-gray-400 hover:text-red-500 text-xs shrink-0 disabled:opacity-50"
          aria-label="Delete list"
        >
          {isDeletingList ? '…' : '×'}
        </button>
      </div>

      <Droppable droppableId={list.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex flex-col gap-3 min-h-[60px] rounded transition-colors ${
              snapshot.isDraggingOver ? 'bg-blue-100 ring-1 ring-blue-300' : ''
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
              <p className="text-xs text-gray-300 text-center py-4 border border-dashed border-gray-200 rounded-lg">
                Drop cards here
              </p>
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {addingCard ? (
        <div className="flex flex-col gap-1">
          <input
            autoFocus
            disabled={isCreating}
            value={newCardTitle}
            onChange={(e) => setNewCardTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleAddCard();
              if (e.key === 'Escape') {
                setNewCardTitle('');
                setAddingCard(false);
              }
            }}
            placeholder="Card title..."
            className="text-sm p-1 border border-gray-300 rounded outline-none focus:border-blue-500 disabled:opacity-60"
          />
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => void handleAddCard()}
              disabled={isCreating}
              className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-60"
            >
              {isCreating ? 'Adding…' : 'Add'}
            </button>
            <button
              type="button"
              onClick={() => {
                setNewCardTitle('');
                setAddingCard(false);
              }}
              className="px-2 py-1 text-gray-600 text-xs hover:bg-gray-200 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAddingCard(true)}
          className="text-sm text-gray-500 hover:text-gray-800 text-left py-1"
        >
          + Add card
        </button>
      )}
    </div>
  );
}
