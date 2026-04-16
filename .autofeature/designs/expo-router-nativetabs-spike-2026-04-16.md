# Feature Brief — Expo Router NativeTabs Spike
**Date:** 2026-04-16
**Slug:** expo-router-nativetabs-spike

---

## What we're building

A proof-of-concept that installs expo-router alongside the existing `@react-navigation` setup and wires up a minimal `app/` directory with NativeTabs. The goal is to see the native iOS 26 liquid glass tab bar in a dev build — without migrating all screens yet.

## Goals
1. Install `expo-router` (compatible with Expo SDK 53)
2. Create a minimal `app/` directory structure with `NativeTabs` from `expo-router/unstable-native-tabs`
3. Wire auth gating using the existing `AuthContext` (login → account select → app tabs)
4. Toggle mechanism: `index.js` continues to use `App.js` (old nav); the `app/` structure is there for testing in a dev build via expo-router
5. Leave `LiquidTabBar`, all screen files, and `App.js` untouched

## What this is NOT
- Not a full migration — existing screens stay where they are
- Not replacing `App.js` yet
- No new screens are created

## Tech Stack
- Expo SDK ~53.0.0
- React Native 0.79.6
- New Architecture enabled (iOS + Android via expo-build-properties)
- Entry: `index.js` → `registerRootComponent(App)` → `App.js`
- Auth: `AuthContext` (isLoading / isSignedIn / selectedAccount)
- Plan gating: `PlanContext` (hasMarketplace boolean)

## Key Constraints
1. **expo-router requires `main` field in package.json to point to `expo-router/entry`** — this conflicts with the existing `registerRootComponent` entry. Solution: use the toggle approach — add a flag/env var, or keep `index.js` as-is and add an `app/` structure that expo-router can use when explicitly loaded.
2. **NativeTabs requires a native build** — not available in Expo Go. The spike is only verifiable via `npx expo run:ios`.
3. **Expo SDK 53 ships expo-router v4** — NativeTabs is in `expo-router/unstable-native-tabs`.
4. **No test suite** exists in this project (no Jest config found). Verification = build succeeds + visual confirmation.

## Assumptions
- User will test via `npx expo run:ios` on device/simulator, not Expo Go
- The "toggle" between old and new nav will be a comment swap in `index.js` / `package.json#main`
- We import existing screen components directly (no duplication)
- `AuthContext` and `PlanContext` providers wrap the expo-router layout

## Files to create
```
app/
├── _layout.tsx          ← root layout: providers + auth redirect logic
├── (auth)/
│   ├── _layout.tsx      ← stack layout for auth screens
│   ├── login.tsx        ← re-exports LoginScreen
│   ├── forgot-password.tsx ← re-exports ForgotPasswordScreen
│   └── account-select.tsx  ← re-exports AccountSelectScreen
├── (app)/
│   ├── _layout.tsx      ← NativeTabs layout (the money shot)
│   ├── index.tsx        ← re-exports DashboardScreen (Home tab)
│   ├── marketplace/
│   │   ├── _layout.tsx  ← Stack for marketplace
│   │   └── index.tsx    ← re-exports MarketplaceScreen
│   ├── shifts/
│   │   ├── _layout.tsx  ← Stack for shifts
│   │   └── index.tsx    ← re-exports MyShiftsScreen
│   └── profile/
│       ├── _layout.tsx  ← Stack for profile
│       └── index.tsx    ← re-exports ProfileScreen
```

## Toggle mechanism
`package.json#main` currently points implicitly to `index.js`.
To switch to expo-router: change `"main"` to `"expo-router/entry"`.
To revert: change back to `"index.js"`.
We'll add a comment in both files explaining the toggle.

---

## Implementation Plan (appended after planning step)

### Phase 1 — SDK Upgrade (Expo 53 → 55 / RN 0.79.6 → 0.83.4)
- [x] Update all `expo-*` packages to `~55.0.x` in package.json
- [x] Update `react` to `19.2.0`, `react-native` to `0.83.4`
- [x] Add `expo-router ~55.0.12`, `expo-linking ~55.0.12`, `react-native-worklets ~0.8.1`
- [x] Upgrade `@react-navigation/native` to `^7.2.2`, add `@react-navigation/drawer ^7.9.4`
- [x] Run `npm install --legacy-peer-deps` — 684 packages, 0 vulnerabilities
- [x] Confirm `babel.config.js` unchanged — reanimated v4 `plugin/index.js` re-exports worklets plugin
- [x] Delete stale `Podfile.lock` + `Pods/`, run fresh `pod install` — 103 deps, fmt patch applied

### Phase 2 — NativeTabs Spike
- [x] Add `scheme: "rosterio"` and `expo-router` plugin to `app.json`
- [x] Create `app/_layout.tsx` — providers (SafeAreaProvider, Auth, Plan, Toast) + AuthGate
- [x] Create `app/(auth)/_layout.tsx` + login, forgot-password, account-select re-export files
- [x] Create `app/(app)/_layout.tsx` — NativeTabs with 4 triggers + SF Symbol icons
- [x] Create `app/(app)/index.tsx` (Dashboard), marketplace, shifts, profile re-exports
- [x] Add `tsconfig.json` + `expo-env.d.ts` for TypeScript support
- [x] Add toggle comment to `index.js` and `package.json#_mainToggle`

### Key Decisions
- `NativeTabs.Trigger.Icon` uses `sf={{ default: 'house', selected: 'house.fill' }}` API
- Auth gating via `useSegments()` + `router.replace()` in a `useEffect` inside AuthGate
- `GestureHandlerRootView` wraps root layout (required by react-native-gesture-handler v2+)
- SF Symbols: house/house.fill, storefront/storefront.fill, calendar/calendar.fill, person.circle/person.circle.fill

### To Test
```bash
# Switch to expo-router entry:
# In package.json, change "main": "index.js" → "main": "expo-router/entry"
npx expo run:ios
# Then revert main back to "index.js" to restore App.js nav
```
