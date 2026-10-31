import { Router } from "express";
import { createReview, deleteReview } from "../controllers/reviewController";
import { validateCreateReview, validateReviewId } from "../validators/reviewValidators";
import { authGuard } from "../middleware/authGuard";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

router.post("/", authGuard, validateRequest(validateCreateReview), createReview);

router.delete("/:id", authGuard, validateRequest(validateReviewId, "params"), deleteReview);

export default router;
