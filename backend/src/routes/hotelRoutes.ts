import { Router } from "express";
import {
  searchHotels,
  getHotelById,
  getHotelRooms,
  getHotelReviews,
} from "../controllers/hotelController";
import {
  validateHotelSearch,
  validateHotelId,
  validateRoomsQuery,
} from "../validators/hotelValidators";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

// "/search" must stay ABOVE "/:id": Express checks routes top to bottom,
// and "/:id" would otherwise swallow the word "search".
router.get("/search", validateRequest(validateHotelSearch, "query"), searchHotels);

router.get("/:id", validateRequest(validateHotelId, "params"), getHotelById);

router.get(
  "/:id/rooms",
  validateRequest(validateHotelId, "params"),
  validateRequest(validateRoomsQuery, "query"),
  getHotelRooms
);

router.get("/:id/reviews", validateRequest(validateHotelId, "params"), getHotelReviews);

export default router;
