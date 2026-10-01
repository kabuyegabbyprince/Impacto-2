# IMPACTO — Application Design Report & Subscription Expiration Technical Specification

---

## 🏛️ Executive Summary & Design Philosophy

**IMPACTO** is built from the ground up as a purpose-built, high-density operating system designed specifically for agricultural cooperatives, community associations, savings groups (Ibimina), and non-governmental organizations in Rwanda and East Africa.

The platform embraces a core philosophy: **Operational Clarity, Zero Clutter, Zero Data Loss, and Telecom-Native Simplicity**. Rather than generic SaaS patterns or cluttered analytics widgets, every interface element directly serves practical operational workflows—collecting member dues, verifying Mobile Money receipts, certifying democratic assemblies, issuing cryptographically signed resolutions, and managing tiered workspace access.

---

## 🎨 1. Application Theme & Visual Design System

### 1.1 Brand Color Palette & Semantic System
IMPACTO employs a clean, authoritative color palette rooted in agricultural prosperity, trust, and Rwandan national vibrancy:

| Color Token | Hex / Value | Semantic Role & UI Application |
|---|---|---|
| **Impacto Emerald** (`--brand-primary`) | `#15803D` / `#16A34A` | Primary actions, verified badges, active state indicators, primary CTA buttons |
| **Deep Forest Green** (`--brand-dark`) | `#14532D` | High-contrast headings, active navigation pills, brand identity marks |
| **Soft Mint** (`--brand-light`) | `#DCFCE7` | Background highlight badges, approved payment pill tags, subtle card tints |
| **Rwandan Amber** (`--brand-amber`) | `#F59E0B` | Trial countdown warnings, grace period alerts, pending review queue badges |
| **Rose / Crimson** (`--danger`) | `#DC2626` | Quota exceeded alerts, expired subscription lockouts, rejected transaction indicators |
| **Indigo / Blue** (`--info`) | `#1D4ED8` | Starter tier badges, general informational notices, verified member identifiers |
| **Purple / Violet** | `#9333EA` | Modular Add-on Feature Packages, modular tool capability unlocks |
| **Neutral Slate** (`--bg-primary`, etc.) | `#F8FAFC` to `#0F172A` | Background layers, card containers, subtle divider borders, typography hierarchy |

### 1.2 Multi-Tenant Dynamic Branding Engine
Every cooperative workspace retains its own distinct identity through dynamic CSS variable injection:
- `--org-primary`: Dynamically set to the cooperative's custom brand color (e.g. coffee green, tea emerald, dairy blue).
- `--org-primary-l`: Light translucent shade for hover states and subtle container fills.
- `--org-secondary`: Secondary accent color for announcements and category tags.
- Custom workspace logo, tagline, banner, and public profile slug (`/@slug`).

### 1.3 Typography Hierarchy
The typography system balances legibility, modern SaaS aesthetics, and numerical precision:
- **Display Headings (`font-display`)**: `Plus Jakarta Sans` — bold, geometric letterforms providing clear hierarchical structure for section headers, modals, and KPI numbers.
- **UI & Body Text (`font-sans`)**: `DM Sans` / `Inter` — optimized for high readability across dense tables, member lists, forms, and multilingual copy (English, French, Kinyarwanda).
- **Financial & Code Blocks (`font-mono`)**: `JetBrains Mono` — fixed-width precision for Mobile Money USSD strings (`*182*8*1*880099#`), cryptographic hashes (`SIG-VERIFIED-4a9f`), and local currency amounts (`RWF`).

### 1.4 Glassmorphism & Safe Peek Dock
When an organization reaches its quota or enters a trial expiration review, the interface does not present a blank dead-end. Instead, it utilizes an advanced **Glassmorphic Peek Mode**:
- **Transparency Modes**: Crystal (`backdrop-blur-md`), Frosted (`backdrop-blur-lg`), or Opaque (`backdrop-blur-xl`).
- **Underlying Data Visibility**: Administrators can see their existing member roster, ledgers, and documents in the background without data erasure.
- **Settlement Dock Bar**: Fixed bottom bar auto-generating dialable USSD codes (`*182*8*1*code#`) with one-click copy and handset trigger buttons.

