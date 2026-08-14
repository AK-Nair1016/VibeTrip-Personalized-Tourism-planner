import { Schema, model, Types } from "mongoose";

const passengerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    dob: { type: Date, required: true },
    type: { type: String, enum: ["adult", "child", "infant"], required: true },
    seatNumber: { type: String },
  },
  { _id: false }
);

const flightBookingSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    orderId: { type: Types.ObjectId, ref: "Order", required: true },
    flightId: { type: Types.ObjectId, ref: "Flight", required: true },
    cabinClass: { type: String, enum: ["economy", "premium", "business"], required: true },
    passengers: {
      type: [passengerSchema],
      required: true,
      validate: [(arr: unknown[]) => arr.length > 0, "At least one passenger required"],
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
    bookingRef: { type: String, required: true, unique: true },
    totalPrice: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

export const FlightBooking = model("FlightBooking", flightBookingSchema);