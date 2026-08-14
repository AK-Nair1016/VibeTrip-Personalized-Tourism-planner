import type { Request, Response } from "express";
import type { Booking } from "@vibetrip/shared-types";

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
