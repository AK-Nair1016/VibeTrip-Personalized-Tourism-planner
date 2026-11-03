import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "@vibetrip/shared-types";
import { useAuthStore } from "../store/authStore";
import { useCurrencyStore } from "../store/currencyStore";
import { logoutRequest } from "../api/auth";

// Styles for a top-bar link. NavLink tells us whether the link points at the page we are on.
// TODO(human): return the class string for the active and inactive nav link (see the mock:
// active = dark text, font-title, a 2px primary-container underline; inactive = muted text
// that darkens on hover).
function navLinkClass(isActive: boolean): string {
  return isActive ? "" : "";
}

// The frame around every page: top bar on top, the current page under it.
export default function Layout() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const clearSession = useAuthStore((state) => state.clearSession);
  const currency = useCurrencyStore((state) => state.currency);
  const setCurrency = useCurrencyStore((state) => state.setCurrency);
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logoutRequest();
    } catch {
      // Even if the request fails, log out on this device: the user asked to leave
    } finally {
      // Go home first, so PrivateRoute does not redirect a logged-out user to /login
      navigate("/");
      clearSession();
    }
  }

  const menuLinkClass =
    "block rounded-lg px-3 py-2 font-label-md text-label-md text-on-surface hover:bg-surface-container-low";

  return (
    <div className="min-h-screen bg-surface">
      <header className="fixed left-0 right-0 top-0 z-50 w-full border-b border-outline-variant bg-surface-container-lowest">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-margin-mobile md:px-margin">
          {/* Brand: two dots joined by a route line, drawn inline so nothing depends on a hosted image */}
          <Link to="/" className="flex items-center gap-space-sm">
            <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
              <path d="M8 22 C 14 22, 14 10, 24 10" fill="none" stroke="#0f766e" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="8" cy="22" r="4" fill="#0f766e" />
              <circle cx="24" cy="10" r="4" fill="#0f766e" />
            </svg>
            <span className="hidden font-title text-title tracking-tight text-on-surface sm:inline">VibeTrip</span>
          </Link>

          <nav className="flex items-center gap-space-lg">
            <NavLink to="/hotels" className={({ isActive }) => navLinkClass(isActive)}>
              Stays
            </NavLink>
            <NavLink to="/flights" className={({ isActive }) => navLinkClass(isActive)}>
              Flights
            </NavLink>
          </nav>

          <div className="flex items-center gap-space-sm">
            {/* Currency picker. The server converts prices; we only send the code. */}
            <select
              aria-label="Currency"
              value={currency}
              onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
              className="rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1.5 font-label-sm text-label-sm text-on-surface"
            >
              {SUPPORTED_CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>

            {/* Account menu: <details> opens and closes itself, no state needed */}
            <details className="relative">
              <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-full border border-outline-variant bg-surface-container-lowest px-2.5 py-1 hover:bg-surface-container-low">
                <span className="material-symbols-outlined text-[20px]">menu</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                  <span className="material-symbols-outlined text-[18px] text-on-primary">person</span>
                </span>
              </summary>

              <div className="absolute right-0 mt-2 w-48 rounded-xl border border-outline-variant bg-surface-container-lowest p-2 shadow-lg">
                {accessToken ? (
                  <>
                    <Link to="/bookings" className={menuLinkClass}>
                      My trips
                    </Link>
                    <Link to="/wishlist" className={menuLinkClass}>
                      Saved stays
                    </Link>
                    <Link to="/profile" className={menuLinkClass}>
                      Profile
                    </Link>
                    <button type="button" onClick={handleLogout} className={`${menuLinkClass} w-full text-left`}>
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className={menuLinkClass}>
                      Log in
                    </Link>
                    <Link to="/signup" className={menuLinkClass}>
                      Sign up
                    </Link>
                  </>
                )}
              </div>
            </details>
          </div>
        </div>
      </header>

      {/* pt-[72px] keeps page content below the fixed header */}
      <main className="w-full pt-[72px]">
        <Outlet />
      </main>
    </div>
  );
}
