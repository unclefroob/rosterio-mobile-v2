# Feature Brief: logout-button-visibility

**Date:** 2026-04-17
**Mode:** Automated

## Problem
The Sign Out button was only reachable by scrolling to the bottom of the Profile screen — after the profile card, two info sections, and an Edit Profile button. On small screens or when the iOS 26 liquid glass tab bar clips the scroll area, users never see it.

## Root Cause
No persistent, always-visible logout affordance. Button buried in ScrollView.

## Solution
Added a screen-level header row outside the ScrollView containing:
- "Profile" title (28px bold)
- `log-out-outline` icon button (top-right) → triggers existing `handleLogout` Alert

The bottom Sign Out button is retained for discoverability when scrolling.

## Files Modified
- `src/screens/profile/ProfileScreen.js`
  - Added `screenHeader` View with title + icon logout button above ScrollView
  - Added `screenHeader`, `screenTitle`, `headerLogoutBtn` styles
