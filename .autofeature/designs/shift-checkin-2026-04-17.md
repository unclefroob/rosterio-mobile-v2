# Feature Brief: Shift Check-In / Check-Out

**Date:** 2026-04-17  
**Mode:** Automated

## What
Staff tap "Check In" on any shift in the mobile app. GPS coordinates are recorded (optional — graceful fallback if denied). They can later tap "Check Out". No geofencing — any location accepted.

## Scope
Two repos: `shiftos-api` (backend) and `rosterio-mobile-v2` (mobile).

## API Endpoints (shiftos-api)
- `POST /api/shifts/:id/checkin` — body: `{ latitude?, longitude? }` → creates ClockEntry (status: "active")
- `POST /api/shifts/:id/checkout` — body: `{ latitude?, longitude? }` → updates ClockEntry (status: "completed")
- `GET /api/shifts/:id/clock-status` — returns `{ isCheckedIn: bool, clockEntry: ClockEntry | null }`

Auth: minimum `ROLES.STAFF` on all three routes.

## Mobile Changes (rosterio-mobile-v2)
- Install `expo-location`
- Add `checkInToShift`, `checkOutFromShift`, `getShiftClockStatus` to `apiHelper.js`
- Add Check In / Check Out button to shift cards in `MyShiftsScreen.js` (Upcoming tab)
- Request location permission on check-in tap; GPS optional if denied
- Show "Checked In" badge + timestamp when active; swap button to "Check Out"

## Assumptions
- One active ClockEntry per user per shift (enforced by API — 409 on duplicate)
- `clockInMethod` / `clockOutMethod` = "gps" for mobile
- Check-in available at any time (no time window)
- GPS coords are optional — missing coords don't block check-in

## Data Model
`ClockEntry` already exists with all needed fields. No schema changes required.

---

## Implementation Plan

### shiftos-api
1. `src/controllers/clockController.ts` — `clockIn`, `clockOut`, `getClockStatus`
2. `src/routes/shiftRoutes.ts` — add 3 new routes with `minimumRole(ROLES.STAFF)`
3. `src/__tests__/utils/clockController.test.ts` — unit tests for controller logic

### rosterio-mobile-v2
1. `npm install expo-location` (or `npx expo install expo-location`)
2. `src/services/apiHelper.js` — add 3 new API helpers
3. `src/screens/myshifts/MyShiftsScreen.js` — check-in state + button in shift card
