/**
 * IMPACTO V2 — Subscription Tiers, Add-On Packages & Trial Lifecycle Matrix
 * Single source of truth for platform pricing, member quotas, storage limits, add-on packages, and trial lifecycle.
 */

import { Organization } from "../types";

export type SubscriptionTier = "free" | "starter" | "growth" | "pro" | "enterprise";

export type AddOnPackageId = "event_pack" | "finance_pack" | "document_pack" | "pro_pack";

export interface TierDefinition {
  id: SubscriptionTier;
  name: string;
  priceUsd: number;
  priceRwfApprox: number;
  memberLimit: number; // 30, 100, 500, Infinity
  storageLimitMB: number; // 100, 1000, 5000, Infinity
  storageLimitBytes: number;
  badgeColor: "gray" | "blue" | "emerald" | "purple";
  tagline: string;
  coreFeatures: string[];
  description: string;
}

export interface AddOnPackageDefinition {
  id: AddOnPackageId;
  name: string;
  priceUsd: number;
  priceRwfApprox: number;
  bonusMembers: number; // +20 members
  badgeColor: "emerald" | "amber" | "blue" | "purple";
  tagline: string;
  features: string[];
  description: string;
  onExpiryNote: string;
  gatedFeatureKeys: string[];
}

export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, TierDefinition> = {
  free: {
    id: "free",
    name: "Free Plan",
    priceUsd: 0,
    priceRwfApprox: 0,
    memberLimit: 30,
    storageLimitMB: 100,
    storageLimitBytes: 100 * 1024 * 1024, // 100 MB
    badgeColor: "gray",
    tagline: "Essential grassroots community coordination (Free Mode)",
    coreFeatures: [
      "Member Directory & Roles (up to 30 active members)",
      "Announcements News Feed & Broadcasts",
      "Standard Community Chat Channels",
      "Strategic Goals Tracker (View Only)",
      "Event Listings & Basic RSVPs",
      "Member Dues & Custom Charges",
      "Payment Proof Uploads (MoMo & Bank receipts)",
      "Safe Read-Only Data Preservation (Zero deletion on excess)"
    ],
    description: "Default free plan mode for organizations after trial finishes or for grassroots community groups."
  },
  starter: {
    id: "starter",
    name: "Starter Plan",
    priceUsd: 10,
    priceRwfApprox: 13500,
    memberLimit: 100,
    storageLimitMB: 1000, // 1 GB
    storageLimitBytes: 1000 * 1024 * 1024,
    badgeColor: "blue",
    tagline: "Expanded member capacity for growing local cooperatives",
    coreFeatures: [
      "Up to 100 active members",
      "1 GB secure cloud storage",
      "All Free Forever features with expanded capacity",
      "Strategic Goals Tracker (Full Create & Edit)",
      "Eligible for $4/mo Add-On Feature Packages (+20 members each)",
      "Safe Read-Only Data Preservation (Zero deletion)"
    ],
    description: "Tailored for small cooperatives reaching 100 members with modest storage needs."
  },
  growth: {
    id: "growth",
    name: "Growth Plan",
    priceUsd: 10,
    priceRwfApprox: 13500,
    memberLimit: 500,
    storageLimitMB: 5000, // 5 GB
    storageLimitBytes: 5000 * 1024 * 1024,
    badgeColor: "emerald",
    tagline: "Expanded operational power for established cooperatives",
    coreFeatures: [
      "Up to 500 active members",
      "5 GB high-speed cloud storage",
      "Event Attendance & Check-in",
      "Excel Attendance & Dues Data Export",
      "Meeting Minutes Recorder & Action Items",
      "Interactive Polls in Chat Channels",
      "Basic Double-Entry Financial Accounting Ledger",
      "DocumentOffice Suite (Word Letterhead & Spreadsheets)",
      "Security & System Audit Logs (Real-time tracking of record creates, edits & deletions)"
    ],
    description: "Full suite for expanding cooperatives, agricultural unions, and active NGOs."
  },
  pro: {
    id: "pro",
    name: "Pro Plan (Default 30-Day Free Trial)",
    priceUsd: 25,
    priceRwfApprox: 33750,
    memberLimit: Infinity,
    storageLimitMB: Infinity,
    storageLimitBytes: Infinity,
    badgeColor: "purple",
    tagline: "Unlimited scale, automated finance, marketplace & encryption",
    coreFeatures: [
      "Unlimited active members (30-Day Free Trial upon sign-up)",
      "Unlimited cloud storage for files, media & receipts",
      "Automated Certificate Generation & Public Verification",
      "Asset & Equipment Inventory Tracker",
      "Strategic Goals Tracker & Periodic Milestone Tasks",
      "Advanced Financial Ledger Reports & Charts",
      "Mobile Money Live Gateway (MTN & Airtel MoMo)",
      "Public Cooperative Marketplace & Storefront",
      "Full Security & System Audit Trail Dossiers (CSV & JSON export, multi-tenant compliance)",
      "End-to-End Encryption & Advanced Security"
    ],
    description: "Enterprise-grade operational velocity for large federations, unions, and institutions."
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise Plan",
    priceUsd: 80,
    priceRwfApprox: 108000,
    memberLimit: Infinity,
    storageLimitMB: Infinity,
    storageLimitBytes: Infinity,
    badgeColor: "purple",
    tagline: "Unlimited scale, automated finance, marketplace & encryption",
    coreFeatures: [
      "Unlimited active members (No cap)",
      "Unlimited cloud storage for files, media & receipts",
      "Automated Certificate Generation & Public Verification",
      "Asset & Equipment Inventory Tracker",
      "Advanced Financial Ledger Reports & Charts",
      "Mobile Money Live Gateway (MTN & Airtel MoMo)",
      "Public Cooperative Marketplace & Storefront",
      "Governance Quorum Meetings Validation & Audit Tracker",
      "Identity Document Verification Hub",
      "Annual Report PDF Compiler & Audit Tools",
      "End-to-End Encryption & Advanced Security"
    ],
    description: "Enterprise grade governance and unlimited capacity for large federations."
  }
};

