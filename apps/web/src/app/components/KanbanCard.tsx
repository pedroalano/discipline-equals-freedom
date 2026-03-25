'use client';

import { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import type { CardResponse } from '@zenfocus/types';

interface Props {
  card: CardResponse;
  index: number;
  onUpdate: (cardId: string, data: { title?: string; description?: string }) => Promise<void>;
  onDelete: (cardId: string) => Promise<void>;
}

export function KanbanCard({ card, index, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(card.title);

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

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`group flex items-start justify-between gap-2 p-2 bg-white rounded border border-gray-200 shadow-sm ${
            snapshot.isDragging ? 'shadow-md opacity-80' : ''
          }`}
        >
          {editing ? (
            <input
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
              className="flex-1 text-sm border-b border-blue-500 outline-none"
            />
          ) : (
            <span className="flex-1 text-sm cursor-pointer" onClick={() => setEditing(true)}>
              {card.title}
            </span>
          )}
          <button
            type="button"
            onClick={() => void onDelete(card.id)}
            className="hidden group-hover:block text-gray-400 hover:text-red-500 text-xs shrink-0"
            aria-label="Delete card"
          >
            ×
          </button>
        </div>
      )}
    </Draggable>
  );
}
