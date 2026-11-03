import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CABIN_CLASSES, type FlightOfferDetail, type PassengerInput } from "@vibetrip/shared-types";
import { fetchFlightOffer } from "../api/flights";
import { createFlightBooking, type FlightCheckoutResult } from "../api/flightBookings";
import { readApiError, type ApiErrorInfo } from "../utils/apiError";
import { useAuthStore } from "../store/authStore";
import { useCurrencyStore } from "../store/currencyStore";
import { formatMoney } from "../utils/formatMoney";
import CardPaymentSection from "../components/flights/CardPaymentSection";
import FareExpiredModal from "../components/flights/FareExpiredModal";
import FareHoldBanner from "../components/flights/FareHoldBanner";
import FlightSummaryCard from "../components/flights/FlightSummaryCard";
import PassengerForm from "../components/flights/PassengerForm";
import { CABIN_LABELS } from "../components/flights/flightFormat";
import {
  cleanPhone,
  emptyPassenger,
  validatePassenger,
  type PassengerErrors
} from "../components/flights/passengerValidation";
import { PAYMENT_WINDOW_MS, readCheckoutStart, rememberCheckoutStart } from "../components/flights/payWindow";
import { useSecondsLeft } from "../components/flights/useSecondsLeft";
import styles from "./FlightCheckoutPage.module.css";

type LoadStatus = "loading" | "ready" | "expired" | "error";
type Step = "travellers" | "pay";

// The search that led here rides in the URL. This rebuilds the /flights link from it.
function buildSearchHref(searchParams: URLSearchParams): string {
  const keys = ["origin", "destination", "departureDate", "returnDate", "adults", "cabinClass"];
  const next = new URLSearchParams();
  for (const key of keys) {
    const value = searchParams.get(key);
    if (value) {
      next.set(key, value);
    }
  }

  const query = next.toString();
  if (query === "") {
    return "/flights";
  }
  return `/flights?${query}`;
}

// The two-step bar at the top: Travellers, then Pay
function Stepper({ step }: { step: Step }) {
  const onPay = step === "pay";

  return (
    <ol className={styles.ol1}>
      <li className={styles.li1}>
        {onPay ? (
          <span className={styles.span1}>
            <span className={`${styles.span2} material-symbols-outlined`}>check</span>
          </span>
        ) : (
          <span className={styles.span3}>
            1
          </span>
        )}
        <span className={onPay ? styles.stepLabelOff : styles.stepLabelOn}>Travellers</span>
      </li>
      <li className={styles.li2} aria-hidden="true" />
      <li className={styles.li1}>
        <span className={onPay ? styles.stepDotOn : styles.stepDotOff}>
          2
        </span>
        <span className={onPay ? styles.stepLabelOn : styles.stepLabelOff}>Pay</span>
      </li>
    </ol>
  );
}

