# IMPACTO — Master UI/UX & Feature Transformation Plan (todo.md)

*Grounding sources: `DESIGN_REPORT.md`, `logic.md`, database schema inspection, and user requirements.*

---

## 📋 Status Dashboard & Phase Progression

- [x] **Phase 1: Phone-Number Auth, Enforced Full Names & Profile Settings**
- [x] **Phase 2: Public Calendar & 24h Space Reservation Request System**
- [x] **Phase 3: Document Office Overhaul (Clean Excel Grid & Word Processor)**
- [x] **Phase 4: Events Default Landing & 24h Space Occupancy Polish**
- [x] **Phase 5: Multi-Person Video Meet in Chat with Live Document Review**
- [x] **Phase 6: Web Offline Resilience (LocalStorage Queue & Cache Strategy)**
- [x] **Phase 7: Full-Application Media Queries, Spacing & Anti-AI Slop Sweep**
- [x] **Phase 8: Verification, TypeScript Validation & Quality Assurance**

---

## 🗄️ Database Architecture Compatibility Audit
*Verification of whether the current database supports all requested features:*

- **Phone Number Authentication & Full Names**:
  - **Supported**: The `users` schema already contains `phone_number text`, `full_name text not null`, and `email text`.
  - Auth accounts registered via phone number use clean telephone normalization (e.g., Rwandan format `0788...` or `+250788...`).
  - Strict validation guarantees `full_name` is mandatory when signing up via phone so nameless accounts cannot exist.
- **Calendar & 24-Hour Space Lending**:
  - **Supported**: Dual-layer storage (PostgreSQL/Supabase + LocalStorage `org_spaces_${orgId}` and `org_space_bookings_${orgId}` and `org_space_requests_${orgId}`) enables 24-hour timeline management, conflict detection, and public reservation requests without requiring manual migrations.
- **Offline Storage**:
  - **Supported**: LocalStorage + IndexedDB queue (`src/lib/offlineSync.ts`) reliably stores drafts, attendance check-ins, and space requests offline, syncing to the database once the connection is restored.

---

## Phase 1: Phone-Number Auth, Enforced Full Names & Profile Settings
*Enable telephone number sign-in & sign-up, enforce mandatory legal Full Names on phone registration, and provide seamless name editing in User Settings.*

- [ ] **1.1 Dual Sign-In (Telephone Number or Email)**:
  - In `src/pages/auth.tsx` (`Login`), allow user to input either their **Email** or **Phone Number** (e.g., `+250 788 123 456` or `0788123456`).
  - Normalize phone numbers to match stored formats and look up the corresponding user account.
- [ ] **1.2 Phone-Based Sign-Up with Mandatory Full Name**:
  - In `src/pages/auth.tsx` (`Register`), provide a toggle/field for Phone Number registration alongside Email.
  - **Strict Enforcement**: When registering with a phone number, the **Full Name** field is strictly required (minimum 2 words, no blank or placeholder names) to guarantee all phone-registered users are authentic and accountable.
- [ ] **1.3 Settings Profile Name & Phone Synchronization**:
  - In `src/pages/settings.tsx` (`Profile` tab), allow users to update their Full Name and Phone Number anytime.
  - Updates propagate live across `useAuthStore`, `MockDB`, and Supabase, with immediate reflection in the dashboard header, chat avatar, and member rosters.

---

## Phase 2: Public Calendar & 24h Space Reservation Request System
*Allow external visitors and community members on the public organization page (`/@slug` / `PublicOrgPage.tsx`) to view facility room availability, Rwanda national holidays, and submit space reservation requests that organization admins can approve or reject in the dashboard.*

