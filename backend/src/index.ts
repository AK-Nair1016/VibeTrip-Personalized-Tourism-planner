import cors from "cors";
import express from "express";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import { connectDb } from "./config/db";
import { Booking } from "./models/Booking";
import { env } from "./config/env";
import bookingRoutes from "./routes/bookingRoutes";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import flightRoutes from "./routes/flightRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import destinationRoutes from "./routes/destinationRoutes";
import hotelRoutes from "./routes/hotelRoutes";
import reviewRoutes from "./routes/reviewRoutes";
import { errorHandler } from "./middleware/errorHandler";
import passport from "./config/passport";

const app = express();
const port = process.env.PORT || 5000;

// Only the frontend may call the API from a browser, and credentials: true lets it send the refresh cookie
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
// Stripe's signature check needs the exact raw bytes it sent, so this path must get a Buffer.
// It MUST come before express.json(), which would parse the body and break the check.
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/flights", flightRoutes);
app.use("/api/destinations", destinationRoutes);
app.use("/api/hotels", hotelRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);

app.use(errorHandler);

connectDb()
  .then(async () => {
    // Wait for the unique indexes to be built before taking requests. If the build fails (for example an
    // index of the same name with other options already exists), stop here: running without the
    // duplicate-booking guard is worse than not starting.
    if (mongoose.connection.readyState === 1) {
      await Booking.init();
    }

    app.listen(port, () => {
      console.log(
        `VibeTrip API running on http://localhost:${port}`
      );
    });
  })
  .catch((error) => {
    console.error("Failed to start API", error);
    process.exit(1);
  });