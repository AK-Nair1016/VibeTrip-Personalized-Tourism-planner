import type { Money } from "./Currency";

// Types only. The runtime lists (sorts, property types) live in backend constants,
// because shared-types ships TypeScript source and the compiled backend cannot load values from it.
export type PropertyType = "hotel" | "resort" | "apartment" | "hostel";

export type HotelSource = "seeded" | "duffel";

export type HotelSort = "price_asc" | "price_desc" | "rating" | "stars";

// One of the 10 supported cities, as the destinations page shows it.
export type Destination = {
  city: string;
  code: string;
  country: string;
  description: string;
  image: string;
  lat: number;
  lng: number;
};

// The full hotel record (GET /hotels/:id).
export interface Hotel {
  id: string;
  name: string;
  description: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
  starRating: number;
  guestRating: number;
  reviewCount: number;
  amenities: string[];
  photos: string[];
  propertyType: PropertyType;
  cancellationPolicy: string;
  source: HotelSource;
}

// The small version of a hotel: enough for a card on the wishlist page.
export type HotelCard = {
  id: string;
  name: string;
  city: string;
  starRating: number;
  guestRating: number;
  reviewCount: number;
  photo: string;
  propertyType: PropertyType;
  source: HotelSource;
};

// A card in the search results: only hotels with a bookable room for the dates.
export type HotelSummary = HotelCard & {
  nights: number;
  lowestPricePerNight: Money; // converted to the user's currency, margin included
  lowestTotal: Money;
};

export type HotelSearchResult = {
  city: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  hotels: HotelSummary[];
};

// One bookable room type for the dates asked (GET /hotels/:id/rooms).
export type RoomOffer = {
  roomId: string;
  type: string;
  maxGuests: number;
  amenities: string[];
  photos: string[];
  pricePerNight: Money;
  total: Money; // pricePerNight x nights x rooms
  roomsLeft: number; // rooms still free on every night of the stay
  freeCancelUntil: string; // ISO time; the booking can be cancelled online until this
  lateCancelFee: Money; // owed to the hotel if cancelled after freeCancelUntil; one night x rooms
};

export type HotelReview = {
  id: string;
  authorName: string;
  rating: number;
  text: string;
  createdAt: string;
};

// What a hotel booking stores about what was bought, so the booking page never needs the hotel to still exist.
export type HotelBookingSnapshot = {
  hotelId: string;
  hotelName: string;
  city: string;
  photo: string;
  roomId: string;
  roomType: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string;
  nights: number;
  rooms: number;
  guests: number;
  leadGuest: { givenName: string; familyName: string };
  email: string;
  phoneNumber: string;
  price: Money; // the provider amount (base currency)
  freeCancelUntil: string;
  lateCancelFee: Money; // owed to the hotel if cancelled after freeCancelUntil; booking currency, fixed at booking time
};
