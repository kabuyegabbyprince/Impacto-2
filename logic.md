# IMPACTO ORGANIZATION OPERATING SYSTEM
## Technical Architecture, Database Schemas, Data Flow & System Logic Specification (`logic.md`)

---

## 1. Executive System Overview & Architecture

**Impacto** is a full-stack, multi-tenant Operating System specially designed for Organizations, Farmer Cooperatives, Savings Groups, and Community Foundations operating in East Africa (with special localization for Rwanda).

### Core Architectural Stack
- **Frontend Framework**: React 18 with TypeScript, Vite, and Tailwind CSS.
- **Backend Architecture**: Node.js with Express server (`server.ts`) operating dual-mode (Vite dev middleware in development, compiled CommonJS bundle via `esbuild` in production).
- **Database Layer**: PostgreSQL hosted on Supabase, featuring 40+ relational tables, Row-Level Security (RLS) policies, database triggers, and stored procedure functions.
- **Storage Engine**: Supabase Storage Buckets (`documents`, `chat-attachments`, `avatars`, `impacto-files`) with 24-hour signed URL resolution, client-side Base64 fallback, and multi-bucket retry resolution.
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
├── server.ts                      # Full-stack Express server (Vite dev middleware, static serving, custom API routes)
├── db.sql                         # Complete master database schema migration, RLS policies, triggers, seed data & buckets
├── update.sql                     # Incremental database updates, polls/votes table creation, and fee policy patches
├── index.html                     # HTML root page hosting #root element and entry point
├── README.md                      # High-level system overview
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
    │   ├── layout.tsx             # System application shell (Header, Sidebar/Drawer, Profile Menu, Currency/Lang Switchers)
    │   ├── ui.tsx                 # Core UI component library (Buttons, Inputs, Cards, Modals, Badges, Tabs, ImageUploaders)
    │   ├── Toast.tsx              # Toast notification system provider and custom hook
    │   ├── guards.tsx             # Route protection guards (RequireAuth, RequireRole, RequireSuperadmin)
    │   ├── DocumentOffice.tsx     # Rich document drafting, compliance letters, PDF export & mandatory acknowledgement viewer
    │   ├── PollMessageComponent.tsx # Real-time interactive poll voting widget for chat channels
    │   ├── ResolvedMedia.tsx      # Media component fetching signed Supabase URLs before rendering images/files
    │   ├── PlanGatedView.tsx      # Feature gating overlay component restricting locked subscription tier features
    │   └── LogoLoader.tsx         # Brand logo spinner loading state component
    └── pages/
        ├── dashboard.tsx          # Organization command center (Chat, Polls, Fee Verification, Events, Goals, Grants, Resignations)
        ├── fees.tsx               # Cooperative Member Dues Ledger, Fee Creation, Payment Reporting & Admin Audit Modal
        ├── marketplace.tsx        # Cooperative Product Catalog, Interest Lead Capture & Share Capital Investment Tracker
        ├── admin-modules.tsx      # Member Directory, Role Matrix, ID Verification Queue, Member Tiers, Activity Logs, Audit Logs
        ├── settings.tsx           # Org Profile, MoMo Donation Gateways, Visibility Toggles, Subscription Licenses, Glitch Reporter
        ├── public.tsx             # Public Directory Feed, Organization Showcase Page, Mobile Money Donation Modal, Join Requests
        ├── superadmin.tsx         # Platform Operator Console, License Approvals, Exchange Rates Manager, Live Hotline, Glitch Center
        └── auth.tsx               # Login, Account Registration, and Demo Profile Quick-Switcher
