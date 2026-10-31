import type { Destination } from "@vibetrip/shared-types";
import { CITIES } from "../config/cities";

// The 10 cities come from config, not a collection: they change with a code change, never at runtime.
export const getDestinations = (): Destination[] => {
  const destinations: Destination[] = [];

  for (const entry of CITIES) {
    destinations.push({
      city: entry.city,
      code: entry.code,
      country: entry.country,
      description: entry.description,
      image: entry.image,
      lat: entry.lat,
      lng: entry.lng,
    });
  }

  return destinations;
};
