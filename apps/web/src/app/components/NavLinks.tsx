'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, Kanban, Target, UserCircle } from 'lucide-react';
import { useFeaturesStore } from '../../store/features';
import { usePomodoroStore } from '../../store/pomodoro';

const NAV_ITEMS = [
  { key: 'today' as const, label: 'Today', icon: CalendarDays, angleDeg: 0 },
  { key: 'boards' as const, label: 'Boards', icon: Kanban, angleDeg: 45 },
  { key: 'profile' as const, label: 'Profile', icon: UserCircle, angleDeg: 90 },
];
const RADIUS = 72;

function polar(deg: number, r: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: Math.round(r * Math.cos(rad)), y: Math.round(r * Math.sin(rad)) };
}

export function NavLinks() {
  const [isOpen, setIsOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPomodoro = usePomodoroStore((s) => s.status !== 'idle');
  const openFeature = useFeaturesStore((s) => s.openFeature);

  function handleMouseEnter() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setIsOpen(true);
  }

  function handleMouseLeave() {
    closeTimer.current = setTimeout(() => setIsOpen(false), 150);
  }

  return (
    <div
      className={`absolute top-6 left-12 z-10 transition-opacity duration-500 ${
        isPomodoro ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Radial items — rendered before the logo so logo stays on top */}
      <AnimatePresence>
        {isOpen &&
          NAV_ITEMS.map((item, i) => {
            const { x, y } = polar(item.angleDeg, RADIUS);
            const Icon = item.icon;
            return (
              <motion.button
                key={item.key}
                aria-label={item.label}
                onClick={() => {
                  setIsOpen(false);
                  openFeature(item.key);
                }}
                className="absolute top-0 left-0 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-xs text-white backdrop-blur-sm hover:bg-black/50 hover:border-white/40 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/50"
                style={{ translateX: '-50%', translateY: '-50%' }}
                initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                animate={{ x, y, scale: 1, opacity: 1 }}
                exit={{ x: 0, y: 0, scale: 0, opacity: 0, transition: { duration: 0.15 } }}
                transition={{
                  type: 'spring',
                  stiffness: 260,
                  damping: 20,
                  delay: i * 0.07,
                }}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </motion.button>
            );
          })}
      </AnimatePresence>

      {/* Target logo */}
      <motion.button
        aria-label={isOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={isOpen}
        className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full text-white hover:text-white/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/50"
        animate={{ rotate: isOpen ? 45 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        whileTap={{ scale: 0.9 }}
      >
        <Target className="w-8 h-8" />
      </motion.button>
    </div>
  );
}
