import { Stack } from 'expo-router';
import glassTheme from '../../../../src/theme/glassTheme';

const HEADER_TITLE_STYLE = {
  fontFamily: 'DMSans_600SemiBold',
  fontWeight: '600' as const,
  fontSize: 17,
  color: glassTheme.colors.text.primary,
  letterSpacing: -0.3,
};

const COMMON_SCREEN_OPTIONS = {
  headerShown: true,
  headerBackTitleVisible: false,
  headerBackButtonDisplayMode: 'minimal' as const,
  headerStyle: { backgroundColor: glassTheme.colors.background.primary },
  headerTintColor: glassTheme.colors.text.primary,
  headerShadowVisible: false,
  headerTitleStyle: HEADER_TITLE_STYLE,
};

export default function LeaveLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="index"
        options={{ ...COMMON_SCREEN_OPTIONS, title: 'My Leave' }}
      />
      <Stack.Screen
        name="new"
        options={{
          ...COMMON_SCREEN_OPTIONS,
          title: 'Request Leave',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
