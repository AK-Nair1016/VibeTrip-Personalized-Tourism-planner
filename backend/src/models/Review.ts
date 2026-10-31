import { Schema, model, Types } from "mongoose";

const reviewSchema = new Schema(
  {
    hotelId: { type: Types.ObjectId, ref: "Hotel", required: true, index: true },
    // Seeded reviews have no user and no booking, only a made-up author name
    userId: { type: Types.ObjectId, ref: "User", index: true },
    bookingId: { type: Types.ObjectId, ref: "Booking" },
    authorName: { type: String, required: true, trim: true, maxlength: 50 },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
  },
  { timestamps: true }
);

// One review per booking. Partial, because seeded reviews have no bookingId: with a plain unique index
// every missing value counts as null, and the second seeded review would be refused.
reviewSchema.index(
  { bookingId: 1 },
  { unique: true, partialFilterExpression: { bookingId: { $type: "objectId" } } }
);

// The hotel's average rating is NOT updated by a save hook: deleteOne never fires one.
// reviewService.recomputeHotelRating runs after every create and delete instead.
export const Review = model("Review", reviewSchema);
