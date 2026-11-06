# Implementation Plan - Event Gating & Unified Meeting Flow

## 1. User Review Requirements & Scope
- **Public Page Event Reservation & Pay Button**: Gated to appear only when the organization has enabled event hosting and holds a Pro/Growth subscription tier.
- **Pro Tier Restrictions**: Event hosting and live video meetings require Pro/Growth subscription tiers.
- **Unified Meeting Flow**:
  - Host starts meet via "Start Live Meet".
  - All other members see the button switch to "Join Meet" for the active meeting.
  - Joining places participants into the exact same WebRTC / BroadcastChannel room (no parallel rooms), enabling live audio (mic) and video (camera) streaming.
  - Meeting records are saved to meeting history upon completion.
- **Organization Document Sharing**:
  - Meeting document sharing uses real organization documents stored in the database instead of static mock documents.
  - Shared documents can be viewed and read by all participants simultaneously.

## 2. Proposed Changes
### A. Public Page & Event Gating (`src/pages/public.tsx` or similar)
- Check organization subscription tier (`subscription_tier` / `events_enabled`) before rendering the reservation and payment button on public landing/event pages.

### B. Meeting State & Dashboard Integration (`src/pages/dashboard.tsx` & `src/components/ChatVideoMeetModal.tsx`)
- Ensure the active hosted meeting state syncs organization-wide.
- Make the chat/dashboard header button toggle between "Start Live Meet" and "Join Meet" correctly.
- Unify WebRTC signaling channel name to guarantee a single meeting room per organization channel.

### C. Organization Documents in Meeting (`src/components/ChatVideoMeetModal.tsx`)
- Replace static fallback documents with actual organization documents (`documents` prop passed from `dashboard.tsx`).
- Ensure document selection and presentation broadcast live to all participants in the meeting room.

## 3. Verification Plan
- Compile applet with `compile_applet`.
- Run linter with `lint_applet`.
- Verify zero emojis in all modified files.
