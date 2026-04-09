'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useFeaturesStore } from '@/store/features';
import { usePomodoroStore } from '@/store/pomodoro';
import { TodayModalContent } from '@/components/features/TodayModalContent';
import { ProfileModalContent } from '@/components/features/ProfileModalContent';
import { BoardsModalContent } from '@/components/features/BoardsModalContent';

export function FeatureOverlay() {
  const activeFeature = useFeaturesStore((s) => s.activeFeature);
  const activeBoardId = useFeaturesStore((s) => s.activeBoardId);
  const closeFeature = useFeaturesStore((s) => s.closeFeature);
  const isPomodoroActive = usePomodoroStore((s) => s.status !== 'idle');
  const shouldReduceMotion = useReducedMotion();
  const isOpen = activeFeature !== null && !isPomodoroActive;

  // Close if pomodoro becomes active
  useEffect(() => {
    if (isPomodoroActive && activeFeature !== null) closeFeature();
  }, [isPomodoroActive, activeFeature, closeFeature]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFeature();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, closeFeature]);

  const isKanban = activeFeature === 'boards' && activeBoardId !== null;
  const isBoards = activeFeature === 'boards' && activeBoardId === null;
  const panelClass = isKanban
    ? 'fixed inset-4'
    : isBoards
      ? 'fixed inset-x-0 mx-auto max-w-5xl top-8 bottom-8'
      : 'fixed inset-x-0 mx-auto max-w-2xl top-8 bottom-8';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="feature-backdrop"
            className="fixed inset-0 z-20 bg-black/50 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
            onClick={closeFeature}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            key={`feature-panel-${activeFeature}-${activeBoardId ?? 'list'}`}
            className={`${panelClass} z-[25] rounded-2xl bg-background overflow-hidden flex flex-col shadow-2xl`}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
          >
            {activeFeature === 'today' && <TodayModalContent />}
            {activeFeature === 'profile' && <ProfileModalContent />}
            {activeFeature === 'boards' && <BoardsModalContent />}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
