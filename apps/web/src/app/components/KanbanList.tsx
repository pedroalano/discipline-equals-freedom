'use client';

import { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
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
}

export function KanbanList({
  list,
  onCardUpdate,
  onCardDelete,
  onCardCreate,
  onListDelete,
}: Props) {
  const [addingCard, setAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const shouldReduceMotion = useReducedMotion();

  const sortedCards = [...list.cards].sort(
    (a: CardResponse, b: CardResponse) => a.position - b.position,
  );

  async function handleAddCard() {
    const trimmed = newCardTitle.trim();
    if (!trimmed) return;
    await onCardCreate(list.id, trimmed);
    setNewCardTitle('');
    setAddingCard(false);
  }

  function handleDeleteList() {
    if (!confirm('Delete this list and all its cards?')) return;
    void onListDelete(list.id);
  }

  return (
    <div
      className={`flex flex-col w-72 shrink-0 bg-white shadow-md rounded-2xl p-3 gap-2 border-t-4 ${listAccent(list.id)}`}
    >
      <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-1">
        <h3 className="font-bold text-base">
          {list.title}
          <span className="text-xs text-gray-400 ml-1 font-normal">({list.cards.length})</span>
        </h3>
        <button
          type="button"
          onClick={handleDeleteList}
          className="text-gray-400 hover:text-red-500 text-xs"
          aria-label="Delete list"
        >
          ×
        </button>
      </div>

      <Droppable droppableId={list.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex flex-col gap-3 min-h-[4px] rounded transition-colors ${
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
                  shouldReduceMotion={shouldReduceMotion ?? false}
                />
              ))}
            </AnimatePresence>
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {addingCard ? (
        <div className="flex flex-col gap-1">
          <input
            autoFocus
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
            className="text-sm p-1 border border-gray-300 rounded outline-none focus:border-blue-500"
          />
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => void handleAddCard()}
              className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
            >
              Add
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
