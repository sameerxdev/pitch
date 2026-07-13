import { useQuery } from "@tanstack/react-query";
import { getOwnerAnalytics } from "@/data/ownerDemo";
import { useOwnerDemoStore } from "@/stores/ownerDemoStore";

export function useAnalytics(
  period: "today" | "week" | "month",
  groundId?: string,
) {
  const demoVersion = useOwnerDemoStore((s) => s.demoVersion);
  return useQuery({
    queryKey: ["analytics", period, groundId, demoVersion],
    queryFn: () => getOwnerAnalytics({ period, ground_id: groundId }),
    refetchInterval: 5 * 60 * 1000,
  });
}
