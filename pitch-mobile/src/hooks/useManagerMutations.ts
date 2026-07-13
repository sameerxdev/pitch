import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { arriveBooking, completeBooking } from "@/api/bookings";
import { applyManagerSlots } from "@/api/manager";
import { replyToReview } from "@/api/reviews";
import type {
  ApplySlotsRequest,
  ArriveRequest,
  CompleteBookingRequest,
} from "@/api/types";

export function invalidateManagerGroundQueries(
  queryClient: QueryClient,
  groundId: string,
  bookingId?: string,
) {
  const tasks = [
    queryClient.invalidateQueries({ queryKey: ["manager-bookings", groundId] }),
    queryClient.invalidateQueries({ queryKey: ["manager-slots", groundId] }),
    queryClient.invalidateQueries({ queryKey: ["manager-reviews", groundId] }),
    queryClient.invalidateQueries({ queryKey: ["manager-grounds"] }),
  ];
  if (bookingId) {
    tasks.push(
      queryClient.invalidateQueries({
        queryKey: ["manager-booking", groundId, bookingId],
      }),
    );
  }
  return Promise.all(tasks);
}

export function useArriveBooking(groundId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      payload,
    }: {
      bookingId: string;
      payload: ArriveRequest;
    }) => arriveBooking(bookingId, payload),
    onSuccess: async (booking) => {
      await invalidateManagerGroundQueries(
        queryClient,
        groundId,
        booking.id,
      );
    },
  });
}

export function useCompleteBooking(groundId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      payload,
    }: {
      bookingId: string;
      payload: CompleteBookingRequest;
    }) => completeBooking(bookingId, payload),
    onSuccess: async (booking) => {
      await invalidateManagerGroundQueries(
        queryClient,
        groundId,
        booking.id,
      );
    },
  });
}

export function useApplyManagerSlots(groundId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ApplySlotsRequest) =>
      applyManagerSlots(groundId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["manager-slots", groundId],
      });
      await queryClient.invalidateQueries({ queryKey: ["ground-slots"] });
    },
  });
}

export function useReplyToReview(groundId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      reviewId,
      replyText,
    }: {
      reviewId: string;
      replyText: string;
    }) => replyToReview(reviewId, { reply_text: replyText }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["manager-reviews", groundId],
      });
    },
  });
}