### 1.5 Mobile Virtual Keyboard Adaptive Viewport
On mobile handsets (Android Chrome & iOS Safari), virtual keyboards frequently float over inputs and disrupt forms. IMPACTO solves this with a multi-layered viewport resilience system:
1. **Interactive Widget Viewport**: `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content" />` instructs the browser engine to resize content instead of overlaying.
2. **Auto Scroll-Into-View on Focus**: Global event listener scrolls any focused `<input>`, `<textarea>`, or `<select>` smoothly into the center of the visible visual viewport.
3. **Viewport Resize Listener**: Reacts to `window.visualViewport.resize` events in real-time when the virtual keyboard expands or collapses.
4. **iOS Form Zoom Prevention**: Forces `font-size: 16px !important` on mobile form controls so iOS Safari never automatically zooms in on focus.
5. **Safe-Area Inset Handling**: Modal containers feature `padding-bottom: max(2rem, env(safe-area-inset-bottom))` and `overscroll-behavior-y: contain` so users can scroll completely past the keyboard to the submit buttons.

---

## 📊 2. Design Used in Reports & Official Documents

IMPACTO incorporates specialized document and report designs suitable for government audits (Rwanda Governance Board, RCA), general assembly presentations, and financial reconciliation:

### 2.1 Executive Assembly Resolutions & Meeting Summaries
- **Format**: High-contrast structured dossiers with official cooperative letterhead, session metadata (quorum status, date, venue, chairperson), and bulleted executive motions.
- **Export Capabilities**: Instant print styling, clean PDF formatting, and digital copy generation.

### 2.2 Organization Payment Ledger & MoMo Audit Logs
- **Format**: Clean data grid with real-time status badges (`APPROVED`, `AWAITING REVIEW`, `REJECTED`), Mobile Money sender telephone numbers, transaction reference codes, and amounts formatted in local currency (`RWF`) with USD exchange equivalents.
- **Evidence Vault**: One-click modal displaying the exact MoMo SMS copy, payer name, timestamp, and verified auditor credentials.

### 2.3 QR Attendance Rosters & Roll Call Stamps
- **Format**: Contactless roll call logs with attendee member numbers, role badges (Board Member, Treasurer, Member), check-in timestamps, and presence verification indicators.
- **Regulatory Ready**: Ready for one-click Excel (`.xlsx` / `.csv`) export with full quorum calculations.

### 2.4 Cryptographic Document Signing Registry
- **Format**: Verifiable certificate templates with 3-circle brand watermark, official issue date, authorized signatory credentials, and embedded SHA-256 validation hashes (`SIG-VERIFIED`).

---

## ⏱️ 3. How Package & Subscription Expiration is Tracked & Enforced

The subscription and modular add-on package lifecycle is managed by an authoritative evaluation engine in `src/lib/subscriptionMatrix.ts` combined with realtime cross-tab synchronization and database persistence.

```
       +-------------------------------------------------------------+
       |             Workspace Subscription Lifecycle                |
       +-------------------------------------------------------------+
                                      |
         +----------------------------+----------------------------+
         |                                                         |
         v                                                         v
+-------------------+                                     +-------------------+
|  Base Tier Plan   |                                     |  Add-On Packages  |
|  (Free, Starter,  |                                     | (Event QR, Finance|
|  Growth, Pro, VIP)|                                     |  Doc Verification)|
+---------+---------+                                     +---------+---------+
          |                                                         |
          v                                                         v
  [30-Day Window]                                           [30-Day Rolling]
  now < ends_at                                             now < expires_at
          |                                                         |
     (Is Expired?)                                             (Is Expired?)
      /          \                                              /          \
    YES           NO                                          YES           NO
    /              \                                          /              \
+----------+   +----------+                              +----------+   +----------+
| 3-Day    |   | Active   |                              | Package  |   | Package  |
| Grace    |   | Access   |                              | Expired  |   | Active   |
+----+-----+   +----------+                              +----+-----+   +----------+
     |                                                        |
(Grace Expired?)                                              v
  /      \                                            - Remove bonus +20 slots
YES       NO                                          - Gate specific features
 /         \                                          - Display renewal prompt
v           v                                         - Fallback to base tier
Safe Mode   Grace Period
Read-Only   Active
```

