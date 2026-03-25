import { create } from 'zustand';

interface BoardUIState {
  isDragging: boolean;
  draggedCardId: string | null;
  setDragging: (cardId: string | null) => void;
}

export const useBoardUIStore = create<BoardUIState>((set) => ({
  isDragging: false,
  draggedCardId: null,
  setDragging: (cardId) => set({ isDragging: cardId !== null, draggedCardId: cardId }),
}));