```

---

## 3. Database Schema Architecture & RLS Policies (`db.sql`)

The database consists of **40+ relational tables** structured for multi-tenant isolation:

### Core Tables Summary
1. **`users`**: Platform user accounts (`id`, `email`, `full_name`, `avatar_url`, `is_superadmin`, `auth_user_id`).
2. **`organizations`**: Organization tenant profiles (`id`, `name`, `slug`, `subscription_tier`, `subscription_status`, `donation_mtn_number`, `donation_airtel_number`, `quorum_type`, `quorum_value`, `is_public_directory`, etc.).
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
13. **`polls`**: Real-time standalone chat polls (`poll_id`, `message_id`, `channel_id`, `question`, `options` JSONB).
14. **`poll_votes`**: Individual votes on polls (`id`, `poll_id`, `user_id`, `option_index`).
15. **`poll_messages` & `poll_responses`**: Legacy inline channel poll tables.
16. **`news_posts`**: Announcements & news feed (`id`, `org_id`, `title`, `body`, `visibility`, `is_pinned`).
17. **`goals` & `goal_updates`**: Dynamic metric targets (`id`, `org_id`, `title`, `target`, `unit`, `current_progress`).
18. **`grants`**: Organization grant opportunities pipeline (`id`, `org_id`, `title`, `funder`, `amount_range`, `status`).
19. **`ledger_entries`**: Double-entry bookkeeping ledger (`id`, `org_id`, `type`, `amount`, `category`, `description`, `reference`, `receipt_url`).
20. **`donations`**: Public Mobile Money donation records (`id`, `org_id`, `amount`, `donor_name`, `payment_method`, `proof_url`, `status`).
21. **`member_fees`**: Cooperative member dues & subscriptions (`id`, `org_id`, `member_id`, `amount`, `payment_period`, `period_date`, `status`, `paid_by_method`, `transaction_reference`, `proof_url`, `report_note`, `admin_note`).
22. **`marketplace_products`**: Cooperative produce & craft listings (`id`, `org_id`, `title`, `price`, `image_url`, `contact_info`).
23. **`marketplace_leads`**: Interest submissions for marketplace products (`id`, `product_id`, `member_id`, `message`).
24. **`share_capital`**: Member equity investments (`id`, `org_id`, `member_id`, `shares_count`, `share_value`, `total_paid`, `status`).
25. **`share_transactions`**: Individual share purchase logs (`id`, `org_id`, `member_id`, `shares_added`, `amount_paid`).
26. **`documents`**: In-app letters, bylaws, & official files (`id`, `org_id`, `name`, `file_url`, `is_letter`, `is_private`, `requires_acknowledgement`, `content`).
27. **`document_acknowledgements`**: Compliance signatures on mandatory documents (`id`, `document_id`, `member_id`, `acknowledged_at`).
28. **`resignations`**: Exit survey & membership offboarding requests (`id`, `member_id`, `reason_category`, `reason_detail`, `status`).
29. **`identity_verifications`**: National ID card submissions (`id`, `member_id`, `national_id_number`, `id_card_front_url`, `id_card_back_url`, `status`).
30. **`activity_logs` & `activity_attendance`**: Extended field activity tracker (`id`, `org_id`, `title`, `activity_date`).
31. **`message_templates` & `notification_sends`**: Email/SMS broadcasting engine (`id`, `org_id`, `subject`, `body`).
32. **`audit_logs`**: Full administrative action history (`id`, `org_id`, `performed_by`, `action`, `target_table`).
33. **`support_conversations` & `support_messages`**: Platform operator live helpdesk hotline (`id`, `org_id`, `created_by`, `sender_type`).
34. **`error_reports`**: Platform incident glitch logs (`id`, `org_id`, `title`, `screenshot_url`, `priority`, `status`).
35. **`subscription_payments`**: License renewal receipts (`id`, `org_id`, `plan`, `amount_usd`, `phone`, `proof_url`, `status`).
36. **`platform_settings`**: Exchange rates & global MoMo configuration (`id`, `usd_to_rwf_rate`, `eur_to_rwf_rate`, `kes_to_rwf_rate`, `mtn_payment_number`).

### Row Level Security (RLS) & Helper Functions
- **`is_member_of_org(org_id, user_uid)`**: Security Definer function checking if `user_uid` possesses an `active` row in `org_members` for `org_id`.
- **`is_admin_of_org(org_id, user_uid)`**: Security Definer function checking if `user_uid` is an `active` member with role `org_admin`.
- **`is_platform_superadmin(user_uid)`**: Security Definer function checking if `user_uid` has `is_superadmin = true` in `users`.
- RLS Policies restrict data visibility to active members of the tenant organization, while granting full access to system superadmins.

---

## 4. Supabase Storage Buckets Architecture & File Usage

Supabase Storage is partitioned into 4 distinct buckets:

### 1. `documents` Bucket
- **Purpose**: Stores official Organization documents, PDFs, bylaws, compliance files, and letters.
- **Allowed Types**: All standard documents (`.pdf`, `.docx`, `.xlsx`, `.txt`).
- **Usage in App**: Uploaded via `DocumentOffice.tsx` and `dashboard.tsx` document tabs. File keys are saved as `file_url` in the `documents` table.

### 2. `chat-attachments` Bucket
- **Purpose**: Holds media, image attachments, files, and audio recordings sent within organization communication channels.
- **Allowed Types**: Images, PDFs, media files.
- **Usage in App**: Uploaded inside chat channel input in `dashboard.tsx`. Key saved in `chat_messages.file_url` or `chat_messages.attachment_url`.

### 3. `avatars` Bucket
- **Purpose**: Stores user profile pictures and organization brand logos.
- **Allowed Types**: `image/png`, `image/jpeg`, `image/jpg`, `image/webp`, `image/gif`, `image/svg+xml`.
- **Usage in App**: Uploaded via `ImageUploader` in `components/ui.tsx`, used in `settings.tsx` (organization logo), `auth.tsx` / header profile menu (user profile avatar).

### 4. `impacto-files` Bucket
- **Purpose**: General purpose storage bucket for Mobile Money (MoMo) payment receipt screenshots, member fee payment proof slips, identity verification ID card images, and marketplace product produce photos.
- **Allowed Types**: General images and files.
- **Usage in App**: Uploaded in `fees.tsx` (member fee payment proof), `dashboard.tsx` / `public.tsx` (donation payment proof), `admin-modules.tsx` (ID cards), `marketplace.tsx` (product photos).

### Signed URL & Storage Service Logic (`storageService.ts`)
- **Key Prefixing**: Files are uploaded with unique keys formatted as `bucketName::prefix/timestamp-sanitized_name`.
- **Resolution (`resolveFileUrl`)**:
  1. Checks if the URL is an external link, data URI, or blob URI. If so, returns it directly.
  2. Extracts query params and hash fragments to preserve display flags (e.g. `#show_header=true`).
  3. Parses the active bucket and relative file path.
  4. Calls `supabase.storage.from(bucket).createSignedUrl(path, 86400)` generating a 24-hour temporary secure URL.
  5. If the primary bucket fails (e.g., mismatched bucket key), automatically retries across candidate buckets (`documents`, `chat-attachments`, `impacto-files`, `avatars`) before falling back to `getPublicUrl()`.

