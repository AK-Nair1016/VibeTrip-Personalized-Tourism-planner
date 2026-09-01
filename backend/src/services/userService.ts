import { User } from "../models/User";
import { AppError } from "../utils/AppError";

interface UpdateProfileData {
  userName?: string;
  name?: string;
  avatarUrl?: string;
}
//TODO: Replace `any` with a proper Mongoose User document/object type.
const sanitizeUser =(user:any)=>{
    const userObject =user.toObject();

    delete userObject.passwordHash;
    delete userObject.stripeCustomerId;

    return userObject;
};

export const getCurrentUser =async(userId:string)=>{
    const user =await User.findById(userId);

    if(!userId){
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