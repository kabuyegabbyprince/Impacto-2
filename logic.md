# IMPACTO SYSTEM LOGIC & DATA FLOW SPECIFICATION (`logic.md`)
### Complete System Logic, Component Mapping, Query Hooks & Data Flow Manual

---

## 1. Executive System Overview & Architecture

**Impacto** is a full-stack, multi-tenant Operating System designed for Organizations, Farmer Cooperatives, Savings Groups, and Community Foundations operating in East Africa (with special localization for Rwanda).

### Core Architectural Stack
- **Frontend Framework**: React 18 with TypeScript, Vite, and Tailwind CSS.
- **Backend Architecture**: Node.js with Express server (`server.ts`) operating in dual-mode (Vite dev middleware in development, compiled CommonJS bundle via `esbuild` in production).
- **Database Layer**: PostgreSQL hosted on Supabase, featuring 40+ relational tables, Row-Level Security (RLS) policies, database triggers, and stored procedure functions.
- **Storage Engine**: Supabase Storage Buckets (`avatars`, `documents`, `chat-attachments`, `impacto-files`) with public URL generation, signed download links, and client-side Base64 fallback.
- **Real-Time Layer**: Supabase Realtime WebSocket engine (`useRealtime.ts`) with active channels listening for live data mutations (`chat_messages`, `polls`, `poll_votes`, `donations`, `member_fees`) that dynamically invalidate and refetch React Query caches.
- **State Management & Caching**: 
  - **Server State**: `@tanstack/react-query` (`useImpactoData.ts`) managing async caching, refetching, mutation states, optimistic UI updates, and fallback to an in-memory mock engine (`MockDB` in `src/lib/mockData.ts`).
  - **Global Client State**: `zustand` stores (`authStore.ts`, `orgStore.ts`, `currencyStore.ts`) managing authentication sessions, active organization tenant switching, active UI tabs, display currencies, and exchange rates.
- **Internationalization**: `i18next` engine supporting English (`en`), French (`fr`), and Kinyarwanda (`rw`) with local storage persistence.

---

## 2. Complete Directory Structure & File Functionality

