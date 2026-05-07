import { ThemeToggle } from '@/components/ThemeToggle';

interface AuthShellProps {
  title?: string;
  children: React.ReactNode;
}

export function AuthShell({ title = 'ZenFocus', children }: AuthShellProps) {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <header className="px-6 py-4 border-b border-border bg-background flex items-center gap-3 shrink-0">
        <h1 className="page-title flex-1 truncate">{title}</h1>
        <ThemeToggle />
      </header>
      <div className="flex flex-1 items-center justify-center px-4 py-12">{children}</div>
    </main>
  );
}
