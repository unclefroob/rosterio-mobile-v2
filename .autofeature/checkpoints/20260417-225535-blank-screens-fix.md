---
status: completed
branch: main
next_step: done
---

## Bug: Market and Shifts tabs show blank/empty content with NativeTabs

### Root cause
`export const unstable_settings = { initialRouteName: 'index' }` was present in
`app/(app)/marketplace/_layout.tsx` and `app/(app)/shifts/_layout.tsx` but absent
from the working `app/(app)/profile/_layout.tsx`.

NativeTabs (expo-router/unstable-native-tabs) uses Fabric `TabsScreen` native
components to initialize tab content. The `initialRouteName` hint from
`unstable_settings` conflicts with NativeTabs' own route initialization, causing
those tabs to silently render blank/empty content.

Additionally, the import ordering was inverted (export before import), which is
valid ES modules but unconventional.

### Fixed
1. Removed `export const unstable_settings` block from `app/(app)/marketplace/_layout.tsx`
2. Removed `export const unstable_settings` block from `app/(app)/shifts/_layout.tsx`

Both layouts now match the working `profile` layout pattern.

### Files modified
- app/(app)/marketplace/_layout.tsx
- app/(app)/shifts/_layout.tsx

### Commit
a47e023

---
status: completed
branch: main
next_step: done
commit: b381fac
---

## Fix: null startTime/endTime crash in MarketplaceScreen

### Root cause
renderShiftCard called new Date(item.startTime) with no null guard. format()
from date-fns throws RangeError on Invalid Date, crashing the FlatList and
producing a blank screen. Tenant-specific: only affects the tenant with the
bad shift record.

### Fixed
- startDate/endDate null-guarded before new Date()
- All format(), isToday(), isTomorrow(), differenceInHours() calls guarded
- requiredStaffCount=0 guard on staffing bar width
- Fallbacks: "TBD" for dates, "—" for duration

### Files modified
- src/screens/marketplace/MarketplaceScreen.js
