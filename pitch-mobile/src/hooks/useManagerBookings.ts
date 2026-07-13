import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getManagerBookings,
  getManagerBookingDetail,
  getManagerReviews,
  getManagerSlots,
  updateSlot as apiUpdateSlot,
} from "@/api/manager";

export function useManagerBookings(
  groundId: string,
  params: { date?: string; status?: string } = {},
) {
  return useInfiniteQuery({
    queryKey: ["manager-bookings", groundId, params],
    queryFn: ({ pageParam = 0 }) =>
      getManagerBookings(groundId, {
        ...params,
        limit: 20,
        offset: pageParam as number,
      }),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((acc, p) => acc + p.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    initialPageParam: 0,
    enabled: !!groundId,
  });
}

export function useManagerBookingDetail(groundId: string, bookingId: string) {
  return useQuery({
    queryKey: ["manager-booking", groundId, bookingId],
    queryFn: () => getManagerBookingDetail(groundId, bookingId),
    enabled: !!groundId && !!bookingId,
  });
}

export function useManagerSlots(
  groundId: string,
  date: string,
  options: { refetchInterval?: number } = {},
) {
  return useQuery({
    queryKey: ["manager-slots", groundId, date],
    queryFn: () => getManagerSlots(groundId, { date }),
    enabled: !!groundId && !!date,
    refetchInterval: options.refetchInterval,
  });
}

export function useManagerReviews(groundId: string) {
  return useInfiniteQuery({
    queryKey: ["manager-reviews", groundId],
    queryFn: ({ pageParam = 0 }) =>
      getManagerReviews(groundId, {
        sort: "newest",
        limit: 15,
        offset: pageParam as number,
      }),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((acc, p) => acc + p.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    initialPageParam: 0,
    enabled: !!groundId,
  });
}

export function useUpdateManagerSlot(groundId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      slotId,
      date,
      updates,
    }: {
      slotId: string;
      date: string;
      updates: { status?: "blocked" | "available"; price?: number };
    }) => apiUpdateSlot(groundId, slotId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["manager-slots", groundId, variables.date],
      });
    },
  });
}
