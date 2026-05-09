import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../config/api";

/**
 * Kiosk API client — separate axios instance for kiosk-mode requests.
 *
 * Authentication shape: `Authorization: Kiosk <token>` + `X-Account-Id` header
 * (different from the user-JWT apiClient's `Bearer <token>`). NO refresh
 * interceptor — a kiosk token is a long-lived device token; if it 401s the
 * kiosk has been unpaired and the device must re-pair.
 *
 * AsyncStorage keys consumed by this client:
 *   @kiosk:mode        'true' | null  — master flag for the root layout fork
 *   @kiosk:token       string         — long-lived device token from pairing
 *   @kiosk:locationId  string         — ObjectId hex, scopes the device
 *   @kiosk:accountId   string         — ObjectId hex, multi-tenant routing
 *   @kiosk:pairedAt    ISO string     — telemetry / debugging
 */

const kioskApiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

kioskApiClient.interceptors.request.use(
  async (config) => {
    const [token, accountId] = await Promise.all([
      AsyncStorage.getItem("@kiosk:token"),
      AsyncStorage.getItem("@kiosk:accountId"),
    ]);
    if (token) {
      config.headers.Authorization = `Kiosk ${token}`;
    }
    if (accountId) {
      config.headers["X-Account-Id"] = accountId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response: do NOT call /auth/refresh. On 401 the kiosk token is invalid —
// surface the error and let the screen redirect to the pairing flow.
kioskApiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default kioskApiClient;
