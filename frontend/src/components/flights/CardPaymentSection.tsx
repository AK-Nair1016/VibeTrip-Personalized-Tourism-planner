import { useState } from "react";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { CARD_ELEMENT_OPTIONS, stripePromise } from "../../utils/stripeClient";

interface CardPaymentSectionProps {
  clientSecret: string; // Stripe PaymentIntent secret from POST /bookings/flights
  totalLabel: string; // the server's total, already formatted, e.g. "INR 42,100.00"
  onPaid: () => void; // call once Stripe says the card is confirmed (the page then opens the booking)
  onError: (message: string) => void; // call with a message safe to show when the card is declined
}

// The card area of the Pay step, and the Pay button. Stripe setup (key, card field style) is shared
// in utils/stripeClient.ts.
//
// This outer component only provides Stripe to the form below. Stripe's hooks (useStripe,
// useElements) only work inside <Elements>, so they cannot be used in this same component.
export default function CardPaymentSection(props: CardPaymentSectionProps) {
  if (!stripePromise) {
    return (
      <div role="alert" className="rounded-xl bg-error-container p-6 text-on-error-container">
        <p className="text-label-md">Payments are not set up: VITE_STRIPE_PUBLISHABLE_KEY is missing.</p>
        <p className="mt-1 text-label-sm">Add it to frontend/.env and restart the dev server.</p>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <CardForm {...props} />
    </Elements>
  );
}

function CardForm({ clientSecret, totalLabel, onPaid, onError }: CardPaymentSectionProps) {
  // Both are null until Stripe.js has finished loading
  const stripe = useStripe();
  const elements = useElements();

  // True while Stripe talks to the bank, so a double click cannot confirm the payment twice
  const [isPaying, setIsPaying] = useState(false);

  async function handlePay() {
    if (!stripe || !elements) {
      return;
    }

    // Clear the message from a previous failed try
    onError("");
    setIsPaying(true);
    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        onError("The card form is not ready yet. Please try again.");
        return;
      }

      // Stripe sends the card details straight from its iframe to Stripe; we only pass the element
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: cardElement },
      });

      // A decline is a normal result here, not a thrown error
      if (result.error) {
        onError(result.error.message ?? "Your card was declined.");
        return;
      }

      // The PaymentIntent uses manual capture, so a good card ends at "requires_capture":
      // the bank holds the money and the server captures it after the airline confirms.
      // Anything else is not a success, so onPaid is never called for it.
      if (result.paymentIntent.status === "requires_capture") {
        onPaid();
      } else {
        onError("The payment did not complete. Please check My trips before trying again.");
      }
    } catch {
      // Network failure or Stripe.js crashed; the details are not safe to show
      onError("Something went wrong while paying. Please try again.");
    } finally {
      setIsPaying(false);
    }
  }

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm sm:p-8">
      <p className="mb-6 text-[15px] leading-relaxed text-on-surface-variant">
        We hold the amount on your card and charge it once the airline confirms.
      </p>

      <div className="rounded-xl border border-dashed border-outline-variant/60 bg-surface-container-low/50 p-6">
        <div className="mb-4 flex items-center justify-between border-b border-outline-variant/40 pb-2">
          <span className="text-[13px] text-on-surface-variant">Stripe payment form</span>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-primary">lock</span>
            <span className="text-[12px] text-on-surface-variant">Encrypted by Stripe</span>
          </div>
        </div>

        {/* Stripe draws the card number, expiry and CVC inside its own iframe, so card digits never
            reach our code or our server. */}
        <div className="rounded-lg bg-surface-container-lowest px-4 py-4">
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={handlePay}
          disabled={!stripe || !elements || isPaying}
          className="flex items-center gap-2 rounded-xl bg-primary-container px-8 py-3.5 text-body-default font-bold text-on-primary shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span>{isPaying ? "Processing..." : `Pay ${totalLabel}`}</span>
          <span className="material-symbols-outlined text-[18px]">lock</span>
        </button>
      </div>
    </div>
  );
}
