import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { HotelCard } from "@vibetrip/shared-types";
import WishlistCard from "../components/hotels/WishlistCard";
import { useWishlist } from "../components/hotels/useWishlist";
import { useWishlistStore } from "../store/wishlistStore";
import styles from "./WishlistPage.module.css";

const MAX_SAVED = 100; // the backend's wishlist limit
const UNDO_SECONDS = 6;

type WishlistSort = "recent" | "rating" | "name";

// Sorts a copy, so the list kept in the store stays in "newest first" order
function sortHotels(hotels: HotelCard[], sort: WishlistSort): HotelCard[] {
  const copy = [...hotels];

  if (sort === "rating") {
    copy.sort((a, b) => b.guestRating - a.guestRating);
  }
  if (sort === "name") {
    copy.sort((a, b) => a.name.localeCompare(b.name));
  }

  return copy;
}

export default function WishlistPage() {
  const wishlist = useWishlist();
  const [sort, setSort] = useState<WishlistSort>("recent");
  // The hotel just removed, kept so the toast can put it back
  const [removed, setRemoved] = useState<HotelCard | null>(null);

  // Hide the "Undo" toast after a few seconds
  useEffect(() => {
    if (!removed) {
      return;
    }
    const timer = setTimeout(() => setRemoved(null), UNDO_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [removed]);

  async function handleRemove(hotel: HotelCard) {
    if (!wishlist.canToggle) {
      return;
    }

    await wishlist.remove(hotel.id);

    // Offer Undo only if the hotel is really gone from the list (the request may have failed)
    const stillSaved = useWishlistStore.getState().hotels.some((saved) => saved.id === hotel.id);
    if (!stillSaved) {
      setRemoved(hotel);
    }
  }

  async function handleUndo() {
    if (!removed) {
      return;
    }
    const hotelToRestore = removed;
    setRemoved(null);
    await wishlist.add(hotelToRestore.id);
  }

  const isLoading = wishlist.status === "idle" || wishlist.status === "loading";
  const savedCount = wishlist.hotels.length;
  const sortedHotels = sortHotels(wishlist.hotels, sort);

  return (
    <div className={styles.div1}>
      <div className={styles.div2}>
        <Link to="/" className={styles.link1}>
          <span className={`${styles.span1} material-symbols-outlined`}>arrow_back</span>
          <span>Back to explore</span>
        </Link>
        <span className={styles.span2}>/</span>
        <span className={styles.span3}>Saved</span>
      </div>

      <div className={styles.div3}>
        <div className={styles.div4}>
          <h1 className={styles.h11}>Saved stays</h1>
          <p className={styles.p1}>
            Hotels you have shortlisted. Pick dates to see rooms and prices.
          </p>
        </div>
        <div className={styles.div5}>
          <span className={styles.span4}>{savedCount}</span>
          <span>of {MAX_SAVED} saved</span>
        </div>
      </div>

      {wishlist.error ? (
        <div
          role="alert"
          className={styles.div6}
        >
          <span>{wishlist.error}</span>
          <button type="button" onClick={wishlist.clearError} className={styles.button1}>
            Dismiss
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div className={styles.div7} aria-busy="true">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className={styles.div8}>
              <div className={styles.div9} />
              <div className={styles.div10} />
              <div className={styles.div11} />
            </div>
          ))}
        </div>
      ) : null}

      {/* A failed first load. (A failed add or remove keeps status "ready" and shows the banner above.) */}
      {wishlist.status === "error" ? (
        <div className={styles.div12}>
          <span className={`${styles.span5} material-symbols-outlined`}>cloud_off</span>
          <p className={styles.p2}>
            We could not load your saved stays.
          </p>
          <button
            type="button"
            onClick={wishlist.reload}
            className={styles.button2}
          >
            Try again
          </button>
        </div>
      ) : null}

      {wishlist.status === "ready" && savedCount === 0 ? (
        <div className={styles.div13}>
          <span className={`${styles.span5} material-symbols-outlined`}>favorite</span>
          <h2 className={styles.h21}>No saved stays yet</h2>
          <p className={styles.p3}>
            Tap the heart on a hotel to keep it here for later.
          </p>
          <Link
            to="/"
            className={styles.link2}
          >
            Explore stays
          </Link>
        </div>
      ) : null}

      {wishlist.status === "ready" && savedCount > 0 ? (
        <>
          <div className={styles.div14}>
            <label htmlFor="wishlistSort">Sort by:</label>
            <select
              id="wishlistSort"
              value={sort}
              onChange={(event) => setSort(event.target.value as WishlistSort)}
              className={styles.select1}
            >
              <option value="recent">Recently added</option>
              <option value="rating">Highest rating</option>
              <option value="name">Alphabetical (A-Z)</option>
            </select>
          </div>

          <div className={styles.div15}>
            {sortedHotels.map((hotel) => (
              <WishlistCard
                key={hotel.id}
                hotel={hotel}
                disabled={!wishlist.canToggle}
                onRemove={() => handleRemove(hotel)}
              />
            ))}
          </div>
        </>
      ) : null}

      {removed ? (
        <div
          role="status"
          className={styles.div16}
        >
          <span className={`${styles.span6} material-symbols-outlined`}>bookmark_remove</span>
          <span className={styles.span7}>{removed.name} removed from your saved stays.</span>
          <button
            type="button"
            onClick={handleUndo}
            className={styles.button3}
          >
            Undo
          </button>
        </div>
      ) : null}
    </div>
  );
}