export default function FlightCheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const currency = useCurrencyStore((state) => state.currency);
  const user = useAuthStore((state) => state.user);

  const offerId = searchParams.get("offerId") ?? "";
  const searchHref = buildSearchHref(searchParams);

  let cabinLabel: string | undefined;
  for (const cabin of CABIN_CLASSES) {
    if (cabin === searchParams.get("cabinClass")) {
      cabinLabel = CABIN_LABELS[cabin];
    }
  }

  // Page state
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [loadError, setLoadError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [offer, setOffer] = useState<FlightOfferDetail | null>(null);

  const [step, setStep] = useState<Step>("travellers");
  const [passengers, setPassengers] = useState<PassengerInput[]>([]);
  const [passengerErrors, setPassengerErrors] = useState<PassengerErrors[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<ApiErrorInfo | null>(null);

  const [checkout, setCheckout] = useState<FlightCheckoutResult | null>(null);
  const [payUntil, setPayUntil] = useState<number | null>(null);
  const [payError, setPayError] = useState("");

  // Read once when the page opens: has this tab already created a booking for this fare?
  const [earlierCheckoutStart] = useState<number | null>(() => readCheckoutStart(offerId));

  // Once the booking exists the price and travellers are frozen on the server. A ref (not state)
  // because the load effect below must read the latest value without re-running when it changes.
  const checkoutStartedRef = useRef(false);

  // 1. Load the live offer. It runs again if the currency changes, until the booking is created.
  useEffect(() => {
    if (checkoutStartedRef.current) {
      return;
    }

    if (offerId === "") {
      setLoadError("No flight was selected. Go back and choose a flight.");
      setLoadStatus("error");
      return;
    }

    let isStale = false;

    async function loadOffer() {
      try {
        const data = await fetchFlightOffer(offerId, currency);
        if (isStale) {
          return;
        }

        setOffer(data);

        // One form per traveller the offer covers. Keep what was typed if the offer reloads.
        setPassengers((current) => {
          if (current.length === data.passengers.length) {
            return current;
          }
          const forms: PassengerInput[] = [];
          for (let i = 0; i < data.passengers.length; i++) {
            // The logged-in user's email is a good guess for the first traveller
            forms.push(emptyPassenger(i === 0 && user ? user.email : ""));
          }
          return forms;
        });
        setPassengerErrors([]);
        setLoadStatus("ready");
      } catch (error) {
        if (isStale) {
          return;
        }

        const info = readApiError(error);
        if (info.code === "FARE_EXPIRED") {
          setLoadStatus("expired");
        } else {
          setLoadError(info.message);
          setLoadStatus("error");
        }
      }
    }

    loadOffer();

    return () => {
      isStale = true;
    };
  }, [offerId, currency, retryCount, user]);

  // 2. While paying, ask the browser to warn before the tab is closed or reloaded.
  // (BrowserRouter cannot block the in-app Back button; this covers reload and close.)
  useEffect(() => {
    if (step !== "pay") {
      return;
    }

    function warnBeforeLeaving(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [step]);

  // 3. The countdown. Before the booking exists: until the airline's fare expires.
  // After: until the payment window ends or the fare expires, whichever comes first.
  // After a reload we are back on the travellers step, but if this tab already created the booking
  // (a start time is stored) the server's 15 minutes are already running, so count from that.
  let deadline: number | null = null;
  if (step === "pay") {
    deadline = payUntil;
  } else if (offer) {
    deadline = new Date(offer.expiresAt).getTime();
    if (earlierCheckoutStart !== null) {
      deadline = Math.min(deadline, earlierCheckoutStart + PAYMENT_WINDOW_MS);
    }
  }
  const secondsLeft = useSecondsLeft(deadline);
  const isTimeUp = secondsLeft !== null && secondsLeft === 0;
  const showExpiredModal = loadStatus === "expired" || (loadStatus === "ready" && isTimeUp);

  // 4. Handlers
  function handlePassengerChange(index: number, field: keyof PassengerInput, value: string) {
    const updated: PassengerInput[] = [];
    for (let i = 0; i < passengers.length; i++) {
      if (i === index) {
        updated.push({ ...passengers[i], [field]: value });
      } else {
        updated.push(passengers[i]);
      }
    }
    setPassengers(updated);
  }

  async function handleContinueToPayment() {
    if (!offer || isSubmitting || isTimeUp) {
      return;
    }

    // Tidy what was typed, then check it. The phone loses spaces and dashes here.
    const tidy: PassengerInput[] = [];
    const allErrors: PassengerErrors[] = [];
    let hasErrors = false;
    for (const passenger of passengers) {
      const cleaned: PassengerInput = {
        ...passenger,
        givenName: passenger.givenName.trim(),
        familyName: passenger.familyName.trim(),
        email: passenger.email.trim(),
        phoneNumber: cleanPhone(passenger.phoneNumber)
      };
      const errors = validatePassenger(cleaned);
      if (Object.keys(errors).length > 0) {
        hasErrors = true;
      }
      tidy.push(cleaned);
      allErrors.push(errors);
    }

    setPassengerErrors(allErrors);
    if (hasErrors) {
      setSubmitError({
        code: "VALIDATION_ERROR",
        message: "Please fix the highlighted fields.",
        status: null
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // The server re-checks the fare and decides the price; we only send who is travelling
      const result = await createFlightBooking({ offerId: offer.offerId, passengers: tidy, currency });

      checkoutStartedRef.current = true;
      setPassengers(tidy);
      setCheckout(result);
      // The server counts 15 minutes from when the booking was created. If this POST returned a
      // booking made earlier (a reload), rememberCheckoutStart gives back that earlier time.
      const startedAt = rememberCheckoutStart(offer.offerId);
      setPayUntil(Math.min(startedAt + PAYMENT_WINDOW_MS, new Date(offer.expiresAt).getTime()));
      setPayError("");
      setStep("pay");
      window.scrollTo(0, 0);
    } catch (error) {
      const info = readApiError(error);
      if (info.code === "FARE_EXPIRED") {
        setLoadStatus("expired");
      } else {
        // Includes the 409s CHECKOUT_PENDING, CHECKOUT_IN_PROGRESS and BOOKING_EXISTS: show the API's message
        setSubmitError(info);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handlePaid() {
    if (!checkout) {
      return;
    }
    // The booking page polls the status and shows the result
    navigate(`/bookings/${checkout.bookingId}?paid=1`, { replace: true });
  }

  function handleRetryLoad() {
    setLoadStatus("loading");
    setRetryCount(retryCount + 1);
  }

  // 5. Render
  if (loadStatus === "loading") {
    return (
      <div className={styles.div1}>
        <span className={`${styles.span4} material-symbols-outlined`}>progress_activity</span>
        <p className={styles.p1}>Checking the latest fare with the airline...</p>
      </div>
    );
  }

  if (loadStatus === "error") {
    return (
      <div className={styles.div2}>
        <div className={styles.div3}>
          <span className={`${styles.span5} material-symbols-outlined`}>error</span>
          <h1 className={styles.h11}>We could not load this fare</h1>
          <p className={styles.p2}>{loadError}</p>
          <div className={styles.div4}>
            {offerId !== "" ? (
              <button
                type="button"
                onClick={handleRetryLoad}
                className={styles.button1}
              >
                Try again
              </button>
            ) : null}
            <Link
              to={searchHref}
              className={styles.link1}
            >
              Back to flights
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!offer) {
    // "expired" before any offer loaded: only the modal is needed
    return <FareExpiredModal searchHref={searchHref} />;
  }

  // The summary shows the server's numbers: the offer's price first, then the booking's total
  let total = offer.price;
  if (checkout) {
    total = { amount: checkout.totalAmount, currency: checkout.currency };
  }

  return (
    <div className={styles.div5}>
      <Stepper step={step} />

      <div className={styles.div6}>
        <div className={styles.div7}>
          {secondsLeft !== null ? <FareHoldBanner secondsLeft={secondsLeft} /> : null}

          {step === "travellers" ? (
            <>
              <div className={styles.div8}>
                <h1 className={styles.h12}>Enter traveller details</h1>
                <p className={styles.p3}>
                  Use the name exactly as it appears on the passport.
                </p>
              </div>

              {passengers.map((passenger, index) => (
                <PassengerForm
                  key={index}
                  index={index}
                  passenger={passenger}
                  errors={passengerErrors[index] ?? {}}
                  onChange={(field, value) => handlePassengerChange(index, field, value)}
                />
              ))}

              {submitError ? (
                <div role="alert" className={styles.div9}>
                  <p className={styles.p4}>{submitError.message}</p>
                  {submitError.code === "BOOKING_EXISTS" ? (
                    <Link to="/bookings" className={styles.link2}>
                      View my bookings
                    </Link>
                  ) : null}
                </div>
              ) : null}

              <div className={styles.div10}>
                <Link
                  to={searchHref}
                  className={styles.link3}
                >
                  <span className={`${styles.span6} material-symbols-outlined`}>arrow_back</span>
                  Back to results
                </Link>
                <button
                  type="button"
                  onClick={handleContinueToPayment}
                  disabled={isSubmitting || isTimeUp}
                  className={styles.button2}
                >
                  {isSubmitting ? (
                    <>
                      <span className={`${styles.span7} material-symbols-outlined`}>progress_activity</span>
                      <span>Preparing payment...</span>
                    </>
                  ) : (
                    <>
                      <span>Next: Payment</span>
                      <span className={`${styles.span6} material-symbols-outlined`}>arrow_forward</span>
                    </>
                  )}
                </button>
              </div>
            </>
          ) : null}

          {step === "pay" && checkout && !isTimeUp ? (
            <>
              <div className={styles.div8}>
                <h1 className={styles.h12}>Pay</h1>
                <p className={styles.p3}>
                  Review your payment method and complete your reservation.
                </p>
              </div>

              <div className={styles.div11}>
                <p className={styles.p5}>Travelling</p>
                {passengers.map((passenger, index) => (
                  <p key={index} className={styles.p6}>
                    Adult {index + 1}: {passenger.givenName} {passenger.familyName}
                  </p>
                ))}
              </div>

              {payError ? (
                <div role="alert" className={styles.div9}>
                  <p className={styles.p4}>{payError}</p>
                </div>
              ) : null}

              <CardPaymentSection
                clientSecret={checkout.clientSecret}
                totalLabel={formatMoney(checkout.totalAmount, checkout.currency)}
                onPaid={handlePaid}
                onError={setPayError}
              />

              <p className={styles.p7}>
                Please stay on this page until the payment finishes. Going back or reloading may interrupt it.
              </p>
            </>
          ) : null}
        </div>

        <FlightSummaryCard
          offer={offer}
          adults={offer.passengers.length}
          cabinLabel={cabinLabel}
          total={total}
        />
      </div>

      {showExpiredModal ? <FareExpiredModal searchHref={searchHref} /> : null}
    </div>
  );
}
