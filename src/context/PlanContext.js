import React, { createContext, useContext, useState, useEffect } from "react";
import apiClient from "../services/apiClient";

const PlanContext = createContext();

export const usePlan = () => {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error("usePlan must be used within a PlanProvider");
  }
  return context;
};

export function PlanContextProvider({ children }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadPlan = async () => {
    try {
      // Try to get plan from /api/auth/me first (accessible to all users)
      const response = await apiClient.get("/api/auth/me");
      if (response.data.success && response.data.data.plan) {
        setPlan(response.data.data.plan);
        setLoading(false);
        return;
      }
      
      // Fallback: try /api/settings (manager only)
      try {
        const settingsResponse = await apiClient.get("/api/settings");
        if (settingsResponse.data.success && settingsResponse.data.data.plan) {
          setPlan(settingsResponse.data.data.plan);
          setLoading(false);
          return;
        }
      } catch (settingsError) {
        // Settings endpoint may not be accessible, that's okay
        console.log("Settings endpoint not accessible, using default plan");
      }
      
      // Default to starter if no plan info
      setPlan({
        plan: "starter",
        maxLocations: 1,
        hasMarketplace: false,
        maxUsers: -1,
      });
    } catch (error) {
      console.error("Error loading plan:", error);
      // Default to starter on error
      setPlan({
        plan: "starter",
        maxLocations: 1,
        hasMarketplace: false,
        maxUsers: -1,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlan();
  }, []);

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
