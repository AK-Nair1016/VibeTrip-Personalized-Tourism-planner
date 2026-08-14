import { useEffect, useState } from "react";
import type { Booking } from "@vibetrip/shared-types";
import { fetchBookings } from "../api/bookings";

export default function HomePage() {
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    fetchBookings()
      .then(setBookings)
      .catch(() => setBookings([]));
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm uppercase tracking-wide text-cyan-300">VibeTrip</p>
        <h1 className="mt-3 text-4xl font-semibold">Trip planning workspace</h1>
        <p className="mt-4 max-w-2xl text-slate-300">
          Frontend, backend, and shared TypeScript contracts are linked through npm workspaces.
        </p>
        <div className="mt-8 rounded-lg border border-slate-700 p-4">
          <h2 className="text-lg font-medium">Bookings loaded: {bookings.length}</h2>
        </div>
      </section>
    </main>
  );
}
