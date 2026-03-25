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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Boards</h1>
        <BoardCreateButton />
      </div>
      {boards.length === 0 ? (
        <p className="text-gray-500">No boards yet. Create your first board!</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {boards.map((board) => (
            <Link
              key={board.id}
              href={`/boards/${board.id}`}
              className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
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
