import { Schema, model } from "mongoose";

const airportSchema = new Schema(
  {
    code: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
    city: { type: String, required: true, trim: true },
    airport: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const cabinClassSchema = new Schema(
  {
    class: { type: String, enum: ["economy", "premium", "business"], required: true },
    price: { type: Number, required: true, min: 0 },
    seatsAvailable: { type: Number, required: true, min: 0 },
    baggageAllowance: { type: String, required: true },
  },
  { _id: false }
);

const flightSchema = new Schema(
  {
    flightNumber: { type: String, required: true, trim: true, uppercase: true },
    airline: { type: String, required: true, trim: true },
    origin: { type: airportSchema, required: true },
    destination: { type: airportSchema, required: true },
    departureTime: { type: Date, required: true },
    arrivalTime: { type: Date, required: true },
    duration: { type: Number, required: true, min: 1 }, // minutes
    stops: { type: Number, required: true, min: 0, default: 0 },
    layovers: {
      type: [{ airportCode: String, duration: Number }],
      default: [],
    },
    cabinClasses: {
      type: [cabinClassSchema],
      required: true,
      validate: [(arr: unknown[]) => arr.length > 0, "At least one cabin class required"],
    },
    source: { type: String, enum: ["seeded", "live-api"], default: "seeded" },
  },
  { timestamps: true }
);

// Sanity check: arrival must be after departure
flightSchema.pre("validate", function (next) {
  if (this.arrivalTime <= this.departureTime) {
    return next(new Error("arrivalTime must be after departureTime"));
  }
  next();
});

// Compound index for the core search pattern
flightSchema.index({ "origin.code": 1, "destination.code": 1, departureTime: 1 });

export const Flight = model("Flight", flightSchema);