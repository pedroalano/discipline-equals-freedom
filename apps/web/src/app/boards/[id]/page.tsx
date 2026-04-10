import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import type { BoardDetailResponse } from '@zenfocus/types';
import { PageShell } from '@/components/PageShell';
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
    <PageShell
      backHref="/boards"
      backLabel="Boards"
      title={board.title}
      actions={<BoardSettingsButton board={board} />}
      fullHeight
    >
      <KanbanBoard initialData={board} />
    </PageShell>
  );
}
