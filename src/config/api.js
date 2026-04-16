import { Platform } from "react-native";

const getApiUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl;
  if (__DEV__) {
    return Platform.OS === "android"
      ? "http://10.0.2.2:5112"
      : "http://localhost:5112";
  }
  return "https://api.rosterio.app";
};

export const API_URL = getApiUrl();
