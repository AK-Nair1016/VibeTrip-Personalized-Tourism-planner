import { User } from "../models/User";
import crypto from "crypto";
import bcrypt from "bcrypt";

import { AppError } from "../utils/AppError";
import { isDuplicateKeyError } from "../utils/dbErrors";

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

export const findUserByEmail = async (email: string) => {
  return User.findOne({ email }).select("+passwordHash");
};

export const findUserById = async (id: string) => {
  return User.findById(id);
};

// A User as loaded from MongoDB (the document, with methods like toObject)
export type UserDocument = InstanceType<typeof User>;

export const sanitizeUser = (user: UserDocument) => {
  const userObject = user.toObject();

  delete userObject.passwordHash;
  delete userObject.stripeCustomerId;

  return userObject;
};

const generateAuthTokens = (user: UserDocument) => {
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
  let payload: TokenPayload;

  // jwt.verify throws for a forged, malformed or expired token. That is the client's
  // problem (401), not a server error, so it must not reach the error handler as a plain Error.
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (error) {
    throw new AppError(
      "INVALID_REFRESH_TOKEN",
      "Refresh token is invalid or expired, please log in again",
      401
    );
  }

  const accessToken = signAccessToken({
    userId: payload.userId,
    role: payload.role
  });
  return accessToken
}

export const googleLogin = async (user: UserDocument) => {
  const tokens = generateAuthTokens(user);

  return {
    user: sanitizeUser(user),
    ...tokens
  };
};

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

  const existingUserName = await User.findOne({ userName });

  if (existingUserName) {
    throw new AppError(
      "USERNAME_TAKEN",
      "This username is already taken",
      409
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  let user: UserDocument;

  try {
    user = await User.create({
      userName,
      name,
      email,
      passwordHash
    });
  } catch (error) {
    // Two signups can pass the checks above together; the unique index then refuses the second.
    // keyPattern names the field that clashed, so we can say which one it was.
    if (isDuplicateKeyError(error)) {
      const keyPattern = (error as { keyPattern?: Record<string, unknown> }).keyPattern;

      if (keyPattern && keyPattern.email) {
        throw new AppError(
          "EMAIL_TAKEN",
          "An account with this email already exists",
          409
        );
      }

      throw new AppError(
        "USERNAME_TAKEN",
        "This username is already taken",
        409
      );
    }

    throw error;
  }

  await generateEmailVerificationToken(user._id.toString());
  
  const tokens = generateAuthTokens(user);

  return {
    user: sanitizeUser(user),
    ...tokens
  };
};

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

export const forgotPassword = async(email:string)=>{
  const user =await User.findOne({email})
  .select("+passwordHash");
  // Return silently so the response does not reveal whether the email exists
  if(!user){
    return;
  }
  // Google-only accounts have no local password to reset
  if(!user.passwordHash){
    return;
  }

  const resetToken =crypto.randomBytes(32).toString("hex");

  // Only the hash is stored; the raw token goes to the user
  const hashedToken =crypto
  .createHash("sha256")
  .update(resetToken)
  .digest("hex");

  const resetTokenExpires =new Date(
    Date.now()+15*60*1000
  );

  user.passwordResetToken= hashedToken;
  user.passwordResetExpires = resetTokenExpires;

  await user.save();
  // TODO: replace these console logs with the email service
  console.log("[Forgot Password] Reset token generated");
  console.log("[Forgot Password] Email:", email);
  console.log("[Forgot Password] Raw token:", resetToken);
  console.log(
    "[Forgot Password] Expires:","[Forgot Password]Expires:",
    resetTokenExpires.toISOString()
  );
  console.log("password reset token generated",resetToken);

};

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
  user.emailVerificationToken=null;
  user.emailVerificationExpires=null;
  await user.save();
  
  console.log(
    "[Email verification] Email successfully verified: ",
    user.email
  );
};

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