---

## 5. State Management & Data Flow Architecture

### Global Zustand Stores

1. **`authStore.ts`**:
   - Holds `currentUser: User | null` and `isSuperadminMode: boolean`.
   - Methods: `setCurrentUser()`, `toggleSuperadminMode()`, `logout()`.
   - Persists session in memory with fallback mock user accounts (`user-admin`, `user-super`, `user-member`).

2. **`orgStore.ts`**:
   - Holds `activeOrg: Organization | null`, `activeChannelId: string | null`, and `activeTab: string`.
   - Methods: `setActiveOrg()`, `setActiveChannelId()`, `setActiveTab()`.
   - Synchronizes `activeOrg` with browser `localStorage` under key `impacto_active_org`, with payload truncation guards to prevent quota errors.

3. **`currencyStore.ts`**:
   - Holds `selectedCurrency: 'RWF' | 'USD' | 'EUR' | 'KES'`.
   - Methods: `setSelectedCurrency()`, `convertAmount(amountInRwf, targetCurrency)`.
   - Uses real-time exchange rates (`usd_to_rwf_rate`, `eur_to_rwf_rate`, `kes_to_rwf_rate`) fetched from `platform_settings` table.

### Data Fetching Engine (`useImpactoData.ts`)
- Configured via `@tanstack/react-query`.
- Performs dual-mode operation:
  - When `isSupabaseConfigured` is `true`, executes live async Supabase queries and mutations (`supabase.from('table').select(...)`).
  - When Supabase is not configured or an error occurs, seamlessly falls back to `MockDB` (`src/lib/mockData.ts`), ensuring zero UI disruption during local previews.
