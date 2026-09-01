import { Schema, model, Types } from "mongoose";

const wishlistItemSchema = new Schema(
  {
    itemType: { type: String, enum: ["flight", "hotel"], required: true },
    itemId: { type: Types.ObjectId, required: true },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const wishlistSchema = new Schema({
  userId: { type: Types.ObjectId, ref: "User", required: true, unique: true },
  items: {
    type: [wishlistItemSchema],
    default: [],
    validate: [(arr: unknown[]) => arr.length <= 200, "Wishlist capped at 200 items"],
  },
});

export const Wishlist = model("Wishlist", wishlistSchema);