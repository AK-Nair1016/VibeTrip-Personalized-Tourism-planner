import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { connectDb } from "./config/db";
import bookingRoutes from "./routes/bookingRoutes";
import authRoutes from "./routes/authRoutes";
import { errorHandler } from "./middleware/errorHandler";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth",authRoutes);
app.use("/api/bookings", bookingRoutes);

// Error middleware comes after routes
app.use(errorHandler);

connectDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`VibeTrip API running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start API", error);
    process.exit(1);
  });
