import { isObjectId } from "./hotelValidators";

const MIN_TEXT_LENGTH = 10;
const MAX_TEXT_LENGTH = 2000;

export const validateCreateReview = (body: unknown): string | null => {
  // Express 5 leaves req.body undefined when the client sends no JSON
  if (!body || typeof body !== "object") {
    return "Request body is required";
  }

  const { bookingId, rating, text } = body as { bookingId?: unknown; rating?: unknown; text?: unknown };

  if (!bookingId) {
    return "Booking id is required";
  }

  if (!isObjectId(bookingId)) {
    return "Booking id is not valid";
  }

  if (rating === undefined || rating === null) {
    return "Rating is required";
  }

  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return "Rating must be a whole number between 1 and 5";
  }

  if (!text) {
    return "Review text is required";
  }

  if (typeof text !== "string") {
    return "Review text must be text";
  }

  const length = text.trim().length;

  if (length < MIN_TEXT_LENGTH || length > MAX_TEXT_LENGTH) {
    return `Review text must be ${MIN_TEXT_LENGTH} to ${MAX_TEXT_LENGTH} characters`;
  }

  return null;
};

// Used with source "params" on DELETE /reviews/:id
export const validateReviewId = (params: unknown): string | null => {
  if (!params || typeof params !== "object") {
    return "Review id is required";
  }

  const { id } = params as { id?: unknown };

  if (!id) {
    return "Review id is required";
  }

  if (!isObjectId(id)) {
    return "Review id is not valid";
  }

  return null;
};
