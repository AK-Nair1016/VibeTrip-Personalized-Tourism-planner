import type { Request, Response } from "express";
import {
  createFlightBooking as createFlightBookingService,
  getUserBookings as getUserBookingsService,
  getBookingById as getBookingByIdService,
} from "../services/bookingService";
import { catchAsync } from "../utils/catchAsync";

export const getBookings = catchAsync(async (req: Request, res: Response) => {
  const userId = req.authUser?.userId;

  if (!userId) {
    throw new Error("Authenticated user ID is missing");
  }

  const bookings = await getUserBookingsService({ userId });

  res.status(200).json({
    success: true,
    message: "Bookings fetched",
    data: bookings,
  });
});

export const getBookingById = catchAsync(async (req: Request, res: Response) => {
  const userId = req.authUser?.userId;

  if (!userId) {
    throw new Error("Authenticated user ID is missing");
  }

  // Express 5 types a param as string | string[]. The validator already proved it is a string.
  const id = req.params.id as string;

  const booking = await getBookingByIdService({ userId, bookingId: id });

  res.status(200).json({
    success: true,
    message: "Booking fetched",
    data: booking,
  });
});

export const createFlightBooking = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.authUser?.userId;

    if (!userId) {
      throw new Error("Authenticated user ID is missing");
    }

    const { offerId, currency, passengers } = req.body;

    const booking = await createFlightBookingService({
      userId,
      offerId,
      currency,
      passengers,
    });

    res.status(201).json({
      success: true,
      message: "Booking created, waiting for payment",
      data: booking,
    });
  }
);
