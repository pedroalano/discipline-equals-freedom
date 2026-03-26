import { cookies } from 'next/headers';
import Link from 'next/link';
import type { BoardSummaryResponse } from '@zenfocus/types';
import { BoardCreateButton } from './BoardCreateButton';

const API_URL = process.env['API_INTERNAL_URL'] ?? 'http://localhost:3001';

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

function formatRelativeTime(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Updated ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Updated ${hrs}h ago`;
  return `Updated ${Math.floor(hrs / 24)}d ago`;
}

async function getBoards(): Promise<BoardSummaryResponse[]> {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';
  const res = await fetch(`${API_URL}/boards`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return res.json() as Promise<BoardSummaryResponse[]>;
}

export default async function BoardsPage() {
  const boards = await getBoards();

  return (
    <main className="p-8">
      <div className="mb-2">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
          ← Dashboard
        </Link>
      </div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Boards</h1>
        <BoardCreateButton />
      </div>
      {boards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <span className="text-2xl text-gray-400">+</span>
          </div>
          <p className="text-gray-500 font-medium">Create your first board</p>
          <p className="text-gray-400 text-sm mt-1">
            Click &ldquo;+ New Board&rdquo; to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {boards.map((board) => (
            <Link
              key={board.id}
              href={`/boards/${board.id}`}
              className="block aspect-video relative rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${boardGradient(board)}`} />
              <div className="absolute inset-0 bg-black/20" />
              <div className="relative h-full flex flex-col justify-end p-4">
                <h2 className="font-bold text-lg text-white leading-tight">{board.title}</h2>
                <p className="text-sm text-white/70 mt-0.5">
                  {formatRelativeTime(board.updatedAt)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