- Custom hooks exposed:
  - `useUsers()`, `useOrganizations()`, `useOrgMembers()`, `useMemberTiers()`
  - `usePrograms()`, `useEvents()`, `useEventAttendance()`, `useEventRSVPs()`
  - `useMeetings()`, `useActionItems()`
  - `useGoals()`, `useGoalUpdates()`, `useGrants()`, `useLedgerEntries()`, `useDonations()`
  - `useMemberFees()`, `useCreateMemberFee()`, `useUpdateMemberFeeStatus()`
  - `useMarketplaceProducts()`, `useMarketplaceLeads()`, `useShareCapital()`, `useShareTransactions()`
  - `useDocuments()`, `useDocumentAcknowledgements()`, `useResignations()`
  - `useChatChannels()`, `useChatMessages()`, `usePolls()`, `usePollVotes()`
  - `useNewsPosts()`, `useSupportConversations()`, `useSupportMessages()`, `useErrorReports()`
  - `usePlatformSettings()`, `useSubscriptionPayments()`

### Real-Time WebSocket Synchronization (`useRealtime.ts`)
- Subscribes to Supabase Realtime WebSocket channel `public:db-changes`.
- Listens for database events (`INSERT`, `UPDATE`, `DELETE`) on active tables (`chat_messages`, `polls`, `poll_votes`, `donations`, `member_fees`).
- On receiving a WebSocket event, automatically triggers `queryClient.invalidateQueries({ queryKey: [...] })`, updating UI components across all connected clients instantly without requiring manual page reloads.

---

## 6. Server Infrastructure (`server.ts`)

`server.ts` is a hybrid Express server operating under two distinct build regimes:

1. **Development Mode (`process.env.NODE_ENV !== 'production'`)**:
   - Imports Vite dynamically (`import('vite')`).
   - Attaches Vite dev server as middleware (`app.use(vite.middlewares)`), providing instant HMR and ES module transformation on port 3000.

2. **Production Mode (`process.env.NODE_ENV === 'production'`)**:
   - Serves static pre-compiled frontend assets from `dist/` directory using `express.static`.
   - Serves SPA fallback routing (`app.get('*', ... sendFile('dist/index.html'))`).
   - Bundled into a single self-contained CommonJS file `dist/server.cjs` using `esbuild` (`npm run build`).

3. **Backend API Endpoints**:
   - `GET /api/health`: Health check endpoint returning `{ status: "ok" }`.
   - `POST /api/member-fees/update`: Backend proxy route allowing fee payment status updates and automated bookkeeping ledger generation.

---

## 7. Component-by-Component Detailed Logic

### `/src/components/layout.tsx` (`Layout`)
- **Purpose**: System top header navigation shell and drawer container.
- **Data Flow & Logic**:
  - Consumes `authStore` for user session, `orgStore` for active tenant org, and `currencyStore` for active currency.
  - Renders organization context dropdown selector (`Select`), allowing seamless switching between member Organizations.
  - Hosts user profile drawer showing user role badge, superadmin mode toggle button, language switcher (`en`, `fr`, `rw`), and currency selector.
  - Implements mobile-responsive navigation drawer toggled via menu button.

