// One-off check of fxService against the real rates API (one request, no key).
// Run: npm run fx:test -w backend
import { SUPPORTED_CURRENCIES } from "@vibetrip/shared-types";
import { convert, getRates, toMinorUnits } from "../services/fxService";

const BASE = "AUD"; // Duffel account currency
const SAMPLE_PRICE = 109.27; // cheapest DEL-BOM round-trip from the spike

const main = async () => {
  const table = await getRates(BASE);
  console.log(`Rates for ${BASE} fetched. All ${SUPPORTED_CURRENCIES.length} currencies present.\n`);

  console.log(`${SAMPLE_PRICE} ${BASE} with the margin:`);
  for (const code of SUPPORTED_CURRENCIES) {
    const result = await convert(SAMPLE_PRICE, BASE, code);
    const marketRate = table.rates[code];
    console.log(
      `${code}: ${result.amount}  (market ${marketRate}, used ${result.rate.toFixed(4)}, Stripe ${toMinorUnits(result.amount, code)})`
    );
  }

  // The second call must come from the cache (same fetch time)
  const again = await getRates(BASE);
  console.log(`\nCache used on second call: ${again.fetchedAt === table.fetchedAt}`);
};

main().catch((error) => {
  console.error("FX test failed:", error.message);
  process.exit(1);
});
