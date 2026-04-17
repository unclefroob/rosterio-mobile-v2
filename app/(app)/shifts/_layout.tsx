import { Stack } from 'expo-router';
import glassTheme from '../../../src/theme/glassTheme';

export default function ShiftsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="shift-details"
        options={{
          headerShown: true,
          title: '',
          headerBackTitleVisible: false,
          headerStyle: { backgroundColor: glassTheme.colors.background.primary },
          headerTintColor: glassTheme.colors.text.primary,
          headerShadowVisible: false,
          headerTitleStyle: {
            fontFamily: 'DMSans_600SemiBold',
            fontWeight: '600',
            fontSize: 17,
            color: glassTheme.colors.text.primary,
            letterSpacing: -0.3,
          },
        }}
      />
    </Stack>
  );
}
