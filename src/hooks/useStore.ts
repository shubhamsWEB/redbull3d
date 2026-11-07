import { create } from "zustand";

interface State {
  entered: boolean;
  enter: () => void;
  busy: number; // 3D scenes still compiling
  wiping: boolean; // Page wipe closing: the outgoing page stops rendering so the wipe gets the GPU
  setWiping: (v: boolean) => void;
  busyEver: boolean;
  addBusy: () => void;
  doneBusy: () => void;
}

export const useStore = create<State>((set) => ({
  entered: false,
  enter: () => set({ entered: true }),
  busy: 0,
  wiping: false,
  setWiping: (wiping) => set({ wiping }),
  busyEver: false,
  addBusy: () => set((s) => ({ busy: s.busy + 1, busyEver: true })),
  doneBusy: () => set((s) => ({ busy: Math.max(0, s.busy - 1) })),
}));