### `/src/components/ui.tsx` (`UI Library`)
- **Purpose**: Complete design system UI primitive components.
- **Included Components**:
  - `Button`: Custom styled button supporting variants (`default`, `outline`, `ghost`, `danger`, `success`), sizes (`sm`, `md`, `lg`), loading spinner states, and custom `id` tags.
  - `Input`, `Textarea`, `Select`: Accessible form controls styled with Tailwind CSS focusing, dark mode support, and error states.
  - `Card`, `CardHeader`, `CardTitle`, `CardContent`: Bordered container cards with strict mathematical padding rules.
  - `Badge`: Status pill badges with role-based or status-based color mappings (`active`, `pending`, `paid`, `unsettled`, `suspended`).
  - `Modal`: Accessible dialog modal overlay with backdrop click dismiss, escape key handler, and smooth transition animations.
  - `Tabs`: Multi-tab navigation header switching active view panes.
  - `ProgressBar`: Animated progress bar component showing target completion percentages.
  - `ImageUploader`: Drag-and-drop & manual file selection component uploading images directly to Supabase Storage (`avatars` or `impacto-files`) with loading feedback.

### `/src/components/Toast.tsx` (`ToastProvider` & `useToast`)
- **Purpose**: Global notification alert system.
- **Logic**: Provides `addToast(message, type)` function displaying auto-dismissing toast popups (`success`, `error`, `info`) in the bottom-right viewport.

### `/src/components/guards.tsx` (`Route Guards`)
- **Purpose**: Role-based and session access control components.
- **Components**:
  - `RequireAuth`: Redirects unauthenticated users to `/auth`.
  - `RequireRole`: Verifies if the active user's role in `org_members` meets required permissions (e.g. `org_admin` or `accountant`) before rendering children.
  - `RequireSuperadmin`: Ensures `user.is_superadmin === true`.

### `/src/components/DocumentOffice.tsx` (`DocumentOffice`)
- **Purpose**: In-app rich document drafting, compliance letter composition, PDF download generation, and mandatory acknowledgement tracking.
- **Logic**:
  - Uses rich textarea editing for document templates (Meeting Minutes, Official Notice, Resignation Letter, Member Notice).
  - Generates formatted documents with organization letterhead, logo, and metadata.
  - Allows assigning recipient member IDs and setting mandatory acknowledgement deadlines.
  - Displays acknowledgement status matrix showing which members have signed/acknowledged the document.

### `/src/components/PollMessageComponent.tsx` (`PollMessageComponent`)
- **Purpose**: Real-time voting widget embedded directly inside chat messages.
- **Logic**:
  - Receives `poll` object and `channelId`.
  - Fetches existing votes via `usePollVotes(poll.poll_id)`.
  - Computes total votes, vote count per option, and percentage width for animated progress bars.
  - On user selecting an option, calls `useCastPollVote` mutation, inserting or updating row in `poll_votes` table.
  - Real-time WebSocket listener updates percentages dynamically for all users viewing the chat channel.

### `/src/components/ResolvedMedia.tsx` (`ResolvedMedia`)
- **Purpose**: Asynchronous media renderer component.
- **Logic**:
  - Accepts `src` prop containing a file key, relative path, or URL.
  - Executes `resolveFileUrl()` to fetch a signed 24-hour Supabase URL or Base64 fallback.
  - Renders responsive `<img>`, file icon preview, or fallback thumbnail.

### `/src/components/PlanGatedView.tsx` (`PlanGatedView`)
- **Purpose**: Tier subscription gating overlay.
- **Logic**:
  - Inspects `activeOrg.subscription_tier` (`trial`, `starter`, `pro`, `enterprise`).
  - If required tier is higher than current tier, renders a frosted glass blur overlay with an upgrade call-to-action redirecting to `/settings`.

---

## 8. Page-by-Page Detailed Logic & Feature Modules

