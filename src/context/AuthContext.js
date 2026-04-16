import React, { useEffect, useReducer } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import apiClient from "../services/apiClient";
import { API_URL } from "../config/api";

export const AuthContext = React.createContext();

function authReducer(state, action) {
  switch (action.type) {
    case "RESTORE_TOKEN":
      return {
        ...state,
        userToken: action.payload,
        isLoading: false,
      };
    case "SIGN_IN":
      return {
        ...state,
        isSignedIn: true,
        userToken: action.payload.token,
        user: action.payload.user,
        selectedAccount: action.payload.selectedAccount,
        role: action.payload.role,
      };
    case "SELECT_ACCOUNT":
      return {
        ...state,
        selectedAccount: action.payload.accountId,
        userToken: action.payload.token || state.userToken,
        role: action.payload.role,
        user: {
          ...state.user,
          selectedAccount: action.payload.accountId,
          account: action.payload.account,
          role: action.payload.role,
        },
      };
    case "SIGN_OUT":
      return {
        ...state,
        isSignedIn: false,
        userToken: null,
        user: null,
        selectedAccount: null,
      };
    case "SET_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      };
    default:
      return state;
  }
}

export function AuthContextProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, {
    isLoading: true,
    isSignedIn: false,
    userToken: null,
    user: null,
    selectedAccount: null,
    role: null,
  });

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        let userToken;
        userToken = await AsyncStorage.getItem("accessToken");

        if (userToken) {
          try {
            // Validate token and get user profile (including accounts)
            // Use apiClient instead of axios to benefit from automatic token refresh
            // Add timeout to prevent hanging on network errors
            const response = await Promise.race([
              apiClient.get(`/api/auth/me`),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Request timeout")), 10000)
              )
            ]);
            
            const userData = response.data.data.user;
            const accounts = userData.accounts || [];
            const selectedAccountId = userData.accountId || userData.selectedAccount;
            const role = userData.role;
            
            console.log("🔄 Token restore - User:", userData);
            console.log("🔄 Token restore - Accounts:", accounts);
            console.log("🔄 Token restore - Selected Account:", selectedAccountId);
            console.log("🔄 Token restore - Role:", role);
            
            // If we have a selected account, use it directly
            if (selectedAccountId && role) {
              dispatch({
                type: "SIGN_IN",
                payload: {
                  token: userToken,
                  user: { ...userData, accounts },
                  selectedAccount: selectedAccountId,
                  role: role,
                },
              });
            } else if (accounts.length > 0) {
              // No account selected but have accounts - auto-select first one
              const firstAccount = accounts[0];
              const accountIdToSelect = firstAccount.id || firstAccount._id;
              
              try {
                const selectResponse = await apiClient.post(
                  `/api/auth/select-account`,
                  { accountId: accountIdToSelect }
                );
                
                if (selectResponse.data.success) {
                  const { accountToken, account, role: selectedRole } = selectResponse.data.data;
                  await AsyncStorage.setItem("accessToken", accountToken);
                  // Preserve refresh token if it exists
                  const existingRefreshToken = await AsyncStorage.getItem("refreshToken");
                  if (existingRefreshToken) {
                    await AsyncStorage.setItem("refreshToken", existingRefreshToken);
                  }
                  
                  dispatch({
                    type: "SIGN_IN",
                    payload: {
                      token: accountToken,
                      user: { ...userData, accounts, selectedAccount: account.id, role: selectedRole },
                      selectedAccount: account.id,
                      role: selectedRole,
                    },
                  });
                  console.log("✅ Auto-selected account on token restore:", account.name);
                } else {
                  // Select failed, but still sign in with accounts so user can select
                  dispatch({
                    type: "SIGN_IN",
                    payload: {
                      token: userToken,
                      user: { ...userData, accounts },
                      selectedAccount: null,
                      role: null,
                    },
                  });
                }
              } catch (selectError) {
                console.error("❌ Auto-select failed on token restore:", selectError);
                // Still sign in with accounts so user can select
                dispatch({
                  type: "SIGN_IN",
                  payload: {
                    token: userToken,
                    user: { ...userData, accounts },
                    selectedAccount: null,
                    role: null,
                  },
                });
              }
            } else {
              // No accounts - sign in without account
              dispatch({
                type: "SIGN_IN",
                payload: {
                  token: userToken,
                  user: { ...userData, accounts: [] },
                  selectedAccount: null,
                  role: null,
                },
              });
            }
          } catch (error) {
            // Handle different error types
            const isNetworkError = !error.response && (error.message === "Network Error" || error.code === "NETWORK_ERROR" || error.message?.includes("Network"));
            const isAuthError = error.response?.status === 401 || error.response?.status === 403;
            
            if (isNetworkError) {
              // Network error - don't clear tokens, just log and continue without auth
              // This allows the app to work offline and retry when network is available
              console.warn("⚠️ Network error during token restore - will retry on next app launch");
              console.warn("⚠️ Network error details:", error.message);
              // Don't clear tokens on network error - they might still be valid
              dispatch({ type: "RESTORE_TOKEN", payload: null });
            } else if (isAuthError) {
              // Token expired or invalid - clear storage
              console.log("🔄 Token expired or invalid, clearing storage");
              await AsyncStorage.removeItem("accessToken");
              await AsyncStorage.removeItem("refreshToken");
              dispatch({ type: "RESTORE_TOKEN", payload: null });
            } else {
              // Other errors - log and clear tokens to be safe
              console.error("❌ Token restore failed:", error);
              console.error("❌ Error details:", {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
              });
            await AsyncStorage.removeItem("accessToken");
            await AsyncStorage.removeItem("refreshToken");
            dispatch({ type: "RESTORE_TOKEN", payload: null });
            }
          }
        } else {
          dispatch({ type: "RESTORE_TOKEN", payload: null });
        }
      } catch (e) {
        dispatch({ type: "RESTORE_TOKEN", payload: null });
      }
    };

    bootstrapAsync();
  }, []);

  const authContext = React.useMemo(
    () => ({
      signIn: async (email, password) => {
        dispatch({ type: "SET_LOADING", payload: true });
        try {
          console.log(`🔐 Attempting login to: ${API_URL}/api/auth/login`);
          const response = await axios.post(`${API_URL}/api/auth/login`, {
            email,
            password,
          });

          console.log("✅ Login response:", JSON.stringify(response.data, null, 2));
          console.log("✅ Login response.data:", JSON.stringify(response.data.data, null, 2));

          if (!response.data.success) {
            return {
              success: false,
              error: response.data.message || "Login failed. Please try again.",
            };
          }

          // Handle both response structures
          const responseData = response.data.data || response.data;
          const accessToken = responseData?.accessToken;
          const refreshToken = responseData?.refreshToken;
          const user = responseData?.user;
          const accounts = responseData?.accounts || [];
          const selectedAccount = responseData?.selectedAccount;
          const role = responseData?.role;
          
          console.log(`📋 Full responseData:`, JSON.stringify(responseData, null, 2));
          console.log(`📋 Accounts received: ${accounts?.length || 0}`, accounts);
          console.log(`📋 Accounts type:`, typeof accounts, Array.isArray(accounts));
          console.log(`🎯 Selected account:`, selectedAccount);
          console.log(`👤 User:`, user);
          console.log(`🔑 AccessToken exists:`, !!accessToken);

          if (!accessToken) {
            console.error("❌ No access token in response");
            return {
              success: false,
              error: "Invalid response from server",
            };
          }

          // Check if user has accounts
          if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
            console.error("❌ User has no accounts");
            console.error("❌ Accounts value:", accounts);
            console.error("❌ Full response data:", JSON.stringify(responseData, null, 2));
            return {
              success: false,
              error: "No accounts available. Please contact your administrator.",
            };
          }

          await AsyncStorage.setItem("accessToken", accessToken);
          if (refreshToken) {
            await AsyncStorage.setItem("refreshToken", refreshToken);
          }

          // If backend auto-selected an account (single account), use it directly
          if (selectedAccount && role) {
            const accountId = selectedAccount.id || selectedAccount._id;
            console.log("✅ Using auto-selected account from login:", selectedAccount.name, "ID:", accountId);
            dispatch({
              type: "SIGN_IN",
              payload: {
                token: accessToken, // Token already has accountId included
                user: { ...user, accounts: accounts || [], selectedAccount: accountId, role },
                selectedAccount: accountId,
                role: role,
              },
            });
            return { success: true };
          }

          // Multiple accounts - auto-select the first one for mobile
          if (accounts.length > 0) {
            const firstAccount = accounts[0];
            const selectedAccountId = firstAccount.id || firstAccount._id;
            console.log(`🔄 Auto-selecting first account: ${selectedAccountId}`);
            
            try {
              const selectResponse = await axios.post(
                `${API_URL}/api/auth/select-account`,
                { accountId: selectedAccountId },
                { headers: { Authorization: `Bearer ${accessToken}` } }
              );

              if (selectResponse.data.success) {
                  const { accountToken, account, role: selectedRole } = selectResponse.data.data;
                  await AsyncStorage.setItem("accessToken", accountToken);
                  // Preserve refresh token if it exists
                  const existingRefreshToken = await AsyncStorage.getItem("refreshToken");
                  if (existingRefreshToken) {
                    await AsyncStorage.setItem("refreshToken", existingRefreshToken);
                  }
                  
                  dispatch({
                    type: "SIGN_IN",
                    payload: {
                      token: accountToken,
                      user: { ...user, accounts: accounts || [], selectedAccount: account.id, role: selectedRole },
                      selectedAccount: account.id,
                      role: selectedRole,
                    },
                  });
                  
                  console.log("✅ Auto-selected account:", account.name);
                  return { success: true };
              } else {
                console.error("❌ Select account API returned success: false", selectResponse.data.message);
              }
            } catch (selectError) {
              console.error("❌ Auto-select failed:", selectError);
              console.error("❌ Error details:", selectError.response?.data);
            }
          }

          // If we get here, something went wrong - but still sign in so user can see the error
          console.warn("⚠️ Could not auto-select account, but user has accounts. Signing in without account selection.");
          console.log("⚠️ Accounts to store:", accounts);
          console.log("⚠️ User object:", user);
          
          const userWithAccounts = {
            ...user,
            accounts: accounts || [],
          };
          
          console.log("⚠️ User with accounts:", userWithAccounts);
          
          dispatch({
            type: "SIGN_IN",
            payload: {
              token: accessToken,
              user: userWithAccounts,
              selectedAccount: null,
              role: null,
            },
          });
          
          // Return success but with a warning - the AccountSelectScreen will show
          return { 
            success: true,
            warning: accounts.length > 0 ? "Please select an account" : undefined
          };
        } catch (error) {
          console.error("❌ Login error:", error);
          console.error("Error details:", {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            url: error.config?.url,
          });
          return {
            success: false,
            error:
              error.response?.data?.message ||
              error.message ||
              "Login failed. Please check your connection and try again.",
          };
        } finally {
          dispatch({ type: "SET_LOADING", payload: false });
        }
      },
      selectAccount: async (accountId) => {
        try {
          console.log(`🔐 Selecting account: ${accountId}`);
          const token = await AsyncStorage.getItem("accessToken");
          const response = await axios.post(
            `${API_URL}/api/auth/select-account`,
            { accountId },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          console.log("✅ Account selection response:", JSON.stringify(response.data, null, 2));

          if (!response.data.success) {
            return {
              success: false,
              error: response.data.message || "Failed to select account",
            };
          }

          // API returns accountToken (not accessToken) and account/role (not user)
          const { accountToken, account, role } = response.data.data;
          await AsyncStorage.setItem("accessToken", accountToken);
          // Preserve refresh token if it exists
          const existingRefreshToken = await AsyncStorage.getItem("refreshToken");
          if (existingRefreshToken) {
            await AsyncStorage.setItem("refreshToken", existingRefreshToken);
          }

          // Update user state with selected account info
          dispatch({
            type: "SELECT_ACCOUNT",
            payload: { 
              accountId: account.id || accountId,
              token: accountToken,
              account,
              role,
            },
          });

          console.log("✅ Account selected successfully:", account.name);
          return { success: true };
        } catch (error) {
          console.error("❌ Account selection error:", error);
          console.error("Error details:", {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
          });
          return {
            success: false,
            error:
              error.response?.data?.message ||
              error.message ||
              "Failed to select account. Please try again.",
          };
        }
      },
      signOut: async () => {
        dispatch({ type: "SET_LOADING", payload: true });
        try {
          await AsyncStorage.removeItem("accessToken");
          dispatch({ type: "SIGN_OUT" });
        } finally {
          dispatch({ type: "SET_LOADING", payload: false });
        }
      },
      refreshUser: async () => {
        try {
          const response = await apiClient.get("/api/auth/me");
          if (response.data.success) {
            const userData = response.data.data.user;
            const accounts = userData.accounts || [];
            const selectedAccountId = userData.accountId || userData.selectedAccount;
            const role = userData.role;

            dispatch({
              type: "RESTORE_TOKEN",
              payload: {
                user: { ...userData, accounts, selectedAccount: selectedAccountId, role },
                selectedAccount: selectedAccountId,
                role: role,
              },
            });
          }
        } catch (error) {
          console.error("Error refreshing user:", error);
        }
      },
    }),
    []
  );

  return (
    <AuthContext.Provider value={{ state, dispatch, ...authContext }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthContextProvider");
  }
  return context;
};

