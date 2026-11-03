import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ProfilePage from "./pages/ProfilePage";
import HotelResultsPage from "./pages/HotelResultsPage";
import HotelDetailPage from "./pages/HotelDetailPage";
import WishlistPage from "./pages/WishlistPage";
import FlightResultsPage from "./pages/FlightResultsPage";
import FlightCheckoutPage from "./pages/FlightCheckoutPage";
import HotelCheckoutPage from "./pages/HotelCheckoutPage";
import BookingsPage from "./pages/BookingsPage";
import BookingDetailPage from "./pages/BookingDetailPage";
import Layout from "./components/Layout";
import PrivateRoute from "./components/PrivateRoute";
import { useAuthStore } from "./store/authStore";
import { refreshAccessToken, fetchCurrentUser } from "./api/auth";

export default function App() {
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const finishSessionCheck = useAuthStore((state) => state.finishSessionCheck);

  // Runs once on first load: a reload wipes the in-memory token, so try to get it back
  // from the refresh cookie.
  useEffect(() => {
    async function restoreSession() {
      try {
        const accessToken = await refreshAccessToken();

        // Save the token first: fetchCurrentUser() reads it from the store to build its header.
        setSession(accessToken, null);

        const user = await fetchCurrentUser();
        setSession(accessToken, user);
      } catch {
        // No cookie or an expired one is normal for a visitor who is not logged in
        clearSession();
      } finally {
        // Always end the check, or PrivateRoute shows "Loading..." forever
        finishSessionCheck();
      }
    }

    restoreSession();
  }, [setSession, clearSession, finishSessionCheck]);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
        <Route path="/hotels" element={<HotelResultsPage />} />
        <Route path="/hotels/:id" element={<HotelDetailPage />} />
        <Route path="/flights" element={<FlightResultsPage />} />
        <Route element={<PrivateRoute />}>
          <Route path="/checkout/flight" element={<FlightCheckoutPage />} />
          <Route path="/checkout/hotel" element={<HotelCheckoutPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/bookings/:id" element={<BookingDetailPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>
    </Routes>
  );
}
