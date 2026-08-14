import mongoose from "mongoose";

export async function connectDb() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.warn("MONGO_URI is not set; skipping MongoDB connection.");
    return;
  }

  await mongoose.connect(mongoUri);
}
