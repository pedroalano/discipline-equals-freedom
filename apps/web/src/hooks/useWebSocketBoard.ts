'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import type {
  CardCreatedEvent,
  CardDeletedEvent,
  CardMovedEvent,
  CardResponse,
  CardUpdatedEvent,
  ListResponse,
} from '@zenfocus/types';

const WS_URL = process.env['NEXT_PUBLIC_WS_URL'] ?? 'http://localhost:3001';

interface UseWebSocketBoardResult {
  lists: ListResponse[];
  setLists: React.Dispatch<React.SetStateAction<ListResponse[]>>;
  applyCardMoved: (card: CardResponse) => void;
  applyCardUpdated: (card: CardResponse) => void;
  applyCardCreated: (card: CardResponse) => void;
  applyCardDeleted: (cardId: string) => void;
}

export function useWebSocketBoard(
  boardId: string,
  initialLists: ListResponse[],
): UseWebSocketBoardResult {
  const [lists, setLists] = useState<ListResponse[]>(
    [...initialLists].sort((a, b) => a.position - b.position),
  );
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

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
    if (
      process.env['NODE_ENV'] === 'production' &&
      !WS_URL.startsWith('wss://') &&
      !WS_URL.startsWith('https://')
    ) {
      console.error(
        'NEXT_PUBLIC_WS_URL must use wss:// or https:// in production — WebSocket disabled.',
      );
      return;
    }

    const socket = io(WS_URL, { withCredentials: true });
    socketRef.current = socket;

    socket.emit('board:join', boardId);

    socket.on('card:moved', ({ card }: CardMovedEvent) => applyCardMoved(card));
    socket.on('card:updated', ({ card }: CardUpdatedEvent) => applyCardUpdated(card));
    socket.on('card:created', ({ card }: CardCreatedEvent) => applyCardCreated(card));
    socket.on('card:deleted', ({ cardId }: CardDeletedEvent) => applyCardDeleted(cardId));

    return () => {
      socket.emit('board:leave', boardId);
      socket.disconnect();
    };
  }, [boardId, applyCardMoved, applyCardUpdated, applyCardCreated, applyCardDeleted]);

  return { lists, setLists, applyCardMoved, applyCardUpdated, applyCardCreated, applyCardDeleted };
}