### `/src/pages/dashboard.tsx` (`Organization Command Center`)
- **Overview**: The main central dashboard for active organization operations.
- **Sub-Modules & Logic**:
  1. **KPI Stat Overview Cards**: Displays active member count, total funds raised, total dues collected, and upcoming events count.
  2. **Real-time Organization Chat & Channels**:
     - Channel list selector (General, Project, Committee, Private, Announcement).
     - Message feed showing user avatars, text, attachments (`chat-attachments`), and embedded polls (`PollMessageComponent`).
     - Message input bar supporting file attachments, voice recording audio upload, and poll creation dialog.
  3. **Pending Member Fee Verification Widget**:
     - Displays reported fee payments awaiting verification by organization admins/accountants.
     - Provides "Approve & Reconcile" and "Reject" buttons. Approving updates `member_fees.status = 'paid'` and automatically creates an income entry in `ledger_entries`.
  4. **Mobile Money Donation Approvals**:
     - Displays pending donor contributions with attached proof receipts.
     - Admins verify proof screenshot before confirming donation and logging it into bookkeeping.
  5. **Programs & Community Events Manager**:
     - Lists programs and upcoming events.
     - Event QR Code Generator: Generates unique QR tokens (`qr_code_token`) for attendance scanning.
     - Event Check-in Console: Allows manual or scanner check-in logging to `event_attendance`.
  6. **Goal Tracker & Progress Updates**:
     - Displays metric goals (e.g. "Plant 25,000 native saplings").
     - Progress bar visualizer with target vs current progress and goal update log submission modal.
  7. **Financial Bookkeeping & Sourced Grants Pipeline**:
     - Lists double-entry income/expense transactions (`ledger_entries`) and grant applications (`grants`).
  8. **News Posts & Announcements Feed**:
     - Rich news feed with category tags, pinned posts, and public visibility badges.
  9. **Support Hotline Live Ticket Drawer**:
     - Direct live chat conversation channel connecting organization admins with platform superadmins for instant technical support.

### `/src/pages/fees.tsx` (`Cooperative Dues & Contribution Fee Ledger`)
- **Overview**: Complete financial dues collection and audit management system for cooperative members.
- **Sub-Modules & Logic**:
  1. **Fee Announcement Console**: Admins compose custom fee announcement notices broadcasted across the member fee dashboard.
  2. **Dues Matrix & Filtering**: Filter fees by status (`All`, `Paid`, `Unsettled / Pending`, `Awaiting Admin Verification`).
  3. **Fee Creation Modal**: Admins configure dues charges for individual members or entire tiers (Weekly/Monthly cycle, period date, target amount, deadline).
  4. **Member Payment Submission Panel**:
     - Member selects pending fee, chooses payment method (`MTN Mobile Money` or `Airtel Money`), inputs MoMo transaction reference number, sender phone/info, optional comment, and uploads proof slip screenshot to `impacto-files` bucket.
     - Submitting updates status to `pending_verification` and sets `reported_at = NOW()`.
  5. **Admin / Accountant Verification Modal**:
     - Admin inspects payment details, MoMo reference, and proof screenshot image.
     - **Approval**: Updates `status = 'paid'`, `paid_at = NOW()`, and automatically posts an income ledger entry into `ledger_entries` (`category = 'Membership Fee'`).
     - **Rejection**: Sets `status = 'pending'`, adds administrative rejection note (`admin_note`), and notifies member to re-submit correct proof.
  6. **Fee Renewal / Re-application Modal**: Allows admins to quickly re-apply dues charges for a new payment cycle.

### `/src/pages/marketplace.tsx` (`Cooperative Produce & Share Capital Marketplace`)
- **Overview**: Dual-purpose module for trading cooperative produce and managing member share capital equity.
- **Sub-Modules & Logic**:
  1. **Marketplace Catalog**:
     - Members list agricultural produce, crafts, or services (`title`, `description`, `price`, `image_url`, `contact_info`).
     - Buyers click "Express Interest" opening a lead form (`marketplace_leads`) notifying product owners.
  2. **Share Capital Investment Tracker**:
     - Tracks member equity shares (`shares_count`, `share_value`, `total_paid`).
     - Admins log share additions (`share_transactions`), updating total paid capital and calculating share percentages.

