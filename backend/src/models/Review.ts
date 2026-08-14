import { Schema, model, Types } from "mongoose";

const reviewSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    hotelId: { type: Types.ObjectId, ref: "Hotel", required: true, index: true },
    bookingId: { type: Types.ObjectId, ref: "HotelBooking", required: true, unique: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    categoryRatings: {
      cleanliness: { type: Number, min: 1, max: 5, required: true },
      location: { type: Number, min: 1, max: 5, required: true },
      service: { type: Number, min: 1, max: 5, required: true },
      value: { type: Number, min: 1, max: 5, required: true },
    },
    text: { type: String, required: true, minlength: 10, maxlength: 2000 },
    helpfulVotes: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// One review per completed booking — bookingId unique index enforces this at the DB level

// Post-save hook: recompute Hotel.guestRating / reviewCount rollup
reviewSchema.post("save", async function () {
  const Review = model("Review");
  const Hotel = model("Hotel");
  const stats = await Review.aggregate([
    { $match: { hotelId: this.hotelId } },
    { $group: { _id: "$hotelId", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  if (stats[0]) {
    await Hotel.findByIdAndUpdate(this.hotelId, {
      guestRating: stats[0].avg,
      reviewCount: stats[0].count,
    });
  }
});

export const Review = model("Review", reviewSchema);