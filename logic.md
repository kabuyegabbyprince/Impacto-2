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
