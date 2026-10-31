import type { HotelCard } from "@vibetrip/shared-types";
import { Hotel } from "../models/Hotel";
import { User } from "../models/User";
import { AppError } from "../utils/AppError";
import { sanitizeUser } from "./authService";
import { toHotelCard } from "./hotelService";

interface UpdateProfileData {
  userName?: string;
  name?: string;
  avatarUrl?: string;
}

export const getCurrentUser =async(userId:string)=>{
    const user =await User.findById(userId);

    // Check what the database returned: a valid token can outlive a deleted account
    if(!user){
        throw new AppError(
            "USER_NOT_FOUND",
            "User not found",
            404
        );
    }
    return sanitizeUser(user);
};
export const updateUserProfile = async (
  userId: string,
  data: UpdateProfileData
) => {
  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: data,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!user) {
    throw new AppError(
      "USER_NOT_FOUND",
      "User not found",
      404
    );
  }

  return sanitizeUser(user);
};

const MAX_WISHLIST = 100;

// Wishlist: saved hotels, hotels only. Newest saved first.
export const getWishlist = async (userId: string): Promise<HotelCard[]> => {
  const user = await User.findById(userId).select("wishlist").lean();

  if (!user) {
    throw new AppError("USER_NOT_FOUND", "User not found", 404);
  }

  const hotels = await Hotel.find({ _id: { $in: user.wishlist } }).lean();

  // $in does not keep the saved order, so walk the saved ids from newest to oldest
  const cards: HotelCard[] = [];
  for (let i = user.wishlist.length - 1; i >= 0; i--) {
    const savedId = user.wishlist[i].toString();

    for (const hotel of hotels) {
      if (hotel._id.toString() === savedId) {
        cards.push(toHotelCard(hotel));
      }
    }
  }

  return cards;
};

export const addToWishlist = async (userId: string, hotelId: string): Promise<HotelCard[]> => {
  const hotelExists = await Hotel.exists({ _id: hotelId });
  if (!hotelExists) {
    throw new AppError("HOTEL_NOT_FOUND", "Hotel not found", 404);
  }

  const user = await User.findById(userId).select("wishlist").lean();

  if (!user) {
    throw new AppError("USER_NOT_FOUND", "User not found", 404);
  }

  const alreadySaved = user.wishlist.some((savedId) => savedId.toString() === hotelId);

  // Saving twice (a double click) is not an error: the list simply stays as it is
  if (!alreadySaved) {
    if (user.wishlist.length >= MAX_WISHLIST) {
      throw new AppError("WISHLIST_FULL", `You can save at most ${MAX_WISHLIST} hotels`, 409);
    }

    // $addToSet adds the id only if it is not already in the array
    await User.updateOne({ _id: userId }, { $addToSet: { wishlist: hotelId } });
  }

  return getWishlist(userId);
};

export const removeFromWishlist = async (userId: string, hotelId: string): Promise<HotelCard[]> => {
  // $pull removes the id if it is there; removing one that is not there changes nothing
  const result = await User.updateOne({ _id: userId }, { $pull: { wishlist: hotelId } });

  if (result.matchedCount === 0) {
    throw new AppError("USER_NOT_FOUND", "User not found", 404);
  }

  return getWishlist(userId);
};
