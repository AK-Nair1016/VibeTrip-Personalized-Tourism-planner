import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { Hotel, RoomOffer } from "@vibetrip/shared-types";
import { readApiError } from "../utils/apiError";
import { createHotelBooking } from "../api/hotelBookings";
import { fetchHotel, fetchHotelRooms } from "../api/hotels";
import { useAuthStore } from "../store/authStore";
import { useCurrencyStore } from "../store/currencyStore";
import CardGuaranteeSection from "../components/checkout/CardGuaranteeSection";
import HotelStaySummary from "../components/checkout/HotelStaySummary";
import styles from "./HotelCheckoutPage.module.css";

// Country codes for the phone field. The server wants "+", the code and the digits, nothing else.
const COUNTRY_CODES = [
  { code: "+91", label: "India (+91)" },
  { code: "+971", label: "UAE (+971)" },
  { code: "+44", label: "United Kingdom (+44)" },
  { code: "+1", label: "United States (+1)" },
  { code: "+65", label: "Singapore (+65)" },
  { code: "+33", label: "France (+33)" },
  { code: "+49", label: "Germany (+49)" },
  { code: "+81", label: "Japan (+81)" },
  { code: "+66", label: "Thailand (+66)" },
];

const MAX_NAME_LENGTH = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

// "3" -> 3, "abc" or missing -> fallback
function toWholeNumber(value: string | null, fallback: number): number {
  if (value === null || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : NaN;
}

export default function HotelCheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const currency = useCurrencyStore((state) => state.currency);

  // The hotel detail page links here with the whole stay in the address
  const hotelId = searchParams.get("hotelId") ?? "";
  const roomId = searchParams.get("roomId") ?? "";
  const checkIn = searchParams.get("checkIn") ?? "";
  const checkOut = searchParams.get("checkOut") ?? "";
  const rooms = toWholeNumber(searchParams.get("rooms"), 1);
  const guests = toWholeNumber(searchParams.get("guests"), NaN);

  const linkIsComplete =
    hotelId !== "" &&
    roomId !== "" &&
    checkIn !== "" &&
    checkOut !== "" &&
    Number.isInteger(rooms) &&
    rooms >= 1 &&
    Number.isInteger(guests) &&
    guests >= 1;

  const nights = Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / DAY_MS);

  // What we show comes from the server
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [roomOffers, setRoomOffers] = useState<RoomOffer[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [reloadCount, setReloadCount] = useState(0);

  // The form
  const [givenName, setGivenName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [setupIntentId, setSetupIntentId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  // The 5-booking limit gets its own amber banner with a link
  const [limitMessage, setLimitMessage] = useState("");

  // Hotel details: one load per hotel
  useEffect(() => {
    if (!linkIsComplete) {
      return;
    }
    let isCancelled = false;

    async function loadHotel() {
      try {
        const loaded = await fetchHotel(hotelId);
        if (!isCancelled) {
          setHotel(loaded);
        }
      } catch (error) {
        if (!isCancelled) {
          setLoadError(readApiError(error).message);
        }
      }
    }

    setLoadError("");
    loadHotel();

    return () => {
      isCancelled = true;
    };
  }, [linkIsComplete, hotelId, reloadCount]);

  // Room price: loaded again when the currency changes, so the price shown is always in the
  // currency the booking will be sent with
  useEffect(() => {
    if (!linkIsComplete) {
      return;
    }
    let isCancelled = false;

    async function loadRooms() {
      try {
        const offers = await fetchHotelRooms(hotelId, { checkIn, checkOut, guests, rooms, currency });
        if (!isCancelled) {
          setRoomOffers(offers);
        }
      } catch (error) {
        if (!isCancelled) {
          setLoadError(readApiError(error).message);
        }
      }
    }

    loadRooms();

    return () => {
      isCancelled = true;
    };
  }, [linkIsComplete, hotelId, checkIn, checkOut, guests, rooms, currency, reloadCount]);

  function retryLoading() {
    setHotel(null);
    setRoomOffers(null);
    setLoadError("");
    setReloadCount(reloadCount + 1);
  }

  // The room the guest picked, if it is still bookable for these dates
  let room: RoomOffer | null = null;
  if (roomOffers) {
    for (const offer of roomOffers) {
      if (offer.roomId === roomId) {
        room = offer;
      }
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError("");
    setLimitMessage("");

    if (!room) {
      return;
    }

    const cleanGivenName = givenName.trim();
    const cleanFamilyName = familyName.trim();
    const cleanEmail = email.trim();
    const phoneNumber = countryCode + phone.replace(/\D/g, "");

    if (cleanGivenName.length < 1 || cleanGivenName.length > MAX_NAME_LENGTH) {
      setFormError(`First name must be 1 to ${MAX_NAME_LENGTH} characters.`);
      return;
    }
    if (cleanFamilyName.length < 1 || cleanFamilyName.length > MAX_NAME_LENGTH) {
      setFormError(`Last name must be 1 to ${MAX_NAME_LENGTH} characters.`);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setFormError("Enter a valid email address.");
      return;
    }
    if (!/^\+\d{8,15}$/.test(phoneNumber)) {
      setFormError("Enter a valid mobile number, without the country code.");
      return;
    }
    if (!setupIntentId) {
      setFormError("Save a card first. It is only a guarantee and is not charged now.");
      return;
    }

    setIsSubmitting(true);
    try {
      // No price is sent: the server prices the room itself
      const result = await createHotelBooking({
        hotelId,
        roomId,
        setupIntentId,
        checkIn,
        checkOut,
        rooms,
        guests,
        leadGuest: { givenName: cleanGivenName, familyName: cleanFamilyName },
        email: cleanEmail,
        phoneNumber,
        currency,
      });
      // replace: Back from the booking page should not return to a finished checkout
      navigate(`/bookings/${result.bookingId}`, { replace: true });
    } catch (error) {
      const info = readApiError(error);
      if (info.code === "TOO_MANY_BOOKINGS") {
        setLimitMessage(info.message);
      } else {
        setFormError(info.message);
      }
      setIsSubmitting(false);
    }
  }

  // The hotel page reads the same stay names from its address, so the guest returns to the same dates
  let detailsLink = "/hotels";
  if (hotelId) {
    const stayParams = new URLSearchParams({
      checkIn,
      checkOut,
      guests: String(guests),
      rooms: String(rooms),
    });
    detailsLink = `/hotels/${hotelId}?${stayParams.toString()}`;
  }

  // ---------- Pages that cannot show a checkout ----------
  if (!linkIsComplete) {
    return (
      <div className={styles.div1}>
        <div className={styles.div2}>
          <h1 className={styles.h11}>This checkout link is incomplete</h1>
          <p className={styles.p1}>
            Pick a room again from the hotel page to start a booking.
          </p>
          <Link
            to="/hotels"
            className={styles.link1}
          >
            Find a stay
          </Link>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={styles.div1}>
        <div className={styles.div3}>
          <p className={styles.p2}>{loadError}</p>
          <div className={styles.div4}>
            <button
              type="button"
              onClick={retryLoading}
              className={styles.button1}
            >
              Try again
            </button>
            <Link to="/hotels" className={styles.link2}>
              Back to stays
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!hotel || !roomOffers) {
    return (
      <div className={styles.div1}>
        <p className={styles.p3}>
          Loading your checkout...
        </p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className={styles.div1}>
        <div className={styles.div2}>
          <h1 className={styles.h11}>This room is no longer available</h1>
          <p className={styles.p1}>
            It is sold out or does not fit your group for these dates. Please choose another room.
          </p>
          <Link
            to={detailsLink}
            className={styles.link1}
          >
            Back to {hotel.name}
          </Link>
        </div>
      </div>
    );
  }

  // The button only works once a card is saved. Until Stripe Elements is wired, that never happens.
  const canSubmit = !isSubmitting && setupIntentId !== "";

  return (
    <div className={styles.div1}>
      <div className={styles.div5}>
        <Link to={detailsLink} className={styles.link3}>
          <span className={`${styles.span1} material-symbols-outlined`}>arrow_back</span>
          <span>{hotel.name}</span>
        </Link>
        <span className={styles.span2}>/</span>
        <span className={styles.span3}>Guest information</span>
      </div>

      <div className={styles.div6}>
        <HotelStaySummary
          hotel={hotel}
          room={room}
          checkIn={checkIn}
          checkOut={checkOut}
          nights={nights}
          rooms={rooms}
          guests={guests}
        />

        <form
          onSubmit={handleSubmit}
          noValidate
          className={styles.form1}
        >
          <div className={styles.div7}>
            <div className={styles.div8}>
              <span className={`${styles.span4} material-symbols-outlined`}>check_circle</span>
            </div>
            <div className={styles.div9}>
              <h2 className={styles.h21}>
                Pay at the hotel. Nothing is charged now.
              </h2>
              <p className={styles.p4}>
                Your card is only a guarantee. It is charged only if you cancel after the free cancellation
                deadline.
              </p>
            </div>
          </div>

          {limitMessage && (
            <div
              role="alert"
              className={styles.div10}
            >
              <span className={`${styles.span5} material-symbols-outlined`}>info</span>
              <div className={styles.div11}>
                <span>{limitMessage}</span>
                <Link to="/bookings" className={styles.link4}>
                  See your trips
                </Link>
              </div>
            </div>
          )}

          <div className={styles.div12}>
            <div className={styles.div13}>
              <h3 className={styles.h31}>Enter your details</h3>
              <p className={styles.p5}>
                The lead guest checks in at the front desk. Names must match your photo ID.
              </p>
            </div>

            <div className={styles.div14}>
              <div className={styles.div15}>
                <div className={styles.div16}>
                  <label htmlFor="given-name" className={styles.label1}>
                    First name
                  </label>
                  <input
                    id="given-name"
                    type="text"
                    autoComplete="given-name"
                    value={givenName}
                    onChange={(event) => setGivenName(event.target.value)}
                    disabled={isSubmitting}
                    maxLength={MAX_NAME_LENGTH}
                    className={styles.input}
                  />
                </div>
                <div className={styles.div16}>
                  <label htmlFor="family-name" className={styles.label1}>
                    Last name
                  </label>
                  <input
                    id="family-name"
                    type="text"
                    autoComplete="family-name"
                    value={familyName}
                    onChange={(event) => setFamilyName(event.target.value)}
                    disabled={isSubmitting}
                    maxLength={MAX_NAME_LENGTH}
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.div16}>
                <label htmlFor="email" className={styles.label1}>
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isSubmitting}
                  className={styles.input}
                />
                <p className={styles.p6}>
                  <span className={`${styles.span6} material-symbols-outlined`}>mail</span>
                  We will send your booking confirmation here.
                </p>
              </div>

              <div className={styles.div17}>
                <div className={styles.div18}>
                  <label htmlFor="country-code" className={styles.label1}>
                    Country
                  </label>
                  <select
                    id="country-code"
                    value={countryCode}
                    onChange={(event) => setCountryCode(event.target.value)}
                    disabled={isSubmitting}
                    className={styles.input}
                  >
                    {COUNTRY_CODES.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.div19}>
                  <label htmlFor="phone" className={styles.label1}>
                    Mobile phone
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    autoComplete="tel-national"
                    inputMode="tel"
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    disabled={isSubmitting}
                    className={styles.input}
                  />
                </div>
              </div>
            </div>
          </div>

          <CardGuaranteeSection
            disabled={isSubmitting}
            onCardSaved={(savedSetupIntentId) => {
              setSetupIntentId(savedSetupIntentId);
              setFormError("");
            }}
            onError={(message) => setFormError(message)}
          />

          {formError && (
            <p role="alert" className={styles.p7}>
              {formError}
            </p>
          )}

          <div className={styles.div20}>
            <div className={styles.div21}>
              <Link
                to={detailsLink}
                className={styles.link5}
              >
                <span className={`${styles.span1} material-symbols-outlined`}>arrow_back</span>
                <span className={styles.span7}>Back to property details</span>
              </Link>
              <button
                type="submit"
                disabled={!canSubmit}
                className={styles.button2}
              >
                <span className={`${styles.span4} material-symbols-outlined`}>lock</span>
                <span>{isSubmitting ? "Securing reservation..." : "Complete booking"}</span>
              </button>
            </div>
            {!setupIntentId && !isSubmitting && (
              <p className={styles.p8}>
                Complete booking turns on once your card is saved.
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
