import { Stack } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};
import glassTheme from '../../../src/theme/glassTheme';

const glassHeaderOpts = {
  headerStyle: {
    backgroundColor: glassTheme.colors.background.primary,
    shadowColor: 'transparent' as const,
    borderBottomWidth: 0,
    elevation: 0,
  },
  headerTintColor: glassTheme.colors.primary,
  headerTitleStyle: {
    fontWeight: '600' as const,
    fontSize: 17,
    color: glassTheme.colors.text.primary,
    letterSpacing: -0.3,
  },
  headerBackTitleVisible: false,
  headerBackButtonDisplayMode: 'minimal',
};

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="edit-profile"
        options={{ headerShown: true, title: 'Edit Profile', ...glassHeaderOpts }}
      />
    </Stack>
  );
}
