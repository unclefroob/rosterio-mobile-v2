/**
 * Stack layout for the Inbox tab.
 * Inbox index is the root; invite detail is pushed on top when navigating
 * to /invites/{accountId}/{token} from within the tab.
 */

import { Stack } from "expo-router";
import glassTheme from "../../../src/theme/glassTheme";

export default function InboxLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: glassTheme.colors.background.screen },
      }}
    />
  );
}
