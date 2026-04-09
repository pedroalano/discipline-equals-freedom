'use client';

import { X } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/ThemeToggle';

interface ModalShellProps {
  title: string;
  onClose: () => void;
  actions?: React.ReactNode;
  onBack?: () => void;
  backLabel?: string;
  children: React.ReactNode;
}

export function ModalShell({
  title,
  onClose,
  actions,
  onBack,
  backLabel,
  children,
}: ModalShellProps) {
  return (
    <div className="flex flex-col h-full">
      <header className="px-6 py-4 border-b border-border bg-background flex items-center gap-3 shrink-0">
        {onBack && (
          <button
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground text-sm shrink-0 transition-colors"
            aria-label={`Back to ${backLabel ?? 'previous'}`}
          >
            ← {backLabel ?? 'Back'}
          </button>
        )}
        {onBack && <Separator orientation="vertical" className="h-4" />}
        <h1 className="page-title flex-1 truncate">{title}</h1>
        <ThemeToggle />
        {actions}
        <button
          onClick={onClose}
          className="ml-2 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close panel"
        >
          <X className="h-4 w-4" />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
