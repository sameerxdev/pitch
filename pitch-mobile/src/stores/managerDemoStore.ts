import { create } from "zustand";
import type { Booking, Review } from "@/api/types";

type BookingPatch = Partial<Booking>;
type ReviewPatch = Partial<Review>;

interface ManagerDemoState {
  /** Bumps when demo booking/review data mutates so React Query refetches. */
  demoVersion: number;
  bookingByIdPatch: Record<string, BookingPatch>;
  reviewByIdPatch: Record<string, ReviewPatch>;
  patchBooking: (id: string, patch: BookingPatch) => void;
  patchReview: (reviewId: string, patch: ReviewPatch) => void;
}

export const useManagerDemoStore = create<ManagerDemoState>((set) => ({
  demoVersion: 0,
  bookingByIdPatch: {},
  reviewByIdPatch: {},
  patchBooking: (id, patch) =>
    set((s) => ({
      bookingByIdPatch: {
        ...s.bookingByIdPatch,
        [id]: { ...s.bookingByIdPatch[id], ...patch },
      },
      demoVersion: s.demoVersion + 1,
    })),
  patchReview: (reviewId, patch) =>
    set((s) => ({
      reviewByIdPatch: {
        ...s.reviewByIdPatch,
        [reviewId]: { ...s.reviewByIdPatch[reviewId], ...patch },
      },
      demoVersion: s.demoVersion + 1,
    })),
}));
