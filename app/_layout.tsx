/**
 * Root layout for the expo-router spike.
 *
 * Wraps the entire tree in the same providers used by App.js and forks at
 * the top level on `@kiosk:mode`:
 *   - kioskMode === true   → mount the (kiosk) Stack only (no auth, no tabs)
 *   - kioskMode === false  → existing AuthGate (auth + tabs)
 *
 * The fork happens BEFORE AuthContext bootstrap so a kiosk device never
 * triggers user-token refresh / login redirects.
 */

import React, { useEffect, useRef } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthContextProvider, useAuth } from '../src/context/AuthContext';
import { PlanContextProvider } from '../src/context/PlanContext';
import { KioskContextProvider, useKiosk } from '../src/context/KioskContext';
import { ToastProvider } from '../src/components/Toast';
import SplashScreen from '../src/screens/SplashScreen';
import glassTheme from '../src/theme/glassTheme';
import {
  setupNotificationHandlers,
  addNotificationResponseListener,
} from '../src/services/pushNotifications';

// Configure foreground notification display behaviour once at module load.
// This must run before the first notification can arrive.
setupNotificationHandlers();

function AuthGate() {
  const { state } = useAuth();
  const segments = useSegments();
  // Tracks whether we've done the startup navigation reset this session.
  // A module-level variable would also work, but useRef is idiomatic React.
  const didResetOnLaunch = useRef(false);

  // Register push notification tap handler — routes deep links from notification
  // taps into the app. Runs once on mount, cleaned up on unmount.
  useEffect(() => {
    const cleanup = addNotificationResponseListener();
    return cleanup;
  }, []);

  useEffect(() => {
    if (state.isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inKioskGroup = segments[0] === '(kiosk)';
    // CRITICAL: never clobber a deep link that landed on /invites/...
    // The invite detail screen handles its own auth guard and will redirect
    // to login (with redirectTo) if needed.
    const inInvitesGroup = segments[0] === 'invites';
    const isAuthenticated = state.isSignedIn && state.selectedAccount;

    // Don't redirect into (app) while a manager is over on /(kiosk)/pair
    // setting up a device — they navigated there explicitly from the auth
    // screen and haven't logged in.
    if (inKioskGroup) return;

    // Let the invite detail screen handle its own auth redirect flow.
    // Mark didResetOnLaunch so a subsequent navigate-to-/(app)/inbox after
    // accept doesn't trigger the cold-start reset and clobber it back to home.
    if (inInvitesGroup) {
      if (isAuthenticated) didResetOnLaunch.current = true;
      return;
    }

    if (isAuthenticated && (inAuthGroup || !didResetOnLaunch.current)) {
      didResetOnLaunch.current = true;
      router.replace('/(app)');
    } else if (!isAuthenticated && !inAuthGroup) {
      if (state.isSignedIn && !state.selectedAccount) {
        router.replace('/(auth)/account-select');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [state.isLoading, state.isSignedIn, state.selectedAccount, segments]);

  if (state.isLoading) return <SplashScreen />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
      <Stack.Screen name="(kiosk)" />
      <Stack.Screen name="invites" />
      <Stack.Screen
        name="manager-attendance"
        options={{
          headerShown: true,
          title: 'Live Attendance',
          headerStyle: { backgroundColor: glassTheme.colors.background.primary },
          headerTintColor: glassTheme.colors.text.primary,
          headerTitleStyle: {
            fontFamily: 'DMSans_600SemiBold',
            fontWeight: '600',
            fontSize: 17,
            color: glassTheme.colors.text.primary,
            letterSpacing: -0.3,
          },
          headerBackTitleVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="edit-profile"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Edit Profile',
          headerStyle: { backgroundColor: glassTheme.colors.background.primary },
          headerTintColor: glassTheme.colors.primary,
          headerTitleStyle: {
            fontFamily: 'DMSans_600SemiBold',
            fontWeight: '600',
            fontSize: 17,
            color: glassTheme.colors.text.primary,
            letterSpacing: -0.3,
          },
          headerBackTitleVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}

function KioskRootStack() {
  // Kiosk mode bypasses AuthContextProvider entirely — no token refresh, no
  // tabs, no manager UI. expo-router still needs the (auth) / (app) screens
  // declared so a manager can navigate to /(auth)/login from the unpair flow,
  // but we don't mount the auth provider; those screens will fail to render
  // gracefully if reached without an unpair (which clears @kiosk:mode first).
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
      <Stack.Screen name="(kiosk)" />
    </Stack>
  );
}

function RootGate() {
  const { hydrated, kioskMode } = useKiosk();
  const segments = useSegments();

  // Drive the post-hydration redirect: when kiosk mode is on, push to the
  // (kiosk) tree if we're not already there.
  useEffect(() => {
    if (!hydrated) return;
    if (kioskMode && segments[0] !== '(kiosk)') {
      router.replace('/(kiosk)');
    }
  }, [hydrated, kioskMode, segments]);

  if (!hydrated) return <SplashScreen />;

  if (kioskMode) {
    return <KioskRootStack />;
  }

  return (
    <AuthContextProvider>
      <PlanContextProvider>
        <ToastProvider>
          <AuthGate />
        </ToastProvider>
      </PlanContextProvider>
    </AuthContextProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KioskContextProvider>
          <RootGate />
        </KioskContextProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
