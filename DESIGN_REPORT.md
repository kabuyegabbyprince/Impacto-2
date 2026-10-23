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

# TASK: Full-Application UI/UX Audit, Design Cleanup & Implementation

Act as a senior frontend engineer, product designer, UI/UX auditor, accessibility specialist, and design-systems architect.

Your mission is to inspect my **entire existing application**, identify and fix visual inconsistencies, poor layouts, broken interactions, accessibility issues, responsive design failures, and generic AI-generated ("AI slop") design patterns.

Do not limit your work to the page or component currently open. Audit the entire repository, including shared components, layouts, dashboards, navigation, forms, dialogs, settings, authentication pages, empty states, loading states, error states, and mobile interfaces.

## 1. First, understand the existing application

Before making changes:

- Inspect the project structure, framework, routing, styling system, reusable components, and installed dependencies.
- Identify the application's purpose, target users, core workflows, existing design language, and brand identity.
- Find duplicated components, inconsistent styling, conflicting CSS, unnecessary dependencies, and outdated patterns.
- Identify the existing features and business logic that must be preserved.
- Establish a baseline by running the existing application and available checks where possible.

Do not replace the existing architecture simply because you prefer another stack. Work with the current technology unless a change is necessary and justified.

## 2. Perform a comprehensive design audit

Inspect every accessible page and shared component for the following problems.

### A. Layout and spacing
- Crowded headers, toolbars, navigation bars, cards, and action groups.
- Misaligned elements, inconsistent gaps, excessive padding, and uneven margins.
- Buttons and labels that wrap unnecessarily or become too narrow.
- Inconsistent container widths, grid alignment, and content hierarchy.
- Horizontal overflow, clipped content, overlapping elements, and unstable layouts.
- Unnecessary empty space or excessive information density.

### B. Typography and readability
- Inconsistent font sizes, weights, line heights, and text styles.
- Oversized headings, tiny labels, illegible helper text, and poor contrast.
- Unnecessary uppercase text, excessive letter spacing, and inconsistent capitalization.
- Truncated text without a way to access the full content.
- Awkward line breaks and button labels split across multiple lines.

Create a coherent typographic scale and apply it consistently.

### C. Buttons, controls, and interactions
- Inconsistent button heights, border radii, padding, icons, and variants.
- Primary, secondary, destructive, and tertiary actions that look indistinguishable.
- Buttons that look clickable but have no working action.
- Confusing disabled states, missing loading states, and absent feedback after actions.
- Incorrectly combined actions and subscription notices.
- Missing tooltips, confirmation dialogs, validation messages, or keyboard interactions where appropriate.
- Controls that do not communicate their current state.

Use clear labels, consistent component variants, and appropriate interactive states.

### D. AI-generated design patterns ("AI slop")
Identify and remove unnecessary or generic visual patterns, including:

- Excessive rounded cards, pill-shaped buttons, and nested containers.
- Too many gradients, glowing effects, glassmorphism, decorative blobs, and shadows.
- Randomly colored icons, arbitrary accent colors, and inconsistent border radii.
- Excessive emoji, decorative icons, and meaningless visual elements.
- Repeated card grids where a table, list, compact toolbar, or plain text would work better.
- Generic dashboard layouts that do not match the application's actual purpose.
- Unnecessary badges, status chips, dividers, and floating elements.
- Repetitive headings, redundant descriptions, and excessive helper text.
- Fake charts, fabricated statistics, placeholder testimonials, or decorative data presented as real.
- Inconsistent visual styles between pages or components.
- Unnecessary animations and interactions that make the interface feel artificial.

Do not remove a visual element simply because it is fashionable. Evaluate whether it improves clarity, usability, accessibility, or brand identity.

The objective is a polished, intentional, product-specific interface—not a sterile interface with all personality removed.

### E. Responsive design
Test and fix layouts at representative viewport widths, including approximately 320, 375, 768, 1024, and 1440 pixels.

Check:
- Mobile navigation and action menus.
- Toolbar wrapping and button sizing.
- Tables, charts, dialogs, and sidebars.
- Form usability on small screens.
- Content overflow and horizontal scrolling.
- Touch target sizes and spacing.
- Desktop layouts that become unnecessarily stretched or cramped.

Use responsive behavior appropriate to each component instead of applying the same layout everywhere.

### F. Accessibility
- Check text and interactive-element contrast against WCAG 2.2 AA requirements.
- Provide visible keyboard focus states.
- Ensure semantic HTML and accessible names for icon-only buttons.
- Check keyboard navigation, form labels, validation feedback, and dialog behavior.
- Respect reduced-motion preferences.
- Avoid communicating status through color alone.

### G. Functional and application-level issues
- Find broken links, dead buttons, inconsistent navigation, and incorrect active states.
- Check forms, menus, modals, tabs, filters, search controls, and pagination.
- Inspect permission-dependent and subscription-dependent features.
- Ensure loading, empty, success, error, and disabled states are intentional and consistent.
- Check for visual changes that accidentally break authentication, routing, data fetching, or existing workflows.

