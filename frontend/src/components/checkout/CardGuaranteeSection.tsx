import { useState } from "react";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { createHotelCardSetup } from "../../api/hotelBookings";
import { readApiError } from "../../utils/apiError";
import { CARD_ELEMENT_OPTIONS, stripePromise } from "../../utils/stripeClient";

// The card area of the hotel checkout. The card only guarantees the room: nothing is charged now,
// and it is charged only if the guest cancels after the free cancellation deadline.
//
// The page talks to this component through the props below:
//   - onCardSaved(setupIntentId): called once the card is saved, the page then enables "Complete booking"
//   - onError(message): called when the card is refused or saving fails ("" clears the message)
//   - disabled: true while the booking request runs
export interface CardGuaranteeSectionProps {
  onCardSaved: (setupIntentId: string) => void;
  onError: (message: string) => void;
  disabled: boolean;
}

// This outer component only provides Stripe to the form below. Stripe's hooks (useStripe,
// useElements) only work inside <Elements>, so they cannot be used in this same component.
export default function CardGuaranteeSection(props: CardGuaranteeSectionProps) {
  return (
    <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 sm:p-7">
      <div className="mb-6 border-b border-outline-variant pb-4">
        <h3 className="font-headline-sm text-headline-sm font-extrabold text-on-surface">
          Guarantee your room with a card
        </h3>
        <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
          Your card is only a guarantee. It is not charged today. We charge it only if you cancel after the
          free cancellation deadline, and then only the late fee shown in your price summary.
        </p>
      </div>

      {stripePromise ? (
        <Elements stripe={stripePromise}>
          <CardSaveForm {...props} />
        </Elements>
      ) : (
        <div role="alert" className="rounded-xl bg-error-container p-4 text-on-error-container">
          <p className="text-label-md">Card saving is not set up: VITE_STRIPE_PUBLISHABLE_KEY is missing.</p>
          <p className="mt-1 text-label-sm">Add it to frontend/.env and restart the dev server.</p>
        </div>
      )}
    </section>
  );
}

function CardSaveForm({ onCardSaved, onError, disabled }: CardGuaranteeSectionProps) {
  // Both are null until Stripe.js has finished loading
  const stripe = useStripe();
  const elements = useElements();

  // isSaving blocks a double click; isSaved locks the form once Stripe has the card
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  async function handleSaveCard() {
    if (!stripe || !elements) {
      return;
    }

    // Clear the message from a previous failed try
    onError("");
    setIsSaving(true);
    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        onError("The card form is not ready yet. Please try again.");
        return;
      }

      // Step 1: our server creates a SetupIntent for this user's Stripe customer. Nothing is charged.
      const { setupIntentId, clientSecret } = await createHotelCardSetup();

      // Step 2: the card goes from Stripe's iframe straight to Stripe; we only pass the element
      const result = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card: cardElement },
      });

      // A refused card is a normal result here, not a thrown error
      if (result.error) {
        onError(result.error.message ?? "Your card could not be saved.");
        return;
      }

      // Send the page the id our server gave us: the booking request sends it back and the server
      // checks the saved card belongs to this user. Only "succeeded" means the card is saved.
      if (result.setupIntent.status === "succeeded") {
        setIsSaved(true);
        onCardSaved(setupIntentId);
      } else {
        onError("The card could not be saved. Please try again.");
      }
    } catch (error) {
      // Our own server call failed (not signed in, offline); readApiError gives a message safe to show
      onError(readApiError(error).message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low/50 p-4">
        {/* Stripe draws the card fields in its own iframe, so card digits never reach our code or server. */}
        <div className="rounded-lg bg-surface-container-lowest px-4 py-4">
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="flex items-center gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px] text-primary">
            {isSaved ? "check_circle" : "lock"}
          </span>
          {isSaved ? "Card saved. You can complete the booking." : "Encrypted by Stripe. Not charged today."}
        </p>

        <button
          type="button"
          onClick={handleSaveCard}
          disabled={!stripe || !elements || isSaving || isSaved || disabled}
          className="shrink-0 rounded-xl border border-on-surface px-5 py-2.5 font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Saving..." : isSaved ? "Saved" : "Save card"}
        </button>
      </div>
    </div>
  );
}
