import { Schema, model } from "mongoose";
import { PROPERTY_TYPES } from "../config/constants";

export const HOTEL_SOURCES = ["seeded", "duffel"] as const;

const hotelSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, required: true, maxlength: 3000 },
    city: { type: String, required: true, trim: true, index: true },
    address: { type: String, required: true, trim: true },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
        default: "Point",
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
        validate: [
          (arr: number[]) => arr.length === 2,
          "Coordinates must be [lng, lat]",
        ],
      },
    },
    starRating: { type: Number, required: true, min: 1, max: 5 },
    guestRating: { type: Number, min: 0, max: 5, default: 0 },
    reviewCount: { type: Number, min: 0, default: 0 },
    amenities: { type: [String], default: [] },
    photos: {
      type: [String],
      validate: [(arr: string[]) => arr.length > 0, "At least one photo required"],
    },
    propertyType: {
      type: String,
      enum: PROPERTY_TYPES,
      required: true,
    },
    cancellationPolicy: { type: String, required: true },
    source: { type: String, enum: HOTEL_SOURCES, default: "seeded" },
  },
  { timestamps: true }
);

hotelSchema.index({ location: "2dsphere" });

// The seed script upserts on { city, name }, so running it twice cannot duplicate a hotel.
// Only seeded hotels are covered: Duffel hotels get their own key later.
hotelSchema.index(
  { city: 1, name: 1 },
  { unique: true, partialFilterExpression: { source: "seeded" } }
);

export const Hotel = model("Hotel", hotelSchema);