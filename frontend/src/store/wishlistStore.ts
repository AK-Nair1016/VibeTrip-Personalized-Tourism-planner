import { create } from "zustand";
import type { HotelCard } from "@vibetrip/shared-types";
import { addToWishlist, fetchWishlist, removeFromWishlist } from "../api/wishlist";
import { readApiError } from "../utils/apiError";
import { useAuthStore } from "./authStore";

// The search results carry no "saved" flag, so we load the saved list ONCE after login and
// match hotel ids against it. Add and remove both answer with the new full list, which we store as is.
interface WishlistState {
  hotels: HotelCard[]; // newest first, as the backend returns it
  status: "idle" | "loading" | "ready" | "error";
  // True while an add or remove request runs. Only one at a time, because each reply is the
  // whole list and two replies arriving out of order would overwrite each other.
  busy: boolean;
  error: string;
  load: () => Promise<void>;
  add: (hotelId: string) => Promise<void>;
  remove: (hotelId: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  hotels: [],
  status: "idle",
  busy: false,
  error: "",

  load: async () => {
    if (get().status === "loading") {
      return;
    }

    set({ status: "loading", error: "" });
    try {
      const hotels = await fetchWishlist();
      set({ hotels, status: "ready" });
    } catch (error) {
      set({ status: "error", error: readApiError(error).message });
    }
  },

  add: async (hotelId) => {
    set({ busy: true, error: "" });
    try {
      const hotels = await addToWishlist(hotelId);
      set({ hotels, status: "ready" });
    } catch (error) {
      // Includes the 409 "You can save at most 100 hotels" message
      set({ error: readApiError(error).message });
    } finally {
      set({ busy: false });
    }
  },

  remove: async (hotelId) => {
    set({ busy: true, error: "" });
    try {
      const hotels = await removeFromWishlist(hotelId);
      set({ hotels, status: "ready" });
    } catch (error) {
      set({ error: readApiError(error).message });
    } finally {
      set({ busy: false });
    }
  },

  clearError: () => set({ error: "" }),

  // Called on logout so the next person on this browser never sees the previous list
  reset: () => set({ hotels: [], status: "idle", busy: false, error: "" })
}));

// Forget the list the moment the user logs out (token goes from a value to null).
// A token refresh swaps one token for another and never passes through null, so it does not reset.
// This lives here, not in a page, so it works even when the user logs out from a page that has no hearts.
useAuthStore.subscribe((state, previous) => {
  if (previous.accessToken && !state.accessToken) {
    useWishlistStore.getState().reset();
  }
});
