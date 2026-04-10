import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/ThemeToggle';

interface PageShellProps {
  backHref: string;
  backLabel: string;
  title: string;
  actions?: React.ReactNode;
  fullHeight?: boolean;
  children: React.ReactNode;
}

export function PageShell({
  backHref,
  backLabel,
  title,
  actions,
  fullHeight,
  children,
}: PageShellProps) {
  return (
    <main className={`flex flex-col bg-background ${fullHeight ? 'h-screen' : 'min-h-screen'}`}>
      <header className="px-6 py-4 border-b border-border bg-background flex items-center gap-3 shrink-0">
        <Link
          href={backHref}
          className="text-muted-foreground hover:text-foreground text-sm shrink-0 transition-colors"
          aria-label={`Back to ${backLabel}`}
        >
          ← {backLabel}
        </Link>
        <Separator orientation="vertical" className="h-4" />
        <h1 className="page-title flex-1 truncate">{title}</h1>
        <ThemeToggle />
        {actions}
      </header>
      <div className={`flex-1 ${fullHeight ? 'overflow-x-auto' : ''}`}>{children}</div>
    </main>
  );
}
