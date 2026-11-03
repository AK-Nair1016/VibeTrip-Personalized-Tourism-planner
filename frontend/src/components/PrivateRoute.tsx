import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

// Wraps every page that needs a login. Used in App.tsx as a layout route:
// <Route element={<PrivateRoute />}> ...private pages... </Route>
export default function PrivateRoute() {
  const isCheckingSession = useAuthStore((state) => state.isCheckingSession);
  const accessToken = useAuthStore((state) => state.accessToken);
  const location = useLocation();

  // On a reload the token is gone until the refresh call finishes. Redirecting now
  // would send a logged-in user to /login, so we wait.
  if (isCheckingSession) {
    return <p>Loading...</p>;
  }

  // Remember where the user was heading so the login page can send them back there.
  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
