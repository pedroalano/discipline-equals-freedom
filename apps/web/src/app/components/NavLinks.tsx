'use client';

import Link from 'next/link';
import { CalendarDays, Kanban, UserCircle } from 'lucide-react';
import { usePomodoroStore } from '../../store/pomodoro';

export function NavLinks() {
  const isPomodoro = usePomodoroStore((s) => s.status !== 'idle');

  return (
    <nav
      className={`absolute top-4 left-4 z-10 flex gap-4 transition-opacity duration-500 ${isPomodoro ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      <Link
        href="/today"
        className="flex items-center gap-1.5 text-sm text-white hover:text-white/80 transition"
      >
        <CalendarDays className="w-3 h-3" />
        Today
      </Link>
      <Link
        href="/boards"
        className="flex items-center gap-1.5 text-sm text-white hover:text-white/80 transition"
      >
        <Kanban className="w-3 h-3" />
        Boards
      </Link>
      <Link
        href="/profile"
        className="flex items-center gap-1.5 text-sm text-white hover:text-white/80 transition"
      >
        <UserCircle className="w-3 h-3" />
        Profile
      </Link>
    </nav>
  );
}
