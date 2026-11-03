import type { PropertyType } from "@vibetrip/shared-types";

// "apartment" -> "Apartment"
export function propertyTypeLabel(type: PropertyType): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

// 4 -> "★★★★"
export function starsText(starRating: number): string {
  return "★".repeat(Math.round(starRating));
}

// Words for the 0 to 5 guest rating. A hotel with no reviews yet has rating 0, which is not "bad".
export function ratingLabel(guestRating: number, reviewCount: number): string {
  if (reviewCount === 0) {
    return "New";
  }
  if (guestRating >= 4.5) {
    return "Excellent";
  }
  if (guestRating >= 4) {
    return "Very good";
  }
  if (guestRating >= 3) {
    return "Good";
  }
  return "Fair";
}

// The amenity names come from the seed data. Anything unknown gets a plain tick.
export function amenityIcon(amenity: string): string {
  const name = amenity.toLowerCase();

  if (name.includes("wi-fi") || name.includes("wifi")) {
    return "wifi";
  }
  if (name.includes("pool")) {
    return "pool";
  }
  if (name.includes("spa")) {
    return "spa";
  }
  if (name.includes("gym")) {
    return "fitness_center";
  }
  if (name.includes("restaurant")) {
    return "restaurant";
  }
  if (name.includes("breakfast")) {
    return "coffee";
  }
  if (name.includes("bar")) {
    return "local_bar";
  }
  if (name.includes("shuttle")) {
    return "airport_shuttle";
  }
  if (name.includes("kitchen")) {
    return "kitchen";
  }
  if (name.includes("washing")) {
    return "local_laundry_service";
  }
  if (name.includes("beach")) {
    return "beach_access";
  }
  if (name.includes("garden") || name.includes("terrace")) {
    return "deck";
  }
  if (name.includes("reception")) {
    return "room_service";
  }
  if (name.includes("parking")) {
    return "local_parking";
  }
  if (name.includes("air")) {
    return "ac_unit";
  }

  return "check_circle";
}
