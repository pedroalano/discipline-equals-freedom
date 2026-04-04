'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { io, type Socket } from 'socket.io-client';
import type {
  BoardDetailResponse,
  CardCreatedEvent,
  CardDeletedEvent,
  CardMovedEvent,
  CardResponse,
  CardUpdatedEvent,
  ListResponse,
  MoveToTodayResponse,
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
  const [addingList, setAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [isAddingList, setIsAddingList] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
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
    const { draggableId, source, destination, type } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index)
      return;

    if (type === 'COLUMN') {
      const prev = [...lists];
      const reordered = [...lists];
      const [moved] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, moved!);

      const before = reordered[destination.index - 1];
      const after = reordered[destination.index + 1];

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

      setLists(
        reordered.map((l, i) => (i === destination.index ? { ...l, position: newPosition } : l)),
      );

      try {
        await fetch(`/api/lists/${draggableId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: newPosition }),
        });
      } catch {
        setLists(prev);
      }
      return;
    }

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

    if (destList.title.toLowerCase() === 'done') {
      setDoneCount((n) => n + 1);
    }

    try {
      await fetch(`/api/cards/${draggableId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId: destination.droppableId, position: newPosition }),
      });
      if (movedCard.isToday && movedCard.focusItemId && destList.title.toLowerCase() === 'done') {
        await fetch(`/api/focus/${movedCard.focusItemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: true }),
        });
      }
    } catch {
      // Revert on error
      applyCardMoved(movedCard);
    }
  }

  async function handleCardUpdate(cardId: string, data: { title?: string; description?: string }) {
    const res = await fetch(`/api/cards/${cardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const card = (await res.json()) as CardResponse;
      applyCardUpdated(card);
    }
  }

  async function handleCardDelete(cardId: string) {
    applyCardDeleted(cardId);
    await fetch(`/api/cards/${cardId}`, { method: 'DELETE' });
  }

  async function handleCardCreate(listId: string, title: string) {
    const res = await fetch('/api/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listId, title }),
    });
    if (res.ok) {
      const card = (await res.json()) as CardResponse;
      applyCardCreated(card);
    }
  }

  async function handleListDelete(listId: string) {
    setLists((prev) => prev.filter((l) => l.id !== listId));
    await fetch(`/api/lists/${listId}`, { method: 'DELETE' });
  }

  async function handleListUpdate(listId: string, data: { title: string }) {
    const res = await fetch(`/api/lists/${listId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated = (await res.json()) as ListResponse;
      setLists((prev) => prev.map((l) => (l.id === listId ? { ...l, title: updated.title } : l)));
    }
  }

  async function handleMoveToToday(cardId: string) {
    const res = await fetch(`/api/cards/${cardId}/move-to-today`, { method: 'POST' });
    if (res.ok) {
      const { card } = (await res.json()) as MoveToTodayResponse;
      applyCardUpdated(card);
    }
  }

  async function handleAddList() {
    const trimmed = newListTitle.trim();
    if (!trimmed) return;
    setIsAddingList(true);
    const res = await fetch('/api/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: trimmed, boardId: initialData.id }),
    });
    if (res.ok) {
      const newList = (await res.json()) as ListResponse;
      setLists((prev) => [...prev, newList].sort((a, b) => a.position - b.position));
    }
    setNewListTitle('');
    setAddingList(false);
    setIsAddingList(false);
  }

  return (
    <DragDropContext
      onDragStart={(start) => setDragging(start.draggableId)}
      onDragEnd={(result) => void handleDragEnd(result)}
    >
      <div className="relative flex gap-4 p-6 h-full items-start bg-slate-100">
        {doneCount > 0 && (
          <div className="absolute top-3 right-6 bg-emerald-100 text-emerald-700 text-xs font-medium px-3 py-1 rounded-full shadow-sm">
            ✓ {doneCount} done this session
          </div>
        )}
        <Droppable droppableId="board" type="COLUMN" direction="horizontal">
          {(boardProvided) => (
            <div
              ref={boardProvided.innerRef}
              {...boardProvided.droppableProps}
              className="flex gap-4 items-start"
            >
              {lists.map((list, index) => (
                <Draggable draggableId={list.id} index={index} key={list.id}>
                  {(listProvided) => (
                    <KanbanList
                      list={list}
                      dragProvided={listProvided}
                      onCardUpdate={handleCardUpdate}
                      onCardDelete={handleCardDelete}
                      onCardCreate={handleCardCreate}
                      onListDelete={handleListDelete}
                      onListUpdate={handleListUpdate}
                      onMoveToToday={handleMoveToToday}
                    />
                  )}
                </Draggable>
              ))}
              {boardProvided.placeholder}
            </div>
          )}
        </Droppable>
        {addingList ? (
          <div className="shrink-0 w-72 bg-white rounded-2xl shadow-md p-3 flex flex-col gap-2">
            <input
              autoFocus
              disabled={isAddingList}
              value={newListTitle}
              onChange={(e) => setNewListTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleAddList();
                if (e.key === 'Escape') {
                  setNewListTitle('');
                  setAddingList(false);
                }
              }}
              placeholder="List title..."
              className="text-sm p-1 border border-gray-300 rounded outline-none focus:border-blue-500 disabled:opacity-60"
            />
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => void handleAddList()}
                disabled={isAddingList}
                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-60"
              >
                {isAddingList ? 'Adding…' : 'Add list'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewListTitle('');
                  setAddingList(false);
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
            onClick={() => setAddingList(true)}
            className="shrink-0 w-72 p-3 bg-white/60 rounded-2xl shadow-sm text-sm text-gray-500 hover:bg-white hover:shadow-md text-left transition-all"
          >
            + Add list
          </button>
        )}
      </div>
    </DragDropContext>
  );
}
