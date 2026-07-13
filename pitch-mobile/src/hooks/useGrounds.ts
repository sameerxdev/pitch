import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { getGrounds, getGround, getGroundSlots, getGroundReviews } from "@/api/grounds";
import type { GroundSearchParams } from "@/api/types";

export function useGrounds(params: GroundSearchParams = {}) {
  return useInfiniteQuery({
    queryKey: ["grounds", params],
    queryFn: ({ pageParam = 0 }) =>
      getGrounds({ ...params, limit: 20, offset: pageParam as number }),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((acc, p) => acc + p.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    initialPageParam: 0,
  });
}

export function useGround(id: string) {
  return useQuery({
    queryKey: ["ground", id],
    queryFn: () => getGround(id),
    enabled: !!id,
  });
}

export function useGroundSlots(
  groundId: string,
  date: string,
  options: { enabled?: boolean; refetchInterval?: number } = {}
) {
  return useQuery({
    queryKey: ["ground-slots", groundId, date],
    queryFn: () => getGroundSlots(groundId, { date }),
    enabled: options.enabled !== false && !!groundId && !!date,
    refetchInterval: options.refetchInterval,
  });
}

export function useGroundReviews(groundId: string) {
  return useInfiniteQuery({
    queryKey: ["ground-reviews", groundId],
    queryFn: ({ pageParam = 0 }) =>
      getGroundReviews(groundId, { limit: 10, offset: pageParam as number }),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((acc, p) => acc + p.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    initialPageParam: 0,
    enabled: !!groundId,
  });
}