### 3.1 Base Workspace Tier Lifecycle
When a workspace is created or upgraded, its validity is governed by `subscription_ends_at` (or `trial_ends_at`):

1. **Active Phase (`now < subscription_ends_at`)**:
   - Organization enjoys complete access to all plan features, full member capacity (e.g. 500 members on Growth, unlimited on Pro), and full file storage quotas.
   - Status badge displays **ACTIVE** or **TRIAL** with exact days remaining.

2. **3-Day Grace Period Window (`subscription_ends_at < now < grace_period_ends_at`)**:
   - Activated automatically when a paid subscription or 30-day trial reaches day 0.
   - Grants the cooperative a 72-hour grace period to reconcile Mobile Money transfers without interrupting field operations.
   - Prominent amber banner warns administrators to submit payment proof.

3. **Safe Read-Only Mode (Quota Lockdown / Data Preservation)**:
   - When the trial/grace period expires or a Free Forever plan exceeds its 30-member / 100MB limit, **NO DATA IS EVER DELETED**.
   - The workspace transitions into **Safe Read-Only Mode**:
     - All historical records, member directories, documents, and chat histories remain fully readable and downloadable.
     - New write mutations (adding members, creating meetings, sending chat broadcasts) are politely disabled with an upgrade prompt.
     - Unauthenticated visitors or public portal lookups remain operational.

4. **Free Forever Tier**:
   - `subscription_ends_at = null` (no expiration date).
   - Allows up to 30 active members and 100 MB file storage indefinitely.

---

### 3.2 Modular Add-On Package Expiration Engine
Organizations on Free or Starter plans can purchase individual $4/mo (5,000 RWF) modular feature packages (e.g. `event_pack`, `finance_pack`, `document_pack`, `asset_pack`).

#### How Package Expiration is Stored:
Each package purchase writes a timestamped record to the organization's `packages_data` dictionary:
```json
{
  "active_packages": ["event_pack", "finance_pack"],
  "packages_data": {
    "event_pack": {
      "purchased_at": "2026-10-01T08:00:00.000Z",
      "expires_at": "2026-10-31T08:00:00.000Z"
    },
    "finance_pack": {
      "purchased_at": "2026-10-01T08:00:00.000Z",
      "expires_at": "2026-10-31T08:00:00.000Z"
    }
  }
}
```

#### Expiration Verification Algorithm (`subscriptionMatrix.ts`):
1. `getOrgActivePackages(org)` queries the packages assigned to the organization.
2. For each package ID, it parses `packages_data[pkgId].expires_at`.
3. If `Date.now() > new Date(expires_at).getTime()`, the package is **instantly filtered out** as expired.
4. `getPackageExpirationStatus(org, pkgId)` computes:
   - `isPurchased`: Whether the package was ever acquired.
   - `isActive`: True only if purchased and `Date.now() <= expires_at`.
   - `isExpired`: True if the current time has passed the expiration date.
   - `daysRemaining`: `Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60 * 24))`.
5. **Enforcement**:
   - Feature access checks via `canAccessFeature(org, featureKey)` immediately block access to gated tools once expired.
   - Bonus member slots (+20 members per active package) are subtracted from the total member quota.
   - The UI automatically renders an **Expired — Renew Package ($4)** button in the settings and feature gates.

---

### 3.3 Universal Cross-Tab & Server Synchronization
- **Instant Client Broadcast**: Changes made by Super Admins (approving payments, extending licenses, updating exchange rates) broadcast across all browser tabs via `BroadcastChannel` and `StorageEvent` listeners.
- **Server-Authoritative Ledger**: Payment submissions from accountants and administrators post directly to the server ledger (`/api/payments/subscription-payments`), persisting the transaction across sessions and making it immediately visible in the Super Admin MoMo review queue.
- **Global Billing Sync**: Exchange rates and collection merchant codes configured in the Super Admin console are saved to `/api/platform-settings`, immediately updating the currency store and payment components across all tenant workspaces.

---

*Authored by IMPACTO Systems Engineering.*
