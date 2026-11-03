import type {
  CurrencyCode,
  Hotel,
  HotelReview,
  HotelSearchResult,
  HotelSort,
  RoomOffer
} from "@vibetrip/shared-types";
import { api, type ApiResponse } from "./axios";

// The dates and guests that every price depends on.
export interface StayParams {
  checkIn: string; // YYYY-MM-DD
  checkOut: string;
  guests: number;
  rooms: number;
  currency: CurrencyCode;
}

export interface HotelSearchParams extends StayParams {
  city: string;
  // Optional filters. Left out of the request when undefined.
  minStars?: number;
  maxPrice?: number; // per night, in `currency`
  sort?: HotelSort;
}

export async function searchHotels(params: HotelSearchParams): Promise<HotelSearchResult> {
  const response = await api.get<ApiResponse<HotelSearchResult>>("/hotels/search", { params });
  return response.data.data;
}

export async function fetchHotel(hotelId: string): Promise<Hotel> {
  const response = await api.get<ApiResponse<Hotel>>(`/hotels/${hotelId}`);
  return response.data.data;
}

// Only rooms that are free for the whole stay come back, priced in the asked currency.
export async function fetchHotelRooms(hotelId: string, params: StayParams): Promise<RoomOffer[]> {
  const response = await api.get<ApiResponse<RoomOffer[]>>(`/hotels/${hotelId}/rooms`, { params });
  return response.data.data;
}

export async function fetchHotelReviews(hotelId: string): Promise<HotelReview[]> {
  const response = await api.get<ApiResponse<HotelReview[]>>(`/hotels/${hotelId}/reviews`);
  return response.data.data;
}
