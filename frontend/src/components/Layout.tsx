import { Outlet } from "react-router-dom";

// The frame around every page: top bar on top, the current page under it.
export default function Layout() {
  // TODO 1: a top bar with the VibeTrip name linking to "/" (use <Link>, not <a>)
  // TODO 2: logged out: links to /login and /signup. Logged in: links to /bookings, /wishlist,
  //         /profile and a Logout button (read accessToken from useAuthStore)
  // TODO 3: Logout calls POST /auth/logout through an api function, then clearSession()
  return (
    <div className="min-h-screen">
      <main>
        <Outlet />
      </main>
    </div>
  );
}
