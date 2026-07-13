import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import type { User } from "@/api/types";
import { Config } from "@/constants/config";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (user: User, access_token: string, refresh_token: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  login: async (user, access_token, refresh_token) => {
    await SecureStore.setItemAsync("access_token", access_token);
    await SecureStore.setItemAsync("refresh_token", refresh_token);
    await SecureStore.setItemAsync("user", JSON.stringify(user));
    set({ user });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("refresh_token");
    await SecureStore.deleteItemAsync("user");
    set({ user: null });
  },

  updateUser: (updates) =>
    set((state) => {
      if (!state.user) return {};
      const updated = { ...state.user, ...updates };
      SecureStore.setItemAsync("user", JSON.stringify(updated)).catch(() => null);
      return { user: updated };
    }),

  loadFromStorage: async () => {
    try {
      if (!Config.PERSIST_AUTH_SESSION) {
        await SecureStore.deleteItemAsync("access_token");
        await SecureStore.deleteItemAsync("refresh_token");
        await SecureStore.deleteItemAsync("user");
        set({ user: null, isLoading: false });
        return;
      }
      const userJson = await SecureStore.getItemAsync("user");
      const user: User | null = userJson ? (JSON.parse(userJson) as User) : null;
      set({ user, isLoading: false });
    } catch {
      set({ user: null, isLoading: false });
    }
  },
}));
