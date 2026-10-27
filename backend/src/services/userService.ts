import { User } from "../models/User";
import { AppError } from "../utils/AppError";
import { sanitizeUser } from "./authService";

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