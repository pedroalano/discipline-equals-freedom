'use client';

import { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { motion } from 'framer-motion';
import type { CardResponse } from '@zenfocus/types';

interface Props {
  card: CardResponse;
  index: number;
  onUpdate: (cardId: string, data: { title?: string; description?: string }) => Promise<void>;
  onDelete: (cardId: string) => Promise<void>;
  shouldReduceMotion: boolean;
}

export function KanbanCard({ card, index, onUpdate, onDelete, shouldReduceMotion }: Props) {
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
        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={`group flex items-start gap-2 p-3 bg-white rounded-md shadow-sm transition-all ring-1 ring-inset hover:shadow-md ${
              snapshot.isDragging
                ? 'opacity-90 shadow-lg rotate-1 ring-gray-300'
                : 'ring-gray-100 hover:ring-indigo-300'
            }`}
          >
            <span className="opacity-0 group-hover:opacity-40 text-gray-400 text-xs select-none shrink-0 mt-0.5 cursor-grab">
              ⠿
            </span>
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
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-xs shrink-0 transition-opacity"
              aria-label="Delete card"
            >
              ×
            </button>
          </motion.div>
        </div>
      )}
    </Draggable>
  );
}
