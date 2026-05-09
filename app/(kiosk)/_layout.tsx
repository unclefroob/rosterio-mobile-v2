import { Stack } from 'expo-router';

/**
 * Kiosk route group — runs OUTSIDE the auth + tabs tree.
 *
 * Header is hidden everywhere (kiosk UX is full-bleed); gestureEnabled is
 * false so a customer can't swipe back into a half-state from the keypad.
 */
export default function KioskLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="pair" />
      <Stack.Screen name="exit" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
