import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import Layout from "./components/Layout";
import PrivateRoute from "./components/PrivateRoute";

export default function App() {
  // TODO (session restore): on first load, call POST /auth/refresh then GET /users/me, save them
  // with setSession, and always call finishSessionCheck() at the end, even when it fails.
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        {/* TODO public pages: /login, /signup, /hotels, /hotels/:id, /flights */}
        <Route element={<PrivateRoute />}>
          {/* TODO private pages: /bookings, /wishlist, /profile, /checkout */}
        </Route>
      </Route>
    </Routes>
  );
}
