import mongoose from "mongoose";
import validator from "validator";

const savedTravelerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    dob: {
      type: Date,
      required: true,
    },

    passportNo: {
      type: String,
      trim: true,
    },
  },
  {
    _id: false,
  }
);

const userSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,

      validate: {
        validator: (value: string) => validator.isEmail(value),
        message: "Invalid email address",
      },
    },

    passwordHash: {
      type: String,
      required: false,
      select: false,
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    avatarUrl: {
      type: String,
      match: [/^https?:\/\//, "Must be a valid URL"],
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationToken: {
      type: String,
      select: false,
      default: null,
    },

    emailVerificationExpires: {
      type: Date,
      select: false,
      default: null,
    },

    passwordResetToken: {
      type: String,
      select: false,
      default:null,
    },

    passwordResetExpires: {
      type: Date,
      select: false,
      default:null,
    },

    savedTravelers: {
      type: [savedTravelerSchema],
      default: [],
      validate: {
        validator: (arr: unknown[]) => arr.length <= 10,
        message: "Cannot save more than 10 travelers",
      },
    },

    stripeCustomerId: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model("User", userSchema);