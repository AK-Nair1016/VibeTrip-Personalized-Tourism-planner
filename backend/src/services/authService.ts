import { User } from "../models/User";
import crypto from "crypto";
import bcrypt from "bcrypt";

import { AppError } from "../utils/AppError";

import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  type TokenPayload
} from "../utils/jwt";

interface SignupData {
  userName: string;
  name: string;
  email: string;
  password: string;
}

interface LoginData {
  email: string;
  password: string;
}

// Finding user by email
export const findUserByEmail = async (email: string) => {
  return User.findOne({ email }).select("+passwordHash");
};

// Finding user by ID
export const findUserById = async (id: string) => {
  return User.findById(id);
};

// TODO: Replace `any` with a proper Mongoose User document type.
const sanitizeUser = (user: any) => {
  const userObject = user.toObject();

  delete userObject.passwordHash;
  delete userObject.stripeCustomerId;

  return userObject;
};

// TODO: Replace `any` with a proper Mongoose User document type.
const generateAuthTokens = (user: any) => {
  const payload: TokenPayload = {
    userId: user._id.toString(),
    role: user.role
  };

  const accessToken = signAccessToken(payload);

  const refreshToken = signRefreshToken(payload);

  return {
    accessToken,
    refreshToken
  };
};
export const refreshAccessToken=(refreshToken:string)=>{
  const payload =verifyRefreshToken(refreshToken);
  const accessToken = signAccessToken({
    userId: payload.userId,
    role: payload.role
  });
  return accessToken
}

//Google OAuth Login
export const googleLogin = async (user: any) => {
  // TODO: Replace `any` with a proper Mongoose User document type.
  const tokens = generateAuthTokens(user);

  return {
    user: sanitizeUser(user),
    ...tokens
  };
};

// Signup
export const signup = async (data: SignupData) => {
  const { userName, name, email, password } = data;

  const existingEmail = await User.findOne({ email });

  if (existingEmail) {
    throw new AppError(
      "EMAIL_TAKEN",
      "An account with this email already exists",
      409
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
    userName,
    name,
    email,
    passwordHash
  });

  await generateEmailVerificationToken(user._id.toString());
  
  const tokens = generateAuthTokens(user);

  return {
    user: sanitizeUser(user),
    ...tokens
  };
};

// Login
export const login = async (data: LoginData) => {
  const { email, password } = data;

  const user = await findUserByEmail(email);

  if (!user || !user.passwordHash) {
    throw new AppError(
      "INVALID_CREDENTIALS",
      "Invalid email or password",
      401
    );
  }

  const isPasswordValid = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!isPasswordValid) {
    throw new AppError(
      "INVALID_CREDENTIALS",
      "Invalid email or password",
      401
    );
  }

  const tokens = generateAuthTokens(user);

  return {
    user: sanitizeUser(user),
    ...tokens
  };
};
// forgot Password
export const forgotPassword = async(email:string)=>{
  const user =await User.findOne({email})
  .select("+passwordHash");
  /*
   * Do not reveal whether the email exists.
   * This prevents account enumeration.
   */
  if(!user){
    return;
  }
    /*
   * Google-only accounts do not have a local password.
   * Do not create a password through this endpoint.
   */
  if(!user.passwordHash){
    return;
  }

  //cryptographically secure random token
  const resetToken =crypto.randomBytes(32).toString("hex");
  
  //Hash the token before storing it in MongoDB
  const hashedToken =crypto
  .createHash("sha256")
  .update(resetToken)
  .digest("hex");

  //set token expiry after 15minutes
  const resetTokenExpires =new Date(
    Date.now()+15*60*1000
  );

  user.passwordResetToken= hashedToken;
  user.passwordResetExpires = resetTokenExpires;

  await user.save();
    /*
   * TODO:
   * Send resetToken through the email service.
   *
   * The raw token is sent to the user.
   * Only hashedToken is stored in MongoDB.
   */
  // TODO: Replace with email service
  console.log("[Forgot Password] Reset token generated");
  console.log("[Forgot Password] Email:", email);
  console.log("[Forgot Password] Raw token:", resetToken);
  console.log(
    "[Forgot Password] Expires:","[Forgot Password]Expires:",
    resetTokenExpires.toISOString()
  );
  console.log("password reset token generated",resetToken);

};
//reset password
export const resetPassword = async (
    token: string,
    newPassword: string
  ) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
  }).select("+passwordResetToken +passwordResetExpires");

  if (!user) {
    throw new AppError(
      "INVALID_RESET_TOKEN",
      "Password reset token is invalid or expired",
      400
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  user.passwordHash = passwordHash;

  // Invalidate the reset token immediately
  user.passwordResetToken = null;
  user.passwordResetExpires = null;

  await user.save();

  console.log(
    "[Reset Password] Password successfully reset for:",
    user.email
  );
};
// email verification
export const verifyEmail =async(token: string)=>{
  const hashedToken = crypto
  .createHash("sha256")
  .update(token)
  .digest("hex");

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: {
      $gt: new Date(),
    },
  }).select("+emailVerificationToken +emailVerificationExpires");
  if(!user){
    throw new AppError(
      "INVALID_VERIFICATION_TOKEN",
      "Email verification token is invalid or expired",
      400
    );
  }
  user.isEmailVerified=true;
  //invalidating token request
  user.emailVerificationToken=null;
  user.emailVerificationExpires=null;
  await user.save();
  
  console.log(
    "[Email verification] Email successfully verified: ",
    user.email
  );
};
// Generate email verification token
export const generateEmailVerificationToken = async (
  userId: string
) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError(
      "USER_NOT_FOUND",
      "User not found",
      404
    );
  }

  if (user.isEmailVerified) {
    throw new AppError(
      "EMAIL_ALREADY_VERIFIED",
      "Email is already verified",
      400
    );
  }

  const verificationToken = crypto
    .randomBytes(32)
    .toString("hex");

  const hashedToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  const verificationTokenExpires = new Date(
    Date.now() + 24 * 60 * 60 * 1000
  );

  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpires = verificationTokenExpires;

  await user.save();

  // TODO: Replace console log with email service
  console.log(
    "[Email Verification] Token generated for:",
    user.email
  );

  console.log(
    "[Email Verification] Raw token:",
    verificationToken
  );

  console.log(
    "[Email Verification] Expires:",
    verificationTokenExpires.toISOString()
  );

  return verificationToken;
};