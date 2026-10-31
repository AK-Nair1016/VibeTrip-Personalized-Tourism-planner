import type {
  CurrencyCode,
  Hotel as HotelDto,
  HotelCard,
  HotelSearchResult,
  HotelSummary,
  RoomOffer,
} from "@vibetrip/shared-types";
import { SEEDED_FREE_CANCEL_HOURS } from "../config/constants";
import { Hotel } from "../models/Hotel";
import { Room } from "../models/Room";
import { AppError } from "../utils/AppError";
import { countNights, freeCancelUntil } from "../utils/stayDates";
import { getRoomsLeft } from "./availabilityService";
import { DEFAULT_CURRENCY } from "./duffelFlightService";
import { convert } from "./fxService";

// Every query value arrives as text (or is missing); the validator has already checked them,
// and the service turns them into numbers and applies the defaults.
export interface HotelSearchQuery {
  city: string;
  checkIn: string;
  checkOut: string;
  guests: string;
  rooms?: string;
  currency?: string;
  minStars?: string;
  maxPrice?: string;
  sort?: string;
}

export interface RoomsQuery {
  checkIn: string;
  checkOut: string;
  guests: string;
  rooms?: string;
  currency?: string;
}

// The part of a hotel document the card needs. Shared by the search, the wishlist and the detail page.
type HotelDoc = {
  _id: { toString(): string };
  name: string;
  city: string;
  starRating: number;
  guestRating?: number | null;
  reviewCount?: number | null;
  photos: string[];
  propertyType: HotelCard["propertyType"];
  source?: HotelCard["source"] | null;
};

export const toHotelCard = (hotel: HotelDoc): HotelCard => {
  return {
    id: hotel._id.toString(),
    name: hotel.name,
    city: hotel.city,
    starRating: hotel.starRating,
    guestRating: hotel.guestRating ?? 0,
    reviewCount: hotel.reviewCount ?? 0,
    photo: hotel.photos[0],
    propertyType: hotel.propertyType,
    source: hotel.source ?? "seeded",
  };
};

// guests are shared out over the rooms, so each room must hold the biggest share
export const guestsPerRoom = (guests: number, rooms: number): number => {
  return Math.ceil(guests / rooms);
};

// Hotels in a city that have a room free for every night, each card showing its cheapest room.
export const searchHotels = async (query: HotelSearchQuery): Promise<HotelSearchResult> => {
  const { city, checkIn, checkOut } = query;

  const guests = Number(query.guests);
  const roomCount = query.rooms ? Number(query.rooms) : 1;
  const currency = (query.currency ?? DEFAULT_CURRENCY) as CurrencyCode;
  const minStars = query.minStars ? Number(query.minStars) : 1;
  const maxPrice = query.maxPrice ? Number(query.maxPrice) : null;
  const sort = query.sort ?? "price_asc";
  const nights = countNights(checkIn, checkOut);

  const hotels = await Hotel.find({ city, starRating: { $gte: minStars } }).lean();

  if (hotels.length === 0) {
    return { city, checkIn, checkOut, nights, hotels: [] };
  }

  const hotelIds = hotels.map((hotel) => hotel._id);

  // One query for the rooms of every hotel, rather than one query per hotel
  const rooms = await Room.find({
    hotelId: { $in: hotelIds },
    maxGuests: { $gte: guestsPerRoom(guests, roomCount) },
  }).lean();

  const capacities = rooms.map((room) => ({
    roomId: room._id.toString(),
    totalRooms: room.totalRooms,
  }));
  const roomsLeft = await getRoomsLeft(capacities, checkIn, checkOut);

  const summaries: HotelSummary[] = [];

  for (const hotel of hotels) {
    // The cheapest room that fits the guests and still has enough rooms free on every night
    let cheapest: (typeof rooms)[number] | null = null;

    for (const room of rooms) {
      if (room.hotelId.toString() !== hotel._id.toString()) {
        continue;
      }

      const left = roomsLeft.get(room._id.toString()) ?? 0;
      if (left < roomCount) {
        continue;
      }

      if (cheapest === null || room.pricePerNight < cheapest.pricePerNight) {
        cheapest = room;
      }
    }

    // No bookable room for these dates: the hotel is left out of the results
    if (cheapest === null) {
      continue;
    }

    const perNight = await convert(cheapest.pricePerNight, cheapest.currency, currency);
    const total = await convert(cheapest.pricePerNight * nights * roomCount, cheapest.currency, currency);

    // maxPrice is per night, in the currency the traveller is looking at
    if (maxPrice !== null && perNight.amount > maxPrice) {
      continue;
    }

    summaries.push({
      ...toHotelCard(hotel),
      nights,
      lowestPricePerNight: { amount: perNight.amount, currency: perNight.currency },
      lowestTotal: { amount: total.amount, currency: total.currency },
    });
  }

  if (sort === "price_desc") {
    summaries.sort((a, b) => b.lowestPricePerNight.amount - a.lowestPricePerNight.amount);
  } else if (sort === "rating") {
    summaries.sort((a, b) => b.guestRating - a.guestRating);
  } else if (sort === "stars") {
    summaries.sort((a, b) => b.starRating - a.starRating);
  } else {
    summaries.sort((a, b) => a.lowestPricePerNight.amount - b.lowestPricePerNight.amount);
  }

  return { city, checkIn, checkOut, nights, hotels: summaries };
};

