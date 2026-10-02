import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { uploadFile, dataUrlToUint8Array } from "../lib/supabaseStorage";
import { MockDB } from "../lib/mockData";
import { notifyCrossTabChange, notifyPlanOrPackageGranted } from "../lib/crossTabSync";
import { useOrgStore } from "../store/orgStore";
import { useCurrencyStore } from "../store/currencyStore";
import {
  Organization,
  OrgMember,
  Event,
  Meeting,
  NewsPost,
  ChatChannel,
  ChatMessage,
  Goal,
  Grant,
  LedgerEntry,
  Donation,
  ErrorReport,
  SubscriptionPayment,
  SubscriptionTier,
  MemberTier,
  PlatformSettings,
  ActivityLog,
  ActivityAttendance,
  MessageTemplate,
  NotificationSend,
  PollMessage,
  PollVote,
  EventRSVP,
  EventWaitlist,
  IdentityVerification,
  Document,
  DocumentAcknowledgement,
  Resignation,
  AuditLog,
  SupportConversation,
  SupportMessage,
  EventAttendance,
  MemberFee,
  MarketplaceProduct,
  MarketplaceLead,
  Asset,
} from "../types";
import { recordSystemAuditEvent } from "../lib/auditLogger";

// Helper for fake latency/promises
const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

// ==========================================
// 1. ORGANIZATIONS HOOKS
// ==========================================
export function useOrganizations() {
  return useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      let orgs: Organization[];
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("organizations")
            .select("*")
            .order("name", { ascending: true });
          if (error) {
            console.warn("Supabase organizations query notice, using local cache:", error);
            orgs = MockDB.getOrgs();
          } else {
            orgs = (data || []) as Organization[];
          }
        } catch (err) {
          console.warn("Network error fetching organizations, using local cache:", err);
          orgs = MockDB.getOrgs();
        }
      } else {
        await delay();
        orgs = MockDB.getOrgs();
      }
      return orgs.map((org) => {
        const localVal = localStorage.getItem(
          `impacto_org_is_public_directory_${org.id}`,
        );
        const localJoin = localStorage.getItem(
          `impacto_org_allow_public_joining_${org.id}`,
        );
        const localPPE = localStorage.getItem(
          `impacto_org_public_page_enabled_${org.id}`,
        );
        const localSGP = localStorage.getItem(
          `impacto_org_show_goals_publicly_${org.id}`,
        );
        const localSIP = localStorage.getItem(
          `impacto_org_show_impact_publicly_${org.id}`,
        );
        const localTier = localStorage.getItem(
          `impacto_org_subscription_tier_${org.id}`,
        );
        const localPackages = localStorage.getItem(
          `impacto_org_packages_${org.id}`,
        );
        const localMarketplace = localStorage.getItem(
          `impacto_org_marketplace_enabled_${org.id}`,
        );
        const localFeeNotif = localStorage.getItem(
          `impacto_org_fee_notification_${org.id}`,
        );
        const localExitSurveyEnabled = localStorage.getItem(
          `impacto_org_exit_survey_enabled_${org.id}`,
        );
        const localExitSurveyTitle = localStorage.getItem(
          `impacto_org_exit_survey_title_${org.id}`,
        );
        const localExitSurveyDesc = localStorage.getItem(
          `impacto_org_exit_survey_description_${org.id}`,
        );
        const localExitSurveyQuestions = localStorage.getItem(
          `impacto_org_exit_survey_questions_${org.id}`,
        );
        const localDuesAccount = localStorage.getItem(
          `impacto_org_dues_account_name_${org.id}`,
        );
        const localDuesMtn = localStorage.getItem(
          `impacto_org_dues_mtn_number_${org.id}`,
        );
        const localDuesAirtel = localStorage.getItem(
          `impacto_org_dues_airtel_number_${org.id}`,
        );
        const localMomoMerchant = localStorage.getItem(
          `impacto_org_momo_merchant_code_${org.id}`,
        );
        return {
          ...org,
          dues_account_name:
            localDuesAccount ||
            org.dues_account_name ||
            org.donation_account_name ||
            org.name,
          dues_mtn_number:
            localDuesMtn ||
            org.dues_mtn_number ||
            org.donation_mtn_number,
          dues_airtel_number:
            localDuesAirtel ||
            org.dues_airtel_number ||
            org.donation_airtel_number,
          momo_merchant_code:
            localMomoMerchant ||
            org.momo_merchant_code ||
            (org as any).momo_merchant_code ||
            "",
          exit_survey_enabled:
            localExitSurveyEnabled !== null
              ? JSON.parse(localExitSurveyEnabled)
              : (org.exit_survey_enabled ?? true),
          exit_survey_title:
            localExitSurveyTitle !== null
              ? localExitSurveyTitle
              : (org.exit_survey_title || "Member Departure & Offboarding Survey"),
          exit_survey_description:
            localExitSurveyDesc !== null
              ? localExitSurveyDesc
              : (org.exit_survey_description || "Please share your feedback so cooperative leadership can continue improving community support."),
          exit_survey_questions:
            localExitSurveyQuestions !== null
              ? JSON.parse(localExitSurveyQuestions)
              : (org.exit_survey_questions || []),
          subscription_tier: (localTier as any) || org.subscription_tier || (org as any).subscription_plan || "free",
          active_packages: localPackages ? JSON.parse(localPackages) : (org.active_packages || []),
          marketplace_enabled:
            localMarketplace !== null
              ? JSON.parse(localMarketplace)
              : (org.marketplace_enabled ?? true),
          fee_notification:
            localFeeNotif !== null
              ? localFeeNotif
              : org.fee_notification,
          is_public_directory:
            localVal !== null
              ? JSON.parse(localVal)
              : (org.is_public_directory ?? true),
          allow_public_joining:
            localJoin !== null
              ? JSON.parse(localJoin)
              : (org.allow_public_joining ?? true),
          public_page_enabled:
            localPPE !== null
              ? JSON.parse(localPPE)
              : (org.public_page_enabled ?? true),
          show_goals_publicly:
            localSGP !== null
              ? JSON.parse(localSGP)
              : (org.show_goals_publicly ?? true),
          show_impact_publicly:
            localSIP !== null
              ? JSON.parse(localSIP)
              : (org.show_impact_publicly ?? true),
        };
      });
    },
  });
}

export function useOrganization(slug: string | undefined) {
  return useQuery({
    queryKey: ["organization", slug],
    queryFn: async () => {
      if (!slug) return null;
      let org: Organization | null = null;
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("organizations")
            .select("*")
            .eq("slug", slug)
            .maybeSingle();
          if (error) {
            console.warn("Supabase organization query notice, using local cache:", error);
            org = MockDB.getOrgs().find((o) => o.slug === slug) || null;
          } else {
            org = data as Organization | null;
          }
        } catch (err) {
          console.warn("Network error fetching organization, using local cache:", err);
          org = MockDB.getOrgs().find((o) => o.slug === slug) || null;
        }
      } else {
        await delay();
        org = MockDB.getOrgs().find((o) => o.slug === slug) || null;
      }
      if (org) {
        const localVal = localStorage.getItem(
          `impacto_org_is_public_directory_${org.id}`,
        );
        const localJoin = localStorage.getItem(
          `impacto_org_allow_public_joining_${org.id}`,
        );
        const localPPE = localStorage.getItem(
          `impacto_org_public_page_enabled_${org.id}`,
        );
        const localSGP = localStorage.getItem(
          `impacto_org_show_goals_publicly_${org.id}`,
        );
        const localSIP = localStorage.getItem(
          `impacto_org_show_impact_publicly_${org.id}`,
        );
        const localTier = localStorage.getItem(
          `impacto_org_subscription_tier_${org.id}`,
        );
        const localPackages = localStorage.getItem(
          `impacto_org_packages_${org.id}`,
        );
        const localMarketplace = localStorage.getItem(
          `impacto_org_marketplace_enabled_${org.id}`,
        );
        const localFeeNotif = localStorage.getItem(
          `impacto_org_fee_notification_${org.id}`,
        );
        const localExitSurveyEnabled = localStorage.getItem(
          `impacto_org_exit_survey_enabled_${org.id}`,
        );
        const localExitSurveyTitle = localStorage.getItem(
          `impacto_org_exit_survey_title_${org.id}`,
        );
        const localExitSurveyDesc = localStorage.getItem(
          `impacto_org_exit_survey_description_${org.id}`,
        );
        const localExitSurveyQuestions = localStorage.getItem(
          `impacto_org_exit_survey_questions_${org.id}`,
        );
        org = {
          ...org,
          exit_survey_enabled:
            localExitSurveyEnabled !== null
              ? JSON.parse(localExitSurveyEnabled)
              : (org.exit_survey_enabled ?? true),
          exit_survey_title:
            localExitSurveyTitle !== null
              ? localExitSurveyTitle
              : (org.exit_survey_title || "Member Departure & Offboarding Survey"),
          exit_survey_description:
            localExitSurveyDesc !== null
              ? localExitSurveyDesc
              : (org.exit_survey_description || "Please share your feedback so cooperative leadership can continue improving community support."),
          exit_survey_questions:
            localExitSurveyQuestions !== null
              ? JSON.parse(localExitSurveyQuestions)
              : (org.exit_survey_questions || []),
          subscription_tier: (localTier as any) || org.subscription_tier || (org as any).subscription_plan || "free",
          active_packages: localPackages ? JSON.parse(localPackages) : (org.active_packages || []),
          marketplace_enabled:
            localMarketplace !== null
              ? JSON.parse(localMarketplace)
              : (org.marketplace_enabled ?? true),
          fee_notification:
            localFeeNotif !== null
              ? localFeeNotif
              : org.fee_notification,
          is_public_directory:
            localVal !== null
              ? JSON.parse(localVal)
              : (org.is_public_directory ?? true),
          allow_public_joining:
            localJoin !== null
              ? JSON.parse(localJoin)
              : (org.allow_public_joining ?? true),
          public_page_enabled:
            localPPE !== null
              ? JSON.parse(localPPE)
              : (org.public_page_enabled ?? true),
          show_goals_publicly:
            localSGP !== null
              ? JSON.parse(localSGP)
              : (org.show_goals_publicly ?? true),
          show_impact_publicly:
            localSIP !== null
              ? JSON.parse(localSIP)
              : (org.show_impact_publicly ?? true),
        };
      }
      return org;
    },
    enabled: !!slug,
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Organization> & { id: string }) => {
      const {
        id,
        is_public_directory,
        allow_public_joining,
        public_page_enabled,
        show_goals_publicly,
        show_impact_publicly,
        marketplace_enabled,
        fee_notification,
        exit_survey_enabled,
        exit_survey_title,
        exit_survey_description,
        exit_survey_questions,
        dues_account_name,
        dues_mtn_number,
        dues_airtel_number,
        momo_merchant_code,
        active_packages,
        packages_data,
        ...rest
      } = payload;

      if (dues_account_name !== undefined) {
        localStorage.setItem(
          `impacto_org_dues_account_name_${id}`,
          dues_account_name || "",
        );
      }
      if (dues_mtn_number !== undefined) {
        localStorage.setItem(
          `impacto_org_dues_mtn_number_${id}`,
          dues_mtn_number || "",
        );
      }
      if (dues_airtel_number !== undefined) {
        localStorage.setItem(
          `impacto_org_dues_airtel_number_${id}`,
          dues_airtel_number || "",
        );
      }
      if (momo_merchant_code !== undefined) {
        localStorage.setItem(
          `impacto_org_momo_merchant_code_${id}`,
          momo_merchant_code || "",
        );
      }

      if (exit_survey_enabled !== undefined) {
        localStorage.setItem(
          `impacto_org_exit_survey_enabled_${id}`,
          JSON.stringify(exit_survey_enabled),
        );
      }
      if (exit_survey_title !== undefined) {
        localStorage.setItem(
          `impacto_org_exit_survey_title_${id}`,
          exit_survey_title || "",
        );
      }
      if (exit_survey_description !== undefined) {
        localStorage.setItem(
          `impacto_org_exit_survey_description_${id}`,
          exit_survey_description || "",
        );
      }
      if (exit_survey_questions !== undefined) {
        localStorage.setItem(
          `impacto_org_exit_survey_questions_${id}`,
          JSON.stringify(exit_survey_questions),
        );
      }

      if (marketplace_enabled !== undefined) {
        localStorage.setItem(
          `impacto_org_marketplace_enabled_${id}`,
          JSON.stringify(marketplace_enabled),
        );
      }
      if (fee_notification !== undefined) {
        localStorage.setItem(
          `impacto_org_fee_notification_${id}`,
          fee_notification || "",
        );
      }

      if (is_public_directory !== undefined) {
        localStorage.setItem(
          `impacto_org_is_public_directory_${id}`,
          JSON.stringify(is_public_directory),
        );
      }
      if (allow_public_joining !== undefined) {
        localStorage.setItem(
          `impacto_org_allow_public_joining_${id}`,
          JSON.stringify(allow_public_joining),
        );
      }
      if (public_page_enabled !== undefined) {
        localStorage.setItem(
          `impacto_org_public_page_enabled_${id}`,
          JSON.stringify(public_page_enabled),
        );
      }
      if (show_goals_publicly !== undefined) {
        localStorage.setItem(
          `impacto_org_show_goals_publicly_${id}`,
          JSON.stringify(show_goals_publicly),
        );
      }
      if (show_impact_publicly !== undefined) {
        localStorage.setItem(
          `impacto_org_show_impact_publicly_${id}`,
          JSON.stringify(show_impact_publicly),
        );
      }

      if (isSupabaseConfigured) {
        let updatedOrg: Organization | null = null;
        const updateData: Record<string, any> = { ...rest };

        // If donation credentials were not set but dues values were provided, map them to DB columns
        if (updateData.donation_account_name === undefined && dues_account_name !== undefined) {
          updateData.donation_account_name = dues_account_name;
        }
        if (updateData.donation_mtn_number === undefined && dues_mtn_number !== undefined) {
          updateData.donation_mtn_number = dues_mtn_number;
        }
        if (updateData.donation_airtel_number === undefined && dues_airtel_number !== undefined) {
          updateData.donation_airtel_number = dues_airtel_number;
        }

        // Auto-prune loop for any non-existent columns in Supabase schema cache
        for (let attempt = 0; attempt < 6; attempt++) {
          try {
            const { data, error } = await supabase
              .from("organizations")
              .update(updateData)
              .eq("id", id)
              .select()
              .single();
            if (error) throw error;
            updatedOrg = data as Organization;
            break;
          } catch (dbErr: any) {
            console.warn(`Supabase organization update attempt ${attempt + 1} failed:`, dbErr);
            const errMsg = dbErr?.message || "";
            // Check for PGRST204 error: Could not find the 'xyz' column of 'organizations' in the schema cache
            const missingColMatch = errMsg.match(/Could not find the '([^']+)' column/i);
            if (missingColMatch && missingColMatch[1]) {
              const missingCol = missingColMatch[1];
              console.warn(`Pruning missing column '${missingCol}' from organizations update payload.`);
              if (updateData[missingCol] !== undefined) {
                localStorage.setItem(
                  `impacto_org_${missingCol}_${id}`,
                  typeof updateData[missingCol] === "object"
                    ? JSON.stringify(updateData[missingCol])
                    : String(updateData[missingCol])
                );
                delete updateData[missingCol];
              }
              continue;
            }
            if (updateData.subscription_tier !== undefined) {
              localStorage.setItem(`impacto_org_subscription_tier_${id}`, updateData.subscription_tier);
              delete updateData.subscription_tier;
              continue;
            }
            break;
          }
        }

        if (!updatedOrg) {
          const { data } = await supabase.from("organizations").select("*").eq("id", id).maybeSingle();
          updatedOrg = (data as Organization) || MockDB.getOrgs().find(o => o.id === id) || ({ id, ...payload } as Organization);
        }
        const localVal = localStorage.getItem(
          `impacto_org_is_public_directory_${id}`,
        );
        const localJoin = localStorage.getItem(
          `impacto_org_allow_public_joining_${id}`,
        );
        const localPPE = localStorage.getItem(
          `impacto_org_public_page_enabled_${id}`,
        );
        const localSGP = localStorage.getItem(
          `impacto_org_show_goals_publicly_${id}`,
        );
        const localSIP = localStorage.getItem(
          `impacto_org_show_impact_publicly_${id}`,
        );
        const localTier = localStorage.getItem(
          `impacto_org_subscription_tier_${id}`,
        );
        const localPackages = localStorage.getItem(
          `impacto_org_packages_${id}`,
        );
        const localMarketplace = localStorage.getItem(
          `impacto_org_marketplace_enabled_${id}`,
        );
        const localFeeNotif = localStorage.getItem(
          `impacto_org_fee_notification_${id}`,
        );
        const localExitSurveyEnabled = localStorage.getItem(
          `impacto_org_exit_survey_enabled_${id}`,
        );
        const localExitSurveyTitle = localStorage.getItem(
          `impacto_org_exit_survey_title_${id}`,
        );
        const localExitSurveyDesc = localStorage.getItem(
          `impacto_org_exit_survey_description_${id}`,
        );
        const localExitSurveyQuestions = localStorage.getItem(
          `impacto_org_exit_survey_questions_${id}`,
        );
        const localDuesAccount = localStorage.getItem(
          `impacto_org_dues_account_name_${id}`,
        );
        const localDuesMtn = localStorage.getItem(
          `impacto_org_dues_mtn_number_${id}`,
        );
        const localDuesAirtel = localStorage.getItem(
          `impacto_org_dues_airtel_number_${id}`,
        );
        const localMomoMerchant = localStorage.getItem(
          `impacto_org_momo_merchant_code_${id}`,
        );
        return {
          ...updatedOrg,
          dues_account_name:
            localDuesAccount ||
            dues_account_name ||
            updatedOrg.dues_account_name ||
            updatedOrg.donation_account_name ||
            updatedOrg.name,
          dues_mtn_number:
            localDuesMtn ||
            dues_mtn_number ||
            updatedOrg.dues_mtn_number ||
            updatedOrg.donation_mtn_number,
          dues_airtel_number:
            localDuesAirtel ||
            dues_airtel_number ||
            updatedOrg.dues_airtel_number ||
            updatedOrg.donation_airtel_number,
          momo_merchant_code:
            localMomoMerchant ||
            momo_merchant_code ||
            (updatedOrg as any).momo_merchant_code ||
            "",
          exit_survey_enabled:
            localExitSurveyEnabled !== null
              ? JSON.parse(localExitSurveyEnabled)
              : (updatedOrg.exit_survey_enabled ?? true),
          exit_survey_title:
            localExitSurveyTitle !== null
              ? localExitSurveyTitle
              : (updatedOrg.exit_survey_title || "Member Departure & Offboarding Survey"),
          exit_survey_description:
            localExitSurveyDesc !== null
              ? localExitSurveyDesc
              : (updatedOrg.exit_survey_description || "Please share your feedback so cooperative leadership can continue improving community support."),
          exit_survey_questions:
            localExitSurveyQuestions !== null
              ? JSON.parse(localExitSurveyQuestions)
              : (updatedOrg.exit_survey_questions || []),
          subscription_tier: (localTier as any) || updatedOrg.subscription_tier || (updatedOrg as any).subscription_plan || "free",
          active_packages: localPackages ? JSON.parse(localPackages) : (updatedOrg.active_packages || []),
          marketplace_enabled:
            localMarketplace !== null
              ? JSON.parse(localMarketplace)
              : (updatedOrg.marketplace_enabled ?? true),
          fee_notification:
            localFeeNotif !== null
              ? localFeeNotif
              : updatedOrg.fee_notification,
          is_public_directory:
            localVal !== null
              ? JSON.parse(localVal)
              : (updatedOrg.is_public_directory ?? true),
          allow_public_joining:
            localJoin !== null
              ? JSON.parse(localJoin)
              : (updatedOrg.allow_public_joining ?? true),
          public_page_enabled:
            localPPE !== null
              ? JSON.parse(localPPE)
              : (updatedOrg.public_page_enabled ?? true),
          show_goals_publicly:
            localSGP !== null
              ? JSON.parse(localSGP)
              : (updatedOrg.show_goals_publicly ?? true),
          show_impact_publicly:
            localSIP !== null
              ? JSON.parse(localSIP)
              : (updatedOrg.show_impact_publicly ?? true),
        };
      }
      await delay();
      const orgs = MockDB.getOrgs();
      const idx = orgs.findIndex((o) => o.id === payload.id);
      if (idx !== -1) {
        orgs[idx] = { ...orgs[idx], ...payload };
        MockDB.saveOrgs(orgs);
        return orgs[idx];
      }
      throw new Error("Organization not found.");
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["organization", data.slug] });
      queryClient.invalidateQueries({ queryKey: ["platform_admin_data"] });
      const store = useOrgStore.getState();
      if (store.activeOrg && store.activeOrg.id === data.id) {
        store.setActiveOrg({ ...store.activeOrg, ...data }, store.activeMember);
      }
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
  });
}

// ==========================================
// 2. MEMBER MANAGEMENT HOOKS
// ==========================================
export function useMembers(orgId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!orgId || !isSupabaseConfigured) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      const channelName = `members_rt_${orgId}_${Math.random().toString(36).substring(2, 9)}`;
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "org_members", filter: `org_id=eq.${orgId}` },
          () => queryClient.invalidateQueries({ queryKey: ["members", orgId] })
        )
        .subscribe();
    } catch (err) {
      console.warn("[Realtime] Members channel subscribe notice:", err);
    }
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [orgId, queryClient]);

  return useQuery({
    queryKey: ["members", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("org_members")
            .select("*, user:user_id(id, email, full_name, avatar_url)")
            .eq("org_id", orgId);
          if (error) {
            console.warn("Supabase members query notice, using local cache:", error);
          } else if (data) {
            return data as OrgMember[];
          }
        } catch (err) {
          console.warn("Network error fetching members, using local cache:", err);
        }
      }
      await delay();
      const users = MockDB.getUsers();
      return MockDB.getMembers()
        .filter((m) => m.org_id === orgId)
        .map((m) => ({
          ...m,
          user: users.find((u) => u.id === m.user_id),
        })) as OrgMember[];
    },
    enabled: !!orgId,
  });
}

export function useApprovedMembers(orgId: string | undefined) {
  const q = useMembers(orgId);
  return {
    ...q,
    data: q.data?.filter((m) => m.status === "active") || [],
  };
}

export function useUserMemberships(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId || !isSupabaseConfigured) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      const channelName = `user_mems_rt_${userId}_${Math.random().toString(36).substring(2, 9)}`;
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "org_members", filter: `user_id=eq.${userId}` },
          () => queryClient.invalidateQueries({ queryKey: ["user_memberships", userId] })
        )
        .subscribe();
    } catch (err) {
      console.warn("[Realtime] User memberships channel notice:", err);
    }
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [userId, queryClient]);

  return useQuery({
    queryKey: ["user_memberships", userId],
    queryFn: async () => {
      if (!userId) return [];
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("org_members")
          .select("*, organizations(*)")
          .eq("user_id", userId);
        if (error) {
          console.warn("[useUserMemberships] Supabase fetch error, fallback to mock:", error.message);
        } else if (data && data.length > 0) {
          return data as (OrgMember & { organizations?: Organization })[];
        }
      }
      await delay();
      const orgs = MockDB.getOrgs();
      const allMock = MockDB.getMembers().filter((m) => m.user_id === userId);
      return allMock.map((m) => ({
        ...m,
        organizations: orgs.find((o) => o.id === m.org_id) as any,
      })) as (OrgMember & { organizations?: Organization })[];
    },
    enabled: !!userId,
  });
}


