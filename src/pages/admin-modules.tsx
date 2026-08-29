import React, { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useLocalTranslation } from "../locales/additional-translations";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area } from "recharts";
import {
  Users,
  UserCheck,
  UserMinus,
  Coins,
  Download,
  Award,
  Clock,
  Trash2,
  Target,
  Keyboard,
  Plus,
  Search,
  Heart,
  Camera,
  FileCheck2,
  Printer,
  ChevronRight,
  TrendingUp,
  SlidersHorizontal,
  Mail,
  AlertCircle,
  AlertTriangle,
  Crown,
  Fingerprint,
  CheckCircle2,
  XCircle,
  FileText,
  KeyRound,
  Info,
  Scale,
  Building2,
  Wallet,
  ShieldCheck,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Pencil
} from "lucide-react";
import { useOrgStore } from "../store/orgStore";
import { useAuthStore } from "../store/authStore";
import { useCurrencyStore } from "../store/currencyStore";
import { ShareCapital, ShareTransaction, LedgerEntry } from "../types";
import {
  useMembers,
  useUpdateMemberStatus,
  useDeleteMember,
  useCreateMember,
  useLedgerEntries,
  useCreateLedgerEntry,
  useUpdateLedgerEntry,
  useDeleteLedgerEntry,
  useDonations,
  useConfirmDonation,
  useCreateDonation,
  useGrants,
  useCreateGrant,
  useUpdateGrantStatus,
  useIdentityVerifications,
  useReviewIdentityVerification,
  useResignations,
  useGoals
} from "../hooks/useImpactoData";
import { Button, Input, Card, Badge, Avatar, Table, Modal, EmptyState } from "../components/ui";
import { useToast } from "../components/Toast";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { PlanGatedView } from "../components/PlanGatedView";

