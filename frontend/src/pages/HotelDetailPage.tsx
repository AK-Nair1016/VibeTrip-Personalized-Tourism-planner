import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import type { Hotel, HotelReview, RoomOffer } from "@vibetrip/shared-types";
import { fetchHotel, fetchHotelReviews, fetchHotelRooms } from "../api/hotels";
import PhotoGallery from "../components/hotels/PhotoGallery";
import ReviewList from "../components/hotels/ReviewList";
import RoomList from "../components/hotels/RoomList";
import StayBox from "../components/hotels/StayBox";
import { readApiError } from "../utils/apiError";
import { amenityIcon, propertyTypeLabel, ratingLabel, starsText } from "../components/hotels/hotelFormat";
import {
  addDays,
  countNights,
  defaultStay,
  readNumber,
  stayToQueryString,
  type StayQuery
} from "../components/hotels/stayDates";
import { useWishlist } from "../components/hotels/useWishlist";
import { useCurrencyStore } from "../store/currencyStore";
import styles from "./HotelDetailPage.module.css";

export default function HotelDetailPage() {
  const { id = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const currency = useCurrencyStore((state) => state.currency);
  const wishlist = useWishlist();

  // The stay lives in the URL, so a refresh or a shared link keeps the same dates
  const defaults = defaultStay();
  const checkIn = searchParams.get("checkIn") ?? defaults.checkIn;
  const checkOut = searchParams.get("checkOut") ?? defaults.checkOut;
  const guests = readNumber(searchParams.get("guests"), defaults.guests);
  const rooms = readNumber(searchParams.get("rooms"), defaults.rooms);
  const stay: StayQuery = { checkIn, checkOut, guests, rooms };
  const nights = countNights(checkIn, checkOut);

  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [hotelLoading, setHotelLoading] = useState(true);
  const [hotelError, setHotelError] = useState("");
  // A 404 (unknown hotel) or 422 (malformed id) will not fix itself, so no "Try again" for those
  const [hotelRetryable, setHotelRetryable] = useState(true);

  const [roomOffers, setRoomOffers] = useState<RoomOffer[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState("");

  const [reviews, setReviews] = useState<HotelReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState("");

  // Bumping one of these re-runs the matching effect (the "Try again" buttons)
  const [hotelAttempt, setHotelAttempt] = useState(0);
  const [roomsAttempt, setRoomsAttempt] = useState(0);
  const [reviewsAttempt, setReviewsAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadHotel() {
      setHotelLoading(true);
      setHotelError("");
      try {
        const data = await fetchHotel(id);
        if (!cancelled) {
          setHotel(data);
        }
      } catch (caught) {
        if (!cancelled) {
          const info = readApiError(caught);
          setHotel(null);
          setHotelError(info.message);
          setHotelRetryable(info.status !== 404 && info.status !== 422);
        }
      } finally {
        if (!cancelled) {
          setHotelLoading(false);
        }
      }
    }

    loadHotel();

    return () => {
      cancelled = true;
    };
  }, [id, hotelAttempt]);

  useEffect(() => {
    let cancelled = false;

    async function loadReviews() {
      setReviewsLoading(true);
      setReviewsError("");
      try {
        const data = await fetchHotelReviews(id);
        if (!cancelled) {
          setReviews(data);
        }
      } catch (caught) {
        if (!cancelled) {
          setReviewsError(readApiError(caught).message);
        }
      } finally {
        if (!cancelled) {
          setReviewsLoading(false);
        }
      }
    }

    loadReviews();

    return () => {
      cancelled = true;
    };
  }, [id, reviewsAttempt]);

  // Rooms and prices depend on the dates, the guests and the currency, so any of them re-fetches
  useEffect(() => {
    let cancelled = false;

    async function loadRooms() {
      setRoomsLoading(true);
      setRoomsError("");
      try {
        const data = await fetchHotelRooms(id, { checkIn, checkOut, guests, rooms, currency });
        if (!cancelled) {
          setRoomOffers(data);
        }
      } catch (caught) {
        if (!cancelled) {
          setRoomOffers([]);
          setRoomsError(readApiError(caught).message);
        }
      } finally {
        if (!cancelled) {
          setRoomsLoading(false);
        }
      }
    }

    loadRooms();

    return () => {
      cancelled = true;
    };
  }, [id, checkIn, checkOut, guests, rooms, currency, roomsAttempt]);

  // Applies one change from the date/guest box, then fixes anything that would be rejected
  function updateStay(patch: Partial<StayQuery>) {
    // Clearing a date field gives an empty string: ignore it and keep the old date
    if (patch.checkIn === "" || patch.checkOut === "") {
      return;
    }

    const next: StayQuery = { ...stay, ...patch };

    // Check-out must stay after check-in
    if (next.checkOut <= next.checkIn) {
      next.checkOut = addDays(next.checkIn, 1);
    }

    // Every room needs at least one guest: move whichever field the user did not just change
    if (next.guests < next.rooms) {
      if (patch.rooms !== undefined) {
        next.guests = next.rooms;
      } else {
        next.rooms = next.guests;
      }
    }

    // replace: true so each tweak does not add a step to the browser history
    setSearchParams(new URLSearchParams(stayToQueryString(next)), { replace: true });
  }

  // The cheapest room is shown in the side card
  let cheapestRoom: RoomOffer | null = null;
  for (const room of roomOffers) {
    if (cheapestRoom === null || room.pricePerNight.amount < cheapestRoom.pricePerNight.amount) {
      cheapestRoom = room;
    }
  }

  if (hotelLoading && !hotel) {
    return (
      <div className={styles.div1} aria-busy="true">
        <div className={styles.div2} />
        <div className={styles.div3} />
      </div>
    );
  }

  if (hotelError || !hotel) {
    return (
      <div className={styles.div4}>
        <span className={`${styles.span1} material-symbols-outlined`}>hotel</span>
        <p role="alert" className={styles.p1}>
          {hotelError || "Hotel not found."}
        </p>
        <div className={styles.div5}>
          {hotelRetryable ? (
            <button
              type="button"
              onClick={() => setHotelAttempt(hotelAttempt + 1)}
              className={styles.button1}
            >
              Try again
            </button>
          ) : null}
          <Link
            to="/"
            className={styles.link1}
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const saved = wishlist.isSaved(hotel.id);
  const backToResults = `/hotels?${new URLSearchParams({ city: hotel.city }).toString()}&${stayToQueryString(stay)}`;

  return (
    <div className={styles.div1}>
      <nav aria-label="Breadcrumb" className={styles.nav1}>
        <ol className={styles.ol1}>
          <li>
            <Link to={backToResults} className={styles.link2}>
              Stays in {hotel.city}
            </Link>
          </li>
          <li className={styles.li1}>/</li>
          <li aria-current="page" className={styles.li2}>
            {hotel.name}
          </li>
        </ol>
      </nav>

      <div className={styles.div6}>
        <div className={styles.div7}>
          <h1 className={styles.h11}>{hotel.name}</h1>
          <div className={styles.div8}>
            <span aria-label={`${hotel.starRating} stars`} className={styles.span2}>
              {starsText(hotel.starRating)}
            </span>
            <span>{propertyTypeLabel(hotel.propertyType)}</span>
            <span className={styles.span3}>·</span>
            {hotel.reviewCount > 0 ? (
              <>
                <span className={styles.span4}>{hotel.guestRating.toFixed(1)}</span>
                <span className={styles.span3}>·</span>
                <a href="#reviews" className={styles.a1}>
                  {hotel.reviewCount} {hotel.reviewCount === 1 ? "review" : "reviews"}
                </a>
                <span className={styles.span3}>·</span>
              </>
            ) : null}
            <span>{hotel.address}</span>
          </div>
        </div>

        <button
          type="button"
          disabled={!wishlist.canToggle}
          onClick={() => wishlist.toggle(hotel.id)}
          aria-pressed={saved}
          className={styles.button2}
        >
          <span
            className={`${saved ? styles.heartIconSaved : styles.heartIcon} material-symbols-outlined`}
            style={{ fontVariationSettings: saved ? "'FILL' 1" : "'FILL' 0" }}
          >
            favorite
          </span>
          <span>{saved ? "Saved" : "Save"}</span>
        </button>
      </div>

      {wishlist.error ? (
        <div
          role="alert"
          className={styles.div9}
        >
          <span>{wishlist.error}</span>
          <button type="button" onClick={wishlist.clearError} className={styles.button3}>
            Dismiss
          </button>
        </div>
      ) : null}

      <div className={styles.div10}>
        <PhotoGallery photos={hotel.photos} hotelName={hotel.name} />
      </div>

      <div className={styles.div11}>
        <div className={styles.div12}>
          {hotel.amenities.length > 0 ? (
            <section className={styles.section1}>
              <h2 className={styles.h21}>What this place offers</h2>
              <div className={styles.div13}>
                {hotel.amenities.map((amenity) => (
                  <div
                    key={amenity}
                    className={styles.div14}
                  >
                    <span className={`${styles.span5} material-symbols-outlined`}>{amenityIcon(amenity)}</span>
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className={styles.section2}>
            <div className={styles.div15}>
              {hotel.reviewCount === 0 ? "New" : hotel.guestRating.toFixed(1)}
            </div>
            <div className={styles.div16}>
              <span className={styles.span6}>{ratingLabel(hotel.guestRating, hotel.reviewCount)}</span>
              <span className={styles.span7}>
                {hotel.reviewCount === 0
                  ? "No guest reviews yet."
                  : `Based on ${hotel.reviewCount} guest ${hotel.reviewCount === 1 ? "review" : "reviews"}.`}
              </span>
            </div>
          </section>

          <section className={styles.section3}>
            <h2 className={styles.h22}>About this stay</h2>
            <p className={styles.p2}>{hotel.description}</p>
          </section>

          <section className={styles.section3} id="rooms">
            <h2 className={styles.h23}>Choose your room</h2>
            <RoomList
              hotelId={hotel.id}
              rooms={roomOffers}
              loading={roomsLoading}
              error={roomsError}
              stay={stay}
              nights={nights}
              onRetry={() => setRoomsAttempt(roomsAttempt + 1)}
            />
          </section>

          <ReviewList
            reviews={reviews}
            loading={reviewsLoading}
            error={reviewsError}
            guestRating={hotel.guestRating}
            reviewCount={hotel.reviewCount}
            onRetry={() => setReviewsAttempt(reviewsAttempt + 1)}
          />

          <section className={styles.section4}>
            <details className={`${styles.details1} group`}>
              <summary className={styles.summary1}>
                <span>Cancellation policy</span>
                <span className={`${styles.span8} material-symbols-outlined`}>
                  expand_more
                </span>
              </summary>
              <div className={styles.div17}>
                {hotel.cancellationPolicy}
              </div>
            </details>
          </section>
        </div>

        <aside className={styles.aside1}>
          <StayBox
            stay={stay}
            nights={nights}
            cheapestPerNight={cheapestRoom ? cheapestRoom.pricePerNight : null}
            cheapestTotal={cheapestRoom ? cheapestRoom.total : null}
            payAtHotel={hotel.source === "seeded"}
            onChange={updateStay}
          />
        </aside>
      </div>
    </div>
  );
}
