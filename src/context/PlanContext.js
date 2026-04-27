import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import apiClient from "../services/apiClient";
import { useAuth } from "./AuthContext";

const PlanContext = createContext();

export const usePlan = () => {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error("usePlan must be used within a PlanProvider");
  }
  return context;
};

export function PlanContextProvider({ children }) {
  const { state: authState } = useAuth();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  // Monotonically increasing counter — each loadPlan() call increments it.
  // When a call completes it checks that its id still matches the current counter
  // before applying state updates, preventing a slow earlier call from overwriting
  // a faster later call (e.g. initial startup load losing a race with refreshPlan).
  const loadIdRef = useRef(0);

  const loadPlan = async () => {
    const myLoadId = ++loadIdRef.current;
    setLoading(true);
    try {
      // Try to get plan from /api/auth/me first (accessible to all users)
      const response = await apiClient.get("/api/auth/me");

      // Discard stale responses — a newer loadPlan() call is already in flight.
      if (myLoadId !== loadIdRef.current) return;

      if (response.data.success && response.data.data.plan) {
        setPlan(response.data.data.plan);
        setLoading(false);
        return;
      }

      // Fallback: try /api/settings (manager only)
      try {
        const settingsResponse = await apiClient.get("/api/settings");
        if (myLoadId !== loadIdRef.current) return;
        if (settingsResponse.data.success && settingsResponse.data.data.plan) {
          setPlan(settingsResponse.data.data.plan);
          setLoading(false);
          return;
        }
      } catch (settingsError) {
        // Settings endpoint may not be accessible, that's okay
      }

      if (myLoadId !== loadIdRef.current) return;
      // Default to starter if no plan info
      setPlan({
        plan: "starter",
        maxLocations: 1,
        hasMarketplace: false,
        maxUsers: -1,
      });
    } catch (error) {
      if (myLoadId !== loadIdRef.current) return;
      console.error("Error loading plan:", error);
      // Default to starter on error
      setPlan({
        plan: "starter",
        maxLocations: 1,
        hasMarketplace: false,
        maxUsers: -1,
      });
    } finally {
      if (myLoadId === loadIdRef.current) setLoading(false);
    }
  };

  // Only load plan once auth is fully settled with an account-scoped token.
  // This prevents a race where loadPlan() fires with a user-level token before
  // bootstrapAsync has finished selecting an account and storing the account token.
  useEffect(() => {
    if (authState.isLoading) {
      // Auth is still bootstrapping — keep plan in loading state, don't fire yet.
      return;
    }

    if (!authState.isSignedIn || !authState.selectedAccount) {
      // User is not authenticated or has no account — reset plan state.
      ++loadIdRef.current; // Invalidate any in-flight loadPlan call.
      setPlan(null);
      setLoading(false);
      return;
    }

    // Auth is settled with a valid account-scoped token — safe to load plan.
    loadPlan();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState.isLoading, authState.isSignedIn, authState.selectedAccount]);

  const value = {
    plan,
    loading,
    refreshPlan: loadPlan,
    isPro: plan?.plan === "pro",
    isStarter: plan?.plan === "starter",
    hasMarketplace: plan?.hasMarketplace || false,
    maxLocations: plan?.maxLocations || 1,
  };

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}