export function useMemberTiers(orgId: string | undefined) {
  return useQuery({
    queryKey: ["tiers", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("member_tiers")
            .select("*")
            .eq("org_id", orgId);
          if (!error && data && data.length > 0) {
            return data as MemberTier[];
          }
        } catch (err) {
          console.warn("[MemberTiers] Fetch notice:", err);
        }
      }
      await delay();
      return MockDB.getTiers().filter((t) => t.org_id === orgId);
    },
    enabled: !!orgId,
  });
}

// Auto-Fee Assignment Helper: Automatically assigns active fee cycles to newly approved/created members
export async function autoAssignActiveFeesToMember(orgId: string, memberId: string) {
  try {
    if (!orgId || !memberId) return;

    let existingFees: MemberFee[] = [];
    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase.from("member_fees").select("*").eq("org_id", orgId);
        if (data) existingFees = data as MemberFee[];
      } catch (e) {}
    }
    const mockFees = MockDB.getMemberFees().filter((f) => f.org_id === orgId);
    const allOrgFees = [...existingFees, ...mockFees];

    const memberFees = allOrgFees.filter((f) => f.member_id === memberId || (f as any).user_id === memberId);
    
    // Group active or recent cycles
    const cyclesMap = new Map<string, { payment_period: string; period_date: string; amount: number; currency: string }>();

    allOrgFees.forEach((fee) => {
      if (fee.payment_period && fee.period_date && fee.amount > 0) {
        const key = `${fee.payment_period}_${fee.period_date}`;
        if (!cyclesMap.has(key)) {
          cyclesMap.set(key, {
            payment_period: fee.payment_period,
            period_date: fee.period_date,
            amount: fee.amount,
            currency: fee.currency || "RWF"
          });
        }
      }
    });

    if (cyclesMap.size === 0) {
      const currentPeriod = new Date().toISOString().slice(0, 7);
      cyclesMap.set(`monthly_${currentPeriod}`, {
        payment_period: "monthly",
        period_date: currentPeriod,
        amount: 5000,
        currency: "RWF"
      });
    }

    for (const cycle of cyclesMap.values()) {
      const alreadyHas = memberFees.some(
        (f) => f.payment_period === cycle.payment_period && f.period_date === cycle.period_date
      );

      if (!alreadyHas) {
        const newFeeId = `fee-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const newFee: any = {
          id: newFeeId,
          org_id: orgId,
          member_id: memberId,
          amount: cycle.amount,
          currency: cycle.currency,
          payment_period: cycle.payment_period,
          period_date: cycle.period_date,
          status: "pending",
          due_date: dueDate,
          is_recurring: true,
          admin_note: `[Auto-Assigned on Membership Onboarding/Approval] [Cycle: ${cycle.period_date}]`,
          created_at: new Date().toISOString()
        };

        const localList = MockDB.getMemberFees();
        localList.push(newFee);
        MockDB.saveMemberFees(localList);

        if (isSupabaseConfigured) {
          fetch("/api/member-fees/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newFee)
          }).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.warn("[Auto-Fee Assignment] Error assigning fees to member:", err);
  }
}

export function useUpdateMemberStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      role,
      is_volunteer,
    }: {
      id: string;
      status?: "active" | "suspended" | "pending" | "rejected";
      role?: "org_admin" | "manager" | "accountant" | "member";
      is_volunteer?: boolean;
    }) => {
      let updatedRecord: any = null;
      if (isSupabaseConfigured) {
        const updates: any = {};
        if (status) updates.status = status;
        if (role) updates.role = role;
        if (is_volunteer !== undefined) updates.is_volunteer = is_volunteer;
        
        let { data, error } = await supabase
          .from("org_members")
          .update(updates)
          .eq("id", id)
          .select();
          
        // If the Supabase table does not have optional columns like is_volunteer, retry without it
        if (error && error.code === "PGRST204" && updates.is_volunteer !== undefined) {
          delete updates.is_volunteer;
          const retryRes = await supabase
            .from("org_members")
            .update(updates)
            .eq("id", id)
            .select();
          data = retryRes.data;
          error = retryRes.error;
        }
        
        if (error) throw error;
        if (!data || data.length === 0) {
          updatedRecord = { id, ...updates };
        } else {
          updatedRecord = data[0];
        }
      } else {
        await delay();
        const members = MockDB.getMembers();
        const idx = members.findIndex((m) => m.id === id);
        if (idx !== -1) {
          if (status) members[idx].status = status;
          if (role) members[idx].role = role;
          if (is_volunteer !== undefined)
            members[idx].is_volunteer = is_volunteer;
          MockDB.saveMembers(members);
          updatedRecord = members[idx];
        } else {
          throw new Error("Member not found.");
        }
      }

      // If approved to active status, automatically assign active organization fee cycles
      if (status === "active" && updatedRecord?.org_id) {
        await autoAssignActiveFeesToMember(updatedRecord.org_id, updatedRecord.id);
      }

      try {
        recordSystemAuditEvent({
          org_id: updatedRecord?.org_id || "org-1",
          action: "member.updated",
          action_label: `Record Edited: Member roster record modified`,
          target_table: "members",
          target_id: id,
          target_label: updatedRecord?.full_name || updatedRecord?.name || id,
          new_value: { status: updatedRecord?.status, role: updatedRecord?.role, is_volunteer: updatedRecord?.is_volunteer },
        });
      } catch (logErr) {
        console.warn("[Audit] Failed to log member update:", logErr);
      }

      return updatedRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["members", data.org_id] });
      queryClient.invalidateQueries({ queryKey: ["member_fees", data.org_id] });
      queryClient.invalidateQueries({ queryKey: ["audit_logs", data.org_id] });
      const { activeMember, setActiveOrg, activeOrg } = useOrgStore.getState();
      if (activeMember && activeMember.id === data.id) {
        const updatedMember = { ...activeMember, ...data };
        setActiveOrg(activeOrg, updatedMember);
      }
    },
  });
}

export function useDeleteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, orgId }: { id: string; orgId: string }) => {
      const members = MockDB.getMembers();
      const existingMember = members.find((m) => m.id === id);

      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from("org_members")
          .delete()
          .eq("id", id);
        if (error) throw error;
      } else {
        await delay();
        const updated = members.filter((m) => m.id !== id);
        MockDB.saveMembers(updated);
      }

      try {
        const memberDisplayName = existingMember?.user?.full_name || (existingMember as any)?.full_name || (existingMember as any)?.name || id;
        recordSystemAuditEvent({
          org_id: orgId,
          action: "member.deleted",
          action_label: `Record Deleted: Member '${memberDisplayName}' removed from workspace`,
          target_table: "members",
          target_id: id,
          target_label: memberDisplayName,
          old_value: existingMember ? { name: memberDisplayName, role: existingMember.role, status: existingMember.status } : null,
          new_value: null,
        });
      } catch (logErr) {
        console.warn("[Audit] Failed to log member deletion:", logErr);
      }

      return { id, orgId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["members", data.orgId] });
      queryClient.invalidateQueries({ queryKey: ["member_fees", data.orgId] });
      queryClient.invalidateQueries({ queryKey: ["audit_logs", data.orgId] });
    },
  });
}

export function useCreateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orgId,
      email,
      fullName,
      role,
    }: {
      orgId: string;
      email: string;
      fullName: string;
      role: "org_admin" | "member";
    }) => {
      let createdMember: any = null;
      if (isSupabaseConfigured) {
        const { data: userData } = await supabase
          .from("users")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        let targetId = userData?.id;
        if (!targetId) {
          const tempId = "u-" + Math.random().toString(36).substr(2, 9);
          const { error: insErr } = await supabase.from("users").insert({
            id: tempId,
            email,
            full_name: fullName,
            is_superadmin: false,
          });
          if (insErr) throw insErr;
          targetId = tempId;
        }

        const { data, error } = await supabase
          .from("org_members")
          .insert({
            org_id: orgId,
            user_id: targetId,
            role,
            status: "active",
            member_number: "MEM-" + Math.floor(100 + Math.random() * 900),
            joined_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (error) throw error;
        createdMember = data;
      } else {
        await delay();
        const users = MockDB.getUsers();
        const members = MockDB.getMembers();

        let existingUser = users.find((u) => u.email === email);
        if (!existingUser) {
          existingUser = {
            id: "u-" + Math.random().toString(36).substr(2, 9),
            email,
            full_name: fullName,
            is_superadmin: false,
            created_at: new Date().toISOString(),
          };
          users.push(existingUser);
          MockDB.saveUsers(users);
        }

        const newMember: OrgMember = {
          id: "mem-" + Math.random().toString(36).substr(2, 9),
          org_id: orgId,
          user_id: existingUser.id,
          role,
          status: "active",
          member_number: "MEM-" + Math.floor(100 + Math.random() * 900),
          joined_at: new Date().toISOString(),
        };
        members.push(newMember);
        MockDB.saveMembers(members);
        createdMember = newMember;
      }

      // Auto-assign active dues cycles to the newly created active member
      if (createdMember?.id && orgId) {
        await autoAssignActiveFeesToMember(orgId, createdMember.id);
      }

      try {
        recordSystemAuditEvent({
          org_id: orgId,
          action: "member.created",
          action_label: `Record Created: New member '${fullName || email}' registered to roster`,
          target_table: "members",
          target_id: createdMember?.id || "mem-" + Date.now(),
          target_label: fullName || email,
          new_value: { fullName, email, role, status: "active" },
        });
      } catch (logErr) {
        console.warn("[Audit] Failed to log member creation:", logErr);
      }

      return createdMember;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["members", data.org_id] });
      queryClient.invalidateQueries({ queryKey: ["member_fees", data.org_id] });
      queryClient.invalidateQueries({ queryKey: ["audit_logs", data.org_id] });
    },
  });
}

// ==========================================
// 3. EVENTS HOOKS
// ==========================================
export function useEvents(orgId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!orgId || !isSupabaseConfigured) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      const channelName = `events_rt_${orgId}_${Math.random().toString(36).substring(2, 9)}`;
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "events", filter: `org_id=eq.${orgId}` },
          () => queryClient.invalidateQueries({ queryKey: ["events", orgId] })
        )
        .subscribe();
    } catch (err) {
      console.warn("[Realtime] Events channel subscribe notice:", err);
    }
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [orgId, queryClient]);

  return useQuery({
    queryKey: ["events", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      if (isSupabaseConfigured) {
        let sbEvents: Event[] = [];
        try {
          const { data, error } = await supabase
            .from("events")
            .select("*")
            .eq("org_id", orgId)
            .order("date_time", { ascending: true });
          if (!error && data) {
            sbEvents = (data || []).filter((e: any) => !e.is_deleted) as Event[];
          }
        } catch (dbErr: any) {
          console.warn("Supabase fetch events warning:", dbErr);
        }

        const localEvents = MockDB.getEvents().filter(
          (e) => e.org_id === orgId && !e.is_deleted,
        );
        const resultMap = new Map<string, Event>();
        localEvents.forEach((e) => resultMap.set(e.id, e));
        sbEvents.forEach((e) => resultMap.set(e.id, e));

        const unsynced = localEvents.filter((e) => !sbEvents.some((s) => s.id === e.id));
        if (unsynced.length > 0) {
          try {
            await supabase.from("events").upsert(unsynced);
          } catch (syncErr) {
            console.warn("[Events Supabase Sync] Failed to sync local events:", syncErr);
          }
        }
        return Array.from(resultMap.values());
      }
      await delay();
      return MockDB.getEvents().filter(
        (e) => e.org_id === orgId && !e.is_deleted,
      );
    },
    enabled: !!orgId,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Omit<Event, "id" | "attendees_count" | "qr_code_token">,
    ) => {
      if (new Date(payload.date_time) < new Date()) {
        throw new Error("Event date must be in the future.");
      }
      const qr_code_token = "token-" + Math.random().toString(36).substr(2, 9);
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("events")
            .insert({
              ...payload,
              qr_code_token,
              attendees_count: 0,
            })
            .select()
            .single();
          if (error) throw error;
          return data as Event;
        } catch (dbErr) {
          console.warn("Supabase events insert failed or RLS blocked, using local storage:", dbErr);
        }
      }
      await delay();
      const events = MockDB.getEvents();
      const newEvent: Event = {
        ...payload,
        id: "event-" + Math.random().toString(36).substr(2, 9),
        qr_code_token,
        attendees_count: 0,
      };
      events.push(newEvent);
      MockDB.saveEvents(events);
      return newEvent;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["events", data.org_id] });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Partial<Event> & { id: string; org_id: string },
    ) => {
      const { id, org_id, ...updates } = payload;
      const last_edited_at = new Date().toISOString();
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("events")
            .update({ ...updates, last_edited_at })
            .eq("id", id)
            .select()
            .single();
          if (error) throw error;
          return data as Event;
        } catch (dbErr: any) {
          if (
            dbErr.code === "PGRST204" ||
            dbErr.message?.includes("last_edited_at")
          ) {
            const { data, error } = await supabase
              .from("events")
              .update(updates)
              .eq("id", id)
              .select()
              .single();
            if (error) throw error;
            return data as Event;
          }
          throw dbErr;
        }
      }
      await delay();
      const events = MockDB.getEvents();
      const idx = events.findIndex((e) => e.id === id);
      if (idx !== -1) {
        events[idx] = { ...events[idx], ...updates, last_edited_at };
        MockDB.saveEvents(events);
        return events[idx];
      }
      throw new Error("Event not found");
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["events", data.org_id] });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, org_id }: { id: string; org_id: string }) => {
      const last_edited_at = new Date().toISOString();
      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase
            .from("events")
            .update({ is_deleted: true, last_edited_at })
            .eq("id", id);
          if (error) throw error;
        } catch (dbErr: any) {
          if (
            dbErr.code === "PGRST204" ||
            dbErr.message?.includes("is_deleted") ||
            dbErr.message?.includes("last_edited_at")
          ) {
            const { error } = await supabase
              .from("events")
              .delete()
              .eq("id", id);
            if (error) throw error;
          } else {
            throw dbErr;
          }
        }
        return { id, org_id };
      }
      await delay();
      const events = MockDB.getEvents();
      const idx = events.findIndex((e) => e.id === id);
      if (idx !== -1) {
        events[idx] = { ...events[idx], is_deleted: true, last_edited_at };
        MockDB.saveEvents(events);
      }
      return { id, org_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["events", data.org_id] });
    },
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      event_id,
      member_id,
      method,
      status = "present",
      attempt_lat,
      attempt_lng,
      distance_meters,
    }: {
      event_id: string;
      member_id: string;
      method: "manual" | "qr" | "self" | "online_confirm";
      status?: "present" | "attempted" | "mismatch";
      attempt_lat?: number;
      attempt_lng?: number;
      distance_meters?: number;
    }) => {
      // Also save to a local backup so UI can retrieve geolocation/status details easily
      const backupKey = `event_att_detail_${event_id}_${member_id}`;
      localStorage.setItem(backupKey, JSON.stringify({
        status,
        attempt_lat,
        attempt_lng,
        distance_meters,
        check_in_method: method,
        check_in_time: new Date().toISOString()
      }));

      if (isSupabaseConfigured) {
        try {
          // Attempt insertion with extra columns if columns are present in schema
          const { error } = await supabase.from("event_attendance").insert({
            event_id,
            member_id,
            check_in_method: method === "online_confirm" ? "self" : (method as any),
            check_in_time: new Date().toISOString(),
            status,
            attempt_lat,
            attempt_lng,
            distance_meters,
          });
          if (error) {
            // fallback to standard columns if table schema doesn't have custom columns
            const { error: fallbackError } = await supabase.from("event_attendance").insert({
              event_id,
              member_id,
              check_in_method: method === "online_confirm" ? "self" : (method as any),
              check_in_time: new Date().toISOString(),
            });
            if (fallbackError) console.warn("Supabase event_attendance insert warning:", fallbackError);
          }

          // update attendees count in events
          const { data: ev } = await supabase
            .from("events")
            .select("attendees_count, org_id")
            .eq("id", event_id)
            .single();
          if (ev) {
            await supabase
              .from("events")
              .update({ attendees_count: (ev.attendees_count || 0) + 1 })
              .eq("id", event_id);
            return { org_id: ev.org_id, event_id };
          }
        } catch (e) {
          console.warn("Supabase event_attendance error, using local fallback:", e);
        }
        return { org_id: "", event_id };
      }
      await delay();
      const events = MockDB.getEvents();
      const idx = events.findIndex((e) => e.id === event_id);
      if (idx !== -1) {
        events[idx].attendees_count += 1;
        MockDB.saveEvents(events);

        // Save local event attendance record
        const att = MockDB.getEventAttendance();
        // Remove existing to avoid duplicates
        const cleanedAtt = att.filter(a => !(a.event_id === event_id && a.member_id === member_id));
        cleanedAtt.push({
          id: `att-${Date.now()}`,
          event_id,
          member_id,
          check_in_time: new Date().toISOString(),
          check_in_method: method,
          status,
          attempt_lat,
          attempt_lng,
          distance_meters,
        });
        MockDB.saveEventAttendance(cleanedAtt);

        return { org_id: events[idx].org_id, event_id };
      }
      return { org_id: "", event_id };
    },
    onSuccess: (res) => {
      if (res.org_id)
        queryClient.invalidateQueries({ queryKey: ["events", res.org_id] });
      queryClient.invalidateQueries({
        queryKey: ["event_attendance", res.event_id],
      });
    },
  });
}

// ==========================================
// 4. MEETINGS HOOKS
// ==========================================
export function useMeetings(orgId: string | undefined) {
  return useQuery({
    queryKey: ["meetings", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      if (isSupabaseConfigured) {
        let sbMeetings: Meeting[] = [];
        try {
          const { data, error } = await supabase
            .from("meetings")
            .select("*")
            .eq("org_id", orgId)
            .order("date_time", { ascending: false });
          if (!error && data) {
            sbMeetings = data as Meeting[];
          }
        } catch (dbErr) {
          console.warn("Supabase fetch meetings error:", dbErr);
        }

        const localMeetings = MockDB.getMeetings().filter((m) => m.org_id === orgId);
        const resultMap = new Map<string, Meeting>();
        localMeetings.forEach((m) => resultMap.set(m.id, m));
        sbMeetings.forEach((m) => resultMap.set(m.id, m));

        const unsynced = localMeetings.filter((m) => !sbMeetings.some((s) => s.id === m.id));
        if (unsynced.length > 0) {
          try {
            await supabase.from("meetings").upsert(unsynced);
          } catch (syncErr) {
            console.warn("[Meetings Supabase Sync] Failed to sync local meetings:", syncErr);
          }
        }
        return Array.from(resultMap.values());
      }
      await delay();
      return MockDB.getMeetings().filter((m) => m.org_id === orgId);
    },
    enabled: !!orgId,
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<Meeting, "id" | "status">) => {
      if (new Date(payload.date_time) < new Date()) {
        throw new Error("Meeting date must be in the future.");
      }
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("meetings")
          .insert({ ...payload, status: "scheduled" })
          .select()
          .single();
        if (error) throw error;
        return data as Meeting;
      }
      await delay();
      const meetings = MockDB.getMeetings();
      const newMeet: Meeting = {
        ...payload,
        id: "meet-" + Math.random().toString(36).substr(2, 9),
        status: "scheduled",
      };
      meetings.push(newMeet);
      MockDB.saveMeetings(meetings);
      return newMeet;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["meetings", data.org_id] });
    },
  });
}

export function useUpdateMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Partial<Meeting> & { id: string; org_id: string },
    ) => {
      if (isSupabaseConfigured) {
        const { id, ...rest } = payload;
        const { data, error } = await supabase
          .from("meetings")
          .update(rest)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data as Meeting;
      }
      await delay();
      const meetings = MockDB.getMeetings();
      const idx = meetings.findIndex((m) => m.id === payload.id);
      if (idx !== -1) {
        meetings[idx] = { ...meetings[idx], ...payload };
        MockDB.saveMeetings(meetings);
        return meetings[idx];
      }
      throw new Error("Meeting not found");
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["meetings", data.org_id] });
    },
  });
}

// ==========================================
// 5. NEWS / BLOG POSTS HOOKS
// ==========================================
export function useNews(orgId: string | undefined) {
  return useQuery({
    queryKey: ["news", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      if (isSupabaseConfigured) {
        let sbPosts: NewsPost[] = [];
        try {
          const { data, error } = await supabase
            .from("news_posts")
            .select("*")
            .eq("org_id", orgId)
            .order("is_pinned", { ascending: false })
            .order("published_at", { ascending: false });
          if (!error && data) {
            sbPosts = data as NewsPost[];
          }
        } catch (dbErr) {
          console.warn("Supabase fetch news error:", dbErr);
        }

        const localPosts = MockDB.getNews().filter((p) => p.org_id === orgId);
        const resultMap = new Map<string, NewsPost>();
        localPosts.forEach((p) => resultMap.set(p.id, p));
        sbPosts.forEach((p) => resultMap.set(p.id, p));

        const unsynced = localPosts.filter((p) => !sbPosts.some((s) => s.id === p.id));
        if (unsynced.length > 0) {
          try {
            await supabase.from("news_posts").upsert(unsynced);
          } catch (syncErr) {
            console.warn("[News Supabase Sync] Failed to sync local news:", syncErr);
          }
        }
        return Array.from(resultMap.values());
      }
      await delay();
      return MockDB.getNews().filter((p) => p.org_id === orgId);
    },
    enabled: !!orgId,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Omit<NewsPost, "id" | "likes_count" | "comments_count">,
    ) => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("news_posts")
          .insert({
            ...payload,
            likes_count: 0,
            comments_count: 0,
            published_at: payload.published_at || new Date().toISOString(),
          })
          .select()
          .single();
        if (error) throw error;
        return data as NewsPost;
      }
      await delay();
      const news = MockDB.getNews();
      const newPost: NewsPost = {
        ...payload,
        id: "news-" + Math.random().toString(36).substr(2, 9),
        likes_count: 0,
        comments_count: 0,
        published_at: payload.published_at || new Date().toISOString(),
      };
      news.push(newPost);
      MockDB.saveNews(news);
      return newPost;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["news", data.org_id] });
    },
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Partial<NewsPost> & { id: string; org_id: string },
    ) => {
      const last_edited_at = new Date().toISOString();
      if (isSupabaseConfigured) {
        const { id, ...rest } = payload;
        try {
          const { data, error } = await supabase
            .from("news_posts")
            .update({ ...rest, last_edited_at })
            .eq("id", id)
            .select()
            .single();
          if (error) throw error;
          return data as NewsPost;
        } catch (dbErr: any) {
          if (
            dbErr.code === "PGRST204" ||
            dbErr.message?.includes("last_edited_at") ||
            dbErr.message?.includes("is_deleted")
          ) {
            const { data, error } = await supabase
              .from("news_posts")
              .update(rest)
              .eq("id", id)
              .select()
              .single();
            if (error) throw error;
            return data as NewsPost;
          }
          throw dbErr;
        }
      }
      await delay();
      const news = MockDB.getNews();
      const idx = news.findIndex((p) => p.id === payload.id);
      if (idx !== -1) {
        news[idx] = { ...news[idx], ...payload, last_edited_at };
        MockDB.saveNews(news);
        return news[idx];
      }
      throw new Error("News post not found.");
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["news", data.org_id] });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, org_id }: { id: string; org_id: string }) => {
      const last_edited_at = new Date().toISOString();
      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase
            .from("news_posts")
            .update({ is_deleted: true, last_edited_at })
            .eq("id", id);
          if (error) throw error;
        } catch (dbErr: any) {
          if (
            dbErr.code === "PGRST204" ||
            dbErr.message?.includes("is_deleted") ||
            dbErr.message?.includes("last_edited_at")
          ) {
            const { error } = await supabase
              .from("news_posts")
              .delete()
              .eq("id", id);
            if (error) throw error;
          } else {
            throw dbErr;
          }
        }
        return { id, org_id };
      }
      await delay();
      const news = MockDB.getNews();
      const idx = news.findIndex((p) => p.id === id);
      if (idx !== -1) {
        news[idx] = { ...news[idx], is_deleted: true, last_edited_at };
        MockDB.saveNews(news);
      }
      return { id, org_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["news", data.org_id] });
    },
  });
}

// ==========================================
// 6. CHAT MESSAGES HOOKS
// ==========================================
export function useChatChannels(orgId: string | undefined) {
  return useQuery({
    queryKey: ["channels", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("chat_channels")
            .select("*")
            .eq("org_id", orgId);
          if (!error && data && data.length > 0) {
            return data as ChatChannel[];
          }
        } catch (err) {
          console.warn("[ChatChannels] Fetch notice:", err);
        }
      }
      await delay();
      return MockDB.getChannels().filter((c) => c.org_id === orgId);
    },
    enabled: !!orgId,
  });
}

export function useChatMessages(channelId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!channelId || !isSupabaseConfigured) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      const channelName = `chat_rt_${channelId}_${Math.random().toString(36).substring(2, 9)}`;
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "chat_messages", filter: `channel_id=eq.${channelId}` },
          () => queryClient.invalidateQueries({ queryKey: ["messages", channelId] })
        )
        .subscribe();
    } catch (err) {
      console.warn("[Realtime] Chat messages subscribe notice:", err);
    }
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [channelId, queryClient]);

  return useQuery({
    queryKey: ["messages", channelId],
    queryFn: async () => {
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("chat_messages")
            .select("*, sender:sender_id(full_name, avatar_url)")
            .eq("channel_id", channelId)
            .order("created_at", { ascending: false })
            .limit(100);
          if (!error && data) {
            const sorted = (data || []).reverse();
            return sorted.map((m: any) => ({
              ...m,
              sender_name: m.sender?.full_name || "Unknown User",
              sender_avatar: m.sender?.avatar_url || "",
            })) as ChatMessage[];
          }
        } catch (err) {
          console.warn("[ChatMessages] Fetch notice:", err);
        }
      }
      await delay(100); // lower delay for crisp chatting click
      const filtered = MockDB.getMessages().filter(
        (m) => m.channel_id === channelId,
      );
      return filtered.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    },
    enabled: !!channelId,
    refetchInterval: 3000, // Bulletproof real-time fallback
  });
}

export function useCreateChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      orgId: string;
      name: string;
      type: "group" | "announcement" | "direct";
      channel_type?: string;
      is_private?: boolean;
      createdBy: string;
      member_ids?: string[];
    }) => {
      const channelId = "chan-" + Math.random().toString(36).substring(2, 9);
      const newChannel: ChatChannel = {
        id: channelId,
        org_id: payload.orgId,
        name: payload.name,
        type: payload.type,
        channel_type: (payload.channel_type as any) || "general",
        is_private: payload.is_private || false,
        created_by: payload.createdBy,
        member_ids: payload.member_ids || [],
      };

      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("chat_channels")
          .insert({
            org_id: payload.orgId,
            name: payload.name,
            type: payload.type,
            channel_type: payload.channel_type || "general",
            is_private: payload.is_private || false,
            created_by: payload.createdBy,
          })
          .select()
          .single();
        if (error) throw error;
        return data as ChatChannel;
      }
      await delay(150);
      const chans = MockDB.getChannels();
      chans.push(newChannel);
      MockDB.saveChannels(chans);
      return newChannel;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["channels", data.org_id] });
    },
  });
}

export function useSendChatMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      channelId,
      senderId,
      text,
      senderName,
      message_type = "text",
      file_url,
      file_name,
      file_size,
      file_mime_type,
      voice_duration_seconds,
      reply_to_id,
    }: {
      channelId: string;
      senderId: string;
      text: string;
      senderName: string;
      message_type?: "text" | "file" | "image" | "voice" | "poll" | "system";
      file_url?: string;
      file_name?: string;
      file_size?: number;
      file_mime_type?: string;
      voice_duration_seconds?: number;
      reply_to_id?: string;
    }) => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("chat_messages")
          .insert({
            channel_id: channelId,
            sender_id: senderId,
            text,
            message_type,
            file_url,
            file_name,
            file_size,
            file_mime_type,
            voice_duration_seconds,
            reply_to_id,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (error) throw error;
        return { ...data, channel_id: channelId };
      }
      await delay(100);
      const messages = MockDB.getMessages();
      const newMsg: ChatMessage = {
        id: "msg-" + Math.random().toString(36).substring(2, 9),
        channel_id: channelId,
        sender_id: senderId,
        text,
        message_type,
        file_url,
        file_name,
        file_size,
        file_mime_type,
        voice_duration_seconds,
        reply_to_id,
        sender_name: senderName,
        sender_avatar: "",
        created_at: new Date().toISOString(),
      };
      messages.push(newMsg);
      MockDB.saveMessages(messages);
      return { ...newMsg, channel_id: channelId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", data.channel_id],
      });
    },
  });
}

// ==========================================
// 7. GOALS TO TRACK HOOKS
// ==========================================
export function useGoals(orgId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!orgId || !isSupabaseConfigured) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      const channelName = `goals_rt_${orgId}_${Math.random().toString(36).substring(2, 9)}`;
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "goals", filter: `org_id=eq.${orgId}` },
          () => queryClient.invalidateQueries({ queryKey: ["goals", orgId] })
        )
        .subscribe();
    } catch (err) {
      console.warn("[Realtime] Goals subscribe notice:", err);
    }
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [orgId, queryClient]);

  return useQuery({
    queryKey: ["goals", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      if (isSupabaseConfigured) {
        let sbGoals: Goal[] = [];
        try {
          const { data, error } = await supabase
            .from("goals")
            .select("*")
            .eq("org_id", orgId)
            .order("deadline", { ascending: true });
          if (!error && data) {
            sbGoals = data as Goal[];
          }
        } catch (dbErr) {
          console.warn("Supabase fetch goals error:", dbErr);
        }

        const localGoals = MockDB.getGoals().filter((g) => g.org_id === orgId);
        const resultMap = new Map<string, Goal>();
        localGoals.forEach((g) => resultMap.set(g.id, g));
        sbGoals.forEach((g) => resultMap.set(g.id, g));

        const unsynced = localGoals.filter((g) => !sbGoals.some((s) => s.id === g.id));
        if (unsynced.length > 0) {
          try {
            await supabase.from("goals").upsert(unsynced);
          } catch (syncErr) {
            console.warn("[Goals Supabase Sync] Failed to sync local goals:", syncErr);
          }
        }
        return Array.from(resultMap.values());
      }
      await delay();
      return MockDB.getGoals().filter((g) => g.org_id === orgId);
    },
    enabled: !!orgId,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Omit<Goal, "id" | "created_at"> & { current_progress?: number },
    ) => {
      const startProg =
        payload.current_progress !== undefined ? payload.current_progress : 0;
      let createdGoal: Goal | null = null;
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("goals")
            .insert({
              ...payload,
              current_progress: startProg,
              created_at: new Date().toISOString(),
            })
            .select()
            .single();
          if (error) throw error;
          createdGoal = data as Goal;
        } catch (dbErr) {
          console.warn("Supabase create goal error, using local fallback:", dbErr);
        }
      }
      if (!createdGoal) {
        await delay();
        const goals = MockDB.getGoals();
        const newGoal: Goal = {
          ...payload,
          id: "goal-" + Math.random().toString(36).substr(2, 9),
          current_progress: startProg,
          created_at: new Date().toISOString(),
        };
        goals.push(newGoal);
        MockDB.saveGoals(goals);
        createdGoal = newGoal;
      }

      try {
        recordSystemAuditEvent({
          org_id: payload.org_id,
          action: "goal.created",
          action_label: `Record Created: Strategic goal '${payload.title}' established`,
          target_table: "goals",
          target_id: createdGoal.id,
          target_label: payload.title,
          new_value: { title: payload.title, target: payload.target, current_progress: startProg, unit: payload.unit },
        });
      } catch (logErr) {
        console.warn("[Audit] Failed to log goal creation:", logErr);
      }

      return createdGoal;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["goals", data.org_id] });
      queryClient.invalidateQueries({ queryKey: ["audit_logs", data.org_id] });
    },
  });
}

export function useUpdateGoalProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      goalId,
      value,
      note,
      orgId,
    }: {
      goalId: string;
      value: number;
      note?: string;
      orgId: string;
    }) => {
      const goals = MockDB.getGoals();
      const oldGoal = goals.find((g) => g.id === goalId);

      if (isSupabaseConfigured) {
        let data: any = null;
        let error: any = null;
        try {
          // Attempt to update with the last_note field
          const res = await supabase
            .from("goals")
            .update({ current_progress: value, last_note: note })
            .eq("id", goalId)
            .select()
            .single();
          data = res.data;
          error = res.error;
        } catch (dbErr) {
          // Fallback to updating only current_progress if last_note is missing on the table
          const res = await supabase
            .from("goals")
            .update({ current_progress: value })
            .eq("id", goalId)
            .select()
            .single();
          data = res.data;
          error = res.error;
        }

        if (error) throw error;

        // Optionally record in goal_updates
        await supabase.from("goal_updates").insert({
          goal_id: goalId,
          value,
          note,
          created_at: new Date().toISOString(),
        });

        // Add note metadata locally on the returned object
        if (data) {
          data.last_note = note;
        }
      }
      await delay();
      const idx = goals.findIndex((g) => g.id === goalId);
      if (idx !== -1) {
        goals[idx].current_progress = value;
        goals[idx].last_note = note;
        MockDB.saveGoals(goals);
      }

      try {
        recordSystemAuditEvent({
          org_id: orgId,
          action: "goal.updated",
          action_label: `Record Edited: Goal progress updated to ${value}`,
          target_table: "goals",
          target_id: goalId,
          target_label: oldGoal?.title || goalId,
          old_value: oldGoal ? { current_progress: oldGoal.current_progress, note: oldGoal.last_note } : null,
          new_value: { current_progress: value, note },
        });
      } catch (logErr) {
        console.warn("[Audit] Failed to log goal progress update:", logErr);
      }

      return { goalId, orgId };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["goals", res.orgId] });
      queryClient.invalidateQueries({ queryKey: ["audit_logs", res.orgId] });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Partial<Goal> & { id: string; org_id: string },
    ) => {
      const { id, org_id, ...updates } = payload;
      const last_edited_at = new Date().toISOString();
      const goals = MockDB.getGoals();
      const oldGoal = goals.find((g) => g.id === id);

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("goals")
            .update({ ...updates, last_edited_at })
            .eq("id", id)
            .select()
            .single();
          if (error) throw error;
          return data as Goal;
        } catch (dbErr: any) {
          if (
            dbErr.code === "PGRST204" ||
            dbErr.message?.includes("last_edited_at")
          ) {
            const { data, error } = await supabase
              .from("goals")
              .update(updates)
              .eq("id", id)
              .select()
              .single();
            if (error) throw error;
            return data as Goal;
          }
          throw dbErr;
        }
      }
      await delay();
      const idx = goals.findIndex((g) => g.id === id);
      let resGoal: Goal;
      if (idx !== -1) {
        goals[idx] = { ...goals[idx], ...updates, last_edited_at };
        MockDB.saveGoals(goals);
        resGoal = goals[idx];
      } else {
        throw new Error("Goal not found");
      }

      try {
        recordSystemAuditEvent({
          org_id: org_id,
          action: "goal.updated",
          action_label: `Record Edited: Goal '${updates.title || oldGoal?.title || id}' modified`,
          target_table: "goals",
          target_id: id,
          target_label: updates.title || oldGoal?.title || id,
          old_value: oldGoal ? { title: oldGoal.title, target: oldGoal.target } : null,
          new_value: updates,
        });
      } catch (logErr) {
        console.warn("[Audit] Failed to log goal update:", logErr);
      }

      return resGoal;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["goals", data.org_id] });
      queryClient.invalidateQueries({ queryKey: ["audit_logs", data.org_id] });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, org_id }: { id: string; org_id: string }) => {
      const last_edited_at = new Date().toISOString();
      const goals = MockDB.getGoals();
      const oldGoal = goals.find((g) => g.id === id);

      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase
            .from("goals")
            .update({ is_deleted: true, last_edited_at })
            .eq("id", id);
          if (error) throw error;
        } catch (dbErr: any) {
          if (
            dbErr.code === "PGRST204" ||
            dbErr.message?.includes("is_deleted") ||
            dbErr.message?.includes("last_edited_at")
          ) {
            const { error } = await supabase
              .from("goals")
              .delete()
              .eq("id", id);
            if (error) throw error;
          } else {
            throw dbErr;
          }
        }
      }
      await delay();
      const idx = goals.findIndex((g) => g.id === id);
      if (idx !== -1) {
        goals[idx] = { ...goals[idx], is_deleted: true, last_edited_at };
        MockDB.saveGoals(goals);
      }

      try {
        recordSystemAuditEvent({
          org_id: org_id,
          action: "goal.deleted",
          action_label: `Record Deleted: Goal '${oldGoal?.title || id}' removed`,
          target_table: "goals",
          target_id: id,
          target_label: oldGoal?.title || id,
          old_value: oldGoal ? { title: oldGoal.title, target: oldGoal.target } : null,
          new_value: null,
        });
      } catch (logErr) {
        console.warn("[Audit] Failed to log goal deletion:", logErr);
      }

      return { id, org_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["goals", data.org_id] });
      queryClient.invalidateQueries({ queryKey: ["audit_logs", data.org_id] });
    },
  });
}

// ==========================================
// 8. GRANTS HOOKS
// ==========================================
export function useGrants(orgId: string | undefined) {
  return useQuery({
    queryKey: ["grants", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      let sbGrants: Grant[] = [];
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("grants")
            .select("*")
            .eq("org_id", orgId)
            .order("deadline", { ascending: true });
          if (!error && data) {
            sbGrants = data as Grant[];
          }
        } catch (err) {
          console.warn("Supabase fetch grants error:", err);
        }
      }

      const localGrants = MockDB.getGrants().filter((g) => g.org_id === orgId);
      const grantMap = new Map<string, Grant>();
      localGrants.forEach((g) => grantMap.set(g.id, g));
      sbGrants.forEach((g) => grantMap.set(g.id, g));

      const unsyncedGrants = localGrants.filter((g) => !sbGrants.some((s) => s.id === g.id));
      if (isSupabaseConfigured && unsyncedGrants.length > 0) {
        try {
          await supabase.from("grants").upsert(unsyncedGrants);
        } catch (syncErr) {
          console.warn("[Grants Supabase Sync] Failed to sync local grants:", syncErr);
        }
      }

      return Array.from(grantMap.values());
    },
    enabled: !!orgId,
  });
}

export function useCreateGrant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<Grant, "id">) => {
      const newGrant: Grant = {
        ...payload,
        id: "grant-" + Math.random().toString(36).substr(2, 9),
      };

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("grants")
            .insert(payload)
            .select();
          if (error) {
            console.warn("Supabase insert grant warning, using local fallback:", error);
          } else if (data && data.length > 0) {
            newGrant.id = data[0].id;
          }
        } catch (dbErr) {
          console.warn("Supabase insert grant error, fallback to local:", dbErr);
        }
      }

      const grants = MockDB.getGrants();
      grants.push(newGrant);
      MockDB.saveGrants(grants);

      try {
        recordSystemAuditEvent({
          org_id: payload.org_id,
          action: "grant.created",
          action_label: `Record Created: Grant proposal registered`,
          target_table: "grants",
          target_id: newGrant.id,
          target_label: payload.title,
          new_value: { title: payload.title, funder: payload.funder, amount_range: payload.amount_range, currency: payload.currency, status: payload.status },
        });
      } catch (logErr) {
        console.warn("[Audit] Failed to log grant creation:", logErr);
      }

      return newGrant;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["grants", data.org_id] });
      queryClient.invalidateQueries({ queryKey: ["grants"] });
      queryClient.invalidateQueries({ queryKey: ["audit_logs", data.org_id] });
    },
  });
}

export function useUpdateGrantStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      grantId,
      status,
      orgId,
    }: {
      grantId: string;
      status: Grant["status"];
      orgId: string;
    }) => {
      const grants = MockDB.getGrants();
      const oldGrant = grants.find((g) => g.id === grantId);

      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase
            .from("grants")
            .update({ status })
            .eq("id", grantId);
          if (error) console.warn("Supabase update grant error:", error);
        } catch (err) {
          console.warn("Supabase update grant error fallback:", err);
        }
      }
      const idx = grants.findIndex((g) => g.id === grantId);
      if (idx !== -1) {
        grants[idx].status = status;
        MockDB.saveGrants(grants);
      } else if (!isSupabaseConfigured) {
        await delay();
      }

      try {
        recordSystemAuditEvent({
          org_id: orgId,
          action: "grant.updated",
          action_label: `Record Edited: Grant status changed to ${status}`,
          target_table: "grants",
          target_id: grantId,
          target_label: oldGrant?.title || grantId,
          old_value: oldGrant ? { status: oldGrant.status } : null,
          new_value: { status },
        });
      } catch (logErr) {
        console.warn("[Audit] Failed to log grant status update:", logErr);
      }

      return { grantId, status, orgId };
    },
    onSuccess: (res, variables) => {
      const targetOrg = res?.orgId || variables.orgId;
      queryClient.invalidateQueries({ queryKey: ["grants", targetOrg] });
      queryClient.invalidateQueries({ queryKey: ["grants"] });
      queryClient.invalidateQueries({ queryKey: ["audit_logs", targetOrg] });
    },
  });
}

// ==========================================
// 9. BOOKKEEPING LEDGER HOOKS
// ==========================================
export function useLedgerEntries(orgId: string | undefined) {
  return useQuery({
    queryKey: ["ledger", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      if (isSupabaseConfigured) {
        let sbLedger: LedgerEntry[] = [];
        try {
          const { data, error } = await supabase
            .from("ledger_entries")
            .select("*")
            .eq("org_id", orgId)
            .order("date", { ascending: false });
          if (!error && data) {
            sbLedger = data as LedgerEntry[];
          }
        } catch (dbErr) {
          console.warn("Supabase fetch ledger error:", dbErr);
        }

        const localLedger = MockDB.getLedger().filter((l) => l.org_id === orgId);
        const resultMap = new Map<string, LedgerEntry>();
        localLedger.forEach((l) => resultMap.set(l.id, l));
        sbLedger.forEach((l) => resultMap.set(l.id, l));

        const unsynced = localLedger.filter((l) => !sbLedger.some((s) => s.id === l.id));
        if (unsynced.length > 0) {
          try {
            await supabase.from("ledger_entries").upsert(unsynced);
          } catch (syncErr) {
            console.warn("[Ledger Supabase Sync] Failed to sync local ledger:", syncErr);
          }
        }
        return Array.from(resultMap.values());
      }
      await delay();
      return MockDB.getLedger().filter((l) => l.org_id === orgId);
    },
    enabled: !!orgId,
  });
}

export function useCreateLedgerEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<LedgerEntry, "id">) => {
      let createdEntry: LedgerEntry | null = null;
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("ledger_entries")
            .insert(payload)
            .select()
            .single();
          if (error) throw error;
          createdEntry = data as LedgerEntry;
        } catch (dbErr) {
          console.warn("Supabase ledger_entries insert failed or RLS blocked, falling back to local entry:", dbErr);
        }
      }
      if (!createdEntry) {
        await delay();
        const ledger = MockDB.getLedger();
        const newEntry: LedgerEntry = {
          ...payload,
          id: "led-" + Math.random().toString(36).substr(2, 9),
        };
        ledger.push(newEntry);
        MockDB.saveLedger(ledger);
        createdEntry = newEntry;
      }

      try {
        recordSystemAuditEvent({
          org_id: payload.org_id,
          action: "ledger_entry.created",
          action_label: `Record Created: ${payload.type === "income" ? "Income" : "Expense"} of ${payload.amount} ${payload.currency || "RWF"}`,
          target_table: "ledger_entries",
          target_id: createdEntry.id,
          target_label: payload.description || "Ledger Entry",
          new_value: { type: payload.type, amount: payload.amount, currency: payload.currency, category: payload.category, description: payload.description, date: payload.date },
        });
      } catch (logErr) {
        console.warn("[Audit] Failed to log ledger creation:", logErr);
      }

      return createdEntry;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ledger", data.org_id] });
      queryClient.invalidateQueries({ queryKey: ["audit_logs", data.org_id] });
    },
  });
}

export function useUpdateLedgerEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<LedgerEntry> & { id: string; org_id: string }) => {
      const { id, org_id, ...updates } = payload;
      const ledger = MockDB.getLedger();
      const oldEntry = ledger.find((l) => l.id === id);

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("ledger_entries")
            .update(updates)
            .eq("id", id)
            .select()
            .single();
          if (error) throw error;
          return data as LedgerEntry;
        } catch (dbErr) {
          console.warn("Supabase ledger update failed, falling back to local:", dbErr);
        }
      }
      await delay();
      const idx = ledger.findIndex((l) => l.id === id);
      let resEntry: LedgerEntry;
      if (idx !== -1) {
        ledger[idx] = { ...ledger[idx], ...updates };
        MockDB.saveLedger(ledger);
        resEntry = ledger[idx];
      } else {
        resEntry = { id, org_id, ...updates } as LedgerEntry;
      }

      try {
        recordSystemAuditEvent({
          org_id: org_id,
          action: "ledger_entry.updated",
          action_label: `Record Edited: Ledger transaction updated`,
          target_table: "ledger_entries",
          target_id: id,
          target_label: updates.description || oldEntry?.description || id,
          old_value: oldEntry ? { amount: oldEntry.amount, type: oldEntry.type, description: oldEntry.description } : null,
          new_value: updates,
        });
      } catch (logErr) {
        console.warn("[Audit] Failed to log ledger update:", logErr);
      }

      return resEntry;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ledger", data.org_id] });
      queryClient.invalidateQueries({ queryKey: ["audit_logs", data.org_id] });
    },
  });
}

export function useDeleteLedgerEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, org_id }: { id: string; org_id: string }) => {
      const ledger = MockDB.getLedger();
      const oldEntry = ledger.find((l) => l.id === id);

      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase
            .from("ledger_entries")
            .delete()
            .eq("id", id);
          if (error) throw error;
        } catch (dbErr) {
          console.warn("Supabase ledger delete failed, falling back to local:", dbErr);
        }
      }
      await delay();
      const updated = ledger.filter((l) => l.id !== id);
      MockDB.saveLedger(updated);

      try {
        recordSystemAuditEvent({
          org_id: org_id,
          action: "ledger_entry.deleted",
          action_label: `Record Deleted: Ledger transaction deleted`,
          target_table: "ledger_entries",
          target_id: id,
          target_label: oldEntry?.description || id,
          old_value: oldEntry ? { amount: oldEntry.amount, type: oldEntry.type, description: oldEntry.description } : null,
          new_value: null,
        });
      } catch (logErr) {
        console.warn("[Audit] Failed to log ledger deletion:", logErr);
      }

      return { id, org_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ledger", data.org_id] });
      queryClient.invalidateQueries({ queryKey: ["audit_logs", data.org_id] });
    },
  });
}

// ==========================================
// 10. DONATIONS PORTAL HOOKS
// ==========================================
export function useDonations(orgId: string | undefined) {
  return useQuery({
    queryKey: ["donations", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      let sbDonations: Donation[] = [];
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("donations")
            .select("*")
            .eq("org_id", orgId)
            .order("created_at", { ascending: false });
          if (!error && data) {
            sbDonations = data as Donation[];
          }
        } catch (err) {
          console.warn("Supabase fetch donations error:", err);
        }
      }

      const localDonations = MockDB.getDonations().filter((d) => d.org_id === orgId);
      const donMap = new Map<string, Donation>();
      localDonations.forEach((d) => donMap.set(d.id, d));
      sbDonations.forEach((d) => donMap.set(d.id, d));

      const unsyncedDonations = localDonations.filter((d) => !sbDonations.some((s) => s.id === d.id));
      if (isSupabaseConfigured && unsyncedDonations.length > 0) {
        try {
          await supabase.from("donations").upsert(unsyncedDonations);
        } catch (syncErr) {
          console.warn("[Donations Supabase Sync] Failed to sync local donations:", syncErr);
        }
      }

      return Array.from(donMap.values());
    },
    enabled: !!orgId,
  });
}

export function useConfirmDonation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      donationId,
      status,
      orgId,
    }: {
      donationId: string;
      status: "confirmed" | "rejected";
      orgId: string;
    }) => {
      const localDonations = MockDB.getDonations();
      const localIdx = localDonations.findIndex((d) => d.id === donationId);
      let amount = localIdx !== -1 ? localDonations[localIdx].amount : 0;
      let donorName = localIdx !== -1 ? localDonations[localIdx].donor_name : "Anonymous";

      if (isSupabaseConfigured) {
        try {
          // Fetch existing donation record first so we are 100% sure we have amount and donor_name
          const { data: fetchDonation } = await supabase
            .from("donations")
            .select("*")
            .eq("id", donationId)
            .maybeSingle();

          if (fetchDonation) {
            amount = Number(fetchDonation.amount || amount || 0);
            donorName = fetchDonation.donor_name || donorName;
          }

          const { data, error } = await supabase
            .from("donations")
            .update({ status })
            .eq("id", donationId)
            .select();

          if (error) console.warn("Supabase update donation error:", error);

          if (data && data.length > 0) {
            amount = Number(data[0].amount || amount || 0);
            donorName = data[0].donor_name || donorName;
          }

          // If approved, log as ledger record automatically with actual amount!
          if (status === "confirmed") {
            const { error: ledgerErr } = await supabase.from("ledger_entries").insert({
              org_id: orgId,
              type: "income",
              amount: amount,
              currency: "RWF",
              category: "donation",
              description: `Donation by ${donorName} via MoMo`,
              date: new Date().toISOString().split("T")[0],
              reference: `DON-${donationId.slice(0, 8)}`,
            });
            if (ledgerErr) console.warn("Supabase ledger entry error:", ledgerErr);
          }
        } catch (dbErr) {
          console.warn("Supabase confirm donation fallback to local DB:", dbErr);
        }
      }

      // Sync local MockDB so both local state & Supabase stay perfectly matched
      if (localIdx !== -1) {
        localDonations[localIdx].status = status;
        MockDB.saveDonations(localDonations);

        if (status === "confirmed") {
          const ledger = MockDB.getLedger();
          const alreadyExists = ledger.some(
            (l) => l.reference === `DON-${donationId.slice(0, 8)}` || l.reference === `DON-${donationId.slice(0, 4)}`
          );
          if (!alreadyExists) {
            ledger.push({
              id: "led-" + Math.random().toString(36).substr(2, 9),
              org_id: orgId,
              type: "income",
              amount: amount || localDonations[localIdx].amount || 0,
              currency: "RWF",
              category: "donation",
              description: `Donation by ${donorName} (#${donationId.slice(0, 4)})`,
              date: new Date().toISOString().split("T")[0],
              reference: `DON-${donationId.slice(0, 8)}`,
            });
            MockDB.saveLedger(ledger);
          }
        }
      } else if (!isSupabaseConfigured) {
        await delay();
      }

      return { donationId, status, orgId };
    },
    onSuccess: (res, variables) => {
      const targetOrg = res?.orgId || variables.orgId;
      queryClient.invalidateQueries({ queryKey: ["donations", targetOrg] });
      queryClient.invalidateQueries({ queryKey: ["donations"] });
      queryClient.invalidateQueries({ queryKey: ["ledger", targetOrg] });
      queryClient.invalidateQueries({ queryKey: ["ledger"] });
    },
  });
}

