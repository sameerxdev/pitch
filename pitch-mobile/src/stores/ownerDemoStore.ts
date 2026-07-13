import { create } from "zustand";
import type { Ground, ManagerAssignment } from "@/api/types";

type GroundPatch = Partial<Ground>;

interface OwnerDemoState {
  demoVersion: number;
  /** Ground selected on Reviews tab */
  selectedGroundId: string | null;
  groundPatches: Record<string, GroundPatch>;
  addedGrounds: Ground[];
  managersByGroundId: Record<string, ManagerAssignment[]>;
  setSelectedGroundId: (id: string | null) => void;
  patchGround: (id: string, patch: GroundPatch) => void;
  addGround: (ground: Ground) => void;
  setManagersForGround: (groundId: string, managers: ManagerAssignment[]) => void;
  bump: () => void;
}

export const useOwnerDemoStore = create<OwnerDemoState>((set) => ({
  demoVersion: 0,
  selectedGroundId: null,
  groundPatches: {},
  addedGrounds: [],
  managersByGroundId: {},
  setSelectedGroundId: (id) => set({ selectedGroundId: id }),
  patchGround: (id, patch) =>
    set((s) => ({
      groundPatches: { ...s.groundPatches, [id]: { ...s.groundPatches[id], ...patch } },
      demoVersion: s.demoVersion + 1,
    })),
  addGround: (ground) =>
    set((s) => ({
      addedGrounds: [...s.addedGrounds, ground],
      demoVersion: s.demoVersion + 1,
    })),
  setManagersForGround: (groundId, managers) =>
    set((s) => ({
      managersByGroundId: { ...s.managersByGroundId, [groundId]: managers },
      demoVersion: s.demoVersion + 1,
    })),
  bump: () => set((s) => ({ demoVersion: s.demoVersion + 1 })),
}));
