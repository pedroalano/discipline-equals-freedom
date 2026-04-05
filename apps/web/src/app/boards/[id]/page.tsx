import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { BoardDetailResponse } from '@zenfocus/types';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/ThemeToggle';
import { KanbanBoard } from '../../components/KanbanBoard';
import { BoardSettingsButton } from '../../components/BoardSettingsButton';

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
      <header className="px-6 py-4 border-b border-border bg-background flex items-center gap-3">
        <Link
          href="/boards"
          className="text-muted-foreground hover:text-foreground text-sm shrink-0"
          aria-label="Back to boards"
        >
          ← Boards
        </Link>
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-xl font-bold text-foreground truncate flex-1">{board.title}</h1>
        <ThemeToggle />
        <BoardSettingsButton board={board} />
      </header>
      <div className="flex-1 overflow-x-auto">
        <KanbanBoard initialData={board} />
      </div>
    </main>
  );
}