// ==========================================
// 1. ROSTER MEMBERS LISTS (Admin Route)
// ==========================================
export const MembersManagement: React.FC = () => {
  const { t } = useLocalTranslation();
  const { addToast } = useToast();
  const { activeOrg, activeMember } = useOrgStore();
  const { data: members, refetch } = useMembers(activeOrg?.id);
  const inviteMutation = useCreateMember();
  const statusMutation = useUpdateMemberStatus();
  const deleteMemberMutation = useDeleteMember();

  // New V2 states & modules integrations
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as any) || "directory";
  const [activeTab, setActiveTab] = useState<"directory" | "volunteers" | "verifications" | "resignations" | "requests" | "pw_resets">(
    ["directory", "volunteers", "verifications", "resignations", "requests", "pw_resets"].includes(initialTab) ? initialTab : "directory"
  );

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["directory", "volunteers", "verifications", "resignations", "requests", "pw_resets"].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

  const handleTabChange = (tab: "directory" | "volunteers" | "verifications" | "resignations" | "requests" | "pw_resets") => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };
  const { data: verifications, refetch: refetchVerifs } = useIdentityVerifications(activeOrg?.id);
  const reviewVerifMutation = useReviewIdentityVerification();
  const { data: resignations, refetch: refetchResigns } = useResignations(activeOrg?.id);

  // Password reset request states
  const [pwResetRequests, setPwResetRequests] = useState<any[]>([]);
  const [loadingPwResets, setLoadingPwResets] = useState(false);
  const [openOverrideModal, setOpenOverrideModal] = useState(false);
  const [selectedOverrideMember, setSelectedOverrideMember] = useState<any | null>(null);
  const [overridePassword, setOverridePassword] = useState("");
  const [overrideLoading, setOverrideLoading] = useState(false);

  const fetchPwResetRequests = useCallback(async () => {
    if (!activeOrg?.id) return;
    setLoadingPwResets(true);
    try {
      const res = await fetch(`/api/auth/password-reset-requests?orgId=${activeOrg.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.requests) {
          setPwResetRequests(data.requests);
        }
      } else if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("password_reset_requests")
          .select("*")
          .eq("org_id", activeOrg.id)
          .order("requested_at", { ascending: false });
        if (!error && data) {
          setPwResetRequests(data);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch password reset requests:", err);
    } finally {
      setLoadingPwResets(false);
    }
  }, [activeOrg?.id]);

  useEffect(() => {
    fetchPwResetRequests();
  }, [fetchPwResetRequests]);

  // Realtime subscription for password reset requests
  useEffect(() => {
    if (!activeOrg?.id || !isSupabaseConfigured) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      const channelName = `pw_resets_rt_${activeOrg.id}_${Math.random().toString(36).substring(2, 9)}`;
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "password_reset_requests", filter: `org_id=eq.${activeOrg.id}` },
          () => {
            fetchPwResetRequests();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn("[Realtime] Password reset requests subscription notice:", err);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [activeOrg?.id, fetchPwResetRequests]);

  const pendingPwResetCount = pwResetRequests.filter(r => r.status === "pending").length;

  const handleApprovePwReset = async (req: any) => {
    setOverrideLoading(true);
    try {
      const res = await fetch("/api/auth/admin-approve-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminUserId: activeMember?.user_id,
          requestId: req.id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve password reset window.");
      addToast(`Approved! ${req.email} now has a 5-minute security window to set their new password.`, "success");
      fetchPwResetRequests();
    } catch (err: any) {
      console.error(err);
      addToast(err.message || "Failed to approve password reset", "error");
    } finally {
      setOverrideLoading(false);
    }
  };

  const handleRejectPwReset = async (reqId: string) => {
    try {
      if (isSupabaseConfigured) {
        await supabase.from("password_reset_requests").update({ status: "rejected", resolved_at: new Date().toISOString() }).eq("id", reqId);
      }
      addToast("Password reset request declined.", "success");
      fetchPwResetRequests();
    } catch (err: any) {
      console.error(err);
      addToast("Failed to reject request", "error");
    }
  };

  const handleDirectOverridePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOverrideMember || !overridePassword) return;
    setOverrideLoading(true);
    try {
      const targetUserId = selectedOverrideMember.user_id || selectedOverrideMember.user?.id || selectedOverrideMember.id;
      const targetEmail = selectedOverrideMember.user?.email || selectedOverrideMember.email || "";
      const res = await fetch("/api/auth/admin-reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminUserId: activeMember?.user_id,
          targetUserId,
          email: targetEmail,
          newPassword: overridePassword
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update member password.");

      if (targetEmail) {
        try {
          const raw = localStorage.getItem("impacto_user_passwords") || "{}";
          const map = JSON.parse(raw);
          map[targetEmail.toLowerCase()] = overridePassword;
          localStorage.setItem("impacto_user_passwords", JSON.stringify(map));
        } catch (e) {}
      }

      addToast(`Password updated for ${selectedOverrideMember.user?.full_name || selectedOverrideMember.email || "member"}!`, "success");
      setOpenOverrideModal(false);
      setOverridePassword("");
      setSelectedOverrideMember(null);
    } catch (err: any) {
      console.error(err);
      addToast(err.message || "Failed to update password", "error");
    } finally {
      setOverrideLoading(false);
    }
  };

  const totalResigns = resignations ? resignations.length : 0;
  const relocationCount = resignations ? resignations.filter(r => r.reason_category?.includes("Relocation") || r.reason_category?.includes("Resettlement")).length : 0;
  const mismatchCount = resignations ? resignations.filter(r => r.reason_category?.includes("Mismatch")).length : 0;
  const schedulingCount = resignations ? resignations.filter(r => r.reason_category?.includes("Scheduling") || r.reason_category?.includes("Conflict")).length : 0;
  const healthCount = resignations ? resignations.filter(r => r.reason_category?.includes("Health") || r.reason_category?.includes("Personal")).length : 0;

  const relocationPercent = totalResigns > 0 ? Math.round((relocationCount / totalResigns) * 100) : 0;
  const mismatchPercent = totalResigns > 0 ? Math.round((mismatchCount / totalResigns) * 100) : 0;
  const schedulingPercent = totalResigns > 0 ? Math.round((schedulingCount / totalResigns) * 100) : 0;
  const healthPercent = totalResigns > 0 ? Math.round((healthCount / totalResigns) * 100) : 0;

  const [openInviteModal, setOpenInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"org_admin" | "member">("member");
  const [search, setSearch] = useState("");

  // Volunteer hours ledger states
  const [openHourLogModal, setOpenHourLogModal] = useState(false);
  const [selectedVol, setSelectedVol] = useState<any | null>(null);
  const [loggedHours, setLoggedHours] = useState<number>(0);
  const [loggedTask, setLoggedTask] = useState("");
  const [volunteerHours, setVolunteerHours] = useState<Record<string, { hours: number; task: string }>>(() => {
    try {
      const saved = localStorage.getItem("impacto_vol_hours");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleLogHours = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVol) return;
    const updated = {
      ...volunteerHours,
      [selectedVol.id]: {
        hours: (volunteerHours[selectedVol.id]?.hours || 0) + loggedHours,
        task: loggedTask || volunteerHours[selectedVol.id]?.task || "General Helper"
      }
    };
    setVolunteerHours(updated);
    localStorage.setItem("impacto_vol_hours", JSON.stringify(updated));
    setOpenHourLogModal(false);
    setLoggedHours(0);
    setLoggedTask("");
  };

  const activeMembersCount = members?.filter((m) => m.status === "active").length || 0;
  const isTrial = activeOrg?.subscription_status === "trial" || !activeOrg?.subscription_status;
  const orgTier = activeOrg?.subscription_tier || "trial";
  const currentLimit = isTrial 
    ? 50 
    : orgTier === "starter" 
      ? 100 
      : orgTier === "growth" 
        ? 500 
        : Infinity;

  const isOverLimit = activeMembersCount >= currentLimit;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail) return;

    if (activeMembersCount >= currentLimit) {
      addToast(
        `Action Blocked: Your active plan (${orgTier.toUpperCase()}) supports up to ${currentLimit} members, but you have ${activeMembersCount} active members. Upgrade your plan or deactivate excess members first.`,
        "error"
      );
      return;
    }

    try {
      await inviteMutation.mutateAsync({
        orgId: activeOrg?.id || "",
        email: inviteEmail,
        fullName: inviteName,
        role: inviteRole
      });
      setOpenInviteModal(false);
      setInviteName("");
      setInviteEmail("");
      refetch();
      addToast("Member invited successfully", "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to invite member", "error");
    }
  };

  const handleToggleVolunteer = async (memberId: string, currentStatus: boolean | undefined) => {
    try {
      await statusMutation.mutateAsync({ id: memberId, is_volunteer: !currentStatus });
      refetch();
      addToast("Volunteer status updated", "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to update status", "error");
    }
  };

  const handleStatusChange = async (memberId: string, action: "active" | "suspended" | "pending" | "rejected") => {
    if (action === "active") {
      const targetMember = members?.find((m) => m.id === memberId);
      if (targetMember && targetMember.status !== "active") {
        if (activeMembersCount >= currentLimit) {
          addToast(
            `Unable to Approve: Active limit reached (${currentLimit === Infinity ? "Unlimited" : currentLimit} members max). Upgrade your plan or deactivate other members to make room.`,
            "error"
          );
          return;
        }
      }
    }

    try {
      await statusMutation.mutateAsync({ id: memberId, status: action });
      refetch();
      addToast("Member status updated", "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to update status", "error");
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (window.confirm("Are you sure you want to permanently delete this member from the organization? This action cannot be undone.")) {
      try {
        await deleteMemberMutation.mutateAsync({ id: memberId, orgId: activeOrg?.id || "" });
        addToast("Member deleted successfully", "success");
        refetch();
      } catch (err) {
        console.error(err);
        addToast("Failed to delete member", "error");
      }
    }
  };

  const handleReviewVerification = async (vId: string, mId: string, decision: "approved" | "rejected") => {
    try {
      await reviewVerifMutation.mutateAsync({
        id: vId,
        org_id: activeOrg?.id || "",
        member_id: mId,
        status: decision,
        reviewed_by: activeMember?.user_id || "",
        review_notes: decision === "approved" ? "Verified via automatic portal audit." : "Document photo is blurry. Please re-upload clear proof of identity."
      });
      refetchVerifs();
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredMembers = members?.filter((m) => {
    if (m.status === "pending") return false;
    const term = search.toLowerCase();
    return m.user?.full_name.toLowerCase().includes(term) ||
           m.user?.email.toLowerCase().includes(term) ||
           (m.member_number || "").toLowerCase().includes(term);
  }) || [];

  const columns = [
    {
      header: t("lbl_avatar_name"),
      accessor: "name",
      cell: (row: any) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.user?.full_name || "M"} size="xs" />
          <div className="flex flex-col text-xs leading-none">
            <span className="font-bold text-gray-911 dark:text-white flex items-center gap-1.5">
              {row.user?.full_name}
              {row.verification_status === "verified" && (
                <Fingerprint className="h-3.5 w-3.5 text-emerald-555 shrink-0" title={t("lbl_badge_stamped")} />
              )}
            </span>
            <span className="text-[10px] text-gray-400 mt-1 font-mono">{row.user?.email}</span>
          </div>
        </div>
      )
    },
    {
      header: t("lbl_member_id"),
      accessor: "member_number",
      cell: (row: any) => <span className="font-mono text-xs font-semibold text-gray-650">{row.member_number || "--"}</span>
    },
    {
      header: t("lbl_system_role"),
      accessor: "role",
      cell: (row: any) => {
        const isOrgAdmin = activeMember?.role === "org_admin";
        if (isOrgAdmin) {
          return (
            <select
              value={row.role}
              onChange={async (e) => {
                try {
                  await statusMutation.mutateAsync({ id: row.id, role: e.target.value as any });
                  addToast("Role updated successfully", "success");
                  refetch();
                } catch {
                  addToast("Failed to update role", "error");
                }
              }}
              className="bg-stone-50 dark:bg-slate-950 text-xs font-bold border border-gray-200 dark:border-slate-800 rounded-lg px-2 py-1 text-stone-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="member">Member</option>
              <option value="manager">Manager</option>
              <option value="accountant">Accountant</option>
              <option value="org_admin">Admin</option>
            </select>
          );
        }
        return (
          <Badge color={row.role === "org_admin" ? "amber" : row.role === "manager" ? "purple" : row.role === "accountant" ? "emerald" : "blue"}>
            {row.role === "org_admin" ? t("lbl_role_admin") : row.role === "manager" ? "Manager" : row.role === "accountant" ? "Accountant" : t("lbl_role_participant")}
          </Badge>
        );
      }
    },
    {
      header: t("lbl_member_status"),
      accessor: "status",
      cell: (row: any) => {
        const lbl = row.status === "active" ? t("lbl_status_active") : row.status === "pending" ? t("lbl_status_pending") : row.status === "rejected" ? "Rejected" : t("lbl_status_suspended");
        return (
          <Badge color={row.status === "active" ? "green" : row.status === "pending" ? "amber" : row.status === "rejected" ? "gray" : "red"}>
            {lbl}
          </Badge>
        );
      }
    },
    {
      header: t("lbl_roster_actions"),
      accessor: "actions",
      cell: (row: any) => {
        const isEligibleToDelete = (activeMember?.role as string) === "org_admin" || (activeMember?.role as string) === "accountant";
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={row.is_volunteer ? "solid" : "outline"}
              className={!row.is_volunteer ? "text-amber-600 border-amber-600" : ""}
              onClick={() => handleToggleVolunteer(row.id, row.is_volunteer)}
              icon={<Heart className="h-3.5 w-3.5" />}
            >
              {row.is_volunteer ? t("btn_remove_volunteer") : t("btn_make_volunteer")}
            </Button>

            {row.status === "pending" && (
              <div className="flex gap-1">
                <Button size="sm" icon={<UserCheck className="h-3.5 w-3.5" />} onClick={() => handleStatusChange(row.id, "active")}>
                  {t("btn_approve")}
                </Button>
                <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50" onClick={() => handleStatusChange(row.id, "rejected")}>
                  Decline
                </Button>
              </div>
            )}

            {row.status === "active" && (
              <Button size="sm" variant="outline" icon={<UserMinus className="h-3.5 w-3.5" />} onClick={() => handleStatusChange(row.id, "suspended")}>
                {t("btn_suspend")}
              </Button>
            )}

            {row.status === "suspended" && (
              <Button size="sm" variant="outline" onClick={() => handleStatusChange(row.id, "active")}>
                {t("btn_reinstate")}
              </Button>
            )}


          </div>
        );
      }
    }
  ];

  const pendingRequestsCount = members?.filter((m) => m.status === "pending").length || 0;

  return (
    <div className="flex flex-col gap-6 select-none font-sans w-full animate-in fade-in duration-250">
      <div className="flex items-center justify-between border-b pb-4 shrink-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-display text-gray-901">{t("members_dir_title")}</h2>
          <p className="text-xs text-gray-400">{t("members_dir_subtitle")}</p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setOpenInviteModal(true)}>
          {t("btn_invite_member")}
        </Button>
      </div>

      {isOverLimit && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans select-none animate-in">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5.5 w-5.5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex flex-col text-left">
              <span className="font-extrabold text-[10.5px] uppercase tracking-wider text-amber-800 dark:text-amber-400">🚨 PLAN ACTIVE MEMBER LIMIT EXCEEDED</span>
              <p className="text-xs text-stone-900 dark:text-slate-100 font-bold mt-1">
                Your organization is currently managing <span className="underline font-black text-amber-700 dark:text-amber-400">{activeMembersCount} active members</span>, which exceeds your {orgTier.toUpperCase()} plan limit of <span className="font-black underline">{currentLimit} active members</span>.
              </p>
              <p className="text-[11px] text-stone-600 dark:text-slate-350 mt-1 leading-normal font-semibold">
                To prevent complete lockout, your access is active but adding or confirming new members is suspended. Please upgrade your plan under Settings, or suspend existing members to restore complete functionality.
              </p>
            </div>
          </div>
          <Link to="/dashboard/settings" className="shrink-0">
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-stone-950 font-extrabold rounded-xl text-[11px] px-3 py-1.5 flex items-center gap-1">
              Upgrade Subscription <Crown className="h-4 w-4 shrink-0" />
            </Button>
          </Link>
        </div>
      )}

      {/* Modern navigation subtabs */}
      <div className="flex border-b border-gray-200 dark:border-slate-800 gap-6 select-none font-sans leading-none pb-0.5 overflow-x-auto whitespace-nowrap">
        <button
          onClick={() => handleTabChange("directory")}
          className={`pb-3 text-xs font-bold transition-all border-b-2 hover:text-stone-900 leading-none shrink-0 ${
            activeTab === "directory"
              ? "border-[var(--org-primary)] text-stone-900 font-extrabold"
              : "border-transparent text-gray-450"
          }`}
        >
          {t("tab_directory")}
        </button>
        <button
          onClick={() => handleTabChange("volunteers")}
          className={`pb-3 text-xs font-bold transition-all border-b-2 hover:text-stone-900 leading-none shrink-0 ${
            activeTab === "volunteers"
              ? "border-[var(--org-primary)] text-stone-900 font-extrabold"
              : "border-transparent text-gray-450"
          }`}
        >
          {t("tab_volunteers")}
        </button>
        <button
          onClick={() => handleTabChange("verifications")}
          className={`pb-3 text-xs font-bold transition-all border-b-2 hover:text-stone-900 leading-none flex items-center gap-1.5 shrink-0 ${
            activeTab === "verifications"
              ? "border-[var(--org-primary)] text-stone-900 font-extrabold"
              : "border-transparent text-gray-450"
          }`}
        >
          {t("tab_verifications")}
          {verifications && verifications.filter(v => v.status === "pending").length > 0 && (
            <Badge color="amber" className="text-[9px] px-1 py-0">{verifications.filter(v => v.status === "pending").length}</Badge>
          )}
        </button>
        <button
          onClick={() => handleTabChange("resignations")}
          className={`pb-3 text-xs font-bold transition-all border-b-2 hover:text-stone-900 leading-none flex items-center gap-1.5 shrink-0 ${
            activeTab === "resignations"
              ? "border-[var(--org-primary)] text-stone-900 font-extrabold"
              : "border-transparent text-gray-450"
          }`}
        >
          {t("tab_resignations")}
          {resignations && resignations.filter(r => r.status === "pending").length > 0 && (
            <Badge color="red" className="text-[9px] px-1 py-0">{resignations.filter(r => r.status === "pending").length}</Badge>
          )}
        </button>
        <button
          onClick={() => handleTabChange("requests")}
          className={`pb-3 text-xs font-bold transition-all border-b-2 hover:text-stone-900 leading-none flex items-center gap-1.5 shrink-0 ${
            activeTab === "requests"
              ? "border-[var(--org-primary)] text-stone-900 font-extrabold"
              : "border-transparent text-gray-450"
          }`}
        >
          Membership Requests
          {pendingRequestsCount > 0 && (
            <Badge color="amber" className="text-[9px] px-1 py-0">{pendingRequestsCount}</Badge>
          )}
        </button>
        <button
          onClick={() => handleTabChange("pw_resets")}
          className={`pb-3 text-xs font-bold transition-all border-b-2 hover:text-stone-900 leading-none flex items-center gap-1.5 shrink-0 ${
            activeTab === "pw_resets"
              ? "border-[var(--org-primary)] text-stone-900 font-extrabold"
              : "border-transparent text-gray-450"
          }`}
        >
          Password Reset Requests
          {pendingPwResetCount > 0 && (
            <Badge color="amber" className="text-[9px] px-1 py-0">{pendingPwResetCount}</Badge>
          )}
        </button>
      </div>

      {activeTab === "directory" && (
        <div className="flex flex-col gap-6">
          <div className="w-full md:w-80 select-none">
            <Input
              type="text"
              placeholder={t("search_members_placeholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              prefixIcon={<Search className="h-4 w-4 text-gray-400" />}
            />
          </div>

          <Table columns={columns} data={filteredMembers} emptyMessage={t("empty_search_members")} />
        </div>
      )}

      {activeTab === "volunteers" && (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center bg-slate-500/5 p-4 rounded-xl border">
            <div>
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-150">{t("vol_ledger_title")}</h3>
              <p className="text-[11px] text-gray-500">{t("vol_ledger_subtitle")}</p>
            </div>
            <div className="text-xs font-bold text-[var(--org-primary)] bg-emerald-500/10 px-3 py-1 rounded">
              {t("vol_active_count", { count: filteredMembers.filter(m => m.role !== "org_admin").length })}
            </div>
          </div>

          <div className="w-full md:w-80 select-none">
            <Input
              type="text"
              placeholder={t("vol_search_placeholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              prefixIcon={<Search className="h-4 w-4 text-gray-400" />}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {members?.filter(m => m.is_volunteer).map((m) => {
              const ledger = volunteerHours[m.id] || { hours: 0, task: "General Volunteer" };
              return (
                <Card key={m.id} title={m.user?.full_name || t("lbl_role_participant")} action={
                  <Button size="sm" variant="outline" onClick={() => {
                    setSelectedVol(m);
                    setOpenHourLogModal(true);
                  }}>
                    {t("btn_log_contribution")}
                  </Button>
                }>
                  <p className="text-xs text-gray-500 font-semibold mb-3">Email: <span className="text-gray-700 dark:text-slate-350 font-mono">{m.user?.email}</span></p>
                  <div className="grid grid-cols-2 gap-2 border-t pt-3 mt-3 text-xs leading-none">
                    <div className="flex flex-col gap-1">
                      <span className="text-gray-450 text-[10px] font-bold uppercase">{t("vol_logged_hours")}</span>
                      <span className="font-mono text-stone-900 dark:text-stone-100 font-extrabold text-sm">{t("vol_hours_display", { hours: ledger.hours })}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-gray-455 text-[10px] font-bold uppercase">{t("vol_primary_task")}</span>
                      <span className="text-stone-800 dark:text-stone-200 truncate font-bold" title={ledger.task}>{ledger.task}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "verifications" && (
        <PlanGatedView requiredTier="enterprise" featureName="Identity Document Verification Hub">
          <div className="text-emerald-600 font-bold mb-4 uppercase text-xs tracking-wider">Under Calibration</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title={t("verif_pending_title")}>
              <div className="flex flex-col gap-4">
                {verifications && verifications.filter((v) => v.status === "pending").length > 0 ? (
                  verifications
                    .filter((v) => v.status === "pending")
                    .map((v) => {
                      const profile = (m: any) => m.id === v.member_id;
                      const matched = members?.find(profile);
                      const name = matched?.user?.full_name || "Unknown Volunteer";

                      return (
                        <div key={v.id} className="p-4 border rounded-xl bg-stone-50/50 dark:bg-slate-900 flex flex-col gap-3">
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-bold text-stone-900 dark:text-stone-100">{name}</span>
                              <span className="text-[10px] text-gray-400 font-mono">{t("lbl_doc_type", { type: v.document_type })}</span>
                            </div>
                            <Badge color="amber">{t("lbl_awaiting_review")}</Badge>
                          </div>

                          <div className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-150 bg-stone-100/50 dark:bg-slate-950 font-mono text-[10px] text-gray-500">
                            <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                            <span className="truncate flex-1 font-bold">{v.document_url || "id_passport_photo.pdf"}</span>
                            <a href={v.document_url || "#"} className="underline text-[var(--org-primary)] font-extrabold hover:text-emerald-700">{t("lbl_open")}</a>
                          </div>

                          <div className="flex gap-2.5 mt-2 justify-end">
                            <Button
                               size="sm"
                               variant="outline"
                               color="red"
                               icon={<XCircle className="h-4 w-4" />}
                               onClick={() => handleReviewVerification(v.id, v.member_id, "rejected")}
                            >
                              {t("btn_reject_proof")}
                            </Button>
                            <Button
                              size="sm"
                              icon={<CheckCircle2 className="h-4 w-4" />}
                              onClick={() => handleReviewVerification(v.id, v.member_id, "approved")}
                            >
                              {t("btn_verify_identity")}
                            </Button>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <EmptyState title={t("empty_pending_verifs")} message={t("empty_pending_verifs_msg")} />
                )}
              </div>
            </Card>

            <Card title={t("verif_history_title")}>
              <div className="flex flex-col gap-3 max-h-[460px] overflow-y-auto">
                {verifications && verifications.filter((v) => v.status !== "pending").length > 0 ? (
                  verifications
                    .filter((v) => v.status !== "pending")
                    .map((v) => {
                      const matched = members?.find((m) => m.id === v.member_id);
                      const name = matched?.user?.full_name || "Unknown Volunteer";

                      return (
                        <div key={v.id} className="flex justify-between items-center py-2.5 border-b text-xs">
                          <div className="flex flex-col gap-0.5 font-semibold">
                            <span className="text-stone-900 dark:text-stone-100">{name}</span>
                            <span className="text-[9px] text-gray-400 font-mono">{t("lbl_reviewed_log", { date: new Date(v.reviewed_at || "").toLocaleDateString() })}</span>
                          </div>
                          <Badge color={v.status === "approved" ? "green" : "red"}>
                            {v.status === "approved" ? t("lbl_badge_stamped") : t("lbl_rejected")}
                          </Badge>
                        </div>
                      );
                    })
                ) : (
                  <span className="text-xs text-gray-400 leading-normal block">{t("empty_verif_history")}</span>
                )}
              </div>
            </Card>
          </div>
        </PlanGatedView>
      )}

      {activeTab === "resignations" && (
        <PlanGatedView requiredTier="enterprise" featureName="3-Step Resignations Survey & Offboarding Analytics">
          <div className="text-emerald-600 font-bold mb-4 uppercase text-xs tracking-wider">Under Calibration</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title={t("resign_pending_title")}>
              <div className="flex flex-col gap-4">
                {resignations && resignations.filter((r) => r.status === "pending").length > 0 ? (
                  resignations
                    .filter((r) => r.status === "pending")
                    .map((r) => {
                      const matched = members?.find((m) => m.id === r.member_id);
                      const name = matched?.user?.full_name || "Unknown Volunteer";

                      return (
                        <div key={r.id} className="p-4 border rounded-xl bg-stone-50/50 dark:bg-slate-900 flex flex-col gap-3">
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-bold text-stone-900 dark:text-stone-100">{name}</span>
                              <span className="text-[10px] text-slate-400 font-semibold font-mono">{t("lbl_exit_date", { date: new Date(r.resignation_date).toLocaleDateString() })}</span>
                            </div>
                            <Badge color="red">{t("lbl_pending_processing")}</Badge>
                          </div>

                          <div className="p-3 bg-red-50/20 dark:bg-red-950/10 border border-red-100/45 text-xs rounded-xl flex flex-col gap-1">
                            <span className="font-extrabold text-red-800">{t("lbl_reason_leaving")}</span>
                            <p className="text-slate-500 italic leading-relaxed font-semibold">"{r.reason}"</p>
                          </div>

                          {r.feedback && (
                            <div className="p-3 bg-stone-100/50 dark:bg-slate-950 border text-xs rounded-xl flex flex-col gap-1">
                              <span className="font-bold text-stone-605">{t("lbl_org_feedback")}</span>
                              <p className="text-gray-500 leading-relaxed font-semibold">"{r.feedback}"</p>
                            </div>
                          )}

                          <div className="flex justify-end gap-2 text-xs font-semibold">
                            <Button size="sm" color="amber" variant="outline" onClick={() => handleStatusChange(r.member_id, "active")}>
                              {t("btn_retain_member")}
                            </Button>
                            <Button size="sm" onClick={() => handleStatusChange(r.member_id, "suspended")}>
                              {t("btn_process_checklist")}
                            </Button>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <EmptyState title={t("empty_pending_resigns")} message={t("empty_pending_resigns_msg")} />
                )}
              </div>
            </Card>

            <Card title={t("resign_metrics_title", { count: totalResigns })}>
              <div className="flex flex-col gap-4">
                <p className="text-xs text-gray-500 font-semibold leading-relaxed">
                  {t("resign_metrics_subtitle")}
                </p>

                <div className="flex flex-col gap-3 font-mono text-[10px] text-gray-450 pt-2 border-t w-full">
                  <div className="flex justify-between items-center bg-stone-50 dark:bg-slate-950 p-2.5 rounded-xl border">
                    <span>{t("trend_relocation")}</span>
                    <span className="font-extrabold text-stone-800 dark:text-stone-100">{t("trend_count_logs", { percent: relocationPercent, count: relocationCount })}</span>
                  </div>
                  <div className="flex justify-between items-center bg-stone-50 dark:bg-slate-950 p-2.5 rounded-xl border">
                    <span>{t("trend_mismatch")}</span>
                    <span className="font-extrabold text-stone-800 dark:text-stone-100">{t("trend_count_comments", { percent: mismatchPercent, count: mismatchCount })}</span>
                  </div>
                  <div className="flex justify-between items-center bg-stone-50 dark:bg-slate-950 p-2.5 rounded-xl border">
                    <span>{t("trend_scheduling")}</span>
                    <span className="font-extrabold text-stone-800 dark:text-stone-100">{t("trend_count_comments", { percent: schedulingPercent, count: schedulingCount })}</span>
                  </div>
                  <div className="flex justify-between items-center bg-stone-50 dark:bg-slate-950 p-2.5 rounded-xl border">
                    <span>{t("trend_health")}</span>
                    <span className="font-extrabold text-stone-800 dark:text-stone-100">{t("trend_count_metrics", { percent: healthPercent, count: healthCount })}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </PlanGatedView>
      )}

      {activeTab === "requests" && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl flex items-start gap-4">
            <Users className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-150">Awaiting Membership Approval</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Review and approve requests from community participants seeking to join your cooperative. Confirming them grants active account access to your workspace, bookkeeping ledger metrics, and modules.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {members?.filter((m) => m.status === "pending").length ? (
              members
                .filter((m) => m.status === "pending")
                .map((req) => (
                  <Card
                    key={req.id}
                    title={req.user?.full_name || "Applicant File"}
                    action={
                      <Badge color="amber" className="text-[10px] font-bold">Awaiting Approval</Badge>
                    }
                  >
                    <div className="flex flex-col gap-3">
                      <div className="p-3 bg-stone-50/50 dark:bg-slate-900 border rounded-xl flex flex-col gap-1.5 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Email:</span>
                          <span className="font-mono font-bold text-stone-800 dark:text-stone-200 truncate max-w-[150px]">{req.user?.email}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Request Date:</span>
                          <span className="font-bold text-stone-850 dark:text-stone-200">
                            {req.joined_at ? new Date(req.joined_at).toLocaleDateString() : "Pending review"}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                          icon={<Trash2 className="h-4 w-4" />}
                          onClick={async () => {
                            if (window.confirm(`Reject and delete the membership application of ${req.user?.full_name}?`)) {
                              try {
                                await deleteMemberMutation.mutateAsync({ id: req.id, orgId: activeOrg?.id || "" });
                                addToast("Membership request declined.", "success");
                                refetch();
                              } catch (err) {
                                console.error(err);
                                addToast("Failed to reject request.", "error");
                              }
                            }
                          }}
                        >
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          icon={<UserCheck className="h-4 w-4" />}
                          onClick={() => handleStatusChange(req.id, "active")}
                        >
                          Confirm & Approve
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
            ) : (
              <div className="col-span-full">
                <EmptyState
                  title="No Pending Requests"
                  message="When new participants apply to join your cooperative, their applications will populate here for quick approval."
                />
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "pw_resets" && (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center bg-slate-500/5 p-4 rounded-xl border border-gray-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-150">Password Reset Override Ledger</h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Review and approve password override requests submitted by workspace members directly without email reset link dependencies.
              </p>
            </div>
            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
              {pendingPwResetCount} Pending Requests
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pwResetRequests.length > 0 ? (
              pwResetRequests.map((req) => (
                <Card key={req.id} title={req.full_name || req.email}>
                  <div className="flex flex-col gap-3 text-xs">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-800 dark:text-gray-200 font-mono">{req.email}</span>
                        <span className="text-[10px] text-gray-400">
                          Requested: {req.requested_at ? new Date(req.requested_at).toLocaleString() : "Recently"}
                        </span>
                      </div>
                      <Badge color={req.status === "approved" ? "green" : req.status === "completed" ? "blue" : req.status === "pending" ? "amber" : "gray"}>
                        {req.status === "approved" ? "5-Min Window Active" : req.status === "completed" ? "Password Updated" : req.status === "pending" ? "Awaiting Approval" : req.status === "expired" ? "Window Expired" : "Declined"}
                      </Badge>
                    </div>

                    {req.reason && (
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed text-[11px] text-gray-600 dark:text-gray-300">
                        <strong>Reason / Note:</strong> {req.reason}
                      </div>
                    )}

                    {req.status === "approved" && req.expires_at && (
                      <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                        <span>Window open until: {new Date(req.expires_at).toLocaleTimeString()}</span>
                        <span className="font-semibold">User can enter password</span>
                      </div>
                    )}

                    {(req.status === "pending" || req.status === "expired") && (
                      <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-600 hover:bg-red-50"
                          onClick={() => handleRejectPwReset(req.id)}
                        >
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          loading={overrideLoading}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                          icon={<KeyRound className="h-3.5 w-3.5" />}
                          onClick={() => handleApprovePwReset(req)}
                        >
                          Approve 5-Min Reset Window
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))
            ) : (
              <div className="col-span-full">
                <EmptyState
                  title="No Password Reset Requests"
                  message="When members submit password reset requests from the login page, their override requests will appear here for immediate administrator approval."
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Direct Member Password Override Modal */}
      <Modal open={openOverrideModal} onClose={() => setOpenOverrideModal(false)} title="Admin Password Override">
        <form onSubmit={handleDirectOverridePassword} className="flex flex-col gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex flex-col gap-1">
            <span className="font-bold flex items-center gap-1.5">
              <KeyRound className="h-4 w-4 text-amber-600" /> Member Password Override
            </span>
            <span>
              You are updating credentials directly for <strong>{selectedOverrideMember?.user?.full_name || selectedOverrideMember?.user?.email || "this member"}</strong>.
            </span>
          </div>

          <Input
            type="password"
            label="New Password"
            value={overridePassword}
            onChange={(e) => setOverridePassword(e.target.value)}
            placeholder="Enter new secure password (e.g. TempPass2026!)"
            prefixIcon={<KeyRound className="h-4 w-4 text-gray-400" />}
            required
            autoFocus
          />

          <p className="text-[11px] text-gray-400 leading-snug">
            This action bypasses standard email verification links and immediately updates the member's account password.
          </p>

          <Button type="submit" loading={overrideLoading} className="w-full mt-2 py-2.5">
            Update Member Password
          </Button>
        </form>
      </Modal>

      {/* Invite Member modal */}
      <Modal open={openInviteModal} onClose={() => setOpenInviteModal(false)} title={t("modal_invite_title")}>
        <form onSubmit={handleInvite} className="flex flex-col gap-4">
          <Input label={t("lbl_full_name")} value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder={t("placeholder_name")} prefixIcon={<Users className="h-4 w-4 text-gray-400" />} />
          <Input label={t("lbl_email_address")} type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder={t("placeholder_email")} prefixIcon={<Mail className="h-4 w-4 text-gray-400" />} />
          
          <div className="flex flex-col gap-1.5 self-start w-full whitespace-nowrap">
            <label className="text-xs font-semibold text-gray-750">{t("lbl_system_role_perm")}</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "org_admin" | "member")}
              className="w-full text-sm rounded-lg border bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 px-3 py-2 text-gray-805 dark:text-slate-100 select-none focus:ring-2 focus:ring-[var(--org-primary)] outline-none"
            >
              <option value="member">{t("opt_role_member")}</option>
              <option value="org_admin">{t("opt_role_admin")}</option>
            </select>
          </div>

          <Button type="submit" loading={inviteMutation.isPending} className="w-full mt-4 py-2.5">
            {t("btn_add_member")}
          </Button>
        </form>
      </Modal>

      {/* Log Hours and Task modal */}
      <Modal open={openHourLogModal} onClose={() => setOpenHourLogModal(false)} title={t("modal_log_contribution_title")}>
        <form onSubmit={handleLogHours} className="flex flex-col gap-4">
          {selectedVol && (
            <div className="bg-emerald-500/5 p-3 rounded-lg text-xs leading-relaxed font-semibold mb-2 text-emerald-800 flex items-center gap-1.5">
              <Info className="h-4 w-4 text-emerald-800" />
              <span>{t("vol_hours_log_msg", { name: selectedVol.user?.full_name })}</span>
            </div>
          )}

          <Input
            label={t("lbl_hours_volunteered")}
            type="number"
            min="1"
            value={loggedHours || ""}
            onChange={(e) => setLoggedHours(parseInt(e.target.value) || 0)}
            placeholder={t("placeholder_hours")}
            required
          />

          <Input
            label={t("lbl_task_description")}
            value={loggedTask}
            onChange={(e) => setLoggedTask(e.target.value)}
            placeholder={t("placeholder_task_desc")}
            required
          />

          <Button type="submit" className="w-full mt-4 py-2.5 font-bold uppercase text-xs">
            {t("btn_save_contribution")}
          </Button>
        </form>
      </Modal>
    </div>
  );
};

// ==========================================
// 2. FINANCIAL LEDGER (Admin Route)
// ==========================================
export const LedgerBookkeeping: React.FC = () => {
  const { t } = useLocalTranslation();
  const { activeOrg, activeMember } = useOrgStore();
  const { addToast } = useToast();
  const { data: ledger, refetch } = useLedgerEntries(activeOrg?.id);
  const entryMutation = useCreateLedgerEntry();
  const updateMutation = useUpdateLedgerEntry();
  const deleteMutation = useDeleteLedgerEntry();
  const { formatAmount } = useCurrencyStore();

  const { data: goals } = useGoals(activeOrg?.id);
  const { data: members } = useMembers(activeOrg?.id);

  const isOrgAdmin = activeMember?.role === "org_admin";

  const [activeSubTab, setActiveSubTab] = useState<"ledger_book" | "balance_sheet" | "fast_batch">(() => {
    return activeMember?.role === "org_admin" ? "balance_sheet" : "ledger_book";
  });

  useEffect(() => {
    if (isOrgAdmin) {
      setActiveSubTab("balance_sheet");
    }
  }, [isOrgAdmin]);

  // Real-time synchronization subscription for ledger entries
  useEffect(() => {
    if (!isSupabaseConfigured || !activeOrg?.id) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      const channelName = `ledger_rt_${activeOrg.id}_${Math.random().toString(36).substring(2, 9)}`;
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "ledger_entries",
            filter: `org_id=eq.${activeOrg.id}`
          },
          (payload) => {
            console.log("Real-time ledger event received:", payload);
            refetch();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn("[Realtime] Ledger subscription notice:", err);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [activeOrg?.id, refetch]);

  // Standard manual Add Modal States
  const [openAddModal, setOpenAddModal] = useState(false);
  const [type, setType] = useState<"income" | "expense" | "asset" | "liability">("income");
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState("donation"); // default to donation so they see donor features first
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [refNum, setRefNum] = useState("");
  const [selectedGoalId, setSelectedGoalId] = useState("");
  const [donorName, setDonorName] = useState("");
  const [donorType, setDonorType] = useState<"internal" | "external">("external");
  const [selectedMemberId, setSelectedMemberId] = useState("");

  // Edit Modal States
  const [openEditModal, setOpenEditModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
  const [editType, setEditType] = useState<"income" | "expense" | "asset" | "liability">("income");
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editCategory, setEditCategory] = useState("donation");
  const [editDate, setEditDate] = useState(new Date().toISOString().split("T")[0]);
  const [editRefNum, setEditRefNum] = useState("");
  const [editGoalId, setEditGoalId] = useState("");
  const [editDonorName, setEditDonorName] = useState("");
  const [editDonorType, setEditDonorType] = useState<"internal" | "external">("external");
  const [editMemberId, setEditMemberId] = useState("");

  const handleOpenEdit = (entry: LedgerEntry) => {
    setEditingEntry(entry);
    setEditType(entry.type || "income");
    setEditDesc(entry.description || "");
    setEditAmount(entry.amount || 0);
    setEditCategory(entry.category || "donation");
    setEditDate(entry.date || new Date().toISOString().split("T")[0]);
    setEditGoalId(entry.goal_id || "");

    if (entry.reference && entry.reference.startsWith("DONOR:")) {
      const parts = entry.reference.split(":");
      setEditDonorType((parts[1] as any) || "external");
      setEditDonorName(parts[2] || "");
      setEditMemberId(parts[3] || "");
      setEditRefNum(parts[4] || "");
    } else {
      setEditDonorType("external");
      setEditDonorName("");
      setEditMemberId("");
      setEditRefNum(entry.reference || "");
    }
    setOpenEditModal(true);
  };

  const handleUpdateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry || !editDesc || !editAmount || !editDate) return;

    let finalReference = editRefNum;
    if (editCategory === "donation") {
      const finalDonorName = editDonorType === "internal" 
        ? (members?.find(m => m.id === editMemberId)?.user?.full_name || "Internal Member")
        : editDonorName;
      if (!finalDonorName) {
        addToast("Please provide a donor name or select a cooperative member.", "error");
        return;
      }
      finalReference = `DONOR:${editDonorType}:${finalDonorName}:${editMemberId || ""}:${editRefNum}`;
    }

    try {
      await updateMutation.mutateAsync({
        id: editingEntry.id,
        org_id: activeOrg?.id || "",
        type: editType,
        amount: editAmount,
        currency: "RWF",
        category: editCategory,
        description: editDesc,
        date: editDate,
        reference: finalReference,
        goal_id: editGoalId || undefined
      });
      setOpenEditModal(false);
      setEditingEntry(null);
      refetch();
      addToast("Transaction record updated successfully", "success");
    } catch (err) {
      console.error("Failed to update entry:", err);
      addToast("Failed to update transaction record", "error");
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this transaction record?")) return;
    try {
      await deleteMutation.mutateAsync({ id, org_id: activeOrg?.id || "" });
      refetch();
      addToast("Transaction record deleted successfully", "success");
    } catch (err) {
      console.error("Failed to delete entry:", err);
      addToast("Failed to delete transaction record", "error");
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc || !amount || !date) return;

    let finalReference = refNum;
    if (category === "donation") {
      const finalDonorName = donorType === "internal" 
        ? (members?.find(m => m.id === selectedMemberId)?.user?.full_name || "Internal Member")
        : donorName;
      if (!finalDonorName) {
        addToast("Please provide a donor name or select a cooperative member.", "error");
        return;
      }
      finalReference = `DONOR:${donorType}:${finalDonorName}:${selectedMemberId || ""}:${refNum}`;
    }

    try {
      await entryMutation.mutateAsync({
        org_id: activeOrg?.id || "",
        type,
        amount,
        currency: "RWF",
        category,
        description: desc,
        date,
        reference: finalReference,
        goal_id: selectedGoalId || undefined
      });
      setOpenAddModal(false);
      setDesc("");
      setAmount(0);
      setRefNum("");
      setSelectedGoalId("");
      setDonorName("");
      setDonorType("external");
      setSelectedMemberId("");
      refetch();
      addToast("Entry added successfully", "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to add entry", "error");
    }
  };

  // SHARE CAPITAL (IMIGABANE) & EQUITY TRACKER
  const [sharesCapital, setSharesCapital] = useState<ShareCapital[]>(() => {
    try {
      const saved = localStorage.getItem(`shares_capital_${activeOrg?.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [sharesHistory, setSharesHistory] = useState<ShareTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(`shares_history_${activeOrg?.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (activeOrg?.id) {
      try {
        localStorage.setItem(`shares_capital_${activeOrg?.id}`, JSON.stringify(sharesCapital));
      } catch (err) {
        console.warn("Failed to write shares_capital to localStorage:", err);
      }
    }
  }, [sharesCapital, activeOrg?.id]);

  useEffect(() => {
    if (activeOrg?.id) {
      try {
        localStorage.setItem(`shares_history_${activeOrg?.id}`, JSON.stringify(sharesHistory));
      } catch (err) {
        console.warn("Failed to write shares_history to localStorage:", err);
      }
    }
  }, [sharesHistory, activeOrg?.id]);

  // Calculations for Standard Ledger & Real-Time Balance Sheet
  const income = ledger?.filter((l) => l.type === "income").reduce((acc, entry) => acc + entry.amount, 0) || 0;
  const expense = ledger?.filter((l) => l.type === "expense").reduce((acc, entry) => acc + entry.amount, 0) || 0;
  const netOperatingSurplus = income - expense;
  const balance = netOperatingSurplus;

  const totalCollectedSharesRWF = sharesCapital.reduce((acc, curr) => acc + curr.total_paid, 0);
  const totalSharesOwned = sharesCapital.reduce((acc, curr) => acc + curr.shares_count, 0);

  const assetEntriesAmount = ledger?.filter((l) => l.type === "asset" || l.category === "equipment").reduce((acc, entry) => acc + entry.amount, 0) || 0;
  const shortTermPayables = ledger?.filter((l) => l.type === "liability").reduce((acc, entry) => acc + entry.amount, 0) || 0;

  // Balance Sheet Real-Time Math
  const liquidCashBank = Math.max(0, netOperatingSurplus) + totalCollectedSharesRWF;
  const fixedAssetsValue = assetEntriesAmount;
  const totalAssets = liquidCashBank + fixedAssetsValue;

  const totalLiabilities = shortTermPayables;

  const paidInMemberCapital = totalCollectedSharesRWF;
  const retainedSurplus = netOperatingSurplus;
  const totalEquity = paidInMemberCapital + retainedSurplus;

  const isBalanceInEquilibrium = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1;

  const columns = [
    {
      header: t("lbl_date"),
      accessor: "date",
      cell: (row: any) => <span className="font-mono text-xs font-semibold">{row.date}</span>
    },
    {
      header: t("lbl_description"),
      accessor: "description"
    },
    {
      header: t("lbl_category"),
      accessor: "category",
      cell: (row: any) => <Badge color="gray">{row.category.toUpperCase()}</Badge>
    },
    {
      header: "Strategic Goal (Impact)",
      accessor: "goal_id",
      cell: (row: any) => {
        const goal = goals?.find(g => g.id === row.goal_id);
        return goal ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/25 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/40">
            <Target className="h-3 w-3 text-emerald-500 shrink-0" />
            <span className="truncate max-w-[120px]">{goal.title}</span>
          </span>
        ) : (
          <span className="text-gray-400 dark:text-slate-500 text-[11px] font-mono">Unlinked</span>
        );
      }
    },
    {
      header: t("lbl_reference"),
      accessor: "reference",
      cell: (row: any) => {
        if (row.reference && row.reference.startsWith("DONOR:")) {
          const parts = row.reference.split(":");
          const dType = parts[1]; // "internal" | "external"
          const dName = parts[2] || "Unknown";
          const txRef = parts[4] || "";
          return (
            <div className="flex flex-col gap-1 items-start text-left select-none">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                dType === "internal" 
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-405 dark:border-emerald-900" 
                  : "bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-405 dark:border-indigo-900"
              }`}>
                {dType === "internal" ? "Internal Donor" : "External Donor"}
              </span>
              <span className="font-bold text-xs text-stone-850 dark:text-slate-100 leading-none">{dName}</span>
              {txRef && <span className="font-mono text-[10px] text-gray-400">Tx: {txRef}</span>}
            </div>
          );
        }
        return <span className="font-mono text-xs font-semibold text-gray-500">{row.reference || "--"}</span>;
      }
    },
    {
      header: t("lbl_amount"),
      accessor: "amount",
      cell: (row: any) => (
        <span className={`font-mono text-xs font-extrabold ${row.type === "income" ? "text-emerald-600" : "text-red-650"}`}>
          {row.type === "income" ? "+" : "-"} {formatAmount(row.amount)}
        </span>
      )
    },
    {
      header: t("lbl_actions") || "Actions",
      accessor: "actions",
      cell: (row: any) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleOpenEdit(row)}
            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-800 dark:text-slate-100 transition flex items-center gap-1 border border-stone-200 dark:border-slate-700"
            title="Edit Transaction Record"
          >
            <Pencil className="h-3 w-3 text-indigo-500" />
            <span>Edit</span>
          </button>
          <button
            type="button"
            onClick={() => handleDeleteEntry(row.id)}
            className="p-1 text-[11px] font-bold rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 transition border border-red-200 dark:border-red-900/50"
            title="Delete Transaction Record"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )
    }
  ];

  // ==========================================
  // FAST BATCH LEDGER (Offline-to-Online)
  // ==========================================
  interface BatchEntry {
    id: string;
    date: string;
    description: string;
    type: "income" | "expense";
    category: string;
    amount: number;
    reference: string;
    goal_id: string;
  }

  const [batchEntries, setBatchEntries] = useState<BatchEntry[]>([
    { id: "b1", date: new Date().toISOString().split('T')[0], description: "", type: "income", category: "grant", amount: 0, reference: "", goal_id: "" }
  ]);

  const addBatchRow = () => {
    setBatchEntries([
      ...batchEntries,
      {
        id: "b" + (batchEntries.length + 1) + "_" + Math.random().toString(36).substring(2, 5),
        date: new Date().toISOString().split('T')[0],
        description: "",
        type: "income",
        category: "grant",
        amount: 0,
        reference: "",
        goal_id: ""
      }
    ]);
  };

  const removeBatchRow = (index: number) => {
    if (batchEntries.length <= 1) return;
    setBatchEntries(batchEntries.filter((_, idx) => idx !== index));
  };

  const updateBatchRow = (index: number, key: keyof BatchEntry, value: any) => {
    const updated = [...batchEntries];
    updated[index] = { ...updated[index], [key]: value };
    setBatchEntries(updated);
  };

  const handleBatchSubmit = async () => {
    const validEntries = batchEntries.filter(entry => entry.description.trim() !== "" && entry.amount > 0);
    if (validEntries.length === 0) {
      addToast("Error: No valid entries found. Please provide description and amount > 0.", "error");
      return;
    }

    let successCount = 0;
    try {
      for (const entry of validEntries) {
        await entryMutation.mutateAsync({
          org_id: activeOrg?.id || "",
          type: entry.type,
          amount: entry.amount,
          currency: "RWF",
          category: entry.category,
          description: entry.description,
          date: entry.date,
          reference: entry.reference || undefined,
          goal_id: entry.goal_id || undefined
        });
        successCount++;
      }
      addToast(`Batch offline entries synchronized! ${successCount} items inserted into ledger.`, "success");
      setBatchEntries([
        { id: "b1", date: new Date().toISOString().split('T')[0], description: "", type: "income", category: "grant", amount: 0, reference: "", goal_id: "" }
      ]);
      refetch();
    } catch (err) {
      console.error(err);
      addToast(`Batch synchronization failed after ${successCount} successful saves.`, "error");
    }
  };

  const [openShareModal, setOpenShareModal] = useState(false);
  const [selectedShareMember, setSelectedShareMember] = useState("");
  const [sharesToAdd, setSharesToAdd] = useState<number>(5);
  const [shareVal, setShareVal] = useState<number>(10000); // 10,000 RWF per share standard
  const [sharesPaidAmount, setSharesPaidAmount] = useState<number>(50000);
  const [shareStatus, setShareStatus] = useState<"paid" | "partially_paid" | "pending">("paid");

  const handleRecordSharePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShareMember) {
      addToast("Please select a cooperative member", "error");
      return;
    }

    const member = members?.find(m => m.id === selectedShareMember) as any;
    const memberName = member?.user?.full_name || "Unknown";

    const currentMemberWithUser = members?.find(m => m.user_id === activeMember?.user_id) as any;
    const recorded_by = currentMemberWithUser?.user?.full_name || "Accountant";

    const newTx: ShareTransaction = {
      id: "sh-tx-" + Math.random().toString(36).substring(2, 9),
      org_id: activeOrg?.id || "",
      member_id: selectedShareMember,
      shares_added: sharesToAdd,
      amount_paid: sharesPaidAmount,
      transaction_date: new Date().toISOString().split("T")[0],
      recorded_by
    };

    const existingIndex = sharesCapital.findIndex(sc => sc.member_id === selectedShareMember);
    if (existingIndex !== -1) {
      const updated = [...sharesCapital];
      const prev = updated[existingIndex];
      updated[existingIndex] = {
        ...prev,
        shares_count: prev.shares_count + sharesToAdd,
        total_paid: prev.total_paid + sharesPaidAmount,
        status: shareStatus,
        last_updated: new Date().toISOString().split("T")[0]
      };
      setSharesCapital(updated);
    } else {
      const newCapital: ShareCapital = {
        id: "cap-" + Math.random().toString(36).substring(2, 9),
        org_id: activeOrg?.id || "",
        member_id: selectedShareMember,
        shares_count: sharesToAdd,
        share_value: shareVal,
        total_paid: sharesPaidAmount,
        status: shareStatus,
        last_updated: new Date().toISOString().split("T")[0],
        member_name: memberName
      };
      setSharesCapital([...sharesCapital, newCapital]);
    }

    setSharesHistory([newTx, ...sharesHistory]);
    setOpenShareModal(false);
    setSelectedShareMember("");
    addToast(`Successfully recorded ${sharesToAdd} shares for ${memberName}`, "success");
  };

  return (
    <PlanGatedView requiredTier="growth" featureName="Financial Ledger & Bookkeeping">
      <div className="flex flex-col gap-6 select-none font-sans w-full animate-in">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 gap-4 shrink-0">
          <div>
            <h2 className="text-xl md:text-2xl font-bold font-display text-gray-901 dark:text-white">{t("ledger_title")}</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400">Audited organizational bookkeeping with real-time Balance Sheet separation for Assets, Liabilities, and Shareholder Equity.</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab("ledger_book")}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeSubTab === "ledger_book"
                  ? "bg-[var(--org-primary)] text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-350"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              General Ledger
            </button>
            <button
              onClick={() => setActiveSubTab("balance_sheet")}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeSubTab === "balance_sheet"
                  ? "bg-[var(--org-primary)] text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-350"
              }`}
            >
              <Scale className="h-3.5 w-3.5" />
              Real-Time Balance Sheet
            </button>
          </div>
        </div>

        {/* SUBTAB 1: REAL-TIME BALANCE SHEET */}
        {activeSubTab === "balance_sheet" && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200">
            
            {/* Header info bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl shadow-xs">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] uppercase font-mono font-bold px-2.5 py-0.5 rounded-full">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  {isBalanceInEquilibrium ? "100% Balanced Equilibrium" : "Auditing Balance Sheet"}
                </span>
                <span className="text-[11px] font-mono text-gray-400">Assets = Liabilities + Equity</span>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <div>
                  <span className="text-gray-400 text-[10px] block">TOTAL ASSETS</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatAmount(totalAssets)}</span>
                </div>
                <div className="h-6 w-[1px] bg-gray-200 dark:bg-slate-800"></div>
                <div>
                  <span className="text-gray-400 text-[10px] block">LIABILITIES + EQUITY</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatAmount(totalLiabilities + totalEquity)}</span>
                </div>
              </div>
            </div>

            {/* Three Pillar Breakdown Grid: Assets | Liabilities | Equity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* PILLAR 1: ASSETS */}
              <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                        <Wallet className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-stone-900 dark:text-white uppercase font-mono">1. Assets</h4>
                        <span className="text-[10px] text-gray-400 block">Resource holdings & cash flow</span>
                      </div>
                    </div>
                    <Badge color="green">ASSETS</Badge>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="p-3 bg-stone-50 dark:bg-slate-800/50 rounded-xl border dark:border-slate-800/80 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-stone-800 dark:text-slate-200 block">Liquid Cash & Bank Reserves</span>
                        <span className="text-[10px] text-gray-400">Net operating revenue balance</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {formatAmount(liquidCashBank)}
                      </span>
                    </div>

                    <div className="p-3 bg-stone-50 dark:bg-slate-800/50 rounded-xl border dark:border-slate-800/80 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-stone-800 dark:text-slate-200 block">Fixed Assets & Equipment</span>
                        <span className="text-[10px] text-gray-400">Tools, machinery & capital assets</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-stone-800 dark:text-slate-200">
                        {formatAmount(fixedAssetsValue)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400 font-mono">Total Assets Value</span>
                  <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 font-display">
                    {formatAmount(totalAssets)}
                  </span>
                </div>
              </div>

              {/* PILLAR 2: LIABILITIES */}
              <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-stone-900 dark:text-white uppercase font-mono">2. Liabilities</h4>
                        <span className="text-[10px] text-gray-400 block">Debts & obligations</span>
                      </div>
                    </div>
                    <Badge color="amber">LIABILITIES</Badge>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="p-3 bg-stone-50 dark:bg-slate-800/50 rounded-xl border dark:border-slate-800/80 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-stone-800 dark:text-slate-200 block">Accounts & Loans Payable</span>
                        <span className="text-[10px] text-gray-400">Short-term operational liabilities</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                        {formatAmount(shortTermPayables)}
                      </span>
                    </div>

                    <div className="p-3 bg-stone-50 dark:bg-slate-800/50 rounded-xl border dark:border-slate-800/80 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-stone-800 dark:text-slate-200 block">Other Payables & Accruals</span>
                        <span className="text-[10px] text-gray-400">Pending debts</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-gray-400">
                        {formatAmount(0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400 font-mono">Total Liabilities</span>
                  <span className="text-lg font-extrabold text-amber-600 dark:text-amber-400 font-display">
                    {formatAmount(totalLiabilities)}
                  </span>
                </div>
              </div>

              {/* PILLAR 3: EQUITY */}
              <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                        <Coins className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-stone-900 dark:text-white uppercase font-mono">3. Equity</h4>
                        <span className="text-[10px] text-gray-400 block">Retained earnings & reserves</span>
                      </div>
                    </div>
                    <Badge color="indigo">EQUITY</Badge>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="p-3 bg-stone-50 dark:bg-slate-800/50 rounded-xl border dark:border-slate-800/80 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-stone-800 dark:text-slate-200 block">Retained Surplus / Net Income</span>
                        <span className="text-[10px] text-gray-400">Accumulated operational earnings</span>
                      </div>
                      <span className={`font-mono text-xs font-bold ${retainedSurplus >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {formatAmount(retainedSurplus)}
                      </span>
                    </div>

                    <div className="p-3 bg-stone-50 dark:bg-slate-800/50 rounded-xl border dark:border-slate-800/80 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-stone-800 dark:text-slate-200 block">Contributed Equity & Reserves</span>
                        <span className="text-[10px] text-gray-400">Direct equity allocations</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {formatAmount(0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400 font-mono">Total Equity</span>
                  <span className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400 font-display">
                    {formatAmount(totalEquity)}
                  </span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* SUBTAB 1: STANDARD GENERAL LEDGER */}
        {activeSubTab === "ledger_book" && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
              <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 p-5 rounded-xl shadow-xs">
                <span className="text-[10px] uppercase font-mono tracking-widest text-gray-400 dark:text-slate-500">{t("lbl_total_income")}</span>
                <span className="text-2xl font-extrabold font-display block text-emerald-600 mt-2">
                  + {formatAmount(income)}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 p-5 rounded-xl shadow-xs">
                <span className="text-[10px] uppercase font-mono tracking-widest text-gray-400 dark:text-slate-500">{t("lbl_total_expenses")}</span>
                <span className="text-2xl font-extrabold font-display block text-red-650 mt-2">
                  - {formatAmount(expense)}
                </span>
              </div>

              <div className="bg-gradient-to-tr from-[var(--org-primary)] to-[var(--org-primary-d)] text-white border-0 p-5 rounded-xl shadow-xs">
                <span className="text-[10px] uppercase font-mono tracking-widest text-white/70">{t("lbl_balance_sheet")}</span>
                <span className="text-2xl font-extrabold font-display block mt-2">
                  {formatAmount(balance)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Transactions Records</h3>
              <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setOpenAddModal(true)}>
                {t("btn_add_entry")}
              </Button>
            </div>

            <Table columns={columns} data={ledger || []} emptyMessage={t("empty_transactions")} />

            {/* Add Entry Modal */}
            <Modal open={openAddModal} onClose={() => setOpenAddModal(false)} title={t("modal_ledger_title")}>
              <form onSubmit={handleAddEntry} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setType("income")}
                    className={`p-2.5 border dark:border-slate-700 rounded-xl font-bold font-display text-xs flex flex-col items-center justify-center transition ${
                      type === "income" ? "border-emerald-500 bg-emerald-50/25 text-emerald-700 dark:bg-emerald-950/20" : "bg-white dark:bg-slate-900 text-stone-700 dark:text-slate-300"
                    }`}
                  >
                    {t("opt_income")} (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("expense")}
                    className={`p-2.5 border dark:border-slate-700 rounded-xl font-bold font-display text-xs flex flex-col items-center justify-center transition ${
                      type === "expense" ? "border-red-500 bg-red-50/25 text-red-750 dark:bg-red-950/20" : "bg-white dark:bg-slate-900 text-stone-700 dark:text-slate-300"
                    }`}
                  >
                    {t("opt_expense")} (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("asset")}
                    className={`p-2.5 border dark:border-slate-700 rounded-xl font-bold font-display text-xs flex flex-col items-center justify-center transition ${
                      type === "asset" ? "border-indigo-500 bg-indigo-50/25 text-indigo-700 dark:bg-indigo-950/20" : "bg-white dark:bg-slate-900 text-stone-700 dark:text-slate-300"
                    }`}
                  >
                    Asset (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("liability")}
                    className={`p-2.5 border dark:border-slate-700 rounded-xl font-bold font-display text-xs flex flex-col items-center justify-center transition ${
                      type === "liability" ? "border-amber-500 bg-amber-50/25 text-amber-700 dark:bg-amber-950/20" : "bg-white dark:bg-slate-900 text-stone-700 dark:text-slate-300"
                    }`}
                  >
                    Liability (+)
                  </button>
                </div>

                <Input label={t("lbl_trans_desc")} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t("placeholder_tx_desc")} />
                
                <div className="grid grid-cols-2 gap-4">
                  <Input label={t("lbl_trans_amount")} type="number" value={amount || ""} onChange={(e) => setAmount(parseInt(e.target.value) || 0)} placeholder="15000" />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-755 dark:text-slate-300">{t("lbl_trans_category")}</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full text-sm rounded-lg border bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 px-3 py-2.5 text-gray-805 dark:text-slate-100 select-none outline-none focus:ring-2 focus:ring-[var(--org-primary)]"
                    >
                      <option value="donation">{t("opt_donation")}</option>
                      <option value="grant">{t("opt_grant")}</option>
                      <option value="rent">{t("opt_rent")}</option>
                      <option value="salary">{t("opt_salary")}</option>
                      <option value="equipment">{t("opt_equipment")}</option>
                      <option value="transport">{t("opt_transport")}</option>
                      <option value="membership_fee">Member Fee</option>
                      <option value="share_capital">Share Capital</option>
                    </select>
                  </div>
                </div>

                {category === "donation" && (
                  <div className="p-4 bg-gray-50 dark:bg-slate-800/40 rounded-xl border dark:border-slate-800 flex flex-col gap-3 select-none text-left">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider font-mono">Donor Specification</span>
                    
                    <div className="flex gap-4">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 cursor-pointer">
                        <input
                          type="radio"
                          name="donorType"
                          value="external"
                          checked={donorType === "external"}
                          onChange={() => setDonorType("external")}
                          className="text-[var(--org-primary)] focus:ring-[var(--org-primary)] h-4 w-4"
                        />
                        External Supporter
                      </label>
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 cursor-pointer">
                        <input
                          type="radio"
                          name="donorType"
                          value="internal"
                          checked={donorType === "internal"}
                          onChange={() => setDonorType("internal")}
                          className="text-[var(--org-primary)] focus:ring-[var(--org-primary)] h-4 w-4"
                        />
                        Internal Co-op Member
                      </label>
                    </div>

                    {donorType === "external" ? (
                      <Input
                        label="Donor Name (External)"
                        value={donorName}
                        onChange={(e) => setDonorName(e.target.value)}
                        placeholder="e.g. Bill & Melinda Gates Foundation"
                      />
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-755 dark:text-slate-300">Select Cooperative Member</label>
                        <select
                          value={selectedMemberId}
                          onChange={(e) => setSelectedMemberId(e.target.value)}
                          className="w-full text-sm rounded-lg border bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 px-3 py-2.5 text-stone-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[var(--org-primary)]"
                        >
                          <option value="">-- Choose Member --</option>
                          {members?.map(m => (
                            <option key={m.id} value={m.id}>{m.user?.full_name} ({m.member_number || "No ID"})</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* Goal Linking selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-755 dark:text-slate-300 flex items-center gap-1">
                    <Target className="h-3.5 w-3.5 text-emerald-500" />
                    Link to Strategic Goal (Impact Traceability)
                  </label>
                  <select
                    value={selectedGoalId}
                    onChange={(e) => setSelectedGoalId(e.target.value)}
                    className="w-full text-sm rounded-lg border bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 px-3 py-2.5 text-stone-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[var(--org-primary)]"
                  >
                    <option value="">-- No Link (General Operational) --</option>
                    {goals?.map(g => (
                      <option key={g.id} value={g.id}>{g.title}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input label={t("lbl_trans_date")} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  <Input label={t("lbl_momo_txid")} value={refNum} onChange={(e) => setRefNum(e.target.value)} placeholder="MOMO-9524021" />
                </div>

                <Button type="submit" loading={entryMutation.isPending} className="w-full mt-4 py-2.5">
                  {t("btn_save_transaction")}
                </Button>
              </form>
            </Modal>

            {/* Edit Entry Modal */}
            <Modal open={openEditModal} onClose={() => setOpenEditModal(false)} title="Edit Transaction Record">
              <form onSubmit={handleUpdateEntry} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditType("income")}
                    className={`p-2.5 border dark:border-slate-700 rounded-xl font-bold font-display text-xs flex flex-col items-center justify-center transition ${
                      editType === "income" ? "border-emerald-500 bg-emerald-50/25 text-emerald-700 dark:bg-emerald-950/20" : "bg-white dark:bg-slate-900 text-stone-700 dark:text-slate-300"
                    }`}
                  >
                    Income (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditType("expense")}
                    className={`p-2.5 border dark:border-slate-700 rounded-xl font-bold font-display text-xs flex flex-col items-center justify-center transition ${
                      editType === "expense" ? "border-red-500 bg-red-50/25 text-red-750 dark:bg-red-950/20" : "bg-white dark:bg-slate-900 text-stone-700 dark:text-slate-300"
                    }`}
                  >
                    Expense (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditType("asset")}
                    className={`p-2.5 border dark:border-slate-700 rounded-xl font-bold font-display text-xs flex flex-col items-center justify-center transition ${
                      editType === "asset" ? "border-indigo-500 bg-indigo-50/25 text-indigo-700 dark:bg-indigo-950/20" : "bg-white dark:bg-slate-900 text-stone-700 dark:text-slate-300"
                    }`}
                  >
                    Asset (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditType("liability")}
                    className={`p-2.5 border dark:border-slate-700 rounded-xl font-bold font-display text-xs flex flex-col items-center justify-center transition ${
                      editType === "liability" ? "border-amber-500 bg-amber-50/25 text-amber-700 dark:bg-amber-950/20" : "bg-white dark:bg-slate-900 text-stone-700 dark:text-slate-300"
                    }`}
                  >
                    Liability (+)
                  </button>
                </div>

                <Input label={t("lbl_trans_desc")} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder={t("placeholder_tx_desc")} />
                
                <div className="grid grid-cols-2 gap-4">
                  <Input label={t("lbl_trans_amount")} type="number" value={editAmount || ""} onChange={(e) => setEditAmount(parseInt(e.target.value) || 0)} placeholder="15000" />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-755 dark:text-slate-300">{t("lbl_trans_category")}</label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full text-sm rounded-lg border bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 px-3 py-2.5 text-gray-805 dark:text-slate-100 select-none outline-none focus:ring-2 focus:ring-[var(--org-primary)]"
                    >
                      <option value="donation">{t("opt_donation")}</option>
                      <option value="grant">{t("opt_grant")}</option>
                      <option value="rent">{t("opt_rent")}</option>
                      <option value="salary">{t("opt_salary")}</option>
                      <option value="equipment">{t("opt_equipment")}</option>
                      <option value="transport">{t("opt_transport")}</option>
                      <option value="membership_fee">Member Fee</option>
                      <option value="share_capital">Share Capital</option>
                    </select>
                  </div>
                </div>

                {editCategory === "donation" && (
                  <div className="p-4 bg-gray-50 dark:bg-slate-800/40 rounded-xl border dark:border-slate-800 flex flex-col gap-3 select-none text-left">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider font-mono">Donor Specification</span>
                    
                    <div className="flex gap-4">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 cursor-pointer">
                        <input
                          type="radio"
                          name="editDonorType"
                          value="external"
                          checked={editDonorType === "external"}
                          onChange={() => setEditDonorType("external")}
                          className="text-[var(--org-primary)] focus:ring-[var(--org-primary)] h-4 w-4"
                        />
                        External Supporter
                      </label>
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 cursor-pointer">
                        <input
                          type="radio"
                          name="editDonorType"
                          value="internal"
                          checked={editDonorType === "internal"}
                          onChange={() => setEditDonorType("internal")}
                          className="text-[var(--org-primary)] focus:ring-[var(--org-primary)] h-4 w-4"
                        />
                        Internal Co-op Member
                      </label>
                    </div>

                    {editDonorType === "external" ? (
                      <Input
                        label="Donor Name (External)"
                        value={editDonorName}
                        onChange={(e) => setEditDonorName(e.target.value)}
                        placeholder="e.g. Bill & Melinda Gates Foundation"
                      />
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-755 dark:text-slate-300">Select Cooperative Member</label>
                        <select
                          value={editMemberId}
                          onChange={(e) => setEditMemberId(e.target.value)}
                          className="w-full text-sm rounded-lg border bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 px-3 py-2.5 text-stone-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[var(--org-primary)]"
                        >
                          <option value="">-- Choose Member --</option>
                          {members?.map(m => (
                            <option key={m.id} value={m.id}>{m.user?.full_name} ({m.member_number || "No ID"})</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-755 dark:text-slate-300 flex items-center gap-1">
                    <Target className="h-3.5 w-3.5 text-emerald-500" />
                    Link to Strategic Goal
                  </label>
                  <select
                    value={editGoalId}
                    onChange={(e) => setEditGoalId(e.target.value)}
                    className="w-full text-sm rounded-lg border bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 px-3 py-2.5 text-stone-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[var(--org-primary)]"
                  >
                    <option value="">-- No Link (General Operational) --</option>
                    {goals?.map(g => (
                      <option key={g.id} value={g.id}>{g.title}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input label={t("lbl_trans_date")} type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                  <Input label={t("lbl_momo_txid")} value={editRefNum} onChange={(e) => setEditRefNum(e.target.value)} placeholder="MOMO-9524021" />
                </div>

                <Button type="submit" loading={updateMutation.isPending} className="w-full mt-4 py-2.5">
                  Save Transaction Changes
                </Button>
              </form>
            </Modal>
          </>
        )}

        {/* SUBTAB 2: COOPERATIVE SHARE CAPITAL (IMIGABANE) */}
        {activeSubTab === "share_capital" && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200">
            
            {/* Share Capital Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 p-5 rounded-xl shadow-xs">
                <span className="text-[10px] uppercase font-mono tracking-widest text-gray-400 dark:text-slate-500">Total Share Capital Collected (Imigabane)</span>
                <span className="text-2xl font-extrabold block text-emerald-600 mt-2">
                  {formatAmount(totalCollectedSharesRWF)}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 p-5 rounded-xl shadow-xs">
                <span className="text-[10px] uppercase font-mono tracking-widest text-gray-400 dark:text-slate-500">Total Cooperative Shares Distributed</span>
                <span className="text-2xl font-extrabold block text-indigo-600 dark:text-indigo-400 mt-2">
                  {totalSharesOwned} Shares
                </span>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Cooperative Member Equity Standings</h3>
              <Button size="sm" icon={<Coins className="h-3.5 w-3.5" />} onClick={() => setOpenShareModal(true)}>
                Record Share Transaction
              </Button>
            </div>

            {/* Grid list of members equity */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {members?.map((m) => {
                const capital = sharesCapital.find(sc => sc.member_id === m.id) || {
                  shares_count: 0,
                  total_paid: 0,
                  status: "pending"
                };

                return (
                  <div key={m.id} className="bg-stone-50/50 dark:bg-slate-900/50 border dark:border-slate-800 p-4 rounded-xl flex flex-col justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={m.user?.full_name || "M"} size="xs" />
                      <div>
                        <h4 className="text-xs font-bold text-stone-900 dark:text-white leading-tight">{m.user?.full_name}</h4>
                        <span className="text-[10px] text-gray-400 font-mono block mt-0.5">Member #{m.member_number || "Pending"}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t dark:border-slate-800/60">
                      <div>
                        <span className="text-[9px] text-gray-400 block font-mono">SHARES OWNED</span>
                        <span className="text-xs font-extrabold text-stone-850 dark:text-slate-200 block mt-0.5">{capital.shares_count} Shares</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 block font-mono">EQUITY VALUE</span>
                        <span className="text-xs font-extrabold text-stone-850 dark:text-slate-200 block mt-0.5">{formatAmount(capital.total_paid)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t dark:border-slate-800/40">
                      <span className="text-[10px] text-gray-400">Standing status:</span>
                      <Badge color={capital.status === "paid" ? "green" : capital.status === "partially_paid" ? "amber" : "red"}>
                        {capital.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Past transactions logs */}
            <div className="mt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Shares Purchases History</h4>
              {sharesHistory.length === 0 ? (
                <div className="text-center p-6 border border-dashed rounded-xl text-gray-400 text-xs">No recent shares transactions recorded.</div>
              ) : (
                <div className="border dark:border-slate-850 rounded-xl overflow-hidden">
                  <table className="w-full text-xs font-sans text-stone-800 dark:text-slate-200">
                    <thead>
                      <tr className="bg-stone-100/50 dark:bg-slate-950 p-3 border-b dark:border-slate-800 text-left font-mono text-[10px] text-gray-400">
                        <th className="p-3">Date</th>
                        <th className="p-3">Member</th>
                        <th className="p-3">Shares Purchased</th>
                        <th className="p-3">Amount Paid</th>
                        <th className="p-3">Authorized By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sharesHistory.map((tx) => {
                        const m = members?.find(m => m.id === tx.member_id);
                        return (
                          <tr key={tx.id} className="border-b dark:border-slate-800/40 bg-white dark:bg-slate-900">
                            <td className="p-3 font-mono text-gray-400">{tx.transaction_date}</td>
                            <td className="p-3 font-semibold">{m?.user?.full_name || "Unknown"}</td>
                            <td className="p-3 font-mono">+{tx.shares_added} Shares</td>
                            <td className="p-3 font-mono font-bold text-emerald-600">{formatAmount(tx.amount_paid)}</td>
                            <td className="p-3 text-gray-400 font-medium">{tx.recorded_by}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Record Shares Transaction Modal */}
            <Modal open={openShareModal} onClose={() => setOpenShareModal(false)} title="Record Share (Imigabane) Purchase">
              <form onSubmit={handleRecordSharePurchase} className="flex flex-col gap-4">
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-755 dark:text-slate-300">Cooperative Member Account</label>
                  <select
                    required
                    value={selectedShareMember}
                    onChange={(e) => setSelectedShareMember(e.target.value)}
                    className="w-full text-sm rounded-lg border bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 px-3 py-2.5 text-stone-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[var(--org-primary)]"
                  >
                    <option value="">-- Choose Member --</option>
                    {members?.map(m => (
                      <option key={m.id} value={m.id}>{m.user?.full_name} ({m.member_number || "No ID"})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Shares to Allocate"
                    type="number"
                    required
                    value={sharesToAdd}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setSharesToAdd(val);
                      setSharesPaidAmount(val * shareVal);
                    }}
                  />
                  <Input
                    label="Per-Share Par Value (RWF)"
                    type="number"
                    disabled
                    value={shareVal}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Total Cash Paid (RWF)"
                    type="number"
                    required
                    value={sharesPaidAmount}
                    onChange={(e) => setSharesPaidAmount(parseInt(e.target.value) || 0)}
                  />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-755 dark:text-slate-300">Standing status</label>
                    <select
                      value={shareStatus}
                      onChange={(e) => setShareStatus(e.target.value as any)}
                      className="w-full text-sm rounded-lg border bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 px-3 py-2.5 text-stone-850 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[var(--org-primary)]"
                    >
                      <option value="paid">Fully Paid</option>
                      <option value="partially_paid">Partially Paid</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                </div>

                <Button type="submit" className="w-full mt-4 py-2.5">
                  Record Share Allocation
                </Button>
              </form>
            </Modal>
          </div>
        )}

      </div>
    </PlanGatedView>
  );
};

// ==========================================
// 3. COMBINED GRANTS & DONATIONS MANAGEMENT
// ==========================================
interface GrantsTrackerProps {
  defaultTab?: "grants" | "donations" | "overview";
}

export const GrantsTracker: React.FC<GrantsTrackerProps> = ({ defaultTab = "grants" }) => {
  const { t } = useLocalTranslation();
  const { activeOrg, activeMember } = useOrgStore();
  const { user } = useAuthStore();
  const { addToast } = useToast();
  const { formatAmount } = useCurrencyStore();

  const isAccountant = (activeMember?.role as string) === "accountant" || !!user?.is_superadmin;
  const [activeTab, setActiveTab] = useState<"grants" | "donations" | "overview">(defaultTab);

  // Grants state & hooks
  const { data: grants, refetch: refetchGrants } = useGrants(activeOrg?.id);
  const createGrantMutation = useCreateGrant();
  const updateGrantStatusMutation = useUpdateGrantStatus();

  const [openAddGrantModal, setOpenAddGrantModal] = useState(false);
  const [grantTitle, setGrantTitle] = useState("");
  const [funder, setFunder] = useState("");
  const [range, setRange] = useState("");
  const [deadline, setDeadline] = useState("");
  const [link, setLink] = useState("");
  const [eligibility, setEligibility] = useState("");
  const [showAdvancedGrantOpts, setShowAdvancedGrantOpts] = useState(false);

  // Donations state & hooks
  const { data: donations, refetch: refetchDonations } = useDonations(activeOrg?.id);
  const confirmDonationMutation = useConfirmDonation();
  const { data: members } = useMembers(activeOrg?.id);
  const createDonationMutation = useCreateDonation();

  const [openAddDonationModal, setOpenAddDonationModal] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [donationAmount, setDonationAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"mtn" | "airtel">("mtn");
  const [donationMessage, setDonationMessage] = useState("");

  // Real-time synchronization subscription for donations
  useEffect(() => {
    if (!isSupabaseConfigured || !activeOrg?.id) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      const channelName = `donations_rt_${activeOrg.id}_${Math.random().toString(36).substring(2, 9)}`;
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "donations",
            filter: `org_id=eq.${activeOrg.id}`
          },
          () => {
            refetchDonations();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn("[Realtime] Donations subscription notice:", err);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [activeOrg?.id, refetchDonations]);

  // Grant handlers
  const handleCreateGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantTitle || !funder || !range || !deadline) return;

    try {
      await createGrantMutation.mutateAsync({
        org_id: activeOrg?.id || "",
        title: grantTitle,
        funder,
        amount_range: range,
        currency: "USD",
        deadline: new Date(deadline).toISOString(),
        link,
        eligibility,
        status: "tracking"
      });
      setOpenAddGrantModal(false);
      setGrantTitle("");
      setFunder("");
      setRange("");
      setDeadline("");
      setLink("");
      setEligibility("");
      refetchGrants();
      addToast("Grant opportunity added to tracking directory!", "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to create grant proposal.", "error");
    }
  };

  const handleGrantStatusUpdate = async (id: string, nextStatus: any) => {
    try {
      await updateGrantStatusMutation.mutateAsync({ grantId: id, status: nextStatus, orgId: activeOrg?.id || "" });
      refetchGrants();
      addToast(`Grant phase updated to ${nextStatus.toUpperCase()}`, "success");
    } catch (err) {
      console.error(err);
    }
  };

  // Donation handlers
  const handleCreateDonationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const matchedMember = members?.find(m => m.id === selectedMemberId);
    if (!matchedMember || !donationAmount) return;

    try {
      await createDonationMutation.mutateAsync({
        org_id: activeOrg?.id || "",
        amount: donationAmount,
        donor_name: matchedMember.user?.full_name || "Unknown Member",
        donor_email: matchedMember.user?.email || "",
        payment_method: paymentMethod,
        message: donationMessage,
        proof_url: ""
      });
      setOpenAddDonationModal(false);
      setSelectedMemberId("");
      setDonationAmount(0);
      setDonationMessage("");
      refetchDonations();
      addToast("Donation logged successfully", "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to record donation", "error");
    }
  };

  const handleApproveDonation = async (id: string) => {
    try {
      await confirmDonationMutation.mutateAsync({
        donationId: id,
        status: "confirmed",
        orgId: activeOrg?.id || ""
      });
      refetchDonations();
      addToast("Donation approved and documented in accounting ledger!", "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to approve donation", "error");
    }
  };

  const handleRejectDonation = async (id: string) => {
    try {
      await confirmDonationMutation.mutateAsync({
        donationId: id,
        status: "rejected",
        orgId: activeOrg?.id || ""
      });
      refetchDonations();
      addToast("Donation audit rejected", "info");
    } catch (err) {
      console.error(err);
      addToast("Failed to reject donation", "error");
    }
  };

  const pendingDonations = donations?.filter((d) => d.status === "awaiting_approval") || [];
  const approvedDonations = donations?.filter((d) => d.status === "confirmed") || [];
  const totalApprovedDonationsAmount = approvedDonations.reduce((sum, d) => sum + (d.amount || 0), 0);

  return (
    <div className="flex flex-col gap-6 select-none font-sans w-full animate-in">
      {/* Header Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 gap-4 shrink-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-display text-gray-900 dark:text-white">
            {t("grants_dir_title", "Grants & Sourced Funds Directory")}
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            {t("grants_dir_sub", "Manage strategic grant proposals, MoMo donations auditing, and total sourced capital.")}
          </p>
        </div>

        {/* Tab Controls & Primary Action Button */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("grants")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "grants"
                  ? "bg-[var(--org-primary)] text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900 dark:text-slate-300 dark:hover:text-white"
              }`}
            >
              <Award className="h-3.5 w-3.5" />
              {t("grants_tab_agroecology", "Strategic Grants")} ({grants?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab("donations")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "donations"
                  ? "bg-[var(--org-primary)] text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900 dark:text-slate-300 dark:hover:text-white"
              }`}
            >
              <Heart className="h-3.5 w-3.5" />
              {t("grants_tab_sourced_donations", "Sourced Donations")} ({pendingDonations.length > 0 ? `${pendingDonations.length} ${t("lbl_pending", "Pending")}` : approvedDonations.length})
            </button>
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "overview"
                  ? "bg-[var(--org-primary)] text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900 dark:text-slate-300 dark:hover:text-white"
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              {t("grants_tab_pipeline_overview", "Pipeline Overview")}
            </button>
          </div>

          {activeTab === "grants" && (
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setOpenAddGrantModal(true)}>
              {t("btn_track_grant")}
            </Button>
          )}

          {activeTab === "donations" && isAccountant && (
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setOpenAddDonationModal(true)}>
              {t("btn_new_donation")}
            </Button>
          )}
        </div>
      </div>

      {/* TAB 1: GRANTS DIRECTORY */}
      {activeTab === "grants" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full animate-in fade-in duration-200">
          {grants && grants.length > 0 ? (
            grants.map((g) => {
              const daysLeft = Math.ceil((new Date(g.deadline).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
              const urgency = daysLeft < 7 ? "red" : daysLeft < 30 ? "amber" : "green";

              return (
                <Card key={g.id} title={g.title} action={
                  <Badge color={urgency}>
                    {daysLeft > 0 ? t("lbl_days_left", { days: daysLeft }) : t("lbl_expired")}
                  </Badge>
                }>
                  <div className="flex flex-col gap-2 text-xs text-gray-600 dark:text-slate-300 mb-4 font-semibold">
                    <span>{t("lbl_funder_agent", { funder: g.funder })}</span>
                    <span>{t("lbl_amount_range", { range: `${g.amount_range} ${g.currency}` })}</span>
                    {g.eligibility && <span>{t("lbl_eligibility_focus", { focus: g.eligibility })}</span>}
                  </div>

                  <div className="flex items-center justify-between border-t dark:border-slate-800 pt-4 leading-none select-none">
                    <span className="text-xs text-gray-400 dark:text-slate-400 font-mono">
                      {t("lbl_current_phase", { phase: g.status.toUpperCase() })}
                    </span>
                    
                    <div className="flex gap-1.5 shrink-0 select-none">
                      {g.status === "tracking" && (
                        <Button size="sm" onClick={() => handleGrantStatusUpdate(g.id, "applied")}>
                          {t("btn_mark_applied")}
                        </Button>
                      )}
                      {g.status === "applied" && (
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => handleGrantStatusUpdate(g.id, "successful")}>
                            {t("btn_successful")}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleGrantStatusUpdate(g.id, "unsuccessful")}>
                            {t("btn_unsuccessful")}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          ) : (
            <div className="col-span-1 md:col-span-2">
              <EmptyState title={t("empty_grants")} message={t("empty_grants_msg")} />
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SOURCED DONATIONS DIRECTORY */}
      {activeTab === "donations" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full shrink-0 animate-in fade-in duration-200">
          {/* Pending Approval list */}
          <Card title={t("pending_donations_title", { count: pendingDonations.length })}>
            {pendingDonations.length > 0 ? (
              <div className="flex flex-col gap-4">
                {pendingDonations.map((d) => (
                  <div key={d.id} className="p-4 bg-slate-50 dark:bg-slate-850 border dark:border-slate-700 rounded-xl flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 dark:text-white">{d.donor_name}</span>
                        <span className="text-[10px] text-gray-400 dark:text-slate-400 font-mono mt-0.5">{d.donor_email}</span>
                      </div>
                      <span className="font-mono text-sm font-extrabold text-[#15803D] dark:text-emerald-400">{formatAmount(d.amount)}</span>
                    </div>

                    <div className="p-2.5 bg-yellow-50 dark:bg-yellow-950/30 text-[11px] text-amber-800 dark:text-amber-300 italic leading-relaxed border dark:border-amber-900/40 rounded font-semibold whitespace-pre-wrap">
                      "{d.message || t("lbl_no_message")}"
                    </div>

                    {isAccountant ? (
                      <div className="flex gap-2.5 mt-2">
                        <Button size="sm" onClick={() => handleApproveDonation(d.id)}>
                          {t("btn_approve_proof")}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleRejectDonation(d.id)}>
                          {t("btn_reject")}
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-2 text-[11px] text-gray-500 font-semibold italic">
                        {t("Donation verification and ledger auditing is managed by the organization accountant.")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title={t("empty_pending_donors")} message={t("empty_pending_donors_msg")} />
            )}
          </Card>

          {/* History of approved list */}
          <Card title={t("approved_donations_title")}>
            {approvedDonations.length > 0 ? (
              <div className="divide-y dark:divide-slate-800 text-xs select-none">
                {approvedDonations.map((d) => (
                  <div key={d.id} className="py-3 flex justify-between items-center leading-none">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900 dark:text-white font-display">{d.donor_name}</span>
                      <span className="text-[10px] text-gray-400 dark:text-slate-400 font-mono mt-1">
                        {new Date(d.created_at).toLocaleDateString()} • {d.payment_method?.toUpperCase()}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-extrabold text-[#15803D] dark:text-emerald-400">{formatAmount(d.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title={t("empty_approved_donors")} message={t("empty_approved_donors_msg")} />
            )}
          </Card>
        </div>
      )}

      {/* TAB 3: PIPELINE OVERVIEW & COMBINED AUDIT */}
      {activeTab === "overview" && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 p-4 rounded-xl">
              <span className="text-[10px] uppercase font-mono font-bold text-gray-400 dark:text-slate-400">Total Grants Tracked</span>
              <span className="text-2xl font-extrabold font-display block text-gray-900 dark:text-white mt-1">{grants?.length || 0}</span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 block">
                {grants?.filter(g => g.status === "successful").length || 0} Awarded
              </span>
            </div>

            <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 p-4 rounded-xl">
              <span className="text-[10px] uppercase font-mono font-bold text-gray-400 dark:text-slate-400">Total Sourced Donations</span>
              <span className="text-2xl font-extrabold font-display block text-emerald-600 dark:text-emerald-400 mt-1">
                {formatAmount(totalApprovedDonationsAmount)}
              </span>
              <span className="text-[11px] text-gray-500 dark:text-slate-400 font-medium mt-1 block">
                From {approvedDonations.length} Approved Receipts
              </span>
            </div>

            <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 p-4 rounded-xl">
              <span className="text-[10px] uppercase font-mono font-bold text-gray-400 dark:text-slate-400">Pending Donation Audits</span>
              <span className="text-2xl font-extrabold font-display block text-amber-600 dark:text-amber-400 mt-1">{pendingDonations.length}</span>
              <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold mt-1 block">Awaiting Verification</span>
            </div>

            <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 p-4 rounded-xl">
              <span className="text-[10px] uppercase font-mono font-bold text-gray-400 dark:text-slate-400">Active Proposals</span>
              <span className="text-2xl font-extrabold font-display block text-blue-600 dark:text-blue-400 mt-1">
                {grants?.filter(g => g.status === "applied").length || 0}
              </span>
              <span className="text-[11px] text-gray-500 dark:text-slate-400 font-medium mt-1 block">Submitted Phase</span>
            </div>
          </div>

          <Card title="Unified External Funding Directory">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b dark:border-slate-800 text-gray-400 dark:text-slate-400 font-mono uppercase text-[10px]">
                    <th className="py-2.5 px-3">Funding Type</th>
                    <th className="py-2.5 px-3">Title / Donor</th>
                    <th className="py-2.5 px-3">Agency / Carrier</th>
                    <th className="py-2.5 px-3">Phase / Status</th>
                    <th className="py-2.5 px-3 text-right">Value / Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-800 font-medium text-gray-800 dark:text-slate-200">
                  {grants?.map(g => (
                    <tr key={g.id} className="hover:bg-gray-50 dark:hover:bg-slate-850">
                      <td className="py-3 px-3"><Badge color="emerald">GRANT</Badge></td>
                      <td className="py-3 px-3 font-semibold">{g.title}</td>
                      <td className="py-3 px-3">{g.funder}</td>
                      <td className="py-3 px-3 font-mono text-[11px] uppercase font-bold text-slate-700 dark:text-slate-300">{g.status}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold">{g.amount_range} {g.currency}</td>
                    </tr>
                  ))}
                  {donations?.map(d => {
                    const isApproved = d.status === "confirmed";
                    return (
                      <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-slate-850">
                        <td className="py-3 px-3"><Badge color="blue">DONATION</Badge></td>
                        <td className="py-3 px-3 font-semibold">{d.donor_name}</td>
                        <td className="py-3 px-3 uppercase font-mono">{d.payment_method || "MoMo"}</td>
                        <td className="py-3 px-3 font-mono text-[11px]">
                          {isApproved ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">CONFIRMED</span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 font-bold">AWAITING APPROVAL</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatAmount(d.amount)}</td>
                      </tr>
                    );
                  })}
                  {(!grants || grants.length === 0) && (!donations || donations.length === 0) && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-gray-400">No active external grants or donations logged yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Modal 1: Track Grant Modal */}
      <Modal open={openAddGrantModal} onClose={() => setOpenAddGrantModal(false)} title={t("modal_track_grant_title")}>
        <form onSubmit={handleCreateGrant} className="flex flex-col gap-4 animate-in duration-100">
          <Input label={t("lbl_proposal_title")} value={grantTitle} onChange={(e) => setGrantTitle(e.target.value)} placeholder={t("placeholder_grant_title")} required />
          <Input label={t("lbl_funder_agency")} value={funder} onChange={(e) => setFunder(e.target.value)} placeholder={t("placeholder_funder")} required />
          
          <div className="grid grid-cols-2 gap-4">
            <Input label={t("lbl_range_pool")} value={range} onChange={(e) => setRange(e.target.value)} placeholder={t("lbl_range_pool")} required />
            <Input label={t("lbl_deadline_date")} type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
          </div>

          <div className="flex justify-between items-center text-xs mt-2 border-t dark:border-slate-800 pt-3">
             <span className="font-semibold text-gray-600 dark:text-slate-300">Additional Options</span>
             <button type="button" onClick={() => setShowAdvancedGrantOpts(!showAdvancedGrantOpts)} className="text-[var(--org-primary)] font-bold hover:underline">
               {showAdvancedGrantOpts ? "Hide Advanced Content" : "Show Advanced Options"}
             </button>
          </div>

          {showAdvancedGrantOpts && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="flex flex-col gap-4 overflow-hidden">
              <Input label={t("lbl_funder_link")} type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder={t("placeholder_funder_link")} />

              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">{t("lbl_eligibility_focus_label")}</label>
                <textarea
                  className="w-full text-sm rounded-lg border bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 p-3.5 min-h-20 focus:ring-2 focus:ring-[var(--org-primary)] outline-none dark:text-slate-100"
                  value={eligibility}
                  onChange={(e) => setEligibility(e.target.value)}
                  placeholder={t("placeholder_eligibility")}
                />
              </div>
            </motion.div>
          )}

          <Button type="submit" loading={createGrantMutation.isPending} className="w-full py-2.5 mt-4">
            {t("btn_begin_tracking")}
          </Button>
        </form>
      </Modal>

      {/* Modal 2: Add Manual Donation Modal */}
      <Modal open={openAddDonationModal} onClose={() => setOpenAddDonationModal(false)} title={t("modal_add_donation_title")}>
        <form onSubmit={handleCreateDonationSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">{t("lbl_select_donor")}</label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full text-sm rounded-lg border bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 px-3 py-2.5 text-gray-800 dark:text-slate-100 select-none outline-none focus:ring-2 focus:ring-[var(--org-primary)]"
              required
            >
              <option value="">{t("opt_choose_member")}</option>
              {members && members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.user?.full_name} ({m.user?.email})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-gray-400 font-semibold">{t("donor_bylaws_notice")}</p>
          </div>

          <Input
            label={t("lbl_pledged_amount")}
            type="number"
            min="100"
            value={donationAmount || ""}
            onChange={(e) => setDonationAmount(parseInt(e.target.value) || 0)}
            placeholder="e.g. 5000"
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">{t("lbl_carrier_gateway")}</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as "mtn" | "airtel")}
              className="w-full text-sm rounded-lg border bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 px-3 py-2.5 text-gray-800 dark:text-slate-100 select-none outline-none focus:ring-2 focus:ring-[var(--org-primary)]"
              required
            >
              <option value="mtn">{t("opt_mtn")}</option>
              <option value="airtel">{t("opt_airtel")}</option>
            </select>
          </div>

          <Input
            label={t("lbl_remarks_optional")}
            value={donationMessage}
            onChange={(e) => setDonationMessage(e.target.value)}
            placeholder={t("placeholder_remarks")}
          />

          <Button type="submit" loading={createDonationMutation.isPending} className="w-full py-2.5 mt-4 font-bold uppercase text-xs">
            {t("btn_log_donation")}
          </Button>
        </form>
      </Modal>
    </div>
  );
};

export const DonorsPortal: React.FC = () => {
  return <GrantsTracker defaultTab="donations" />;
};

// ==========================================
// 5. ANNUAL AUDIT REPORT COMPILER (Admin, jsPDF)
// ==========================================
export const AnnualReports: React.FC = () => {
  const { t } = useLocalTranslation();
  const { activeOrg } = useOrgStore();
  const { formatAmount } = useCurrencyStore();
  const [downloading, setDownloading] = useState(false);
  const [activeReportSubTab, setActiveReportSubTab] = useState<"real_time" | "annual_audit" | "rca_compliance">("real_time");

  const { data: goals } = useGoals(activeOrg?.id);
  const { data: ledger } = useLedgerEntries(activeOrg?.id);
  const { data: members } = useMembers(activeOrg?.id);
  
  // Calculations
  const completedGoals = goals?.filter(g => g.current_progress >= (g.target || 100)).length || 0;
  const income = ledger?.filter(l => l.type === "income").reduce((acc, curr) => acc + curr.amount, 0) || 0;
  const expense = ledger?.filter(l => l.type === "expense").reduce((acc, curr) => acc + curr.amount, 0) || 0;
  const balance = income - expense;

  // Real-time chart data
  const monthlyData = React.useMemo(() => {
    if (!ledger) return [];
    
    // Group by month
    const grouped = ledger.reduce((acc, curr) => {
      const month = new Date(curr.date).toLocaleString('default', { month: 'short' });
      if (!acc[month]) {
        acc[month] = { name: month, income: 0, expense: 0, balance: 0 };
      }
      if (curr.type === 'income') {
        acc[month].income += curr.amount;
      } else {
        acc[month].expense += curr.amount;
      }
      return acc;
    }, {} as Record<string, { name: string, income: number, expense: number, balance: number }>);
    
    // Sort by month (roughly)
    const sorted = Object.values(grouped);
    
    // Calculate cumulative balance
    let currentBalance = 0;
    return sorted.map(item => {
      currentBalance += (item.income - item.expense);
      return { ...item, cumulativeBalance: currentBalance };
    });
  }, [ledger]);
  
  const recentReceipts = [...(ledger || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3);
  const activeGoals = [...(goals || [])].slice(0, 2);

  // Retrieve share capital state for compliance checks
  const sharesCapital = (() => {
    try {
      const saved = localStorage.getItem(`shares_capital_${activeOrg?.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  })();

  const totalMembersCount = members?.length || 0;
  const compliantMembersCount = sharesCapital.filter((sc: any) => sc.status === "paid").length;
  const shareCapitalCompliancePct = totalMembersCount > 0 ? Math.round((compliantMembersCount / totalMembersCount) * 100) : 0;
  
  const membersWithIdsCount = members?.filter(m => m.member_number).length || 0;
  const memberIdCompliancePct = totalMembersCount > 0 ? Math.round((membersWithIdsCount / totalMembersCount) * 100) : 0;

  // RCA Legal Reserve requirement: 10% of net annual profit
  const legalReserveFund = Math.max(0, Math.round(balance * 0.1));

  // Overall compliance index
  const overallComplianceScore = Math.round(
    (shareCapitalCompliancePct + memberIdCompliancePct + (completedGoals > 0 ? 100 : 50) + (balance >= 0 ? 100 : 70)) / 4
  );

  const handleCompilePDF = async () => {
    const docElement = document.getElementById("report-printable-canvas");
    if (!docElement) return;

    setDownloading(true);
    try {
      const canvas = await html2canvas(docElement, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210; // mm
      const pageHeight = 295; // mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`Annual_Report_Audit_${activeOrg?.slug}_2026.pdf`);
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  const handleExportRCACSV = () => {
    const headers = [
      "RCA Cooperative Standard Format v2.1",
      "Organization Name",
      "Slug",
      "Total Active Members",
      "Compliant Shareholders",
      "Share Capital Compliance Rate",
      "Member ID Registration Rate",
      "Net Annual Surplus (RWF)",
      "Statutory Reserve Allocation (10% RWF)",
      "RCA Compliance Score"
    ];
    
    const row = [
      "",
      activeOrg?.name || "Cooperative",
      activeOrg?.slug || "",
      totalMembersCount,
      compliantMembersCount,
      `${shareCapitalCompliancePct}%`,
      `${memberIdCompliancePct}%`,
      balance,
      legalReserveFund,
      `${overallComplianceScore}%`
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.map(h => `"${h}"`).join(",") + "\n"
      + row.map(r => `"${r}"`).join(",");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `RCA_Compliance_Audit_${activeOrg?.slug}_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <PlanGatedView requiredTier="enterprise" featureName="Annual Report PDF Compiler & Audit Tools">
      <div className="flex flex-col gap-6 select-none font-sans w-full animate-in">
      
      {/* Header Block with Sub-tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 gap-4 shrink-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-display text-gray-910 dark:text-white">{t("reports_title")}</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400">Generate, analyze, and export legal compliance reports and audit tools.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveReportSubTab("real_time")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeReportSubTab === "real_time"
                ? "bg-[var(--org-primary)] text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-350"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Real-time Metrics Dashboard
          </button>
          <button
            onClick={() => setActiveReportSubTab("annual_audit")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeReportSubTab === "annual_audit"
                ? "bg-[var(--org-primary)] text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-350"
            }`}
          >
            Printable Annual Audit (A4)
          </button>
          <button
            onClick={() => setActiveReportSubTab("rca_compliance")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeReportSubTab === "rca_compliance"
                ? "bg-[var(--org-primary)] text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-350"
            }`}
          >
            <FileCheck2 className="h-3.5 w-3.5" />
            RCA Compliance Audit
          </button>
        </div>
      </div>

      {activeReportSubTab === "real_time" && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <span className="font-bold text-gray-500 dark:text-slate-400 font-mono text-xs uppercase tracking-wider block">Total Net Surplus</span>
              <span className={`text-2xl font-bold font-display block mt-2 ${balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatAmount(balance)}
              </span>
            </div>
            <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <span className="font-bold text-gray-500 dark:text-slate-400 font-mono text-xs uppercase tracking-wider block">Goals Completed</span>
              <span className="text-2xl font-bold font-display block text-stone-900 dark:text-white mt-2">
                {completedGoals} / {goals?.length || 0}
              </span>
            </div>
            <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <span className="font-bold text-gray-500 dark:text-slate-400 font-mono text-xs uppercase tracking-wider block">Compliance Score</span>
              <span className="text-2xl font-bold font-display block text-stone-900 dark:text-white mt-2">
                {overallComplianceScore}%
              </span>
            </div>
            <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <span className="font-bold text-gray-500 dark:text-slate-400 font-mono text-xs uppercase tracking-wider block">Statutory Reserve</span>
              <span className="text-2xl font-bold font-display block text-[var(--org-primary)] mt-2">
                {formatAmount(legalReserveFund)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
              <h3 className="text-sm font-bold font-display text-gray-900 dark:text-white mb-6 uppercase tracking-widest text-center">Cash Flow Trend</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `${val / 1000}k`} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => formatAmount(value)}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} />
                    <Area type="monotone" dataKey="expense" name="Expense" stroke="#f43f5e" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
              <h3 className="text-sm font-bold font-display text-gray-900 dark:text-white mb-6 uppercase tracking-widest text-center">Cumulative Balance</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `${val / 1000}k`} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => formatAmount(value)}
                    />
                    <Line type="monotone" dataKey="cumulativeBalance" name="Balance" stroke="#3b82f6" strokeWidth={3} dot={{ strokeWidth: 2, r: 4, fill: '#fff', stroke: '#3b82f6' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeReportSubTab === "annual_audit" && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <Button loading={downloading} icon={<Printer className="h-4 w-4" />} onClick={handleCompilePDF}>
              {t("btn_compile_pdf")}
            </Button>
          </div>
          <p className="text-[11px] text-gray-400 font-mono text-center">{t("lbl_canvas_preview")}</p>

          {/* A4 Printable container mockup */}
          <div className="bg-gray-105 border p-1 border-gray-200 shadow-lg justify-center max-w-[210mm] mx-auto select-none overflow-hidden rounded-xl bg-white text-gray-805">
            <div id="report-printable-canvas" className="p-12 w-full flex flex-col gap-8 text-xs leading-relaxed max-w-[210mm] mx-auto bg-white font-sans text-stone-900 border" style={{ minHeight: "297mm" }}>
              {/* Branded header block */}
              <div className="flex justify-between items-center border-b pb-6 shrink-0 leading-none">
                <div className="flex flex-col gap-1">
                  <h1 className="text-2xl font-bold font-display uppercase tracking-tight text-emerald-900">{activeOrg?.name || t("lbl_default_header", "Annual Report")}</h1>
                  <p className="text-[11px] font-semibold text-gray-500 font-mono">{t("pdf_header_report_type")}</p>
                </div>
                <span className="text-[10px] font-bold py-1 px-2.5 bg-emerald-50 rounded-full text-emerald-700">{t("pdf_year_badge")}</span>
              </div>

              {/* Quick statement */}
              <section className="flex flex-col gap-2 shrink-0 border-b pb-4">
                <span className="text-[10px] font-mono tracking-widest text-[#15803D] uppercase font-bold leading-none">{t("pdf_mission_title")}</span>
                <p className="text-stone-700 leading-relaxed font-semibold">
                  {t("pdf_mission_desc", { slug: activeOrg?.slug || "" })}
                </p>
              </section>

              {/* Table Metrics */}
              <div className="grid grid-cols-2 gap-4 shrink-0 border-b pb-6">
                <div className="p-4 bg-slate-50 rounded-lg flex flex-col justify-between">
                  <span className="font-bold text-gray-500 font-mono block">{t("pdf_achievements_title")}</span>
                  <span className="text-xl font-bold font-display block text-stone-900 mt-2">{completedGoals} Goals Completed</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg flex flex-col justify-between">
                  <span className="font-bold text-gray-500 font-mono block">{t("pdf_ledger_title")}</span>
                  <span className="text-xl font-bold font-display block text-stone-900 mt-2">{formatAmount(balance)}</span>
                </div>
              </div>

              <section className="flex flex-col gap-8 flex-grow">
                {/* Outline goals */}
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-emerald-800 leading-none">{t("pdf_goals_review")}</span>
                  <div className="flex flex-col gap-2 font-semibold text-[11px] text-stone-700">
                    {activeGoals.map(g => (
                      <div key={g.id} className="flex justify-between border-b pb-1">
                        <span>{g.title}</span>
                        <span className="font-mono">{Math.round((g.current_progress / (g.target || 100)) * 100)}% Completed</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financial Ledger summaries */}
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-emerald-800 leading-none">{t("pdf_ledger_receipts")}</span>
                  <div className="flex flex-col gap-2 font-semibold font-mono text-[10px] text-stone-600">
                    {recentReceipts.map(rec => (
                      <div key={rec.id} className="flex justify-between border-b pb-1 leading-none">
                        <span>{rec.date} • {rec.description}</span>
                        <span className={`font-bold ${rec.type === 'income' ? 'text-emerald-700' : 'text-red-700'}`}>{rec.type === 'income' ? '+' : '-'} {formatAmount(rec.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Footer of PDF page */}
              <div className="border-t pt-4 text-center text-[10px] text-stone-400 font-mono shrink-0 select-none">
                {t("pdf_footer")}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeReportSubTab === "rca_compliance" && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          
          {/* Main Compliance Scoring Banner */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest opacity-80 block">Rwanda Cooperative Agency Official Standards</span>
              <h3 className="text-xl md:text-2xl font-bold font-display mt-1">Cooperative Compliance & Governance Audit</h3>
              <p className="text-xs opacity-90 mt-1 max-w-xl">
                Real-time governance analysis based on RCA Order on Cooperative Operations, equity tracking, and bookkeeping standards.
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-xl flex items-center gap-4 shrink-0 border border-white/15">
              <span className="text-4xl font-extrabold font-display">{overallComplianceScore}%</span>
              <div className="text-xs leading-tight">
                <span className="font-bold block">Compliance Index</span>
                <span className="opacity-80 block">{overallComplianceScore >= 80 ? "Fully Compliant" : "Action Required"}</span>
              </div>
            </div>
          </div>

          {/* RCA Standard Rules Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Rule 1: Legal Reserve Fund */}
            <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 p-5 rounded-xl flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between">
                  <Badge color="green">RCA Article 44</Badge>
                  <span className="text-[10px] font-mono text-gray-400">Reserve Rule</span>
                </div>
                <h4 className="text-sm font-bold text-stone-900 dark:text-white mt-2">10% Statutory Reserve Allocation</h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  Rwanda regulations require cooperatives to transfer 10% of their net annual surplus into a statutory reserve fund to secure long-term liquidity.
                </p>
              </div>

              <div className="pt-3 border-t dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 block font-mono">ESTIMATED surPLUS</span>
                  <span className="text-xs font-bold text-emerald-600 block">{formatAmount(balance)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 block font-mono">RESERVE ALLOCATION</span>
                  <span className="text-xs font-bold text-stone-900 dark:text-white block">{formatAmount(legalReserveFund)}</span>
                </div>
              </div>
            </div>

            {/* Rule 2: Minimum Share Capital standing */}
            <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 p-5 rounded-xl flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between">
                  <Badge color="blue">RCA Article 19</Badge>
                  <span className="text-[10px] font-mono text-gray-400">Equity Rule</span>
                </div>
                <h4 className="text-sm font-bold text-stone-900 dark:text-white mt-2">Share Capital Compliance (Imigabane)</h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  Every active member must buy at least one standard co-op share. This guarantees democratized ownership and matches member roster equity accounts.
                </p>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1 text-stone-700 dark:text-slate-350">
                  <span>Compliant Members</span>
                  <span>{shareCapitalCompliancePct}% ({compliantMembersCount}/{totalMembersCount})</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${shareCapitalCompliancePct}%` }}></div>
                </div>
              </div>
            </div>

            {/* Rule 3: Member ID Registration */}
            <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 p-5 rounded-xl flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between">
                  <Badge color="gray">Gov Standard</Badge>
                  <span className="text-[10px] font-mono text-gray-400">Roster Rule</span>
                </div>
                <h4 className="text-sm font-bold text-stone-900 dark:text-white mt-2">Government Member Registration Numbers</h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  All cooperative members must have registered IDs with the national cooperative standard database tracker for audit traceability.
                </p>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1 text-stone-700 dark:text-slate-350">
                  <span>Registered Members</span>
                  <span>{memberIdCompliancePct}% ({membersWithIdsCount}/{totalMembersCount})</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${memberIdCompliancePct}%` }}></div>
                </div>
              </div>
            </div>

            {/* Rule 4: Strategic Goal Linking (Impact) */}
            <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 p-5 rounded-xl flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between">
                  <Badge color="purple">Impact Standards</Badge>
                  <span className="text-[10px] font-mono text-gray-400">Social Rule</span>
                </div>
                <h4 className="text-sm font-bold text-stone-900 dark:text-white mt-2">Sustainable Development Impact Goals</h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  Cooperatives must align at least one strategic impact objective with localized community milestones (SDGs, agricultural outputs, financial inclusion).
                </p>
              </div>

              <div className="pt-3 border-t dark:border-slate-700/60 flex justify-between items-center text-xs">
                <span className="font-semibold text-stone-700 dark:text-slate-350">Configured Objectives:</span>
                <span className="font-bold text-stone-900 dark:text-white">{goals?.length || 0} Strategic Goals</span>
              </div>
            </div>

          </div>

          {/* Export Action block */}
          <div className="bg-stone-50 dark:bg-slate-900/40 border dark:border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-stone-850 dark:text-white uppercase tracking-wider">Export Official RCA Government Report</h4>
              <p className="text-xs text-gray-400 mt-1">
                Generates a standardized CSV document matching government compliance formatting requirements for direct portal upload.
              </p>
            </div>
            
            <Button onClick={handleExportRCACSV} icon={<Download className="h-4 w-4" />}>
              Download RCA Standard CSV
            </Button>
          </div>

        </div>
      )}

    </div>
    </PlanGatedView>
  );
};
