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
    : 'ring-gray-100 hover:ring-indigo-300';

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={`group relative flex flex-col p-3 bg-white rounded-md shadow-sm transition-all ring-1 ring-inset ${
              snapshot.isDragging ? 'opacity-90 shadow-lg rotate-1 ring-gray-300' : ringClass
            }`}
          >
            {card.isToday && (
              <span className="absolute top-2 right-7 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium leading-tight">
                Today
              </span>
            )}
            <div className="flex items-start gap-2">
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
              <div className="flex items-center gap-1 shrink-0">
                {!card.isToday && (
                  <button
                    type="button"
                    onClick={() => void onMoveToToday(card.id)}
                    className="opacity-0 group-hover:opacity-100 text-amber-400 hover:text-amber-600 text-xs transition-opacity"
                    aria-label="Move to today"
                    title="Move to Today"
                  >
                    🎯
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void onDelete(card.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-xs transition-opacity"
                  aria-label="Delete card"
                >
                  ×
                </button>
              </div>
            </div>

            {editingDesc ? (
              <textarea
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
                className="mt-2 ml-5 text-xs text-gray-600 border border-blue-400 rounded p-1 outline-none w-full resize-none"
              />
            ) : (
              <div
                className="mt-1 ml-5 text-xs text-gray-400 cursor-pointer hover:text-gray-600"
                onClick={() => setEditingDesc(true)}
              >
                {card.description ? (
                  <span className="text-gray-500">{card.description}</span>
                ) : (
                  <span className="italic">Add description…</span>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </Draggable>
  );
}
