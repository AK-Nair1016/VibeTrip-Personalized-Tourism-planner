import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

import { env } from "./env";
import { User } from "../models/User";

const generateUniqueUsername = async (email: string): Promise<string> => {
  const baseUsername = email
    .split("@")[0]
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 20);

  let username = baseUsername;
  let counter = 1;

  while (await User.exists({ userName: username })) {
    const suffix = `_${counter}`;
    const maxBaseLength = 20 - suffix.length;

    username = `${baseUsername.slice(0, maxBaseLength)}${suffix}`;

    counter++;
  }

  return username;
};

passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: env.GOOGLE_CALLBACK_URL,
      scope: ["profile", "email"],
    },

    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value?.toLowerCase();

        if (!email) {
          return done(
            new Error("Google account does not have an email address")
          );
        }

        // Find existing user by Google ID
        let user = await User.findOne({ googleId });

        // If Google ID is not linked, check whether the email already exists
        if (!user) {
          user = await User.findOne({ email });
        }

        // Create a new VibeTrip user for a new Google account
        if (!user) {
          const userName = await generateUniqueUsername(email);

          user = await User.create({
            googleId,
            email,
            name: profile.displayName,
            userName,
            avatarUrl: profile.photos?.[0]?.value,
            isEmailVerified: true,
          });
        }

        // Link Google to an existing email/password account
        else if (!user.googleId) {
          user.googleId = googleId;
          user.isEmailVerified = true;

          await user.save();
        }

        return done(null, user);
      } catch (error) {
        return done(error as Error);
      }
    }
  )
);

export default passport;