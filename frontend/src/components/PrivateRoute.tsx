import { Outlet } from "react-router-dom";

// Wraps every page that needs a login. Used in App.tsx as a layout route:
// <Route element={<PrivateRoute />}> ...private pages... </Route>
export default function PrivateRoute() {
  // TODO 1: read isCheckingSession and accessToken from useAuthStore
  // TODO 2: if isCheckingSession is true, show a small "Loading..." and stop (do not redirect yet)
  // TODO 3: if there is no accessToken, return <Navigate to="/login" replace state={{ from: location }} />
  //         so the login page can send the user back to where they were (useLocation gives location)
  // TODO 4: otherwise render the page inside: <Outlet />
  return <Outlet />;
}
