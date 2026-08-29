# IMPACTO 🇷🇼
### Enterprise SaaS Management Platform for Organizations, Cooperatives, and Non-Profits

Welcome to the definitive architectural and technical blueprint of **IMPACTO**, a high-fidelity, production-ready SaaS (Software-as-a-Service) multi-tenant management system specifically engineered to empower organizations, farming/producer cooperatives, and community non-profits across Rwanda.

IMPACTO serves as an all-in-one digital operating system, bridging the gap between field outreach, corporate compliance, financial tracking, and real-time community engagement. Designed around the real-world operational realities of local organizations, it features dual-layer offline fallbacks, dynamic multi-lingual localizations (English, Kinyarwanda, and French), and secure multi-tenant isolation.

---

## 📖 Table of Contents
1. [Core Platform Philosophy](#-core-platform-philosophy)
2. [Master Technical Architecture](#-master-technical-architecture)
3. [Brick-by-Brick Functional Modules](#-brick-by-brick-functional-modules)
4. [Aesthetics, Design Philosophy & Visual System](#-aesthetics-design-philosophy--visual-system)
5. [Responsive Layout & Media Query Breakdowns](#-responsive-layout--media-query-breakdowns)
6. [Backend Storage Proxy Engine (S3/B2 Client)](#-backend-storage-proxy-engine-s3b2-client)
7. [Relational Database Blueprint & RLS Policies](#-relational-database-blueprint--rls-policies)
8. [Configuration & Deployment Guide](#-configuration--deployment-guide)

---

## 🌟 Core Platform Philosophy

Non-profits and agricultural cooperatives in developing economies like Rwanda navigate distinct technological environments characterized by:
- **Variable Network Speeds**: Bandwidth shifts rapidly between 4G urban coverage in Kigali and 2G/3G rural signals in mountainous provinces (Eastern/Northern).
- **Multi-lingual Operations**: Administrative work is conducted in English and French, while day-to-day agricultural check-ins and cooperative forums rely heavily on Kinyarwanda.
- **Resource Constraints**: Strict audit trails are required to maintain donor trust, but budgets for expensive enterprise software are non-existent.

IMPACTO is built from the ground up to solve these constraints:
1. **Dynamic Client-Side Offline Failover**: If connection to the remote Supabase PostgreSQL database is lost or unconfigured, the system immediately diverts to a high-fidelity local in-memory/localStorage `MockDB` cache, allowing continuous use without application crashes.
2. **Hybrid S3/B2 Secure Storage with Fallback**: Large binary attachments, PDF contracts, voice notes, and images upload to Backblaze B2. If API credentials are not supplied, the server automatically caches files in-memory and serves them via local routes, keeping the platform fully functional.
3. **Frictionless Translation System**: Supports direct on-the-fly toggling between English (`en`), French (`fr`), and Kinyarwanda (`rw`) with context-aware mappings.

---

## 🛠️ Master Technical Architecture

IMPACTO uses a full-stack, decoupled-yet-unified model running on **Vite**, **React 18 (TypeScript)**, **Express**, and **PostgreSQL (Supabase)**.

```
       +--------------------------------------------------------+
       |                  React SPA Frontend                    |
       |  (Inter UI / Space Grotesk Typo, Tailwind CSS Core)    |
       +----------+----------------------------------+-----------+
                  |                                  |
                  | API Proxy /                      | Directly via 
                  | Storage Uploads                  | Supabase JS Client
                  v                                  v
       +--------------------+               +--------------------+
       | Express Server     |               | Supabase Cloud     |
       | (server.ts)        |               | Backend            |
       +---------+----------+               +---------+----------+
                 |                                    |
                 | S3 Protocol                        | SQL Queries
                 v                                    v
       +--------------------+               +--------------------+
       | Backblaze B2 Bucket|               | PostgreSQL DB      |
       | (Object Storage)   |               | (RLS & Triggers)   |
       +--------------------+               +--------------------+
```

### Technical Stack Components:
- **Frontend SPA**: Built with **React 18** and **TypeScript** for strict compile-time type safety. Runs inside a **Vite** development pipeline optimized for instant cold-starts and high-speed bundling.
- **State Management & Querying**: Employs **TanStack Query (React Query) v5** for server-state caching, automatic background refetching, mutation tracking, and memory-safe cache synchronization.
- **Dynamic Theming**: Utilizes CSS variables linked directly to organization-specific records. Primary and secondary colors are loaded dynamically from the selected cooperative’s record and injected into the document root.
- **Backend Routing Engine**: An **Express** node process proxies multi-part file uploads and generates S3 presigned URLs, keeping secret cloud keys completely hidden from the browser console.
- **Relational DB / Supabase**: Provides transactional durability, real-time database listener hooks, and multi-tenant isolation via **Row-Level Security (RLS)** policies.

---

## 🧱 Brick-by-Brick Functional Modules

IMPACTO is divided into 10 highly cohesive functional sub-systems. Each brick acts as a modular, self-contained unit of business logic.

### 1. Multi-Tenant Onboarding & Authentication
- **Onboarding Pipeline**: Users can dynamically search, filter, and register for distinct organization tenants in Rwanda. It includes relevance sorting prioritizing active choices and matching partial string queries.
- **Role-Based Access Control (RBAC)**: Supports roles like `superadmin` (platform operator), `org_admin` (cooperative director), `manager` (program lead), `accountant` (financial controller), and `member` (standard beneficiary).
- **State Preservation**: Persists session and organization states securely across browser reloads via a custom client store.

### 2. Community Forums & Interactive Chat
- **Categorized Channels**: Supports dedicated categories such as *General*, *Projects*, *Committees*, *Private groups*, and *Announcements*.
- **Rich Media Sharing**: Supports direct drag-and-drop or manual click file uploads. Uploaded files are categorized dynamically on client-side and server-side pipelines.
- **Voice Messages**: Implements standard audio recording via the HTML5 `MediaRecorder` API. Captures voice clips, saves them as high-quality Ogg/Wav blobs, proxies them to B2 storage, and provides interactive in-chat waveforms and audio players.
- **Real-Time Polling Engine**: Allows admins to create multi-choice polls inside channels. Features real-time responsive progress bars reflecting community votes, toggleable single/multiple response controls, and strict "one member, one vote" DB tracking.

### 3. Interactive Document Center & Office Suite
- **In-App Letter Editor**: Features a rich templates generator with custom templates for cooperative resignations, land-outreach approvals, and financial aid request letters. Includes fields for automatic tenant logo injection, signature lines, and PDF rendering.
- **Document Acknowledgement System**: Admins can upload documents that require strict legal acknowledgement from members by a set deadline. Members are prompted with a dedicated compliance card, and the system logs their formal electronic acknowledgement into the ledger.
- **Office Modal Previewer**: Clicking a document opens a responsive overlay previewing files natively (PDFs via custom iframes, images via lazy-loaded nodes, spreadsheets and documents via customized bento informational panels).

### 4. Dynamic Metrics Tracker & Milestones (D3/SVG)
- **Impact Measurement**: Tracks quantitative social metrics (e.g., "saplings planted", "scholars matched", "liters of milk produced").
- **Visual Performance**: Implements custom D3-inspired SVG data visualizations. Compares actual metrics with targets using responsive gauge charts, multi-gradient progress rings, and trend indicators.

### 5. News & Announcements Board
- **Editorial Hub**: Admins can publish detailed operational bulletins, categorized by *Operational*, *Finance*, *Staff Update*, or *Outreach*.
- **Priority Pinning**: Features a pinned bulletin system that mounts high-priority announcements to the top of the member’s feed. Supports full body HTML rendering, comment counters, and dynamic likes tracking.

### 6. Cooperative Ledger & Financial Bookkeeping
- **Double-Entry Traceability**: Features a ledger capturing all incoming cash flows (member dues, public donations, program grants) and outgoing operational expenses.
- **Currency Exchange Engine**: Integrates an on-the-fly currency conversion tool, translating local Rwandan Francs (RWF) into US Dollars (USD), Euros (EUR), and Kenyan Shillings (KES) using live exchange rate mappings.
- **Grant Pipeline Tracker**: Logs active international donor grant opportunities, tracking application deadlines, funder criteria, program links, and success statuses.

### 7. MoMo Donations Portal & Mobile Money Proxy
- **Local Gateway Simulator**: Integrated custom MTN Mobile Money and Airtel Money gateway screens. Allows international and local donors to support specific community nurseries, computing classes, or livestock pools.
- **Proof-of-Payment Verification**: Donors can upload a screenshot or SMS receipt. The submission is routed to the organization’s accounting queue where accountants can confirm the transaction and automatically log it into the ledger.

### 8. Offboarding & Exit Surveys (Resignations)
- **Empathetic Resignation Pipeline**: Offers a respectful offboarding interface for members exiting the cooperative. Collects structured feedback across standard categories (e.g., relocation, career advancement, health, retirement).
- **Exit Surveys**: Captures open-form detailed insights to help the cooperative identify areas for systemic improvement.
- **Admin Reconciliation Queue**: Automatically notifies managers of pending resignations, allowing them to review surveys, write official response notices, and finalize the offboarding status.

### 9. Cooperative Member Fees & Capital Shares Tracker
- **Dues Calendars**: Generates a dynamic calendar of weekly and monthly membership dues. Tracks paid vs outstanding contributions and keeps records of payment references.
- **Share Capital Ledger**: Essential for Rwandan agricultural cooperatives. Tracks each farmer's share purchase history, calculates total paid-up equity, and lists historical share accumulation transactions.

### 10. Glitch & Incident Reporter (IT Ticketing)
- **Local Hotline**: Connects non-profits directly with platform IT engineers. Allows staff to report software bugs, slow loading times, or login errors.
- **Rich Ticket Details**: Supports screenshot attachment uploads, selectable priority tiers (Low, Normal, High, Critical), status tracking (Open, In Review, Resolved, Won't Fix), and official engineering notes.

---

## 🎨 Aesthetics, Design Philosophy & Visual System

IMPACTO rejects standard "cookie-cutter" templates, choosing instead a premium, highly tailored visual identity that commands credibility and pride for Rwandan community institutions.

### 1. Typography Pairings
To maintain a modern, authoritative layout, the platform loads Google Fonts with strict hierarchy pairings:
- **Display Typography (Headings, Metrics, Modal Titles)**: **Space Grotesk** or **Outfit**. A geometric, tech-forward sans-serif with slight brutalist cuts that lends a sharp, forward-looking aesthetic.
- **Interface Typography (Body, Inputs, Labels, Lists)**: **Inter**. Highly readable, optimized for compact data display, and extremely friendly to varying screen densities.
- **Metadata/Monospace Typography (Transaction Hashes, IDs, Timestamps, Metrics)**: **JetBrains Mono** or **Fira Code**. Clean, non-proportional characters that ensure financial lists and table columns align perfectly.

### 2. Color System
The platform features two global presets alongside a highly responsive per-tenant system:
- **Dynamic Accent Resolution**: Colors are not hardcoded. The application queries the database for the active organization's `primary_color` and `secondary_color` and dynamically updates CSS variables:
  ```css
  :root {
    --org-primary: [dynamic_value_from_db, e.g., #16a34a];
    --org-secondary: [dynamic_value_from_db, e.g., #ca8a04];
  }
  ```
- **The Modern Light Canvas**: Optimized for daylight outdoor operations in rural environments. Avoids pure white, utilizing soft off-whites (`#f8fafc` or `#f1f5f9`) for the main workspace background, paired with deep charcoal grays (`#0f172a`) for crisp typography contrast.
- **The Obsidian Twilight Dark Canvas**: A premium dark theme using ultra-deep slate backdrops (`#020617` or `#0b1329`) paired with subtle glowing indigo, emerald, or amber borders (`#1e293b`). Perfect for laptop or mobile use in low-light environments.

### 3. Spatial Rhythm & Negative Space
- **Intentional Contrast**: The design avoids robotic uniform margins. Cards use generous internal padding (`p-6` or `p-8`) to give data modules breathing room, while tight grids (`gap-3`) are used inside metadata tables to keep information dense and scannable.
- **Touch Targets**: All interactive elements (buttons, inputs, toggle pins, selectors) conform to a **minimum 44px x 44px touch boundary** on mobile viewports to prevent user fatigue.

---

## 📱 Responsive Layout & Media Query Breakdowns

IMPACTO is responsive across a complete range of hardware—from low-cost Android smartphones used by cooperative members in the field, to large dual-monitor setups used by administrators in Kigali.

```
+-----------------------------------------------------------------------------+
|   sm (< 640px)    |   md (768px - 1024px)   |      lg (1024px - 1280px)     |
|                   |                         |                               |
| Single column,    | Dual column bento grid, | Three column full-suite,      |
| Collapsible menu, | Sidebar collapses into  | Persistent Left Sidebar,      |
| Full screen modals| slide drawer panel.     | Central stream, Right panel.  |
+-----------------------------------------------------------------------------+
```

### Breakpoint Specifications:
1. **Handheld Viewport (`sm`: < 640px)**:
   - **Visual Structure**: The Left Sidebar collapses completely into a top header bar featuring a slide-out hamburger drawer. Cards stretch to full screen (`w-full`), and multi-column tables collapse into vertical card lists.
   - **Modals**: Modals transition from centered popups into full-screen viewport overlays, maximizing usable space for typing.
2. **Tablet Viewport (`md`: 640px to 1024px)**:
   - **Visual Structure**: Left Sidebar collapses into a compact icon-only rail (width: 80px). Workspace columns split into dual-column grids.
   - **Chat**: Chat channels list and messages stream are split into a smooth swipable split-pane interface.
3. **Standard Desktop Viewport (`lg`: 1024px to 1280px)**:
   - **Visual Structure**: Left Sidebar is fully expanded (width: 260px) to show names and sub-navigation links. Content operates in a central canvas with standard three-column layouts (e.g., active chat channels on left, message list in middle, selected channel metadata on right).
4. **Bento Grid Viewport (`xl`: > 1280px)**:
   - **Visual Structure**: Dashboard utilizes bento-grid expansions. Financial tables, metrics charts, and operational logs scale side-by-side. Layouts are constrained with `max-w-7xl mx-auto` to prevent wide-screen stretching.

---

## 💾 Backend Storage Proxy Engine (S3/B2 Client)

The storage pipeline handles large files securely. Client-side code is completely decoupled from AWS S3 SDK credentials.

```
[Browser Client]
       |
       | 1. Sends file Base64 string + filename + content-type
       v
[Express API: /api/storage/upload]
       |
       | 2. Checks if B2_KEY_ID exists and is not placeholder
       |---> NO  --> [In-Memory Cache (localFiles Map)]
       |---> YES --> [Instantiates S3Client]
       v
[Backblaze B2 S3 API Engine]
```

### Key Server-Side Files:
- `/server.ts`: The primary Node.js Express server. Exposes:
  - `POST /api/storage/upload`: Accepts base64 encoded strings, converts them into binary Node Buffers, strips standard Data URI prefixes, and uploads them using `PutObjectCommand`.
  - `GET /api/storage/url`: Takes a file key and generates a temporary signed download/view URL with a 1-hour expiration time using `getSignedUrl`.
  - `GET /api/storage/raw`: Act as a fast streaming route to serve locally-cached files when running without credentials.
- `src/lib/b2.ts`: The client instantiator. Utilizes the official `@aws-sdk/client-s3` package. Includes **lazy-loading initialization** to prevent startup crashes when keys are absent.

---

## 🗄️ Relational Database Blueprint & RLS Policies

The database is defined in `/db.sql` under a highly secure, relational schema.

### Core Database Tables:
1. **`users`**: Master account registry. Tied directly to Supabase Authentication (`auth.users`) through automatic synchronization.
2. **`organizations`**: Master tenant table. Holds custom domain slugs, colors, logos, and MoMo credentials.
3. **`org_members`**: Membership mapping that resolves what roles and granular permissions a user has in an organization.
4. **`meetings`**: Logs cooperative assemblies, minute boards, and quorum checks.
5. **`chat_channels` & `chat_messages`**: Power real-time chat, file sharing, and voice note logs.
6. **`documents` & `document_acknowledgements`**: Manage digital compliance, signature campaigns, and in-app letters.
7. **`resignations`**: Offboarding records and exit survey results.

### Row-Level Security (RLS) & Security-Definer Functions:
To prevent tenants from seeing each other's data, RLS is enabled on every table. Supabase policies use high-performance Postgres security functions:

```sql
-- Security Definer helper to check if a user belongs to an organization
CREATE OR REPLACE FUNCTION is_member_of_org(org_id TEXT, user_uid TEXT)
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM org_members 
    WHERE org_members.org_id = is_member_of_org.org_id 
      AND org_members.user_id = is_member_of_org.user_uid 
      AND org_members.status = 'active'
  );
END;
$$ LANGUAGE plpgsql;
```

**Example Policy**:
```sql
CREATE POLICY select_meetings ON meetings 
FOR SELECT USING (is_member_of_org(org_id, auth.uid()::text));
```

---

## 🚀 Configuration & Deployment Guide

To deploy or run IMPACTO locally, configure your system environment variables.

### Environment Setup (`.env`):
Create a `.env` file at the root directory of the project and populate it with your credentials:

```env
# Supabase Database Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anonymous-public-key

# Backblaze B2 S3 Credentials
B2_KEY_ID=your-backblaze-key-id
B2_APPLICATION_KEY=your-backblaze-application-secret-key
B2_ENDPOINT=https://s3.your-region.backblazeb2.com
B2_BUCKET_NAME=your-bucket-name
B2_REGION=us-east-005
```

### Installation & Run Commands:

1. **Install Base Dependencies**:
   ```bash
   npm install
   ```

2. **Run Development Server (Full-Stack)**:
   ```bash
   npm run dev
   ```
   This will boot the Express backend proxy on **port 3000** and mount Vite in middleware mode. Open [http://localhost:3000](http://localhost:3000) to view the live dashboard.

3. **Build for Production**:
   ```bash
   npm run build
   ```
   Compiles client static files into the `dist/` directory and bundles the Express backend server into a single, self-contained CommonJS file (`dist/server.cjs`) for deployment.

4. **Start Production Server**:
   ```bash
   npm run start
   ```

---

#VITE_SUPABASE_URL=https://zctmvqcdwjpsgvjeiwfo.supabase.co
#VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjdG12cWNkd2pwc2d2amVpd2ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNzk4ODAsImV4cCI6MjA5NDY1NTg4MH0.5Hkk2IPUdH24xFfT4jba_LDbFGIhq3GaIi8Q_mPTG3A
#VITE_SUPABASE_PROJECT_ID=zctmvqcdwjpsgvjeiwfo
#VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_iVT6YEuKSKb95kSNsB-Gmg_4Dy9RsoA

#the keys from supabase 2 impactoarena

VITE_SUPABASE_URL=https://jyluwvwghtirdmazhhym.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5bHV3dndnaHRpcmRtYXpoaHltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NjM5MjYsImV4cCI6MjA5NTAzOTkyNn0.KcV_8RXSnoNVObFqgeLm-9r3fBbRf7FSEM6woVjhG3Q
VITE_SUPABASE_PROJECT_ID=jyluwvwghtirdmazhhym
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_DD0srqa9hEsJgnc5TrnGTw_rP_2sUgr



## 🤝 Community & Support

IMPACTO is built with love and commitment to support the digital evolution of cooperatives and community organizations across Rwanda. For additional platform support, please log a ticket in our IT Hotline section or email **support@impacto.rw**.

*Made for Rwanda, by Gaby Prince Kabuye and the IMPACTO Team.*