```
.
├── package.json                   # Project dependencies, scripts (dev, build, start, lint)
├── metadata.json                  # Application metadata, name, permissions, major capabilities
├── tsconfig.json                  # TypeScript compiler settings and path aliases
├── vite.config.ts                 # Vite bundler configuration with Tailwind CSS plugin
├── server.ts                      # Full-stack Express server (Vite dev middleware, static serving, payment webhooks)
├── db.sql                         # Complete master database schema migration, RLS policies, triggers, seed data & buckets
├── update.sql                     # Incremental database updates, assets, platform staff & audit logs
├── index.html                     # HTML root page hosting #root element and entry point
├── README.md                      # High-level system overview & architectural blueprint
├── v2addons.txt                   # Subscription tiers, trial lifecycle, and roadmap matrix
├── public/
│   └── logo.png                   # Impacto system brand logo asset
└── src/
    ├── main.tsx                   # React entry point, QueryClientProvider, and i18n initialization
    ├── App.tsx                    # Main root component, view router, and top-level guard controller
    ├── index.css                  # Global Tailwind CSS stylesheet, custom scrollbars, glassmorphism utilities
    ├── types.ts                   # Universal TypeScript interfaces and data models
    ├── store/
    │   ├── authStore.ts           # Authentication session store, current user, superadmin toggle
    │   ├── orgStore.ts            # Active organization context, active channel, tab router, local storage persistence
    │   └── currencyStore.ts       # Display currency state (RWF/USD/EUR/KES) & exchange rate conversion math
    ├── hooks/
    │   ├── useImpactoData.ts      # React Query data layer connecting UI to Supabase DB or MockDB fallback
    │   └── useRealtime.ts         # Supabase Realtime WebSocket listener subscribing to live tables
    ├── lib/
    │   ├── supabase.ts            # Supabase client setup & configuration status check
    │   ├── storageService.ts      # Client-side storage service (uploads, Base64 conversion, signed URL resolution)
    │   ├── supabaseStorage.ts     # Low-level helper for direct bucket file uploads
    │   ├── mockData.ts            # Standalone in-memory seed database engine (MockDB) for offline/fallback mode
    │   └── i18n.ts                # i18next translation configuration
    ├── locales/
    │   ├── en.json                # English translation key-value definitions
    │   ├── fr.json                # French translation key-value definitions
    │   ├── rw.json                # Kinyarwanda translation key-value definitions
    │   └── additional-translations.ts # Extended translations dictionary for specialized administrative UI
    ├── components/
    │   ├── layout.tsx             # Application shell (Header, Sidebar/Drawer, Profile Menu, Currency/Lang Switchers)
    │   ├── ui.tsx                 # Core UI component library (Buttons, Inputs, Cards, Modals, Badges, Tabs, ImageUploaders)
    │   ├── Toast.tsx              # Toast notification system provider and custom hook
    │   ├── guards.tsx             # Route protection guards (RequireAuth, RequireRole, RequireSuperadmin)
    │   ├── DocumentOffice.tsx     # Rich document drafting, compliance letters, PDF export & mandatory acknowledgement viewer
    │   ├── PollMessageComponent.tsx # Real-time interactive poll voting widget for chat channels
    │   ├── ResolvedMedia.tsx      # Media component fetching signed Supabase URLs before rendering images/files
    │   ├── PlanGatedView.tsx      # Feature gating overlay component restricting locked subscription tier features
    │   ├── LogoLoader.tsx         # Brand logo spinner loading state component
    │   └── GuiderAssistant.tsx    # Interactive onboarding walkthrough & guided tour helper
    └── pages/
        ├── dashboard.tsx          # Organization command center (Chat, Polls, Fee Verification, Events, Goals, Grants, Resignations)
        ├── fees.tsx               # Cooperative Member Dues Ledger, Fee Creation, Payment Reporting & Admin Audit Modal
        ├── marketplace.tsx        # Cooperative Product Catalog, Interest Lead Capture & Share Capital Investment Tracker
        ├── admin-modules.tsx      # Member Directory, Role Matrix, ID Verification Queue, Member Tiers, Activity Logs, Audit Logs
        ├── settings.tsx           # Org Profile, Brand Logo/Cover Upload, MoMo Gateways, Visibility Toggles, Subscription Licenses, Glitch Reporter
        ├── public.tsx             # Public Directory Feed, Organization Showcase Page, Mobile Money Donation Modal, Join Requests, Public Marketplace
        ├── superadmin.tsx         # Platform Operator Console, License Approvals, Exchange Rates Manager, Live Hotline, Glitch Center
        └── auth.tsx               # Login, Account Registration, and Demo Profile Quick-Switcher
```

---

## 3. Database Schema Architecture & RLS Policies (`db.sql`)

The database consists of **40+ relational tables** structured for multi-tenant isolation:

### Core Tables Summary
1. **`users`**: Platform user accounts (`id`, `email`, `full_name`, `avatar_url`, `is_superadmin`, `auth_user_id`, `primary_org_id`, `joined_org_ids`).
2. **`organizations`**: Organization tenant profiles (`id`, `name`, `slug`, `subscription_tier`, `subscription_status`, `donation_mtn_number`, `donation_airtel_number`, `quorum_type`, `quorum_value`, `is_public_directory`, `logo_url`, `cover_url`, `primary_color`, `secondary_color`).
3. **`member_tiers`**: Membership levels (`id`, `org_id`, `name`, `annual_fee`, `benefits`).
4. **`org_members`**: Membership mapping (`id`, `org_id`, `user_id`, `role`, `status`, `member_number`, `verification_status`, `permissions` JSONB).
5. **`programs`**: Organization operational programs (`id`, `org_id`, `name`, `description`, `status`).
6. **`events`**: Community meetings & planting sessions (`id`, `org_id`, `title`, `date_time`, `qr_code_token`, `attendees_count`, `is_public`).
7. **`event_attendance`**: QR code check-ins (`id`, `event_id`, `member_id`, `check_in_method`).
8. **`event_rsvps`**: Attendance reservations (`id`, `event_id`, `member_id`, `response`).
9. **`meetings`**: Formal board & member assemblies (`id`, `org_id`, `title`, `minutes`, `quorum_met`).
10. **`action_items`**: Task assignments resulting from meetings (`id`, `meeting_id`, `assigned_to`, `status`).
11. **`chat_channels`**: Real-time messaging channels (`id`, `org_id`, `name`, `type`, `channel_type`, `is_private`).
12. **`chat_messages`**: Chat communications (`id`, `channel_id`, `sender_id`, `text`, `attachment_url`, `message_type`, `file_url`).
13. **`polls` & `poll_votes`**: Interactive real-time polls with vote logging.
14. **`member_fees` & `member_fee_payments`**: Membership dues ledger, payment proof uploads, and auditor approvals.
15. **`marketplace_products` & `marketplace_leads`**: Cooperative commodities catalog and buyer lead inquiries.
16. **`assets`**: Equipment, machinery, and physical inventory tracking.
17. **`certificates`**: Official recognition and workshop certificate records.
18. **`identity_verifications`**: National ID and passport verification audit queue.
19. **`resignations`**: Offboarding records and exit survey results.
20. **`platform_staff` & `platform_audit_logs`**: System compliance, administrative staff, and action audit trails.