### `/src/pages/admin-modules.tsx` (`Organization Administration Panel`)
- **Overview**: Core administrative control panel for member management, compliance, and auditing.
- **Sub-Modules & Logic**:
  1. **Member Directory & Role Assignment**:
     - Lists all organization members with search and role filters.
     - Admins update member roles (`org_admin`, `manager`, `accountant`, `member`) and toggle explicit JSONB permission flags.
  2. **Identity Verification Queue**:
     - Reviews submitted National ID cards (`id_card_front_url`, `id_card_back_url`, `national_id_number`).
     - Approving updates member verification status to `verified`.
  3. **Member Tiers Customization**: Configures tier levels, annual fees, and tier benefit lists.
  4. **Extended Activity Logs & Attendance**: Tracks field activities and logs participating members.
  5. **Notification Broadcasting Engine**: Drafts email/SMS templates with placeholder variables (`{{member_name}}`, `{{amount}}`) and logs broadcast dispatch histories (`notification_sends`).
  6. **Full System Audit Trail (`audit_logs`)**: Chronological audit log viewer capturing administrative actions, IP addresses, target tables, and old vs new JSON values.

### `/src/pages/settings.tsx` (`Organization & System Settings`)
- **Overview**: Configuration page for tenant branding, payment gateways, public visibility, and subscriptions.
- **Sub-Modules & Logic**:
  1. **Organization Profile**: Update Organization name, tagline, mission, vision, brand primary/secondary colors, and logo.
  2. **Mobile Money Payment Gateways**: Configures official MTN & Airtel Mobile Money merchant phone numbers and account recipient names for public donations and fee collections.
  3. **Public Directory Visibility Toggles**: Toggles public directory listing (`is_public_directory`), public join permissions (`allow_public_joining`), and public financial summary disclosures.
  4. **Subscription Plan Management**: View current plan (`trial`, `starter`, `pro`, `enterprise`), view storage consumption caps, submit license renewal payment proofs, and request tier upgrades.
  5. **Incident Error Reporting Tool**: Submit system glitch reports (`error_reports`) with attached screenshot URLs directly to platform superadmins.

### `/src/pages/public.tsx` (`Public Organization Discovery & Showcase Portal`)
- **Overview**: Visitor-facing portal showcasing registered organizations, mission goals, public events, and donation gateways.
- **Sub-Modules & Logic**:
  1. **Organizations Discovery Feed**: Filterable directory of public Organizations and Cooperatives by category (Environment, Education, Health, Agriculture, Savings).
  2. **Public Organization Impact Page**: Dynamic showcase displaying an organization's tagline, mission statement, active metric goals, public events, news announcements, and gallery photos.
  3. **Direct Mobile Money Donation Modal**: Visitors select donation amount, enter donor name/email, select MTN/Airtel payment gateway, copy recipient MoMo number, upload payment confirmation screenshot to `impacto-files`, and submit donation for verification.
  4. **Public Membership Join Request**: Visitors submit join requests to open cooperatives (`allow_public_joining = true`).
  5. **Subscription Pricing Calculator**: Interactive pricing calculator displaying plan tiers, monthly costs in RWF, storage caps, and feature comparison tables.

### `/src/pages/superadmin.tsx` (`Platform Operator Console`)
- **Overview**: Superadmin operator control center managing all tenant organizations across the entire platform.
- **Sub-Modules & Logic**:
  1. **Platform KPI Metrics**: Displays total registered organizations, total system users, active subscriptions count, and cumulative transaction volume across all tenants.
  2. **Tenant Subscription License Management**: Review submitted subscription license payments (`subscription_payments`), verify proof screenshots, approve or reject payments, and extend organization trial or active periods.
  3. **Global Currency Exchange Rates Manager**: Edit system-wide conversion rates (`usd_to_rwf_rate`, `eur_to_rwf_rate`, `kes_to_rwf_rate`) and global operator MoMo disbursement numbers stored in `platform_settings`.
  4. **Live Helpdesk Support Hotline Console**: Operator interface for answering live support conversations (`support_conversations`, `support_messages`) initiated by organization admins.
  5. **Glitch Incident Reports Center**: Operator review center for inspecting, prioritizing (`low`, `normal`, `high`, `critical`), and resolving submitted system glitch reports (`error_reports`).