/**
 * Safely resolves a TierDefinition with guaranteed fallbacks to prevent undefined access errors.
 */
export function getTierDefinition(tier?: string | null): TierDefinition {
  if (!tier) return SUBSCRIPTION_TIERS.free;
  const normalized = String(tier).trim().toLowerCase();
  if (normalized.includes("enterprise")) return SUBSCRIPTION_TIERS.enterprise || SUBSCRIPTION_TIERS.pro;
  if (normalized.includes("pro") || normalized.includes("vip")) return SUBSCRIPTION_TIERS.pro;
  if (normalized.includes("growth")) return SUBSCRIPTION_TIERS.growth;
  if (normalized.includes("starter")) return SUBSCRIPTION_TIERS.starter;
  if (normalized.includes("free")) return SUBSCRIPTION_TIERS.free;
  return SUBSCRIPTION_TIERS[normalized as SubscriptionTier] || SUBSCRIPTION_TIERS.free;
}

export const ADDON_PACKAGES: Record<AddOnPackageId, AddOnPackageDefinition> = {
  event_pack: {
    id: "event_pack",
    name: "Event Pack",
    priceUsd: 4,
    priceRwfApprox: 5400,
    bonusMembers: 20,
    badgeColor: "emerald",
    tagline: "Run proper events with attendee check-in, Excel exports & minutes",
    features: [
      "Event attendance tracking & check-in",
      "Excel attendance & attendee exports",
      "Meeting minutes recorder & action items",
      "+20 bonus active member slots"
    ],
    description: "Run organized events with proof-of-attendance, attendee check-in, Excel data exports, and official meeting minutes.",
    onExpiryNote: "When package expires: Attendance recording, exports, and minutes enter read-only mode. Event listings & RSVPs remain active.",
    gatedFeatureKeys: ["qr_attendance", "excel_export", "meeting_minutes"]
  },
  finance_pack: {
    id: "finance_pack",
    name: "Finance & Ledger Pack",
    priceUsd: 4,
    priceRwfApprox: 5400,
    bonusMembers: 20,
    badgeColor: "amber",
    tagline: "Double-entry ledger & category expense reconciliation",
    features: [
      "Double-entry financial ledger",
      "Category expense tracking & balance sheet",
      "Cash & bank balance reconciliation",
      "+20 bonus active member slots"
    ],
    description: "Track cooperative cash flow, log project expenses, and maintain double-entry journals beyond basic member dues.",
    onExpiryNote: "When package expires: Ledger entries enter read-only mode. Member dues logging and payment proofs remain active.",
    gatedFeatureKeys: ["financial_ledger"]
  },
  document_pack: {
    id: "document_pack",
    name: "Document & Collaboration Pack",
    priceUsd: 4,
    priceRwfApprox: 5400,
    bonusMembers: 20,
    badgeColor: "blue",
    tagline: "DocumentOffice suite & interactive polls in chat",
    features: [
      "DocumentOffice suite (Docs & Sheets)",
      "Interactive voting polls in chat channels",
      "Strategic goals tracker (Full edit & milestones)",
      "+20 bonus active member slots"
    ],
    description: "Draft official letters & spreadsheets with DocumentOffice suite and run democratic voting polls in chat channels.",
    onExpiryNote: "When package expires: Documents & polls enter read-only mode. Standard chat and announcements stay active.",
    gatedFeatureKeys: ["document_office", "chat_polls"]
  },
  pro_pack: {
    id: "pro_pack",
    name: "Pro Feature Pack",
    priceUsd: 4,
    priceRwfApprox: 5400,
    bonusMembers: 20,
    badgeColor: "purple",
    tagline: "Automated certificates, asset tracker & advanced reports",
    features: [
      "Automated certificate generation & badges",
      "Asset & equipment inventory tracker",
      "Advanced ledger analytics & reports",
      "+20 bonus active member slots"
    ],
    description: "Access high-value Pro tools without a full tier upgrade: automated certificates, asset tracker, and advanced reports.",
    onExpiryNote: "When package expires: Certificates, assets, and reports enter read-only mode safely without data loss.",
    gatedFeatureKeys: ["automated_certificates", "asset_tracker", "advanced_ledger_reports"]
  }
};

