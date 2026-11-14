import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  ShieldAlert,
  Server,
  FileVolume2,
  CheckCircle,
  Building2,
  Trash2,
  Search,
  Eye,
  Sliders,
  Flag,
  Globe,
  DollarSign,
  Smartphone,
  CreditCard,
  MessageSquare,
  Send,
  RefreshCw,
  Clock,
  Settings,
  XCircle,
  BadgeCheck,
  Zap,
  TrendingUp,
  Activity,
  ShieldCheck,
  Lock,
  ChevronLeft,
  ChevronRight,
  Users,
  UserCheck,
  UserPlus,
  Key,
  FileCheck,
  ExternalLink,
  Check,
  X,
  History,
  Database,
  Package,
  CheckCircle2,
  HeartHandshake,
  AlertTriangle,
  Camera,
  FileText,
  Upload,
  Info,
  Sparkles,
  Phone,
  Copy,
  Plus,
  LogOut
} from "lucide-react";
import {
  SUBSCRIPTION_TIERS,
  SubscriptionTier,
  ADDON_PACKAGES,
  AddOnPackageId,
  getOrgSubscriptionLifecycle
} from "../lib/subscriptionMatrix";
import {
  usePlatformAdminData,
  usePlatformSettings,
  useUpdateOrganization,
  useResolveErrorReport,
  useApproveSubscription,
  useUpdatePlatformSettings,
  useUpdateErrorReportAdminNotes,
  usePlatformStaff,
  useCreatePlatformStaff,
  useUpdatePlatformStaffStatus,
  useDeletePlatformStaff,
  usePlatformAuditLogs,
  useReviewOrgVerification,
  useReferrals,
  usePromoters,
  useCreatePromoter,
  useUpdatePromoter,
  useDeletePromoter,
  useMembers,
  usePlatformVerificationData
} from "../hooks/useImpactoData";
import { Promoter } from "../types";
import { useAuthStore } from "../store/authStore";
import { Button, Input, Card, Badge, Table, Modal, EmptyState, Avatar, getLucideIcon } from "../components/ui";
import { useToast } from "../components/Toast";
import { notifyPlanOrPackageGranted } from "../lib/crossTabSync";
import { MockDB } from "../lib/mockData";
import { isSupabaseConfigured } from "../lib/supabase";
import { ResolvedImage } from "../components/ResolvedMedia";