export function useCreateDonation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Omit<Donation, "id" | "status" | "created_at">,
    ) => {
      const newDon: Donation = {
        ...payload,
        id: "don-" + Math.random().toString(36).substr(2, 9),
        status: "awaiting_approval",
        created_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("donations")
            .insert({
              ...payload,
              status: "awaiting_approval",
              created_at: newDon.created_at,
            })
            .select();
          if (error) {
            console.warn("Supabase insert donation error, using local fallback:", error);
          } else if (data && data.length > 0) {
            newDon.id = data[0].id;
          }
        } catch (dbErr) {
          console.warn("Supabase insert donation error, fallback to local:", dbErr);
        }
      }

      const donations = MockDB.getDonations();
      donations.push(newDon);
      MockDB.saveDonations(donations);

      return newDon;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["donations", data.org_id] });
      queryClient.invalidateQueries({ queryKey: ["donations"] });
    },
  });
}

// ==========================================
// 11. ERROR REPORTING HOOKS
// ==========================================
export function useErrorReports(orgId: string | undefined) {
  return useQuery({
    queryKey: ["errors", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("error_reports")
            .select("*")
            .eq("org_id", orgId)
            .order("created_at", { ascending: false })
            .limit(100);
          if (!error && data) {
            return data as ErrorReport[];
          }
        } catch (err) {
          console.warn("[ErrorReports] Fetch notice:", err);
        }
      }
      await delay();
      return MockDB.getErrors().filter((e) => e.org_id === orgId);
    },
    enabled: !!orgId,
    refetchInterval: 30000,
  });
}

