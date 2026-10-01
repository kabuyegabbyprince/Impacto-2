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

const getInitialOrg = (): Organization | null => null;
const getInitialMember = (): OrgMember | null => null;

export const useOrgStore = create<OrgState>((set) => ({
  activeOrg: null,
  activeMember: null,
  setActiveOrg: (org, member) => {
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

        // If tier was granted
        if (detail.tier) {
          updatedOrg.subscription_tier = detail.tier;
          updatedOrg.subscription_status = "active";
          const nextExpiry = new Date();
          nextExpiry.setDate(nextExpiry.getDate() + 30);
          updatedOrg.subscription_ends_at = nextExpiry.toISOString();
        }

        // Sync active packages from local storage if fresh
        try {
          const pkgStorage = localStorage.getItem(`impacto_org_packages_${currentOrg.id}`);
          let pkgs: string[] = pkgStorage ? JSON.parse(pkgStorage) : (updatedOrg.active_packages || []);
          if (detail.packageId && !pkgs.includes(detail.packageId)) {
            pkgs.push(detail.packageId);
            localStorage.setItem(`impacto_org_packages_${currentOrg.id}`, JSON.stringify(pkgs));
          }
          updatedOrg.active_packages = pkgs;
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