const formatDuration = (startStr: string, endStr?: string) => {
  if (!endStr) return "N/A";
  const start = new Date(startStr);
  const end = new Date(endStr);
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return "Instant";
  const diffMins = Math.floor(diffMs / (60 * 1000));
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ${diffHours % 24}h`;
};

const SubscriptionTierCell: React.FC<{
  row: any;
  onUpdate: (id: string, actionOrTier: string) => Promise<void>;
  onTogglePackage?: (id: string, pkgId: AddOnPackageId) => Promise<void>;
}> = ({ row, onUpdate, onTogglePackage }) => {
  const lifecycle = getOrgSubscriptionLifecycle(row);
  const [selectedTier, setSelectedTier] = useState<string>(lifecycle.tier);

  useEffect(() => {
    setSelectedTier(lifecycle.tier);
  }, [lifecycle.tier]);

  return (
    <div className="flex flex-col gap-1.5 min-w-[210px]">
      <div className="flex items-center gap-1.5">
        <select
          value={selectedTier}
          onChange={(e) => setSelectedTier(e.target.value)}
          className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900 dark:text-slate-100 outline-none cursor-pointer shadow-xs flex-1"
        >
          <option value="growth">Growth Plan ($10 / Default Trial)</option>
          <option value="pro">Pro Plan ($25 / Unlimited)</option>
          <option value="starter">Starter Plan ($10 / 100 Members)</option>
          <option value="free">Free Forever Plan ($0 / 30 Members)</option>
        </select>
        <button
          title="Apply Tier & Restart 30d"
          onClick={() => onUpdate(row.id, selectedTier)}
          className="h-8 w-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs transition"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        <button
          onClick={() => onUpdate(row.id, "extend_30")}
          className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50"
          title="Add +30 days to current license"
        >
          +30d Extend
        </button>
        <button
          onClick={() => onUpdate(row.id, "grant_grace_3")}
          className="text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:underline px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200/50"
          title="Grant 3-day grace period"
        >
          +3d Grace
        </button>
        <button
          onClick={() => onUpdate(row.id, "add_10_members")}
          className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 hover:underline px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/50"
          title="Grant +10 Member Quota above plan limit"
        >
          +10 Member
        </button>
      </div>
    </div>
  );
};

export const SuperadminDashboard: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { data: platformData, refetch } = usePlatformAdminData();
  const { addToast } = useToast();

  const orgs = platformData?.orgs || [];
  const errors = platformData?.errors || [];
  const payments = platformData?.payments || [];

  const updateOrgMutation = useUpdateOrganization();
  const resolveErrorMutation = useResolveErrorReport();
  const approveSubMutation = useApproveSubscription();
  const updateSettingsMutation = useUpdatePlatformSettings();
  const replyNotesMutation = useUpdateErrorReportAdminNotes();

  const handleUpdateSubscriptionTier = async (orgId: string, actionOrTier: string) => {
    try {
      const matchedOrg = orgs.find((o: any) => o.id === orgId);
      const name = matchedOrg?.name || "Workspace";

      if (actionOrTier === "extend_30") {
        const currentEnds = matchedOrg?.subscription_ends_at ? new Date(matchedOrg.subscription_ends_at).getTime() : Date.now();
        const base = Math.max(Date.now(), currentEnds);
        const newEnds = new Date(base + 30 * 24 * 3600 * 1000).toISOString();
        await updateOrgMutation.mutateAsync({
          id: orgId,
          subscription_status: "active",
          subscription_ends_at: newEnds
        });
        setSuccessMsg(`Extended ${name} license by +30 days (Valid until ${new Date(newEnds).toLocaleDateString()})`);
      } else if (actionOrTier === "grant_grace_3") {
        const graceEnds = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();
        await updateOrgMutation.mutateAsync({
          id: orgId,
          subscription_status: "trial",
          subscription_tier: "growth",
          subscription_ends_at: graceEnds
        });
        setSuccessMsg(`Granted 3-day grace period to ${name}`);
      } else if (actionOrTier === "add_10_members") {
        const currentBonus = Number(matchedOrg?.bonus_member_slots || 0);
        await updateOrgMutation.mutateAsync({
          id: orgId,
          bonus_member_slots: currentBonus + 10
        });
        setSuccessMsg(`Added +10 Member Quota bonus to ${name} (${currentBonus + 10} total bonus slots)`);
      } else if (actionOrTier === "free") {
        await updateOrgMutation.mutateAsync({
          id: orgId,
          subscription_tier: "free",
          subscription_status: "active",
          subscription_ends_at: null
        });
        setSuccessMsg(`Assigned Free Forever Plan to ${name} (Max 30 members, 100 MB, safe read-only lockdown on limit)`);
      } else {
        await updateOrgMutation.mutateAsync({
          id: orgId,
          subscription_tier: actionOrTier as any,
          subscription_status: "active",
          subscription_ends_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
        });
        setSuccessMsg(`Upgraded ${name} to ${actionOrTier.toUpperCase()} Plan (+30 days active)`);
      }

      // Instant hot reload for any user viewing this workspace
      notifyPlanOrPackageGranted(orgId, {
        tier: actionOrTier === "extend_30" ? matchedOrg?.subscription_tier : actionOrTier,
        packageName: `${actionOrTier.toUpperCase()} Plan`
      });

      refetch();
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err: any) {
      console.error(err);
      addToast("Failed to update subscription tier", "error");
    }
  };

  const handleTogglePackage = async (orgId: string, pkgId: AddOnPackageId) => {
    try {
      const raw = localStorage.getItem(`impacto_org_packages_${orgId}`) || "[]";
      let pkgs: AddOnPackageId[] = [];
      try {
        pkgs = JSON.parse(raw);
      } catch (e) {
        pkgs = [];
      }

      const willActivate = !pkgs.includes(pkgId);
      if (!willActivate) {
        pkgs = pkgs.filter((p) => p !== pkgId);
        addToast(`Revoked ${ADDON_PACKAGES[pkgId]?.name || pkgId} for workspace`, "info");
      } else {
        pkgs.push(pkgId);
        addToast(`Granted ${ADDON_PACKAGES[pkgId]?.name || pkgId} (+20 members) to workspace!`, "success");
      }

      localStorage.setItem(`impacto_org_packages_${orgId}`, JSON.stringify(pkgs));

      // Instant hot reload for user's dashboard
      if (willActivate) {
        notifyPlanOrPackageGranted(orgId, {
          packageId: pkgId,
          packageName: ADDON_PACKAGES[pkgId]?.name || pkgId
        });
      } else {
        window.dispatchEvent(new CustomEvent("impacto_org_updated", { detail: { orgId } }));
      }

      refetch();
    } catch (err) {
      console.error(err);
      addToast("Failed to toggle add-on package", "error");
    }
  };

  const [activeTab, setActiveTab] = useState<"stats" | "orgs" | "payments" | "verifications" | "referrals" | "errors" | "staff" | "billing_setup" | "db_status">("stats");
  const tabsRef = useRef<HTMLDivElement>(null);

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsRef.current) {
      tabsRef.current.scrollBy({ left: direction === 'left' ? -220 : 220, behavior: 'smooth' });
    }
  };
  const [verificationFilter, setVerificationFilter] = useState<"all" | "pending_review" | "verified" | "unverified" | "rejected">("all");
  const [reviewingOrg, setReviewingOrg] = useState<any>(null);
  const [reviewRejectReason, setReviewRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [fullDocPreviewUrl, setFullDocPreviewUrl] = useState<string | null>(null);

  const reviewOrgVerificationMutation = useReviewOrgVerification();
  const { data: verificationData, refetch: refetchVerificationData } = usePlatformVerificationData(activeTab === "verifications");
  const { data: allReferrals = [] } = useReferrals();
  const { data: promoters = [] } = usePromoters();
  const createPromoterMutation = useCreatePromoter();
  const updatePromoterMutation = useUpdatePromoter();
  const deletePromoterMutation = useDeletePromoter();

  const [isCreatePromoterOpen, setIsCreatePromoterOpen] = useState(false);
  const [promoterName, setPromoterName] = useState("");
  const [promoterCode, setPromoterCode] = useState("");
  const [promoterPhone, setPromoterPhone] = useState("");
  const [promoterEmail, setPromoterEmail] = useState("");
  const [promoterNotes, setPromoterNotes] = useState("");
  const [promoterCommission, setPromoterCommission] = useState(10);
  const [copiedCodeMap, setCopiedCodeMap] = useState<Record<string, boolean>>({});
  const [promoterFilter, setPromoterFilter] = useState<"all" | "active" | "inactive">("all");
  const [promoterSearchQuery, setPromoterSearchQuery] = useState("");

  const [search, setSearch] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);
  const [rejectModalItem, setRejectModalItem] = useState<any>(null);
  const [rejectReasonPreset, setRejectReasonPreset] = useState("Reference code not found on MoMo merchant collection statement");
  const [customRejectReason, setCustomRejectReason] = useState("");
  const [momoViewTab, setMomoViewTab] = useState<"pending" | "archive">("pending");
  const [archiveSearch, setArchiveSearch] = useState("");
  const [archiveStatusFilter, setArchiveStatusFilter] = useState<"all" | "approved" | "rejected">("all");

  // Platform Staff & Auditor State
  const { data: staffList = [] } = usePlatformStaff();
  const { data: auditLogs = [] } = usePlatformAuditLogs();
  const createStaffMutation = useCreatePlatformStaff();
  const updateStaffStatusMutation = useUpdatePlatformStaffStatus();
  const deleteStaffMutation = useDeletePlatformStaff();

  const [isCreateStaffOpen, setIsCreateStaffOpen] = useState(false);
  const [staffFullName, setStaffFullName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffUsername, setStaffUsername] = useState("");
  const [staffPassword, setStaffPassword] = useState("audit2026");
  const [staffRole, setStaffRole] = useState<"auditor" | "superadmin" | "support">("auditor");
  const [staffNotes, setStaffNotes] = useState("");
  const [staffPerms, setStaffPerms] = useState({
    can_audit_payments: true,
    can_view_ledgers: true,
    can_verify_members: true
  });
  const [resetModalStaff, setResetModalStaff] = useState<any>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [staffSearchQuery, setStaffSearchQuery] = useState("");

  const prevAwaitingRef = useRef<number | null>(null);
  const prevErrorsRef = useRef<number | null>(null);
  const prevOrgsRef = useRef<number | null>(null);

  useEffect(() => {
    if (platformData) {
      const currentAwaiting = payments.filter((p) => p.status === "awaiting_approval").length;
      const currentErrors = errors.length;
      const currentOrgs = orgs.length;

      if (prevAwaitingRef.current !== null && currentAwaiting > prevAwaitingRef.current) {
        addToast(`New subscription payment proof submitted! Check the Approval Queue.`, "info");
      }
      if (prevErrorsRef.current !== null && currentErrors > prevErrorsRef.current) {
        addToast(`A new direct support / incident ticket has been reported!`, "info");
      }
      if (prevOrgsRef.current !== null && currentOrgs > prevOrgsRef.current) {
        addToast(`A new cooperative workspace / organization has registered!`, "success");
      }

      prevAwaitingRef.current = currentAwaiting;
      prevErrorsRef.current = currentErrors;
      prevOrgsRef.current = currentOrgs;
    }
  }, [platformData, payments, errors, orgs, addToast]);

  useEffect(() => {
    const handleSubPaymentCreated = () => {
      refetch();
    };
    window.addEventListener("impacto_sub_payment_created", handleSubPaymentCreated);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "impacto_last_sub_payment" || e.key === "impacto_mock_subpayments") {
        refetch();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("impacto_sub_payment_created", handleSubPaymentCreated);
      window.removeEventListener("storage", handleStorage);
    };
  }, [refetch]);

  const { data: globalPlatformSettings } = usePlatformSettings();
  const settings = globalPlatformSettings || platformData?.settings || MockDB.getPlatformSettings();

  const [usdRate, setUsdRate] = useState<number>(settings.usd_to_rwf_rate || 1400);
  const [eurRate, setEurRate] = useState<number>(settings.eur_to_rwf_rate || 1450);
  const [kesRate, setKesRate] = useState<number>(settings.kes_to_rwf_rate || 10);
  const [mtnNum, setMtnNum] = useState<string>(settings.mtn_payment_number ?? "");
  const [airtelNum, setAirtelNum] = useState<string>(settings.airtel_payment_number ?? "");
  const [momoMerchantCode, setMomoMerchantCode] = useState<string>(settings.momo_merchant_code || settings.mtn_merchant_code || "");
  const [mName, setMName] = useState<string>(settings.payment_name || "VIRELLIX INC");

  useEffect(() => {
    const s = globalPlatformSettings || platformData?.settings || MockDB.getPlatformSettings();
    if (s) {
      if (s.usd_to_rwf_rate !== undefined) setUsdRate(s.usd_to_rwf_rate);
      if (s.eur_to_rwf_rate !== undefined) setEurRate(s.eur_to_rwf_rate);
      if (s.kes_to_rwf_rate !== undefined) setKesRate(s.kes_to_rwf_rate);
      setMtnNum(s.mtn_payment_number ?? "");
      setAirtelNum(s.airtel_payment_number ?? "");
      setMomoMerchantCode(s.momo_merchant_code || s.mtn_merchant_code || "");
      if (s.payment_name) setMName(s.payment_name);
    }
  }, [globalPlatformSettings, platformData?.settings]);

  const [activeChatId, setActiveChatId] = useState<string>("");
  const [tempReply, setTempReply] = useState<string>("");

  const handleSavePlatformSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizePhone = (val: string) => {
      let cleaned = (val || "").replace(/\D/g, "");
      if (cleaned.startsWith("250") && cleaned.length === 12) {
        cleaned = "0" + cleaned.slice(3);
      }
      return cleaned;
    };
    const cleanMtn = sanitizePhone(mtnNum);
    const cleanAirtel = sanitizePhone(airtelNum);
    const cleanCode = momoMerchantCode.trim();

    // Ensure at least one payment method is configured:
    if (!cleanMtn && !cleanAirtel && !cleanCode) {
      addToast("Please configure at least one payment method: MoMo Pay code, MTN number, or Airtel number.", "error");
      return;
    }

    // Optional phone validation: only validate format if a number was actually entered
    if (cleanMtn && !/^07\d{8}$/.test(cleanMtn)) {
      addToast("MTN collection number must be 10 digits starting with 07 (or leave blank if using merchant code only)", "error");
      return;
    }
    if (cleanAirtel && !/^07\d{8}$/.test(cleanAirtel)) {
      addToast("Airtel collection number must be 10 digits starting with 07 (or leave blank if using merchant code only)", "error");
      return;
    }

    try {
      await updateSettingsMutation.mutateAsync({
        usd_to_rwf_rate: usdRate || 1400,
        eur_to_rwf_rate: eurRate || 1450,
        kes_to_rwf_rate: kesRate || 10,
        mtn_payment_number: cleanMtn,
        airtel_payment_number: cleanAirtel,
        momo_merchant_code: cleanCode,
        mtn_merchant_code: cleanCode,
        payment_name: mName.trim() || "VIRELLIX INC"
      });
      setSuccessMsg("Platform operator billing parameters saved and applied system-wide!");
      addToast("Global billing configuration updated successfully across all organizations!", "success");
      refetch();
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      console.error(err);
      addToast("Failed to save billing parameters. Check connection.", "error");
    }
  };

  const handleApproveSub = async (payId: string, companyId: string, planText?: string, pkgId?: string) => {
    try {
      const lower = (planText || "").toLowerCase();
      const isPackage = !!pkgId || lower.includes("package") || lower.includes("pack");
      let deducedTier: "free" | "growth" | "pro" | "enterprise" = "growth";
      if (lower.includes("enterprise")) deducedTier = "enterprise";
      else if (lower.includes("pro") || lower.includes("vip")) deducedTier = "pro";
      else if (lower.includes("starter")) deducedTier = "growth";
      else if (lower.includes("free")) deducedTier = "free";

      await approveSubMutation.mutateAsync({
        paymentId: payId,
        orgId: companyId,
        status: "approved",
        tier: deducedTier,
        plan: planText,
        packageId: pkgId,
        auditedBy: user?.id || "superadmin-root",
        auditedByName: user?.full_name || user?.email || "Platform Superadmin",
        auditNotes: isPackage ? "Add-on package verified against telecom merchant logs." : "SaaS subscription manual transfer verified against telecom collection records."
      });
      if (isPackage) {
        setSuccessMsg("Add-on feature package payment successfully verified and archived! Payer notified.");
      } else {
        setSuccessMsg("SaaS manual transaction successfully approved and archived! Organization license extended by +30 days and payer notified.");
      }
      refetch();
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmRejectSub = async (payId: string, companyId: string, reasonText: string) => {
    try {
      await approveSubMutation.mutateAsync({
        paymentId: payId,
        orgId: companyId,
        status: "rejected",
        auditedBy: user?.id || "superadmin-root",
        auditedByName: user?.full_name || user?.email || "Platform Superadmin",
        auditNotes: reasonText || "Payment verification rejected due to unverified statement."
      });
      setSuccessMsg("Manual payment proof marked as Rejected, archived in history, and payer notified.");
      setRejectModalItem(null);
      setCustomRejectReason("");
      refetch();
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendChatReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempReply.trim() || !activeChatId) return;

    try {
      await replyNotesMutation.mutateAsync({
        id: activeChatId,
        adminNotes: tempReply
      });
      setTempReply("");
      refetch();
      setSuccessMsg("Support response dispatched successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffFullName.trim() || !staffEmail.trim() || !staffPassword.trim()) {
      addToast("Please fill in full name, email/username, and password.", "error");
      return;
    }

    try {
      await createStaffMutation.mutateAsync({
        full_name: staffFullName.trim(),
        email: staffEmail.trim(),
        username: staffUsername.trim() || staffEmail.split("@")[0],
        password_plain: staffPassword.trim(),
        role: staffRole,
        notes: staffNotes.trim(),
        permissions: staffPerms
      });
      setSuccessMsg(`New platform operator ${staffFullName} (${staffRole.toUpperCase()}) created successfully!`);
      setIsCreateStaffOpen(false);
      setStaffFullName("");
      setStaffEmail("");
      setStaffUsername("");
      setStaffPassword("audit2026");
      setStaffNotes("");
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      console.error(err);
      addToast("Failed to create platform staff account", "error");
    }
  };

  const handleToggleStaffStatus = async (staffId: string, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === "active" ? "suspended" : "active";
      await updateStaffStatusMutation.mutateAsync({
        id: staffId,
        status: nextStatus
      });
      addToast(`Staff account status updated to ${nextStatus.toUpperCase()}`, "info");
    } catch (err) {
      console.error(err);
      addToast("Failed to update staff status", "error");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalStaff || !newPasswordInput.trim()) return;

    try {
      await updateStaffStatusMutation.mutateAsync({
        id: resetModalStaff.id,
        password_plain: newPasswordInput.trim()
      });
      addToast(`Password updated successfully for ${resetModalStaff.full_name}`, "success");
      setResetModalStaff(null);
      setNewPasswordInput("");
    } catch (err) {
      console.error(err);
      addToast("Failed to reset password", "error");
    }
  };

  const handleDeleteStaff = async (staffId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove staff member "${name}"?`)) return;
    try {
      await deleteStaffMutation.mutateAsync(staffId);
      addToast(`Staff account for ${name} removed`, "info");
    } catch (err) {
      console.error(err);
      addToast("Failed to remove staff member", "error");
    }
  };

  const handleResolveBugDirect = async (errId: string) => {
    try {
      await resolveErrorMutation.mutateAsync({ id: errId });
      refetch();
      setSuccessMsg("Support ticket resolved successfully.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  // Stats
  const totalOrgs = orgs.length;
  const trialOrgs = orgs.filter((o) => o?.subscription_status === "trial").length;
  const now = new Date();
  const activeOrgsList = orgs.filter((o) => o?.subscription_status === "active" && o?.subscription_ends_at && new Date(o.subscription_ends_at) > now);
  const activeOrgs = activeOrgsList.length;
  const expiredOrgs = orgs.filter((o) => o?.subscription_status === "expired" || (o?.subscription_ends_at && new Date(o.subscription_ends_at) < now)).length;
  const pendingBugs = errors.filter((e) => e.status !== "resolved").length;
  const awaitingPayments = payments.filter((p) => p.status === "awaiting_approval").length;
  const totalUsers = (platformData as any)?.totalUsers || orgs.length;
  const totalMembers = (platformData as any)?.totalMembers || orgs.length;

  const totalPaidRevenue = payments
    .filter((p: any) => p.status === "approved")
    .reduce((sum: number, p: any) => sum + (Number(p.amount_local) || 0), 0);

  const monthlyRevenues = React.useMemo(() => {
    const monthly: Record<string, number> = {};
    payments
      .filter((p: any) => p.status === "approved")
      .forEach((p: any) => {
        const dateStr = p.submitted_at || p.created_at;
        if (dateStr) {
          const d = new Date(dateStr);
          const monthYear = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
          monthly[monthYear] = (monthly[monthYear] || 0) + (Number(p.amount_local) || 0);
        }
      });

    return Object.entries(monthly)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
  }, [payments]);

  const orgColumns = [
    {
      header: "Organization Workspace",
      accessor: "name",
      cell: (row: any) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-slate-800 border border-emerald-200/50 dark:border-slate-700 flex items-center justify-center text-emerald-600 font-bold shrink-0">
            {row.name ? row.name.substring(0, 2).toUpperCase() : "CO"}
          </div>
          <div className="flex flex-col text-xs leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-950 dark:text-white text-sm">{row.name}</span>
              {row.verification_status === "verified" && (
                <span title="Verified Authentic Organization" className="inline-flex items-center text-emerald-500">
                  <CheckCircle2 className="h-3.5 w-3.5 fill-emerald-100 dark:fill-emerald-950 text-emerald-600 dark:text-emerald-400" />
                </span>
              )}
            </div>
            <span className="text-[10px] font-mono text-emerald-600 mt-0.5 uppercase tracking-wide font-semibold">@{row.slug}</span>
          </div>
        </div>
      )
    },
    {
      header: "Category",
      accessor: "org_category",
      cell: (row: any) => <span className="text-xs text-slate-600 dark:text-slate-300 font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">{row.org_category || "General"}</span>
    },
    {
      header: "Authenticity",
      accessor: "verification_status",
      cell: (row: any) => {
        const isVer = row.verification_status === "verified";
        const isPending = row.verification_status === "pending_review";
        return (
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 font-mono ${
              isVer
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300"
                : isPending
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300"
                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300"
            }`}>
              {isVer ? <CheckCircle2 className="h-3 w-3" /> : isPending ? <Clock className="h-3 w-3" /> : null}
              {isVer ? "VERIFIED" : isPending ? "IN REVIEW" : "UNVERIFIED"}
            </span>
            <button
              type="button"
              onClick={() => {
                setReviewingOrg(row);
                setShowRejectForm(false);
                setReviewRejectReason("");
              }}
              className="text-[11px] text-emerald-600 font-bold hover:underline"
            >
              Review
            </button>
          </div>
        );
      }
    },
    {
      header: "Lifecycle & Quotas",
      accessor: "subscription_status",
      cell: (row: any) => {
        const lifecycle = getOrgSubscriptionLifecycle(row);
        return (
          <div className="flex flex-col gap-1">
            {/* Mention purchased packages right ABOVE or adjacent to current plan badge - WITHOUT adding extra rows! */}
            {lifecycle.activePackages.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap mb-0.5">
                {lifecycle.activePackages.map((pkgId) => {
                  const pkgDef = ADDON_PACKAGES[pkgId];
                  return (
                    <span
                      key={pkgId}
                      className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-1"
                    >
                      <Zap className="h-2.5 w-2.5 text-amber-500" />
                      {pkgDef?.name || pkgId} (+20)
                    </span>
                  );
                })}
              </div>
            )}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge
                color={
                  lifecycle.isLocked
                    ? "red"
                    : lifecycle.isGracePeriod
                    ? "amber"
                    : lifecycle.isTrial
                    ? "blue"
                    : "green"
                }
              >
                {lifecycle.statusLabel.toUpperCase()}
              </Badge>
              {lifecycle.isReadOnlySafeMode && (
                <Badge color="red">SAFE READ-ONLY</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              <span>Limit: {lifecycle.memberLimit === Infinity ? "Unlimited" : `${lifecycle.memberLimit} Members`}</span>
              <span>•</span>
              <span>Storage: {lifecycle.storageLimit}</span>
            </div>
            {lifecycle.subscriptionEndsAt && (
              <span className="text-[9.5px] text-slate-400 font-mono">
                Ends: {new Date(lifecycle.subscriptionEndsAt).toLocaleDateString()}
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: "Days Remaining",
      accessor: "subscription_ends_at",
      cell: (row: any) => {
        const lifecycle = getOrgSubscriptionLifecycle(row);
        const days = lifecycle.daysRemaining;

        return (
          <div className="flex items-center gap-2 font-sans font-extrabold text-xs">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                lifecycle.isLocked
                  ? "bg-rose-500"
                  : lifecycle.isGracePeriod
                  ? "bg-amber-500 animate-pulse"
                  : days <= 5
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
            />
            <span>
              {lifecycle.isLocked ? (
                <span className="text-rose-600 font-black">Locked (Expired)</span>
              ) : lifecycle.isGracePeriod ? (
                <span className="text-amber-600 font-black">{days}d Grace</span>
              ) : lifecycle.tier === "free" ? (
                <span className="text-slate-700 dark:text-slate-300 font-bold">Free Forever</span>
              ) : (
                <span className="text-slate-900 dark:text-slate-100 font-bold">{days} Days</span>
              )}
            </span>
          </div>
        );
      }
    },
    {
      header: "Subscription Tier",
      accessor: "subscription_tier",
      cell: (row: any) => (
        <SubscriptionTierCell 
          row={row} 
          onUpdate={handleUpdateSubscriptionTier} 
          onTogglePackage={handleTogglePackage}
        />
      )
    },
    {
      header: "Operator Actions",
      accessor: "actions",
      cell: (row: any) => (
        <div className="flex items-center gap-2 shrink-0">
          <Link to={`/@${row.slug}`} target="_blank">
            <Button size="sm" variant="outline" className="h-9 px-3 text-xs font-bold rounded-xl" icon={<Eye className="h-3.5 w-3.5" />}>
              Portal
            </Button>
          </Link>
          {row.subscription_status !== "active" && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold h-9 px-3 rounded-xl text-white shadow-xs" onClick={async () => {
              await updateOrgMutation.mutateAsync({ id: row.id, subscription_status: "active", subscription_ends_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString() });
              setSuccessMsg(`Activated workspace: ${row.name}`);
              refetch();
              setTimeout(() => setSuccessMsg(""), 3000);
            }}>
              Activate
            </Button>
          )}
          {row.subscription_status !== "expired" && (
            <Button size="sm" variant="outline" className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900 font-bold h-9 px-3 text-xs rounded-xl" onClick={async () => {
              await updateOrgMutation.mutateAsync({ id: row.id, subscription_status: "expired" });
              setSuccessMsg(`Lockout enforced for workspace: ${row.name}`);
              refetch();
              setTimeout(() => setSuccessMsg(""), 3000);
            }}>
              Lockout
            </Button>
          )}
        </div>
      )
    }
  ];

  const filteredOrgs = orgs.filter((o) => {
    const query = search.toLowerCase();
    return (o?.name || "").toLowerCase().includes(query) || (o?.slug || "").toLowerCase().includes(query);
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans flex flex-col justify-between">
      {/* Top Header Bar matching user dashboards */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 lg:px-10 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-black text-lg text-slate-900 dark:text-white tracking-tight">
                IMPACT<span className="text-emerald-600">O</span> Super Admin
              </h1>
              <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold">
                PLATFORM COMMAND
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Multi-tenant cooperative governance & global billing control center
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-900 dark:text-white">Lead System Operator</span>
            <span className="text-[10px] text-emerald-600 font-mono font-semibold">superadmin@impacto.rw</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-slate-900 dark:bg-slate-800 text-emerald-400 font-black flex items-center justify-center text-xs shadow-sm">
            SA
          </div>
          <Link to="/auditor">
            <Button size="sm" variant="outline" className="font-bold text-xs h-10 px-3.5 rounded-xl border-indigo-200 text-indigo-700 dark:text-indigo-400 dark:border-indigo-900 hover:bg-indigo-50 flex items-center gap-1.5">
              <FileCheck className="h-3.5 w-3.5" /> Auditor Console
            </Button>
          </Link>
          <Link to="/">
            <Button size="sm" variant="outline" className="font-bold text-xs h-10 px-4 rounded-xl">
              Exit to App
            </Button>
          </Link>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              logout();
              window.location.href = "/login";
            }}
            className="font-bold text-xs h-10 px-3.5 rounded-xl border-rose-200 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8 flex-1 w-full flex flex-col gap-8">
        {/* Navigation Tabs Header with Scroll Buttons */}
        <div className="flex items-center gap-1.5 w-full">
          <button
            type="button"
            onClick={() => scrollTabs('left')}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 shrink-0 cursor-pointer shadow-3xs flex items-center justify-center"
            title="Scroll Left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div ref={tabsRef} className="p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-1 shadow-3xs overflow-x-auto no-scrollbar scroll-smooth select-none shrink-0 flex-1 max-w-full">
            <button
              onClick={() => setActiveTab("stats")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === "stats"
                  ? "bg-white dark:bg-slate-900 text-[#156c45] dark:text-emerald-400 shadow-3xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
              }`}
            >
              <Activity className="h-3.5 w-3.5" /> SaaS Overview & Analytics
            </button>
            <button
              onClick={() => setActiveTab("orgs")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === "orgs"
                  ? "bg-white dark:bg-slate-900 text-[#156c45] dark:text-emerald-400 shadow-3xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" /> Tenant Audits & Licenses ({totalOrgs})
            </button>
            <button
              onClick={() => setActiveTab("payments")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === "payments"
                  ? "bg-white dark:bg-slate-900 text-[#156c45] dark:text-emerald-400 shadow-3xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
              }`}
            >
              <CreditCard className="h-3.5 w-3.5" /> MoMo Approval Queue
              {awaitingPayments > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] bg-rose-500 text-white rounded-full font-mono font-black">
                  {awaitingPayments}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("verifications")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === "verifications"
                  ? "bg-white dark:bg-slate-900 text-[#156c45] dark:text-emerald-400 shadow-3xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Authenticity & Verifications
              {orgs.filter((o: any) => o.verification_status === "pending_review").length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] bg-amber-500 text-slate-950 rounded-full font-mono font-black">
                  {orgs.filter((o: any) => o.verification_status === "pending_review").length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("referrals")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === "referrals"
                  ? "bg-white dark:bg-slate-900 text-[#156c45] dark:text-emerald-400 shadow-3xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
              }`}
            >
              <HeartHandshake className="h-3.5 w-3.5 text-teal-600" /> Promoters & Referrals ({allReferrals.length})
            </button>
            <button
              onClick={() => setActiveTab("staff")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === "staff"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-3xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
              }`}
            >
              <Users className="h-3.5 w-3.5" /> Staff & Auditors ({staffList.length})
            </button>
            <button
              onClick={() => setActiveTab("errors")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === "errors"
                  ? "bg-white dark:bg-slate-900 text-[#156c45] dark:text-emerald-400 shadow-3xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" /> Support & Incidents
              {pendingBugs > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] bg-amber-500 text-slate-950 rounded-full font-mono font-black">
                  {pendingBugs}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("billing_setup")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === "billing_setup"
                  ? "bg-white dark:bg-slate-900 text-[#156c45] dark:text-emerald-400 shadow-3xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
              }`}
            >
              <Settings className="h-3.5 w-3.5" /> Global Billing Config
            </button>
            <button
              onClick={() => setActiveTab("db_status")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === "db_status"
                  ? "bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-3xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
              }`}
            >
              <Database className="h-3.5 w-3.5" /> Database Health
            </button>
          </div>

          <button
            type="button"
            onClick={() => scrollTabs('right')}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 shrink-0 cursor-pointer shadow-3xs flex items-center justify-center"
            title="Scroll Right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {successMsg && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 font-bold rounded-2xl flex items-center gap-3 shadow-xs">
            <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. STATS TAB */}
        {activeTab === "stats" && (
          <div className="flex flex-col gap-6 w-full">
            {awaitingPayments > 0 && (
              <div className="p-4 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 border-2 border-amber-500/50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs animate-in slide-in-from-top-2">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0 shadow-xs">
                    <Smartphone className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                        {awaitingPayments === 1 ? "1 Payment Proof Awaiting Verification" : `${awaitingPayments} Payment Proofs Awaiting Verification`}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-black bg-amber-500 text-slate-950 rounded-full font-mono uppercase">
                        Action Required
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      New mobile money subscription or add-on package payment proof submitted by workspace administrators. Approve or audit to unlock licenses.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => setActiveTab("payments")}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-xl shrink-0 shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Review Approvals Queue ({awaitingPayments}) →</span>
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <div 
                onClick={() => setActiveTab("payments")}
                className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-xs cursor-pointer hover:border-amber-400 transition"
              >
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">MoMo Queue</span>
                  <span className="text-2xl font-black font-display text-amber-500 mt-1 block">{awaitingPayments}</span>
                  <span className="text-[10px] text-slate-500 mt-1 font-medium block">Awaiting review</span>
                </div>
                <div className="h-11 w-11 bg-amber-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-amber-500 shadow-xs">
                  <Smartphone className="h-5 w-5" />
                </div>
              </div>
              <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">System Users</span>
                  <span className="text-2xl font-black font-display text-indigo-600 dark:text-indigo-400 mt-1 block">{totalUsers}</span>
                  <span className="text-[10px] text-slate-500 mt-1 font-medium block">Registered accounts</span>
                </div>
                <div className="h-11 w-11 bg-indigo-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-indigo-600 shadow-xs">
                  <Globe className="h-5 w-5" />
                </div>
              </div>

              <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Org Members</span>
                  <span className="text-2xl font-black font-display text-teal-600 dark:text-teal-400 mt-1 block">{totalMembers}</span>
                  <span className="text-[10px] text-slate-500 mt-1 font-medium block">Active memberships</span>
                </div>
                <div className="h-11 w-11 bg-teal-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-teal-600 shadow-xs">
                  <CheckCircle className="h-5 w-5" />
                </div>
              </div>

              <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Trial Sandboxes</span>
                  <span className="text-2xl font-black font-display text-amber-500 mt-1 block">{trialOrgs}</span>
                  <span className="text-[10px] text-slate-500 mt-1 font-medium block">30-day active trials</span>
                </div>
                <div className="h-11 w-11 bg-amber-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-amber-500 shadow-xs">
                  <Clock className="h-5 w-5" />
                </div>
              </div>

              <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Expired Accounts</span>
                  <span className="text-2xl font-black font-display text-rose-600 mt-1 block">{expiredOrgs}</span>
                  <span className="text-[10px] text-slate-500 mt-1 font-medium block">Lockout policy active</span>
                </div>
                <div className="h-11 w-11 bg-rose-50 dark:bg-slate-850 rounded-xl flex items-center justify-center text-rose-500 shadow-xs">
                  <XCircle className="h-5 w-5" />
                </div>
              </div>

              <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Support Tickets</span>
                  <span className="text-2xl font-black font-display text-slate-900 dark:text-white mt-1 block">{pendingBugs}</span>
                  <span className="text-[10px] text-slate-500 mt-1 font-medium block">Direct incident queue</span>
                </div>
                <div className="h-11 w-11 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-xs">
                  <ShieldAlert className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 lg:col-span-2 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-black font-display text-slate-900 dark:text-white">Revenue Distribution & Licensing Overview</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Real-time breakdown of multi-tenant subscriptions and earned revenue.</p>
                    </div>
                    <Badge color="green" className="font-mono">LIVE METRICS</Badge>
                  </div>

                  <div className="flex flex-col gap-2 mt-4">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Licensing Share Breakdown</span>
                    <div className="h-8 w-full rounded-xl overflow-hidden flex shadow-inner border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
                      {activeOrgs > 0 && (
                        <div 
                          className="bg-emerald-500 h-full text-white text-[10px] font-black flex items-center justify-center px-2" 
                          style={{ width: `${Math.max(20, (activeOrgs / Math.max(1, totalOrgs)) * 100)}%` }}
                        >
                          PRO ({activeOrgs})
                        </div>
                      )}
                      {trialOrgs > 0 && (
                        <div 
                          className="bg-amber-400 h-full text-slate-950 text-[10px] font-black flex items-center justify-center px-2" 
                          style={{ width: `${Math.max(20, (trialOrgs / Math.max(1, totalOrgs)) * 100)}%` }}
                        >
                          TRIAL ({trialOrgs})
                        </div>
                      )}
                      {expiredOrgs > 0 && (
                        <div 
                          className="bg-rose-500 h-full text-white text-[10px] font-black flex items-center justify-center px-2" 
                          style={{ width: `${Math.max(20, (expiredOrgs / Math.max(1, totalOrgs)) * 100)}%` }}
                        >
                          EXPIRED ({expiredOrgs})
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-800 flex flex-col justify-center">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wide block font-bold">Total Verified Revenue</span>
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2 block font-display">
                      {totalPaidRevenue.toLocaleString()} RWF
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 font-medium">Audited & approved via MoMo queue</span>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-800 flex flex-col h-44">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wide block mb-2 font-bold">Monthly Revenue Trend</span>
                    <div className="flex-1 w-full min-h-0">
                      {monthlyRevenues.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={monthlyRevenues}>
                            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
                            <YAxis hide />
                            <Tooltip 
                              cursor={{ fill: 'rgba(0,0,0,0.05)' }} 
                              contentStyle={{ fontSize: '12px', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                              formatter={(value: number) => [`${value.toLocaleString()} RWF`, 'Revenue']}
                            />
                            <Bar dataKey="amount" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={36} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-xs text-slate-400 font-medium">
                          No revenue records verified yet
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-black font-display text-slate-900 dark:text-white mb-1">Infrastructure Node Status</h3>
                  <p className="text-xs text-slate-500 mb-5">System SLA and core backend container health.</p>

                  <div className="flex flex-col gap-3.5 font-semibold">
                    <div className="flex items-center justify-between pb-3 border-b text-xs text-slate-600 dark:text-slate-300 border-slate-100 dark:border-slate-800">
                      <span className="flex items-center gap-2.5"><Server className="h-4 w-4 text-emerald-500" /> Supabase RLS DB</span>
                      <Badge color="green">ONLINE</Badge>
                    </div>
                    <div className="flex items-center justify-between pb-3 border-b text-xs text-slate-600 dark:text-slate-300 border-slate-100 dark:border-slate-800">
                      <span className="flex items-center gap-2.5"><Globe className="h-4 w-4 text-emerald-500" /> AWS Kigali Ingress</span>
                      <span className="font-mono text-[10px] text-slate-900 dark:text-white font-bold">0.0.0.0:3000</span>
                    </div>
                    <div className="flex items-center justify-between pb-3 border-b text-xs text-slate-600 dark:text-slate-300 border-slate-100 dark:border-slate-800">
                      <span className="flex items-center gap-2.5"><Smartphone className="h-4 w-4 text-emerald-500" /> MoMo Listeners</span>
                      <Badge color="green">ACTIVE</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-2.5"><BadgeCheck className="h-4 w-4 text-emerald-500" /> SLA Uptime Grade</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-black font-mono">99.99%</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/50 dark:border-emerald-900/50 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Zap className="h-5 w-5 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">System is fully optimized</span>
                  </div>
                  <Button size="sm" className="bg-emerald-600 text-white font-bold h-8 text-[11px] px-3" onClick={() => refetch()}>
                    Refresh
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. TENANTS TAB */}
        {activeTab === "orgs" && (() => {
          const tierCounts = {
            free: 0,
            starter: 0,
            growth: 0,
            pro: 0,
            grace: 0,
            safeMode: 0,
            locked: 0,
          };

          orgs.forEach((o: any) => {
            const lc = getOrgSubscriptionLifecycle(o);
            if (lc.tier === "free") tierCounts.free++;
            else if (lc.tier === "starter") tierCounts.starter++;
            else if (lc.tier === "growth") tierCounts.growth++;
            else if (lc.tier === "pro") tierCounts.pro++;

            if (lc.isGracePeriod) tierCounts.grace++;
            if (lc.isReadOnlySafeMode) tierCounts.safeMode++;
            if (lc.isLocked) tierCounts.locked++;
          });

          return (
            <div className="flex flex-col gap-6 w-full">
              {/* Matrix Tier & Lifecycle Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 flex flex-col">
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-500">Free Forever</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xl font-black text-slate-900 dark:text-white font-display">{tierCounts.free}</span>
                    <span className="text-[10px] text-slate-400">Max 30 m.</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-blue-200/60 dark:border-blue-900/40 rounded-2xl p-3.5 flex flex-col">
                  <span className="text-[10px] uppercase font-mono font-bold text-blue-600">Starter Plan</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xl font-black text-blue-600 font-display">{tierCounts.starter}</span>
                    <span className="text-[10px] text-blue-700/60">Max 100 m.</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-emerald-200/60 dark:border-emerald-900/40 rounded-2xl p-3.5 flex flex-col">
                  <span className="text-[10px] uppercase font-mono font-bold text-emerald-600">Growth Plan</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xl font-black text-emerald-600 font-display">{tierCounts.growth}</span>
                    <span className="text-[10px] text-emerald-700/60">Max 500 m.</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-indigo-200/60 dark:border-indigo-900/40 rounded-2xl p-3.5 flex flex-col">
                  <span className="text-[10px] uppercase font-mono font-bold text-indigo-600">Pro Plan</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xl font-black text-indigo-600 font-display">{tierCounts.pro}</span>
                    <span className="text-[10px] text-indigo-700/60">$40 / Unltd</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-amber-300/80 dark:border-amber-700 rounded-2xl p-3.5 flex flex-col">
                  <span className="text-[10px] uppercase font-mono font-bold text-amber-700 dark:text-amber-400">3-Day Grace</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xl font-black text-amber-700 dark:text-amber-400 font-display">{tierCounts.grace}</span>
                    <span className="text-[10px] text-amber-600 animate-pulse">Active</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-rose-200/80 dark:border-rose-900/40 rounded-2xl p-3.5 flex flex-col">
                  <span className="text-[10px] uppercase font-mono font-bold text-rose-600">Safe Read-Only</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xl font-black text-rose-600 font-display">{tierCounts.safeMode}</span>
                    <span className="text-[10px] text-rose-500">Over Quota</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 flex flex-col">
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-500">Locked Out</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xl font-black text-slate-700 dark:text-slate-300 font-display">{tierCounts.locked}</span>
                    <span className="text-[10px] text-slate-400">Expired</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col gap-6 w-full">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-black font-display text-slate-900 dark:text-white">Tenant Workspaces & Subscription Matrix</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Manage Free (30 m.), Starter (100 m.), Growth ($10 / 500 m.), and Pro ($25 / Unlimited) tiers, grant 3-day grace periods, or extend 30-day licenses.</p>
                  </div>
                  <div className="w-full md:w-80">
                    <Input
                      type="text"
                      placeholder="Filter workspaces by name, slug..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      prefixIcon={<Search className="h-4 w-4 text-slate-400" />}
                    />
                  </div>
                </div>
                <Table columns={orgColumns} data={filteredOrgs} emptyMessage="No multi-tenant workspaces match queried criteria." />
              </div>
            </div>
          );
        })()}

        {/* 3. PAYMENTS APPROVAL QUEUE TAB */}
        {activeTab === "payments" && (() => {
          const pendingPayments = (payments || []).filter((p) => p.status === "awaiting_approval");
          const reviewedPayments = (payments || []).filter((p) => p.status === "approved" || p.status === "rejected");
          
          const filteredArchive = reviewedPayments.filter((p) => {
            const matchedOrg = orgs.find((o) => o.id === p.org_id);
            const orgName = (matchedOrg?.name || "").toLowerCase();
            const planStr = (p.plan || p.plan_details || "").toLowerCase();
            const phoneStr = (p.phone || p.phone_number || "").toLowerCase();
            const refStr = (p.reference || p.transaction_reference || "").toLowerCase();
            const auditorStr = (p.audited_by_name || "").toLowerCase();
            const q = archiveSearch.toLowerCase();

            const matchesQuery = !q || orgName.includes(q) || planStr.includes(q) || phoneStr.includes(q) || refStr.includes(q) || auditorStr.includes(q);
            const matchesStatus = archiveStatusFilter === "all" || p.status === archiveStatusFilter;
            return matchesQuery && matchesStatus;
          });

          const approvedCount = reviewedPayments.filter((p) => p.status === "approved").length;
          const rejectedCount = reviewedPayments.filter((p) => p.status === "rejected").length;

          return (
            <div className="flex flex-col gap-6 w-full">
              {/* Header & Sub-Navigation */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-base font-black font-display text-slate-900 dark:text-white">MoMo Transaction Records Approval Board</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Audit real mobile money proofs for subscription tiers and add-on packages against telecom statements.</p>
                </div>
                
                {/* View Switcher Pills */}
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setMomoViewTab("pending")}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                      momoViewTab === "pending"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Smartphone className="h-3.5 w-3.5 text-amber-500" />
                    Pending Approvals
                    {pendingPayments.length > 0 && (
                      <span className="ml-1 bg-amber-500 text-slate-950 font-black text-[10px] px-1.5 py-0.2 rounded-full">
                        {pendingPayments.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMomoViewTab("archive")}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                      momoViewTab === "archive"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <History className="h-3.5 w-3.5 text-emerald-500" />
                    Validation Archive
                    <span className="ml-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                      {reviewedPayments.length}
                    </span>
                  </button>
                </div>
              </div>

              {/* TAB 1: PENDING APPROVALS QUEUE */}
              {momoViewTab === "pending" && (
                <div className="flex flex-col gap-4 w-full">
                  {pendingPayments.length > 0 ? (
                    pendingPayments.map((p: any) => {
                      const matchedOrg = orgs.find((o: any) => o.id === p.org_id);
                      const planStr = (p.plan || p.plan_details || "").toLowerCase();
                      const isPackage = !!p.package_id || p.item_type === "package" || planStr.includes("package") || planStr.includes("pack");
                      const senderPhone = p.phone || p.phone_number || "N/A";
                      const txnRef = p.reference || p.transaction_reference || "N/A";
                      const itemTitle = p.plan || p.plan_details || (isPackage ? "Add-On Feature Package" : "Growth Plan - $25/mo");
                      const isMtn = p.method === "mtn" || senderPhone.startsWith("078") || senderPhone.startsWith("079");

                      return (
                        <div key={p.id} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 transition hover:border-emerald-300 dark:hover:border-slate-700">
                          <div className="flex items-start gap-4 w-full">
                            <div className={`h-12 w-12 rounded-2xl border flex items-center justify-center font-bold shrink-0 ${
                              isPackage 
                                ? "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-600" 
                                : "bg-emerald-50 dark:bg-slate-800 border-emerald-200/50 dark:border-slate-700 text-emerald-600"
                            }`}>
                              {isPackage ? <Package className="h-6 w-6" /> : <Smartphone className="h-6 w-6" />}
                            </div>
                            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-black text-slate-900 dark:text-white truncate">
                                  {matchedOrg?.name || "Cooperative Workspace"}
                                </span>
                                <span className="text-[10px] font-mono bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-md font-bold">
                                  AWAITING APPROVAL
                                </span>
                                {isPackage ? (
                                  <span className="text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <Package className="h-3 w-3" /> ADD-ON PACKAGE
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" /> TENANT SUBSCRIPTION
                                  </span>
                                )}
                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                                  isMtn 
                                    ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300" 
                                    : "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300"
                                }`}>
                                  {isMtn ? "MTN MoMo" : "Airtel Money"}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-3">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                  {itemTitle}
                                </span>
                                <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                                  {(p.amount_local || (p.amount_usd ? p.amount_usd * 1350 : 33750)).toLocaleString()} RWF {p.amount_usd ? `($${p.amount_usd})` : ""}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-0.5 font-medium">
                                <span>Sender MoMo: <strong className="text-slate-800 dark:text-slate-200 font-mono">{senderPhone}</strong></span>
                                <span>TXN Ref: <strong className="font-mono text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{txnRef}</strong></span>
                                {p.submitted_at && (
                                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> {new Date(p.submitted_at).toLocaleString()}
                                  </span>
                                )}
                              </div>

                              {p.proof_url && (
                                <div className="mt-2 p-2.5 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200/70 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
                                  <span className="font-bold text-slate-400 block mb-0.5">Verification Proof / MoMo SMS Log:</span>
                                  <p className="font-mono break-all line-clamp-3">{p.proof_url}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0 w-full lg:w-auto justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold h-10 px-4 rounded-xl"
                              onClick={() => {
                                setRejectModalItem(p);
                                setRejectReasonPreset("Reference code not found on MoMo merchant collection statement");
                                setCustomRejectReason("");
                              }}
                            >
                              Reject Proof
                            </Button>
                            {isPackage ? (
                              <Button
                                size="sm"
                                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold h-10 px-5 rounded-xl shadow-xs flex items-center gap-1.5"
                                onClick={() => handleApproveSub(p.id, p.org_id, p.plan || p.plan_details, p.package_id)}
                              >
                                <Package className="h-4 w-4" />
                                Approve & Activate Package
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-10 px-5 rounded-xl shadow-xs flex items-center gap-1.5"
                                onClick={() => handleApproveSub(p.id, p.org_id, p.plan || p.plan_details)}
                              >
                                <CheckCircle className="h-4 w-4" />
                                Approve & Extend 30d
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
                      <div className="h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-slate-800 flex items-center justify-center text-emerald-600">
                        <CheckCircle className="h-7 w-7" />
                      </div>
                      <h4 className="text-base font-black font-display text-slate-900 dark:text-white">All Clear in Approval Queue</h4>
                      <p className="text-xs text-slate-500 max-w-sm">No pending mobile money subscription or package proof submissions require verification right now.</p>
                      {reviewedPayments.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMomoViewTab("archive")}
                          className="mt-2 text-xs font-bold"
                        >
                          View Validation Archive ({reviewedPayments.length})
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: VALIDATION ARCHIVE & HISTORICAL AUDIT */}
              {momoViewTab === "archive" && (
                <div className="flex flex-col gap-5 w-full">
                  {/* Filter & Search Bar */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="w-full md:w-80">
                      <Input
                        type="text"
                        placeholder="Search archive by org, phone, reference, auditor..."
                        value={archiveSearch}
                        onChange={(e) => setArchiveSearch(e.target.value)}
                        prefixIcon={<Search className="h-4 w-4 text-slate-400" />}
                      />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => setArchiveStatusFilter("all")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                          archiveStatusFilter === "all"
                            ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                        }`}
                      >
                        All ({reviewedPayments.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setArchiveStatusFilter("approved")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                          archiveStatusFilter === "approved"
                            ? "bg-emerald-600 text-white"
                            : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100"
                        }`}
                      >
                        ✓ Approved ({approvedCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setArchiveStatusFilter("rejected")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                          archiveStatusFilter === "rejected"
                            ? "bg-rose-600 text-white"
                            : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100"
                        }`}
                      >
                        ✕ Rejected ({rejectedCount})
                      </button>
                    </div>
                  </div>

                  {/* Archive Records Table */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                    {filteredArchive.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-mono text-[10px] uppercase border-b border-slate-200/80 dark:border-slate-800">
                            <tr>
                              <th className="px-5 py-3.5">Organization / Workspace</th>
                              <th className="px-4 py-3.5">Category / Plan</th>
                              <th className="px-4 py-3.5">Sender MoMo & Ref</th>
                              <th className="px-4 py-3.5">Amount</th>
                              <th className="px-4 py-3.5">Status</th>
                              <th className="px-4 py-3.5">Turnaround Latency</th>
                              <th className="px-4 py-3.5">Audited By</th>
                              <th className="px-5 py-3.5 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredArchive.map((p) => {
                              const matchedOrg = orgs.find((o) => o.id === p.org_id);
                              const planStr = (p.plan || p.plan_details || "").toLowerCase();
                              const isPkg = p.package_id || p.item_type === "package" || planStr.includes("package");
                              const latency = p.validated_at ? formatDuration(p.submitted_at, p.validated_at) : "Instant";
                              const senderPhone = p.phone || p.phone_number || "N/A";
                              const txnRef = p.reference || p.transaction_reference || "N/A";
                              const amountLocal = p.amount_local || (p.amount_usd ? p.amount_usd * 1350 : 33750);

                              return (
                                <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                                  <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                                    <div className="flex items-center gap-2">
                                      <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                                      <span className="truncate max-w-[160px]">{matchedOrg?.name || "Workspace"}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                                      {isPkg ? (
                                        <Package className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                                      ) : (
                                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                      )}
                                      <span className="truncate max-w-[150px]">{p.plan || p.plan_details || "Subscription"}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3.5 font-mono text-slate-600 dark:text-slate-400">
                                    <div>{senderPhone}</div>
                                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 rounded font-bold text-slate-700 dark:text-slate-300">
                                      {txnRef}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                    {amountLocal.toLocaleString()} RWF
                                  </td>
                                  <td className="px-4 py-3.5 whitespace-nowrap">
                                    {p.status === "approved" ? (
                                      <Badge color="green" className="text-[10px] px-2 py-0.5">APPROVED</Badge>
                                    ) : (
                                      <Badge color="red" className="text-[10px] px-2 py-0.5">REJECTED</Badge>
                                    )}
                                  </td>
                                  <td className="px-4 py-3.5 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">{latency}</span>
                                  </td>
                                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 font-medium">
                                    {p.audited_by_name || "Platform Auditor"}
                                  </td>
                                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setSelectedHistoryItem(p)}
                                      className="h-7 text-[11px] px-2.5 rounded-lg border-slate-200 dark:border-slate-700"
                                    >
                                      View Audit Log
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
                        <History className="h-8 w-8 text-slate-400" />
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">No archived records found</span>
                        <p className="text-xs text-slate-500 max-w-sm">
                          {archiveSearch || archiveStatusFilter !== "all"
                            ? "Try adjusting your search query or status filter."
                            : "Approved and rejected transaction proofs will automatically be cataloged here."}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* REJECTION MODAL */}
              {rejectModalItem && (
                <Modal
                  title="Reject Mobile Money Payment Evidence"
                  isOpen={!!rejectModalItem}
                  onClose={() => setRejectModalItem(null)}
                >
                  <div className="flex flex-col gap-4 text-xs">
                    <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-800 dark:text-rose-300 flex flex-col gap-1">
                      <span className="font-black text-xs flex items-center gap-1.5">
                        <ShieldAlert className="h-4 w-4" /> Reject Payment Proof
                      </span>
                      <p className="text-[11px]">
                        The transaction proof will be marked as Rejected, archived in the audit history, and the organization administrator will receive an immediate notification explaining the reason.
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Workspace:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {orgs.find((o) => o.id === rejectModalItem.org_id)?.name || "Workspace"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Item / Plan:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {rejectModalItem.plan || rejectModalItem.plan_details || "Subscription"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Payer Phone & Reference:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {rejectModalItem.phone || "N/A"} • Ref: {rejectModalItem.reference || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Amount:</span>
                        <span className="font-bold text-emerald-600">
                          {(rejectModalItem.amount_local || 33750).toLocaleString()} RWF
                        </span>
                      </div>
                    </div>

                    {/* Pre-set Reasons */}
                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-slate-700 dark:text-slate-300">
                        Select Reason for Rejection:
                      </label>
                      <select
                        value={rejectReasonPreset}
                        onChange={(e) => setRejectReasonPreset(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      >
                        <option value="Reference code not found on MoMo merchant collection statement">
                          Reference code not found on MoMo merchant collection statement
                        </option>
                        <option value="Transaction amount is less than required plan or package price">
                          Transaction amount is less than required plan or package price
                        </option>
                        <option value="Duplicate submission: This transaction reference was already approved">
                          Duplicate submission: This transaction reference was already approved
                        </option>
                        <option value="Invalid or unreadable mobile money SMS confirmation format">
                          Invalid or unreadable mobile money SMS confirmation format
                        </option>
                        <option value="Custom">Other (Specify custom note below)</option>
                      </select>
                    </div>

                    {/* Custom Note */}
                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-slate-700 dark:text-slate-300">
                        Additional Auditor Guidance to Payer (Optional):
                      </label>
                      <textarea
                        rows={3}
                        value={customRejectReason}
                        onChange={(e) => setCustomRejectReason(e.target.value)}
                        placeholder="e.g. Please verify transfer reference and resubmit with full MTN confirmation SMS..."
                        className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRejectModalItem(null)}
                        className="text-xs h-9 px-4 rounded-xl"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-9 px-5 rounded-xl shadow-xs"
                        onClick={() => {
                          const fullReason = rejectReasonPreset === "Custom"
                            ? (customRejectReason || "Payment verification rejected by auditor.")
                            : (customRejectReason ? `${rejectReasonPreset}. Note: ${customRejectReason}` : rejectReasonPreset);
                          handleConfirmRejectSub(rejectModalItem.id, rejectModalItem.org_id, fullReason);
                        }}
                      >
                        Confirm Rejection & Notify Payer
                      </Button>
                    </div>
                  </div>
                </Modal>
              )}

              {/* ARCHIVE AUDIT DETAIL MODAL */}
              {selectedHistoryItem && (
                <Modal title="Transaction Validation Audit Detail" isOpen={!!selectedHistoryItem} onClose={() => setSelectedHistoryItem(null)}>
                  <div className="flex flex-col gap-4 text-xs">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-2.5 font-medium">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Transaction ID:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedHistoryItem.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Item / Category:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {selectedHistoryItem.plan || selectedHistoryItem.plan_details || "Subscription"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Reference:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {selectedHistoryItem.reference || selectedHistoryItem.transaction_reference || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Sender Phone:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {selectedHistoryItem.phone || selectedHistoryItem.phone_number || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Amount:</span>
                        <span className="font-bold text-emerald-600">
                          {(selectedHistoryItem.amount_local || (selectedHistoryItem.amount_usd ? selectedHistoryItem.amount_usd * usdRate : 35000)).toLocaleString()} RWF {selectedHistoryItem.amount_usd ? `($${selectedHistoryItem.amount_usd})` : ""}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Payment Gateway:</span>
                        <span className="font-bold uppercase text-slate-700 dark:text-slate-300 font-mono">
                          {selectedHistoryItem.method || "MTN MOMO"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Status:</span>
                        <Badge color={selectedHistoryItem.status === "approved" ? "green" : "red"}>{selectedHistoryItem.status?.toUpperCase()}</Badge>
                      </div>
                      {selectedHistoryItem.audited_by_name && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Audited By:</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">{selectedHistoryItem.audited_by_name}</span>
                        </div>
                      )}
                      {selectedHistoryItem.audit_notes && (
                        <div className="flex flex-col gap-1 border-t border-slate-200 dark:border-slate-700 pt-2">
                          <span className="text-slate-400">Audit Notes:</span>
                          <span className="text-slate-700 dark:text-slate-300 italic">{selectedHistoryItem.audit_notes}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2">
                        <span className="text-slate-400">Turnaround Latency:</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatDuration(selectedHistoryItem.submitted_at, selectedHistoryItem.validated_at)}</span>
                      </div>
                      {selectedHistoryItem.proof_url && (
                        <div className="flex flex-col gap-1 border-t border-slate-200 dark:border-slate-700 pt-2">
                          <span className="text-slate-400">Submitted Proof / SMS Receipt:</span>
                          <p className="font-mono text-[11px] bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 break-all">
                            {selectedHistoryItem.proof_url}
                          </p>
                        </div>
                      )}
                    </div>
                    <Button className="w-full bg-slate-900 dark:bg-emerald-600 text-white font-bold h-10 rounded-xl" onClick={() => setSelectedHistoryItem(null)}>
                      Close Details
                    </Button>
                  </div>
                </Modal>
              )}
            </div>
          );
        })()}

        {/* 3B. ORGANIZATION AUTHENTICITY & VERIFICATIONS AUDIT TAB */}
        {activeTab === "verifications" && (() => {
          const allMembers =
            verificationData?.officers ??
            (isSupabaseConfigured ? [] : MockDB.getMembers().filter((m) => m.role !== "member"));
          const allUsers =
            verificationData?.users ??
            (isSupabaseConfigured ? [] : MockDB.getUsers());

          const resolveOfficerUser = (m: any) =>
            m?.user ||
            allUsers.find((u: any) => u.id === m?.user_id || u.auth_user_id === m?.user_id) ||
            null;

          // Calculate stats
          const totalOrgs = orgs.length;
          const verifiedOrgs = orgs.filter((o: any) => o.verification_status === "verified");
          const pendingOrgs = orgs.filter((o: any) => o.verification_status === "pending_review");
          const unverifiedOrgs = orgs.filter((o: any) => !o.verification_status || o.verification_status === "unverified");
          const rejectedOrgs = orgs.filter((o: any) => o.verification_status === "rejected");

          // Filter list
          const filteredOrgs = orgs.filter((org: any) => {
            const status = org.verification_status || "unverified";
            if (verificationFilter !== "all" && status !== verificationFilter) return false;
            if (search.trim()) {
              const query = search.toLowerCase();
              const matchName = org.name?.toLowerCase().includes(query);
              const matchSlug = org.slug?.toLowerCase().includes(query);
              const matchCategory = org.org_category?.toLowerCase().includes(query);
              const matchRef = org.referred_by_code?.toLowerCase().includes(query);
              return matchName || matchSlug || matchCategory || matchRef;
            }
            return true;
          });

          // Members for the currently selected org to review
          const reviewingMembers = reviewingOrg
            ? allMembers.filter(
                (m: any) =>
                  m.org_id === reviewingOrg.id &&
                  m.role !== "member" &&
                  m.status !== "rejected" &&
                  m.status !== "suspended"
              )
            : [];
          const reviewingAdmin =
            reviewingMembers.find(
              (m: any) =>
                (m.role === "org_admin" || m.role === "superadmin") &&
                Boolean(m.passport_photo_url) &&
                Boolean(m.id_document_url)
            ) ||
            reviewingMembers.find((m: any) => m.role === "org_admin" || m.role === "superadmin") ||
            reviewingMembers[0];
          const reviewingAccountant =
            reviewingMembers.find(
              (m: any) =>
                m.role === "accountant" &&
                Boolean(m.passport_photo_url) &&
                Boolean(m.id_document_url)
            ) || reviewingMembers.find((m: any) => m.role === "accountant");
          const reviewingExtraOfficers = reviewingMembers.filter(
            (m: any) => m.id !== reviewingAdmin?.id && m.id !== reviewingAccountant?.id
          );
          const reviewingAdminUser = resolveOfficerUser(reviewingAdmin);
          const reviewingAccountantUser = resolveOfficerUser(reviewingAccountant);
          const canReviewingApprove = Boolean(
            reviewingAdmin?.passport_photo_url &&
              reviewingAdmin?.id_document_url &&
              reviewingAccountant?.passport_photo_url &&
              reviewingAccountant?.id_document_url
          );

          const handleApproveVerification = async (orgId: string, orgName: string) => {
            try {
              await reviewOrgVerificationMutation.mutateAsync({
                org_id: orgId,
                status: "verified",
                reviewed_by: user?.full_name || "Platform Auditor",
                reviewed_by_user_id: user?.id,
              });
              addToast(`Green Tick granted to ${orgName}! Organization is now authentic verified.`, "success");
              setReviewingOrg(null);
              setShowRejectForm(false);
              refetch();
              refetchVerificationData();
            } catch (err: any) {
              addToast(err?.message || "Failed to grant verification", "error");
            }
          };

          const handleRejectVerification = async (orgId: string, orgName: string) => {
            if (!reviewRejectReason.trim()) {
              addToast("Please provide a reason for rejecting the verification dossier.", "error");
              return;
            }
            try {
              await reviewOrgVerificationMutation.mutateAsync({
                org_id: orgId,
                status: "rejected",
                reviewed_by: user?.full_name || "Platform Auditor",
                reviewed_by_user_id: user?.id,
                rejection_reason: reviewRejectReason.trim(),
              });
              addToast(`Verification dossier for ${orgName} rejected. Feedback saved.`, "info");
              setReviewingOrg(null);
              setShowRejectForm(false);
              setReviewRejectReason("");
              refetch();
              refetchVerificationData();
            } catch (err: any) {
              addToast(err?.message || "Failed to reject verification", "error");
            }
          };

          const handleSimulateDossier = (orgItem: any) => {
            const mems = MockDB.getMembers();
            let adminM = mems.find((m) => m.org_id === orgItem.id && (m.role === "org_admin" || m.role === "superadmin"));
            if (!adminM) {
              adminM = {
                id: `mem-${Date.now()}-adm`,
                org_id: orgItem.id,
                user_id: user?.id || "user-admin",
                role: "org_admin",
                status: "active",
                joined_at: new Date().toISOString()
              };
              mems.push(adminM);
            }
            adminM.passport_photo_url = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80";
            adminM.id_document_url = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80";
            adminM.id_document_type = "national_id";
            adminM.id_document_number = "1199080084592011";
            adminM.verification_status = "pending";

            let accM = mems.find((m) => m.org_id === orgItem.id && m.role === "accountant");
            if (!accM) {
              accM = {
                id: `mem-${Date.now()}-acc`,
                org_id: orgItem.id,
                user_id: "user-acc-demo",
                role: "accountant",
                status: "active",
                joined_at: new Date().toISOString()
              };
              mems.push(accM);
            }
            accM.passport_photo_url = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80";
            accM.id_document_url = "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80";
            accM.id_document_type = "passport";
            accM.id_document_number = "PC992810";
            accM.verification_status = "pending";

            MockDB.saveMembers(mems);

            const allO = MockDB.getOrgs();
            const oIdx = allO.findIndex((o) => o.id === orgItem.id);
            if (oIdx !== -1) {
              allO[oIdx].verification_status = "pending_review";
              allO[oIdx].verification_submitted_at = new Date().toISOString();
              MockDB.saveOrgs(allO);
            }
            localStorage.setItem(`impacto_org_verification_status_${orgItem.id}`, "pending_review");
            addToast(`Submitted test Admin & Accountant verification credentials for ${orgItem.name}!`, "success");
            refetch();
            refetchVerificationData();
          };

          return (
            <div className="flex flex-col gap-6 w-full">
              {/* Header and Summary */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="h-6 w-6" />
                    </span>
                    <h2 className="text-xl font-bold font-display text-gray-900 dark:text-white">
                      Organization Authenticity & Verification Audit Desk
                    </h2>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-2 max-w-3xl">
                    All organizations in the platform start with status <span className="font-semibold text-slate-700 dark:text-slate-300">Unverified</span>. To receive the official <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Green Tick</span>, authenticity verification is required for all key governance roles: <span className="font-bold text-gray-800 dark:text-gray-200">Admin</span> and <span className="font-bold text-gray-800 dark:text-gray-200">Accountant</span> must both submit their passport photo and National ID or Passport. Normal members do not require verification.
                  </p>
                </div>
                {!isSupabaseConfigured && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      onClick={() => {
                        const firstUnverified = orgs.find((o: any) => !o.verification_status || o.verification_status === "unverified");
                        if (firstUnverified) {
                          handleSimulateDossier(firstUnverified);
                        } else if (orgs.length > 0) {
                          handleSimulateDossier(orgs[0]);
                        } else {
                          addToast("No organization found to simulate.", "info");
                        }
                      }}
                      variant="outline"
                      className="text-xs font-bold py-2 border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    >
                      <Upload className="h-3.5 w-3.5 mr-1.5" /> Simulate Verification Dossier
                    </Button>
                  </div>
                )}
              </div>

              {/* Stats KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Total Organizations
                  </span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">{totalOrgs}</span>
                    <Building2 className="h-4 w-4 text-slate-400" />
                  </div>
                </div>

                <div className="p-4 rounded-xl border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                      Verified Authentic
                    </span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 fill-emerald-500 text-white" />
                  </div>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{verifiedOrgs.length}</span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900 px-1.5 py-0.5 rounded">
                      Green Tick
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                      Pending Audit Review
                    </span>
                    <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl font-black text-amber-700 dark:text-amber-300">{pendingOrgs.length}</span>
                    {pendingOrgs.length > 0 && (
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900 px-1.5 py-0.5 rounded animate-pulse">
                        Action Required
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Unverified Initial
                  </span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl font-black text-slate-700 dark:text-slate-300">{unverifiedOrgs.length}</span>
                    <span className="text-[10px] text-slate-400">Needs KYC</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60 flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                    Rejected / Flagged
                  </span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl font-black text-rose-700 dark:text-rose-300">{rejectedOrgs.length}</span>
                    <span className="text-[10px] text-rose-500">Re-upload</span>
                  </div>
                </div>
              </div>

              {/* Filters and Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  {(["all", "pending_review", "unverified", "verified", "rejected"] as const).map((filterKey) => (
                    <button
                      key={filterKey}
                      onClick={() => setVerificationFilter(filterKey)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                        verificationFilter === filterKey
                          ? "bg-slate-900 dark:bg-emerald-600 text-white shadow-xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      {filterKey === "all" && "All Statuses"}
                      {filterKey === "pending_review" && `Pending Review (${pendingOrgs.length})`}
                      {filterKey === "unverified" && `Unverified (${unverifiedOrgs.length})`}
                      {filterKey === "verified" && `Verified Authentic (${verifiedOrgs.length})`}
                      {filterKey === "rejected" && `Rejected (${rejectedOrgs.length})`}
                    </button>
                  ))}
                </div>

                <div className="relative min-w-[240px]">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search organization or promoter..."
                    className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Organizations Verification Sections List */}
              <div className="flex flex-col gap-6">
                {filteredOrgs.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-12 text-center text-slate-400 shadow-xs">
                    <ShieldCheck className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-bold text-sm text-slate-700 dark:text-slate-300">No organizations found</p>
                    <p className="text-xs text-slate-400 mt-1">No organizations match the selected authenticity filter.</p>
                  </div>
                ) : (
                  filteredOrgs.map((orgItem: any) => {
                    const status = orgItem.verification_status || "unverified";
                    const orgOfficers = allMembers.filter(
                      (m: any) =>
                        m.org_id === orgItem.id &&
                        m.role !== "member" &&
                        m.status !== "rejected" &&
                        m.status !== "suspended"
                    );
                    const mandatoryOrgOfficers = orgOfficers.filter(
                      (m: any) =>
                        m.role === "org_admin" ||
                        m.role === "superadmin" ||
                        m.role === "accountant"
                    );
                    const adminM =
                      orgOfficers.find(
                        (m: any) =>
                          (m.role === "org_admin" || m.role === "superadmin") &&
                          Boolean(m.passport_photo_url) &&
                          Boolean(m.id_document_url)
                      ) ||
                      orgOfficers.find((m: any) => m.role === "org_admin" || m.role === "superadmin") ||
                      orgOfficers[0];
                    const accM =
                      orgOfficers.find(
                        (m: any) =>
                          m.role === "accountant" &&
                          Boolean(m.passport_photo_url) &&
                          Boolean(m.id_document_url)
                      ) || orgOfficers.find((m: any) => m.role === "accountant");
                    const adminUser = resolveOfficerUser(adminM);
                    const accUser = resolveOfficerUser(accM);
                    const submittedCount = mandatoryOrgOfficers.filter(
                      (m: any) => !!m.passport_photo_url && !!m.id_document_url
                    ).length;
                    const requiredTotal = Math.max(mandatoryOrgOfficers.length, 2);
                    const progress = Math.min(100, Math.round((submittedCount / requiredTotal) * 100));
                    const canGrantTick = Boolean(
                      adminM?.passport_photo_url &&
                        adminM?.id_document_url &&
                        accM?.passport_photo_url &&
                        accM?.id_document_url
                    );

                    return (
                      <div
                        key={orgItem.id}
                        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col gap-5 transition hover:border-slate-300 dark:hover:border-slate-700 min-w-0"
                      >
                        {/* Section Header */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-4 dark:border-slate-800 min-w-0">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800 flex items-center justify-center font-bold text-emerald-800 dark:text-emerald-300 text-sm shrink-0 overflow-hidden">
                              {orgItem.logo_url && !orgItem.logo_url.includes("logo.png") ? (
                                <ResolvedImage
                                  src={orgItem.logo_url}
                                  alt={orgItem.name}
                                  bucketName="impacto-files"
                                  className="h-full w-full object-contain p-1 rounded-2xl"
                                />
                              ) : (
                                orgItem.name?.substring(0, 2).toUpperCase() || "OR"
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-bold text-slate-900 dark:text-white font-display break-words">
                                  {orgItem.name}
                                </h3>
                                <span className="font-mono text-xs text-slate-400 break-all">
                                  /{orgItem.slug}
                                </span>
                                {status === "verified" ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                    <CheckCircle2 className="h-3 w-3" /> VERIFIED GREEN TICK
                                  </span>
                                ) : status === "pending_review" ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
                                    <Clock className="h-3 w-3" /> AWAITING SYSTEM AUDIT
                                  </span>
                                ) : status === "rejected" ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                    <XCircle className="h-3 w-3" /> REJECTED
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                    <ShieldAlert className="h-3 w-3" /> UNVERIFIED
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 mt-1">
                                <span>Category: <strong>{orgItem.org_category || "General NGO"}</strong></span>
                                <span>•</span>
                                <span>Created: {new Date(orgItem.created_at || Date.now()).toLocaleDateString()}</span>
                                {orgItem.referred_by_code && (
                                  <>
                                    <span>•</span>
                                    <span className="font-mono text-teal-600 dark:text-teal-400 font-bold break-all">
                                      Promoter: {orgItem.referred_by_code}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            {status !== "verified" && (status === "pending_review" || canGrantTick) && (
                              <Button
                                onClick={() => handleApproveVerification(orgItem.id, orgItem.name)}
                                disabled={!canGrantTick || reviewOrgVerificationMutation.isPending}
                                title={!canGrantTick ? "Both Admin and Accountant documents are required first." : "Approve verification"}
                                size="sm"
                                className="text-xs font-bold py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" /> Grant Green Tick
                              </Button>
                            )}

                            <Button
                              onClick={() => {
                                setReviewingOrg(orgItem);
                                setShowRejectForm(false);
                                setReviewRejectReason(orgItem.verification_rejection_reason || "");
                              }}
                              size="sm"
                              variant="outline"
                              className="text-xs font-bold py-2 px-3.5 flex items-center gap-1.5 cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5" /> Inspect Dossier
                            </Button>
                          </div>
                        </div>

                        {status === "rejected" && orgItem.verification_rejection_reason && (
                          <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/20 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
                            <XCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                            <span className="break-words">
                              <strong>Rejection Reason:</strong> {orgItem.verification_rejection_reason}
                            </span>
                          </div>
                        )}

                        {/* Progress Bar of Officers Required to Submit */}
                        <div className="bg-slate-50/80 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Officer Document Submission Progress:
                            </span>
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {submittedCount} / {requiredTotal} Mandatory Officers ({progress}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full transition-all duration-500 rounded-full"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Officer Roster Cards (All Non-Member Roles) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                          {/* 1. Administrator */}
                          <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between gap-2.5 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 uppercase tracking-wider">
                                Role: Admin (Mandatory)
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                adminM?.verification_status === "verified"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : adminM?.verification_status === "rejected"
                                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                  : adminM?.passport_photo_url && adminM?.id_document_url
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                              }`}>
                                {adminM?.verification_status === "verified"
                                  ? "Verified"
                                  : adminM?.verification_status === "rejected"
                                  ? "Rejected"
                                  : adminM?.passport_photo_url && adminM?.id_document_url
                                  ? "Submitted"
                                  : "Missing"}
                              </span>
                            </div>

                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                                {adminUser?.full_name || "Administrator"}
                              </span>
                              <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 break-all">
                                <Phone className="h-3 w-3 text-emerald-600 shrink-0" />
                                {adminM?.phone_number || adminUser?.phone_number || "No telephone number"}
                              </span>
                              <span className="font-mono text-[10px] text-slate-400 block mt-0.5 break-all">
                                {adminM?.id_document_type || "national_id"}: {adminM?.id_document_number || "No ID #"}
                              </span>
                            </div>

                            {/* Image Thumbnails */}
                            <div className="flex items-center gap-2 pt-1 border-t dark:border-slate-800">
                              {adminM?.passport_photo_url ? (
                                <div
                                  onClick={() => setFullDocPreviewUrl(adminM.passport_photo_url!)}
                                  className="h-14 w-14 rounded-lg overflow-hidden border bg-slate-100 cursor-pointer relative group shrink-0"
                                >
                                  <ResolvedImage src={adminM.passport_photo_url} alt="Photo" bucketName="impacto-files" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[9px] font-bold">
                                    Zoom
                                  </div>
                                </div>
                              ) : (
                                <div className="h-14 w-14 rounded-lg border border-dashed flex flex-col items-center justify-center text-slate-400 text-[9px] shrink-0">
                                  No Photo
                                </div>
                              )}

                              {adminM?.id_document_url ? (
                                <div
                                  onClick={() => setFullDocPreviewUrl(adminM.id_document_url!)}
                                  className="h-14 flex-1 rounded-lg overflow-hidden border bg-slate-100 cursor-pointer relative group min-w-0"
                                >
                                  <ResolvedImage src={adminM.id_document_url} alt="ID" bucketName="impacto-files" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[9px] font-bold">
                                    Zoom ID
                                  </div>
                                </div>
                              ) : (
                                <div className="h-14 flex-1 rounded-lg border border-dashed flex items-center justify-center text-slate-400 text-[10px]">
                                  No ID Scan
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 2. Accountant */}
                          <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between gap-2.5 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 uppercase tracking-wider">
                                Role: Accountant (Mandatory)
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                accM?.verification_status === "verified"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : accM?.verification_status === "rejected"
                                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                  : accM?.passport_photo_url && accM?.id_document_url
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                  : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              }`}>
                                {accM?.verification_status === "verified"
                                  ? "Verified"
                                  : accM?.verification_status === "rejected"
                                  ? "Rejected"
                                  : accM?.passport_photo_url && accM?.id_document_url
                                  ? "Submitted"
                                  : "Missing"}
                              </span>
                            </div>

                            {accM ? (
                              <>
                                <div className="min-w-0">
                                  <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                                    {accUser?.full_name || "Accountant"}
                                  </span>
                                  <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 break-all">
                                    <Phone className="h-3 w-3 text-emerald-600 shrink-0" />
                                    {accM.phone_number || accUser?.phone_number || "No telephone number"}
                                  </span>
                                  <span className="font-mono text-[10px] text-slate-400 block mt-0.5 break-all">
                                    {accM.id_document_type || "passport"}: {accM.id_document_number || "No ID #"}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 pt-1 border-t dark:border-slate-800">
                                  {accM.passport_photo_url ? (
                                    <div
                                      onClick={() => setFullDocPreviewUrl(accM.passport_photo_url!)}
                                      className="h-14 w-14 rounded-lg overflow-hidden border bg-slate-100 cursor-pointer relative group shrink-0"
                                    >
                                      <ResolvedImage src={accM.passport_photo_url} alt="Photo" bucketName="impacto-files" className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[9px] font-bold">
                                        Zoom
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="h-14 w-14 rounded-lg border border-dashed flex flex-col items-center justify-center text-slate-400 text-[9px] shrink-0">
                                      No Photo
                                    </div>
                                  )}

                                  {accM.id_document_url ? (
                                    <div
                                      onClick={() => setFullDocPreviewUrl(accM.id_document_url!)}
                                      className="h-14 flex-1 rounded-lg overflow-hidden border bg-slate-100 cursor-pointer relative group min-w-0"
                                    >
                                      <ResolvedImage src={accM.id_document_url} alt="ID" bucketName="impacto-files" className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[9px] font-bold">
                                        Zoom ID
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="h-14 flex-1 rounded-lg border border-dashed flex items-center justify-center text-slate-400 text-[10px]">
                                      No ID Scan
                                    </div>
                                  )}
                                </div>
                              </>
                            ) : (
                              <div className="p-3 text-center text-amber-600 dark:text-amber-400 text-xs font-bold flex flex-col items-center justify-center">
                                <AlertTriangle className="h-4 w-4 mb-1" />
                                Accountant Not Appointed
                              </div>
                            )}
                          </div>

                          {/* 3. Additional Governance Officers (e.g. Managers) */}
                          {orgOfficers
                            .filter((m: any) => m.id !== adminM?.id && m.id !== accM?.id)
                            .map((officer: any) => {
                              const officerUser = resolveOfficerUser(officer);
                              return (
                                <div key={officer.id} className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between gap-2.5 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                      Role: {officer.role}
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                      officer.verification_status === "verified"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : officer.passport_photo_url && officer.id_document_url
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-slate-100 text-slate-600"
                                    }`}>
                                      {officer.verification_status === "verified" ? "Verified" : officer.passport_photo_url ? "Submitted" : "Missing"}
                                    </span>
                                  </div>

                                  <div className="min-w-0">
                                    <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                                      {officerUser?.full_name || "Governance Officer"}
                                    </span>
                                    <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 break-all">
                                      <Phone className="h-3 w-3 text-emerald-600 shrink-0" />
                                      {officer.phone_number || officerUser?.phone_number || "No telephone"}
                                    </span>
                                    <span className="font-mono text-[10px] text-slate-400 block mt-0.5 break-all">
                                      {officer.id_document_type || "national_id"}: {officer.id_document_number || "No ID #"}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 pt-1 border-t dark:border-slate-800">
                                    {officer.passport_photo_url ? (
                                      <div
                                        onClick={() => setFullDocPreviewUrl(officer.passport_photo_url!)}
                                        className="h-14 w-14 rounded-lg overflow-hidden border bg-slate-100 cursor-pointer relative group shrink-0"
                                      >
                                        <ResolvedImage src={officer.passport_photo_url} alt="Photo" bucketName="impacto-files" className="w-full h-full object-cover" />
                                      </div>
                                    ) : (
                                      <div className="h-14 w-14 rounded-lg border border-dashed flex items-center justify-center text-slate-400 text-[9px] shrink-0">
                                        No Photo
                                      </div>
                                    )}

                                    {officer.id_document_url ? (
                                      <div
                                        onClick={() => setFullDocPreviewUrl(officer.id_document_url!)}
                                        className="h-14 flex-1 rounded-lg overflow-hidden border bg-slate-100 cursor-pointer relative group min-w-0"
                                      >
                                        <ResolvedImage src={officer.id_document_url} alt="ID" bucketName="impacto-files" className="w-full h-full object-cover" />
                                      </div>
                                    ) : (
                                      <div className="h-14 flex-1 rounded-lg border border-dashed flex items-center justify-center text-slate-400 text-[10px]">
                                        No ID Scan
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* REVIEW DOSSIER MODAL */}
              {reviewingOrg && (
                <Modal
                  open={!!reviewingOrg}
                  onClose={() => {
                    setReviewingOrg(null);
                    setShowRejectForm(false);
                  }}
                  title=""
                  maxWidth="max-w-4xl"
                >
                  <div className="flex flex-col gap-6 pt-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 border-b pb-4 dark:border-slate-800 min-w-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-12 w-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                          <ShieldCheck className="h-7 w-7" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white break-words">
                              Authenticity Dossier: {reviewingOrg.name}
                            </h2>
                            <span className="font-mono text-xs text-slate-400 break-all">({reviewingOrg.slug})</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 break-words">
                            Status: <span className="font-bold uppercase text-emerald-600">{reviewingOrg.verification_status || "Unverified"}</span>
                            {reviewingOrg.referred_by_code && (
                              <span className="ml-2 font-mono text-[11px] text-teal-600">
                                • Referred by promoter: {reviewingOrg.referred_by_code}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setReviewingOrg(null)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    {/* Notice */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                      <Info className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>
                        Rule: Verification requires both <strong className="text-slate-900 dark:text-white">Admin</strong> and <strong className="text-slate-900 dark:text-white">Accountant</strong> roles to upload their passport photograph and government-issued National ID or Passport. Normal members do not need verification.
                      </span>
                    </div>

                    {reviewingOrg.verification_status === "rejected" && reviewingOrg.verification_rejection_reason && (
                      <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                        <span className="break-words">
                          <strong>Previous Rejection Reason:</strong> {reviewingOrg.verification_rejection_reason}
                        </span>
                      </div>
                    )}

                    {/* Side-by-Side Review Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* 1. ADMIN GOVERNANCE CARD */}
                      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col gap-3 min-w-0">
                        <div className="flex items-center justify-between gap-2 border-b pb-2.5 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 uppercase">
                              Role: Admin (Mandatory)
                            </span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            reviewingAdmin?.verification_status === "verified"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : reviewingAdmin?.verification_status === "rejected"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              : reviewingAdmin?.passport_photo_url && reviewingAdmin?.id_document_url
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}>
                            {reviewingAdmin?.verification_status === "verified"
                              ? "Verified"
                              : reviewingAdmin?.verification_status === "rejected"
                              ? "Rejected"
                              : reviewingAdmin?.passport_photo_url && reviewingAdmin?.id_document_url
                              ? "Submitted"
                              : "Missing"}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <span className="text-[11px] text-slate-400 block">Name & Email:</span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white break-all block">
                            {reviewingAdminUser?.full_name || "Administrator"} ({reviewingAdminUser?.email || "No email"})
                          </span>
                        </div>

                        <div className="min-w-0">
                          <span className="text-[11px] text-slate-400 block">Telephone & Document ID:</span>
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-white uppercase break-all block">
                            {reviewingAdmin?.phone_number || reviewingAdminUser?.phone_number || "No phone"} • {reviewingAdmin?.id_document_type || "national_id"}: {reviewingAdmin?.id_document_number || "Not specified"}
                          </span>
                        </div>

                        {/* Images Preview */}
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Passport Photo</span>
                            {reviewingAdmin?.passport_photo_url ? (
                              <div
                                onClick={() => setFullDocPreviewUrl(reviewingAdmin.passport_photo_url!)}
                                className="h-36 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 cursor-pointer relative group"
                              >
                                <ResolvedImage
                                  src={reviewingAdmin.passport_photo_url}
                                  alt="Admin Passport"
                                  bucketName="impacto-files"
                                  className="w-full h-full object-cover group-hover:scale-105 transition"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1">
                                  <Eye className="h-3.5 w-3.5" /> Enlarge
                                </div>
                              </div>
                            ) : (
                              <div className="h-36 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400 text-xs">
                                <Camera className="h-6 w-6 mb-1 text-slate-300" />
                                No Photo
                              </div>
                            )}
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">National ID / Passport</span>
                            {reviewingAdmin?.id_document_url ? (
                              <div
                                onClick={() => setFullDocPreviewUrl(reviewingAdmin.id_document_url!)}
                                className="h-36 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 cursor-pointer relative group"
                              >
                                <ResolvedImage
                                  src={reviewingAdmin.id_document_url}
                                  alt="Admin ID Document"
                                  bucketName="impacto-files"
                                  className="w-full h-full object-cover group-hover:scale-105 transition"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1">
                                  <Eye className="h-3.5 w-3.5" /> Enlarge
                                </div>
                              </div>
                            ) : (
                              <div className="h-36 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400 text-xs">
                                <FileText className="h-6 w-6 mb-1 text-slate-300" />
                                No Document
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 2. ACCOUNTANT GOVERNANCE CARD */}
                      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col gap-3 min-w-0">
                        <div className="flex items-center justify-between gap-2 border-b pb-2.5 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 uppercase">
                              Role: Accountant (Mandatory)
                            </span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            reviewingAccountant?.verification_status === "verified"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : reviewingAccountant?.verification_status === "rejected"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              : reviewingAccountant?.passport_photo_url && reviewingAccountant?.id_document_url
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          }`}>
                            {reviewingAccountant?.verification_status === "verified"
                              ? "Verified"
                              : reviewingAccountant?.verification_status === "rejected"
                              ? "Rejected"
                              : reviewingAccountant?.passport_photo_url && reviewingAccountant?.id_document_url
                              ? "Submitted"
                              : "Missing"}
                          </span>
                        </div>

                        {reviewingAccountant ? (
                          <>
                            <div className="min-w-0">
                              <span className="text-[11px] text-slate-400 block">Name & Email:</span>
                              <span className="text-xs font-bold text-slate-900 dark:text-white break-all block">
                                {reviewingAccountantUser?.full_name || "Chief Accountant"} ({reviewingAccountantUser?.email || "No email"})
                              </span>
                            </div>

                            <div className="min-w-0">
                              <span className="text-[11px] text-slate-400 block">Telephone & Document ID:</span>
                              <span className="font-mono text-xs font-bold text-slate-900 dark:text-white uppercase break-all block">
                                {reviewingAccountant?.phone_number || reviewingAccountantUser?.phone_number || "No phone"} • {reviewingAccountant?.id_document_type || "passport"}: {reviewingAccountant?.id_document_number || "Not specified"}
                              </span>
                            </div>

                            {/* Images Preview */}
                            <div className="grid grid-cols-2 gap-2 mt-1">
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Passport Photo</span>
                                {reviewingAccountant?.passport_photo_url ? (
                                  <div
                                    onClick={() => setFullDocPreviewUrl(reviewingAccountant.passport_photo_url!)}
                                    className="h-36 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 cursor-pointer relative group"
                                  >
                                    <ResolvedImage
                                      src={reviewingAccountant.passport_photo_url}
                                      alt="Accountant Passport"
                                      bucketName="impacto-files"
                                      className="w-full h-full object-cover group-hover:scale-105 transition"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1">
                                      <Eye className="h-3.5 w-3.5" /> Enlarge
                                    </div>
                                  </div>
                                ) : (
                                  <div className="h-36 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400 text-xs">
                                    <Camera className="h-6 w-6 mb-1 text-slate-300" />
                                    No Photo
                                  </div>
                                )}
                              </div>

                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">National ID / Passport</span>
                                {reviewingAccountant?.id_document_url ? (
                                  <div
                                    onClick={() => setFullDocPreviewUrl(reviewingAccountant.id_document_url!)}
                                    className="h-36 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 cursor-pointer relative group"
                                  >
                                    <ResolvedImage
                                      src={reviewingAccountant.id_document_url}
                                      alt="Accountant ID Document"
                                      bucketName="impacto-files"
                                      className="w-full h-full object-cover group-hover:scale-105 transition"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1">
                                      <Eye className="h-3.5 w-3.5" /> Enlarge
                                    </div>
                                  </div>
                                ) : (
                                  <div className="h-36 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400 text-xs">
                                    <FileText className="h-6 w-6 mb-1 text-slate-300" />
                                    No Document
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="p-8 text-center flex flex-col items-center justify-center text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="h-8 w-8 mb-2" />
                            <p className="font-bold text-xs">Accountant Member Not Appointed</p>
                            <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                              Authenticity verification cannot be approved until the organization adds an Accountant member with ID and passport photo.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Additional Governance Officers (e.g. Managers / Extra Officers) */}
                    {reviewingExtraOfficers.length > 0 && (
                      <div className="flex flex-col gap-3">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Additional Leadership Officers ({reviewingExtraOfficers.length})
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {reviewingExtraOfficers.map((officer: any) => {
                            const officerUser = resolveOfficerUser(officer);
                            return (
                              <div key={officer.id} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col gap-2 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                                    Role: {officer.role}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-500">
                                    {officer.passport_photo_url && officer.id_document_url ? "Submitted" : "Optional / Missing"}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <span className="text-xs font-bold text-slate-900 dark:text-white break-all block">
                                    {officerUser?.full_name || "Officer"} ({officerUser?.email || "No email"})
                                  </span>
                                  <span className="font-mono text-[11px] text-slate-500 break-all block">
                                    {officer.phone_number || officerUser?.phone_number || "No phone"} • {officer.id_document_type || "national_id"}: {officer.id_document_number || "N/A"}
                                  </span>
                                </div>
                                {(officer.passport_photo_url || officer.id_document_url) && (
                                  <div className="grid grid-cols-2 gap-2 pt-1">
                                    {officer.passport_photo_url && (
                                      <div
                                        onClick={() => setFullDocPreviewUrl(officer.passport_photo_url!)}
                                        className="h-24 rounded-lg overflow-hidden border bg-slate-100 cursor-pointer"
                                      >
                                        <ResolvedImage src={officer.passport_photo_url} alt="Officer Photo" bucketName="impacto-files" className="w-full h-full object-cover" />
                                      </div>
                                    )}
                                    {officer.id_document_url && (
                                      <div
                                        onClick={() => setFullDocPreviewUrl(officer.id_document_url!)}
                                        className="h-24 rounded-lg overflow-hidden border bg-slate-100 cursor-pointer"
                                      >
                                        <ResolvedImage src={officer.id_document_url} alt="Officer ID" bucketName="impacto-files" className="w-full h-full object-cover" />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Rejection Form Drawer */}
                    {showRejectForm && (
                      <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 flex flex-col gap-3">
                        <span className="text-xs font-bold text-rose-800 dark:text-rose-300">
                          Provide Rejection Feedback & Correction Instructions:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {[
                            "Accountant ID photograph is blurred or illegible",
                            "Passport photo does not match identity document",
                            "Missing Accountant role nomination",
                            "Expired government identification document",
                          ].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setReviewRejectReason(preset)}
                              className="text-[11px] px-2.5 py-1 rounded bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-slate-700 dark:text-slate-300 hover:bg-rose-100 text-left"
                            >
                              + {preset}
                            </button>
                          ))}
                        </div>
                        <textarea
                          rows={3}
                          value={reviewRejectReason}
                          onChange={(e) => setReviewRejectReason(e.target.value)}
                          placeholder="Explain what the organization administrator needs to correct..."
                          className="w-full text-xs p-2.5 rounded-lg border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowRejectForm(false)}
                            className="text-xs font-bold"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            loading={reviewOrgVerificationMutation.isPending}
                            onClick={() => handleRejectVerification(reviewingOrg.id, reviewingOrg.name)}
                            className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
                          >
                            Confirm Rejection
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 dark:border-slate-800">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setReviewingOrg(null);
                          setShowRejectForm(false);
                        }}
                        className="text-xs font-bold"
                      >
                        Close
                      </Button>

                      <div className="flex flex-wrap items-center gap-2">
                        {!showRejectForm && (
                          <Button
                            variant="outline"
                            onClick={() => setShowRejectForm(true)}
                            className="text-xs font-bold text-rose-600 border-rose-300 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950/30"
                          >
                            {reviewingOrg.verification_status === "verified"
                              ? "Revoke Verification"
                              : "Reject Dossier"}
                          </Button>
                        )}
                        {reviewingOrg.verification_status === "verified" ? (
                          <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-bold">
                            <CheckCircle2 className="h-4 w-4" /> Verified Active
                          </span>
                        ) : (
                          <Button
                            onClick={() => handleApproveVerification(reviewingOrg.id, reviewingOrg.name)}
                            disabled={!canReviewingApprove}
                            loading={reviewOrgVerificationMutation.isPending}
                            title={!canReviewingApprove ? "Both Admin and Accountant documents are required." : "Grant Green Tick"}
                            className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="h-4 w-4" /> Grant Green Tick Verification
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Modal>
              )}

              {/* Full Screen Document Zoom Modal */}
              {fullDocPreviewUrl && (
                <Modal
                  open={!!fullDocPreviewUrl}
                  onClose={() => setFullDocPreviewUrl(null)}
                  title="Document High-Resolution Inspection"
                  maxWidth="max-w-3xl"
                >
                  <div className="flex flex-col gap-4 items-center">
                    <div className="max-h-[70vh] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 p-2 w-full flex justify-center">
                      <ResolvedImage
                        src={fullDocPreviewUrl}
                        alt="Document High Res"
                        bucketName="impacto-files"
                        className="max-h-[65vh] w-auto object-contain mx-auto rounded-lg shadow-lg"
                      />
                    </div>
                    <Button
                      onClick={() => setFullDocPreviewUrl(null)}
                      className="w-full bg-slate-900 dark:bg-emerald-600 text-white font-bold h-10 rounded-xl"
                    >
                      Close Inspection Preview
                    </Button>
                  </div>
                </Modal>
              )}
            </div>
          );
        })()}

        {/* 3C. PROMOTERS & REFERRALS ATTRIBUTION HUB TAB */}
        {activeTab === "referrals" && (() => {
          // Calculate stats
          const totalReferrals = allReferrals.length;
          const orgReferrals = allReferrals.filter((r) => r.referred_org_id || r.status === "org_created");
          const l1Referrals = allReferrals.filter((r) => r.level === 1);
          const l2Referrals = allReferrals.filter((r) => r.level === 2);
          const verifiedReferrals = allReferrals.filter((r) => r.status === "verified");

          // Code generator helper
          const generateCodeFromName = (nameInput: string) => {
            const raw = nameInput.trim();
            if (!raw) {
              return `REF-PROM-${Math.floor(100 + Math.random() * 900)}-${new Date().getFullYear()}`;
            }
            const clean = raw
              .replace(/[^a-zA-Z0-9]/g, "")
              .toUpperCase()
              .substring(0, 7);
            const suffix = Math.floor(10 + Math.random() * 90);
            return `REF-${clean}-${suffix}`;
          };

          const handleCopyCode = (code: string) => {
            navigator.clipboard.writeText(code);
            setCopiedCodeMap((prev) => ({ ...prev, [`code_${code}`]: true }));
            addToast(`Referral code "${code}" copied to clipboard!`, "success");
            setTimeout(() => {
              setCopiedCodeMap((prev) => ({ ...prev, [`code_${code}`]: false }));
            }, 2500);
          };

          const handleCopyInviteLink = (code: string) => {
            const host = typeof window !== "undefined" ? window.location.origin : "";
            const url = `${host}/register?ref=${encodeURIComponent(code)}`;
            navigator.clipboard.writeText(url);
            setCopiedCodeMap((prev) => ({ ...prev, [`link_${code}`]: true }));
            addToast(`Promoter invitation link copied: ${url}`, "success");
            setTimeout(() => {
              setCopiedCodeMap((prev) => ({ ...prev, [`link_${code}`]: false }));
            }, 2500);
          };

          const handleCreateNewPromoter = async (e: React.FormEvent) => {
            e.preventDefault();
            if (!promoterName.trim()) {
              addToast("Please enter the promoter's full name.", "error");
              return;
            }
            let finalCode = promoterCode.trim().toUpperCase();
            if (!finalCode) {
              finalCode = generateCodeFromName(promoterName);
            }

            try {
              await createPromoterMutation.mutateAsync({
                name: promoterName.trim(),
                code: finalCode,
                email: promoterEmail.trim() || undefined,
                phone: promoterPhone.trim() || undefined,
                notes: promoterNotes.trim() || undefined,
                commission_rate: Number(promoterCommission) || 10,
                created_by: user?.full_name || "Superadmin",
              });
              addToast(`Promoter "${promoterName}" registered successfully with referral code ${finalCode}!`, "success");
              setIsCreatePromoterOpen(false);
              setPromoterName("");
              setPromoterCode("");
              setPromoterPhone("");
              setPromoterEmail("");
              setPromoterNotes("");
              setPromoterCommission(10);
            } catch (err: any) {
              addToast(err?.message || "Failed to register promoter", "error");
            }
          };

          const handleTogglePromoterStatus = async (promoter: Promoter) => {
            const newStatus = promoter.status === "active" ? "inactive" : "active";
            try {
              await updatePromoterMutation.mutateAsync({
                id: promoter.id,
                status: newStatus,
              });
              addToast(`Promoter ${promoter.name} is now ${newStatus}.`, "info");
            } catch (err: any) {
              addToast(err?.message || "Failed to update promoter status", "error");
            }
          };

          const handleDeletePromoter = async (promoter: Promoter) => {
            if (window.confirm(`Are you sure you want to remove promoter "${promoter.name}" (${promoter.code})?`)) {
              try {
                await deletePromoterMutation.mutateAsync(promoter.id);
                addToast(`Promoter ${promoter.name} removed.`, "info");
              } catch (err: any) {
                addToast(err?.message || "Failed to delete promoter", "error");
              }
            }
          };

          // Filter promoters list
          const filteredPromoters = promoters.filter((p) => {
            if (promoterFilter !== "all" && p.status !== promoterFilter) return false;
            if (promoterSearchQuery.trim()) {
              const q = promoterSearchQuery.toLowerCase();
              return (
                p.name.toLowerCase().includes(q) ||
                p.code.toLowerCase().includes(q) ||
                p.phone?.toLowerCase().includes(q) ||
                p.email?.toLowerCase().includes(q) ||
                p.notes?.toLowerCase().includes(q)
              );
            }
            return true;
          });

          // Filter referrals log
          const filteredReferrals = allReferrals.filter((r) => {
            if (!search.trim()) return true;
            const q = search.toLowerCase();
            return (
              r.referral_code?.toLowerCase().includes(q) ||
              r.referrer_name?.toLowerCase().includes(q) ||
              r.referred_user_name?.toLowerCase().includes(q) ||
              r.referred_org_name?.toLowerCase().includes(q)
            );
          });

          return (
            <div className="flex flex-col gap-6 w-full">
              {/* Header Hero */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400">
                      <HeartHandshake className="h-6 w-6" />
                    </span>
                    <h2 className="text-xl font-bold font-display text-gray-900 dark:text-white">
                      Promoter & Referral Attribution Hub
                    </h2>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-2 max-w-3xl leading-relaxed">
                    Create and manage official field promoters, influencers, and community ambassadors. Generate unique codes for them. When a new user or organization registers using a promoter's code, their attribution, conversion status, and organizations are tracked automatically in real time.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <Button
                    onClick={() => {
                      setIsCreatePromoterOpen(true);
                      setPromoterCode(generateCodeFromName(""));
                    }}
                    className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Plus className="h-4 w-4" /> Register New Promoter
                  </Button>
                </div>
              </div>

              {/* Stats KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 flex flex-col justify-between shadow-3xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Registered Promoters
                  </span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">{promoters.length}</span>
                    <Users className="h-4 w-4 text-teal-600" />
                  </div>
                  <span className="text-[10px] text-teal-600 font-bold mt-1">
                    {promoters.filter((p) => p.status === "active").length} Active in Field
                  </span>
                </div>

                <div className="p-4 rounded-xl border bg-teal-50/50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800/60 flex flex-col justify-between shadow-3xs">
                  <span className="text-[11px] font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider">
                    Orgs via Referral
                  </span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl font-black text-teal-700 dark:text-teal-300">{orgReferrals.length}</span>
                    <Building2 className="h-4 w-4 text-teal-500" />
                  </div>
                  <span className="text-[10px] text-teal-700 dark:text-teal-300 font-semibold mt-1">
                    Directly Created
                  </span>
                </div>

                <div className="p-4 rounded-xl border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 flex flex-col justify-between shadow-3xs">
                  <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                    Verified Authentic Orgs
                  </span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{verifiedReferrals.length}</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-500 text-white" />
                  </div>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold mt-1">
                    Green Tick Active
                  </span>
                </div>

                <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-3xs">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Total Conversions
                  </span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl font-black text-slate-700 dark:text-slate-300">{totalReferrals}</span>
                    <TrendingUp className="h-4 w-4 text-slate-400" />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1">
                    {l1Referrals.length} Direct • {l2Referrals.length} L2
                  </span>
                </div>

                <div className="p-4 rounded-xl border bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/60 flex flex-col justify-between shadow-3xs">
                  <span className="text-[11px] font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider">
                    Multi-Tier Network
                  </span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl font-black text-purple-700 dark:text-purple-300">{l2Referrals.length}</span>
                    <Sparkles className="h-4 w-4 text-purple-500" />
                  </div>
                  <span className="text-[10px] text-purple-600 font-bold mt-1">
                    Sub-Promoter Level
                  </span>
                </div>
              </div>

              {/* 1. REGISTERED PROMOTERS DIRECTORY TABLE */}
              <div className="p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col gap-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-400 flex items-center justify-center font-bold shrink-0">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Official Field Promoters & Ambassadors ({promoters.length})
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Promoters created by Super Admin with assigned referral codes and attributed organizations.
                      </p>
                    </div>
                  </div>

                  {/* Filters & Search */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                      {(["all", "active", "inactive"] as const).map((filter) => (
                        <button
                          key={filter}
                          type="button"
                          onClick={() => setPromoterFilter(filter)}
                          className={`px-2.5 py-1 rounded-md font-bold capitalize transition cursor-pointer ${
                            promoterFilter === filter
                              ? "bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-3xs"
                              : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                          }`}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>

                    <div className="relative min-w-[200px]">
                      <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={promoterSearchQuery}
                        onChange={(e) => setPromoterSearchQuery(e.target.value)}
                        placeholder="Search promoter or code..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Promoters Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-3">Promoter Details</th>
                        <th className="py-3 px-3">Referral Code & Link</th>
                        <th className="py-3 px-3">Telephone & Email</th>
                        <th className="py-3 px-3 text-center">Attributed Orgs</th>
                        <th className="py-3 px-3 text-center">Total Signups</th>
                        <th className="py-3 px-3 text-center">Commission</th>
                        <th className="py-3 px-3 text-center">Status</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredPromoters.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            No promoters found matching your criteria. Click "+ Register New Promoter" to add one.
                          </td>
                        </tr>
                      ) : (
                        filteredPromoters.map((p) => {
                          // Calculate this promoter's attributed signups
                          const attributedRefs = allReferrals.filter(
                            (r) =>
                              r.referral_code?.toUpperCase() === p.code.toUpperCase() ||
                              r.referrer_user_id === p.id ||
                              r.referrer_name?.toLowerCase() === p.name.toLowerCase()
                          );
                          const attributedOrgs = attributedRefs.filter((r) => r.referred_org_id || r.status === "org_created");
                          const verifiedOrgsCount = attributedRefs.filter((r) => r.status === "verified").length;

                          return (
                            <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                              {/* Promoter Info */}
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="h-9 w-9 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 flex items-center justify-center font-bold text-xs shrink-0">
                                    {p.name.substring(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <span className="font-bold text-slate-900 dark:text-white block">
                                      {p.name}
                                    </span>
                                    {p.notes ? (
                                      <span className="text-[11px] text-slate-500 block truncate max-w-[180px]">
                                        {p.notes}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400">
                                        Added {new Date(p.created_at).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Code & Copy Buttons */}
                              <td className="py-3 px-3">
                                <div className="flex flex-col gap-1.5 self-start">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                                      {p.code}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyCode(p.code)}
                                      title="Copy Code"
                                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                                    >
                                      {copiedCodeMap[`code_${p.code}`] ? (
                                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                                      ) : (
                                        <Copy className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleCopyInviteLink(p.code)}
                                    className="text-[10px] font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center gap-1 cursor-pointer"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    {copiedCodeMap[`link_${p.code}`] ? "URL Copied!" : "Copy Signup Link"}
                                  </button>
                                </div>
                              </td>

                              {/* Contact */}
                              <td className="py-3 px-3">
                                <div className="flex flex-col gap-0.5">
                                  {p.phone ? (
                                    <span className="text-slate-900 dark:text-white font-medium flex items-center gap-1">
                                      <Phone className="h-3 w-3 text-teal-600" /> {p.phone}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-[11px]">No phone</span>
                                  )}
                                  {p.email && (
                                    <span className="text-[11px] text-slate-500 truncate max-w-[150px]">
                                      {p.email}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Orgs Created */}
                              <td className="py-3 px-3 text-center">
                                <div className="flex flex-col items-center">
                                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                                    {attributedOrgs.length}
                                  </span>
                                  {verifiedOrgsCount > 0 && (
                                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5 mt-0.5">
                                      <CheckCircle2 className="h-2.5 w-2.5" /> {verifiedOrgsCount} Verified
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Total Signups */}
                              <td className="py-3 px-3 text-center">
                                <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                                  {attributedRefs.length}
                                </span>
                              </td>

                              {/* Commission */}
                              <td className="py-3 px-3 text-center">
                                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                  {p.commission_rate ?? 10}%
                                </span>
                              </td>

                              {/* Status */}
                              <td className="py-3 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleTogglePromoterStatus(p)}
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition ${
                                    p.status === "active"
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                      : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                  }`}
                                >
                                  {p.status === "active" ? "Active" : "Inactive"}
                                </button>
                              </td>

                              {/* Actions */}
                              <td className="py-3 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleDeletePromoter(p)}
                                  title="Delete Promoter"
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition cursor-pointer"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. REFERRALS ATTRIBUTIONS STREAM & LOG */}
              <div className="p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                      <HeartHandshake className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        Live Signups & Attribution Log ({filteredReferrals.length})
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        When someone joins or creates an organization using a promoter code, it appears here immediately.
                      </p>
                    </div>
                  </div>

                  <div className="relative min-w-[220px]">
                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search attribution event..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Promoter / Ambassador</th>
                        <th className="py-2.5 px-3">Referral Code Used</th>
                        <th className="py-2.5 px-3">Referred Entity (Org / User)</th>
                        <th className="py-2.5 px-3 text-center">Attribution Tier</th>
                        <th className="py-2.5 px-3 text-center">Attribution Status</th>
                        <th className="py-2.5 px-3 text-right">Registration Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredReferrals.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No referral conversions logged yet. Referrals are recorded automatically when users or organizations register with a promoter's code.
                          </td>
                        </tr>
                      ) : (
                        filteredReferrals.map((ref) => (
                          <tr key={ref.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-slate-900 dark:text-white block">
                                {ref.referrer_name || "Ambassador"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                                {ref.referral_code}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              {ref.referred_org_name ? (
                                <div>
                                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                                    🏢 {ref.referred_org_name}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    Creator: {ref.referred_user_name || "Admin"}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-700 dark:text-slate-300 font-medium">
                                  👤 {ref.referred_user_name || "Participant Member"}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {ref.level === 1 ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  Level 1 Direct
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                                  Level 2 Network
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {ref.status === "verified" ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                                  <CheckCircle2 className="h-3 w-3" /> Org Verified
                                </span>
                              ) : ref.status === "org_created" ? (
                                <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded-full">
                                  Org Created
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                  Registered
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 text-[10px] text-right">
                              {new Date(ref.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* CREATE PROMOTER MODAL */}
              {isCreatePromoterOpen && (
                <Modal
                  open={isCreatePromoterOpen}
                  onClose={() => setIsCreatePromoterOpen(false)}
                  title="Register New Field Promoter & Ambassador"
                >
                  <form onSubmit={handleCreateNewPromoter} className="flex flex-col gap-4 text-xs font-medium pt-1">
                    <p className="text-slate-500 text-xs">
                      Register an official field promoter, ambassador, or marketing partner and assign them a tracked referral code.
                    </p>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-900 dark:text-white">
                        Promoter Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={promoterName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPromoterName(val);
                          if (!promoterCode || promoterCode.startsWith("REF-PROM-")) {
                            setPromoterCode(generateCodeFromName(val));
                          }
                        }}
                        placeholder="e.g. Aimé Patrick Mugisha"
                        className="w-full text-xs rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 px-3.5 py-2 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-900 dark:text-white">
                          Assigned Referral Code *
                        </label>
                        <button
                          type="button"
                          onClick={() => setPromoterCode(generateCodeFromName(promoterName))}
                          className="text-[11px] font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="h-3 w-3" /> Auto-Generate Code
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        value={promoterCode}
                        onChange={(e) => setPromoterCode(e.target.value.toUpperCase())}
                        placeholder="e.g. REF-AIME-2026"
                        className="w-full font-mono font-bold text-xs rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 px-3.5 py-2 text-teal-700 dark:text-teal-300 uppercase"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Telephone / WhatsApp Number
                        </label>
                        <input
                          type="text"
                          value={promoterPhone}
                          onChange={(e) => setPromoterPhone(e.target.value)}
                          placeholder="+250 788 000 000"
                          className="w-full text-xs rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 px-3.5 py-2 text-slate-900 dark:text-white"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Email Address (Optional)
                        </label>
                        <input
                          type="email"
                          value={promoterEmail}
                          onChange={(e) => setPromoterEmail(e.target.value)}
                          placeholder="promoter@email.com"
                          className="w-full text-xs rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 px-3.5 py-2 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Assigned Region / Campaign Notes
                        </label>
                        <input
                          type="text"
                          value={promoterNotes}
                          onChange={(e) => setPromoterNotes(e.target.value)}
                          placeholder="e.g. Northern Province Cooperatives"
                          className="w-full text-xs rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 px-3.5 py-2 text-slate-900 dark:text-white"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Commission / Incentive Rate (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={promoterCommission}
                          onChange={(e) => setPromoterCommission(Number(e.target.value))}
                          placeholder="10"
                          className="w-full text-xs rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 px-3.5 py-2 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Live Invite Link Preview */}
                    <div className="p-3 bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 rounded-xl flex flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300">
                        Generated Shareable Signup Link:
                      </span>
                      <span className="font-mono text-xs text-teal-900 dark:text-teal-200 select-all break-all">
                        {typeof window !== "undefined" ? window.location.origin : ""}/register?ref={promoterCode || "CODE"}
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t dark:border-slate-800">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreatePromoterOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="bg-teal-600 hover:bg-teal-700 text-white font-bold"
                      >
                        Create & Activate Promoter
                      </Button>
                    </div>
                  </form>
                </Modal>
              )}
            </div>
          );
        })()}

        {/* 4. STAFF & AUDITORS MANAGEMENT TAB */}
        {activeTab === "staff" && (
          <div className="flex flex-col gap-8 w-full">
            {/* Top Stats Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Total Staff & Auditors</span>
                  <span className="text-2xl font-black font-display text-indigo-600 dark:text-indigo-400 mt-1 block">
                    {staffList.length}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 font-medium block">Active Platform Operators</span>
                </div>
                <div className="h-11 w-11 bg-indigo-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-indigo-600 shadow-xs">
                  <Users className="h-5 w-5" />
                </div>
              </div>

              <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Designated Auditors</span>
                  <span className="text-2xl font-black font-display text-emerald-600 dark:text-emerald-400 mt-1 block">
                    {staffList.filter((s: any) => s.role === "auditor").length}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 font-medium block">MoMo Transaction Reviewers</span>
                </div>
                <div className="h-11 w-11 bg-emerald-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-emerald-600 shadow-xs">
                  <FileCheck className="h-5 w-5" />
                </div>
              </div>

              <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Total Audited Events</span>
                  <span className="text-2xl font-black font-display text-teal-600 dark:text-teal-400 mt-1 block">
                    {auditLogs.length}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 font-medium block">Verified transaction actions</span>
                </div>
                <div className="h-11 w-11 bg-teal-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-teal-600 shadow-xs">
                  <History className="h-5 w-5" />
                </div>
              </div>

              <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Auditor Console</span>
                  <Link to="/auditor" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline mt-1 flex items-center gap-1">
                    Launch Auditor View <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                  <span className="text-[10px] text-slate-500 mt-1 font-medium block">Role-governed screen</span>
                </div>
                <div className="h-11 w-11 bg-purple-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-purple-600 shadow-xs">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* Staff & Auditors Management Section */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col gap-6 w-full">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-black font-display text-slate-900 dark:text-white">
                    Platform Staff & Auditor Directory
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Provision new auditor accounts, assign credentials (username & password), set verification scopes, and manage operator status.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative w-64">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search staff by name or email..."
                      value={staffSearchQuery}
                      onChange={(e) => setStaffSearchQuery(e.target.value)}
                      className="pl-9 text-xs h-10 rounded-xl"
                    />
                  </div>
                  <Button
                    onClick={() => setIsCreateStaffOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-10 px-4 rounded-xl shadow-xs flex items-center gap-2 shrink-0"
                  >
                    <UserPlus className="h-4 w-4" /> Create New Auditor
                  </Button>
                </div>
              </div>

              {/* Staff Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                      <th className="pb-3 font-bold">Operator Profile</th>
                      <th className="pb-3 font-bold">Role & Scopes</th>
                      <th className="pb-3 font-bold">Credentials</th>
                      <th className="pb-3 font-bold">Status</th>
                      <th className="pb-3 font-bold">Last Active</th>
                      <th className="pb-3 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {staffList
                      .filter((s: any) => {
                        const q = staffSearchQuery.toLowerCase();
                        return (
                          s.full_name?.toLowerCase().includes(q) ||
                          s.email?.toLowerCase().includes(q) ||
                          s.username?.toLowerCase().includes(q) ||
                          s.role?.toLowerCase().includes(q)
                        );
                      })
                      .map((staff: any) => {
                        const isSuspended = staff.status === "suspended";
                        const isAuditor = staff.role === "auditor";
                        const isSuperAdmin = staff.role === "superadmin";

                        return (
                          <tr key={staff.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-4">
                              <div className="flex items-center gap-3">
                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                  isSuperAdmin
                                    ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                                    : isAuditor
                                    ? "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                                    : "bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300"
                                }`}>
                                  {staff.full_name?.charAt(0) || "U"}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-900 dark:text-white">
                                    {staff.full_name}
                                  </span>
                                  <span className="text-[11px] text-slate-500 font-mono">
                                    {staff.email} • <span className="text-slate-400">@{staff.username || "user"}</span>
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-4">
                              <div className="flex flex-col gap-1 items-start">
                                <Badge
                                  color={isSuperAdmin ? "green" : isAuditor ? "blue" : "indigo"}
                                  className="text-[10px] font-bold"
                                >
                                  {staff.role === "auditor" ? "AUDITOR (TRANSACTION VERIFICATION)" : staff.role?.toUpperCase()}
                                </Badge>
                                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                                  {staff.permissions?.can_audit_payments && <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">MoMo Queue</span>}
                                  {staff.permissions?.can_view_ledgers && <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">Ledgers</span>}
                                </div>
                              </div>
                            </td>
                            <td className="py-4">
                              <div className="flex items-center gap-2 font-mono text-[11px]">
                                <Key className="h-3.5 w-3.5 text-slate-400" />
                                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">
                                  {staff.password_plain || "••••••••"}
                                </span>
                              </div>
                            </td>
                            <td className="py-4">
                              <Badge color={isSuspended ? "red" : "green"} className="text-[10px]">
                                {isSuspended ? "SUSPENDED" : "ACTIVE"}
                              </Badge>
                            </td>
                            <td className="py-4 text-slate-500 text-[11px] font-mono">
                              {staff.last_active_at ? new Date(staff.last_active_at).toLocaleDateString() : "Pending login"}
                            </td>
                            <td className="py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setResetModalStaff(staff);
                                    setNewPasswordInput("");
                                  }}
                                  className="text-xs h-8 px-2.5 rounded-lg border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                                >
                                  Reset Key
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleToggleStaffStatus(staff.id, staff.status)}
                                  className={`text-xs h-8 px-2.5 rounded-lg ${
                                    isSuspended
                                      ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400"
                                      : "border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400"
                                  }`}
                                >
                                  {isSuspended ? "Activate" : "Suspend"}
                                </Button>
                                {staff.role !== "superadmin" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeleteStaff(staff.id, staff.full_name)}
                                    className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-xs h-8 px-2 rounded-lg"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live Audit Trail for Super Admin Oversight */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col gap-6 w-full">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black font-display text-slate-900 dark:text-white">
                      Auditor Activity Trail & Real-Time Oversight
                    </h3>
                    <Badge color="blue" className="text-[10px] font-mono">LIVE STAMPED</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Every verification, approval, or rejection executed by Auditors is logged here with full notes, timestamps, and operator identity.
                  </p>
                </div>
              </div>

              {auditLogs.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {auditLogs.map((log: any) => {
                    const isApprove = log.action === "approved_subscription" || log.action === "approve";
                    return (
                      <div
                        key={log.id}
                        className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                            isApprove
                              ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300"
                              : "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300"
                          }`}>
                            {isApprove ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs text-slate-900 dark:text-white">
                                {log.auditor_name || "Platform Auditor"}
                              </span>
                              <Badge color={isApprove ? "green" : "red"} className="text-[9px]">
                                {log.action?.toUpperCase().replace("_", " ")}
                              </Badge>
                              {log.entity_id && (
                                <span className="text-[10px] font-mono text-slate-400">
                                  Ref: #{log.entity_id.slice(-6)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                              {log.details?.notes || log.details?.reason || "Audited and verified mobile money transaction proof against platform operator records."}
                            </p>
                            <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono mt-0.5">
                              <span>Amount: <strong className="text-emerald-600">{log.details?.amount_local?.toLocaleString() || "35,000"} RWF</strong></span>
                              <span>Target Org: <strong className="text-slate-700 dark:text-slate-300">{log.details?.org_name || "Cooperative Workspace"}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[11px] font-mono text-slate-400 block">
                            {new Date(log.timestamp || log.created_at).toLocaleString()}
                          </span>
                          <span className="text-[10px] bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded font-mono font-semibold inline-block mt-1">
                            Auditor Role: {log.auditor_role || "Auditor"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <p className="text-xs text-slate-400 font-medium">No auditor actions recorded yet.</p>
                </div>
              )}
            </div>

            {/* Modal: Create Auditor / Staff Member */}
            {isCreateStaffOpen && (
              <Modal
                title="Create Platform Operator / Auditor Account"
                isOpen={isCreateStaffOpen}
                onClose={() => setIsCreateStaffOpen(false)}
              >
                <form onSubmit={handleCreateStaff} className="flex flex-col gap-4 text-xs font-medium">
                  <p className="text-slate-500">
                    Create credentials for a designated auditor to review Mobile Money proofs, audit organization ledgers, and confirm transaction validity.
                  </p>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Auditor Full Name *</label>
                    <Input
                      placeholder="e.g. Aimé Uwase"
                      value={staffFullName}
                      onChange={(e) => setStaffFullName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-slate-700 dark:text-slate-300">Auditor Email Address *</label>
                      <Input
                        type="email"
                        placeholder="e.g. aime@impacto.rw"
                        value={staffEmail}
                        onChange={(e) => setStaffEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-slate-700 dark:text-slate-300">Username</label>
                      <Input
                        placeholder="e.g. aime.auditor"
                        value={staffUsername}
                        onChange={(e) => setStaffUsername(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-slate-700 dark:text-slate-300">Assigned Password *</label>
                      <button
                        type="button"
                        onClick={() => setStaffPassword(`auditor_${Math.random().toString(36).slice(-6)}`)}
                        className="text-[10px] text-indigo-600 hover:underline font-bold"
                      >
                        Generate Random
                      </button>
                    </div>
                    <Input
                      type="text"
                      placeholder="Password"
                      value={staffPassword}
                      onChange={(e) => setStaffPassword(e.target.value)}
                      required
                    />
                    <span className="text-[10px] text-slate-400">Auditor can log in with this username/email & password.</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Operator Role</label>
                    <select
                      value={staffRole}
                      onChange={(e: any) => setStaffRole(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="auditor">Auditor (MoMo Transaction Approval & Ledger Audit)</option>
                      <option value="support">Support Specialist (Ticketing & Workspace Assistance)</option>
                      <option value="superadmin">Super Admin (Full System & Config Access)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Verification Scopes</label>
                    <div className="flex flex-col gap-2 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={staffPerms.can_audit_payments}
                          onChange={(e) => setStaffPerms({ ...staffPerms, can_audit_payments: e.target.checked })}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Authorize and reject Mobile Money subscription proofs</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={staffPerms.can_view_ledgers}
                          onChange={(e) => setStaffPerms({ ...staffPerms, can_view_ledgers: e.target.checked })}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Inspect cross-tenant transaction ledgers and export audit logs</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Internal Audit Notes / Department</label>
                    <Input
                      placeholder="e.g. Operations & Compliance desk, Rwanda region"
                      value={staffNotes}
                      onChange={(e) => setStaffNotes(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateStaffOpen(false)}
                      className="text-xs h-10 px-4 rounded-xl"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 px-6 rounded-xl shadow-xs"
                    >
                      Save Auditor Account
                    </Button>
                  </div>
                </form>
              </Modal>
            )}

            {/* Modal: Reset Password */}
            {resetModalStaff && (
              <Modal
                title={`Reset Password for ${resetModalStaff.full_name}`}
                isOpen={!!resetModalStaff}
                onClose={() => setResetModalStaff(null)}
              >
                <form onSubmit={handleResetPassword} className="flex flex-col gap-4 text-xs">
                  <p className="text-slate-500">
                    Assign a new login password for <strong>{resetModalStaff.email}</strong>.
                  </p>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-slate-700 dark:text-slate-300">New Password</label>
                    <Input
                      type="text"
                      placeholder="Enter new password..."
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      required
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setResetModalStaff(null)}
                      className="text-xs h-10 px-4 rounded-xl"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 px-5 rounded-xl shadow-xs"
                    >
                      Update Password
                    </Button>
                  </div>
                </form>
              </Modal>
            )}
          </div>
        )}

        {/* 4. SUPPORT & INCIDENT CENTER TAB */}
        {activeTab === "errors" && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col gap-6 w-full">
            <div>
              <h3 className="text-base font-black font-display text-slate-900 dark:text-white">Support & Incident Tickets Center</h3>
              <p className="text-xs text-slate-500 mt-0.5">Direct communication channel with cooperative workspaces experiencing support inquiries or technical issues.</p>
            </div>

            <div className="flex flex-col gap-4">
              {errors && errors.length > 0 ? (
                errors.map((errItem: any) => {
                  const isResolved = errItem.status === "resolved";
                  const isChatOpen = activeChatId === errItem.id;
                  const matchedOrg = orgs.find((o: any) => o.id === errItem.org_id);
                  const fullMessage = errItem.description || errItem.error_message || errItem.message || "No detailed message provided.";

                  return (
                    <div key={errItem.id} className="p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 rounded-2xl flex flex-col gap-4 shadow-xs">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${isResolved ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>
                            {isResolved ? <CheckCircle className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
                          </div>
                          <div className="flex flex-col gap-1.5 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black text-slate-900 dark:text-white font-display">
                                {matchedOrg?.name || errItem.org_name || "Cooperative Workspace"}
                              </span>
                              <span className="text-[11px] font-mono text-slate-500 bg-slate-200/60 dark:bg-slate-700/60 px-2 py-0.5 rounded">
                                {errItem.page || "Support Portal"}
                              </span>
                              <Badge color={isResolved ? "green" : "amber"}>
                                {isResolved ? "Resolved" : "Pending Support"}
                              </Badge>
                            </div>

                            {/* Complete Message View */}
                            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed shadow-2xs font-sans">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                                Full Submitted Incident Message:
                              </span>
                              {fullMessage}
                            </div>

                            <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono mt-0.5">
                              <span>Reported: {new Date(errItem.created_at).toLocaleString()}</span>
                              {errItem.user_email && <span>• Submitter: <strong className="text-slate-700 dark:text-slate-300">{errItem.user_email}</strong></span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs font-bold h-9 px-3 rounded-xl border-slate-300 dark:border-slate-700 flex items-center gap-1.5"
                            onClick={() => {
                              setActiveChatId(isChatOpen ? "" : errItem.id);
                            }}
                          >
                            <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                            {isChatOpen ? "Hide Chat" : "Chat & Reply"}
                          </Button>
                          {!isResolved && (
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9 px-3 rounded-xl shadow-xs" onClick={() => handleResolveBugDirect(errItem.id)}>
                              Resolve Ticket
                            </Button>
                          )}
                        </div>
                      </div>

                      {errItem.admin_notes && (
                        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 flex flex-col gap-1">
                          <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-700 dark:text-emerald-400">
                            Super Admin Response Dispatched:
                          </span>
                          <p className="whitespace-pre-wrap">{errItem.admin_notes}</p>
                        </div>
                      )}

                      {isChatOpen && (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (!tempReply.trim()) return;
                            handleSendChatReply(e);
                          }}
                          className="flex items-center gap-3 pt-3 border-t border-slate-200 dark:border-slate-700 animate-in fade-in"
                        >
                          <Input
                            placeholder={`Type live support reply to ${matchedOrg?.name || 'organization'}...`}
                            value={tempReply}
                            onChange={(e) => setTempReply(e.target.value)}
                            className="flex-1 text-xs"
                          />
                          <Button
                            type="submit"
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-5 rounded-xl shadow-xs flex items-center gap-1.5"
                          >
                            <Send className="h-4 w-4" />
                            Send Reply
                          </Button>
                        </form>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <p className="text-xs text-slate-400 font-medium">No support tickets reported.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. GLOBAL BILLING CONFIG TAB */}
        {activeTab === "billing_setup" && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col gap-6 w-full max-w-3xl">
            <div>
              <h3 className="text-base font-black font-display text-slate-900 dark:text-white">Global Revenue & Exchange Rates Configuration</h3>
              <p className="text-xs text-slate-500 mt-0.5">Configure currency conversion benchmarks and MTN / Airtel MoMo collection merchant numbers.</p>
            </div>

            <form onSubmit={handleSavePlatformSettings} className="flex flex-col gap-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">USD to RWF Rate</label>
                  <Input type="number" value={usdRate} onChange={(e) => setUsdRate(Number(e.target.value))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">EUR to RWF Rate</label>
                  <Input type="number" value={eurRate} onChange={(e) => setEurRate(Number(e.target.value))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">KES to RWF Rate</label>
                  <Input type="number" value={kesRate} onChange={(e) => setKesRate(Number(e.target.value))} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>MTN MoMo Collection Number</span>
                    <span className="text-[10px] font-normal text-slate-400">Optional</span>
                  </label>
                  <Input type="text" value={mtnNum} onChange={(e) => setMtnNum(e.target.value)} placeholder="e.g. 078XXXXXXXX (or leave blank)" />
                  <span className="text-[10px] text-slate-400">10 digits starting with 07, or leave blank if using merchant code only</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Airtel Money Collection Number</span>
                    <span className="text-[10px] font-normal text-slate-400">Optional</span>
                  </label>
                  <Input type="text" value={airtelNum} onChange={(e) => setAirtelNum(e.target.value)} placeholder="e.g. 073XXXXXXXX (or leave blank)" />
                  <span className="text-[10px] text-slate-400">10 digits starting with 07, or leave blank if using merchant code only</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>MTN MoMo Pay Merchant Code (*182*8*1*code#)</span>
                    <span className="text-[10px] font-normal text-slate-400">Recommended</span>
                  </label>
                  <Input type="text" value={momoMerchantCode} onChange={(e) => setMomoMerchantCode(e.target.value)} placeholder="e.g. 880099 (or leave blank)" />
                  <span className="text-[10px] text-slate-400">Merchant settlement code used for auto-generating *182*8*1*&#123;&#123;code&#125;&#125;#</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Merchant Registered Legal Entity Name</label>
                  <Input type="text" value={mName} onChange={(e) => setMName(e.target.value)} placeholder="VIRELLIX INC" />
                  <span className="text-[10px] text-slate-400">Official business name displayed on payment prompts</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-6 rounded-xl shadow-xs">
                  Save Operator Billing Settings
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* 6. DATABASE HEALTH TAB */}
        {activeTab === "db_status" && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col gap-6 w-full">
            <div>
              <h3 className="text-base font-black font-display text-slate-900 dark:text-white">Live Database Health & Usage</h3>
              <p className="text-xs text-slate-500 mt-0.5">Real-time Supabase PostgreSQL telemetry, record counts, and connection health.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/50 rounded-xl flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Connection Status</span>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-sm font-black text-slate-900 dark:text-white">Active</span>
                </div>
              </div>
              
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/50 rounded-xl flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Users</span>
                <span className="text-xl font-black text-slate-900 dark:text-white">{platformData?.totalUsers || 0}</span>
              </div>
              
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/50 rounded-xl flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Org Members</span>
                <span className="text-xl font-black text-slate-900 dark:text-white">{platformData?.totalMembers || 0}</span>
              </div>
              
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/50 rounded-xl flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Tenants (Orgs)</span>
                <span className="text-xl font-black text-slate-900 dark:text-white">{orgs.length}</span>
              </div>
            </div>
            
            <div className="p-4 bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-100 dark:border-cyan-900 rounded-xl flex flex-col gap-2">
              <div className="flex items-center gap-2 text-cyan-800 dark:text-cyan-300">
                <Database className="h-4 w-4" />
                <span className="text-sm font-bold">Storage & Usage Estimate</span>
              </div>
              <p className="text-xs text-cyan-700 dark:text-cyan-400 leading-relaxed">
                The database is operating normally. You have {orgs.length} active organizations utilizing a combined total of {platformData?.totalMembers || 0} member records. All core tables are fully indexed. Active connection to Supabase instance established.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 px-6 text-center text-xs text-slate-500 font-medium">
        IMPACTO Platform Superadmin Governance Console • Secure Multi-Tenant Operations & Billing Gateway
      </footer>
    </div>
  );
};
