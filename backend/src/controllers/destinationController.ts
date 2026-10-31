import type { Request, Response } from "express";
import { getDestinations as getDestinationsService } from "../services/destinationService";
import { catchAsync } from "../utils/catchAsync";

export const getDestinations = catchAsync(async (_req: Request, res: Response) => {
  const destinations = getDestinationsService();

  res.status(200).json({
    success: true,
    message: "Destinations fetched",
    data: destinations,
  });
});
