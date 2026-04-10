'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { BoardSummaryResponse } from '@zenfocus/types';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const GRADIENTS = [
  'from-indigo-500 to-purple-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-500',
  'from-emerald-500 to-teal-600',
  'from-sky-500 to-blue-600',
  'from-violet-500 to-purple-700',
];

const COLOR_MAP: Record<string, string> = {
  indigo: 'from-indigo-500 to-purple-600',
  rose: 'from-rose-500 to-pink-600',
  amber: 'from-amber-500 to-orange-500',
  emerald: 'from-emerald-500 to-teal-600',
  sky: 'from-sky-500 to-blue-600',
  violet: 'from-violet-500 to-purple-700',
};

function boardGradient(board: BoardSummaryResponse): string {
  if (board.color && COLOR_MAP[board.color]) return COLOR_MAP[board.color]!;
  const hash = board.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return GRADIENTS[hash % GRADIENTS.length] ?? GRADIENTS[0]!;
}

function relativeTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

const PINNED_KEY = 'zenfocus:pinned-boards';

function loadPinned(): string[] {
  try {
    return JSON.parse(localStorage.getItem(PINNED_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

interface BoardCardItemProps {
  board: BoardSummaryResponse;
  isPinned: boolean;
  onTogglePin: (id: string) => void;
  onBoardClick?: (id: string) => void;
}

const cardInnerContent = (board: BoardSummaryResponse, gradient: string) => (
  <>
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
    <div className="absolute inset-0 bg-black/20" />
    <div className="relative h-full flex flex-col justify-end p-4">
      <h2 className="font-bold text-lg text-white leading-tight">{board.title}</h2>
      {board.description && (
        <p className="text-xs text-white/60 mt-0.5 line-clamp-1">
          {board.description.slice(0, 60)}
        </p>
      )}
      <p className="text-xs text-white/40 mt-1">{relativeTime(board.updatedAt)}</p>
    </div>
  </>
);

function BoardCardItem({ board, isPinned, onTogglePin, onBoardClick }: BoardCardItemProps) {
  const gradient = boardGradient(board);
  return (
    <Card className="relative group aspect-video overflow-hidden hover:shadow-lg transition-shadow rounded-xl border-0">
      {onBoardClick ? (
        <button
          onClick={() => onBoardClick(board.id)}
          className="absolute inset-0 z-0 text-left"
          aria-label={`Open ${board.title}`}
        >
          {cardInnerContent(board, gradient)}
        </button>
      ) : (
        <Link href={`/boards/${board.id}`} className="absolute inset-0 z-0">
          {cardInnerContent(board, gradient)}
        </Link>
      )}

      {/* List count badge */}
      <Badge
        variant="secondary"
        className="absolute bottom-2 right-2 z-10 bg-black/30 text-white/80 border-0 pointer-events-none text-xs"
      >
        {board.listCount} {board.listCount === 1 ? 'list' : 'lists'}
      </Badge>

      {/* Pin button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onTogglePin(board.id)}
        className={`absolute top-2 right-2 z-10 w-7 h-7 bg-black/30 text-white hover:bg-black/50 transition-opacity ${isPinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        title={isPinned ? 'Unpin board' : 'Pin board'}
      >
        <span className="text-sm">{isPinned ? '★' : '☆'}</span>
      </Button>
    </Card>
  );
}

interface BoardsClientProps {
  boards: BoardSummaryResponse[];
  onBoardClick?: (id: string) => void;
}

export function BoardsClient({ boards, onBoardClick }: BoardsClientProps) {
  const [query, setQuery] = useState('');
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    return loadPinned();
  });

  function togglePin(id: string) {
    setPinnedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id];
      localStorage.setItem(PINNED_KEY, JSON.stringify(next));
      return next;
    });
  }

  if (boards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <span className="text-2xl text-muted-foreground">+</span>
        </div>
        <p className="text-foreground font-medium">Create your first board</p>
        <p className="text-muted-foreground text-sm mt-1">
          Click &ldquo;+ New Board&rdquo; to get started
        </p>
      </div>
    );
  }

  const isSearching = query.trim().length > 0;
  const filtered = isSearching
    ? boards.filter((b) => b.title.toLowerCase().includes(query.toLowerCase()))
    : boards;

  const pinned = filtered.filter((b) => pinnedIds.includes(b.id));
  const rest = filtered.filter((b) => !pinnedIds.includes(b.id));

  return (
    <div>
      {/* Search */}
      <div className="mb-6">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search boards..."
          className="w-full max-w-xs"
        />
      </div>

      {/* Pinned section */}
      {pinned.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Pinned
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {pinned.map((board) => (
              <BoardCardItem
                key={board.id}
                board={board}
                isPinned={true}
                onTogglePin={togglePin}
                onBoardClick={onBoardClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* All boards / Search results */}
      {rest.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {isSearching ? 'Search results' : 'All Boards'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {rest.map((board) => (
              <BoardCardItem
                key={board.id}
                board={board}
                isPinned={pinnedIds.includes(board.id)}
                onTogglePin={togglePin}
                onBoardClick={onBoardClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* No search results */}
      {isSearching && filtered.length === 0 && (
        <p className="text-muted-foreground text-sm py-8 text-center">
          No boards match &ldquo;{query}&rdquo;
        </p>
      )}
    </div>
  );
}
