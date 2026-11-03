import { useState } from "react";
import type { HotelReview } from "@vibetrip/shared-types";

interface ReviewListProps {
  reviews: HotelReview[];
  loading: boolean;
  error: string;
  guestRating: number;
  reviewCount: number;
  onRetry: () => void;
}

const REVIEWS_SHOWN_FIRST = 4;

// "Claire Laurent" -> "CL"
function initials(name: string): string {
  const words = name.trim().split(" ");
  const first = words[0] ? words[0].charAt(0) : "";
  const second = words.length > 1 ? words[words.length - 1].charAt(0) : "";
  return (first + second).toUpperCase();
}

// Read only. Writing a review happens on the booking page.
export default function ReviewList({ reviews, loading, error, guestRating, reviewCount, onRetry }: ReviewListProps) {
  const [showAll, setShowAll] = useState(false);

  const visibleReviews = showAll ? reviews : reviews.slice(0, REVIEWS_SHOWN_FIRST);

  return (
    <section className="py-space-lg" id="reviews">
      <h2 className="mb-space-md font-headline-sm text-headline-sm font-extrabold text-on-surface">
        {reviewCount > 0 ? `★ ${guestRating.toFixed(1)} · ${reviewCount} ${reviewCount === 1 ? "review" : "reviews"}` : "Reviews"}
      </h2>

      {loading ? (
        <div className="grid grid-cols-1 gap-space-md md:grid-cols-2" aria-busy="true">
          {[0, 1].map((index) => (
            <div key={index} className="h-32 animate-pulse rounded-xl bg-surface-container-high" />
          ))}
        </div>
      ) : null}

      {!loading && error ? (
        <div role="alert" className="font-body-sm text-body-sm text-on-surface-variant">
          {error}{" "}
          <button type="button" onClick={onRetry} className="font-label-md text-label-md text-primary-container underline">
            Try again
          </button>
        </div>
      ) : null}

      {!loading && !error && reviews.length === 0 ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          No reviews yet. Guests can review a stay after their booking is confirmed.
        </p>
      ) : null}

      {!loading && !error && reviews.length > 0 ? (
        <>
          <div className="mb-space-md grid grid-cols-1 gap-space-md md:grid-cols-2">
            {visibleReviews.map((review) => (
              <div key={review.id} className="rounded-xl bg-surface-container-low p-space-md">
                <div className="mb-space-xs flex items-center gap-space-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container font-title text-label-md font-bold text-on-secondary-container">
                    {initials(review.authorName)}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-title text-label-md text-on-surface">{review.authorName}</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      {new Date(review.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                    </span>
                  </div>
                </div>
                <div aria-label={`${review.rating} out of 5`} className="mb-2 text-[12px] tracking-wider text-amber-600">
                  {"★".repeat(Math.round(review.rating))}
                </div>
                <p className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant">{review.text}</p>
              </div>
            ))}
          </div>

          {reviews.length > REVIEWS_SHOWN_FIRST ? (
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="rounded-xl bg-surface-container-lowest px-5 py-2.5 font-label-md text-label-md text-on-surface shadow-sm hover:bg-surface-container-low"
            >
              {showAll ? "Show fewer reviews" : `Show all ${reviews.length} reviews`}
            </button>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
