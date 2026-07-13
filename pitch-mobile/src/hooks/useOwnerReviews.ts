import { useInfiniteQuery } from "@tanstack/react-query";
import { getOwnerReviewsPage } from "@/data/ownerDemo";
import { useManagerDemoStore } from "@/stores/managerDemoStore";
import { useOwnerDemoStore } from "@/stores/ownerDemoStore";

export function useOwnerReviews(groundId: string) {
  const demoVersion = useOwnerDemoStore((s) => s.demoVersion);
  const reviewPatches = useManagerDemoStore((s) => s.demoVersion);
  return useInfiniteQuery({
    queryKey: ["owner-reviews", groundId, demoVersion, reviewPatches],
    queryFn: ({ pageParam = 0 }) =>
      Promise.resolve(
        getOwnerReviewsPage(groundId, {
          sort: "newest",
          limit: 15,
          offset: pageParam as number,
        }),
      ),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((acc, p) => acc + p.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    initialPageParam: 0,
    enabled: !!groundId,
  });
}