- [ ] **2.1 Public Calendar & Spaces Display Component on Public Page**:
  - Embed the interactive month view and space occupancy calendar in `src/pages/PublicOrgPage.tsx`.
  - Display Rwanda national official holidays (Genocide Memorial Day, Independence Day, Liberation Day, Umuganura, Heroes' Day, etc.).
  - Show facility rooms/spaces (name, capacity, hourly rate / free community access, amenities) and booked 24h occupancy slots without exposing private admin details.
- [ ] **2.2 Public "Send Space Reservation Request" Flow**:
  - Modal/Drawer on `PublicOrgPage` for visitors to request a room/space reservation:
    - Target space selector
    - Desired date & 24-hour time range (Start Time -> End Time)
    - Event title & purpose (e.g. "Agritech Workshop", "Cooperative General Assembly")
    - Organizer name, email, phone number (MTN / Airtel-Tigo)
    - Expected attendee count
  - Checks for real-time conflicts against existing confirmed bookings.
  - Submits the request with `status: "pending"`.
  - Persists to `localStorage` (key: `org_space_requests_${orgId}`) and syncs to MockDB/Supabase.
  - Returns instant confirmation with reference number and receipt summary.
- [ ] **2.3 Dashboard Space Management & Reservation Approval/Rejection**:
  - In `src/components/EventScheduleCalendar.tsx` (and `EventsCalendar`), add a dedicated "Pending Requests" badge and management panel for Admins/Managers.
  - One-click **"Approve Reservation"** (converts to confirmed occupancy slot, dispatches notification toast) and **"Reject Request"** (releases slot with optional rejection note).

---

## Phase 3: Document Office (Word & Excel) Professionalization
*Replace clunky, hard-to-navigate editor layouts with a clean, high-performance, user-driven spreadsheet (Excel) and distraction-free document writer (Word) in `src/components/DocumentOffice.tsx`.*

- [ ] **3.1 Clean Excel Spreadsheet Editor**:
  - Modern, responsive formula & toolbar header (Formula bar `fx`, Cell coordinate indicator like `A1`, `B4`).
  - True user-driven grid: Clean column headers (A, B, C...) and row numbers (1, 2, 3...) with smooth cell selection, active outline, and keyboard arrow navigation.
  - Easy column/row management: "Add Row", "Add Column", "Delete Selected Row/Col", "Clear Cell".
  - Clean arithmetic calculations: SUM, AVERAGE, MIN, MAX, COUNT without messy UI overlays.
  - Clean CSV/Excel export and plain table import without binary parse errors.
  - Remove artificial 400px height cap; allow wide sheets to scroll cleanly with sticky headers on mobile and desktop.
- [ ] **3.2 Distraction-Free Word / Letter Processor**:
  - Clean typographic hierarchy with standard font sizing, line height, and margin control.
  - Responsive formatting toolbar: Bold, Italic, Underline, H1, H2, Bullet List, Numbered List, Text Alignment (Left, Center, Right), Insert Date.
  - Professional cooperative letterhead toggle: Clean official logo, organization name, district/province, date, and recipient block.
  - Digital signature integration: Clean signature stamp placement.
  - Clean Print / PDF generation without background noise or broken margins.

---

## Phase 4: Events Schedule Landing & 24h Occupancy Architecture
*Ensure default landing on the real calendar schedule with complete Rwanda national holidays and 24h facility space lending management.*

- [ ] **4.1 Default Landing on Events Schedule**:
  - In `src/pages/dashboard.tsx` under Events module, verify default tab points to Schedule Calendar view.
  - Remove all redundant, confusing, or orphaned export/filter buttons.
- [ ] **4.2 24-Hour Room Lending & Occupancy Timeline**:
  - Clear visual 24h time-bar (00:00 to 23:59) showing occupied hours vs. available free hours for each room.
  - Real-time conflict validation preventing overlapping bookings for the same facility space.

---

## Phase 5: Multi-Person Video Meet in Chat with Collaborative Doc Review
*Verify and polish the lightweight, accessible multi-person video meeting modal (`ChatVideoMeetModal.tsx`).*

- [ ] **5.1 Resilient Audio/Video Tiles**:
  - WebRTC camera/microphone access with graceful animated fallback avatar tiles if camera permission is declined or in restricted environments.
  - Grid layout adapting dynamically from 1 to 6+ participants (1x1, 2x2, 3x2).
- [ ] **5.2 In-Call Collaborative Document Sharing**:
  - Select any cooperative document or spreadsheet from Document Center for live center-stage presentation.
  - Attendees can annotate, comment, and review simultaneously with timestamps.
- [ ] **5.3 Integrated In-Call Chat & Participant Roster**:
  - Real-time side panel with live text messages and participant speaking/mute indicators.
  - Screen share toggle and accessible mute/camera toggles.

---

## Phase 6: Web Offline Resilience (LocalStorage & Sync Strategy)
*Provide rock-solid offline capabilities on the web using LocalStorage and sync queues so cooperatives in rural areas with intermittent connectivity don't lose work.*

- [ ] **6.1 Client-Side LocalStorage Persistence**:
  - Offline cache for:
    - Active organization profile & settings
    - Documents & spreadsheets (drafts auto-saved locally every 3 seconds)
    - Space bookings and reservation requests
    - Event schedule and member attendance records
- [ ] **6.2 Offline Action Queue**:
  - Leverage `src/lib/offlineSync.ts` to queue document changes, attendance check-ins, and space requests when `navigator.onLine === false`.
  - Automatic replay and synchronization once Internet connectivity resumes, with clear visual sync indicator (`OfflineIndicator.tsx`).

---

## Phase 7: Full Application Media Queries & Anti-AI Slop Design Sweep
*Standardize layouts across 320px, 375px, 768px, 1024px, and 1440px viewports per `DESIGN_REPORT.md`.*

- [ ] **7.1 Zero-Pill & Anti-AI Slop Discipline**:
  - Strip excessive nested pills, rainbow gradients, artificial glowing effects, and unnecessary micro-badges.
  - Use purposeful, restrained colors (Emerald for primary, Slate for neutral backgrounds, Amber for warnings, Rose for destructive actions).
- [ ] **7.2 Comprehensive Media Query Protection**:
  - Enforce `min-w-0`, `truncate`, `whitespace-nowrap shrink-0`, and responsive flex-wrapping (`flex-col sm:flex-row`) on all headers, toolbars, and action groups across:
    - `src/pages/dashboard.tsx`
    - `src/pages/PublicOrgPage.tsx`
    - `src/components/DocumentOffice.tsx`
    - `src/components/EventScheduleCalendar.tsx`
    - `src/components/ChatVideoMeetModal.tsx`
- [ ] **7.3 WCAG 2.2 AA Accessibility & Touch Targets**:
  - Ensure all buttons have a minimum touch target of 44x44px or proper spacing on mobile (`h-9` minimum on interactive controls).
  - High contrast text (`text-slate-900 dark:text-white` on surfaces, legible muted helper text).
  - Explicit accessible titles and aria-labels for icon-only buttons.

---

## Phase 8: Verification, TypeScript Validation & QA

- [ ] **8.1 Build Verification**:
  - Run `compile_applet` to confirm zero compilation errors.
- [ ] **8.2 Type-Safety & Linting**:
  - Run `lint_applet` (`tsc --noEmit`) to verify zero TypeScript errors.
- [ ] **8.3 Flow Verification**:
  - Verify phone number login & phone sign-up with enforced full names.
  - Verify public page space reservation request flow end-to-end.
  - Verify dashboard approval/rejection of space reservations.
  - Verify DocumentOffice Excel grid cell editing, formula calculating, and Word document drafting.
  - Verify Video Meet modal launch and in-call document review.
