import type { HotelReview } from "@vibetrip/shared-types";
import { api, type ApiResponse } from "./axios";

export interface CreateReviewInput {
  bookingId: string;
  rating: number; // whole number 1 to 5, sent as a real number
  text: string; // 10 to 2000 characters
}

export async function createReview(input: CreateReviewInput): Promise<HotelReview> {
  const response = await api.post<ApiResponse<HotelReview>>("/reviews", input);
  return response.data.data;
}
