# VibeTrip

A travel booking platform for searching and booking flights and hotels, with real card payments through Stripe (test mode) and live flight offers from the Duffel API.

<!-- Add a screenshot of the flight checkout with the fare-hold countdown here -->
<!-- ![Flight checkout](docs/checkout.png) -->

## Features

- **Flight search and booking**: live offers from Duffel, filters on the results page, passenger details form with validation
- **Fare hold countdown**: the checkout shows how long the fare is held and opens an expiry modal when it runs out
- **Hotel search and booking**: filtered results, hotel detail page with photo gallery, rooms and reviews
- **Stripe payments**: card payment for flights, card guarantee (SetupIntent) for hotels, and booking status polling after payment
- **Accounts**: email/password signup with verification, password reset, Google OAuth login
- **Bookings, wishlist and profile**: booking history with cancellation, saved hotels, multi-currency prices

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | React 19, TypeScript, Vite, React Router, Tailwind CSS, CSS Modules, Zustand, Axios, Stripe Elements |
| Backend | Node.js, Express 5, TypeScript, MongoDB (Mongoose), Passport (Google OAuth), JWT |
| Integrations | Stripe API, Duffel API, exchange rates API |
| Shared | `shared-types` package with TypeScript types used by both frontend and backend (npm workspaces) |

## How payments work

1. **Authorize**: when a user books, the backend creates a Stripe PaymentIntent with manual capture. The card is authorized (held) but not charged yet.
2. **Hold window**: an unpaid booking is valid only until the payment window ends or the Duffel fare expires, whichever comes first.
3. **Confirm or release**: a Stripe webhook (signature verified) moves the booking forward. The payment is captured only when the booking is confirmed, and released if it fails.

Every Stripe call that creates money movement uses an idempotency key (per booking), so a retried request can't charge the user twice.

## Project structure

```
frontend/       React app (pages, components, API clients, Zustand stores)
backend/        Express API (routes, controllers, services, models, validators)
shared-types/   TypeScript types shared by frontend and backend
```

## Running locally

Requirements: Node.js 20+, a MongoDB database, and test keys for Stripe and Duffel.

```bash
git clone https://github.com/AK-Nair1016/VibeTrip-Personalized-Tourism-planner.git
cd VibeTrip-Personalized-Tourism-planner
npm install
```

Create the environment files from the examples and fill in your own keys:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Start both apps in two terminals:

```bash
cd backend && npm run dev
cd frontend && npm run dev
```

Stripe test card: `4242 4242 4242 4242`, any future expiry date, any CVC.

## Tests

```bash
cd backend && npm test
```

32 unit tests cover request validators and utility functions.

## Status

- Done: flight and hotel booking flows, Stripe payments, auth, bookings, wishlist, profile
- In progress: frontend tests, transactional emails (currently logged to the console)
- Planned: AI itinerary planner that builds a trip from the user's constraints
