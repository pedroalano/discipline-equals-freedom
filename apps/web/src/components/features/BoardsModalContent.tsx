'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { BoardSummaryResponse, BoardDetailResponse } from '@zenfocus/types';
import { ModalShell } from '@/components/ModalShell';
import { BoardsClient } from '@/app/boards/BoardsClient';
import { BoardCreateButton } from '@/app/boards/BoardCreateButton';
import { KanbanBoard } from '@/app/components/KanbanBoard';
import { BoardSettingsButton } from '@/app/components/BoardSettingsButton';
import { useFeaturesStore } from '@/store/features';

export function BoardsModalContent() {
  const closeFeature = useFeaturesStore((s) => s.closeFeature);
  const openBoard = useFeaturesStore((s) => s.openBoard);
  const backToBoards = useFeaturesStore((s) => s.backToBoards);
  const activeBoardId = useFeaturesStore((s) => s.activeBoardId);
  const qc = useQueryClient();

  const boardsQuery = useQuery<BoardSummaryResponse[]>({
    queryKey: ['boards', 'modal'],
    queryFn: async () => {
      const r = await fetch('/api/boards');
      if (!r.ok) throw new Error(`Failed to load boards (${r.status})`);
      return (await r.json()) as BoardSummaryResponse[];
    },
  });

  const boardDetailQuery = useQuery<BoardDetailResponse>({
    queryKey: ['board', 'modal', activeBoardId],
    queryFn: async () => {
      const r = await fetch(`/api/boards/${activeBoardId}`);
      if (!r.ok) throw new Error(`Failed to load board (${r.status})`);
      return (await r.json()) as BoardDetailResponse;
    },
    enabled: activeBoardId !== null,
  });

  if (activeBoardId === null) {
    return (
      <ModalShell
        title="Boards"
        onClose={closeFeature}
        actions={
          <BoardCreateButton
            onBoardCreated={() => void qc.invalidateQueries({ queryKey: ['boards', 'modal'] })}
          />
        }
      >
        <div className="p-8">
          {boardsQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Loading boards…</p>
          )}
          {boardsQuery.isError && (
            <p className="text-sm text-destructive">Failed to load boards.</p>
          )}
          {boardsQuery.data && <BoardsClient boards={boardsQuery.data} onBoardClick={openBoard} />}
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell
      title={boardDetailQuery.data?.title ?? 'Board'}
      onClose={closeFeature}
      onBack={backToBoards}
      backLabel="Boards"
      actions={
        boardDetailQuery.data ? (
          <BoardSettingsButton
            board={boardDetailQuery.data}
            onDeleteSuccess={() => {
              void qc.invalidateQueries({ queryKey: ['boards', 'modal'] });
              backToBoards();
            }}
          />
        ) : undefined
      }
    >
      {boardDetailQuery.isLoading && (
        <p className="p-8 text-sm text-muted-foreground">Loading board…</p>
      )}
      {boardDetailQuery.isError && (
        <p className="p-8 text-sm text-destructive">Failed to load board.</p>
      )}
      {boardDetailQuery.data && <KanbanBoard initialData={boardDetailQuery.data} />}
    </ModalShell>
  );
}
