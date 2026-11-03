import { isAxiosError } from "axios";

// The backend's error envelope is { success: false, error: { code, message } }.
interface ErrorBody {
  error?: { code?: string; message?: string };
}

export interface ApiErrorInfo {
  status: number | null;
  code: string;
  message: string;
}

// The one place a caught error becomes { status, code, message }.
// Every page uses this instead of reading error.response.data itself.
export function readApiError(error: unknown): ApiErrorInfo {
  if (isAxiosError<ErrorBody>(error)) {
    // No response means the request never reached the server (offline, server down, CORS)
    if (!error.response) {
      return {
        status: null,
        code: "NETWORK_ERROR",
        message: "Could not reach the server. Check your connection and try again."
      };
    }

    const body = error.response.data;
    return {
      status: error.response.status,
      code: body?.error?.code ?? "UNKNOWN_ERROR",
      message: body?.error?.message ?? "Something went wrong. Please try again."
    };
  }

  return { status: null, code: "UNKNOWN_ERROR", message: "Something went wrong. Please try again." };
}
