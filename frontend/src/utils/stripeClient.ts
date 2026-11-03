import { loadStripe } from "@stripe/stripe-js";
import type { StripeCardElementOptions } from "@stripe/stripe-js";

// Shared by the flight payment and the hotel card guarantee, so Stripe.js is loaded once.
// Only the public key (pk_test_...) belongs in the browser. The secret key stays on the server.
const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

// Created once at module level: calling loadStripe on every render would reload Stripe.js each time.
// No key means no Stripe, so we skip the call instead of letting it throw.
export const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

// The card field lives in a Stripe iframe, which Tailwind classes cannot reach. Its look is set
// here instead, as plain values.
export const CARD_ELEMENT_OPTIONS: StripeCardElementOptions = {
  style: {
    base: {
      fontSize: "16px",
      color: "#1b1b1f",
      "::placeholder": { color: "#8b8b94" },
    },
    invalid: { color: "#ba1a1a" },
  },
};
