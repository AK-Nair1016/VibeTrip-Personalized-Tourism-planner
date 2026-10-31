import { Router } from "express";
import { getDestinations } from "../controllers/destinationController";

const router = Router();

router.get("/", getDestinations);

export default router;
