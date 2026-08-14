import { Schema, model, Types } from "mongoose";

const hotelBookingSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    orderId: { type: Types.ObjectId, ref: "Order", required: true },
    hotelId: { type: Types.ObjectId, ref: "Hotel", required: true },
    roomId: { type: Types.ObjectId, ref: "Room", required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    guests: {
      adults: { type: Number, required: true, min: 1 },
      children: { type: Number, required: true, min: 0, default: 0 },
    },
    rooms: { type: Number, required: true, min: 1 },
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

hotelBookingSchema.pre("validate", function (next) {
  if (this.checkOut <= this.checkIn) {
    return next(new Error("checkOut must be after checkIn"));
  }
  next();
});

export const HotelBooking = model("HotelBooking", hotelBookingSchema);