/**
 * Push notification helpers — wraps expo-notifications.
 *
 * Installation (manual step — run ONCE before building):
 *   npx expo install expo-notifications
 *
 * Android: a google-services.json file must be added to the project root and
 * referenced in app.json's expo-notifications plugin config. Configure via
 * EAS secrets — see the EAS configuration steps in the feature summary.
 *
 * iOS: APNs push certificate must be configured in EAS.
 * See the EAS configuration steps in the feature summary.
 */

import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { router } from "expo-router";

// Read the EAS project ID from app config — supports dev/staging/prod divergence
// without code changes.
const EXPO_PROJECT_ID =
  Constants.expoConfig?.extra?.eas?.projectId ??
  "df0dee0e-bdbe-4734-bfe0-f43bc773ff65";

/**
 * Call once at app boot (inside a provider that mounts before the navigator).
 * Sets the foreground notification display behaviour.
 *
 * SDK 55 field names: shouldShowBanner + shouldShowList replace the legacy
 * shouldShowAlert. We provide both so the build works across SDK versions.
 */
export function setupNotificationHandlers(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      // SDK 55+
      shouldShowBanner: true,
      shouldShowList: true,
      // Legacy (SDK < 55 compat)
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/**
 * Request permission to display push notifications.
 * Returns { granted, canAskAgain }.
 */
export async function requestPushPermission(): Promise<{
  granted: boolean;
  canAskAgain: boolean;
}> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === "granted") {
    return { granted: true, canAskAgain: false };
  }
  const { status, canAskAgain } = await Notifications.requestPermissionsAsync();
  return { granted: status === "granted", canAskAgain };
}

/**
 * Request permission then, if granted, obtain and return the Expo Push Token.
 * Returns the token string, or throws if permission was denied.
 *
 * Android requires a physical device or an emulator with Google Play Services.
 * The caller (AuthContext) should catch and swallow the error — a denied push
 * permission must never block sign-in.
 */
export async function registerForPushNotifications(): Promise<string> {
  // Android 13+ requires explicit notification permission
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#636AF1",
    });
  }

  const { granted } = await requestPushPermission();
  if (!granted) {
    throw new Error("Push notification permission denied");
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: EXPO_PROJECT_ID,
  });
  return tokenData.data;
}

/**
 * Add a listener for when the user taps a notification.
 * Reads response.notification.request.content.data.deepLink (e.g.
 * "/invites/{accountId}/{token}") and navigates there via expo-router.
 *
 * Returns a cleanup function — call it in a useEffect cleanup.
 */
export function addNotificationResponseListener(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customHandler?: (response: any) => void
): () => void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subscription = Notifications.addNotificationResponseReceivedListener(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (response: any) => {
      if (customHandler) {
        customHandler(response);
        return;
      }
      const data = (response?.notification?.request?.content?.data ?? {}) as Record<
        string,
        unknown
      >;
      const deepLink = data?.deepLink as string | undefined;
      if (deepLink) {
        // Expo router accepts absolute-style paths
        router.push(deepLink as Parameters<typeof router.push>[0]);
      }
    }
  );

  return () => subscription.remove();
}

/**
 * Add a listener for notifications that arrive while the app is foregrounded.
 * Returns a cleanup function.
 */
export function addNotificationReceivedListener(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (notification: any) => void
): () => void {
  const subscription =
    Notifications.addNotificationReceivedListener(handler);
  return () => subscription.remove();
}