Do not invent missing functionality or display fake success messages.

## 3. Establish a consistent design system

Create or refine a shared design system using the application's existing styling technology.

Standardize:

- Color tokens and semantic colors.
- Typography scale and font usage.
- Spacing scale.
- Border radii and border colors.
- Shadows and elevation.
- Container widths and responsive breakpoints.
- Button sizes and variants.
- Form controls and validation states.
- Badges and status indicators.
- Cards, tables, dialogs, dropdowns, tooltips, and navigation.
- Loading, empty, error, success, and disabled states.

Prefer existing design-system components and tokens where practical. Consolidate duplicated styles and replace arbitrary one-off values when a shared token is appropriate.

Do not introduce a new UI framework or large dependency solely to solve styling inconsistencies.

## 4. Apply these design principles

For each component, ask:

1. What is the user's main goal here?
2. What deserves the most visual attention?
3. Which elements are actions, and which are informational statuses?
4. Can any element be removed without reducing functionality?
5. Is the interface understandable without unnecessary decoration?
6. Does the component remain usable at narrow widths?
7. Does it match the design language used elsewhere?
8. Does it provide clear feedback for every supported interaction?

Use a clear visual hierarchy, restrained colors, purposeful whitespace, readable typography, consistent controls, and meaningful visual feedback.

Avoid making every element equally prominent. Primary actions should stand out; secondary actions should remain accessible without competing for attention.

## 5. Example of the required quality

If you discover a channel toolbar containing:

- A cramped channel name.
- A meeting button with text wrapped over three lines.
- A poll button mixed with an upgrade notice.
- An "Active Feed" status styled like an ordinary button.
- Tiny, inconsistent icons and excessive visual noise.

Do not merely describe the problem. Refactor the implementation so that:

- The channel identity is clearly separated from the actions.
- The meeting action has adequate width and a readable label.
- The poll action and its subscription restriction are communicated separately.
- The feed status uses an appropriate status indicator.
- Spacing, typography, colors, and button variants follow the shared design system.
- The layout wraps or reorganizes naturally on mobile.
- Existing functionality and permission rules continue working.

Apply the same level of reasoning to comparable problems throughout the application.

## 6. Implementation rules

- Make real code changes; do not stop after generating an audit report.
- Prioritize shared components because one correct fix can improve many screens.
- Fix root causes rather than hiding symptoms with random CSS overrides.
- Reuse existing components and styling conventions where possible.
- Avoid unnecessary rewrites, speculative abstractions, and duplicated CSS.
- Preserve existing routes, data models, API contracts, authentication, permissions, and business logic.
- Do not remove working features to simplify the UI.
- Do not fabricate data or replace functional integrations with mock content.
- Do not modify secrets, environment variables, production data, or deployment configuration unless explicitly necessary and authorized.
- Avoid destructive commands and unrelated changes.
- If a substantial architectural change is unavoidable, explain why before proceeding.

## 7. Verification and quality assurance

After implementation:

- Run the project's existing lint, type-check, build, and test commands where available.
- Fix errors introduced by your changes.
- Inspect the modified screens visually when browser or screenshot tooling is available.
- Test the relevant interactions and responsive layouts.
- Check for console errors, missing assets, broken routes, overflow, and inconsistent styling.
- If automated browser testing is available, use it to exercise representative user flows.
- Do not claim a screen or interaction was tested unless you actually tested it.
- Clearly identify any checks that could not be completed.

## 8. Work in prioritized stages

**Stage 1 — Audit:** Inspect the repository and identify the most important issues.

**Stage 2 — Foundations:** Fix shared tokens, layout primitives, and reusable components.

**Stage 3 — Application-wide fixes:** Refactor affected pages and component instances.

**Stage 4 — Responsive and accessibility fixes:** Test and improve different screen sizes and interaction states.

**Stage 5 — Verification:** Run checks, review changes, and fix regressions.

Continue through all stages without stopping after the audit, unless blocked by missing access, essential information, or a consequential decision requiring my approval.

Prioritize:
1. Broken functionality and severe layout failures.
2. Shared component and design-system inconsistencies.
3. Responsive and accessibility defects.
4. Visual hierarchy and readability.
5. Minor polish and removal of unnecessary decoration.

## 9. Final report

When finished, provide a concise report containing:

- Major problems discovered.
- Files and shared components changed.
- Important UI/UX improvements implemented.
- AI-slop patterns removed or corrected.
- Responsive and accessibility improvements.
- Tests, builds, and interactions actually verified.
- Remaining issues, limitations, or work requiring my decision.

Start by examining the entire project, then implement and verify the fixes. The final result must feel like a coherent, professionally designed product—not a collection of independently generated screens.

