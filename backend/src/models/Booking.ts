import { Schema, model, Types } from "mongoose";
import { SUPPORTED_CURRENCIES } from "../config/constants";

export const BOOKING_STATUSES = [
  "pending_payment",
  "authorized",
  "confirmed",
  "failed",
  "cancelled",
] as const;

// A booking in one of these states still holds its fare.
// "failed" and "cancelled" free it, so the user can book the same fare again.
const LIVE_STATUSES: readonly string[] = ["pending_payment", "authorized", "confirmed"];

export const BOOKING_TYPES = ["flight", "hotel"] as const;
export const BOOKING_PROVIDERS = ["duffel", "seeded"] as const;
export const REFUND_STATUSES = ["pending", "succeeded", "failed"] as const;
export const FEE_STATUSES = ["pending", "succeeded", "failed"] as const;

const bookingSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: BOOKING_TYPES, required: true },
    status: { type: String, enum: BOOKING_STATUSES, default: "pending_payment" },

    totalAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: SUPPORTED_CURRENCIES, required: true },

    providerAmount: { type: Number, required: true, min: 0 },
    providerCurrency: { type: String, required: true },

    fxRate: { type: Number, required: true, min: 0 },
    fxRateAt: { type: Date, required: true },

    stripePaymentIntentId: { type: String },
    // Hotel card guarantee; select false so GET /bookings never returns them
    stripeCustomerId: { type: String, select: false },
    stripePaymentMethodId: { type: String, select: false },

    provider: { type: String, enum: BOOKING_PROVIDERS, required: true },
    providerBookingId: { type: String },
    bookingReference: { type: String },

    snapshot: { type: Schema.Types.Mixed, required: true },

    // What is being bought, e.g. "flight:off_123". With userId it must be unique among live
    // bookings, so a double click or two tabs can never create two copies of the same booking.
    // Not "required" on purpose: bookings saved before this field existed must still be saveable.
    dedupeKey: { type: String },
    // Kept in step with status by the save hook below. Mongo cannot filter an index on "status
    // is one of three values", but it can on a plain true.
    isLive: { type: Boolean, default: true },
    // SHA-256 of the checkout request. Tells "the same request again" from "a changed request".
    requestHash: { type: String },

    // The last quote Duffel gave us. Cancel confirms this one, so the client never sends a quote id or amount.
    cancellationQuote: {
      quoteId: { type: String },
      providerRefundAmount: { type: Number, min: 0 },
      providerRefundCurrency: { type: String },
      userRefundAmount: { type: Number, min: 0 }, // in the booking currency, at the locked fxRate
      expiresAt: { type: Date },
    },

    cancelledAt: { type: Date },
    // Late fee a guest owes the hotel, in the booking currency; hotels only
    cancellationFee: { type: Number, min: 0 },
    // "failed" means the saved card could not be charged
    cancellationFeeStatus: { type: String, enum: FEE_STATUSES },
    refundAmount: { type: Number, min: 0 },
    refundCurrency: { type: String, enum: SUPPORTED_CURRENCIES },
    // "failed" means Duffel cancelled but Stripe did not refund: it needs a manual or retried refund
    refundStatus: { type: String, enum: REFUND_STATUSES },
  },
  { timestamps: true }
);

// Runs on every save(). A finished-with booking (failed or cancelled) gives up its fare.
// Updates made with findOneAndUpdate skip this hook and must set isLive themselves.
bookingSchema.pre("save", function () {
  this.isLive = LIVE_STATUSES.includes(this.status as string);
});

bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ stripePaymentIntentId: 1 }, { unique: true, sparse: true });

// The database itself refuses a second live booking of the same thing by the same user, even when
// two requests arrive at the same instant. Bookings made before these fields existed have no
// dedupeKey, so they are left out of the index and old test data cannot block it from building.
bookingSchema.index(
  { userId: 1, dedupeKey: 1 },
  { unique: true, partialFilterExpression: { isLive: true, dedupeKey: { $type: "string" } } }
);

// Serves the availability count: "which live bookings hold this room?". Only hotel bookings are in it.
bookingSchema.index(
  { "snapshot.roomId": 1 },
  { partialFilterExpression: { type: "hotel", isLive: true } }
);

export const Booking = model("Booking", bookingSchema);
