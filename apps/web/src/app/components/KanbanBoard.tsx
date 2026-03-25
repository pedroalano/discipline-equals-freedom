'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import { io, type Socket } from 'socket.io-client';
import type {
  BoardDetailResponse,
  CardCreatedEvent,
  CardDeletedEvent,
  CardMovedEvent,
  CardResponse,
  CardUpdatedEvent,
  ListResponse,
} from '@zenfocus/types';
import { KanbanList } from './KanbanList';
import { useBoardUIStore } from '../../store/board';

const WS_URL = process.env['NEXT_PUBLIC_WS_URL'] ?? 'http://localhost:3001';

interface Props {
  initialData: BoardDetailResponse;
}

function positionBetween(a: number, b: number): number {
  return (a + b) / 2;
}

export function KanbanBoard({ initialData }: Props) {
  const [lists, setLists] = useState<ListResponse[]>(
    [...initialData.lists].sort((a, b) => a.position - b.position),
  );
  const socketRef = useRef<Socket | null>(null);
  const setDragging = useBoardUIStore((s) => s.setDragging);

  // Sync WS events into local state
  const applyCardMoved = useCallback((card: CardResponse) => {
    setLists((prev) =>
      prev.map((list) => {
        const withoutCard = list.cards.filter((c) => c.id !== card.id);
        if (list.id === card.listId) {
          return { ...list, cards: [...withoutCard, card].sort((a, b) => a.position - b.position) };
        }
        return { ...list, cards: withoutCard };
      }),
    );
  }, []);

  const applyCardUpdated = useCallback((card: CardResponse) => {
    setLists((prev) =>
      prev.map((list) => ({
        ...list,
        cards: list.cards.map((c) => (c.id === card.id ? card : c)),
      })),
    );
  }, []);

  const applyCardCreated = useCallback((card: CardResponse) => {
    setLists((prev) =>
      prev.map((list) => {
        if (list.id !== card.listId) return list;
        if (list.cards.some((c) => c.id === card.id)) return list;
        return { ...list, cards: [...list.cards, card].sort((a, b) => a.position - b.position) };
      }),
    );
  }, []);

  const applyCardDeleted = useCallback((cardId: string) => {
    setLists((prev) =>
      prev.map((list) => ({ ...list, cards: list.cards.filter((c) => c.id !== cardId) })),
    );
  }, []);

  useEffect(() => {
    const socket = io(WS_URL, { withCredentials: true });
    socketRef.current = socket;

    socket.emit('board:join', initialData.id);

    socket.on('card:moved', ({ card }: CardMovedEvent) => applyCardMoved(card));
    socket.on('card:updated', ({ card }: CardUpdatedEvent) => applyCardUpdated(card));
    socket.on('card:created', ({ card }: CardCreatedEvent) => applyCardCreated(card));
    socket.on('card:deleted', ({ cardId }: CardDeletedEvent) => applyCardDeleted(cardId));

    return () => {
      socket.emit('board:leave', initialData.id);
      socket.disconnect();
    };
  }, [initialData.id, applyCardMoved, applyCardUpdated, applyCardCreated, applyCardDeleted]);

  async function handleDragEnd(result: DropResult) {
    setDragging(null);
    const { draggableId, source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index)
      return;

    const destList = lists.find((l) => l.id === destination.droppableId);
    if (!destList) return;

    const sortedDestCards = [...destList.cards]
      .filter((c) => c.id !== draggableId)
      .sort((a, b) => a.position - b.position);

    const before = sortedDestCards[destination.index - 1];
    const after = sortedDestCards[destination.index];

    let newPosition: number;
    if (!before && !after) {
      newPosition = 1.0;
    } else if (!before) {
      newPosition = after!.position / 2;
    } else if (!after) {
      newPosition = before.position + 1.0;
    } else {
      newPosition = positionBetween(before.position, after.position);
    }

    // Optimistic update
    const movedCard = lists.flatMap((l) => l.cards).find((c) => c.id === draggableId);
    if (!movedCard) return;

    const optimistic: CardResponse = {
      ...movedCard,
      listId: destination.droppableId,
      position: newPosition,
    };
    applyCardMoved(optimistic);

    try {
      await fetch(`/api/cards/${draggableId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId: destination.droppableId, position: newPosition }),
      });
    } catch {
      // Revert on error
      applyCardMoved(movedCard);
    }
  }

  async function handleCardUpdate(cardId: string, data: { title?: string; description?: string }) {
    await fetch(`/api/cards/${cardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async function handleCardDelete(cardId: string) {
    applyCardDeleted(cardId);
    await fetch(`/api/cards/${cardId}`, { method: 'DELETE' });
  }

  async function handleCardCreate(listId: string, title: string) {
    await fetch('/api/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listId, title }),
    });
  }

  async function handleListDelete(listId: string) {
    setLists((prev) => prev.filter((l) => l.id !== listId));
    await fetch(`/api/lists/${listId}`, { method: 'DELETE' });
  }

  async function handleAddList() {
    const title = window.prompt('List title?');
    if (!title) return;
    const res = await fetch('/api/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, boardId: initialData.id }),
    });
    if (res.ok) {
      const newList = (await res.json()) as ListResponse;
      setLists((prev) => [...prev, newList].sort((a, b) => a.position - b.position));
    }
  }

  return (
    <DragDropContext
      onDragStart={(start) => setDragging(start.draggableId)}
      onDragEnd={(result) => void handleDragEnd(result)}
    >
      <div className="flex gap-4 p-6 h-full items-start">
        {lists.map((list) => (
          <KanbanList
            key={list.id}
            list={list}
            onCardUpdate={handleCardUpdate}
            onCardDelete={handleCardDelete}
            onCardCreate={handleCardCreate}
            onListDelete={handleListDelete}
          />
        ))}
        <button
          type="button"
          onClick={() => void handleAddList()}
          className="shrink-0 w-64 p-3 bg-gray-100 rounded-lg text-sm text-gray-500 hover:bg-gray-200 text-left"
        >
          + Add list
        </button>
      </div>
    </DragDropContext>
  );
}
