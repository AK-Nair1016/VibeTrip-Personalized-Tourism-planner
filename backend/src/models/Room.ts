import { Schema, model, Types } from "mongoose";

const roomSchema = new Schema(
  {
    hotelId: { type: Types.ObjectId, ref: "Hotel", required: true, index: true },
    type: { type: String, required: true, trim: true },
    maxOccupancy: {
      adults: { type: Number, required: true, min: 1 },
      children: { type: Number, required: true, min: 0, default: 0 },
    },
    pricePerNight: { type: Number, required: true, min: 0 },
    totalRooms: { type: Number, required: true, min: 1 },
    amenities: { type: [String], default: [] },
    photos: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const Room = model("Room", roomSchema);