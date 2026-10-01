# IMPACTO 🇷🇼
### Master Operating System & SaaS Management Platform for Cooperatives, NGOs, and Community Foundations

Welcome to the official technical documentation, architecture specification, and system manual for **IMPACTO**, an enterprise multi-tenant operating system built for Rwandan and East African farming cooperatives, non-profits, saving associations, and community foundations.

---

## 📑 Table of Contents
1. [System Overview & Architecture](#-system-overview--architecture)
2. [Technology Stack](#-technology-stack)
3. [Core Functional Modules](#-core-functional-modules)
4. [Design System & UI Foundations](#-design-system--ui-foundations)
5. [Design Report: Themes, Report Styles & Visual Hierarchy](#-design-report-themes-report-styles--visual-hierarchy)
6. [Package & Subscription Expiration Technical Engine](#-package--subscription-expiration-technical-engine)
7. [Storage Architecture (Supabase Storage)](#-storage-architecture-supabase-storage)
8. [Database Schema & Security (Supabase PostgreSQL + RLS)](#-database-schema--security-supabase-postgresql--rls)
9. [Environment Configuration & Deployment](#-environment-configuration--deployment)
10. [Support & Maintainers](#-support--maintainers)

---

## 🎨 Design Report: Themes, Report Styles & Visual Hierarchy

For the dedicated whitepaper, see [DESIGN_REPORT.md](./DESIGN_REPORT.md).

### Theme & Aesthetics:
- **Impacto Emerald Palette**: Primary brand `#15803D` / `#16A34A` representing agricultural growth, dark green `#14532D` for structural accents, and soft mint `#DCFCE7` for status badges.
- **Rwandan Amber Warning Token**: `#F59E0B` for trial countdowns, grace periods, and pending review alerts.
- **Typography**: `Plus Jakarta Sans` for display headlines, `DM Sans` / `Inter` for multilingual tables and forms, and `JetBrains Mono` for Mobile Money USSD strings (`*182*8*1*880099#`) and cryptographic hashes (`SIG-VERIFIED`).
- **Dynamic Tenant Theming**: Every cooperative controls its `--org-primary` and `--org-secondary` CSS variables.
- **Mobile Virtual Keyboard Protection**: `<meta name="viewport" content="... interactive-widget=resizes-content">`, form input focus scroll-into-view, and `16px` font size enforcement to prevent iOS auto-zoom disruptions.

### Report Designs:
- **Executive Meeting Resolutions**: Printable official dossiers with letterhead, quorum compliance, and voting outcomes.
- **MoMo Ledger & Audits**: Real-time status cards, USSD dials, and telecom SMS verification proof logs.
- **QR Attendance Verification**: Contactless roll call sheets with member tags and one-click Excel export.
- **Cryptographic Document Signing**: Verification registries with SHA-256 integrity hashes.

---

## ⏱️ Package & Subscription Expiration Technical Engine

### 1. Base Subscription Tier Lifecycle
- **Active Phase**: While `Date.now() < subscription_ends_at`, full member and storage quotas are active.
- **3-Day Grace Period**: Triggered when `subscription_ends_at < Date.now() < grace_period_ends_at`. Grants 72 hours for Mobile Money reconciliation with amber status badges.
- **Safe Read-Only Mode**: Zero data loss. Historical data, ledgers, and documents remain permanently readable; new creation actions are restricted until upgraded.

### 2. Add-On Modular Package Expiration ($4/mo)
- **Data Model**: Stored in `org.packages_data[pkgId]` with `{ purchased_at, expires_at }`.
- **Verification Logic**: `getOrgActivePackages()` and `getPackageExpirationStatus()` in `src/lib/subscriptionMatrix.ts` compare `Date.now()` with `expires_at`.
- **Enforcement**: Once `now > expires_at`, the package is immediately omitted from active capabilities, bonus members (+20 slots) are removed, gated modules prompt for renewal, and a prominent badge displays "Expired on [Date]".
- **Server Sync**: Purchases from accountants/admins immediately land on `/api/payments/subscription-payments` and display on the Super Admin dashboard review board.

---

---

## 🌟 System Overview & Architecture

IMPACTO addresses the real-world operational challenges of cooperatives and community organizations:
- **Dual-Mode Persistence (Supabase + MockDB Offline Failover)**: Operates seamlessly against Supabase PostgreSQL. If the cloud database is disconnected, the client-side system immediately falls back to a high-fidelity local `MockDB` cache to prevent interruptions.
- **Trilingual Localization Engine**: Native, dynamic switching between English (`en`), French (`fr`), and Kinyarwanda (`rw`) with local storage persistence and extended domain dictionaries.
- **Dynamic Multi-Tenant Branding**: Every cooperative workspace dynamically controls its own brand colors, dashboard logo, cover banner, mission/vision statements, and public portal directory.
- **Automated Payment & Fee Auditing**: Mobile Money payment submission workflows (MTN MoMo, Airtel Money), fee calendars, automated reminder notifications, and an administrative payment review queue with receipt attachment verification.

```
       +-------------------------------------------------------------+
       |                     React 18 + Vite SPA                     |
       |  (Tailwind CSS, TanStack Query v5, Zustand, Lucide Icons)   |
       +--------------+-------------------------------+--------------+
                      |                               |
                      | Realtime WebSockets           | Direct REST & RPC
                      v                               v
       +-------------------------------+   +-------------------------+
       |   Supabase Realtime Channel   |   |   Supabase PostgreSQL   |
       |  (Live Chat, Polls, Payments) |   |  (40+ Relational Tables)|
       +-------------------------------+   +------------+------------+
                                                        |
                      +---------------------------------+
                      |
                      v
       +-------------------------------+   +-------------------------+
       |   Supabase Storage Buckets    |   |     Express Node.js     |
       | (avatars, documents, chat)    |   |   (Proxy & Webhooks)    |
       +-------------------------------+   +-------------------------+
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | React 18, TypeScript, Vite |
| **Styling & Design System** | Tailwind CSS with CSS Variables for dynamic tenant branding |
| **Server State & Caching** | `@tanstack/react-query` (v5) with optimistic updates and background refetching |
| **Client State Management** | `zustand` (`authStore`, `orgStore`, `currencyStore`) |
| **Icons & Visuals** | `lucide-react` |
| **Data Visualizations & Charts** | `recharts`, custom SVG gauge and progress rings |
| **Localization & i18n** | `i18next`, `react-i18next` (English, French, Kinyarwanda) |
| **Backend & Middleware** | Node.js, Express, `esbuild` |
| **Database & Realtime** | Supabase PostgreSQL 14+, Row Level Security (RLS), Supabase Realtime |
| **File & Media Storage** | Supabase Storage (`avatars`, `documents`, `chat-attachments`, `impacto-files`) |

---

## 🧱 Core Functional Modules

### 1. Workspace & Multi-Tenant Management
- **Organization Switching**: Multi-org membership mapping allowing users to belong to and switch between multiple cooperatives while maintaining a primary organization landing preference.
- **Custom Branding**: Dedicated settings to upload brand logos, set custom cover banners, configure primary and secondary brand colors, and craft mission and vision statements.
- **Public Organization Showcase (`/@slug`)**: Dedicated public portal for each cooperative with social impact metrics, gallery photo grid, leadership overview, contact details, mobile money donation button, and public product marketplace.

### 2. Cooperative Member Fees & Capital Shares Ledger
- **Fee Calendars & Mandatory Dues**: Track annual dues, monthly contributions, and one-off project assessments per member.
- **Payment Verification Queue**: Members submit payment proof (SMS reference codes and transaction slips). Accountants and auditors review, approve, or reject transactions with automated push notifications.
- **Share Capital Ledger**: Record and calculate cumulative farmer equity, share purchase histories, and dividend entitlements.

### 3. Cooperative Marketplace & Lead Generation
- **Product & Commodity Catalog**: Cooperative members and managers list agricultural produce, artisanal crafts, and value-added commodities.
- **Public & Member Inquiry System**: External visitors and internal members can express interest and submit direct purchase inquiries with contact details.
- **Admin Leads Dashboard**: Cooperative staff review, follow up on, and manage buyer leads.

### 4. Interactive Community Forums & Live Chat
- **Categorized Channels**: Real-time communication channels (*General*, *Projects*, *Committees*, *Announcements*).
- **Rich Media & Voice Notes**: In-app audio recording with HTML5 `MediaRecorder`, rendering interactive waveforms and audio playback. Direct photo and document attachment sharing.
- **Real-Time Interactive Polling**: Multi-choice polling with live vote percentage progress bars and strict "one member, one vote" tracking.

### 5. DocumentOffice Suite & Verification Center
- **Word & Letterhead Editor**: Rich drafting interface with dynamic template variable interpolation (`{{full_name}}`, `{{org_name}}`, `{{shares}}`), tenant logo injection, and PDF export.
- **Spreadsheet Workbook Builder**: In-browser spreadsheet editor with formulas, row/column management, and CSV export.
- **Document Compliance & Acknowledgement**: Require members to formally read and acknowledge legal policies, with electronic signature tracking.
- **Identity Document Verification Hub**: Upload and audit national IDs and passports with status tracking (`pending`, `verified`, `rejected`, `flagged`).

### 6. Event Check-ins & QR Code Attendance
- **Event Management**: Schedule member general assemblies, training workshops, and community planting days.
- **Dynamic QR Code Check-Ins**: Contactless attendee check-in via scanner, self check-in tokens, or manual roster confirmation.
- **Tabular Attendance Export**: Export verified attendee rosters directly into Excel / CSV.

### 7. Governance, Quorum & Resignation Workflows
- **Quorum Validation**: Automated meeting quorum verification based on active membership counts and statutory percentages.
- **Empathetic Offboarding & Exit Surveys**: Members can submit formal resignation notices with structured feedback. Management can review, provide official responses, and finalize departures.

### 8. Asset & Equipment Inventory Tracker
- **Hardware & Tools Register**: Track cooperative physical machinery, agricultural tools, vehicles, and IT assets.
- **Maintenance & Assignment Logs**: Assign assets to specific members or field locations, log operational condition, and track serial numbers.

### 9. Mobile Money Donations & Public Gateway
- **MTN MoMo & Airtel Money Integration**: Pre-configured donor checkout flows supporting direct local mobile money transfers.
- **Gateway Webhook Receiver**: Server-side endpoint (`/api/payments/webhook`) receiving push callbacks and reconciling payment statuses.

### 10. Platform Hotline & IT Ticket Reporter
- **Glitch & Bug Tracking**: In-app feedback system enabling users and staff to file bug reports, submit screenshots, and track engineering resolution statuses.

---

## 🎨 Design System & UI Foundations

IMPACTO implements a high-contrast, accessible visual design system tailored for daylight field usage and evening low-light environments:
- **Display Typography**: **Space Grotesk** / **Outfit** for crisp, modern headings and metric cards.
- **Body & Controls**: **Plus Jakarta Sans** / **Inter** for legible data display and form controls.
- **Monospace Numeric**: **JetBrains Mono** for transaction IDs, financial amounts, and timestamps.
- **Sophisticated Light & Dark Mode**: Off-white canvases (`#f8fafc`) for daytime readability and deep obsidian slate (`#020617` / `#0b1329`) for dark mode.
- **Touch-First Accessibility**: Minimum 44px touch targets across all mobile interactive controls.

---

## 💾 Storage Architecture (Supabase Storage)

IMPACTO uses public Supabase Storage buckets configured with Row-Level Security:

1. **`avatars`** (Public): Organization logos, user profile photos, cover banners, and marketplace product imagery.
2. **`documents`** (Public): Identity verification documents, official meeting minutes, certificates, and compliance policies.
3. **`chat-attachments`** (Public): Live chat images, outreach media, and recorded voice notes.
4. **`impacto-files`** (Public): General system assets and financial receipts.

### Storage Resolution Pipeline:
- The client-side utility `resolveFileUrl()` in `src/lib/storageService.ts` handles Supabase public URL generation, signed download link resolution, and local Base64 / blob fallbacks gracefully.

---

## 🗄️ Database Schema & Security (Supabase PostgreSQL + RLS)

The complete schema is maintained in `db.sql` and `update.sql`:
- **40+ Relational Tables** with foreign keys, cascading deletes, and performance indices.
- **Row Level Security (RLS)** enabled on all tables, isolating tenant records through membership checks (`is_member_of_org()`).
- **Supabase Realtime Publications** broadcasting changes for `chat_messages`, `polls`, `poll_votes`, `donations`, and `member_fees`.

---

## 🚀 Environment Configuration & Deployment

### Required Environment Variables (`.env`):
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anonymous-key
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key

# Server Port (Defaults to 3000 in dev and production)
PORT=3000
```

### Build & Run Scripts:
```bash
# 1. Install dependencies
npm install

# 2. Run full-stack dev server (Vite + Express)
npm run dev

# 3. Compile for production
npm run build

# 4. Start production server
npm run start
```

---

## 🤝 Support & Maintainers

IMPACTO is proudly engineered for Rwandan and East African community organizations.
- **Lead Developer**: Gaby Prince Kabuye & the IMPACTO Engineering Team
- **Support & Hotline**: support@impacto.rw
