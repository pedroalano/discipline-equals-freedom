import { cookies } from 'next/headers';
import type { BoardSummaryResponse } from '@zenfocus/types';
import { PageShell } from '@/components/PageShell';
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
    <PageShell backHref="/" backLabel="Dashboard" title="Boards" actions={<BoardCreateButton />}>
      <div className="p-8">
        <BoardsClient boards={boards} />
      </div>
    </PageShell>
  );
}
