import { create } from 'zustand';

export type FeatureName = 'today' | 'boards' | 'profile';

interface FeaturesState {
  activeFeature: FeatureName | null;
  activeBoardId: string | null;
  openFeature: (feature: FeatureName) => void;
  openBoard: (id: string) => void;
  closeFeature: () => void;
  backToBoards: () => void;
}

export const useFeaturesStore = create<FeaturesState>((set) => ({
  activeFeature: null,
  activeBoardId: null,
  openFeature: (feature) => set({ activeFeature: feature, activeBoardId: null }),
  openBoard: (id) => set({ activeBoardId: id }),
  closeFeature: () => set({ activeFeature: null, activeBoardId: null }),
  backToBoards: () => set({ activeBoardId: null }),
}));