---

## 4. State Management, Query Hooks & Data Flow

### TanStack Query Layer (`useImpactoData.ts`)
- Implements optimistic mutations and cache invalidation across all major entities.
- Automatically handles dual-layer fallback: queries execute against Supabase first; if Supabase is unavailable or returns an error, the hook falls back to `MockDB` seamlessly.

### Realtime Listener (`useRealtime.ts`)
- Listens to PostgreSQL `INSERT`, `UPDATE`, and `DELETE` events over Supabase Realtime channels.
- Triggers targeted `queryClient.invalidateQueries()` on active query keys when new chat messages, votes, or payment records arrive.

---

## 5. Storage Pipeline (Supabase Storage)

- All file uploads (Profile Avatars, Brand Logos, Cover Banners, IDs, Receipts, Voice Notes) are handled via `uploadFileToSupabase()` in `src/lib/storageService.ts`.
- The storage engine uses standard Supabase storage buckets (`avatars`, `documents`, `chat-attachments`, `impacto-files`) with public read access and authenticated uploads.

---

## 6. Subscription Plans, User Stories & UI Behavior

This section outlines the progressive capability tiers in Impacto. Each plan **inherits and builds upon all features of the previous plan**, adding new modules, higher member/storage quotas, and advanced governance tools. When a user purchases a package or upgrades their tier, state updates instantly via Zustand and Supabase, removing feature gates (`PlanGatedView`) in real time.

---




### Phase 1: Free Forever Plan
* **Quotas**: Up to 30 active members • 100 MB local media storage.
* **User Stories**:
  - As a grassroots savings group founder, I want to create a free workspace so I can list our members, assign basic roles (Admin/Member), and broadcast announcements via standard chat.
  - As a cooperative member, I want to view the member directory and chat with fellow members without incurring subscription fees.
* **UI Scenarios & Behavior**:
  - **Dashboard**: Displays core member directory, standard chat channels, and basic announcement feeds.
  - **Gatekeeping (`PlanGatedView`)**: Advanced modules (QR attendance, DocumentOffice, automated certificate generation, marketplace catalog, and MoMo payment ledger) display a locked overlay with an "Upgrade to Unlock" call to action.
  - **Limit Enforcement**: When member count reaches 30 or storage hits 100 MB, new member additions enter read-only safe mode without deleting historical data.

---

### Phase 2: Growth Trial Period (Default 30-Day Evaluation)
* **Quotas**: Up to 250 members • 5 GB high-speed cloud storage • Full Growth feature suite unlocked.
* **User Stories**:
  - As a newly registered cooperative administrator, I want to explore all Growth and Pro features immediately upon signup so I can evaluate QR check-ins, member dues ledgers, and document drafting before committing funds.
* **UI Scenarios & Behavior**:
  - **Trial Banner**: A prominent top notification bar displays remaining trial days (e.g., "Growth Trial: 27 Days Remaining") with a quick "Upgrade Now" button.
  - **Full Access**: All features (DocumentOffice, QR Event Attendance, Dues Ledger, Asset Tracker) are fully interactive with zero restrictions.
  - **Grace Period**: Upon trial expiration, a 3-day grace period is granted. If unpaid, the workspace safely downgrades to Free tier limits without data loss.

