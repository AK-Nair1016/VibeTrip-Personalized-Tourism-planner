import { Router } from "express";
import { getBookings } from "../controllers/bookingController";

const router = Router();

router.get("/", getBookings);

export default router;
