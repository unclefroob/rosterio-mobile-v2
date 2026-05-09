import apiClient from "./apiClient";
import { API_URL } from "../config/api";

/**
 * Dashboard API
 */
export const getDashboardData = async () => {
  try {
    const response = await apiClient.get("/api/pages/dashboard");
    return response.data;
  } catch (error) {
    console.error("API Error fetching dashboard data:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Error fetching dashboard data",
    };
  }
};

/**
 * My Shifts API
 */
export const getMyShiftsData = async (tab, limit = 10, offset = 0, dateRange = {}, scope) => {
  try {
    const response = await apiClient.get("/api/pages/my-shifts", {
      params: { tab, limit, offset, ...dateRange, ...(scope ? { scope } : {}) },
    });
    return response.data;
  } catch (error) {
    console.error("API Error fetching my shifts data:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Error fetching my shifts data",
    };
  }
};

export const getMyShiftsCounts = async (scope) => {
  try {
    const response = await apiClient.get("/api/pages/my-shifts/counts", {
      params: scope ? { scope } : {},
    });
    return response.data;
  } catch (error) {
    console.error("API Error fetching my shifts counts:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Error fetching my shifts counts",
    };
  }
};

/**
 * Shift Swapping API
 */
export const requestShiftSwap = async (requesterShiftId, targetUserId, message = "") => {
  try {
    const response = await apiClient.post(`/api/shifts/${requesterShiftId}/swap/request`, {
      targetUserId,
      message,
    });
    return response.data;
  } catch (error) {
    console.error("API Error requesting shift swap:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Error requesting shift swap",
    };
  }
};

export const getSwapRequests = async (type = null) => {
  try {
    const response = await apiClient.get("/api/shifts/swap-requests", {
      params: type ? { type } : {},
    });
    return response.data;
  } catch (error) {
    console.error("API Error fetching swap requests:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Error fetching swap requests",
    };
  }
};

export const proposeShiftForSwap = async (requestId, proposedShiftId = null) => {
  try {
    const response = await apiClient.post(`/api/shifts/swap-requests/${requestId}/propose`, {
      proposedShiftId,
    });
    return response.data;
  } catch (error) {
    console.error("API Error proposing shift for swap:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Error proposing shift for swap",
    };
  }
};

export const rejectSwapRequest = async (requestId, reason = null) => {
  try {
    const response = await apiClient.post(`/api/shifts/swap-requests/${requestId}/reject`, {
      reason,
    });
    return response.data;
  } catch (error) {
    console.error("API Error rejecting swap request:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Error rejecting swap request",
    };
  }
};

export const cancelSwapRequest = async (requestId) => {
  try {
    const response = await apiClient.post(`/api/shifts/swap-requests/${requestId}/cancel`);
    return response.data;
  } catch (error) {
    console.error("API Error cancelling swap request:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Error cancelling swap request",
    };
  }
};

export const approveSwapRequest = async (requestId) => {
  try {
    const response = await apiClient.post(`/api/shifts/swap-requests/${requestId}/approve`);
    return response.data;
  } catch (error) {
    console.error("API Error approving swap request:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Error approving swap request",
    };
  }
};

export const getPendingSwapRequests = async () => {
  try {
    const response = await apiClient.get("/api/shifts/swap-requests/pending-approval");
    return response.data;
  } catch (error) {
    console.error("API Error fetching pending swap requests:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Error fetching pending swap requests",
    };
  }
};

export const searchStaff = async (params = {}) => {
  try {
    const response = await apiClient.get("/api/staff/search", { params });
    return response.data;
  } catch (error) {
    console.error("API Error searching staff:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Error searching staff",
    };
  }
};

/**
 * Fetch users eligible to swap into a specific shift.
 * Filters by the shift's location and excludes the requester + already-assigned users.
 */
export const searchSwapCandidates = async (shiftId, q, limit) => {
  if (!shiftId) {
    return { success: false, message: "shiftId is required" };
  }
  try {
    const params = {};
    if (q) params.q = q;
    if (limit) params.limit = limit;
    const response = await apiClient.get(`/api/shifts/${shiftId}/swap-candidates`, { params });
    return response.data;
  } catch (error) {
    console.error("API Error fetching swap candidates:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Error fetching swap candidates",
    };
  }
};

