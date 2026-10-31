import type { Request, Response } from "express";
import {
  createFlightBooking as createFlightBookingService,
  createHotelBooking as createHotelBookingService,
  createHotelCardSetup as createHotelCardSetupService,
  getUserBookings as getUserBookingsService,
  getBookingById as getBookingByIdService,
  getBookingStatus as getBookingStatusService,
  createCancellationQuote as createCancellationQuoteService,
  cancelBooking as cancelBookingService,
} from "../services/bookingService";
import { catchAsync } from "../utils/catchAsync";

// GET /bookings: the caller's own bookings
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

// GET /bookings/:id: one of the caller's bookings
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

// GET /bookings/:id/status: current booking status
export const getBookingStatus = catchAsync(async (req: Request, res: Response) => {
  const userId = req.authUser?.userId;

  if (!userId) {
    throw new Error("Authenticated user ID is missing");
  }

  const id = req.params.id as string;

  const status = await getBookingStatusService({ userId, bookingId: id });

  res.status(200).json({
    success: true,
    message: "Booking status fetched",
    data: status,
  });
});

// POST /bookings/:id/cancellation-quote: what a cancel would cost, without cancelling
export const createCancellationQuote = catchAsync(async (req: Request, res: Response) => {
  const userId = req.authUser?.userId;

  if (!userId) {
    throw new Error("Authenticated user ID is missing");
  }

  const id = req.params.id as string;

  const quote = await createCancellationQuoteService({ userId, bookingId: id });

  res.status(200).json({
    success: true,
    message: "Cancellation quote created",
    data: quote,
  });
});

// POST /bookings/:id/cancel: cancel the caller's booking
export const cancelBooking = catchAsync(async (req: Request, res: Response) => {
  const userId = req.authUser?.userId;

  if (!userId) {
    throw new Error("Authenticated user ID is missing");
  }

  const id = req.params.id as string;

  const booking = await cancelBookingService({ userId, bookingId: id });

  res.status(200).json({
    success: true,
    message: "Booking cancelled",
    data: booking,
  });
});

// POST /bookings/flights: book a flight from a Duffel offer
export const createFlightBooking = catchAsync(async (req: Request, res: Response) => {
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
});

// POST /bookings/hotels/card-setup: hotel step 1, start saving a card
export const createHotelCardSetup = catchAsync(async (req: Request, res: Response) => {
  const userId = req.authUser?.userId;

  if (!userId) {
    throw new Error("Authenticated user ID is missing");
  }

  const setup = await createHotelCardSetupService({ userId });

  res.status(201).json({
    success: true,
    message: "Card setup started",
    data: setup,
  });
});

// POST /bookings/hotels: hotel step 2, book the room (pay at the hotel)
export const createHotelBooking = catchAsync(async (req: Request, res: Response) => {
  const userId = req.authUser?.userId;

  if (!userId) {
    throw new Error("Authenticated user ID is missing");
  }

  const {
    hotelId,
    roomId,
    setupIntentId,
    checkIn,
    checkOut,
    rooms,
    guests,
    leadGuest,
    email,
    phoneNumber,
    currency,
  } = req.body;

  const booking = await createHotelBookingService({
    userId,
    hotelId,
    roomId,
    setupIntentId,
    checkIn,
    checkOut,
    rooms,
    guests,
    leadGuest,
    email,
    phoneNumber,
    currency,
  });

  res.status(201).json({
    success: true,
    message: "Hotel booking confirmed, Your card is only charged if you cancel after the free cancellation deadline",
    data: booking,
  });
});