export function useSubmitErrorReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Omit<ErrorReport, "id" | "status" | "created_at">,
    ) => {
      const newErr: ErrorReport = {
        ...payload,
        id: "err-" + Math.random().toString(36).substr(2, 9),
        status: "open",
        created_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("error_reports")
            .insert({
              ...payload,
              status: "open",
              created_at: newErr.created_at,
            })
            .select();
          if (error) {
            console.warn("Supabase insert error report warning:", error);
          } else if (data && data.length > 0) {
            newErr.id = data[0].id;
          }
        } catch (dbErr) {
          console.warn("Supabase insert error report error:", dbErr);
        }
      }

      const errors = MockDB.getErrors();
      errors.push(newErr);
      MockDB.saveErrors(errors);

      return newErr;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["platform-data"] });
      queryClient.invalidateQueries({ queryKey: ["errors"] });
      queryClient.invalidateQueries({ queryKey: ["errors", data.org_id] });
    },
  });
}

export function useResolveErrorReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("error_reports")
          .update({ status: "resolved" })
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data as ErrorReport;
      }
      await delay();
      const errors = MockDB.getErrors();
      const idx = errors.findIndex((e) => e.id === id);
      if (idx !== -1) {
        errors[idx].status = "resolved";
        MockDB.saveErrors(errors);
        return errors[idx];
      }
      throw new Error("Report not found");
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["errors", data.org_id] });
      queryClient.invalidateQueries({ queryKey: ["platform_admin_data"] });
    },
  });
}

export function useUpdateErrorReportAdminNotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      adminNotes,
    }: {
      id: string;
      adminNotes: string;
    }) => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("error_reports")
          .update({ admin_notes: adminNotes })
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data as ErrorReport;
      }
      await delay();
      const errors = MockDB.getErrors();
      const idx = errors.findIndex((e) => e.id === id);
      if (idx !== -1) {
        errors[idx].admin_notes = adminNotes;
        MockDB.saveErrors(errors);
        return errors[idx];
      }
      throw new Error("Report not found");
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["errors", data.org_id] });
      queryClient.invalidateQueries({ queryKey: ["platform_admin_data"] });
    },
  });
}

// ==========================================
// 12. SUPERADMIN PORTAL DATA & AUDITOR HOOKS
// ==========================================
export function usePlatformStaff() {
  return useQuery({
    queryKey: ["platform_staff"],
    queryFn: async () => {
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("platform_staff")
            .select("*")
            .order("created_at", { ascending: false });
          if (!error && data && data.length > 0) return data;
        } catch (err) {
          console.warn("Supabase platform_staff select fallback:", err);
        }
      }
      await delay();
      return MockDB.getPlatformStaff();
    }
  });
}

export function usePlatformAuditLogs() {
  return useQuery({
    queryKey: ["platform_audit_logs"],
    queryFn: async () => {
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("platform_audit_logs")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(200);
          if (!error && data && data.length > 0) return data;
        } catch (err) {
          console.warn("Supabase platform_audit_logs select fallback:", err);
        }
      }
      await delay();
      return MockDB.getPlatformAuditLogs();
    }
  });
}

export function useCreatePlatformStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      email: string;
      username: string;
      full_name: string;
      role: "auditor" | "superadmin" | "support";
      password_plain?: string;
      notes?: string;
      permissions?: {
        can_audit_payments: boolean;
        can_view_ledgers: boolean;
        can_verify_members: boolean;
      };
    }) => {
      const newStaffId = `staff-${Date.now()}`;
      const newStaff = {
        id: newStaffId,
        ...payload,
        status: "active" as const,
        created_at: new Date().toISOString(),
        last_active: new Date().toISOString(),
        permissions: payload.permissions || {
          can_audit_payments: true,
          can_view_ledgers: true,
          can_verify_members: true
        }
      };

      if (payload.password_plain) {
        try {
          const raw = localStorage.getItem("impacto_user_passwords");
          const stored = raw ? JSON.parse(raw) : {};
          stored[payload.email.toLowerCase()] = payload.password_plain;
          localStorage.setItem("impacto_user_passwords", JSON.stringify(stored));
        } catch (e) {
          console.warn("Failed to save staff password locally", e);
        }
      }

      if (isSupabaseConfigured) {
        try {
          await supabase.from("platform_staff").insert({
            id: newStaff.id,
            email: newStaff.email,
            username: newStaff.username,
            full_name: newStaff.full_name,
            role: newStaff.role,
            status: newStaff.status,
            notes: newStaff.notes,
            permissions: newStaff.permissions,
            created_at: newStaff.created_at
          });
          
          // Ensure they are also in the users table so they can login and have platform_role set
          const { data: existingUser } = await supabase.from("users").select("id").eq("email", payload.email).maybeSingle();
          if (!existingUser) {
            await supabase.from("users").insert({
              id: `u-${newStaffId}`,
              email: payload.email,
              full_name: payload.full_name,
              is_superadmin: payload.role === "superadmin",
              platform_role: payload.role,
              created_at: new Date().toISOString()
            });
          } else {
             await supabase.from("users").update({
               platform_role: payload.role,
               is_superadmin: payload.role === "superadmin"
             }).eq("email", payload.email);
          }
        } catch (err) {
          console.warn("Supabase platform_staff insert fallback:", err);
        }
      }

      // Also ensure mock user list has this user
      const users = MockDB.getUsers();
      if (!users.some(u => u.email.toLowerCase() === payload.email.toLowerCase())) {
        users.push({
          id: `u-${newStaffId}`,
          email: payload.email,
          full_name: payload.full_name,
          is_superadmin: payload.role === "superadmin",
          platform_role: payload.role,
          created_at: new Date().toISOString()
        });
        MockDB.saveUsers(users);
      }

      const allStaff = MockDB.getPlatformStaff();
      allStaff.unshift(newStaff);
      MockDB.savePlatformStaff(allStaff);

      return newStaff;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform_staff"] });
      queryClient.invalidateQueries({ queryKey: ["platform_admin_data"] });
    }
  });
}

export function useUpdatePlatformStaffStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, password_plain }: { id: string; status?: "active" | "suspended"; password_plain?: string }) => {
      if (isSupabaseConfigured) {
        try {
          const updatePayload: any = {};
          if (status) updatePayload.status = status;
          if (password_plain) updatePayload.password_plain = password_plain;
          await supabase.from("platform_staff").update(updatePayload).eq("id", id);
        } catch (err) {
          console.warn("Supabase platform_staff update fallback:", err);
        }
      }
      await delay();
      const allStaff = MockDB.getPlatformStaff();
      const idx = allStaff.findIndex(s => s.id === id);
      if (idx !== -1) {
        if (status) allStaff[idx].status = status;
        if (password_plain) allStaff[idx].password_plain = password_plain;
        MockDB.savePlatformStaff(allStaff);
        return allStaff[idx];
      }
      throw new Error("Staff member not found");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform_staff"] });
      queryClient.invalidateQueries({ queryKey: ["platform_admin_data"] });
    }
  });
}

export function useDeletePlatformStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (isSupabaseConfigured) {
        try {
          // Fetch the staff member first to get their email
          const { data: staffData } = await supabase.from("platform_staff").select("email").eq("id", id).maybeSingle();
          
          await supabase.from("platform_staff").delete().eq("id", id);
          
          // If we found the email, remove their platform privileges from users table
          if (staffData?.email) {
            await supabase.from("users").update({
              platform_role: null,
              is_superadmin: false
            }).eq("email", staffData.email);
          }
        } catch (err) {
          console.warn("Supabase platform_staff delete fallback:", err);
        }
      }
      await delay();
      const allStaff = MockDB.getPlatformStaff();
      const staffToRemove = allStaff.find(s => s.id === id);
      const filtered = allStaff.filter(s => s.id !== id);
      MockDB.savePlatformStaff(filtered);
      
      if (staffToRemove) {
        const allUsers = MockDB.getUsers();
        const updatedUsers = allUsers.map(u => {
          if (u.email.toLowerCase() === staffToRemove.email.toLowerCase()) {
            return { ...u, platform_role: undefined, is_superadmin: false };
          }
          return u;
        });
        MockDB.saveUsers(updatedUsers);
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform_staff"] });
      queryClient.invalidateQueries({ queryKey: ["platform_admin_data"] });
    }
  });
}

export function usePlatformAdminData() {
  return useQuery({
    queryKey: ["platform_admin_data"],
    queryFn: async () => {
      let defaultSettings = MockDB.getPlatformSettings();
      let settingsData: PlatformSettings | null = null;

      // 0. Fetch authoritative platform settings from server
      try {
        const sRes = await fetch("/api/platform-settings");
        if (sRes.ok) {
          const sJson = await sRes.json();
          if (sJson?.data) {
            settingsData = sJson.data as PlatformSettings;
            MockDB.savePlatformSettings(settingsData);
            useCurrencyStore.getState().setRates({
              USD_to_RWF: Number(settingsData.usd_to_rwf_rate) || 1400,
              EUR_to_RWF: Number(settingsData.eur_to_rwf_rate) || 1450,
              KES_to_RWF: Number(settingsData.kes_to_rwf_rate) || 10,
            });
          }
        }
      } catch (e) {
        console.warn("[PlatformAdminData] Server platform-settings fetch note:", e);
      }

      // 0.1 Fetch authoritative server-side payments ledger
      let serverPaymentsList: any[] = [];
      try {
        const pRes = await fetch("/api/payments/subscription-payments");
        if (pRes.ok) {
          const pJson = await pRes.json();
          if (Array.isArray(pJson?.data)) {
            serverPaymentsList = pJson.data;
          }
        }
      } catch (e) {
        console.warn("[PlatformAdminData] Server subscription-payments fetch note:", e);
      }

      if (isSupabaseConfigured) {
        // 1. Always safely fetch platform_settings independently so admin tables RLS cannot break global billing config
        if (!settingsData) {
          try {
            const { data, error } = await supabase
              .from("platform_settings")
              .select("*")
              .eq("id", "global")
              .maybeSingle();
            if (data && !error) {
              settingsData = data as PlatformSettings;
              MockDB.savePlatformSettings(settingsData);
            }
          } catch (e) {
            console.warn("[PlatformAdminData] platform_settings fetch note:", e);
          }
        }

        try {
          const { data: orgs } = await supabase.from("organizations").select("*");
          const { data: payments } = await supabase
            .from("subscription_payments")
            .select("*")
            .order("submitted_at", { ascending: false })
            .limit(100);
          const { data: errors } = await supabase
            .from("error_reports")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(100);
          const { data: staffData } = await supabase.from("platform_staff").select("*");
          const { data: auditLogsData } = await supabase.from("platform_audit_logs").select("*").order("created_at", { ascending: false }).limit(200);
          const { count: usersCount } = await supabase.from("users").select("*", { count: "exact", head: true });
          const { count: membersCount } = await supabase.from("org_members").select("*", { count: "exact", head: true });

          const enrichedOrgs = ((orgs && orgs.length > 0) ? orgs : MockDB.getOrgs()).map((org: any) => {
            return {
              ...org,
              subscription_tier: org.subscription_tier || "trial",
            };
          });

          const mockPayments = MockDB.getSubPayments();
          // Deduplicate across mock, server-side ledger, and Supabase by both ID and (org_id + reference)
          const allRawPayments = [...(payments || []), ...serverPaymentsList, ...mockPayments];
          const paymentsMap = new Map<string, any>();
          const seenRefs = new Map<string, string>(); // refKey -> paymentId

          allRawPayments.forEach((p: any) => {
            if (!p || !p.id) return;
            const refKey = p.reference ? `${p.org_id || ""}_${String(p.reference).trim().toLowerCase()}` : "";
            
            // If we have already seen this transaction reference for this workspace, collapse duplicates
            if (refKey && seenRefs.has(refKey)) {
              const existingId = seenRefs.get(refKey)!;
              const existing = paymentsMap.get(existingId);
              // Prefer authoritative UUID over temporary sub-pay- id
              const isNewUuid = /^[0-9a-f-]{36}$/i.test(p.id);
              if (isNewUuid && existingId !== p.id) {
                paymentsMap.delete(existingId);
                seenRefs.set(refKey, p.id);
                paymentsMap.set(p.id, { ...existing, ...p });
              } else {
                paymentsMap.set(existingId, { ...p, ...existing });
              }
              return;
            }

            const existing = paymentsMap.get(p.id);
            paymentsMap.set(p.id, { ...existing, ...p });
            if (refKey) seenRefs.set(refKey, p.id);
          });
          const combinedPaymentsList = Array.from(paymentsMap.values()).sort((a, b) => {
            const timeA = new Date(a.submitted_at || a.created_at || 0).getTime();
            const timeB = new Date(b.submitted_at || b.created_at || 0).getTime();
            return timeB - timeA;
          });

          const enrichedPayments = combinedPaymentsList.map((p: any) => {
            return {
              ...p,
              validated_at: p.validated_at || null,
            };
          });
          let finalStaff = (staffData && staffData.length > 0) ? staffData : MockDB.getPlatformStaff();
          if (Array.isArray(finalStaff) && !finalStaff.some((s: any) => s.role === "superadmin")) {
             const superAdmins = MockDB.getPlatformStaff().filter((s: any) => s.role === "superadmin");
             finalStaff = [...superAdmins, ...finalStaff];
          }

          return {
            orgs: enrichedOrgs as Organization[],
            payments: enrichedPayments as SubscriptionPayment[],
            errors: ((errors && errors.length > 0) ? errors : MockDB.getErrors()) as ErrorReport[],
            settings: settingsData || defaultSettings,
            staff: finalStaff,
            auditLogs: (auditLogsData && auditLogsData.length > 0) ? auditLogsData : MockDB.getPlatformAuditLogs(),
            totalUsers: usersCount || MockDB.getUsers().length,
            totalMembers: membersCount || MockDB.getMembers().length,
          };
        } catch (err) {
          console.warn("[PlatformAdminData] Fallback to MockDB due to fetch notice:", err);
        }
      }
      await delay();

      // Combine local & server payments (deduplicating by ID and org_id + reference)
      const fallbackPaymentsMap = new Map<string, any>();
      const fallbackSeenRefs = new Map<string, string>();
      const allFallbackPays = [...serverPaymentsList, ...MockDB.getSubPayments()];
      allFallbackPays.forEach((p) => {
        if (!p || !p.id) return;
        const refKey = p.reference ? `${p.org_id || ""}_${String(p.reference).trim().toLowerCase()}` : "";
        if (refKey && fallbackSeenRefs.has(refKey)) {
          const existingId = fallbackSeenRefs.get(refKey)!;
          fallbackPaymentsMap.set(existingId, { ...fallbackPaymentsMap.get(existingId), ...p });
          return;
        }
        fallbackPaymentsMap.set(p.id, { ...fallbackPaymentsMap.get(p.id), ...p });
        if (refKey) fallbackSeenRefs.set(refKey, p.id);
      });
      const finalPayments = Array.from(fallbackPaymentsMap.values()).sort((a, b) => {
        const timeA = new Date(a.submitted_at || a.created_at || 0).getTime();
        const timeB = new Date(b.submitted_at || b.created_at || 0).getTime();
        return timeB - timeA;
      });

      return {
        orgs: MockDB.getOrgs(),
        payments: finalPayments,
        errors: MockDB.getErrors(),
        settings: settingsData || defaultSettings,
        staff: MockDB.getPlatformStaff(),
        auditLogs: MockDB.getPlatformAuditLogs(),
        totalUsers: MockDB.getUsers().length,
        totalMembers: MockDB.getMembers().length,
      };
    },
    refetchInterval: 4000,
  });
}

