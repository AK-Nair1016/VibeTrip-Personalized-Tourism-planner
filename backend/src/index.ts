import cors from "cors";
import express from "express";
import cookieParser from "cookie-parser";
import { connectDb } from "./config/db";
import bookingRoutes from "./routes/bookingRoutes";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import { errorHandler } from "./middleware/errorHandler";
import passport from "./config/passport";

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/bookings", bookingRoutes);

app.use(errorHandler);

connectDb()
  .then(() => {
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