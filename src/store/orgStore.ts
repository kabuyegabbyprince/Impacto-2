import { create } from "zustand";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  mission?: string;
  vision?: string;
  logo_url?: string;
  cover_url?: string;
  primary_color: string;
  secondary_color: string;
  language: "en" | "fr" | "rw";
  auto_confirm_members: boolean;
  donations_enabled: boolean;
  donation_mtn_number?: string;
  donation_airtel_number?: string;
  donation_account_name?: string;
  donation_description?: string;
  dues_mtn_number?: string;
  dues_airtel_number?: string;
  dues_account_name?: string;
  momo_merchant_code?: string;
  subscription_status: "trial" | "active" | "expired";
  subscription_ends_at?: string;
  subscription_tier?: "free" | "starter" | "growth" | "pro" | "enterprise" | "trial";
  active_packages?: string[];
  packages_data?: Record<string, { expires_at: string; purchased_at: string }>;
  org_category: string;
  created_at: string;
  // Custom public portal settings
  location_name?: string;
  contact_us?: string;
  gallery_urls?: string[];
  // Members dashboard settings
  dashboard_theme?: "light" | "dark" | "custom";
  dashboard_logo?: string;
  is_public_directory?: boolean;
  allow_public_joining?: boolean;
  public_page_enabled?: boolean;
  show_goals_publicly?: boolean;
  show_impact_publicly?: boolean;
  fee_notification?: string;
  marketplace_enabled?: boolean;
  // Exit Survey & Offboarding settings
  exit_survey_enabled?: boolean;
  exit_survey_title?: string;
  exit_survey_description?: string;
  exit_survey_questions?: Array<{
    id: string;
    question: string;
    type: "text" | "rating" | "choice" | "boolean";
    options?: string[];
    required?: boolean;
  }>;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: "superadmin" | "org_admin" | "manager" | "accountant" | "member";
  status: "pending" | "active" | "suspended" | "resigned" | "rejected";
  member_number?: string;
  tier_id?: string;
  joined_at: string;
}

export interface OrgState {
  activeOrg: Organization | null;
  activeMember: OrgMember | null;
  setActiveOrg: (org: Organization | null, member: OrgMember | null) => void;
  clearOrg: () => void;
}

const getInitialOrg = (): Organization | null => {
  const saved = localStorage.getItem("impacto_active_org");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }
  return null;
};

const getInitialMember = (): OrgMember | null => {
  const saved = localStorage.getItem("impacto_active_member");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }
  return null;
};

const pruneLargeValuesForStorage = (org: any): any => {
  if (!org || typeof org !== "object") return org;
  const pruned: any = Array.isArray(org) ? [] : {};
  for (const key of Object.keys(org)) {
    const val = org[key];
    if (typeof val === "string") {
      // Prune strings longer than 15,000 characters (e.g., base64 uploads)
      if (val.length > 15000) {
        if (val.startsWith("data:")) {
          // Keep it as a small SVG fallback or empty/undefined to save space
          pruned[key] = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%23cccccc'/></svg>";
        } else {
          pruned[key] = val.slice(0, 1000) + "... (truncated for storage)";
        }
      } else {
        pruned[key] = val;
      }
    } else if (Array.isArray(val)) {
      pruned[key] = val.map((item) => {
        if (typeof item === "string" && item.length > 15000) {
          if (item.startsWith("data:")) {
            return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%23cccccc'/></svg>";
          }
          return item.slice(0, 1000) + "... (truncated for storage)";
        }
        if (item && typeof item === "object") {
          return pruneLargeValuesForStorage(item);
        }
        return item;
      });
    } else if (val && typeof val === "object") {
      pruned[key] = pruneLargeValuesForStorage(val);
    } else {
      pruned[key] = val;
    }
  }
  return pruned;
};

export const useOrgStore = create<OrgState>((set) => ({
  activeOrg: getInitialOrg(),
  activeMember: getInitialMember(),
  setActiveOrg: (org, member) => {
    if (org) {
      try {
        const pruned = pruneLargeValuesForStorage(org);
        localStorage.setItem("impacto_active_org", JSON.stringify(pruned));
      } catch (err) {
        console.warn("Failed to save active organization to localStorage (quota exceeded or storage disabled):", err);
      }
    } else {
      try {
        localStorage.removeItem("impacto_active_org");
      } catch {}
    }
    if (member) {
      try {
        const prunedMember = pruneLargeValuesForStorage(member);
        localStorage.setItem("impacto_active_member", JSON.stringify(prunedMember));
      } catch (err) {
        console.warn("Failed to save active member to localStorage:", err);
      }
    } else {
      try {
        localStorage.removeItem("impacto_active_member");
      } catch {}
    }
    set({ activeOrg: org, activeMember: member });
    try {
      window.dispatchEvent(new CustomEvent("impacto_org_updated", { detail: { org, member } }));
    } catch {}
  },
  clearOrg: () => {
    try {
      localStorage.removeItem("impacto_active_org");
      localStorage.removeItem("impacto_active_member");
    } catch {}
    set({ activeOrg: null, activeMember: null });
  },
}));

// Real-time synchronization: automatically update active organization & packages without page reload
if (typeof window !== "undefined") {
  window.addEventListener("impacto_org_updated", (event: any) => {
    try {
      const detail = event?.detail;
      if (!detail) return;
      const state = useOrgStore.getState();
      const currentOrg = state.activeOrg;
      const currentMember = state.activeMember;

      const targetOrgId = detail.orgId || detail.org?.id;
      if (currentOrg && targetOrgId && currentOrg.id === targetOrgId) {
        let updatedOrg = detail.org ? { ...currentOrg, ...detail.org } : { ...currentOrg };
        
        // Sync active packages from local storage if fresh
        try {
          const pkgStorage = localStorage.getItem(`impacto_org_packages_${currentOrg.id}`);
          if (pkgStorage) {
            updatedOrg.active_packages = JSON.parse(pkgStorage);
          }
        } catch (e) {}

        let updatedMember = currentMember;
        if (detail.member && (!currentMember || currentMember.id === detail.member.id)) {
          updatedMember = { ...currentMember, ...detail.member };
        } else if (detail.memberId && currentMember && currentMember.id === detail.memberId && detail.status) {
          updatedMember = { ...currentMember, status: detail.status };
        }

        state.setActiveOrg(updatedOrg, updatedMember);
      }
    } catch (err) {
      console.warn("Failed to process live organization sync event:", err);
    }
  });
}
