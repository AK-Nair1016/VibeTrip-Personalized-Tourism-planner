import { Schema, model, Types } from "mongoose";
import { BASE_CURRENCY } from "../config/constants";

const roomSchema = new Schema(
  {
    hotelId: { type: Types.ObjectId, ref: "Hotel", required: true, index: true },
    type: { type: String, required: true, trim: true },
    // One number, because the booking form sends one guest count for all the rooms
    maxGuests: { type: Number, required: true, min: 1 },
    // Per night, in `currency`. Seeded rooms are stored in the base currency and converted when shown.
    pricePerNight: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: BASE_CURRENCY },
    totalRooms: { type: Number, required: true, min: 1 },
    amenities: { type: [String], default: [] },
    photos: { type: [String], default: [] },
  },
  { timestamps: true }
);

// The seed script upserts on { hotelId, type }, so running it twice cannot duplicate a room
roomSchema.index({ hotelId: 1, type: 1 }, { unique: true });

export const Room = model("Room", roomSchema);
