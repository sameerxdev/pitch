import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import {
  getAdminGrounds,
  getAdminReviews,
  getAdminUsers,
  getPlatformAnalytics,
  moderateReview,
  setGroundStatus,
  updateAdminUser,
  verifyGround,
} from "@/api/admin";
import type { GroundStatus, UserRole } from "@/api/types";

const PAGE_SIZE = 20;

/** Moderation actions shift the platform counters, so refresh those too. */
function invalidateAdmin(queryClient: QueryClient, key: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: [key] }),
    queryClient.invalidateQueries({ queryKey: ["admin-analytics"] }),
  ]);
}

export function usePlatformAnalytics(period: "today" | "week" | "month") {
  return useQuery({
    queryKey: ["admin-analytics", period],
    queryFn: () => getPlatformAnalytics(period),
    staleTime: 60_000,
  });
}

// ─── Grounds ─────────────────────────────────────────────────────────────────

export function useAdminGrounds(params: { status?: string; search?: string }) {
  return useInfiniteQuery({
    queryKey: ["admin-grounds", params],
    queryFn: ({ pageParam = 0 }) =>
      getAdminGrounds({ ...params, limit: PAGE_SIZE, offset: pageParam as number }),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((acc, p) => acc + p.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    initialPageParam: 0,
  });
}

export function useVerifyGround() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      groundId,
      approve,
      reason,
    }: {
      groundId: string;
      approve: boolean;
      reason?: string;
    }) => verifyGround(groundId, { approve, reason }),
    onSuccess: () => invalidateAdmin(queryClient, "admin-grounds"),
  });
}

export function useSetGroundStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      groundId,
      status,
      reason,
    }: {
      groundId: string;
      status: GroundStatus;
      reason?: string;
    }) => setGroundStatus(groundId, { status, reason }),
    onSuccess: () => invalidateAdmin(queryClient, "admin-grounds"),
  });
}

// ─── Users ───────────────────────────────────────────────────────────────────

export function useAdminUsers(params: { role?: string; search?: string }) {
  return useInfiniteQuery({
    queryKey: ["admin-users", params],
    queryFn: ({ pageParam = 0 }) =>
      getAdminUsers({ ...params, limit: PAGE_SIZE, offset: pageParam as number }),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((acc, p) => acc + p.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    initialPageParam: 0,
  });
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      role,
      isSuspended,
    }: {
      userId: string;
      role?: UserRole;
      isSuspended?: boolean;
    }) => updateAdminUser(userId, { role, is_suspended: isSuspended }),
    onSuccess: () => invalidateAdmin(queryClient, "admin-users"),
  });
}

// ─── Review moderation ───────────────────────────────────────────────────────

export function useAdminReviews(params: { visible?: boolean }) {
  return useInfiniteQuery({
    queryKey: ["admin-reviews", params],
    queryFn: ({ pageParam = 0 }) =>
      getAdminReviews({ ...params, limit: PAGE_SIZE, offset: pageParam as number }),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((acc, p) => acc + p.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    initialPageParam: 0,
  });
}

export function useModerateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      reviewId,
      isVisible,
    }: {
      reviewId: string;
      isVisible: boolean;
    }) => moderateReview(reviewId, { is_visible: isVisible }),
    onSuccess: () => invalidateAdmin(queryClient, "admin-reviews"),
  });
}
