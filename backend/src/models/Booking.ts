import { Schema, model, Types } from "mongoose";

export const BOOKING_STATUSES = [
  "pending_payment",
  "authorized",
  "confirmed",
  "failed",
  "cancelled",
] as const;

export const SUPPORTED_CURRENCIES = ["INR", "AED", "GBP", "EUR", "USD", "SGD", "JPY", "THB"] as const;

export const BOOKING_TYPES = ["flight", "hotel"] as const;
export const BOOKING_PROVIDERS = ["duffel", "seeded"] as const;
export const REFUND_STATUSES = ["pending", "succeeded", "failed"] as const;

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

    provider: { type: String, enum: BOOKING_PROVIDERS, required: true },
    providerBookingId: { type: String },
    bookingReference: { type: String },

    snapshot: { type: Schema.Types.Mixed, required: true },

    // The last quote Duffel gave us. Cancel confirms this one, so the client never sends a quote id or amount.
    cancellationQuote: {
      quoteId: { type: String },
      providerRefundAmount: { type: Number, min: 0 },
      providerRefundCurrency: { type: String },
      userRefundAmount: { type: Number, min: 0 }, // in the booking currency, at the locked fxRate
      expiresAt: { type: Date },
    },

    cancelledAt: { type: Date },
    refundAmount: { type: Number, min: 0 },
    refundCurrency: { type: String, enum: SUPPORTED_CURRENCIES },
    // "failed" means Duffel cancelled but Stripe did not refund: it needs a manual or retried refund
    refundStatus: { type: String, enum: REFUND_STATUSES },
  },
  { timestamps: true }
);

bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ stripePaymentIntentId: 1 }, { unique: true, sparse: true });

export const Booking = model("Booking", bookingSchema);