### `/src/pages/auth.tsx` (`Authentication & Profile Switching`)
- **Overview**: Login, registration, and quick demo user switching portal.
- **Logic**:
  - Handles email/password authentication or Supabase Auth login.
  - Features a "Quick Switch Demo Persona" bar allowing instant toggling between pre-seeded personas:
    - **Gaby Prince Kabuye** (`superadmin@impacto.rw`) - Platform Operator Superadmin.
    - **Anatole Mugisha** (`admin@impacto.rw`) - Organization Admin & Executive Secretary.
    - **Divine Uwera** (`member@impacto.rw`) - Active Cooperative Member.
    - **John Radcliffe** (`john@funder.org`) - International Grant Funder / Donor.

---

## 9. Core Domain & Business Logic Workflows

### 1. Member Fee Reconciliation & Auto-Ledger Workflow
```
[Member Reports Payment] 
   └─> Submits MoMo Reference + Proof Screenshot in fees.tsx
   └─> Member Fee Status set to 'pending_verification'
   
[Admin / Accountant Review]
   └─> Admin opens Verification Modal in fees.tsx or dashboard.tsx
   └─> Inspects transaction reference, amount, and proof image
   
[Approval Action]
   └─> Fee status updated to 'paid', paid_at timestamp recorded
   └─> AUTO-LEDGER INVOCATION: System creates row in ledger_entries:
          - type: 'income'
          - amount: fee.amount
          - category: 'Membership Fee'
          - description: 'Member Fee Payment: [Member Name] - [Period]'
          - reference: fee.transaction_reference
   └─> Real-time WebSocket triggers cache refresh across all client dashboards
```

### 2. MoMo Public Donation Verification Workflow
```
[Visitor Donates on Public Page]
   └─> Fills donor name, amount, selects MTN/Airtel MoMo Gateway
   └─> Uploads payment proof screenshot to 'impacto-files' bucket
   └─> Donation inserted with status 'awaiting_approval'
   
[Admin Verification]
   └─> Admin receives pending donation alert on dashboard.tsx
   └─> Verifies proof screenshot against bank/MoMo statement
   └─> Confirms donation: status set to 'confirmed'
   └─> AUTO-LEDGER INVOCATION: System logs income entry in ledger_entries:
          - category: 'Donations'
          - reference: donor email / phone
```

### 3. Interactive Chat & Real-Time Standalone Poll Voting
```
[Poll Creation]
   └─> Admin or Manager creates poll in chat channel input bar
   └─> Inserts message into chat_messages (message_type = 'poll')
   └─> Inserts poll metadata into polls table (poll_id, question, options JSONB)
   
[Member Voting]
   └─> Member selects option in PollMessageComponent
   └─> Upserts vote into poll_votes table (poll_id, user_id, option_index)
   └─> WebSocket channel 'public:db-changes' broadcasts INSERT/UPDATE on poll_votes
   └─> All connected clients auto-refetch usePollVotes and update progress bars live
```

### 4. Multi-Tenant Authorization & Security Boundaries
- **Tenant Isolation**: Every database table contains `org_id REFERENCES organizations(id) ON DELETE CASCADE` (or inherits org context via child foreign key).
- **UI Guard Level**: `RequireRole` and `PlanGatedView` enforce role permissions (`org_admin`, `accountant`, `manager`, `member`) and subscription tier requirements (`trial`, `starter`, `pro`, `enterprise`) on the client side.
- **Database Level**: RLS policies enforce `is_member_of_org(org_id, auth.uid())` and `is_admin_of_org(org_id, auth.uid())` on all SQL queries at the database engine level, guaranteeing total multi-tenant data isolation.

---
*Documentation compiled and synchronized for Impacto Organization Operating System codebase.*
