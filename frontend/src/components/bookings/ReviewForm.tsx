import { useState, type FormEvent } from "react";
import { readApiError } from "../../utils/apiError";
import { createReview } from "../../api/reviews";

const MIN_TEXT = 10;
const MAX_TEXT = 2000;

// Shown on a confirmed hotel booking. The booking payload does not say whether a review exists,
// so a second try is answered by the server with 409 REVIEW_EXISTS and we show that message.
export default function ReviewForm({ bookingId, hotelName }: { bookingId: string; hotelName: string }) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  // "done" after a saved review, or after the server says one already exists
  const [doneMessage, setDoneMessage] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage("");

    const cleanText = text.trim();

    if (rating < 1) {
      setErrorMessage("Choose a rating from 1 to 5 stars.");
      return;
    }
    if (cleanText.length < MIN_TEXT) {
      setErrorMessage(`Write at least ${MIN_TEXT} characters.`);
      return;
    }
    if (cleanText.length > MAX_TEXT) {
      setErrorMessage(`Keep your review under ${MAX_TEXT} characters.`);
      return;
    }

    setIsSubmitting(true);
    try {
      // rating is a number already (the star buttons set numbers), as the server requires
      await createReview({ bookingId, rating, text: cleanText });
      setDoneMessage("Thank you! Your review is now on the hotel page.");
    } catch (error) {
      const info = readApiError(error);
      if (info.code === "REVIEW_EXISTS") {
        setDoneMessage("You have already reviewed this stay.");
      } else {
        setErrorMessage(info.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (doneMessage) {
    return (
      <section className="mt-space-lg rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
        <p className="flex items-center gap-space-sm font-body-default text-body-default text-on-surface">
          <span className="material-symbols-outlined text-primary-container">check_circle</span>
          {doneMessage}
        </p>
      </section>
    );
  }

  return (
    <section className="mt-space-lg rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
      <h2 className="font-title text-title text-on-surface">Review your stay</h2>
      <p className="mt-space-xs font-body-sm text-body-sm text-on-surface-variant">
        Tell other travellers what {hotelName} was like.
      </p>

      <form onSubmit={handleSubmit} className="mt-space-md space-y-space-md">
        <div>
          <span className="mb-space-xs block font-label-md text-label-md font-semibold text-on-surface">Rating</span>
          <div className="flex gap-1" role="radiogroup" aria-label="Rating out of 5">
            {[1, 2, 3, 4, 5].map((value) => {
              const isOn = value <= rating;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={value === rating}
                  aria-label={`${value} star${value === 1 ? "" : "s"}`}
                  onClick={() => setRating(value)}
                  className={`text-[32px] leading-none ${isOn ? "text-tertiary-container" : "text-outline-variant"}`}
                >
                  ★
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="review-text" className="mb-space-xs block font-label-md text-label-md font-semibold text-on-surface">
            Your review
          </label>
          <textarea
            id="review-text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={4}
            maxLength={MAX_TEXT}
            placeholder="What did you like? What could be better?"
            className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest p-3 font-body-default text-body-default text-on-surface focus:border-primary-container focus:outline-none focus:ring-2 focus:ring-primary-container/20"
          />
          <p className="mt-space-xs font-label-sm text-label-sm text-on-surface-variant">
            {text.trim().length} / {MAX_TEXT} characters (at least {MIN_TEXT})
          </p>
        </div>

        {errorMessage && (
          <p role="alert" className="rounded-lg bg-error-container p-space-sm font-label-md text-label-md text-on-error-container">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-primary-container px-space-lg py-2.5 font-label-md text-label-md font-semibold text-on-primary hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Sending..." : "Submit review"}
        </button>
      </form>
    </section>
  );
}