export const getHotel = async (hotelId: string): Promise<HotelDto> => {
  const hotel = await Hotel.findById(hotelId).lean();

  if (!hotel) {
    throw new AppError("HOTEL_NOT_FOUND", "Hotel not found", 404);
  }

  // The schema requires a location, so this only fires on a damaged document
  const coordinates = hotel.location?.coordinates;
  if (!coordinates || coordinates.length !== 2) {
    throw new AppError("HOTEL_DATA_INVALID", "This hotel has no location", 500);
  }

  // GeoJSON stores [lng, lat]; the API sends them under their own names
  const [lng, lat] = coordinates;

  return {
    id: hotel._id.toString(),
    name: hotel.name,
    description: hotel.description,
    city: hotel.city,
    address: hotel.address,
    lat,
    lng,
    starRating: hotel.starRating,
    guestRating: hotel.guestRating ?? 0,
    reviewCount: hotel.reviewCount ?? 0,
    amenities: hotel.amenities,
    photos: hotel.photos,
    propertyType: hotel.propertyType,
    cancellationPolicy: hotel.cancellationPolicy,
    source: hotel.source ?? "seeded",
  };
};

// Rooms of one hotel that fit the guests and are free for the dates, priced in the user's currency.
export const getHotelRooms = async (hotelId: string, query: RoomsQuery): Promise<RoomOffer[]> => {
  const { checkIn, checkOut } = query;

  const guests = Number(query.guests);
  const roomCount = query.rooms ? Number(query.rooms) : 1;
  const currency = (query.currency ?? DEFAULT_CURRENCY) as CurrencyCode;
  const nights = countNights(checkIn, checkOut);

  // An unknown hotel is a 404, not an empty list
  const hotelExists = await Hotel.exists({ _id: hotelId });
  if (!hotelExists) {
    throw new AppError("HOTEL_NOT_FOUND", "Hotel not found", 404);
  }

  const rooms = await Room.find({
    hotelId,
    maxGuests: { $gte: guestsPerRoom(guests, roomCount) },
  }).lean();

  const capacities = rooms.map((room) => ({
    roomId: room._id.toString(),
    totalRooms: room.totalRooms,
  }));
  const roomsLeft = await getRoomsLeft(capacities, checkIn, checkOut);

  const offers: RoomOffer[] = [];

  for (const room of rooms) {
    const roomId = room._id.toString();
    const left = roomsLeft.get(roomId) ?? 0;

    // Sold out for these dates, or fewer rooms left than asked for
    if (left < roomCount) {
      continue;
    }

    const perNight = await convert(room.pricePerNight, room.currency, currency);
    const total = await convert(room.pricePerNight * nights * roomCount, room.currency, currency);
    const lateFee = await convert(room.pricePerNight * roomCount, room.currency, currency);

    offers.push({
      roomId,
      type: room.type,
      maxGuests: room.maxGuests,
      amenities: room.amenities,
      photos: room.photos,
      pricePerNight: { amount: perNight.amount, currency: perNight.currency },
      total: { amount: total.amount, currency: total.currency },
      roomsLeft: left,
      freeCancelUntil: freeCancelUntil(checkIn, SEEDED_FREE_CANCEL_HOURS),
      lateCancelFee: { amount: lateFee.amount, currency: lateFee.currency },
    });
  }

  // Cheapest first
  offers.sort((a, b) => a.pricePerNight.amount - b.pricePerNight.amount);

  return offers;
};