---

### Phase 3: Starter Plan (Inherits Free + Starter Additions)
* **Quotas**: Up to 100 members • 1 GB secure cloud storage.
* **User Stories**:
  - As a small agricultural cooperative manager, I want basic member dues tracking and monthly meeting scheduling alongside our free member directory so I can manage small-scale contributions efficiently.
* **Cumulative Capabilities (All Free Features + Starter Additions)**:
  - Member Directory & Roles (inherited).
  - Standard Chat & Announcements (inherited).
  - Basic Meeting Minutes & Agenda Scheduler.
  - Simple Member Dues Tracker (up to 100 members).
* **UI Scenarios & Behavior**:
  - **Navigation**: Meeting minutes and basic dues tabs are unlocked.
  - **Quotas Indicator**: Settings & Settings Billing show "Storage: 1 GB / Member Limit: 100".
  - **Upgrades**: Attempting to add 101+ members or use QR attendance triggers a modal prompting an upgrade to Growth or Pro.

---

### Phase 4: Growth Plan (Inherits Starter + Growth Additions)
* **Quotas**: Up to 250 members • 5 GB high-speed cloud storage.
* **User Stories**:
  - As an established cooperative president, I want to run organized community events with cryptographic QR badge check-ins, track member dues payments with Mobile Money proof uploads, and generate official compliance letters using DocumentOffice.
* **Cumulative Capabilities (All Starter Features + Growth Additions)**:
  - Meeting Minutes & Basic Dues (inherited).
  - QR Code Event Attendance & Instant Badge Scanning.
  - Member Dues Ledger with Mobile Money Push-to-Pay & Auditor Approval Workflow.
  - DocumentOffice Suite (word letterheads, spreadsheets, digital signature blocks, CSV exports).
  - Asset & Equipment Inventory Tracker.
* **UI Scenarios & Behavior**:
  - **Attendance Module**: Organizers generate cryptographic QR check-in sheets and scan member badges via camera.
  - **Financial Ledger**: Members upload payment receipts/SMS codes; accountants and auditors verify and approve transactions in real time.
  - **UI State**: All locks on Growth modules disappear. Settings display "Growth Plan Active (5 GB Storage)".

---

### Phase 5: Pro Plan (Inherits Growth + Pro Additions)
* **Quotas**: Unlimited members • Unlimited cloud storage.
* **User Stories**:
  - As a federation director, I want unlimited member capacity, unlimited cloud storage for all documents and receipts, public marketplace catalog listing, automated certificate generation, and multi-branch governance oversight.
* **Cumulative Capabilities (All Growth Features + Pro Additions)**:
  - QR Attendance, Dues Ledger, DocumentOffice, Asset Tracker (inherited).
  - Unlimited Members & Unlimited Cloud Storage.
  - Automated Certificate Generation & Workshop Badge Builder.
  - Public Marketplace Catalog for Cooperative Commodities & Share Capital Investment Tracker.
  - Advanced Audit Logs, Role Matrix Permissions, and Multi-Branch Federation.
* **UI Scenarios & Behavior**:
  - **Marketplace**: Cooperative products are listed publicly on the global directory.
  - **Certificates**: Bulk generation of official signed certificates with QR verification codes.
  - **UI State**: Zero storage warnings, unlimited file uploads, and full administrative super-privileges across all workspace modules.

---

### Phase 6: Package Purchase & State Transition Flow
* **How It Works**:
  1. **Selection**: User clicks "Upgrade" or visits Settings → Subscription Plans.
  2. **Payment Processing**: User selects Mobile Money (MTN/Airtel) or Card payment, providing transaction reference codes.
  3. **Instant Activation**: Upon payment confirmation (via webhook or admin approval in Superadmin Console), the backend updates `organizations.subscription_tier` and `subscription_status` to `active`.
  4. **Zustand & React Query Sync**: Active store (`orgStore`) instantly refreshes tenant metadata.
  5. **UI Unlock**: All `PlanGatedView` overlays dissolve immediately. Storage quotas expand to new tier limits (e.g., 5 GB or Infinity), and the workspace enjoys uninterrupted operational access.



















