import { create } from "zustand";
import type { GroundSlotSchedule, Slot } from "@/api/types";

export function slotsCacheKey(groundId: string, date: string): string {
  return `${groundId}:${date}`;
}

interface SlotDemoState {
  demoVersion: number;
  scheduleByGroundId: Record<string, GroundSlotSchedule>;
  slotsByKey: Record<string, Slot[]>;
  setSchedule: (groundId: string, schedule: GroundSlotSchedule) => void;
  setSlotsForDate: (groundId: string, date: string, slots: Slot[]) => void;
  updateSlot: (groundId: string, date: string, slotId: string, patch: Partial<Slot>) => void;
  getSlotsForDate: (groundId: string, date: string) => Slot[] | undefined;
  bump: () => void;
}

export const useSlotDemoStore = create<SlotDemoState>((set, get) => ({
  demoVersion: 0,
  scheduleByGroundId: {},
  slotsByKey: {},
  setSchedule: (groundId, schedule) =>
    set((s) => ({
      scheduleByGroundId: { ...s.scheduleByGroundId, [groundId]: schedule },
      demoVersion: s.demoVersion + 1,
    })),
  setSlotsForDate: (groundId, date, slots) =>
    set((s) => ({
      slotsByKey: {
        ...s.slotsByKey,
        [slotsCacheKey(groundId, date)]: slots,
      },
      demoVersion: s.demoVersion + 1,
    })),
  updateSlot: (groundId, date, slotId, patch) => {
    const key = slotsCacheKey(groundId, date);
    const current = get().slotsByKey[key];
    if (!current) return;
    set((s) => ({
      slotsByKey: {
        ...s.slotsByKey,
        [key]: current.map((sl) =>
          sl.id === slotId ? { ...sl, ...patch } : sl,
        ),
      },
      demoVersion: s.demoVersion + 1,
    }));
  },
  getSlotsForDate: (groundId, date) =>
    get().slotsByKey[slotsCacheKey(groundId, date)],
  bump: () => set((s) => ({ demoVersion: s.demoVersion + 1 })),
}));
