import { Request, Response } from "express";
import type { CurrencyCode } from "@vibetrip/shared-types";
import {
  DEFAULT_CURRENCY,
  getFlightOffer as getFlightOfferService,
  searchFlights as searchFlightsService,
  type FlightSearchQuery,
} from "../services/duffelFlightService";
import { catchAsync } from "../utils/catchAsync";

export const searchFlights = catchAsync(async (req: Request, res: Response) => {
  // Parsing and defaults live in the service. req.query is typed loosely by Express,
  // and the validator already checked it, so we tell TypeScript its real shape.
  const result = await searchFlightsService(req.query as unknown as FlightSearchQuery);

  res.status(200).json({
    success: true,
    message: "Flights fetched successfully",
    data: result,
  });
});

export const getFlightOffer = catchAsync(async (req: Request, res: Response) => {
  const offerId = req.params.offerId as string;

  let currency: CurrencyCode = DEFAULT_CURRENCY;
  const requestedCurrency = req.query.currency as string | undefined;
  if (requestedCurrency) {
    currency = requestedCurrency as CurrencyCode;
  }

  const offer = await getFlightOfferService(offerId, currency);

  res.status(200).json({
    success: true,
    message: "Flight offer fetched successfully",
    data: offer,
  });
});
