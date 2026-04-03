'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { BoardSummaryResponse } from '@zenfocus/types';

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
}

function BoardCardItem({ board, isPinned, onTogglePin }: BoardCardItemProps) {
  return (
    <div className="relative group aspect-video rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
      <Link href={`/boards/${board.id}`} className="absolute inset-0 z-0">
        <div className={`absolute inset-0 bg-gradient-to-br ${boardGradient(board)}`} />
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative h-full flex flex-col justify-end p-4">
          <h2 className="font-bold text-lg text-white leading-tight">{board.title}</h2>
          {board.description && (
            <p className="text-xs text-white/60 mt-0.5 line-clamp-1">
              {board.description.slice(0, 60)}
            </p>
          )}
        </div>
      </Link>

      {/* List count badge */}
      <div className="absolute bottom-2 right-2 z-10 bg-black/30 text-white/80 text-xs rounded px-1.5 py-0.5 pointer-events-none">
        {board.listCount} {board.listCount === 1 ? 'list' : 'lists'}
      </div>

      {/* Pin button */}
      <button
        onClick={() => onTogglePin(board.id)}
        className={`absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-black/30 text-white transition-opacity ${isPinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        title={isPinned ? 'Unpin board' : 'Pin board'}
      >
        <span className="text-sm">{isPinned ? '★' : '☆'}</span>
      </button>
    </div>
  );
}

interface BoardsClientProps {
  boards: BoardSummaryResponse[];
}

export function BoardsClient({ boards }: BoardsClientProps) {
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
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <span className="text-2xl text-gray-400">+</span>
        </div>
        <p className="text-gray-500 font-medium">Create your first board</p>
        <p className="text-gray-400 text-sm mt-1">Click &ldquo;+ New Board&rdquo; to get started</p>
      </div>
    );
  }

  const isSearching = query.trim().length > 0;
  const filtered = isSearching
    ? boards.filter((b) => b.title.toLowerCase().includes(query.toLowerCase()))
    : boards;

  const pinned = isSearching ? [] : filtered.filter((b) => pinnedIds.includes(b.id));
  const rest = isSearching ? filtered : filtered.filter((b) => !pinnedIds.includes(b.id));

  return (
    <div>
      {/* Search */}
      <div className="mb-6">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search boards..."
          className="w-full max-w-xs px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      {/* Pinned section */}
      {!isSearching && pinned.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Pinned
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {pinned.map((board) => (
              <BoardCardItem key={board.id} board={board} isPinned={true} onTogglePin={togglePin} />
            ))}
          </div>
        </div>
      )}

      {/* All boards / Search results */}
      {rest.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            {isSearching ? 'Search results' : 'All Boards'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {rest.map((board) => (
              <BoardCardItem
                key={board.id}
                board={board}
                isPinned={pinnedIds.includes(board.id)}
                onTogglePin={togglePin}
              />
            ))}
          </div>
        </div>
      )}

      {/* No search results */}
      {isSearching && filtered.length === 0 && (
        <p className="text-gray-400 text-sm py-8 text-center">
          No boards match &ldquo;{query}&rdquo;
        </p>
      )}
    </div>
  );
}
