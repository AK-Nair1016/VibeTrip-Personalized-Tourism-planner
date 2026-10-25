// Step 0 spike: which of our city pairs return offers in the Duffel sandbox?
// Runs a one-way search for every directed pair (90) plus 2 round-trip
// samples, one at a time, and prints a markdown table for Project-Status.md.
// Run: npm run duffel:spike -w backend   (calls Duffel, needs DUFFEL_API_KEY)
import dotenv from "dotenv";
import { CITY_CODES } from "../config/cities";

dotenv.config();

const DUFFEL_BASE_URL = "https://api.duffel.com";
const DELAY_MS = 500; // pause between requests to stay well under rate limits

type Slice = { origin: string; destination: string; departure_date: string };

type SpikeRow = {
  route: string;
  trip: "one-way" | "round-trip";
  status: number | "error";
  offers: number;
  cheapest: string;
  airlines: string;
  ms: number;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const dateFromToday = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const searchOffers = async (apiKey: string, slices: Slice[]) => {
  const send = () =>
    fetch(
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
            slices,
            passengers: [{ type: "adult" }],
            cabin_class: "economy",
            max_connections: 1,
          },
        }),
      }
    );

  let response = await send();

  // On 429, wait until Duffel says the limit resets (max 60s), then retry once.
  if (response.status === 429) {
    const reset = Number(response.headers.get("ratelimit-reset"));
    const waitMs = reset
      ? Math.min(Math.max(reset * 1000 - Date.now(), 1000), 60000)
      : 10000;
    console.log(`  rate limited, waiting ${Math.round(waitMs / 1000)}s`);
    await sleep(waitMs);
    response = await send();
  }

  return response;
};

const runOne = async (
  apiKey: string,
  route: string,
  trip: SpikeRow["trip"],
  slices: Slice[]
): Promise<SpikeRow> => {
  const started = Date.now();

  try {
    const response = await searchOffers(apiKey, slices);
    const body = await response.json();
    const ms = Date.now() - started;

    if (!response.ok) {
      const message = body.errors?.[0]?.message ?? "request failed";
      return { route, trip, status: response.status, offers: 0, cheapest: message, airlines: "-", ms };
    }

    const offers: { total_amount: string; total_currency: string; owner?: { name?: string } }[] =
      body.data.offers ?? [];

    if (offers.length === 0) {
      return { route, trip, status: response.status, offers: 0, cheapest: "-", airlines: "-", ms };
    }

    const cheapest = offers.reduce((min, o) =>
      Number(o.total_amount) < Number(min.total_amount) ? o : min
    );
    const airlines = [...new Set(offers.map((o) => o.owner?.name ?? "?"))];

    return {
      route,
      trip,
      status: response.status,
      offers: offers.length,
      cheapest: `${cheapest.total_amount} ${cheapest.total_currency}`,
      airlines: airlines.slice(0, 3).join(", ") + (airlines.length > 3 ? ` +${airlines.length - 3}` : ""),
      ms,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { route, trip, status: "error", offers: 0, cheapest: message, airlines: "-", ms: Date.now() - started };
  }
};

const runSpike = async () => {
  const apiKey = process.env.DUFFEL_API_KEY;

  if (!apiKey) {
    throw new Error("DUFFEL_API_KEY is missing");
  }

  const departureDate = dateFromToday(30);
  const returnDate = dateFromToday(37);

  const jobs: { route: string; trip: SpikeRow["trip"]; slices: Slice[] }[] = [];

  for (const origin of CITY_CODES) {
    for (const destination of CITY_CODES) {
      if (origin === destination) continue;
      jobs.push({
        route: `${origin}-${destination}`,
        trip: "one-way",
        slices: [{ origin, destination, departure_date: departureDate }],
      });
    }
  }

  for (const [origin, destination] of [["DEL", "BOM"], ["LON", "NYC"]]) {
    jobs.push({
      route: `${origin}-${destination}`,
      trip: "round-trip",
      slices: [
        { origin, destination, departure_date: departureDate },
        { origin: destination, destination: origin, departure_date: returnDate },
      ],
    });
  }

  console.log(`Duffel spike: ${jobs.length} searches, depart ${departureDate}, return ${returnDate}\n`);

  const rows: SpikeRow[] = [];

  for (const [index, job] of jobs.entries()) {
    const row = await runOne(apiKey, job.route, job.trip, job.slices);
    rows.push(row);
    console.log(`[${index + 1}/${jobs.length}] ${row.route} ${row.trip}: ${row.status}, ${row.offers} offers, ${row.ms}ms`);
    await sleep(DELAY_MS);
  }

  const withOffers = rows.filter((r) => r.offers > 0).length;
  const failed = rows.filter((r) => r.status !== 200 && r.status !== 201).length;

  console.log("\n## Duffel spike results\n");
  console.log(`Run ${new Date().toISOString().slice(0, 10)}, depart ${departureDate}, return ${returnDate}, 1 adult, economy, max 1 connection.\n`);
  console.log(`- Searches: ${rows.length}`);
  console.log(`- With offers: ${withOffers}`);
  console.log(`- Zero offers: ${rows.length - withOffers - failed}`);
  console.log(`- Failed requests: ${failed}\n`);
  console.log("| Route | Trip | Status | Offers | Cheapest | Airlines | ms |");
  console.log("| --- | --- | --- | --- | --- | --- | --- |");
  for (const r of rows) {
    console.log(`| ${r.route} | ${r.trip} | ${r.status} | ${r.offers} | ${r.cheapest} | ${r.airlines} | ${r.ms} |`);
  }
};

runSpike().catch((error) => {
  console.error("\nDuffel spike failed:");
  console.error(error);
  process.exit(1);
});
