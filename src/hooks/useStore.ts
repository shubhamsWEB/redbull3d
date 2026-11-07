import { create } from "zustand";

interface State {
  entered: boolean;
  enter: () => void;
  worldsReady: boolean;
  setWorldsReady: () => void;
}

export const useStore = create<State>((set) => ({
  entered: false,
  enter: () => set({ entered: true }),
  worldsReady: false,
  setWorldsReady: () => set({ worldsReady: true }),
}));
