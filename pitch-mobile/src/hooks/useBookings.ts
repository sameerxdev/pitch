import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBooking, getBookings, cancelBooking } from "@/api/bookings";

export type BookingRouteParams = {
  groundName?: string;
  groundArea?: string;
  slotDate?: string;
  startHour?: string;
  endHour?: string;
  totalPrice?: string;
  advanceAmount?: string;
  qrToken?: string;
  remainder?: string;
};

/** API booking with optional route-param fallback (e.g. right after payment). */
export function useResolvedBooking(
  id: string | undefined,
  params: BookingRouteParams = {},
) {
  const { data: booking, isLoading, isError } = useBooking(id ?? "");

  const startHour =
    booking?.start_hour ?? parseInt(params.startHour ?? "0", 10);
  const endHour = booking?.end_hour ?? parseInt(params.endHour ?? "0", 10);
  const totalPrice =
    booking?.total_price ?? parseFloat(params.totalPrice ?? "0");
  const advanceAmount =
    booking?.advance_amount ?? parseFloat(params.advanceAmount ?? "0");
  const remainder =
    booking != null
      ? booking.total_price - booking.advance_amount
      : params.remainder != null
        ? parseFloat(params.remainder)
        : totalPrice - advanceAmount;

  return {
    booking,
    isLoading: isLoading && !booking,
    isError,
    groundName: booking?.ground_name ?? params.groundName ?? "",
    groundArea: booking?.ground_area ?? params.groundArea ?? "",
    slotDate: booking?.slot_date ?? params.slotDate ?? "",
    startHour,
    endHour,
    totalPrice,
    advanceAmount,
    remainder,
    qrToken: booking?.qr_code ?? params.qrToken ?? "",
    bookingRef: (id ?? "").slice(0, 8).toUpperCase(),
  };
}

export function useBookings(status?: string) {
  return useInfiniteQuery({
    queryKey: ["bookings", status],
    queryFn: ({ pageParam = 0 }) =>
      getBookings({ status, limit: 20, offset: pageParam as number }),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((acc, p) => acc + p.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    initialPageParam: 0,
  });
}

export function useBooking(id: string, options: { refetchInterval?: number } = {}) {
  return useQuery({
    queryKey: ["booking", id],
    queryFn: () => getBooking(id),
    enabled: !!id,
    refetchInterval: options.refetchInterval,
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}