export const TRIAL_DURATION_DAYS = 30;
export const GRACE_PERIOD_DAYS = 3;
export const TOTAL_TRIAL_WINDOW_DAYS = TRIAL_DURATION_DAYS + GRACE_PERIOD_DAYS; // 33 days

export interface OrgLifecycleStatus {
  tier: SubscriptionTier;
  effectiveTier: SubscriptionTier;
  tierDef: TierDefinition;
  isTrial: boolean;
  isInGracePeriod: boolean;
  isTrialExpired: boolean;
  isSubscriptionExpired: boolean;
  isFreeForever: boolean;
  isPaidActive: boolean;
  
  // Timing
  daysSinceCreation: number;
  trialDaysRemaining: number;
  graceDaysRemaining: number;
  subscriptionDaysRemaining: number;
  daysRemaining: number;
  subscriptionEndsAt?: string | null;
  
  // Packages
  activePackages: AddOnPackageId[];
  bonusMemberSlots: number; // packages * 20
  
  // Quotas
  baseMemberLimit: number;
  memberLimit: number; // base + bonusMemberSlots
  storageLimitMB: number;
  storageLimitBytes: number;
  storageLimit: string;
  activeMemberCount: number;
  storageBytesUsed: number;
  
  // Limits
  isMemberLimitExceeded: boolean;
  excessMembers: number;
  isStorageLimitExceeded: boolean;
  isReadOnlyMode: boolean; // Safe mode when Free plan exceeds quotas
  isReadOnlySafeMode: boolean; // Alias for isReadOnlyMode
  isLocked: boolean; // True if subscription or trial has fully expired
  isExpired: boolean; // True if subscription or trial has expired
  isGracePeriod: boolean; // Alias for isInGracePeriod
  
  // UI Display helpers
  statusLabel: string;
  badgeColor: "emerald" | "amber" | "blue" | "purple" | "rose" | "gray";
  headlineWarning?: string;
}

/**
 * Retrieves list of active add-on package IDs for an organization
 * Filters out any expired packages whose 30-day window has elapsed
 */
