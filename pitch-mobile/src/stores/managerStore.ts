import { create } from "zustand";
import type { ManagerGround } from "@/api/types";

interface ManagerState {
  activeGround: ManagerGround | null;
  assignedGrounds: ManagerGround[];
  setAssignedGrounds: (grounds: ManagerGround[]) => void;
  setActiveGround: (ground: ManagerGround) => void;
  /** Clears selection only (e.g. switch ground); keeps assignedGrounds list. */
  releaseActiveGround: () => void;
  clearActiveGround: () => void;
}

export const useManagerStore = create<ManagerState>((set) => ({
  activeGround: null,
  assignedGrounds: [],
  setAssignedGrounds: (grounds) => set({ assignedGrounds: grounds }),
  setActiveGround: (ground) => set({ activeGround: ground }),
  releaseActiveGround: () => set({ activeGround: null }),
  clearActiveGround: () => set({ activeGround: null, assignedGrounds: [] }),
}));
