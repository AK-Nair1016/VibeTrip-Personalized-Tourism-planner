import type { HotelCard } from "@vibetrip/shared-types";
import { api, type ApiResponse } from "./axios";

// All three calls answer with the whole saved list (newest first), so the caller never
// has to patch its own copy.
export async function fetchWishlist(): Promise<HotelCard[]> {
  const response = await api.get<ApiResponse<HotelCard[]>>("/users/me/wishlist");
  return response.data.data;
}

export async function addToWishlist(hotelId: string): Promise<HotelCard[]> {
  const response = await api.post<ApiResponse<HotelCard[]>>("/users/me/wishlist", { hotelId });
  return response.data.data;
}

export async function removeFromWishlist(hotelId: string): Promise<HotelCard[]> {
  const response = await api.delete<ApiResponse<HotelCard[]>>(`/users/me/wishlist/${hotelId}`);
  return response.data.data;
}
