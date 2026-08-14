const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const validator = require("validator");

const savedTravelerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    dob: {
      type: Date,
      required: true
    },
    passportNo: {
      type: String,
      trim: true
    }
  },
  { _id: false }
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
      maxlength: 20
    },
    name: {
      type: String,
      required: true,
      index: true,
      trim: true,
      minlength: 3,
      maxlength: 50
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
      index: true,
      trim: true,
      validate(value: string) {
        if (!validator.isEmail(value)) {
          throw new Error("Invalid email address: " + value);
        }
      }
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true
    },
    avatarUrl: {
      type: String,
      match: [/^https?:\/\//, "Must be a valid URL"]
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    savedTravelers: {
      type: [savedTravelerSchema],
      default: [],
      validate: [
        (arr: unknown[]) => arr.length <= 10,
        "Cannot save more than 10 travelers"
      ]
    },
    stripeCustomerId: {
      type: String,
      select: false
    }
  },
  { timestamps: true }
);

userSchema.methods.getJWT = async function () {
  const user = this;
  const jwtSecret = process.env.JWT_SECRET || "DEv@NamasteDev395$@";

  return jwt.sign({ _id: user._id }, jwtSecret, {
    expiresIn: "7d"
  });
};

userSchema.methods.validatePassword = async function (passwordInputByUser: string) {
  const user = this;
  return bcrypt.compare(passwordInputByUser, user.passwordHash);
};

const UserModel = mongoose.model("User", userSchema);

module.exports = UserModel;
