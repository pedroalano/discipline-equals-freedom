import { cookies } from 'next/headers';
import Link from 'next/link';
import type { BoardSummaryResponse } from '@zenfocus/types';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/ThemeToggle';
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
    <main className="min-h-screen flex flex-col bg-background">
      <header className="px-6 py-4 border-b border-border bg-background flex items-center gap-3">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground text-sm shrink-0"
          aria-label="Back to dashboard"
        >
          ← Dashboard
        </Link>
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-xl font-bold text-foreground flex-1">Boards</h1>
        <ThemeToggle />
        <BoardCreateButton />
      </header>
      <div className="flex-1 p-8">
        <BoardsClient boards={boards} />
      </div>
    </main>
  );
}
