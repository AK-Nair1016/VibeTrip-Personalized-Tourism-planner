import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useWishlistStore } from "../../store/wishlistStore";

// What a page needs to draw hearts: which hotels are saved, and a toggle that does the right thing.
// Call it once per page and pass `isSaved` and `toggle` down to the cards.
export function useWishlist() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isCheckingSession = useAuthStore((state) => state.isCheckingSession);
  const navigate = useNavigate();
  const location = useLocation();

  const hotels = useWishlistStore((state) => state.hotels);
  const status = useWishlistStore((state) => state.status);
  const busy = useWishlistStore((state) => state.busy);
  const error = useWishlistStore((state) => state.error);
  const load = useWishlistStore((state) => state.load);
  const add = useWishlistStore((state) => state.add);
  const remove = useWishlistStore((state) => state.remove);
  const clearError = useWishlistStore((state) => state.clearError);

  // Logged in and nothing loaded yet: fetch the list once. (Logging out clears it: see wishlistStore.ts.)
  useEffect(() => {
    if (accessToken && status === "idle") {
      load();
    }
  }, [accessToken, status, load]);

  function isSaved(hotelId: string): boolean {
    return hotels.some((hotel) => hotel.id === hotelId);
  }

  // Hearts are disabled while the list is loading (we do not know yet if a hotel is saved)
  // or while another add/remove is running.
  const canToggle = !busy && status !== "loading";

  async function toggle(hotelId: string) {
    if (isCheckingSession) {
      return;
    }

    // Logged out: send the visitor to log in and bring them back here afterwards
    if (!accessToken) {
      navigate("/login", { state: { from: location } });
      return;
    }

    if (!canToggle) {
      return;
    }

    if (isSaved(hotelId)) {
      await remove(hotelId);
    } else {
      await add(hotelId);
    }
  }

  return { hotels, status, error, canToggle, isSaved, toggle, add, remove, reload: load, clearError };
}
