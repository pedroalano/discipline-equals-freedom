import { cookies } from 'next/headers';
import Link from 'next/link';
import type { BoardSummaryResponse } from '@zenfocus/types';
import { BoardCreateButton } from './BoardCreateButton';

const API_URL = process.env['API_INTERNAL_URL'] ?? 'http://localhost:3001';

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
              className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 border-l-4 border-l-indigo-400"
            >
              <h2 className="font-semibold text-lg">{board.title}</h2>
              <p className="text-sm text-gray-400 mt-1">
                {new Date(board.updatedAt).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