export function useApproveSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      paymentId,
      orgId,
      status,
      tier = "growth",
      plan,
      packageId,
      auditedBy,
      auditedByName,
      auditNotes,
    }: {
      paymentId: string;
      orgId: string;
      status: "approved" | "rejected";
      tier?: SubscriptionTier;
      plan?: string;
      packageId?: string;
      auditedBy?: string;
      auditedByName?: string;
      auditNotes?: string;
    }) => {
      const validatedAt = new Date().toISOString();
      const auditorName = auditedByName || "Platform Administrator";
      const auditorId = auditedBy || "admin-lead";

      // Sync status with server ledger
      try {
        await fetch(`/api/payments/subscription-payments/${paymentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            audited_by: auditorId,
            audited_by_name: auditorName,
            audit_notes: auditNotes || null,
            validated_at: validatedAt,
          }),
        });
      } catch (e) {
        console.warn("[ApproveSubscription] Server sync note:", e);
      }

      if (isSupabaseConfigured) {
        let resData: any;
        try {
          const { data, error } = await supabase
            .from("subscription_payments")
            .update({
              status,
              validated_at: validatedAt,
              audited_by: auditorId,
              audited_by_name: auditorName,
              audit_notes: auditNotes || null,
              audited_at: validatedAt
            } as any)
            .eq("id", paymentId)
            .select()
            .single();
          if (error) throw error;
          resData = data;
        } catch (dbErr: any) {
          console.warn("Supabase sub payment update fallback:", dbErr);
          const { data, error } = await supabase
            .from("subscription_payments")
            .update({ status })
            .eq("id", paymentId)
            .select()
            .single();
          if (error) throw error;
          resData = data;
        }

        if (status === "approved") {
          const nextExpiry = new Date();
          nextExpiry.setDate(nextExpiry.getDate() + 30);

          if (packageId) {
            // Add package to org packages
            try {
              const rawPkgs = localStorage.getItem(`impacto_org_packages_${orgId}`) || "[]";
              let pkgs: string[] = JSON.parse(rawPkgs);
              if (!pkgs.includes(packageId)) {
                pkgs.push(packageId);
                localStorage.setItem(`impacto_org_packages_${orgId}`, JSON.stringify(pkgs));
              }
            } catch (e) {}

            try {
              await supabase
                .from("organizations")
                .update({
                  active_packages: supabase.rpc ? undefined : [packageId],
                } as any)
                .eq("id", orgId);
            } catch (pkgErr: any) {}
          } else {
            try {
              await supabase
                .from("organizations")
                .update({
                  subscription_status: "active",
                  subscription_ends_at: nextExpiry.toISOString(),
                  subscription_tier: tier,
                } as any)
                .eq("id", orgId);
            } catch (orgErr: any) {
              console.warn("Extending sub fails with tier, trying without tier.", orgErr);
              localStorage.setItem(`impacto_org_subscription_tier_${orgId}`, tier);
              await supabase
                .from("organizations")
                .update({
                  subscription_status: "active",
                  subscription_ends_at: nextExpiry.toISOString(),
                })
                .eq("id", orgId);
            }
          }
        }
      }

      await delay();
      const pays = MockDB.getSubPayments();
      const idx = pays.findIndex((p) => p.id === paymentId);
      let targetPaymentAmount = 33750;
      let targetPaymentRef = "TXN-REF";

      if (idx !== -1) {
        targetPaymentAmount = pays[idx].amount_local || 33750;
        targetPaymentRef = pays[idx].reference || "TXN-REF";
      }

      // Update both exact ID and any duplicate local records with matching reference
      pays.forEach((p) => {
        const matchesId = p.id === paymentId;
        const matchesRef = targetPaymentRef !== "TXN-REF" && p.org_id === orgId && (p.reference || "").trim().toLowerCase() === targetPaymentRef.trim().toLowerCase();
        if (matchesId || matchesRef) {
          p.status = status;
          p.validated_at = validatedAt;
          p.audited_by = auditorId;
          p.audited_by_name = auditorName;
          p.audit_notes = auditNotes || (status === "approved" ? "Verified mobile money transaction proof" : "Payment proof rejected during audit");
          p.audited_at = validatedAt;
        }
      });
      MockDB.saveSubPayments(pays);

      if (status === "approved") {
          const orgs = MockDB.getOrgs();
          const oIdx = orgs.findIndex((o) => o.id === orgId);
          if (oIdx !== -1) {
            const nextExpiry = new Date();
            nextExpiry.setDate(nextExpiry.getDate() + 30);
            if (packageId) {
              const currentPkgs = orgs[oIdx].active_packages || [];
              if (!currentPkgs.includes(packageId)) {
                orgs[oIdx].active_packages = [...currentPkgs, packageId];
              }
              // Also ensure local storage has it
              try {
                localStorage.setItem(`impacto_org_packages_${orgId}`, JSON.stringify(orgs[oIdx].active_packages));
              } catch (e) {}
            } else {
              orgs[oIdx].subscription_status = "active";
              orgs[oIdx].subscription_ends_at = nextExpiry.toISOString();
              orgs[oIdx].subscription_tier = tier;
            }
            MockDB.saveOrgs(orgs);
          }
        }

      // Record in Platform Audit Logs
      const auditLogs = MockDB.getPlatformAuditLogs();
      const matchedOrg = MockDB.getOrgs().find(o => o.id === orgId);
      auditLogs.unshift({
        id: `audit-${Date.now()}`,
        staff_id: auditorId,
        staff_name: auditorName,
        staff_role: "auditor",
        action_type: status === "approved" ? "approve_subscription" : "reject_subscription",
        target_id: paymentId,
        target_org_id: orgId,
        target_org_name: matchedOrg?.name || "Workspace",
        amount: targetPaymentAmount,
        reference: targetPaymentRef,
        notes: auditNotes || (status === "approved" ? (packageId ? "Add-on feature package verified and activated." : "Transaction verified and 30-day billing period extended.") : "Proof rejected during reconciliation."),
        created_at: validatedAt
      });
      MockDB.savePlatformAuditLogs(auditLogs);

      return { paymentId, orgId, tier, packageId, plan };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["platform_admin_data"] });
      queryClient.invalidateQueries({ queryKey: ["platform_audit_logs"] });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["subscription_payments", variables.orgId] });
      queryClient.invalidateQueries({ queryKey: ["subscription_payments"] });

      const store = useOrgStore.getState();
      if (store.activeOrg && store.activeOrg.id === variables.orgId) {
        const nextExpiry = new Date();
        nextExpiry.setDate(nextExpiry.getDate() + 30);
        let updatedPackages = store.activeOrg.active_packages || [];
        if (variables.packageId && !updatedPackages.includes(variables.packageId)) {
          updatedPackages = [...updatedPackages, variables.packageId];
        }

        store.setActiveOrg(
          {
            ...store.activeOrg,
            subscription_status:
              variables.status === "approved" && !variables.packageId
                ? "active"
                : store.activeOrg.subscription_status,
            subscription_tier:
              variables.status === "approved" && !variables.packageId && variables.tier
                ? variables.tier
                : store.activeOrg.subscription_tier,
            subscription_ends_at:
              variables.status === "approved" && !variables.packageId
                ? nextExpiry.toISOString()
                : store.activeOrg.subscription_ends_at,
            active_packages: updatedPackages,
          },
          store.activeMember,
        );
      }

      // Hot reload broadcast for all open tabs
      if (variables.status === "approved") {
        notifyPlanOrPackageGranted(variables.orgId, {
          tier: variables.tier,
          packageId: variables.packageId,
          packageName: variables.plan,
        });
      }
    },
  });
}

export function useOrgSubscriptionPayments(orgId?: string) {
  return useQuery({
    queryKey: ["subscription_payments", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("subscription_payments")
            .select("*")
            .eq("org_id", orgId)
            .order("submitted_at", { ascending: false });
          if (!error && data) {
            return data as SubscriptionPayment[];
          }
        } catch (err) {
          console.warn("Supabase fetch subscription payments fallback:", err);
        }
      }
      await delay();
      const pays = MockDB.getSubPayments();
      return (pays || [])
        .filter((p) => p.org_id === orgId)
        .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
    },
    enabled: !!orgId,
    refetchInterval: 10000,
  });
}

export function useSubmitSubscriptionPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Omit<SubscriptionPayment, "id" | "status" | "submitted_at">,
    ) => {
      // 1. Immediately create local record with unique ID
      const newId = "sub-pay-" + Date.now().toString(36) + "-" + Math.random().toString(36).substr(2, 6);
      let localPayment: SubscriptionPayment = {
        ...payload,
        id: newId,
        status: "awaiting_approval",
        submitted_at: new Date().toISOString(),
      };

      // 2. Always persist to MockDB first so it is instantly available across tabs & sessions
      const existingPays = MockDB.getSubPayments();
      const updatedPays = [localPayment, ...existingPays.filter((p) => p.id !== newId)];
      MockDB.saveSubPayments(updatedPays);

      // 3. Post to server-side shared ledger
      try {
        const sRes = await fetch("/api/payments/subscription-payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(localPayment),
        });
        if (sRes.ok) {
          const sJson = await sRes.json();
          if (sJson?.data) {
            localPayment = sJson.data as SubscriptionPayment;
          }
        }
      } catch (err) {
        console.warn("[SubscriptionPayment] Server ledger post note:", err);
      }

      // 4. If Supabase is configured, sync to cloud database
      if (isSupabaseConfigured) {
        try {
          // Verify org_id is valid UUID or map to valid Supabase org
          let safeOrgId = payload.org_id;
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(safeOrgId);
          if (!isUuid) {
            try {
              const { data: realOrg } = await supabase.from("organizations").select("id").limit(1).maybeSingle();
              if (realOrg?.id) safeOrgId = realOrg.id;
            } catch (_) {}
          }

          const insertPayload: any = {
            org_id: safeOrgId,
            plan: payload.plan,
            amount_usd: payload.amount_usd,
            amount_local: payload.amount_local,
            method: payload.method,
            phone: payload.phone,
            reference: payload.reference,
            proof_url: payload.proof_url || null,
            status: "awaiting_approval",
            submitted_at: localPayment.submitted_at,
          };
          if ((payload as any).package_id) insertPayload.package_id = (payload as any).package_id;
          if ((payload as any).item_type) insertPayload.item_type = (payload as any).item_type;

          const { data, error } = await supabase
            .from("subscription_payments")
            .insert(insertPayload)
            .select()
            .single();

          if (!error && data) {
            // Re-sync with Supabase ID
            const freshPays = MockDB.getSubPayments();
            const index = freshPays.findIndex((p) => p.id === newId || p.reference === payload.reference);
            if (index !== -1) {
              freshPays[index] = data as SubscriptionPayment;
            } else {
              freshPays.unshift(data as SubscriptionPayment);
            }
            MockDB.saveSubPayments(freshPays);
            localPayment = data as SubscriptionPayment;
          } else if (error) {
            console.warn("Supabase sub payment insert note:", error);
          }
        } catch (err) {
          console.warn("[SubscriptionPayment] Cloud sync note (local payment preserved):", err);
        }
      }

      await delay(50);
      return localPayment;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["subscription_payments"], (old: any) => {
        const arr = Array.isArray(old) ? old : [];
        return [data, ...arr.filter((p: any) => p && p.id !== data.id)];
      });
      queryClient.invalidateQueries({ queryKey: ["platform_admin_data"] });
      queryClient.invalidateQueries({ queryKey: ["superadmin_stats"] });
      queryClient.invalidateQueries({ queryKey: ["subscription_payments"] });
      if (data?.org_id) {
        queryClient.invalidateQueries({ queryKey: ["subscription_payments", data.org_id] });
      }
      
      // Real-time cross tab and window notification
      try {
        notifyCrossTabChange("platform_admin_data", data?.org_id);
        notifyCrossTabChange("subscription_payments", data?.org_id);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("impacto_sub_payment_created", { detail: data }));
          localStorage.setItem("impacto_last_sub_payment", JSON.stringify({ id: data?.id, org_id: data?.org_id, time: Date.now() }));
        }
      } catch (e) {}
    },
  });
}

export function usePlatformSettings() {
  return useQuery({
    queryKey: ["platform_settings"],
    queryFn: async (): Promise<PlatformSettings> => {
      let local = MockDB.getPlatformSettings();

      // 0. Primary: Fetch authoritative configuration from server
      try {
        const sRes = await fetch("/api/platform-settings");
        if (sRes.ok) {
          const sJson = await sRes.json();
          if (sJson?.data) {
            const serverSettings = sJson.data as PlatformSettings;
            MockDB.savePlatformSettings(serverSettings);
            useCurrencyStore.getState().setRates({
              USD_to_RWF: Number(serverSettings.usd_to_rwf_rate) || 1400,
              EUR_to_RWF: Number(serverSettings.eur_to_rwf_rate) || 1450,
              KES_to_RWF: Number(serverSettings.kes_to_rwf_rate) || 10,
            });
            return serverSettings;
          }
        }
      } catch (err) {
        console.warn("[PlatformSettings] Server fetch fallback:", err);
      }

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("platform_settings")
            .select("*")
            .eq("id", "global")
            .maybeSingle();
          if (data && !error) {
            MockDB.savePlatformSettings(data as PlatformSettings);
            useCurrencyStore.getState().setRates({
              USD_to_RWF: Number(data.usd_to_rwf_rate) || 1400,
              EUR_to_RWF: Number(data.eur_to_rwf_rate) || 1450,
              KES_to_RWF: Number(data.kes_to_rwf_rate) || 10,
            });
            return data as PlatformSettings;
          }
        } catch (err) {
          console.warn("[PlatformSettings] Falling back to local settings:", err);
        }
      }
      if (local) {
        useCurrencyStore.getState().setRates({
          USD_to_RWF: Number(local.usd_to_rwf_rate) || 1400,
          EUR_to_RWF: Number(local.eur_to_rwf_rate) || 1450,
          KES_to_RWF: Number(local.kes_to_rwf_rate) || 10,
        });
      }
      return local;
    },
    staleTime: 1000 * 3, // 3 seconds fresh cache
    refetchInterval: 3000, // Poll every 3 seconds to keep tabs in sync
    refetchOnWindowFocus: true,
  });
}

export function useUpdatePlatformSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PlatformSettings) => {
      // 1. Always update local storage & MockDB immediately for instant client availability
      MockDB.savePlatformSettings(payload);
      useCurrencyStore.getState().setRates({
        USD_to_RWF: Number(payload.usd_to_rwf_rate) || 1400,
        EUR_to_RWF: Number(payload.eur_to_rwf_rate) || 1450,
        KES_to_RWF: Number(payload.kes_to_rwf_rate) || 10,
      });

      // 2. Post to server-side platform-settings endpoint
      try {
        await fetch("/api/platform-settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.warn("[PlatformSettings] Server sync notice:", err);
      }

      // 3. Persist to Supabase if configured
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("platform_settings")
            .upsert({ id: "global", ...payload })
            .select()
            .single();
          if (error) {
            console.warn("Supabase platform_settings upsert error, saved to MockDB:", error);
          } else if (data) {
            MockDB.savePlatformSettings(data as PlatformSettings);
            return data as PlatformSettings;
          }
        } catch (err) {
          console.warn("Supabase connection issue while saving platform settings:", err);
        }
      }
      await delay(50);
      return payload;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.setQueryData(["platform_settings"], data);
      }
      queryClient.invalidateQueries({ queryKey: ["platform_settings"] });
      queryClient.invalidateQueries({ queryKey: ["platform_admin_data"] });
      queryClient.invalidateQueries({ queryKey: ["superadmin_stats"] });
      try {
        notifyCrossTabChange("platform_settings");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("impacto_platform_settings_updated", { detail: data }));
          localStorage.setItem("impacto_platform_settings_time", Date.now().toString());
        }
      } catch (e) {}
    },
  });
}

// ==========================================
// V2 ADDONS REACT-QUERY HOOKS
// ==========================================

// 1. Audit Logging helper inside Hook level to log actions cleanly
export function useCreateAuditLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<AuditLog, "id" | "created_at">) => {
      const newLog: AuditLog = {
        id: "audit-" + Math.random().toString(36).substring(2, 11),
        created_at: new Date().toISOString(),
        ...payload,
      };

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("audit_logs")
            .insert(newLog)
            .select()
            .single();
          if (!error && data) {
            return data as AuditLog;
          }
        } catch (dbErr) {
          console.warn("[Audit] Direct insert notice, attempting server API dispatch:", dbErr);
        }

        // Server API fallback
        try {
          const resp = await fetch("/api/audit-logs/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newLog),
          });
          if (resp.ok) {
            const data = await resp.json();
            return data.log as AuditLog;
          }
        } catch (apiErr) {
          console.warn("[Audit API] Write error:", apiErr);
        }
      }

      await delay(50);
      const logs = MockDB.getAuditLogs();
      logs.unshift(newLog);
      MockDB.saveAuditLogs(logs);
      return newLog;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["audit_logs", variables.org_id],
      });
    },
  });
}

export function useAuditLogs(orgId: string | undefined) {
  return useQuery({
    queryKey: ["audit_logs", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("audit_logs")
            .select("*")
            .eq("org_id", orgId)
            .order("created_at", { ascending: false })
            .limit(100);
          if (!error && data && data.length > 0) {
            return data.map((row: any) => ({
              ...row,
              action_type: row.action_type || row.action,
              description: row.description || row.action_label,
              actor_name: row.actor_name || row.target_label || row.performed_by || "System User",
              staff_name: row.staff_name || row.actor_name || row.target_label || row.performed_by || "System User",
              metadata_json: row.metadata_json || row.new_value,
            })) as AuditLog[];
          }
        } catch (dbErr) {
          console.warn("[AuditLogs] Direct Supabase fetch notice:", dbErr);
        }

        // Backend API fallback to bypass any client RLS restrictions
        try {
          const resp = await fetch(`/api/audit-logs?orgId=${encodeURIComponent(orgId)}`);
          if (resp.ok) {
            const json = await resp.json();
            if (json.success && Array.isArray(json.logs) && json.logs.length > 0) {
              return json.logs as AuditLog[];
            }
          }
        } catch (apiErr) {
          console.warn("[AuditLogs] Backend fallback notice:", apiErr);
        }
      }
      await delay(150);
      const allLogs = MockDB.getAuditLogs();
      return allLogs.filter((l) => l.org_id === orgId);
    },
    enabled: !!orgId,
  });
}

// 2. Chat V2 Poll Hooks
export function usePollMessages(channelId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!channelId || !isSupabaseConfigured) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      const channelName = `polls_rt_${channelId}_${Math.random().toString(36).substring(2, 9)}`;
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "polls", filter: `channel_id=eq.${channelId}` },
          () => queryClient.invalidateQueries({ queryKey: ["polls", channelId] })
        )
        .subscribe();
    } catch (err) {
      console.warn("[Realtime] Polls channel subscribe notice:", err);
    }
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [channelId, queryClient]);

  return useQuery({
    queryKey: ["polls", channelId],
    queryFn: async () => {
      if (!channelId) return [];
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("polls")
            .select("*")
            .eq("channel_id", channelId);
          if (!error && data) {
            return (data || []).map((item: any) => ({
              ...item,
              id: item.poll_id || item.id,
            })) as PollMessage[];
          }
        } catch (err) {
          console.warn("[Polls] Fetch notice:", err);
        }
      }
      return [];
    },
    enabled: !!channelId,
  });
}

export function useCreatePoll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      poll_id?: string;
      message_id: string;
      channel_id: string;
      question: string;
      options: string[];
    }) => {
      const pId = payload.poll_id || "poll-" + Math.random().toString(36).substring(2, 9);
      const newPoll: PollMessage = {
        id: pId,
        poll_id: pId,
        message_id: payload.message_id,
        channel_id: payload.channel_id,
        question: payload.question,
        options: payload.options,
        created_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("polls")
            .insert({
              poll_id: pId,
              message_id: payload.message_id,
              channel_id: payload.channel_id,
              question: payload.question,
              options: payload.options
            })
            .select()
            .single();
          if (!error && data) {
            return {
              ...data,
              id: data.poll_id || data.id,
            } as PollMessage;
          }
        } catch (sErr) {
          console.warn("[Polls] Supabase insert warning:", sErr);
        }
      }

      await delay(50);
      const polls = MockDB.getPolls();
      polls.push(newPoll);
      MockDB.savePolls(polls);
      return newPoll;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["polls", variables.channel_id] });
    },
  });
}

export function useVoteInPoll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      poll_id: string;
      user_id: string;
      option_index: number;
      retract?: boolean;
    }) => {
      if (isSupabaseConfigured) {
        try {
          if (payload.retract) {
            const { error } = await supabase
              .from("poll_votes")
              .delete()
              .eq("poll_id", payload.poll_id)
              .eq("user_id", payload.user_id);
            if (error) console.warn("[Poll Vote] Supabase retract note:", error);
          } else {
            const { data: existing } = await supabase
              .from("poll_votes")
              .select("id")
              .eq("poll_id", payload.poll_id)
              .eq("user_id", payload.user_id)
              .maybeSingle();

            if (existing) {
              const { error } = await supabase
                .from("poll_votes")
                .update({ option_index: payload.option_index })
                .eq("poll_id", payload.poll_id)
                .eq("user_id", payload.user_id);
              if (error) console.warn("[Poll Vote] Supabase update note:", error);
            } else {
              const voteId = "vote-" + Math.random().toString(36).substring(2, 9);
              const { error } = await supabase
                .from("poll_votes")
                .insert({
                  id: voteId,
                  poll_id: payload.poll_id,
                  user_id: payload.user_id,
                  option_index: payload.option_index
                });
              if (error) console.warn("[Poll Vote] Supabase insert note:", error);
            }
          }
        } catch (err) {
          console.warn("[Poll Vote] Supabase vote error:", err);
        }
      }

      await delay(40);
      const localVotes = MockDB.getPollVotes();
      if (payload.retract) {
        const filtered = localVotes.filter(
          (v) => !(v.poll_id === payload.poll_id && v.user_id === payload.user_id)
        );
        MockDB.savePollVotes(filtered);
        return { poll_id: payload.poll_id, user_id: payload.user_id, retracted: true } as any;
      } else {
        const idx = localVotes.findIndex(
          (v) => v.poll_id === payload.poll_id && v.user_id === payload.user_id
        );
        const voteObj: PollVote = {
          id: idx !== -1 ? localVotes[idx].id : "vote-" + Math.random().toString(36).substring(2, 9),
          poll_id: payload.poll_id,
          user_id: payload.user_id,
          option_index: payload.option_index,
          created_at: new Date().toISOString(),
        };
        if (idx !== -1) {
          localVotes[idx] = voteObj;
        } else {
          localVotes.push(voteObj);
        }
        MockDB.savePollVotes(localVotes);
        return voteObj;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["poll_votes", variables.poll_id] });
      queryClient.invalidateQueries({ queryKey: ["all_poll_votes"] });
    },
  });
}

export function usePollResponses(pollId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!pollId || !isSupabaseConfigured) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      const channelName = `poll_votes_rt_${pollId}_${Math.random().toString(36).substring(2, 9)}`;
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "poll_votes", filter: `poll_id=eq.${pollId}` },
          () => queryClient.invalidateQueries({ queryKey: ["poll_votes", pollId] })
        )
        .subscribe();
    } catch (err) {
      console.warn("[Realtime] Poll votes channel subscribe notice:", err);
    }
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [pollId, queryClient]);

  return useQuery({
    queryKey: ["poll_votes", pollId],
    queryFn: async () => {
      if (!pollId) return [];
      let sbVotes: PollVote[] = [];
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("poll_votes")
            .select("*")
            .eq("poll_id", pollId);
          if (!error && data) {
            sbVotes = data as PollVote[];
          }
        } catch (e) {
          console.warn("Supabase fetch poll votes error:", e);
        }
      }

      const localVotes = MockDB.getPollVotes().filter((v) => v.poll_id === pollId);
      const map = new Map<string, PollVote>();
      localVotes.forEach((v) => map.set(v.user_id, v));
      sbVotes.forEach((v) => map.set(v.user_id, v));

      return Array.from(map.values());
    },
    enabled: !!pollId,
    refetchInterval: 3000,
  });
}

export function useAllPollResponses() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      const channelName = `all_poll_votes_rt_${Math.random().toString(36).substring(2, 9)}`;
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "poll_votes" },
          () => queryClient.invalidateQueries({ queryKey: ["all_poll_votes"] })
        )
        .subscribe();
    } catch (err) {
      console.warn("[Realtime] All poll votes subscribe notice:", err);
    }
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["all_poll_votes"],
    queryFn: async () => {
      let sbVotes: PollVote[] = [];
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("poll_votes")
            .select("*");
          if (!error && data) {
            sbVotes = data as PollVote[];
          }
        } catch (e) {
          console.warn("Supabase all poll votes error:", e);
        }
      }
      const localVotes = MockDB.getPollVotes();
      const map = new Map<string, PollVote>();
      localVotes.forEach((v) => map.set(`${v.poll_id}_${v.user_id}`, v));
      sbVotes.forEach((v) => map.set(`${v.poll_id}_${v.user_id}`, v));
      return Array.from(map.values());
    },
    refetchInterval: 3000,
  });
}

// 3. Activity Tracking beyond meetings
export function useActivityLogs(orgId: string | undefined) {
  return useQuery({
    queryKey: ["activity_logs", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("activity_logs")
            .select("*")
            .eq("org_id", orgId)
            .order("activity_date", { ascending: false })
            .limit(100);
          if (!error && data && data.length > 0) {
            return data as ActivityLog[];
          }
        } catch (err) {
          console.warn("[ActivityLogs] Fetch notice:", err);
        }
      }
      await delay(200);
      return MockDB.getActivityLogs().filter((l) => l.org_id === orgId);
    },
    enabled: !!orgId,
  });
}

export function useActivityAttendance(activityId: string | undefined) {
  return useQuery({
    queryKey: ["activity_attendance", activityId],
    queryFn: async () => {
      if (!activityId) return [];
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("activity_attendance")
            .select("*")
            .eq("activity_id", activityId);
          if (!error && data) {
            return data as ActivityAttendance[];
          }
        } catch (err) {
          console.warn("[ActivityAttendance] Fetch notice:", err);
        }
      }
      await delay(100);
      return MockDB.getActivityAttendance().filter(
        (a) => a.activity_id === activityId,
      );
    },
    enabled: !!activityId,
  });
}

export function useSubmitActivityLog() {
  const queryClient = useQueryClient();
  const auditMutation = useCreateAuditLog();
  return useMutation({
    mutationFn: async (payload: {
      org_id: string;
      title: string;
      description?: string;
      location?: string;
      activity_type?: string;
      target_metric?: string;
      present_member_ids?: string[];
      absent_member_ids?: string[];
      activity_date: string;
      created_by: string;
      attendees: string[]; // member ids
    }) => {
      const activityId = "act-" + Math.random().toString(36).substring(2, 9);
      const newActivity: ActivityLog = {
        id: activityId,
        org_id: payload.org_id,
        title: payload.title,
        description: payload.description,
        location: payload.location,
        activity_type: payload.activity_type,
        target_metric: payload.target_metric,
        present_member_ids: payload.present_member_ids || payload.attendees,
        absent_member_ids: payload.absent_member_ids || [],
        attendees: payload.attendees,
        activity_date: payload.activity_date,
        created_by: payload.created_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured) {
        try {
          const { data: actData, error: actErr } = await supabase
            .from("activity_logs")
            .insert({
              org_id: payload.org_id,
              title: payload.title,
              description: payload.description,
              location: payload.location,
              activity_date: payload.activity_date,
              created_by: payload.created_by,
            })
            .select()
            .single();
          if (actErr) throw actErr;

          if (payload.attendees.length > 0) {
            const rows = payload.attendees.map((mId) => ({
              activity_id: actData.id,
              member_id: mId,
              recorded_by: payload.created_by,
            }));
            const { error: attErr } = await supabase
              .from("activity_attendance")
              .insert(rows);
            if (attErr) console.warn("Supabase activity_attendance warning:", attErr);
          }
          return {
            ...actData,
            activity_type: payload.activity_type,
            target_metric: payload.target_metric,
            present_member_ids: payload.present_member_ids || payload.attendees,
            absent_member_ids: payload.absent_member_ids || [],
          } as ActivityLog;
        } catch (dbErr) {
          console.warn("Supabase activity_logs insert warning, saving locally:", dbErr);
        }
      }

      await delay(300);
      const logs = MockDB.getActivityLogs();
      logs.unshift(newActivity);
      MockDB.saveActivityLogs(logs);

      if (payload.attendees.length > 0) {
        const attLogs = MockDB.getActivityAttendance();
        payload.attendees.forEach((mId) => {
          attLogs.push({
            id: "att-" + Math.random().toString(36).substring(2, 9),
            activity_id: activityId,
            member_id: mId,
            recorded_by: payload.created_by,
            created_at: new Date().toISOString(),
          });
        });
        MockDB.saveActivityAttendance(attLogs);
      }

      // Record Audit trail
      await auditMutation.mutateAsync({
        org_id: payload.org_id,
        performed_by: payload.created_by,
        action: "record_activity",
        action_label: `Logged Activity Outreach: ${payload.title}`,
        target_table: "activity_logs",
        target_id: activityId,
        target_label: payload.title,
      });

      return newActivity;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["activity_logs", data.org_id],
      });
    },
  });
}

// 4. Message Templates System
export function useMessageTemplates(orgId: string | undefined) {
  return useQuery({
    queryKey: ["msg_templates", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("message_templates")
            .select("*")
            .eq("org_id", orgId);
          if (!error && data) {
            return data as MessageTemplate[];
          }
        } catch (err) {
          console.warn("[MessageTemplates] Fetch notice:", err);
        }
      }
      await delay(100);
      return MockDB.getMessageTemplates().filter((t) => t.org_id === orgId);
    },
    enabled: !!orgId,
  });
}

export function useSubmitMessageTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Partial<MessageTemplate> & {
        org_id: string;
        created_by: string;
      },
    ) => {
      const templateId =
        payload.id || "tmp-" + Math.random().toString(36).substring(2, 9);
      const newTemplate: MessageTemplate = {
        id: templateId,
        org_id: payload.org_id,
        name: payload.name || "Untitled Template",
        occasion: payload.occasion || "General",
        subject: payload.subject || "",
        body: payload.body || "",
        variables: payload.variables || [],
        is_system_template: false,
        created_by: payload.created_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("message_templates")
          .upsert(newTemplate)
          .select()
          .single();
        if (error) throw error;
        return data as MessageTemplate;
      }
      await delay(200);
      const list = MockDB.getMessageTemplates();
      const idx = list.findIndex((t) => t.id === payload.id);
      if (idx !== -1) {
        list[idx] = {
          ...list[idx],
          ...payload,
          updated_at: new Date().toISOString(),
        };
      } else {
        list.push(newTemplate);
      }
      MockDB.saveMessageTemplates(list);
      return newTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["msg_templates", data.org_id],
      });
    },
  });
}

export function useDeleteMessageTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; org_id: string }) => {
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from("message_templates")
          .delete()
          .eq("id", payload.id);
        if (error) throw error;
        return payload.id;
      }
      await delay(100);
      const list = MockDB.getMessageTemplates().filter(
        (t) => t.id !== payload.id,
      );
      MockDB.saveMessageTemplates(list);
      return payload.id;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["msg_templates", variables.org_id],
      });
    },
  });
}

export function useBroadcastNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      org_id: string;
      sent_by: string;
      recipient_group: string;
      recipient_count: number;
      body_text: string;
      activity_id?: string;
      event_id?: string;
      meeting_id?: string;
    }) => {
      const newSend: NotificationSend = {
        id: "snd-" + Math.random().toString(36).substring(2, 9),
        org_id: payload.org_id,
        sent_by: payload.sent_by,
        recipient_group: payload.recipient_group,
        recipient_count: payload.recipient_count,
        body_text: payload.body_text,
        activity_id: payload.activity_id,
        event_id: payload.event_id,
        meeting_id: payload.meeting_id,
        created_at: new Date().toISOString(),
      };
      if (isSupabaseConfigured) {
        try {
          const validSentBy = payload.sent_by && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.sent_by) ? payload.sent_by : null;
          const { data, error } = await supabase
            .from("notification_sends")
            .insert({
              id: newSend.id,
              org_id: newSend.org_id,
              sent_by: validSentBy,
              variables_applied: {
                recipient_group: payload.recipient_group,
                recipient_count: payload.recipient_count,
                body_text: payload.body_text,
                activity_id: payload.activity_id,
                event_id: payload.event_id,
                meeting_id: payload.meeting_id
              }
            })
            .select()
            .single();
          if (!error && data) {
            return {
              ...newSend,
              ...data,
              body_text: payload.body_text
            } as NotificationSend;
          }
        } catch (e) {
          console.warn("[Broadcast Notification] Remote insert notice error, falling back to local storage:", e);
        }
      }
      await delay(150);
      const sends = MockDB.getNotificationSends();
      sends.unshift(newSend);
      MockDB.saveNotificationSends(sends);
      return newSend;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["notification_sends", data.org_id],
      });
    },
  });
}

export function useNotificationSends(orgId: string | undefined) {
  return useQuery({
    queryKey: ["notification_sends", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("notification_sends")
            .select("*")
            .eq("org_id", orgId);
          if (!error && data) {
            const mapped = data.map((d: any) => ({
              id: d.id,
              org_id: d.org_id,
              template_id: d.template_id,
              sent_by: d.sent_by,
              recipient_group: d.variables_applied?.recipient_group || d.recipient_group || "all",
              recipient_count: d.variables_applied?.recipient_count || d.recipient_count || 1,
              body_text: d.variables_applied?.body_text || d.body_text || "Notification dispatched",
              created_at: d.created_at || d.sent_at || new Date().toISOString(),
            }));
            
            const localSends = MockDB.getNotificationSends().filter((s: any) => s.org_id === orgId);
            const map = new Map<string, any>();
            mapped.forEach((m: any) => map.set(m.id, m));
            localSends.forEach((l: any) => {
              if (!map.has(l.id)) {
                map.set(l.id, l);
              }
            });
            return Array.from(map.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) as NotificationSend[];
          }
        } catch (e) {
          console.warn("[Notification Sends] Remote fetch error, falling back to local storage:", e);
        }
      }
      await delay(100);
      return MockDB.getNotificationSends().filter((s: any) => s.org_id === orgId) as NotificationSend[];
    },
    enabled: !!orgId,
  });
}

// 5. Event RSVP and Waitlist
export function useEventRSVPs(eventId: string | undefined) {
  return useQuery({
    queryKey: ["event_v2_rsvps", eventId],
    queryFn: async () => {
      if (!eventId) return [];
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("event_rsvps")
            .select("*")
            .eq("event_id", eventId);
          if (!error && data) {
            return data as EventRSVP[];
          }
        } catch (err) {
          console.warn("[EventRSVPs] Fetch notice:", err);
        }
      }
      await delay(100);
      return MockDB.getEventRSVPs().filter((r) => r.event_id === eventId);
    },
    enabled: !!eventId,
  });
}

export function useSubmitRSVP() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      event_id: string;
      member_id: string;
      response: "yes" | "no" | "maybe";
    }) => {
      const newRSVP: EventRSVP = {
        id: "rsvp-" + Math.random().toString(36).substring(2, 9),
        event_id: payload.event_id,
        member_id: payload.member_id,
        response: payload.response,
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("event_rsvps")
          .upsert(newRSVP)
          .select()
          .single();
        if (error) throw error;
        return data as EventRSVP;
      }
      await delay(100);
      const rsvps = MockDB.getEventRSVPs();
      const existingIdx = rsvps.findIndex(
        (r) =>
          r.event_id === payload.event_id && r.member_id === payload.member_id,
      );
      if (existingIdx !== -1) {
        rsvps[existingIdx] = {
          ...rsvps[existingIdx],
          response: payload.response,
          updated_at: new Date().toISOString(),
        };
      } else {
        rsvps.push(newRSVP);
      }
      MockDB.saveEventRSVPs(rsvps);
      return newRSVP;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["event_v2_rsvps", data.event_id],
      });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useEventWaitlist(eventId: string | undefined) {
  return useQuery({
    queryKey: ["event_v2_waitlist", eventId],
    queryFn: async () => {
      if (!eventId) return [];
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("event_waitlist")
            .select("*")
            .eq("event_id", eventId);
          if (!error && data) {
            return data as EventWaitlist[];
          }
        } catch (err) {
          console.warn("[EventWaitlist] Fetch notice:", err);
        }
      }
      await delay(100);
      return MockDB.getEventWaitlist().filter((w) => w.event_id === eventId);
    },
    enabled: !!eventId,
  });
}

export function useJoinEventWaitlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { event_id: string; member_id: string }) => {
      const newWait: EventWaitlist = {
        id: "wait-" + Math.random().toString(36).substring(2, 9),
        event_id: payload.event_id,
        member_id: payload.member_id,
        joined_at: new Date().toISOString(),
      };
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("event_waitlist")
          .upsert(newWait)
          .select()
          .single();
        if (error) throw error;
        return data as EventWaitlist;
      }
      await delay(100);
      const waitlist = MockDB.getEventWaitlist();
      const exists = waitlist.some(
        (w) =>
          w.event_id === payload.event_id && w.member_id === payload.member_id,
      );
      if (!exists) {
        waitlist.push(newWait);
        MockDB.saveEventWaitlist(waitlist);
      }
      return newWait;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["event_v2_waitlist", data.event_id],
      });
    },
  });
}

// 6. Member Identity verification
export function useIdentityVerifications(orgId: string | undefined) {
  return useQuery({
    queryKey: ["identity_verifications", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("identity_verifications")
            .select("*")
            .eq("org_id", orgId);
          if (!error && data) {
            return data as IdentityVerification[];
          }
        } catch (err) {
          console.warn("[IdentityVerifications] Fetch notice:", err);
        }
      }
      await delay(150);
      return MockDB.getIdentityVerifications().filter((v) => v.org_id === orgId);
    },
    enabled: !!orgId,
  });
}

export function useSubmitIdentityVerification() {
  const queryClient = useQueryClient();
  const auditMutation = useCreateAuditLog();
  return useMutation({
    mutationFn: async (payload: {
      member_id: string;
      org_id: string;
      document_type: string;
      document_url: string;
      userId: string;
    }) => {
      const newVerify: IdentityVerification = {
        id: "verify-" + Math.random().toString(36).substring(2, 9),
        member_id: payload.member_id,
        org_id: payload.org_id,
        document_type: payload.document_type,
        document_url: payload.document_url,
        submitted_at: new Date().toISOString(),
        status: "pending",
      };

      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("identity_verifications")
          .insert(newVerify)
          .select()
          .single();
        if (error) throw error;

        // update member status pending document
        await supabase
          .from("org_members")
          .update({ verification_status: "pending" })
          .eq("id", payload.member_id);
        return data as IdentityVerification;
      }

      await delay(200);
      const list = MockDB.getIdentityVerifications();
      list.push(newVerify);
      MockDB.saveIdentityVerifications(list);

      // Update mock member verification state
      const members = MockDB.getMembers();
      const idx = members.findIndex((m) => m.id === payload.member_id);
      if (idx !== -1) {
        members[idx].verification_status = "pending";
        MockDB.saveMembers(members);
      }

      await auditMutation.mutateAsync({
        org_id: payload.org_id,
        performed_by: payload.userId,
        action: "submit_id_document",
        action_label: "Uploaded verification document photo",
        target_table: "identity_verifications",
        target_id: newVerify.id,
        target_label: payload.document_type,
      });

      return newVerify;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["identity_verifications", data.org_id],
      });
      queryClient.invalidateQueries({ queryKey: ["members", data.org_id] });
    },
  });
}

export function useReviewIdentityVerification() {
  const queryClient = useQueryClient();
  const auditMutation = useCreateAuditLog();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      org_id: string;
      member_id: string;
      status: "approved" | "rejected";
      reviewed_by: string;
      review_notes?: string;
    }) => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("identity_verifications")
          .update({
            status: payload.status,
            reviewed_at: new Date().toISOString(),
            reviewed_by: payload.reviewed_by,
            review_notes: payload.review_notes,
          })
          .eq("id", payload.id)
          .select()
          .single();
        if (error) throw error;

        await supabase
          .from("org_members")
          .update({
            verification_status:
              payload.status === "approved" ? "verified" : "rejected",
          })
          .eq("id", payload.member_id);
        return data as IdentityVerification;
      }

      await delay(200);
      const list = MockDB.getIdentityVerifications();
      const vi = list.findIndex((v) => v.id === payload.id);
      if (vi !== -1) {
        list[vi] = {
          ...list[vi],
          status: payload.status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: payload.reviewed_by,
          review_notes: payload.review_notes,
        };
        MockDB.saveIdentityVerifications(list);
      }

      const members = MockDB.getMembers();
      const mi = members.findIndex((m) => m.id === payload.member_id);
      if (mi !== -1) {
        members[mi].verification_status =
          payload.status === "approved" ? "verified" : "rejected";
        MockDB.saveMembers(members);
      }

      await auditMutation.mutateAsync({
        org_id: payload.org_id,
        performed_by: payload.reviewed_by,
        action: "review_id_document",
        action_label: `Reviewed Identity verification document: ${payload.status.toUpperCase()}`,
        target_table: "identity_verifications",
        target_id: payload.id,
        target_label: `Member verification review`,
      });

      return payload;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["identity_verifications", data.org_id],
      });
      queryClient.invalidateQueries({ queryKey: ["members", data.org_id] });
    },
  });
}

// 7. Secure Documents and Acknowledgements
export function useV2Documents(orgId: string | undefined) {
  return useQuery({
    queryKey: ["v2_documents", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      if (isSupabaseConfigured) {
        let sbDocs: Document[] = [];
        try {
          const { data, error } = await supabase
            .from("documents")
            .select("*")
            .eq("org_id", orgId);
          if (!error && data) {
            sbDocs = (data || []).map((doc: any) => ({
              ...doc,
              show_header: doc.file_url?.includes("show_header=false") ? false : true
            })) as Document[];
          }
        } catch (dbErr) {
          console.warn("Supabase fetch documents error:", dbErr);
        }

        const localDocs = MockDB.getDocuments().filter((d: any) => d.org_id === orgId) as Document[];
        const resultMap = new Map<string, Document>();
        localDocs.forEach((d) => resultMap.set(d.id, d));
        sbDocs.forEach((d) => resultMap.set(d.id, d));

        const unsynced = localDocs.filter((d) => !sbDocs.some((s) => s.id === d.id));
        if (unsynced.length > 0) {
          try {
            await supabase.from("documents").upsert(unsynced);
          } catch (syncErr) {
            console.warn("[Documents Supabase Sync] Failed to sync local documents:", syncErr);
          }
        }
        return Array.from(resultMap.values());
      }
      await delay(100);
      return MockDB.getDocuments().filter((d: any) => d.org_id === orgId);
    },
    enabled: !!orgId,
  });
}

export function useSubmitDocument() {
  const queryClient = useQueryClient();
  const auditMutation = useCreateAuditLog();
  return useMutation({
    mutationFn: async (payload: {
      org_id: string;
      name: string;
      file_url?: string;
      file_size?: string;
      uploaded_by: string;
      uploader_name: string;
      requires_acknowledgement: boolean;
      acknowledgement_deadline?: string;
      content?: string;
      file_type?: "word" | "excel" | "pdf" | "image" | "other";
      recipient_member_ids?: string[];
      is_letter?: boolean;
      show_header?: boolean;
      is_private?: boolean;
    }) => {
      const docId = "doc-" + Math.random().toString(36).substring(2, 9);
      let finalFileUrl = payload.file_url || "";
      
      if (finalFileUrl.startsWith("data:")) {
        const { data, contentType } = dataUrlToUint8Array(finalFileUrl);
        const docName = payload?.name || "document";
        const fileName = `${payload.org_id}/${docId}-${docName.replace(/\s+/g, "_")}`;
        await uploadFile(fileName, data, contentType);
        const { data: publicUrlData } = supabase.storage.from("impacto-files").getPublicUrl(fileName);
        finalFileUrl = publicUrlData.publicUrl;
      }
      
      const serializedFileUrl = finalFileUrl + "#show_header=" + (payload.show_header !== false);

      const newDoc: Document = {
        id: docId,
        org_id: payload.org_id,
        name: payload.name,
        file_url: serializedFileUrl,
        file_size: payload.file_size || "0.0 KB",
        uploaded_by: payload.uploaded_by,
        uploader_name: payload.uploader_name,
        requires_acknowledgement: payload.requires_acknowledgement,
        acknowledgement_deadline: payload.acknowledgement_deadline,
        created_at: new Date().toISOString(),
        content: payload.content,
        file_type: payload.file_type || "other",
        recipient_member_ids: payload.recipient_member_ids || [],
        is_letter: !!payload.is_letter,
        show_header: payload.show_header !== false, // default to true
        is_private: !!payload.is_private,
      };

      if (isSupabaseConfigured) {
        const { show_header, ...docForDb } = newDoc;
        try {
          const { data, error } = await supabase
            .from("documents")
            .insert(docForDb)
            .select()
            .single();
          if (error) throw error;
          return {
            ...data,
            show_header: payload.show_header !== false
          } as Document;
        } catch (dbErr: any) {
          if (
            dbErr.code === "PGRST204" ||
            dbErr.code === "23503" ||
            dbErr.message?.includes("uploader_name") ||
            dbErr.message?.includes("uploaded_by")
          ) {
            const { uploader_name, uploaded_by, ...docWithoutUser } = docForDb;
            const { data, error } = await supabase
              .from("documents")
              .insert(docWithoutUser)
              .select()
              .single();
            if (error) throw error;
            return {
              ...data,
              uploader_name: "Anonymous Representative",
              show_header: payload.show_header !== false
            } as Document;
          }
          throw dbErr;
        }
      }

      await delay(150);
      const docs = MockDB.getDocuments();
      docs.unshift(newDoc);
      MockDB.saveDocuments(docs);

      await auditMutation.mutateAsync({
        org_id: payload.org_id,
        performed_by: payload.uploaded_by,
        action: "upload_document",
        action_label: `Uploaded Document: ${payload.name}`,
        target_table: "documents",
        target_id: docId,
        target_label: payload.name,
      });

      return newDoc;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["v2_documents", data.org_id],
      });
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      org_id: string;
      name?: string;
      content?: string;
      file_size?: string;
      recipient_member_ids?: string[];
      show_header?: boolean;
      is_private?: boolean;
    }) => {
      if (isSupabaseConfigured) {
        const { show_header, ...dbPayload } = payload as any;
        if (show_header !== undefined) {
          dbPayload.file_url = `#show_header=${show_header}`;
        }
        const { data, error } = await supabase
          .from("documents")
          .update(dbPayload)
          .eq("id", payload.id)
          .select()
          .single();
        if (error) throw error;
        return {
          ...data,
          show_header: show_header !== undefined ? show_header : (data.file_url?.includes("show_header=false") ? false : true)
        } as Document;
      }

      await delay(100);
      const docs = MockDB.getDocuments();
      const idx = docs.findIndex((d) => d.id === payload.id);
      if (idx !== -1) {
        docs[idx] = {
          ...docs[idx],
          ...payload,
        };
        MockDB.saveDocuments(docs);
        return docs[idx];
      }
      throw new Error("Document not found");
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["v2_documents", data.org_id],
      });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, orgId }: { id: string; orgId: string }) => {
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from("documents")
          .delete()
          .eq("id", id);
        if (error) throw error;
        return { id, orgId };
      }

      await delay(100);
      const docs = MockDB.getDocuments();
      const filtered = docs.filter((d) => d.id !== id);
      MockDB.saveDocuments(filtered);
      return { id, orgId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["v2_documents", data.orgId],
      });
    },
  });
}

