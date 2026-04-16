/**
 * NativeTabs layout — the money shot.
 *
 * Uses expo-router/unstable-native-tabs to render the iOS 26 native
 * liquid glass tab bar. On iOS 26+ this produces the floating pill
 * with the glass effect built into UIKit.
 *
 * SF Symbol names used:
 *   Home        house / house.fill
 *   Marketplace storefront / storefront.fill
 *   Shifts      calendar / calendar.fill
 *   Profile     person.circle / person.circle.fill
 */

import { NativeTabs } from 'expo-router/unstable-native-tabs';

export default function AppLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="marketplace">
        <NativeTabs.Trigger.Label>Market</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'storefront', selected: 'storefront.fill' }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="shifts">
        <NativeTabs.Trigger.Label>Shifts</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'calendar', selected: 'calendar.fill' }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.circle', selected: 'person.circle.fill' }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
