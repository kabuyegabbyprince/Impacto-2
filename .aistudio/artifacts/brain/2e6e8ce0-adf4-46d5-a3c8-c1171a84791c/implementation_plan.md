# Implementation Plan - Attendance Matrix Pivot, MoMo Code Persistence, Expired Plan Renewals & Super Admin Incident Hub

This plan outlines the targeted architectural and UI updates across Attendance Matrix, Rentable Spaces views, MoMo merchant code persistence, expired plan buy-back, and Super Admin incident chat & navigation controls.

> [!IMPORTANT] Critical User Feedback & Decision Gates
> - **Attendance Table Matrix Orientation**: Pivoting the table so Scheduled Events appear as Column Headers on the X-Axis and Members appear as Row Items on the Y-Axis. Word "grid" removed from headers.
> - **Event & Space View Mode Buttons**: Restricting sub-view options when Rentable Spaces is active so only **Agenda** and **Attendance Roster** are active/allowed without duplicating layout cards across calendar or space rental views.
> - **MoMo Code & Phone DB Persistence**: Fixing `useUpdateOrganization` payload mapping in `useImpactoData.ts` so `momo_merchant_code`, `dues_mtn_number`, `dues_airtel_number`, and `dues_account_name` are persisted to the `organizations` database table.
> - **Expired Plan Buy-Back**: Making the "Last Used Plan" badge and plan cards directly clickable in `settings.tsx` to launch immediate subscription checkout renewal for the expired plan tier.
> - **Super Admin Incident Chat & Sign Out**: Exposing full incident report descriptions in `superadmin.tsx`, enabling two-way chat communication with incident submitters, and adding a dedicated "Sign Out" button in the Super Admin header bar.

---

## 1. Overview & Core Changes

1. **Attendance Matrix Refactor (`DynamicAttendanceGrid.tsx`)**:
   - Remove the word "Grid" from all component titles and headers (rebranding to "Attendance Matrix").
   - Pivot table dimensions: **X-Axis = Scheduled Events** (Column Headers), **Y-Axis = Members** (Row Items).
   - Render attendance checkmark toggles in cells, member attendance summary metrics per row, and event summary metrics per column header.

2. **Event & Rentable Space View Mode Streamlining (`EventScheduleCalendar.tsx`, `admin-modules.tsx`)**:
   - Prevent redundant event checklist cards from rendering across Calendar and Rentable Space sub-views.
   - When Rentable Spaces feature is enabled, restrict view mode options to **Agenda** and **Attendance Roster** buttons (`button:nth-of-type(1)`, `button:nth-of-type(2)`), keeping navigation simple and clutter-free.

3. **MoMo Merchant Code & Phone Persistence (`useImpactoData.ts`, `settings.tsx`)**:
   - Update `useUpdateOrganization` in `useImpactoData.ts` to include `momo_merchant_code`, `dues_mtn_number`, `dues_airtel_number`, and `dues_account_name` directly in the database update payload (`updateData`), ensuring changes in Settings persist to Supabase `organizations` table as well as local cache.

4. **Expired Plan Interactive Buy-Back (`settings.tsx`)**:
   - Update expired subscription status displays (`lifecycle.isExpired`).
   - Make the "Last Used Plan" badge and the expired plan card button (`Choose Growth` / `Upgrade to Pro`) directly clickable to trigger `handleOpenSubscriptionCheckout` for fast plan renewal.

5. **Super Admin Incident Chat & Sign Out Header (`superadmin.tsx`)**:
   - Add a prominent **Sign Out** button in `SuperadminDashboard` top header bar invoking `useAuthStore.getState().logout()`.
   - Update the Support Incidents queue in `superadmin.tsx` to display full un-truncated error messages and enable direct two-way chat responses with organization admins reporting issues.

---

## 2. Technical Architecture & System Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             USER & ADMIN FRONTEND                           │
├──────────────────────────────┬──────────────────────────────┬───────────────┤
│    Attendance Matrix         │     Settings & MoMo          │ Super Admin   │
│  (Events X-Axis, Y Members)  │ (Merchant Code & Buy-Back)   │ Incident Chat │
└──────────────┬───────────────┴──────────────┬───────────────┴───────┬───────┘
               │                              │                       │
               ▼                              ▼                       ▼
┌──────────────────────────────┬──────────────────────────────┬───────────────┐
│ DynamicAttendanceGrid        │ useUpdateOrganization        │ superadmin    │
│  - Events on X-Axis Header   │  - DB Persistence Payload    │  - Full Chat  │
│  - Members on Y-Axis Rows    │  - momo_merchant_code        │  - Sign Out   │
└──────────────┬───────────────┴──────────────┬───────────────┴───────┬───────┘
               │                              │                       │
               ▼                              ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SUPABASE & DATABASE LAYER                          │
│        - organizations table (momo_merchant_code, dues_mtn_number)        │
│        - error_reports / support_chats real-time threads                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Key Components & Implementation Steps

### Step 1: Attendance Matrix Table Pivot (`DynamicAttendanceGrid.tsx`)
- **Title Update**: Change title from "Dynamic Attendance Grid" to "Attendance Matrix".
- **Header Columns (X-Axis)**: Map over `filteredEvents` to render event titles, dates, and venues as column headers.
- **Rows (Y-Axis)**: Map over `activeMembers` to render member name, avatar, and member ID as row headers on the left.
- **Cells**: Index cell status by `${event.id}_${member.id}`. Render interactive "Present" / "Absent" toggles.
- **Export**: Align local Excel spreadsheet export to the new Events X-Axis / Members Y-Axis matrix structure.

### Step 2: Rentable Spaces Sub-View Controls (`EventScheduleCalendar.tsx`)
- Condition sub-navigation bar when `hasRentableSpaces` is active to only allow/show **Agenda** and **Attendance Roster** sub-view buttons.
- Hide redundant side checklist panels when viewing Calendar or Rentable Spaces modes.

### Step 3: Database Persistence for MoMo & Merchant Code (`useImpactoData.ts`)
- In `useUpdateOrganization`:
  - Pass `momo_merchant_code`, `dues_mtn_number`, `dues_airtel_number`, and `dues_account_name` in `updateData` for the Supabase `organizations` update query.
  - Retain local storage caching fallback.

### Step 4: Clickable Expired Plan Buy-Back (`settings.tsx`)
- In `settings.tsx`, bind `onClick` on "Last Used Plan" badges and Growth/Pro card buttons to `handleOpenSubscriptionCheckout` with the corresponding plan name.

### Step 5: Super Admin Dashboard Enhancement (`superadmin.tsx`)
- Add **Sign Out** button in `header` with `useAuthStore` `logout()` handler.
- Expand Support Incidents section to display full report text and direct two-way chat dialog with submitters.

---

## 4. Verification & Testing Strategy
- Compile applet with `compile_applet`.
- Verify Attendance Matrix renders Events as columns and Members as rows with interactive toggles.
- Verify MoMo Merchant Code and phone numbers persist upon saving in Settings.
- Verify clicking "Last Used Plan" opens subscription checkout modal.
- Verify Super Admin has functional Sign Out button and complete support chat view.