export function useDocumentAcknowledgements(documentId: string | undefined) {
  return useQuery({
    queryKey: ["document_acknowledgements", documentId],
    queryFn: async () => {
      if (!documentId) return [];
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("document_acknowledgements")
          .select("*")
          .eq("document_id", documentId);
        if (error) throw error;
        return data as DocumentAcknowledgement[];
      }
      await delay(80);
      return MockDB.getDocumentAcknowledgements().filter(
        (a) => a.document_id === documentId,
      );
    },
    enabled: !!documentId,
  });
}

export function useAcknowledgeDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      document_id: string;
      member_id: string;
      org_id: string;
      document_version: number;
    }) => {
      const newAck: DocumentAcknowledgement = {
        id: "ack-" + Math.random().toString(36).substring(2, 9),
        document_id: payload.document_id,
        member_id: payload.member_id,
        org_id: payload.org_id,
        document_version: payload.document_version,
        acknowledged_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("document_acknowledgements")
          .insert(newAck)
          .select()
          .single();
        if (error) throw error;
        return data as DocumentAcknowledgement;
      }

      await delay(150);
      const list = MockDB.getDocumentAcknowledgements();
      const existing = list.some(
        (a) =>
          a.document_id === payload.document_id &&
          a.member_id === payload.member_id &&
          a.document_version === payload.document_version,
      );
      if (!existing) {
        list.push(newAck);
        MockDB.saveDocumentAcknowledgements(list);
      }
      return newAck;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["document_acknowledgements", data.document_id],
      });
      queryClient.invalidateQueries({ queryKey: ["v2_documents"] });
    },
  });
}

// 8. Resignations and Exit offboarding
export function useResignations(orgId: string | undefined) {
  return useQuery({
    queryKey: ["resignations", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const localResigns = MockDB.getResignations().filter((r) => r.org_id === orgId);
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("resignations")
            .select("*")
            .eq("org_id", orgId);
          if (!error && data) {
            const map = new Map<string, Resignation>();
            data.forEach((r: any) => map.set(r.id, r));
            localResigns.forEach((lr) => {
              if (!map.has(lr.id)) map.set(lr.id, lr);
            });
            return Array.from(map.values()) as Resignation[];
          }
        } catch (e) {
          console.warn("[Resignations] Supabase query fallback to local:", e);
        }
      }
      await delay(150);
      return localResigns as Resignation[];
    },
    enabled: !!orgId,
  });
}

