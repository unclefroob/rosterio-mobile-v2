import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../config/api";

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Refresh concurrency lock — prevents multiple simultaneous token refresh calls
// when several requests get 401 at the same time (e.g. PlanContext + AuthContext
// both calling /api/auth/me on startup with an expired access token).
let isRefreshing = false;
let pendingRefreshCallbacks = [];

function notifyPendingRequests(newToken) {
  pendingRefreshCallbacks.forEach((cb) => cb(null, newToken));
  pendingRefreshCallbacks = [];
}

function rejectPendingRequests(err) {
  pendingRefreshCallbacks.forEach((cb) => cb(err, null));
  pendingRefreshCallbacks = [];
}

// Request interceptor
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh for 401 errors (not network errors or other status codes)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // If a refresh is already in flight, queue this request and wait.
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRefreshCallbacks.push((err, newToken) => {
            if (err) {
              reject(err);
            } else {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              resolve(apiClient(originalRequest));
            }
          });
        });
      }

      isRefreshing = true;

      try {
        const refreshToken = await AsyncStorage.getItem("refreshToken");
        const oldAccessToken = await AsyncStorage.getItem("accessToken");

        if (refreshToken) {
          // Add timeout to refresh request to prevent hanging
          const refreshResponse = await Promise.race([
            axios.post(`${API_URL}/api/auth/refresh`, {
            refreshToken,
            accessToken: oldAccessToken, // Send old token to preserve account context
            }, { timeout: 10000 }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Refresh request timeout")), 10000)
            )
          ]);

          if (refreshResponse.data.success && refreshResponse.data.data.accessToken) {
            const { accessToken } = refreshResponse.data.data;

            await AsyncStorage.setItem("accessToken", accessToken);

            // Unblock any requests that were waiting for the new token.
            notifyPendingRequests(accessToken);

            // Update the original request with new token
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return apiClient(originalRequest);
          } else {
            throw new Error("Invalid refresh response");
          }
        } else {
          console.warn("No refresh token available, cannot refresh access token");
          // Clear tokens and let the app handle re-authentication
          await AsyncStorage.removeItem("accessToken");
          await AsyncStorage.removeItem("refreshToken");
          const noTokenError = new Error("No refresh token available. Please log in again.");
          rejectPendingRequests(noTokenError);
          return Promise.reject(noTokenError);
        }
      } catch (refreshError) {
        // Check if it's a network error vs auth error
        const isNetworkError = !refreshError.response && (
          refreshError.message === "Network Error" ||
          refreshError.code === "NETWORK_ERROR" ||
          refreshError.message?.includes("Network") ||
          refreshError.message?.includes("timeout")
        );

        // Check if it's an auth error (401, 403, or invalid token)
        const isAuthError = refreshError.response?.status === 401 ||
                           refreshError.response?.status === 403 ||
                           refreshError.message?.includes("Invalid") ||
                           refreshError.message?.includes("expired");

        if (isNetworkError) {
          // Network error during refresh - don't clear tokens, they might still be valid
          console.warn("⚠️ Network error during token refresh - tokens preserved");
          rejectPendingRequests(error);
          return Promise.reject(error);
        } else if (isAuthError) {
          // Auth error - tokens are invalid or expired, clear them silently
          // Don't log to console as this is expected behavior when tokens expire
          await AsyncStorage.removeItem("accessToken");
          await AsyncStorage.removeItem("refreshToken");

          // Create a user-friendly error that indicates login is required
          const authError = new Error("Session expired. Please log in again.");
          authError.name = "AuthError";
          authError.isAuthError = true;
          rejectPendingRequests(authError);
          return Promise.reject(authError);
        } else {
          // Other errors - log and clear tokens
          console.error("Token refresh failed:", refreshError);
          await AsyncStorage.removeItem("accessToken");
          await AsyncStorage.removeItem("refreshToken");
          rejectPendingRequests(refreshError);
          return Promise.reject(refreshError);
        }
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

