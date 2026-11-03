import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/authStore";

// Every backend reply is wrapped as { success, message, data }. The api functions unwrap `data`.
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// Local development runs Vite on 5173 and the API on 5000. Production must set VITE_API_URL.
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  // Sends the refresh cookie to the backend (needed across Vercel and Render)
  withCredentials: true
});

// Attach the access token to every request that has one.
// getState() reads the store outside React, which is the only way to reach it from here.
api.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken;

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

// A request config that remembers whether we already retried it after a refresh.
interface RetriableRequest extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

// On these URLs a 401 means "wrong credentials" or "refresh cookie is no good", not "token expired",
// so refreshing again would be pointless (and would loop).
const NO_REFRESH_URLS = ["/auth/login", "/auth/signup", "/auth/refresh"];

// When the access token has expired the backend answers 401. Get a new token from the refresh
// cookie and retry the request once, so the user never notices.
api.interceptors.response.use(
  (response) => {
    // Every real reply is a JSON object. A string usually means the API URL points to a frontend
    // server, which answers unknown paths with index.html and a 200. Without this check, pages
    // would read `.data.data` off a string and crash blank.
    if (typeof response.data === "string" && response.data.length > 0) {
      console.error(
        "The API did not answer with JSON. Check that VITE_API_URL points to the backend (local default: http://localhost:5000/api), then restart `npm run dev`."
      );
      return Promise.reject(new Error("The server did not answer as expected."));
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequest | undefined;
    const status = error.response?.status;

    // Not an expired-token case: pass the error on to whoever made the call
    const requestUrl = originalRequest?.url ?? "";
    const skipRefresh = NO_REFRESH_URLS.some((url) => requestUrl.includes(url));

    if (!originalRequest || status !== 401 || originalRequest._retried || skipRefresh) {
      return Promise.reject(error);
    }

    // Mark it first, so a second 401 on the retry is not refreshed again
    originalRequest._retried = true;

    try {
      // Plain axios, not `api`: the refresh call must not pass through this interceptor
      const refreshResponse = await axios.post<ApiResponse<{ accessToken: string }>>(
        `${API_BASE_URL}/auth/refresh`,
        null,
        { withCredentials: true }
      );

      const newAccessToken = refreshResponse.data.data.accessToken;
      useAuthStore.getState().setAccessToken(newAccessToken);

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      // The refresh cookie is missing or expired: the user really is logged out
      useAuthStore.getState().clearSession();
      return Promise.reject(refreshError);
    }
  }
);
