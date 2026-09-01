import { Schema, model, Types } from "mongoose";

const orderSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["flight", "hotel"], required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "usd", lowercase: true },
    stripePaymentIntentId: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ["created", "paid", "failed", "refunded"],
      default: "created",
    },
  },
  { timestamps: true }
);

export const Order = model("Order", orderSchema);