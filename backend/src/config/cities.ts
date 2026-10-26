// The 10 cities VibeTrip supports. `code` is the IATA city or airport code
// sent to Duffel (LON, PAR, NYC and TYO are city codes covering all airports).
export const CITIES = [
  { city: "Delhi", code: "DEL", country: "India" },
  { city: "Mumbai", code: "BOM", country: "India" },
  { city: "Bengaluru", code: "BLR", country: "India" },
  { city: "Dubai", code: "DXB", country: "United Arab Emirates" },
  { city: "London", code: "LON", country: "United Kingdom" },
  { city: "Paris", code: "PAR", country: "France" },
  { city: "New York", code: "NYC", country: "United States" },
  { city: "Singapore", code: "SIN", country: "Singapore" },
  { city: "Tokyo", code: "TYO", country: "Japan" },
  { city: "Bangkok", code: "BKK", country: "Thailand" },
] as const;

export type CityCode = (typeof CITIES)[number]["code"];

export const CITY_CODES: readonly CityCode[] = CITIES.map((c) => c.code);

export const isCityCode = (value: unknown): value is CityCode =>
  typeof value === "string" && (CITY_CODES as readonly string[]).includes(value);
