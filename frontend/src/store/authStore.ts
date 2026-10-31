import { create } from "zustand";
import type { User } from "@vibetrip/shared-types";

// The access token lives only in memory (never localStorage), so a script injected into the
// page cannot read it. A page reload loses it; the refresh cookie gets a new one.
interface AuthState {
  accessToken: string | null;
  user: User | null;
  // True until the first "am I still logged in?" check finishes, so private pages wait
  // instead of bouncing a logged-in user to /login on every reload.
  isCheckingSession: boolean;
  setSession: (accessToken: string, user: User | null) => void;
  setAccessToken: (accessToken: string) => void;
  clearSession: () => void;
  finishSessionCheck: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isCheckingSession: true,
  setSession: (accessToken, user) => set({ accessToken, user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  clearSession: () => set({ accessToken: null, user: null }),
  finishSessionCheck: () => set({ isCheckingSession: false }),
}));
