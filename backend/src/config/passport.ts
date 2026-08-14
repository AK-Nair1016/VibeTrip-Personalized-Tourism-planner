import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

const clientID = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (clientID && clientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL: "/auth/google/callback"
      },
      (_accessToken, _refreshToken, profile, done) => {
        done(null, profile);
      }
    )
  );
}

export default passport;
