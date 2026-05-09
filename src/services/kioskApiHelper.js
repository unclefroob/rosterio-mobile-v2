import kioskApiClient from "./kioskApiClient";

/**
 * Kiosk-mode API helpers. All requests are authenticated via the
 * `Authorization: Kiosk <token>` + `X-Account-Id` header pair set by
 * `kioskApiClient`'s request interceptor. AsyncStorage keys:
 *   @kiosk:token, @kiosk:accountId, @kiosk:locationId, @kiosk:mode
 *
 * Two-phase clock-in / clock-out: PIN goes to /preview which returns an
 * actionToken + worker/shift summary, mobile shows confirmation, then commits
 * with the actionToken. Break start/end is single-phase (no confirm step).
 */

const wrap = async (fn, label) => {
  try {
    const response = await fn();
    return response.data;
  } catch (error) {
    console.error(`[kiosk] ${label} error:`, error);
    const data = error.response?.data;
    return {
      success: false,
      message: data?.message || error.message || `Error: ${label}`,
      status: error.response?.status,
      data: data?.data,
    };
  }
};

export const kioskClockInPreview = (pin) =>
  wrap(() => kioskApiClient.post("/api/kiosk/clockin/preview", { pin }), "clockin preview");

export const kioskClockInCommit = (actionToken) =>
  wrap(() => kioskApiClient.post("/api/kiosk/clockin/commit", { actionToken }), "clockin commit");

export const kioskClockOutPreview = (pin) =>
  wrap(() => kioskApiClient.post("/api/kiosk/clockout/preview", { pin }), "clockout preview");

export const kioskClockOutCommit = (actionToken) =>
  wrap(() => kioskApiClient.post("/api/kiosk/clockout/commit", { actionToken }), "clockout commit");

export const kioskBreakStart = (pin) =>
  wrap(() => kioskApiClient.post("/api/kiosk/break/start", { pin }), "break start");

export const kioskBreakEnd = (pin) =>
  wrap(() => kioskApiClient.post("/api/kiosk/break/end", { pin }), "break end");
