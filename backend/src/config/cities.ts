// The 10 cities VibeTrip supports. `code` is the IATA city or airport code
// sent to Duffel (LON, PAR, NYC and TYO are city codes covering all airports).
// `lat` and `lng` are the city centre: hotel coordinates are placed around it, and Stays searches by it.
// Photos are placeholders until real ones are chosen.
export const CITIES = [
  {
    city: "Delhi",
    code: "DEL",
    country: "India",
    lat: 28.6139,
    lng: 77.209,
    description: "India's capital, where Mughal monuments sit beside busy markets and some of the country's best street food.",
    image: "https://picsum.photos/seed/delhi/800/600",
  },
  {
    city: "Mumbai",
    code: "BOM",
    country: "India",
    lat: 19.076,
    lng: 72.8777,
    description: "A seafront city of film studios, colonial architecture and late-night food stalls.",
    image: "https://picsum.photos/seed/mumbai/800/600",
  },
  {
    city: "Bengaluru",
    code: "BLR",
    country: "India",
    lat: 12.9716,
    lng: 77.5946,
    description: "India's tech capital, known for its gardens, breweries and mild weather.",
    image: "https://picsum.photos/seed/bengaluru/800/600",
  },
  {
    city: "Dubai",
    code: "DXB",
    country: "United Arab Emirates",
    lat: 25.2048,
    lng: 55.2708,
    description: "A desert city of record-breaking towers, beach resorts and huge shopping malls.",
    image: "https://picsum.photos/seed/dubai/800/600",
  },
  {
    city: "London",
    code: "LON",
    country: "United Kingdom",
    lat: 51.5074,
    lng: -0.1278,
    description: "Royal palaces, free world-class museums and a different neighbourhood for every mood.",
    image: "https://picsum.photos/seed/london/800/600",
  },
  {
    city: "Paris",
    code: "PAR",
    country: "France",
    lat: 48.8566,
    lng: 2.3522,
    description: "Cafes, art and wide river-side walks, from the Louvre to Montmartre.",
    image: "https://picsum.photos/seed/paris/800/600",
  },
  {
    city: "New York",
    code: "NYC",
    country: "United States",
    lat: 40.7128,
    lng: -74.006,
    description: "The city that never sleeps: theatres, skyline views and food from every corner of the world.",
    image: "https://picsum.photos/seed/newyork/800/600",
  },
  {
    city: "Singapore",
    code: "SIN",
    country: "Singapore",
    lat: 1.3521,
    lng: 103.8198,
    description: "A clean, green island city with hawker centres, gardens and a waterfront skyline.",
    image: "https://picsum.photos/seed/singapore/800/600",
  },
  {
    city: "Tokyo",
    code: "TYO",
    country: "Japan",
    lat: 35.6762,
    lng: 139.6503,
    description: "Neon districts, quiet shrines and some of the best food on the planet.",
    image: "https://picsum.photos/seed/tokyo/800/600",
  },
  {
    city: "Bangkok",
    code: "BKK",
    country: "Thailand",
    lat: 13.7563,
    lng: 100.5018,
    description: "Golden temples, river boats and street food on every block.",
    image: "https://picsum.photos/seed/bangkok/800/600",
  },
] as const;

export type CityCode = (typeof CITIES)[number]["code"];

export const CITY_CODES: readonly CityCode[] = CITIES.map((c) => c.code);

export const isCityCode = (value: unknown): value is CityCode =>
  typeof value === "string" && (CITY_CODES as readonly string[]).includes(value);

// Hotels are searched by city name ("Paris"), not by IATA code.
export const CITY_NAMES: readonly string[] = CITIES.map((c) => c.city);

export const isCityName = (value: unknown): value is string =>
  typeof value === "string" && CITY_NAMES.includes(value);
