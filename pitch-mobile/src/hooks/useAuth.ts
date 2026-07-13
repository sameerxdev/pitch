import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMe, updateMe, deleteAccount, logout as apiLogout } from "@/api/auth";
import { useAuthStore } from "@/stores/authStore";
import type { User } from "@/api/types";

export function useMe() {
  const { user, updateUser } = useAuthStore();
  return useQuery({
    queryKey: ["users", "me"],
    queryFn: async () => {
      const me = await getMe();
      updateUser(me);
      return me;
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

export function useUpdateMe() {
  const queryClient = useQueryClient();
  const { updateUser } = useAuthStore();
  return useMutation({
    mutationFn: (updates: Partial<Pick<User, "full_name" | "city" | "fcm_token">>) =>
      updateMe(updates),
    onSuccess: (user) => {
      updateUser(user);
      queryClient.setQueryData(["users", "me"], user);
    },
  });
}

export function useLogout() {
  const { logout: clearLocal } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      try {
        await apiLogout();
      } finally {
        await clearLocal();
        queryClient.clear();
      }
    },
  });
}

export function useDeleteAccount() {
  const { logout: clearLocal } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await deleteAccount();
      await clearLocal();
      queryClient.clear();
    },
  });
}
