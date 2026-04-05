'use client';

import { useState } from 'react';
import { Settings } from 'lucide-react';
import type { BoardSummaryResponse } from '@zenfocus/types';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BoardSettingsPanel } from './BoardSettingsPanel';

export function BoardSettingsButton({ board }: { board: BoardSummaryResponse }) {
  const [open, setOpen] = useState(false);
  return (
    <TooltipProvider>
      <Sheet open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Board settings">
                <Settings className="h-4 w-4" />
              </Button>
            </SheetTrigger>
          </TooltipTrigger>
          <TooltipContent>Board settings</TooltipContent>
        </Tooltip>
        <SheetContent side="right" className="w-80 p-0">
          <BoardSettingsPanel board={board} onClose={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}
