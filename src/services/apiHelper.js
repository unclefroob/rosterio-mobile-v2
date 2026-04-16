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
export const getMyShiftsData = async (tab, limit = 10, offset = 0, dateRange = {}) => {
  try {
    const response = await apiClient.get("/api/pages/my-shifts", {
      params: { tab, limit, offset, ...dateRange },
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

export const getMyShiftsCounts = async () => {
  try {
    const response = await apiClient.get("/api/pages/my-shifts/counts");
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