export function useSubmitResignation() {
  const queryClient = useQueryClient();
  const auditMutation = useCreateAuditLog();
  return useMutation({
    mutationFn: async (payload: {
      member_id: string;
      org_id: string;
      reason_category?: string;
      reason_detail?: string;
      userId: string;
    }) => {
      const resignId = "res-" + Math.random().toString(36).substring(2, 9);
      const newResign: Resignation = {
        id: resignId,
        member_id: payload.member_id,
        org_id: payload.org_id,
        reason_category: payload.reason_category,
        reason_detail: payload.reason_detail,
        submitted_at: new Date().toISOString(),
        status: "pending",
      };

      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("resignations")
          .insert(newResign)
          .select()
          .single();
        if (error) throw error;
        await supabase
          .from("org_members")
          .update({ status: "resigned" })
          .eq("id", payload.member_id);
        return data as Resignation;
      }

      await delay(200);
      const list = MockDB.getResignations();
      list.unshift(newResign);
      MockDB.saveResignations(list);

      // update member status
      const members = MockDB.getMembers();
      const idx = members.findIndex((m) => m.id === payload.member_id);
      if (idx !== -1) {
        members[idx].status = "resigned";
        MockDB.saveMembers(members);
      }

      await auditMutation.mutateAsync({
        org_id: payload.org_id,
        performed_by: payload.userId,
        action: "member_resign",
        action_label: "Submitted Membership Resignation Request",
        target_table: "resignations",
        target_id: resignId,
        target_label: "Self offboarding submission",
      });

      return newResign;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["resignations", data.org_id],
      });
      queryClient.invalidateQueries({ queryKey: ["members", data.org_id] });
    },
  });
}

export function useFinalizeResignation() {
  const queryClient = useQueryClient();
  const auditMutation = useCreateAuditLog();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      org_id: string;
      member_id: string;
      admin_response?: string;
      admin_responded_by: string;
    }) => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("resignations")
          .update({
            status: "finalized",
            finalized_at: new Date().toISOString(),
            admin_response: payload.admin_response,
            admin_responded_at: new Date().toISOString(),
            admin_responded_by: payload.admin_responded_by,
          })
          .eq("id", payload.id)
          .select()
          .single();
        if (error) throw error;
        return data as Resignation;
      }

      await delay(150);
      const list = MockDB.getResignations();
      const idx = list.findIndex((r) => r.id === payload.id);
      if (idx !== -1) {
        list[idx] = {
          ...list[idx],
          status: "finalized",
          finalized_at: new Date().toISOString(),
          admin_response: payload.admin_response,
          admin_responded_at: new Date().toISOString(),
          admin_responded_by: payload.admin_responded_by,
        };
        MockDB.saveResignations(list);
      }

      await auditMutation.mutateAsync({
        org_id: payload.org_id,
        performed_by: payload.admin_responded_by,
        action: "resign_finalized",
        action_label: "Finalized member exit and logged survey",
        target_table: "resignations",
        target_id: payload.id,
        target_label: "Final exit processed",
      });

      return payload;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["resignations", data.org_id],
      });
      queryClient.invalidateQueries({ queryKey: ["members", data.org_id] });
    },
  });
}

// ==========================================
// 12. NEW SYSTEM ADVANCEMENTS: ATTENDANCE CHECKLIST, FEES, MARKETPLACE
// ==========================================

export function useEventAttendance(eventId: string | undefined) {
  return useQuery({
    queryKey: ["event_attendance", eventId],
    queryFn: async () => {
      if (!eventId) return [];
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("event_attendance")
            .select("*")
            .eq("event_id", eventId);
          if (!error && data) {
            return data as EventAttendance[];
          }
        } catch (err) {
          console.warn("[EventAttendance] Fetch notice:", err);
        }
      }
      await delay(100);
      return MockDB.getEventAttendance().filter(
        (a) => a.event_id === eventId,
      ) as EventAttendance[];
    },
    enabled: !!eventId,
  });
}

export function useAllEventAttendance(orgId: string | undefined) {
  return useQuery({
    queryKey: ["all_event_attendance", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("event_attendance")
            .select("*");
          if (!error && data) return data as EventAttendance[];
        } catch (e) {
          console.warn("Failed fetching all event_attendance from supabase:", e);
        }
      }
      await delay(100);
      const orgEvents = MockDB.getEvents().filter((e) => e.org_id === orgId).map((e) => e.id);
      return (MockDB.getEventAttendance() as EventAttendance[]).filter((a) =>
        orgEvents.includes(a.event_id)
      );
    },
    enabled: !!orgId,
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      event_id,
      member_id,
    }: {
      event_id: string;
      member_id: string;
    }) => {
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from("event_attendance")
          .delete()
          .eq("event_id", event_id)
          .eq("member_id", member_id);
        if (error) throw error;

        // update attendees count in events
        const { data: ev } = await supabase
          .from("events")
          .select("attendees_count, org_id")
          .eq("id", event_id)
          .single();
        if (ev) {
          const newCount = Math.max(0, (ev.attendees_count || 0) - 1);
          await supabase
            .from("events")
            .update({ attendees_count: newCount })
            .eq("id", event_id);
          return { org_id: ev.org_id, event_id };
        }
        return { org_id: "", event_id };
      }
      await delay(100);
      const events = MockDB.getEvents();
      const idx = events.findIndex((e) => e.id === event_id);
      if (idx !== -1) {
        events[idx].attendees_count = Math.max(
          0,
          events[idx].attendees_count - 1,
        );
        MockDB.saveEvents(events);

        // Remove local event attendance record
        const att = MockDB.getEventAttendance().filter(
          (a) => !(a.event_id === event_id && a.member_id === member_id),
        );
        MockDB.saveEventAttendance(att);

        return { org_id: events[idx].org_id, event_id };
      }
      return { org_id: "", event_id };
    },
    onSuccess: (res) => {
      if (res.org_id)
        queryClient.invalidateQueries({ queryKey: ["events", res.org_id] });
      queryClient.invalidateQueries({
        queryKey: ["event_attendance", res.event_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["all_event_attendance"],
      });
    },
  });
}

const DELETED_FEES_STORAGE_KEY = "impacto_deleted_fee_ids";

export function getDeletedFeeIds(): Set<string> {
  if (typeof window === "undefined" || !window.localStorage) return new Set();
  try {
    const raw = localStorage.getItem(DELETED_FEES_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function addDeletedFeeIds(ids: string[]) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const current = getDeletedFeeIds();
    ids.forEach((id) => {
      if (id) current.add(id);
    });
    localStorage.setItem(DELETED_FEES_STORAGE_KEY, JSON.stringify(Array.from(current)));
  } catch (err) {
    console.warn("Could not save deleted fee IDs", err);
  }
}

export function useMemberFees(orgId: string | undefined) {
  return useQuery({
    queryKey: ["member_fees", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const deletedIds = getDeletedFeeIds();
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("member_fees")
            .select("*")
            .eq("org_id", orgId);
          if (error) throw error;

          // Fetch all members & users to accurately map member names
          const { data: members } = await supabase
            .from("org_members")
            .select("id, user_id, role, status, org_id")
            .eq("org_id", orgId);

          const { data: usersData } = await supabase
            .from("users")
            .select("id, full_name, email");

          const localMembers = MockDB.getMembers().filter((m) => m.org_id === orgId);
          const localUsers = MockDB.getUsers();

          let currentFees = (data || []).filter((f) => !deletedIds.has(f.id));

          // If direct Supabase query returns 0 rows (e.g. non-accountant blocked by Supabase RLS), fallback to server API
          if (currentFees.length === 0) {
            try {
              const apiRes = await fetch(`/api/member-fees?orgId=${encodeURIComponent(orgId)}`);
              if (apiRes.ok) {
                const apiData = await apiRes.json();
                if (apiData.success && Array.isArray(apiData.fees) && apiData.fees.length > 0) {
                  currentFees = apiData.fees.filter((f: any) => !deletedIds.has(f.id));
                  // Sync to local MockDB
                  const existingList = MockDB.getMemberFees().filter((f) => f.org_id !== orgId);
                  MockDB.saveMemberFees([...existingList, ...currentFees]);
                }
              }
            } catch (apiErr) {
              console.warn("[Fees API Fallback] Notice:", apiErr);
            }
          }

          // Check if local MockDB already has fees for this specific org (only if never deleted and actually has local fees)
          const existingLocalFees = MockDB.getMemberFees().filter((f) => f.org_id === orgId && !deletedIds.has(f.id));
          if (currentFees.length === 0 && existingLocalFees.length > 0 && deletedIds.size === 0) {
            currentFees = existingLocalFees;
            // Push existing local fees to Supabase so remote database is populated
            try {
              const cleanPayloads = existingLocalFees.map((f) => ({
                id: f.id,
                org_id: f.org_id,
                member_id: f.member_id,
                amount: f.amount || 0,
                currency: f.currency || "RWF",
                payment_period: f.payment_period || "monthly",
                period_date: f.period_date || new Date().toISOString().slice(0, 7),
                status: f.status || "pending",
                paid_at: f.paid_at || null,
                paid_by_method: f.paid_by_method || null,
                transaction_reference: f.transaction_reference || null,
                sender_info: f.sender_info || null,
                reported_at: f.reported_at || null,
                report_note: f.report_note || null,
                admin_note: f.admin_note || null,
                proof_url: f.proof_url || null,
                created_at: f.created_at || new Date().toISOString(),
              }));
              await supabase.from("member_fees").upsert(cleanPayloads);
            } catch (syncErr) {
              console.warn("[Fees Supabase Sync] Syncing local fees to remote failed:", syncErr);
            }
          }

          const resultMap = new Map<string, MemberFee>();

          const resolveMemberName = (feeItem: any): string => {
            if (feeItem.member_name && feeItem.member_name !== "Cooperative Member") {
              return feeItem.member_name;
            }
            const matchedMem =
              (members || []).find((m) => m.id === feeItem.member_id || m.user_id === feeItem.member_id) ||
              localMembers.find((m) => m.id === feeItem.member_id || m.user_id === feeItem.member_id);
            const matchedUser = matchedMem
              ? (usersData || []).find((u) => u.id === matchedMem.user_id) ||
                localUsers.find((u) => u.id === matchedMem.user_id)
              : (usersData || []).find((u) => u.id === feeItem.member_id) ||
                localUsers.find((u) => u.id === feeItem.member_id);

            return (
              matchedUser?.full_name ||
              (matchedMem as any)?.user?.full_name ||
              (matchedMem as any)?.full_name ||
              (matchedMem as any)?.user?.email ||
              feeItem.member_name ||
              "Cooperative Member"
            );
          };

          currentFees.forEach((f) => {
            if (deletedIds.has(f.id)) return;
            const memberName = resolveMemberName(f);
            resultMap.set(f.id, {
              ...f,
              amount: Number(f.amount) || 0,
              member_name: memberName,
            } as MemberFee);
          });

          // Merge local fees for this specific organization (excluding deleted fees)
          const mockFees = MockDB.getMemberFees().filter((f) => f.org_id === orgId && !deletedIds.has(f.id));
          mockFees.forEach((mf) => {
            if (deletedIds.has(mf.id)) return;
            const memberName = resolveMemberName(mf);
            if (resultMap.has(mf.id)) {
              const existing = resultMap.get(mf.id)!;
              resultMap.set(mf.id, {
                ...existing,
                ...mf,
                amount: Number(mf.amount !== undefined ? mf.amount : existing.amount) || 0,
                status: mf.status || existing.status,
                member_name: memberName || existing.member_name,
              });
            } else {
              resultMap.set(mf.id, {
                ...mf,
                amount: Number(mf.amount) || 0,
                member_name: memberName,
              });
            }
          });

          return Array.from(resultMap.values()).filter((f) => !deletedIds.has(f.id));
        } catch (e) {
          console.warn("[Member Fees] Remote query notice, checking backend API fallback:", e);
          try {
            const apiRes = await fetch(`/api/member-fees?orgId=${encodeURIComponent(orgId)}`);
            if (apiRes.ok) {
              const apiData = await apiRes.json();
              if (apiData.success && Array.isArray(apiData.fees) && apiData.fees.length > 0) {
                const apiFees = apiData.fees.filter((f: any) => !deletedIds.has(f.id));
                const existingList = MockDB.getMemberFees().filter((f) => f.org_id !== orgId);
                MockDB.saveMemberFees([...existingList, ...apiFees]);
                return apiFees as MemberFee[];
              }
            }
          } catch (apiErr) {
            console.warn("[Member Fees] Backend API fallback error:", apiErr);
          }
        }
      }

      await delay(150);
      const fees = MockDB.getMemberFees().filter((f) => f.org_id === orgId && !deletedIds.has(f.id));
      const members = MockDB.getMembers().filter((m) => m.org_id === orgId);
      const users = MockDB.getUsers();
      return fees.map((f) => {
        const matchedMem = members.find((m) => m.id === f.member_id || m.user_id === f.member_id);
        const matchedUser = matchedMem ? users.find((u) => u.id === matchedMem.user_id) : null;
        const memberName =
          matchedUser?.full_name ||
          (matchedMem as any)?.user?.full_name ||
          (matchedMem as any)?.full_name ||
          (matchedMem as any)?.user?.email ||
          f.member_name ||
          "Cooperative Member";
        return {
          ...f,
          amount: Number(f.amount) || 0,
          member_name: memberName,
        } as MemberFee;
      });
    },
    enabled: !!orgId,
  });
}

