// Quick Duffel connection check: one one-way search, prints a short summary.
// Run: npm run duffel:test -w backend   (calls Duffel, needs DUFFEL_API_KEY)
import dotenv from "dotenv";

dotenv.config();

const DUFFEL_BASE_URL = "https://api.duffel.com";

// YYYY-MM-DD, `days` from today, so the search date is never in the past.
const dateFromToday = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const testDuffel = async () => {
  const apiKey = process.env.DUFFEL_API_KEY;

  if (!apiKey) {
    throw new Error("DUFFEL_API_KEY is missing");
  }

  const departureDate = dateFromToday(30);

  const response = await fetch(
    `${DUFFEL_BASE_URL}/air/offer_requests?return_offers=true&supplier_timeout=10000`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Duffel-Version": "v2",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        data: {
          slices: [
            {
              origin: "LHR",
              destination: "JFK",
              departure_date: departureDate,
            },
          ],
          passengers: [
            {
              type: "adult",
            },
          ],
          cabin_class: "economy",
        },
      }),
    }
  );

  const body = await response.json();

  console.log("Status:", response.status);

  if (!response.ok) {
    console.dir(body.errors ?? body, { depth: null });
    throw new Error(
      `Duffel request failed with status ${response.status}`
    );
  }

  const offers = body.data.offers ?? [];
  console.log(`LHR -> JFK on ${departureDate}: ${offers.length} offers`);

  if (offers.length > 0) {
    const first = offers[0];
    console.log("First offer:", {
      id: first.id,
      price: `${first.total_amount} ${first.total_currency}`,
      airline: first.owner?.name,
      expiresAt: first.expires_at,
    });
  }

  console.log("\nDuffel API connection successful.");
};

testDuffel().catch((error) => {
  console.error("\nDuffel test failed:");
  console.error(error);
  process.exit(1);
});
