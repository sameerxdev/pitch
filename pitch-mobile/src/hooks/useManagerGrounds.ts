import { useQuery } from "@tanstack/react-query";
import { getManagerGrounds } from "@/api/manager";

export function useManagerGrounds() {
  return useQuery({
    queryKey: ["manager-grounds"],
    queryFn: getManagerGrounds,
    staleTime: 30_000,
  });
}
