import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { BoardDetailResponse } from '@zenfocus/types';
import { KanbanBoard } from '../../components/KanbanBoard';

const API_URL = process.env['API_INTERNAL_URL'] ?? 'http://localhost:3001';

async function getBoard(id: string): Promise<BoardDetailResponse | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';
  const res = await fetch(`${API_URL}/boards/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (res.status === 404 || res.status === 403) return null;
  if (!res.ok) return null;
  return res.json() as Promise<BoardDetailResponse>;
}

export default async function BoardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const board = await getBoard(id);
  if (!board) notFound();

  return (
    <main className="h-screen flex flex-col">
      <header className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex flex-col gap-1">
        <Link
          href="/boards"
          className="text-gray-400 hover:text-gray-700 text-sm"
          aria-label="Back to boards"
        >
          ← Back to boards
        </Link>
        <h1 className="text-xl font-bold">{board.title}</h1>
      </header>
      <div className="flex-1 overflow-x-auto">
        <KanbanBoard initialData={board} />
      </div>
    </main>
  );
}
