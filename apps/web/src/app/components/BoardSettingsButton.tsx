'use client';

import { useState } from 'react';
import { BoardSettingsPanel } from './BoardSettingsPanel';
import type { BoardSummaryResponse } from '@zenfocus/types';

export function BoardSettingsButton({ board }: { board: BoardSummaryResponse }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-slate-400 hover:text-white text-lg transition-colors shrink-0"
        aria-label="Board settings"
      >
        ⚙
      </button>
      {open && <BoardSettingsPanel board={board} onClose={() => setOpen(false)} />}
    </>
  );
}
