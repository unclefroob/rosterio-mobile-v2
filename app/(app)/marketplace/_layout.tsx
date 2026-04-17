import { Stack } from 'expo-router';
import glassTheme from '../../../src/theme/glassTheme';

const glassHeaderOpts = {
  headerStyle: { backgroundColor: glassTheme.colors.background.primary },
  headerTintColor: glassTheme.colors.text.primary,
  headerTitleStyle: {
    fontFamily: 'DMSans_600SemiBold',
    fontWeight: '600' as const,
    fontSize: 17,
    color: glassTheme.colors.text.primary,
    letterSpacing: -0.3,
  },
  headerBackTitleVisible: false,
  headerBackButtonDisplayMode: 'minimal',
  headerShadowVisible: false,
};

export default function MarketplaceLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="shift-details"
        options={{ headerShown: true, title: '', ...glassHeaderOpts }}
      />
      <Stack.Screen
        name="my-claims"
        options={{ headerShown: true, title: 'My Claims', ...glassHeaderOpts }}
      />
    </Stack>
  );
}
