import { cookies } from 'next/headers';
import Link from 'next/link';
import type { BoardSummaryResponse } from '@zenfocus/types';
import { BoardCreateButton } from './BoardCreateButton';
import { BoardsClient } from './BoardsClient';

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
    <main className="min-h-screen flex flex-col bg-slate-100">
      <header className="px-6 py-4 border-b border-slate-700 bg-slate-800 flex items-center gap-3">
        <Link
          href="/"
          className="text-slate-400 hover:text-white text-sm shrink-0"
          aria-label="Back to dashboard"
        >
          ← Dashboard
        </Link>
        <span className="text-slate-600 text-sm">/</span>
        <h1 className="text-xl font-bold text-white flex-1">Boards</h1>
        <BoardCreateButton />
      </header>
      <div className="flex-1 p-8">
        <BoardsClient boards={boards} />
      </div>
    </main>
  );
}
