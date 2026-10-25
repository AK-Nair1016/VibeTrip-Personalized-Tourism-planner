import type { Request, Response } from "express";
import type { Booking } from "@vibetrip/shared-types";
import { createFlightBooking as createFlightBookingService } from "../services/bookingService";
import { catchAsync } from "../utils/catchAsync";

const sampleBooking: Booking = {
  id: "booking_demo",
  user: {
    id: "user_demo",
    name: "Demo Traveler",
    email: "demo@vibetrip.local",
    createdAt: new Date().toISOString()
  },
  status: "pending",
  totalAmount: 0,
  currency: "USD",
  createdAt: new Date().toISOString()
};

export function getBookings(_req: Request, res: Response) {
  res.json([sampleBooking]);
}

// POST /api/bookings/flights  (logged-in users)
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
