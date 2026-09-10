import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import {
  applyOwnerSlots,
  assignManager,
  createGroundWithPhotos,
  getGroundManagers,
  getOwnerAnalytics,
  getOwnerGround,
  getOwnerGrounds,
  getOwnerReviews,
  getOwnerSlots,
  removeManager,
  updateGround,
  updateOwnerSlot,
} from "@/api/owner";
import { replyToReview } from "@/api/reviews";
import type {
  ApplySlotsRequest,
  AssignManagerRequest,
  CreateGroundRequest,
} from "@/api/types";

/** Anything that changes a ground invalidates its list entry and its detail. */
function invalidateGround(queryClient: QueryClient, groundId?: string) {
  const tasks = [
    queryClient.invalidateQueries({ queryKey: ["owner-grounds"] }),
    queryClient.invalidateQueries({ queryKey: ["owner-analytics"] }),
  ];
  if (groundId) {
    tasks.push(
      queryClient.invalidateQueries({ queryKey: ["owner-ground", groundId] }),
    );
  }
  return Promise.all(tasks);
}

// ─── Grounds ─────────────────────────────────────────────────────────────────

export function useOwnerGrounds() {
  return useQuery({
    queryKey: ["owner-grounds"],
    queryFn: getOwnerGrounds,
    staleTime: 30_000,
  });
}

export function useOwnerGround(groundId: string) {
  return useQuery({
    queryKey: ["owner-ground", groundId],
    queryFn: () => getOwnerGround(groundId),
    enabled: !!groundId,
  });
}

export function useCreateGround() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      payload,
      photoUris,
    }: {
      payload: CreateGroundRequest;
      photoUris: string[];
    }) => createGroundWithPhotos(payload, photoUris),
    onSuccess: () => invalidateGround(queryClient),
  });
}

export function useUpdateGround(groundId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      updates: Partial<CreateGroundRequest> & { is_active?: boolean },
    ) => updateGround(groundId, updates),
    onSuccess: () => invalidateGround(queryClient, groundId),
  });
}

// ─── Slots ───────────────────────────────────────────────────────────────────

export function useOwnerSlots(
  groundId: string,
  date: string,
  options: { refetchInterval?: number } = {},
) {
  return useQuery({
    queryKey: ["owner-slots", groundId, date],
    queryFn: () => getOwnerSlots(groundId, { date }),
    enabled: !!groundId && !!date,
    refetchInterval: options.refetchInterval,
  });
}

export function useUpdateOwnerSlot(groundId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      slotId,
      updates,
    }: {
      slotId: string;
      date: string;
      updates: { status?: "blocked" | "available"; price?: number };
    }) => updateOwnerSlot(groundId, slotId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["owner-slots", groundId, variables.date],
      });
      // Players read the same slots through the public endpoint.
      queryClient.invalidateQueries({ queryKey: ["ground-slots"] });
    },
  });
}

export function useApplyOwnerSlots(groundId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ApplySlotsRequest) =>
      applyOwnerSlots(groundId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["owner-slots", groundId] });
      await queryClient.invalidateQueries({ queryKey: ["ground-slots"] });
    },
  });
}

// ─── Managers ────────────────────────────────────────────────────────────────

export function useGroundManagers(groundId: string) {
  return useQuery({
    queryKey: ["ground-managers", groundId],
    queryFn: () => getGroundManagers(groundId),
    enabled: !!groundId,
  });
}

export function useAssignManager(groundId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AssignManagerRequest) =>
      assignManager(groundId, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["ground-managers", groundId] }),
  });
}

export function useRemoveManager(groundId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    // Pass the assignment id for invites that have no user account yet.
    mutationFn: (id: string) => removeManager(groundId, id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["ground-managers", groundId] }),
  });
}

// ─── Analytics & reviews ─────────────────────────────────────────────────────

export function useOwnerAnalytics(
  period: "today" | "week" | "month",
  groundId?: string,
) {
  return useQuery({
    queryKey: ["owner-analytics", period, groundId ?? null],
    queryFn: () => getOwnerAnalytics({ period, ground_id: groundId }),
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useOwnerReviews(groundId: string) {
  return useInfiniteQuery({
    queryKey: ["owner-reviews", groundId],
    queryFn: ({ pageParam = 0 }) =>
      getOwnerReviews(groundId, {
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

export function useReplyToOwnerReview(groundId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      reviewId,
      replyText,
    }: {
      reviewId: string;
      replyText: string;
    }) => replyToReview(reviewId, { reply_text: replyText }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["owner-reviews", groundId] }),
  });
}