export function getOrgActivePackages(org: Partial<Organization> | undefined | null): AddOnPackageId[] {
  if (!org) return [];
  
  // Check packages stored in local persistence or on org record
  let packages: string[] = org.active_packages || [];
  try {
    const saved = localStorage.getItem(`impacto_org_packages_${org.id}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        packages = Array.from(new Set([...packages, ...parsed]));
      }
    }
  } catch {}

  // Filter out any packages whose expiration date in packages_data has passed
  const now = Date.now();
  const packagesData = (org as any)?.packages_data || {};
  packages = packages.filter((pkgId) => {
    const pData = packagesData[pkgId];
    if (pData && pData.expires_at) {
      const expiresAt = new Date(pData.expires_at).getTime();
      if (!isNaN(expiresAt) && now > expiresAt) {
        return false; // Package has expired
      }
    }
    return true;
  });

  const validIds: AddOnPackageId[] = ["event_pack", "finance_pack", "document_pack", "pro_pack"];
  return packages.filter((p): p is AddOnPackageId => validIds.includes(p as AddOnPackageId));
}

/**
 * Checks detailed expiration status for a specific add-on package
 */
export function getPackageExpirationStatus(
  org: Partial<Organization> | undefined | null,
  pkgId: AddOnPackageId
): {
  isPurchased: boolean;
  isActive: boolean;
  isExpired: boolean;
  expiresAt: string | null;
  daysRemaining: number;
} {
  if (!org) {
    return { isPurchased: false, isActive: false, isExpired: false, expiresAt: null, daysRemaining: 0 };
  }

  const activePkgs = getOrgActivePackages(org);
  const isActive = activePkgs.includes(pkgId);
  const packagesData = (org as any)?.packages_data || {};
  const pData = packagesData[pkgId];
  const expiresAt = pData?.expires_at || null;

  if (expiresAt) {
    const expTime = new Date(expiresAt).getTime();
    const now = Date.now();
    const diffMs = expTime - now;
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const isExpired = now > expTime;

    return {
      isPurchased: true,
      isActive: isActive && !isExpired,
      isExpired,
      expiresAt,
      daysRemaining,
    };
  }

  return {
    isPurchased: isActive,
    isActive,
    isExpired: false,
    expiresAt: null,
    daysRemaining: isActive ? 30 : 0,
  };
}

/**
 * Computes exact subscription lifecycle status for an organization
 */
export function getOrgSubscriptionLifecycle(
  org: Partial<Organization> | undefined | null,
  activeMemberCount: number = 0,
  storageBytesUsed: number = 0
): OrgLifecycleStatus {
  const now = Date.now();
  if (!org) {
    const defaultDef = SUBSCRIPTION_TIERS.pro;
    return {
      tier: "pro",
      effectiveTier: "pro",
      tierDef: defaultDef,
      isTrial: true,
      isInGracePeriod: false,
      isTrialExpired: false,
      isSubscriptionExpired: false,
      isFreeForever: false,
      isPaidActive: false,
      daysSinceCreation: 0,
      trialDaysRemaining: 30,
      graceDaysRemaining: 3,
      subscriptionDaysRemaining: 30,
      daysRemaining: 30,
      subscriptionEndsAt: null,
      activePackages: [],
      bonusMemberSlots: 0,
      baseMemberLimit: Infinity,
      memberLimit: Infinity,
      storageLimitMB: Infinity,
      storageLimitBytes: Infinity,
      storageLimit: "Unlimited",
      activeMemberCount,
      storageBytesUsed,
      isMemberLimitExceeded: false,
      excessMembers: 0,
      isStorageLimitExceeded: false,
      isReadOnlyMode: false,
      isReadOnlySafeMode: false,
      isLocked: false,
      isExpired: false,
      isGracePeriod: false,
      statusLabel: "Pro Plan (30-Day Free Trial)",
      badgeColor: "purple"
    };
  }

  // Normalize tier name
  let rawTier: SubscriptionTier = "free";
  const tierStr = (org.subscription_tier || (org as any).subscription_plan || "").toLowerCase();
  if (tierStr.includes("enterprise") || tierStr.includes("pro") || tierStr.includes("vip")) rawTier = "pro";
  else if (tierStr.includes("growth")) rawTier = "growth";
  else if (tierStr.includes("trial") || org.subscription_status === "trial") rawTier = "pro"; // Organization sign-up free trial is Pro Plan!
  else if (tierStr.includes("starter")) rawTier = "starter";
  else if (tierStr.includes("free")) rawTier = "free";
  else rawTier = org.subscription_status === "active" ? "pro" : "free";

  const createdTime = org.created_at ? new Date(org.created_at).getTime() : now;
  const elapsedMs = Math.max(0, now - createdTime);
  const daysSinceCreation = Math.floor(elapsedMs / (1000 * 3600 * 24));

  const trialMs = TRIAL_DURATION_DAYS * 24 * 3600 * 1000;
  const graceMs = GRACE_PERIOD_DAYS * 24 * 3600 * 1000;
  const totalTrialMs = trialMs + graceMs;

  const isExplicitActive = org.subscription_status === "active" && !org.subscription_tier?.includes("trial");
  const isExplicitExpired = org.subscription_status === "expired";
  const hasPaidEndDate = !!org.subscription_ends_at && new Date(org.subscription_ends_at).getTime() > now;

  let isTrial = false;
  let isInGracePeriod = false;
  let isTrialExpired = false;
  let isSubscriptionExpired = false;
  let trialDaysRemaining = 0;
  let graceDaysRemaining = 0;
  let subscriptionDaysRemaining = 0;

  if (rawTier === "free") {
    // Free plan is static and permanent
    subscriptionDaysRemaining = Infinity;
  } else if (hasPaidEndDate || isExplicitActive) {
    const endsTime = org.subscription_ends_at ? new Date(org.subscription_ends_at).getTime() : now + 30 * 24 * 3600 * 1000;
    if (endsTime > now) {
      subscriptionDaysRemaining = Math.max(0, Math.ceil((endsTime - now) / (1000 * 3600 * 24)));
    } else if (endsTime + graceMs > now) {
      isInGracePeriod = true;
      graceDaysRemaining = Math.max(0, Math.ceil(((endsTime + graceMs) - now) / (1000 * 3600 * 24)));
    } else {
      isSubscriptionExpired = true;
    }
  } else {
    // 30-Day Pro Free Trial
    if (elapsedMs < trialMs) {
      isTrial = true;
      trialDaysRemaining = Math.max(0, Math.ceil((trialMs - elapsedMs) / (1000 * 3600 * 24)));
    } else if (elapsedMs < totalTrialMs) {
      isInGracePeriod = true;
      graceDaysRemaining = Math.max(0, Math.ceil((totalTrialMs - elapsedMs) / (1000 * 3600 * 24)));
    } else {
      // 30 days trial finished -> sent directly to Free Plan
      isTrialExpired = true;
    }
  }

  // Effective tier deduction
  // When the 30-day trial expires, organizations are sent directly to Free Plan (NOT starter plan)!
  let effectiveTier: SubscriptionTier = "free";
  if (rawTier === "free") {
    effectiveTier = "free";
  } else if (hasPaidEndDate || (isExplicitActive && !isTrialExpired && !isSubscriptionExpired)) {
    effectiveTier = rawTier;
  } else if (isTrial || isInGracePeriod) {
    effectiveTier = "pro"; // 30-Day Free Trial is Pro Plan
  } else if (isTrialExpired || isSubscriptionExpired) {
    // FINISHED 30-DAY TRIAL -> SENT TO FREE PLAN
    effectiveTier = "free";
  } else {
    effectiveTier = "free";
  }

  // Active add-on packages
  const activePackages = getOrgActivePackages(org);
  const bonusMemberSlots = activePackages.length * 20;

  const tierDef = getTierDefinition(effectiveTier);
  const baseMemberLimit = tierDef.memberLimit;
  const memberLimit = baseMemberLimit === Infinity ? Infinity : baseMemberLimit + bonusMemberSlots;
  const storageLimitMB = tierDef.storageLimitMB;
  const storageLimitBytes = tierDef.storageLimitBytes;

  const excessMembers = memberLimit === Infinity ? 0 : Math.max(0, activeMemberCount - memberLimit);
  const isMemberLimitExceeded = excessMembers > 0;
  const isStorageLimitExceeded = storageLimitBytes === Infinity ? false : storageBytesUsed > storageLimitBytes;

  // Read-only lockdown rule:
  // "If member count or storage exceeds limits, excess records enter read-only mode safely without data deletion."
  const isReadOnlyMode = effectiveTier === "free" && (isMemberLimitExceeded || isStorageLimitExceeded);

  let statusLabel = "";
  let badgeColor: "emerald" | "amber" | "blue" | "purple" | "rose" | "gray" = "emerald";
  let headlineWarning: string | undefined;

  if (isTrial) {
    statusLabel = `Pro Trial (${trialDaysRemaining}d remaining)`;
    badgeColor = trialDaysRemaining <= 5 ? "amber" : "purple";
  } else if (isInGracePeriod) {
    statusLabel = `Grace Period (${graceDaysRemaining}d left)`;
    badgeColor = "amber";
    headlineWarning = `3-Day Grace Period active (${graceDaysRemaining} days remaining). Upgrade to Pro or your workspace will transition to the Free Plan.`;
  } else if (isReadOnlyMode) {
    statusLabel = "Free Plan (Safe Read-Only Mode)";
    badgeColor = "amber";
    headlineWarning = `Your organization exceeds the Free Plan member quota (${activeMemberCount}/${memberLimit} members). Excess records are preserved in read-only mode safely without deletion. Upgrade to Pro ($25/mo) for unlimited capacity.`;
  } else if (effectiveTier === "free") {
    statusLabel = "Free Plan";
    badgeColor = "gray";
    if (isTrialExpired) {
      headlineWarning = "Your 30-day Pro trial has finished. Your organization is now operating on the Free Plan. Upgrade anytime to unlock advanced Pro or Growth features.";
    }
  } else if (effectiveTier === "starter") {
    statusLabel = `Starter Plan (${subscriptionDaysRemaining}d active)`;
    badgeColor = "blue";
  } else if (effectiveTier === "growth") {
    statusLabel = `Growth Plan (${subscriptionDaysRemaining}d active)`;
    badgeColor = "emerald";
  } else if (effectiveTier === "pro") {
    statusLabel = `Pro Plan (${subscriptionDaysRemaining}d active)`;
    badgeColor = "purple";
  }

  // Calculate actual end date
  let computedEndsAt: string | null = org.subscription_ends_at || null;
  if (!computedEndsAt) {
    if (isTrial) {
      computedEndsAt = new Date(createdTime + trialMs).toISOString();
    } else if (isInGracePeriod) {
      computedEndsAt = new Date(createdTime + totalTrialMs).toISOString();
    } else if (isExplicitActive && effectiveTier !== "free") {
      computedEndsAt = new Date(now + 30 * 24 * 3600 * 1000).toISOString();
    }
  }

  return {
    tier: rawTier,
    effectiveTier,
    tierDef,
    isTrial,
    isInGracePeriod,
    isTrialExpired,
    isSubscriptionExpired,
    isFreeForever: effectiveTier === "free",
    isPaidActive: isExplicitActive && effectiveTier !== "free" && !isSubscriptionExpired,
    daysSinceCreation,
    trialDaysRemaining,
    graceDaysRemaining,
    subscriptionDaysRemaining,
    daysRemaining: isInGracePeriod
      ? graceDaysRemaining
      : isTrial
      ? trialDaysRemaining
      : effectiveTier === "free"
      ? 0
      : subscriptionDaysRemaining,
    subscriptionEndsAt: computedEndsAt,
    activePackages,
    bonusMemberSlots,
    baseMemberLimit,
    memberLimit,
    storageLimitMB,
    storageLimitBytes,
    storageLimit:
      storageLimitMB === Infinity
        ? "Unlimited"
        : storageLimitMB >= 1024
        ? `${Math.round(storageLimitMB / 1024)} GB`
        : `${storageLimitMB} MB`,
    activeMemberCount,
    storageBytesUsed,
    isMemberLimitExceeded,
    excessMembers,
    isStorageLimitExceeded,
    isReadOnlyMode,
    isReadOnlySafeMode: isReadOnlyMode,
    isLocked: isSubscriptionExpired || isTrialExpired,
    isExpired: isTrialExpired || isSubscriptionExpired,
    isGracePeriod: isInGracePeriod,
    statusLabel,
    badgeColor,
    headlineWarning
  };
}

export type ImpactFeatureKey =
  | "member_directory"
  | "basic_chat"
  | "announcements"
  | "event_listings"
  | "video_call"
  | "task_assignment"
  | "dues_charges"
  | "payment_proofs"
  | "goals_tracker"
  | "chat_polls"
  | "qr_attendance"
  | "excel_export"
  | "meeting_minutes"
  | "financial_ledger"
  | "document_office"
  | "automated_certificates"
  | "asset_tracker"
  | "advanced_ledger_reports"
  | "momo_live_gateway"
  | "public_marketplace"
  | "multi_branch"
  | "id_verification"
  | "quorum_governance"
  | "audit_trail";

export interface FeatureAccessResult {
  allowed: boolean;
  requiredTier: SubscriptionTier;
  recommendedPackage?: AddOnPackageId;
  packageDef?: AddOnPackageDefinition;
  message?: string;
}

/**
 * Feature Gating Helper
 * Evaluates whether an organization has access to a specific feature via their base plan
 * OR via an active $4 add-on package.
 */
export function canAccessFeature(
  org: Partial<Organization> | undefined | null,
  feature: ImpactFeatureKey
): FeatureAccessResult {
  const lifecycle = getOrgSubscriptionLifecycle(org);
  const tierRank: Record<SubscriptionTier, number> = {
    free: 1,
    starter: 2,
    growth: 3,
    pro: 4,
    enterprise: 4
  };

  const featureRequirementMap: Record<ImpactFeatureKey, SubscriptionTier> = {
    member_directory: "free",
    basic_chat: "free",
    announcements: "free",
    event_listings: "pro",
    video_call: "pro",
    task_assignment: "growth",
    dues_charges: "free",
    payment_proofs: "free",
    goals_tracker: "pro",
    chat_polls: "growth",
    qr_attendance: "starter",
    excel_export: "growth",
    meeting_minutes: "starter",
    financial_ledger: "growth",
    document_office: "growth",
    automated_certificates: "pro",
    asset_tracker: "pro",
    advanced_ledger_reports: "pro",
    momo_live_gateway: "pro",
    public_marketplace: "pro",
    multi_branch: "pro",
    id_verification: "pro",
    quorum_governance: "pro",
    audit_trail: "growth"
  };

  const featureToPackageMap: Partial<Record<ImpactFeatureKey, AddOnPackageId>> = {
    event_listings: "event_pack",
    video_call: "event_pack",
    task_assignment: "event_pack",
    qr_attendance: "event_pack",
    excel_export: "event_pack",
    meeting_minutes: "event_pack",
    financial_ledger: "finance_pack",
    document_office: "document_pack",
    chat_polls: "document_pack",
    automated_certificates: "pro_pack",
    asset_tracker: "pro_pack",
    advanced_ledger_reports: "pro_pack"
  };

  const reqTier = featureRequirementMap[feature] || "growth";
  const userRank = tierRank[lifecycle.effectiveTier] || 1;
  const reqRank = tierRank[reqTier] || 3;

  // 1. Check if base tier provides access
  if (userRank >= reqRank) {
    return {
      allowed: true,
      requiredTier: reqTier
    };
  }

  // 2. Check if an active add-on package provides access
  const recommendedPackage = featureToPackageMap[feature];
  if (recommendedPackage && lifecycle.activePackages.includes(recommendedPackage)) {
    return {
      allowed: true,
      requiredTier: reqTier,
      recommendedPackage,
      packageDef: ADDON_PACKAGES[recommendedPackage]
    };
  }

  const targetTierDef = getTierDefinition(reqTier);

  return {
    allowed: false,
    requiredTier: reqTier,
    message: `This feature requires the ${targetTierDef.name} ($${targetTierDef.priceUsd}/mo) or higher. Upgrade your workspace to unlock complete access.`
  };
}
