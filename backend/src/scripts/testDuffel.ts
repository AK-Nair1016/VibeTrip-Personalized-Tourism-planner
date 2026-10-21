import dotenv from "dotenv";

dotenv.config();

const DUFFEL_BASE_URL = "https://api.duffel.com";

const testDuffel = async () => {
  const apiKey = process.env.DUFFEL_API_KEY;

  if (!apiKey) {
    throw new Error("DUFFEL_API_KEY is missing");
  }

  const response = await fetch(
    `${DUFFEL_BASE_URL}/air/offer_requests`,
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
              departure_date: "2026-09-15",
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

  const data = await response.json();

  console.log("Status:", response.status);
  console.log("Response:");

  console.dir(data, { depth: null });

  if (!response.ok) {
    throw new Error(
      `Duffel request failed with status ${response.status}`
    );
  }

  console.log("\nDuffel API connection successful.");
};

testDuffel().catch((error) => {
  console.error("\nDuffel test failed:");
  console.error(error);
  process.exit(1);
});