/**
 * Profile API
 */
export const updateProfile = async (profileData) => {
  try {
    const response = await apiClient.put("/api/auth/profile", profileData);
    return response.data;
  } catch (error) {
    console.error("API Error updating profile:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Error updating profile",
    };
  }
};

export const changePassword = async (passwordData) => {
  try {
    const response = await apiClient.put("/api/auth/change-password", passwordData);
    return response.data;
  } catch (error) {
    console.error("API Error changing password:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Error changing password",
    };
  }
};

/**
 * Shift Completion API
 */
export const completeShift = async (shiftId, data) => {
  try {
    const response = await apiClient.post(`/api/shifts/${shiftId}/complete`, data);
    return response.data;
  } catch (error) {
    console.error("API Error completing shift:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Error completing shift",
    };
  }
};

export const rejectShiftCompletion = async (shiftId, data) => {
  try {
    const response = await apiClient.post(`/api/shifts/${shiftId}/reject-completion`, data);
    return response.data;
  } catch (error) {
    console.error("API Error rejecting shift completion:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Error rejecting shift completion",
    };
  }
};

/**
 * Shift Check-In / Check-Out API
 */
export const checkInToShift = async (shiftId, coords) => {
  try {
    const response = await apiClient.post(`/api/shifts/${shiftId}/checkin`, coords || {});
    return response.data;
  } catch (error) {
    console.error("API Error checking in to shift:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Error checking in to shift",
    };
  }
};

export const checkOutFromShift = async (shiftId, coords) => {
  try {
    const response = await apiClient.post(`/api/shifts/${shiftId}/checkout`, coords || {});
    return response.data;
  } catch (error) {
    console.error("API Error checking out from shift:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Error checking out from shift",
    };
  }
};

export const getShiftClockStatus = async (shiftId) => {
  try {
    const response = await apiClient.get(`/api/shifts/${shiftId}/clock-status`);
    return response.data;
  } catch (error) {
    console.error("API Error fetching clock status:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Error fetching clock status",
    };
  }
};

/**
 * Live attendance / on-behalf-of API (manager role).
 *
 * Routes (resolved by the API contract broker):
 *   GET  /api/locations/:id/zone-roster
 *   POST /api/shifts/:shiftId/clockin/on-behalf            { workerId, reason? }
 *   POST /api/shifts/:shiftId/clockout/on-behalf           { workerId, reason? }
 *   POST /api/clockentries/:id/breaks/start/on-behalf      { reason? }
 *   POST /api/clockentries/:id/breaks/end/on-behalf        { reason? }
 */
export const getZoneRoster = async (locationId) => {
  try {
    const response = await apiClient.get(`/api/locations/${locationId}/zone-roster`);
    return response.data;
  } catch (error) {
    console.error("API Error fetching zone roster:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Error fetching zone roster",
    };
  }
};

export const clockInOnBehalf = async (shiftId, workerId, reason) => {
  try {
    const response = await apiClient.post(
      `/api/shifts/${shiftId}/clockin/on-behalf`,
      { workerId, ...(reason ? { reason } : {}) }
    );
    return response.data;
  } catch (error) {
    console.error("API Error clock-in on behalf:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Error clocking in worker",
    };
  }
};

export const clockOutOnBehalf = async (shiftId, workerId, reason) => {
  try {
    const response = await apiClient.post(
      `/api/shifts/${shiftId}/clockout/on-behalf`,
      { workerId, ...(reason ? { reason } : {}) }
    );
    return response.data;
  } catch (error) {
    console.error("API Error clock-out on behalf:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Error clocking out worker",
    };
  }
};

export const startBreakOnBehalf = async (clockEntryId, reason) => {
  try {
    const response = await apiClient.post(
      `/api/clockentries/${clockEntryId}/breaks/start/on-behalf`,
      reason ? { reason } : {}
    );
    return response.data;
  } catch (error) {
    console.error("API Error start break on behalf:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Error starting break",
    };
  }
};

export const endBreakOnBehalf = async (clockEntryId, reason) => {
  try {
    const response = await apiClient.post(
      `/api/clockentries/${clockEntryId}/breaks/end/on-behalf`,
      reason ? { reason } : {}
    );
    return response.data;
  } catch (error) {
    console.error("API Error end break on behalf:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Error ending break",
    };
  }
};

