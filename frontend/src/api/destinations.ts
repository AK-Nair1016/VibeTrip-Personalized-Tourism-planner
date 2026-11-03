import type { Destination } from "@vibetrip/shared-types";
import { api, type ApiResponse } from "./axios";

// The 10 supported cities, with a photo, a short description and the airport code.
export async function fetchDestinations(): Promise<Destination[]> {
  const response = await api.get<ApiResponse<Destination[]>>("/destinations");
  return response.data.data;
}
