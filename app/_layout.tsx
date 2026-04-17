/**
 * Root layout for the expo-router spike.
 *
 * Wraps the entire tree in the same providers used by App.js and handles
 * the auth redirect:
 *   - isLoading      → show nothing (SplashScreen rendered inline)
 *   - authenticated  → redirect to (app)
 *   - not authed     → redirect to (auth)
 *
 * Toggle: to use this layout instead of App.js, change package.json#main
 * from "index.js" to "expo-router/entry".
 */

import React, { useEffect, useRef } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthContextProvider, useAuth } from '../src/context/AuthContext';
import { PlanContextProvider } from '../src/context/PlanContext';
import { ToastProvider } from '../src/components/Toast';
import SplashScreen from '../src/screens/SplashScreen';

function AuthGate() {
  const { state } = useAuth();
  const segments = useSegments();
  // Tracks whether we've done the startup navigation reset this session.
  // A module-level variable would also work, but useRef is idiomatic React.
  const didResetOnLaunch = useRef(false);

  useEffect(() => {
    if (state.isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isAuthenticated = state.isSignedIn && state.selectedAccount;

    if (isAuthenticated && (inAuthGroup || !didResetOnLaunch.current)) {
      // Navigate to app root whenever:
      //   a) we're on an auth screen but already authenticated (post-login redirect)
      //   b) first time resolving authenticated state this session — this replace
      //      creates a *fresh* (app) navigation tree, discarding any persisted
      //      sub-stack state (e.g. profile/edit-profile restored from last session).
      didResetOnLaunch.current = true;
      router.replace('/(app)');
    } else if (!isAuthenticated && !inAuthGroup) {
      if (state.isSignedIn && !state.selectedAccount) {
        router.replace('/(auth)/account-select');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [state.isLoading, state.isSignedIn, state.selectedAccount]);

  if (state.isLoading) return <SplashScreen />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthContextProvider>
          <PlanContextProvider>
            <ToastProvider>
              <AuthGate />
            </ToastProvider>
          </PlanContextProvider>
        </AuthContextProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