export function useCreateMemberFee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<MemberFee, "id" | "created_at"> & { user_id?: string; actor_name?: string }) => {
      const newId = `fee-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const createdAt = new Date().toISOString();
      const { user_id, actor_name, ...restPayload } = payload;
      const feeRow = { ...restPayload, id: newId, created_at: createdAt };

      if (isSupabaseConfigured) {
        try {
          const resp = await fetch("/api/member-fees/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(feeRow),
          });

          if (resp.ok) {
            const resData = await resp.json();
            const createdFee = resData.fee || feeRow;

            // Maintain local sync
            const list = MockDB.getMemberFees();
            list.push(createdFee as any);
            MockDB.saveMemberFees(list);

            // Audit log dispatch
            fetch("/api/audit-logs/create", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                org_id: payload.org_id,
                user_id: user_id || null,
                actor_name: actor_name || "Accountant",
                action_type: "fee_created",
                description: `Created ${payload.payment_period} dues charge of ${Number(payload.amount).toLocaleString()} RWF for period ${payload.period_date || "N/A"}`,
                metadata_json: { fee_id: newId, amount: payload.amount, member_id: payload.member_id },
              }),
            }).catch(() => {});

            return createdFee as MemberFee;
          }
        } catch (e) {
          console.warn("[Fee Creation] Remote insert fee error, falling back to local storage:", e);
        }
      }

      await delay(100);
      const list = MockDB.getMemberFees();
      list.push(feeRow);
      MockDB.saveMemberFees(list);

      // Record in local Audit logs
      const auditLogs = MockDB.getAuditLogs();
      auditLogs.unshift({
        id: "audit-" + Math.random().toString(36).substring(2, 9),
        org_id: payload.org_id,
        user_id: user_id || "admin",
        actor_name: actor_name || "Accountant",
        action_type: "fee_created",
        description: `Created ${payload.payment_period} dues charge of ${Number(payload.amount).toLocaleString()} RWF for period ${payload.period_date || "N/A"}`,
        metadata_json: { fee_id: newId, amount: payload.amount, member_id: payload.member_id },
        created_at: new Date().toISOString(),
      });
      MockDB.saveAuditLogs(auditLogs);

      if (payload.status === "paid") {
        const members = MockDB.getMembers();
        const users = MockDB.getUsers();
        const matchedMem = members.find((m) => m.id === payload.member_id);
        const matchedUser = matchedMem ? users.find((u) => u.id === matchedMem.user_id) : null;
        const memberName = matchedUser?.full_name || matchedMem?.user?.full_name || "Cooperative Member";
        const desc = `Member Fee Paid (${payload.payment_period.toUpperCase()}) - ${memberName} - Period: ${payload.period_date || 'N/A'}`;
        const ref = `FEE-${newId.slice(0, 8)}`;
        const dateVal = payload.paid_at ? payload.paid_at.split("T")[0] : new Date().toISOString().split("T")[0];

        const ledger = MockDB.getLedger();
        ledger.push({
          id: "led-fee-" + Math.random().toString(36).substring(2, 9),
          org_id: payload.org_id,
          type: "income",
          amount: payload.amount,
          currency: payload.currency || "RWF",
          category: "membership_fee",
          description: desc,
          date: dateVal,
          reference: ref,
        });
        MockDB.saveLedger(ledger);
      }

      return feeRow as MemberFee;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["member_fees", data.org_id] });
      queryClient.invalidateQueries({ queryKey: ["member_fees"] });
      queryClient.invalidateQueries({ queryKey: ["ledger", data.org_id] });
      queryClient.invalidateQueries({ queryKey: ["audit_logs", data.org_id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats", data.org_id] });
    },
  });
}

export function useUpdateMemberFeeStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      org_id,
      member_id,
      amount,
      payment_period,
      period_date,
      status,
      paid_at,
      paid_by_method,
      transaction_reference,
      sender_info,
      reported_at,
      report_note,
      admin_note,
      proof_url,
      actor_name,
      user_id,
    }: {
      id: string;
      org_id: string;
      member_id?: string;
      amount?: number;
      payment_period?: string;
      period_date?: string;
      status: "paid" | "pending" | "pending_confirmation";
      paid_at?: string;
      paid_by_method?: "MTN MoMo" | "Airtel Money" | "Bank Transfer" | "Cash" | string;
      transaction_reference?: string;
      sender_info?: string;
      reported_at?: string;
      report_note?: string;
      admin_note?: string;
      proof_url?: string;
      actor_name?: string;
      user_id?: string;
    }) => {
      if (isSupabaseConfigured) {
        try {
          const updatePayload: any = {
            status,
            paid_at: paid_at || null,
            paid_by_method: paid_by_method || null,
            transaction_reference: transaction_reference || null,
            sender_info: sender_info || null,
            reported_at: reported_at || null,
            report_note: report_note || null,
            admin_note: admin_note || null,
            proof_url: proof_url || null,
          };
          if (org_id) updatePayload.org_id = org_id;
          if (member_id) updatePayload.member_id = member_id;
          if (amount !== undefined) updatePayload.amount = amount;
          if (payment_period) updatePayload.payment_period = payment_period;
          if (period_date) updatePayload.period_date = period_date;

          await supabase.from("member_fees").update(updatePayload).eq("id", id);
        } catch (sErr) {
          console.warn("[Fees Supabase Direct] Direct update warning:", sErr);
        }

        try {
          const { data: { session } } = await supabase.auth.getSession();
          await fetch("/api/member-fees/update", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {}),
            },
            body: JSON.stringify({
              id,
              org_id,
              member_id,
              amount,
              payment_period,
              period_date,
              status,
              paid_at,
              paid_by_method,
              transaction_reference,
              sender_info,
              reported_at,
              report_note,
              admin_note,
              proof_url,
            }),
          });
        } catch (e) {
          console.warn("[Fees API] Remote update network error, falling back to local sync...", e);
        }

        // Audit log dispatch for status change
        const actionDesc =
          status === "paid"
            ? `Verified and approved fee payment (${Number(amount || 0).toLocaleString()} RWF) via ${paid_by_method || "Payment"}`
            : status === "pending_confirmation"
            ? `Reported fee payment slip for verification (Ref: ${transaction_reference || "N/A"})`
            : `Updated fee status to ${status}`;

        fetch("/api/audit-logs/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            org_id,
            user_id: user_id || null,
            actor_name: actor_name || (status === "paid" ? "Accountant" : "Member"),
            action_type: status === "paid" ? "fee_verified" : "fee_reported",
            description: actionDesc,
            metadata_json: { fee_id: id, status, amount, ref: transaction_reference },
          }),
        }).catch(() => {});
      }

      await delay(50);
      const list = MockDB.getMemberFees();
      const idx = list.findIndex((f) => f.id === id);
      let updatedFee: MemberFee;
      if (idx !== -1) {
        const prevFee = list[idx];
        updatedFee = {
          ...prevFee,
          status,
          paid_at: paid_at || prevFee.paid_at,
          paid_by_method: (paid_by_method as any) || prevFee.paid_by_method,
          transaction_reference: transaction_reference || prevFee.transaction_reference,
          sender_info: sender_info || prevFee.sender_info,
          reported_at: reported_at || prevFee.reported_at,
          report_note: report_note || prevFee.report_note,
          admin_note: admin_note || prevFee.admin_note,
          proof_url: proof_url || prevFee.proof_url,
        };
        list[idx] = updatedFee;
      } else {
        updatedFee = {
          id,
          org_id,
          member_id: member_id || "",
          amount: amount || 0,
          currency: "RWF",
          payment_period: (payment_period as any) || "monthly",
          period_date: period_date || new Date().toISOString().slice(0, 7),
          status,
          paid_at,
          paid_by_method: (paid_by_method as any) || "MTN MoMo",
          transaction_reference,
          sender_info,
          reported_at,
          report_note,
          admin_note,
          proof_url,
          created_at: new Date().toISOString(),
        } as MemberFee;
        list.push(updatedFee);
      }
      MockDB.saveMemberFees(list);

      // Local audit log
      const auditLogs = MockDB.getAuditLogs();
      auditLogs.unshift({
        id: "audit-" + Math.random().toString(36).substring(2, 9),
        org_id,
        user_id: user_id || "system",
        actor_name: actor_name || (status === "paid" ? "Accountant" : "Member"),
        action_type: status === "paid" ? "fee_verified" : "fee_reported",
        description:
          status === "paid"
            ? `Verified and approved fee payment (${Number(amount || 0).toLocaleString()} RWF) via ${paid_by_method || "Payment"}`
            : `Updated fee status to ${status}`,
        metadata_json: { fee_id: id, status, amount, ref: transaction_reference },
        created_at: new Date().toISOString(),
      });
      MockDB.saveAuditLogs(auditLogs);

      // If status turned to 'paid', document in accounting Ledger
      if (status === "paid") {
        const members = MockDB.getMembers();
        const users = MockDB.getUsers();
        const matchedMem = members.find((m) => m.id === updatedFee.member_id || m.user_id === updatedFee.member_id);
        const matchedUser = matchedMem ? users.find((u) => u.id === matchedMem.user_id) : users.find((u) => u.id === updatedFee.member_id);
        const memberName =
          matchedUser?.full_name ||
          (matchedMem as any)?.user?.full_name ||
          (matchedMem as any)?.full_name ||
          (matchedMem as any)?.user?.email ||
          updatedFee.member_name ||
          "Cooperative Member";

        const feeAmountNum = Number(updatedFee.amount) || Number(amount) || 0;
        const desc = `Member Fee Paid (${(updatedFee.payment_period || 'fee').toUpperCase()}) - ${memberName} - Period: ${updatedFee.period_date || 'N/A'}`;
        const ref = transaction_reference || updatedFee.transaction_reference || `FEE-${id.slice(0, 8)}`;
        const dateVal = paid_at ? paid_at.split("T")[0] : (updatedFee.paid_at ? updatedFee.paid_at.split("T")[0] : new Date().toISOString().split("T")[0]);

        if (isSupabaseConfigured) {
          try {
            await supabase.from("ledger_entries").insert({
              org_id: org_id,
              type: "income",
              amount: feeAmountNum,
              currency: updatedFee.currency || "RWF",
              category: "membership_fee",
              description: desc,
              date: dateVal,
              reference: ref,
            });
          } catch (e) {
            console.warn("Supabase ledger auto-insert warning:", e);
          }
        }

        const ledger = MockDB.getLedger();
        const exists = ledger.some((l) => l.reference === ref && Number(l.amount) === feeAmountNum);
        if (!exists) {
          ledger.push({
            id: "led-fee-" + Math.random().toString(36).substring(2, 9),
            org_id: org_id,
            type: "income",
            amount: feeAmountNum,
            currency: updatedFee.currency || "RWF",
            category: "membership_fee",
            description: desc,
            date: dateVal,
            reference: ref,
          });
          MockDB.saveLedger(ledger);
        }
      }
      return { id, org_id };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["member_fees", res.org_id] });
      queryClient.invalidateQueries({ queryKey: ["member_fees"] });
      queryClient.invalidateQueries({ queryKey: ["ledger", res.org_id] });
      queryClient.invalidateQueries({ queryKey: ["audit_logs", res.org_id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats", res.org_id] });
    },
  });
}

export function useDeleteMemberFee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ids,
      org_id,
      user_name,
      user_id,
      fee_amount,
      fee_ref,
      member_name,
    }: {
      id?: string;
      ids?: string[];
      org_id: string;
      user_name?: string;
      user_id?: string;
      fee_amount?: number;
      fee_ref?: string;
      member_name?: string;
    }) => {
      const targetIds: string[] = Array.isArray(ids) && ids.length > 0 ? ids : id ? [id] : [];
      if (targetIds.length === 0) return { id: "", ids: [], org_id };

      // Add to persistent deleted fee IDs immediately
      addDeletedFeeIds(targetIds);

      // 1. Direct Client-side Supabase deletion
      if (isSupabaseConfigured) {
        try {
          if (targetIds.length === 1) {
            await supabase.from("member_fees").delete().eq("id", targetIds[0]);
          } else {
            await supabase.from("member_fees").delete().in("id", targetIds);
          }
        } catch (clientErr) {
          console.warn("[Fees API] Client direct delete notice:", clientErr);
        }

        // 2. Server-side API deletion (with service role & audit log)
        try {
          await fetch("/api/member-fees/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: targetIds[0],
              ids: targetIds,
              org_id,
              user_name,
              user_id,
              fee_amount,
              fee_ref,
              member_name,
            }),
          });
        } catch (serverErr) {
          console.warn("[Fees API] Server delete notice:", serverErr);
        }
      }

      await delay(50);
      // Remove from MockDB fees
      const list = MockDB.getMemberFees().filter((f) => !targetIds.includes(f.id));
      MockDB.saveMemberFees(list);

      // Clean up matching ledger entries
      const ledger = MockDB.getLedger().filter((l) => {
        if (l.org_id !== org_id) return true;
        if (fee_ref && l.reference === fee_ref) return false;
        return !targetIds.some((tId) => l.reference && l.reference.includes(tId.slice(0, 8)));
      });
      MockDB.saveLedger(ledger);

      // Write Audit log
      const auditLogs = MockDB.getAuditLogs();
      auditLogs.unshift({
        id: "audit-" + Math.random().toString(36).substring(2, 9),
        org_id,
        user_id: user_id || "accountant",
        actor_name: user_name || "Accountant",
        action_type: "fee_deleted",
        description: `Deleted ${targetIds.length} fee due record(s) - ${member_name || "Member(s)"} - Amount: ${fee_amount ? Number(fee_amount).toLocaleString() + " RWF" : "N/A"}`,
        metadata_json: { target_ids: targetIds, amount: fee_amount, ref: fee_ref },
        created_at: new Date().toISOString(),
      });
      MockDB.saveAuditLogs(auditLogs);

      return { id: targetIds[0], ids: targetIds, org_id };
    },
    onMutate: async (vars) => {
      const targetIds = Array.isArray(vars.ids) && vars.ids.length > 0 ? vars.ids : vars.id ? [vars.id] : [];
      await queryClient.cancelQueries({ queryKey: ["member_fees", vars.org_id] });
      queryClient.setQueryData(["member_fees", vars.org_id], (old: MemberFee[] | undefined) => {
        if (!old) return [];
        return old.filter((f) => !targetIds.includes(f.id));
      });
      queryClient.setQueryData(["member_fees"], (old: MemberFee[] | undefined) => {
        if (!old) return [];
        return old.filter((f) => !targetIds.includes(f.id));
      });
    },
    onSuccess: (res, vars) => {
      const targetIds = Array.isArray(vars.ids) && vars.ids.length > 0 ? vars.ids : vars.id ? [vars.id] : [];
      queryClient.setQueryData(["member_fees", vars.org_id], (old: MemberFee[] | undefined) => {
        if (!old) return [];
        return old.filter((f) => !targetIds.includes(f.id));
      });
      queryClient.invalidateQueries({ queryKey: ["member_fees", vars.org_id] });
      queryClient.invalidateQueries({ queryKey: ["member_fees"] });
      queryClient.invalidateQueries({ queryKey: ["ledger", vars.org_id] });
      queryClient.invalidateQueries({ queryKey: ["audit_logs", vars.org_id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats", vars.org_id] });
    },
  });
}

export function useUpdateAllMemberDues() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      org_id,
      payment_period,
      period_date,
      amount,
      due_date,
      admin_note,
      only_pending = true,
    }: {
      org_id: string;
      payment_period?: string;
      period_date: string;
      amount?: number;
      due_date?: string;
      admin_note?: string;
      only_pending?: boolean;
    }) => {
      if (isSupabaseConfigured) {
        try {
          const updateData: any = {};
          if (amount !== undefined) updateData.amount = amount;
          if (payment_period) updateData.payment_period = payment_period;
          if (due_date !== undefined) updateData.due_date = due_date || null;
          if (admin_note !== undefined) updateData.admin_note = admin_note || null;

          let query = supabase
            .from("member_fees")
            .update(updateData)
            .eq("org_id", org_id)
            .eq("period_date", period_date);

          if (only_pending) {
            query = query.neq("status", "paid");
          }

          const { error } = await query;
          if (error) console.warn("[Update All Dues] Direct client update notice:", error);

          // Server batch API
          await fetch("/api/member-fees/update-batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              org_id,
              period_date,
              payment_period,
              amount,
              due_date,
              admin_note,
              only_pending,
            }),
          }).catch((err) => console.warn("[Update All Dues] Batch API notice:", err));
        } catch (err) {
          console.warn("[Update All Dues] Error updating dues:", err);
        }
      }

      await delay(50);
      const list = MockDB.getMemberFees();
      let updatedCount = 0;
      const updatedList = list.map((f) => {
        if (f.org_id === org_id && f.period_date === period_date) {
          if (!only_pending || f.status !== "paid") {
            updatedCount++;
            return {
              ...f,
              ...(amount !== undefined ? { amount } : {}),
              ...(payment_period ? { payment_period: payment_period as any } : {}),
              ...(due_date !== undefined ? { due_date } : {}),
              ...(admin_note !== undefined ? { admin_note } : {}),
            };
          }
        }
        return f;
      });
      MockDB.saveMemberFees(updatedList);

      return { org_id, period_date, updatedCount };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["member_fees", res.org_id] });
      queryClient.invalidateQueries({ queryKey: ["member_fees"] });
      queryClient.invalidateQueries({ queryKey: ["ledger", res.org_id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats", res.org_id] });
    },
  });
}

export function useUpdateMemberFee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      org_id,
      amount,
      payment_period,
      period_date,
      status,
      title,
      due_date,
      admin_note,
    }: {
      id: string;
      org_id: string;
      amount?: number;
      payment_period?: string;
      period_date?: string;
      status?: "paid" | "pending" | "pending_confirmation";
      title?: string;
      due_date?: string;
      admin_note?: string;
    }) => {
      if (isSupabaseConfigured) {
        try {
          const updateObj: any = {};
          if (amount !== undefined) updateObj.amount = amount;
          if (payment_period) updateObj.payment_period = payment_period;
          if (period_date) updateObj.period_date = period_date;
          if (status) updateObj.status = status;
          if (title) updateObj.title = title;
          if (due_date !== undefined) updateObj.due_date = due_date || null;
          if (admin_note !== undefined) updateObj.admin_note = admin_note || null;
          await supabase.from("member_fees").update(updateObj).eq("id", id);
        } catch (e) {
          console.warn("[Fees API] Remote fee update error", e);
        }
      }
      await delay(50);
      const list = MockDB.getMemberFees();
      const idx = list.findIndex((f) => f.id === id);
      if (idx !== -1) {
        list[idx] = {
          ...list[idx],
          ...(amount !== undefined ? { amount } : {}),
          ...(payment_period ? { payment_period: payment_period as any } : {}),
          ...(period_date ? { period_date } : {}),
          ...(status ? { status } : {}),
          ...(title ? { title } : {}),
          ...(due_date !== undefined ? { due_date } : {}),
          ...(admin_note !== undefined ? { admin_note } : {}),
        };
        MockDB.saveMemberFees(list);
      }
      return { id, org_id };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["member_fees", res.org_id] });
      queryClient.invalidateQueries({ queryKey: ["member_fees"] });
      queryClient.invalidateQueries({ queryKey: ["ledger", res.org_id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats", res.org_id] });
    },
  });
}

export function useMarketplaceProducts(orgId: string | undefined) {
  return useQuery({
    queryKey: ["marketplace_products", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      if (isSupabaseConfigured) {
        let sbProds: MarketplaceProduct[] = [];
        try {
          const { data, error } = await supabase
            .from("marketplace_products")
            .select("*")
            .eq("org_id", orgId)
            .order("created_at", { ascending: false });
          if (!error && data) {
            sbProds = data as MarketplaceProduct[];
          }
        } catch (dbErr) {
          console.warn("Supabase fetch products error:", dbErr);
        }

        const localProds = MockDB.getMarketplaceProducts().filter((p) => p.org_id === orgId) as MarketplaceProduct[];
        const resultMap = new Map<string, MarketplaceProduct>();
        localProds.forEach((p) => resultMap.set(p.id, p));
        sbProds.forEach((p) => resultMap.set(p.id, p));

        const unsynced = localProds.filter((p) => !sbProds.some((s) => s.id === p.id));
        if (unsynced.length > 0) {
          try {
            await supabase.from("marketplace_products").upsert(unsynced);
          } catch (syncErr) {
            console.warn("[Products Supabase Sync] Failed to sync local products:", syncErr);
          }
        }
        return Array.from(resultMap.values());
      }
      await delay(150);
      return MockDB.getMarketplaceProducts().filter(
        (p) => p.org_id === orgId,
      ) as MarketplaceProduct[];
    },
    enabled: !!orgId,
  });
}

export function useCreateMarketplaceProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Omit<MarketplaceProduct, "id" | "created_at">,
    ) => {
      const generateUUID = () => {
        if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
          return crypto.randomUUID();
        }
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      };
      const newId = generateUUID();
      const createdAt = new Date().toISOString();
      const newProd = { ...payload, id: newId, created_at: createdAt };

      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("marketplace_products")
          .insert({
            id: newId,
            org_id: payload.org_id,
            title: payload.title,
            description: payload.description,
            price: payload.price,
            currency: payload.currency,
            image_url: payload.image_url,
            contact_info: payload.contact_info,
            created_by: payload.created_by,
            created_at: createdAt,
          })
          .select()
          .single();
        if (error) throw error;
        return data as MarketplaceProduct;
      }
      await delay(100);
      const products = MockDB.getMarketplaceProducts();
      products.push(newProd);
      MockDB.saveMarketplaceProducts(products);
      return newProd as MarketplaceProduct;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["marketplace_products", data.org_id],
      });
    },
  });
}

export function useMarketplaceLeads(orgId: string | undefined) {
  return useQuery({
    queryKey: ["marketplace_leads", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("marketplace_leads")
            .select(
              "*, member:member_id(*, user:user_id(full_name, email)), product:product_id(title, org_id)",
            )
            .order("created_at", { ascending: false });
          if (!error && data) {
            // Filter those belonging to this org
            const filtered = (data || []).filter(
              (l) => l.product?.org_id === orgId,
            );
            return filtered.map(
              (l) =>
                ({
                  id: l.id,
                  product_id: l.product_id,
                  member_id: l.member_id,
                  message: l.message,
                  created_at: l.created_at,
                  member_name: l.member?.user?.full_name || "Unknown Member",
                  member_email: l.member?.user?.email || "Unknown Email",
                  product_title: l.product?.title || "Unknown Product",
                }) as MarketplaceLead,
            );
          }
        } catch (err) {
          console.warn("[MarketplaceLeads] Fetch notice:", err);
        }
      }
      await delay(150);
      const leads = MockDB.getMarketplaceLeads();
      const products = MockDB.getMarketplaceProducts().filter(
        (p) => p.org_id === orgId,
      );
      const members = MockDB.getMembers().filter((m) => m.org_id === orgId);
      const users = MockDB.getUsers();

      return leads
        .filter((l) => products.some((p) => p.id === l.product_id))
        .map((l) => {
          const prod = products.find((p) => p.id === l.product_id);
          const mem = members.find((m) => m.id === l.member_id);
          const usr = mem ? users.find((u) => u.id === mem.user_id) : null;

          return {
            ...l,
            member_name: usr?.full_name || "Unknown Member",
            member_email: usr?.email || "Unknown Email",
            product_title: prod?.title || "Unknown Product",
          } as MarketplaceLead;
        });
    },
    enabled: !!orgId,
  });
}

export function useExpressInterest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      org_id,
      product_id,
      member_id,
      message,
    }: {
      org_id: string;
      product_id: string;
      member_id: string;
      message: string;
    }) => {
      const generateUUID = () => {
        if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
          return crypto.randomUUID();
        }
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      };
      const newId = generateUUID();
      const createdAt = new Date().toISOString();
      const leadRow = {
        id: newId,
        product_id,
        member_id,
        message,
        created_at: createdAt,
      };

      if (isSupabaseConfigured) {
        const { error } = await supabase.from("marketplace_leads").insert({
          id: newId,
          product_id,
          member_id,
          message,
          created_at: createdAt,
        });
        if (error) throw error;
        return { org_id, product_id };
      }
      await delay(100);
      const leads = MockDB.getMarketplaceLeads();
      leads.push(leadRow);
      MockDB.saveMarketplaceLeads(leads);
      return { org_id, product_id };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: ["marketplace_leads", res.org_id],
      });
    },
  });
}

// ==========================================
// 15. MEETING ATTENDANCE & ORG PURGE HOOKS
// ==========================================
export function useMeetingAttendance(meetingId: string | undefined) {
  return useQuery({
    queryKey: ["meeting_attendance", meetingId],
    queryFn: async () => {
      if (!meetingId) return [];
      const key = `meet_attn_${meetingId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          return JSON.parse(stored) as string[]; // List of member_ids
        } catch (e) {
          return [];
        }
      }
      return [];
    },
    enabled: !!meetingId,
  });
}

export function useSaveMeetingAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      meetingId,
      memberIds,
    }: {
      meetingId: string;
      memberIds: string[];
    }) => {
      const key = `meet_attn_${meetingId}`;
      localStorage.setItem(key, JSON.stringify(memberIds));

      // Update local storage meeting count to keep UI instantly synchronized
      const meetings = MockDB.getMeetings();
      const idx = meetings.findIndex((m) => m.id === meetingId);
      if (idx !== -1) {
        meetings[idx].attendance_count = memberIds.length;
        MockDB.saveMeetings(meetings);
      }
      return { meetingId, memberIds };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["meeting_attendance", data.meetingId],
      });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    },
  });
}

export function useDeleteOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orgId: string) => {
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from("organizations")
          .delete()
          .eq("id", orgId);
        if (error) throw error;
        return orgId;
      }
      await delay(150);
      const orgs = MockDB.getOrgs();
      const filtered = orgs.filter((o) => o.id !== orgId);
      MockDB.saveOrgs(filtered);
      return orgId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
  });
}

export function useUpdateUserProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      fullName,
      avatarUrl,
      preferredLanguage,
      accessibilityFontSize,
      accessibilityHighContrast,
      bio,
      phoneNumber,
      jobTitle,
      notificationEmail,
      notificationSms,
      uiDensity,
      reducedMotion,
      profileVisibility,
      statusBadge
    }: {
      userId: string;
      fullName: string;
      avatarUrl?: string;
      preferredLanguage?: "en" | "fr" | "rw";
      accessibilityFontSize?: "normal" | "large" | "x-large";
      accessibilityHighContrast?: boolean;
      bio?: string;
      phoneNumber?: string;
      jobTitle?: string;
      notificationEmail?: boolean;
      notificationSms?: boolean;
      uiDensity?: "normal" | "compact" | "spacious";
      reducedMotion?: boolean;
      profileVisibility?: "public" | "members_only" | "private";
      statusBadge?: "active" | "remote" | "field" | "away";
    }) => {
      if (isSupabaseConfigured) {
        const updatePayload: any = {
          full_name: fullName,
        };
        if (avatarUrl !== undefined) updatePayload.avatar_url = avatarUrl;
        if (preferredLanguage !== undefined) updatePayload.preferred_language = preferredLanguage;
        if (accessibilityFontSize !== undefined) updatePayload.accessibility_font_size = accessibilityFontSize;
        if (accessibilityHighContrast !== undefined) updatePayload.accessibility_high_contrast = accessibilityHighContrast;
        if (bio !== undefined) updatePayload.bio = bio;
        if (phoneNumber !== undefined) updatePayload.phone_number = phoneNumber;
        if (jobTitle !== undefined) updatePayload.job_title = jobTitle;
        if (notificationEmail !== undefined) updatePayload.notification_email = notificationEmail;
        if (notificationSms !== undefined) updatePayload.notification_sms = notificationSms;
        if (uiDensity !== undefined) updatePayload.ui_density = uiDensity;
        if (reducedMotion !== undefined) updatePayload.reduced_motion = reducedMotion;
        if (profileVisibility !== undefined) updatePayload.profile_visibility = profileVisibility;
        if (statusBadge !== undefined) updatePayload.status_badge = statusBadge;

        const { data, error } = await supabase
          .from("users")
          .update(updatePayload)
          .eq("id", userId)
          .select()
          .single();
        if (error) {
          console.warn("Supabase user update note:", error);
        }
        return data || { id: userId, full_name: fullName, avatar_url: avatarUrl, preferred_language: preferredLanguage, bio, phone_number: phoneNumber, job_title: jobTitle };
      } else {
        await delay(150);
        const users = MockDB.getUsers();
        const user = users.find((u) => u.id === userId);
        if (user) {
          user.full_name = fullName;
          if (avatarUrl !== undefined) user.avatar_url = avatarUrl;
          if (preferredLanguage !== undefined) user.preferred_language = preferredLanguage;
          if (accessibilityFontSize !== undefined) user.accessibility_font_size = accessibilityFontSize;
          if (accessibilityHighContrast !== undefined) user.accessibility_high_contrast = accessibilityHighContrast;
          if (bio !== undefined) user.bio = bio;
          if (phoneNumber !== undefined) user.phone_number = phoneNumber;
          if (jobTitle !== undefined) user.job_title = jobTitle;
          if (notificationEmail !== undefined) user.notification_email = notificationEmail;
          if (notificationSms !== undefined) user.notification_sms = notificationSms;
          if (uiDensity !== undefined) user.ui_density = uiDensity;
          if (reducedMotion !== undefined) user.reduced_motion = reducedMotion;
          if (profileVisibility !== undefined) user.profile_visibility = profileVisibility;
          if (statusBadge !== undefined) user.status_badge = statusBadge;
          localStorage.setItem("impacto_mock_users", JSON.stringify(users));
        }
        return user;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["org_members"] });
    }
  });
}

// ==========================================
// 41. ASSET & INVENTORY HOOKS
// ==========================================
export function useAssets(orgId: string | undefined) {
  return useQuery({
    queryKey: ["assets", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("assets")
          .select("*")
          .eq("org_id", orgId)
          .order("created_at", { ascending: false });
        if (error) {
          console.warn("Supabase assets fetch warning, falling back to local storage:", error.message);
          const allAssets = MockDB.getAssets();
          return allAssets.filter((a: any) => a.org_id === orgId);
        }
        return (data as Asset[]) || [];
      } else {
        await delay(150);
        const allAssets = MockDB.getAssets();
        return allAssets.filter((a: any) => a.org_id === orgId);
      }
    },
    enabled: !!orgId,
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newAsset: Partial<Asset> & { org_id: string; name: string }) => {
      const now = new Date().toISOString();
      const payload: Asset = {
        id: "asset-" + Math.random().toString(36).substring(2, 9),
        org_id: newAsset.org_id,
        name: newAsset.name,
        category: newAsset.category || "General Asset",
        quantity: typeof newAsset.quantity === "number" ? newAsset.quantity : 1,
        quality: newAsset.quality || "Standard",
        identifier: newAsset.identifier || "",
        serial_number: newAsset.serial_number || newAsset.identifier || "",
        purchase_date: newAsset.purchase_date || now.split("T")[0],
        purchase_cost: typeof newAsset.purchase_cost === "number" ? newAsset.purchase_cost : 0,
        currency: newAsset.currency || "RWF",
        condition: newAsset.condition || "good",
        assigned_to_member_id: newAsset.assigned_to_member_id || undefined,
        assigned_to_name: newAsset.assigned_to_name || undefined,
        location: newAsset.location || "Main Storage",
        status: newAsset.status || "operational",
        notes: newAsset.notes || "",
        qr_code: newAsset.identifier ? `ASSET-${newAsset.identifier}` : `ASSET-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        created_at: now,
        updated_at: now,
      };

      if (isSupabaseConfigured) {
        const { data, error } = await supabase.from("assets").insert(payload).select().single();
        if (error) {
          console.warn("Supabase insert asset warning, saving locally:", error.message);
          const list = MockDB.getAssets();
          list.unshift(payload);
          MockDB.saveAssets(list);
          notifyCrossTabChange("assets");
          return payload;
        }
        notifyCrossTabChange("assets");
        return data as Asset;
      } else {
        await delay(200);
        const list = MockDB.getAssets();
        list.unshift(payload);
        MockDB.saveAssets(list);
        notifyCrossTabChange("assets");
        return payload;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["assets", data.org_id] });
    },
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Asset> }) => {
      const now = new Date().toISOString();
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("assets")
          .update({ ...updates, updated_at: now })
          .eq("id", id)
          .select()
          .single();
        if (error) {
          console.warn("Supabase update asset warning, updating locally:", error.message);
          const list = MockDB.getAssets();
          const idx = list.findIndex((a: any) => a.id === id);
          if (idx !== -1) {
            list[idx] = { ...list[idx], ...updates, updated_at: now };
            MockDB.saveAssets(list);
            notifyCrossTabChange("assets");
            return list[idx];
          }
        }
        notifyCrossTabChange("assets");
        return data as Asset;
      } else {
        await delay(200);
        const list = MockDB.getAssets();
        const idx = list.findIndex((a: any) => a.id === id);
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...updates, updated_at: now };
          MockDB.saveAssets(list);
          notifyCrossTabChange("assets");
          return list[idx];
        }
        throw new Error("Asset not found");
      }
    },
    onSuccess: (data) => {
      if (data?.org_id) {
        queryClient.invalidateQueries({ queryKey: ["assets", data.org_id] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["assets"] });
      }
    },
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, orgId }: { id: string; orgId: string }) => {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from("assets").delete().eq("id", id);
        if (error) {
          console.warn("Supabase delete asset warning, deleting locally:", error.message);
          const list = MockDB.getAssets();
          const filtered = list.filter((a: any) => a.id !== id);
          MockDB.saveAssets(filtered);
          notifyCrossTabChange("assets");
          return { id, orgId };
        }
        notifyCrossTabChange("assets");
        return { id, orgId };
      } else {
        await delay(200);
        const list = MockDB.getAssets();
        const filtered = list.filter((a: any) => a.id !== id);
        MockDB.saveAssets(filtered);
        notifyCrossTabChange("assets");
        return { id, orgId };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["assets", data.orgId] });
    },
  });
}
