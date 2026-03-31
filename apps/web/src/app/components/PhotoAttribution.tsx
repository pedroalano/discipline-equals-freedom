'use client';

import { usePomodoroStore } from '../../store/pomodoro';

interface PhotoAttributionProps {
  author: string;
  authorUrl: string;
}

export function PhotoAttribution({ author, authorUrl }: PhotoAttributionProps) {
  const isPomodoro = usePomodoroStore((s) => s.status !== 'idle');

  return (
    <a
      href={authorUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`absolute bottom-3 right-4 z-10 text-xs text-white/40 hover:text-white/70 transition-opacity duration-500 ${isPomodoro ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      Photo by {author} on Unsplash
    </a>
  );
}
