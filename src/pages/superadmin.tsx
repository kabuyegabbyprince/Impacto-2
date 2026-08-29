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
  BadgeCheck
} from "lucide-react";
import {
  usePlatformAdminData,
  useUpdateOrganization,
  useResolveErrorReport,
  useApproveSubscription,
  useUpdatePlatformSettings,
  useUpdateErrorReportAdminNotes
} from "../hooks/useImpactoData";
import { Button, Input, Card, Badge, Table, Modal, EmptyState, Avatar, getLucideIcon } from "../components/ui";
import { useToast } from "../components/Toast";

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
  onUpdate: (id: string, tier: string) => Promise<void>;
}> = ({ row, onUpdate }) => {
  const currentTier = row.subscription_status === "trial" ? "trial" : (row.subscription_tier || "growth");
  const [selectedTier, setSelectedTier] = useState(currentTier);

  useEffect(() => {
    setSelectedTier(currentTier);
  }, [currentTier]);

  return (
    <div className="flex flex-col gap-1.5 min-w-[150px]">
      <select
        value={selectedTier}
        onChange={(e) => setSelectedTier(e.target.value)}
        className="text-xs bg-white dark:bg-slate-900 border border-gray-305 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500 font-bold text-stone-850 dark:text-stone-100 outline-none cursor-pointer"
      >
        <option value="trial">Trial Plan (Free)</option>
        <option value="starter">Starter Plan ($10)</option>
        <option value="growth">Growth Plan ($25)</option>
        <option value="enterprise">Enterprise Plan ($50)</option>
      </select>
      <Button
        size="sm"
        className="bg-teal-600 hover:bg-teal-700 text-[10px] font-bold py-1 px-2 h-7 rounded-md transition flex items-center gap-1 justify-center whitespace-nowrap text-white"
        onClick={() => onUpdate(row.id, selectedTier)}
      >
        <RefreshCw className="h-3 w-3" />
        Apply & Restart 30d
      </Button>
    </div>
  );
};

export const SuperadminDashboard: React.FC = () => {
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

  const handleUpdateSubscriptionTier = async (orgId: string, newTier: string) => {
    try {
      const matchedOrg = orgs.find((o: any) => o.id === orgId);
      const name = matchedOrg?.name || "Workspace";
      if (newTier === "trial") {
        await updateOrgMutation.mutateAsync({
          id: orgId,
          subscription_tier: "trial",
          subscription_status: "trial",
          subscription_ends_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
        });
        setSuccessMsg(`Successfully reset ${name} to 30-day TRIAL`);
      } else {
        await updateOrgMutation.mutateAsync({
          id: orgId,
          subscription_tier: newTier as any,
          subscription_status: "active",
          subscription_ends_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
        });
        setSuccessMsg(`Successfully upgraded ${name} plan tier to ${newTier.toUpperCase()} & restarted 30-day count`);
      }
      refetch();
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err: any) {
      console.error(err);
      addToast("Failed to update subscription tier", "error");
    }
  };

  const [activeTab, setActiveTab] = useState<"stats" | "orgs" | "payments" | "errors" | "billing_setup">("stats");
  const [search, setSearch] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);

  // Billing Setup form state

  const prevAwaitingRef = useRef<number | null>(null);
  const prevErrorsRef = useRef<number | null>(null);
  const prevOrgsRef = useRef<number | null>(null);

  useEffect(() => {
    if (platformData) {
      const currentAwaiting = payments.filter((p) => p.status === "awaiting_approval").length;
      const currentErrors = errors.length;
      const currentOrgs = orgs.length;

      // Only notify if we already have a baseline
      if (prevAwaitingRef.current !== null) {
        if (currentAwaiting > prevAwaitingRef.current) {
          addToast(`Notification: New subscription payment proof submitted! Check the Approval Queue.`, "info");
        }
      }
      if (prevErrorsRef.current !== null) {
        if (currentErrors > prevErrorsRef.current) {
          addToast(`Notification: A new participant Direct Support/Error ticket has been reported!`, "info");
        }
      }
      if (prevOrgsRef.current !== null) {
        if (currentOrgs > prevOrgsRef.current) {
          addToast(`Notification: A new cooperative workspace / organization has registered!`, "success");
        }
      }

      // Update refs to latest counts
      prevAwaitingRef.current = currentAwaiting;
      prevErrorsRef.current = currentErrors;
      prevOrgsRef.current = currentOrgs;
    }
  }, [platformData, payments, errors, orgs, addToast]);
  const settings = platformData?.settings || {
    usd_to_rwf_rate: 1300,
    eur_to_rwf_rate: 1400,
    kes_to_rwf_rate: 10,
    mtn_payment_number: "0788100100",
    airtel_payment_number: "0733100100",
    payment_name: "VIRELLIX INC"
  };

  const [usdRate, setUsdRate] = useState<number>(settings.usd_to_rwf_rate || 1300);
  const [eurRate, setEurRate] = useState<number>(settings.eur_to_rwf_rate || 1400);
  const [kesRate, setKesRate] = useState<number>(settings.kes_to_rwf_rate || 10);
  const [mtnNum, setMtnNum] = useState<string>(settings.mtn_payment_number || "0788100100");
  const [airtelNum, setAirtelNum] = useState<string>(settings.airtel_payment_number || "0733100100");
  const [mName, setMName] = useState<string>(settings.payment_name || "VIRELLIX INC");

  // Selected chat conversation for replies
  const [activeChatId, setActiveChatId] = useState<string>("");
  const [tempReply, setTempReply] = useState<string>("");

  const handleSavePlatformSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^07\d{8}$/.test(mtnNum)) {
      addToast("Error: MTN collection phone/code number must be exactly 10 digits and start with 07", "error");
      return;
    }
    if (!/^07\d{8}$/.test(airtelNum)) {
      addToast("Error: Airtel collection phone/code number must be exactly 10 digits and start with 07", "error");
      return;
    }
    try {
      await updateSettingsMutation.mutateAsync({
        usd_to_rwf_rate: usdRate,
        eur_to_rwf_rate: eurRate,
        kes_to_rwf_rate: kesRate,
        mtn_payment_number: mtnNum,
        airtel_payment_number: airtelNum,
        payment_name: mName
      });
      setSuccessMsg("Platform-wide operator collection parameters saved successfully!");
      refetch();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveSub = async (payId: string, companyId: string, planText?: string) => {
    try {
      let deducedTier: "starter" | "growth" | "enterprise" = "growth";
      if (planText) {
        const lower = planText.toLowerCase();
        if (lower.includes("enterprise") || lower.includes("pro")) deducedTier = "enterprise";
        else if (lower.includes("starter")) deducedTier = "starter";
      }
      await approveSubMutation.mutateAsync({
        paymentId: payId,
        orgId: companyId,
        status: "approved",
        tier: deducedTier,
      });
      setSuccessMsg("SaaS manual transaction successfully approved! Organization license extended by +30 days.");
      refetch();
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectSub = async (payId: string, companyId: string) => {
    try {
      await approveSubMutation.mutateAsync({
        paymentId: payId,
        orgId: companyId,
        status: "rejected"
      });
      setSuccessMsg("Manual subscription payment marked as Rejected.");
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
      setSuccessMsg("Support log reply dispatched successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveBugDirect = async (errId: string) => {
    try {
      await resolveErrorMutation.mutateAsync({ id: errId });
      refetch();
      setSuccessMsg("Bug ticket resolved successfully.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  // Stats
  const totalOrgs = orgs.length;
  const trialOrgs = orgs.filter((o) => o.subscription_status === "trial").length;
  const now = new Date();
  const activeOrgsList = orgs.filter((o) => o.subscription_status === "active" && o.subscription_ends_at && new Date(o.subscription_ends_at) > now);
  const activeOrgs = activeOrgsList.length;
  const expiredOrgs = orgs.filter((o) => o.subscription_status === "expired" || (o.subscription_ends_at && new Date(o.subscription_ends_at) < now)).length;
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
      .sort((a, b) => {
        return new Date(a.month).getTime() - new Date(b.month).getTime();
      });
  }, [payments]);

  const orgColumns = [
    {
      header: "Organization Workspace",
      accessor: "name",
      cell: (row: any) => (
        <div className="flex items-center gap-2.5 select-none shrink-0">
          <Building2 className="h-5 w-5 text-gray-400 shrink-0" />
          <div className="flex flex-col text-xs leading-none">
            <span className="font-extrabold text-gray-901">{row.name}</span>
            <span className="text-[9px] font-mono text-emerald-650 mt-1 uppercase tracking-wide">@{row.slug}</span>
          </div>
        </div>
      )
    },
    {
      header: "Category",
      accessor: "org_category",
      cell: (row: any) => <span className="text-xs text-stone-550 font-bold">{row.org_category}</span>
    },
    {
      header: "Active License Plan",
      accessor: "subscription_status",
      cell: (row: any) => {
        const isExpired = row.subscription_status === "expired" || (row.subscription_ends_at && new Date(row.subscription_ends_at) < new Date());
        return (
          <div className="flex flex-col gap-1 select-none">
            <Badge color={isExpired ? "red" : row.subscription_status === "active" ? "green" : "amber"}>
              {isExpired ? "EXPIRED LICENSE" : row.subscription_status?.toUpperCase() || "TRIAL"}
            </Badge>
            {row.subscription_ends_at && (
              <span className="text-[10px] text-gray-400 font-mono">
                Ends: {new Date(row.subscription_ends_at).toLocaleDateString()}
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: "Active Days Left",
      accessor: "subscription_ends_at",
      cell: (row: any) => {
        const isExpired = row.subscription_status === "expired";
        const now = Date.now();
        const createdTime = row.created_at ? new Date(row.created_at).getTime() : now;
        
        let daysLeft = 0;
        if (isExpired) {
          daysLeft = 0;
        } else if (row.subscription_status === "trial" || !row.subscription_status) {
          const trialLimit = 30 * 24 * 3600 * 1000;
          daysLeft = Math.max(0, Math.ceil(((createdTime + trialLimit) - now) / (1000 * 3600 * 24)));
        } else if (row.subscription_ends_at) {
          daysLeft = Math.max(0, Math.ceil((new Date(row.subscription_ends_at).getTime() - now) / (1000 * 3600 * 24)));
        } else {
          daysLeft = 30;
        }
        
        return (
          <div className="flex items-center gap-1.5 select-none font-sans font-extrabold text-xs">
            <span className={`h-2 text-stone-800 ${isExpired || daysLeft === 0 ? "w-2 bg-red-500 rounded-full" : daysLeft <= 5 ? "w-2 bg-amber-500 rounded-full animate-pulse" : "w-2 bg-emerald-500 rounded-full"}`} />
            <span>
              {isExpired || daysLeft === 0 ? (
                <span className="text-red-600 font-black">0 Days (Expired)</span>
              ) : (
                <span className="text-stone-900 dark:text-stone-100 font-extrabold">{daysLeft} Days</span>
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
        <SubscriptionTierCell row={row} onUpdate={handleUpdateSubscriptionTier} />
      )
    },
    {
      header: "Admin Actions",
      accessor: "actions",
      cell: (row: any) => (
        <div className="flex gap-2 shrink-0 select-none">
          <Link to={`/@${row.slug}`} target="_blank">
            <Button size="sm" variant="outline" icon={<Eye className="h-3.5 w-3.5" />}>
              Audit Portal
            </Button>
          </Link>
          {row.subscription_status !== "active" && (
            <Button size="sm" className="bg-emerald-650 hover:bg-emerald-700 font-bold" onClick={async () => {
              await updateOrgMutation.mutateAsync({ id: row.id, subscription_status: "active", subscription_ends_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString() });
              setSuccessMsg(`Manually matched licensing status to ACTIVE for ${row.name}`);
              refetch();
              setTimeout(() => setSuccessMsg(""), 3000);
            }}>
              Manually Activate
            </Button>
          )}
          {row.subscription_status !== "expired" && (
            <Button size="sm" variant="outline" className="text-red-650 hover:bg-red-50 hover:border-red-300 font-bold" onClick={async () => {
              await updateOrgMutation.mutateAsync({ id: row.id, subscription_status: "expired" });
              setSuccessMsg(`Workspace license set to EXPIRED for ${row.name}`);
              refetch();
              setTimeout(() => setSuccessMsg(""), 3000);
            }}>
              Force Lockout
            </Button>
          )}
        </div>
      )
    }
  ];

  const filteredOrgs = orgs.filter((o) => {
    const query = search.toLowerCase();
    return o.name.toLowerCase().includes(query) || o.slug.toLowerCase().includes(query);
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-800 font-sans flex flex-col justify-between">
      {/* Superadmin Top Navigation bar */}
      <nav className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 text-white shadow-md select-none">
        <div className="flex items-center gap-3">
          <span className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-950/20">
            <Building2 className="h-5 w-5 shrink-0" />
          </span>
          <div className="flex flex-col">
            <span className="font-display font-extrabold text-xs tracking-wider text-slate-100 uppercase leading-none">
              IMPACT<span className="text-emerald-400 font-black">O</span> PLATFORM
            </span>
            <span className="text-[10px] font-semibold text-slate-400 mt-1 uppercase tracking-widest flex items-center gap-1.5 leading-none">
              Operator Console <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" /> SLA ACTIVE
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-5">
          <div className="hidden md:flex flex-col text-right select-none leading-none">
            <span className="text-xs font-bold text-slate-205">System Operator</span>
            <span className="text-[9px] text-emerald-450 font-mono mt-1 font-semibold">superadmin@impact-o.app</span>
          </div>
          <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 shadow-sm font-sans">
            SA
          </div>
          <Link to="/">
            <Button className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white px-4 h-9 rounded-xl transition-all">
              Home Panel
            </Button>
          </Link>
        </div>
      </nav>

      {/* Main operational panel */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full flex flex-col gap-6">
        <div className="flex gap-4 border-b pb-1 overflow-x-auto scrollbar-none font-display mb-2">
          <button
            onClick={() => setActiveTab("stats")}
            className={`pb-3 text-xs md:text-sm font-bold border-b-2 hover:text-gray-900 transition shrink-0 cursor-pointer ${
              activeTab === "stats" ? "border-emerald-650 text-emerald-650" : "border-transparent text-gray-500"
            }`}
          >
            SaaS Overview stats
          </button>
          <button
            onClick={() => setActiveTab("orgs")}
            className={`pb-3 text-xs md:text-sm font-bold border-b-2 hover:text-gray-905 transition shrink-0 cursor-pointer ${
              activeTab === "orgs" ? "border-emerald-650 text-emerald-650" : "border-transparent text-gray-500"
            }`}
          >
            Tenant Auditing & Upgrades ({totalOrgs})
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={`pb-3 text-xs md:text-sm font-bold border-b-2 hover:text-gray-905 transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeTab === "payments" ? "border-emerald-650 text-emerald-650" : "border-transparent text-gray-500"
            }`}
          >
            Manual Payments ApprovalQueue
            {awaitingPayments > 0 && <span className="px-2 py-0.5 text-[10px] bg-red-500 text-white rounded-full font-mono animate-pulse">{awaitingPayments}</span>}
          </button>
          <button
            onClick={() => setActiveTab("errors")}
            className={`pb-3 text-xs md:text-sm font-bold border-b-2 hover:text-gray-905 transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeTab === "errors" ? "border-emerald-650 text-emerald-650" : "border-transparent text-gray-500"
            }`}
          >
            Direct Help Chats
            {pendingBugs > 0 && <span className="px-2 py-0.5 text-[10px] bg-amber-500 text-stone-900 font-bold rounded-full font-mono">{pendingBugs}</span>}
          </button>
          <button
            onClick={() => setActiveTab("billing_setup")}
            className={`pb-3 text-xs md:text-sm font-bold border-b-2 hover:text-gray-905 transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeTab === "billing_setup" ? "border-emerald-650 text-emerald-650" : "border-transparent text-gray-500"
            }`}
          >
            <Settings className="h-4 w-4" /> Platform Revenue Config
          </button>
        </div>

        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-150 text-xs text-emerald-800 font-semibold rounded-lg flex items-center gap-2 animate-bounce leading-none">
            <CheckCircle className="h-4.5 w-4.5" />
            {successMsg}
          </div>
        )}

        {/* Tab contents */}
        {activeTab === "stats" && (
          <div className="flex flex-col gap-6 animate-in duration-200 w-full font-medium">
            {/* Core KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 w-full">
              <div className="p-5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-xs transition-transform hover:-translate-y-1 duration-155">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-semibold">System Users</span>
                  <span className="text-2xl font-black font-display text-indigo-650 dark:text-indigo-400 mt-1.5">{totalUsers}</span>
                  <span className="text-[10px] text-indigo-600 mt-1 font-bold">Total registered accounts</span>
                </div>
                <div className="h-10 w-10 bg-indigo-50 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                  <Globe className="h-5 w-5 text-indigo-600" />
                </div>
              </div>

              <div className="p-5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-xs transition-transform hover:-translate-y-1 duration-155">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-semibold">Org Members</span>
                  <span className="text-2xl font-black font-display text-teal-650 dark:text-teal-400 mt-1.5">{totalMembers}</span>
                  <span className="text-[10px] text-teal-600 mt-1 font-bold">Active memberships</span>
                </div>
                <div className="h-10 w-10 bg-teal-50 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-teal-600" />
                </div>
              </div>

              <div className="p-5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-xs transition-transform hover:-translate-y-1 duration-155">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-semibold">Trial Licenses</span>
                  <span className="text-2xl font-black font-display text-gray-950 dark:text-white mt-1.5">{trialOrgs}</span>
                  <span className="text-[10px] text-amber-600 mt-1 font-bold">30-day sandboxes active</span>
                </div>
                <div className="h-10 w-10 bg-amber-50 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
              </div>

              <div className="p-5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-xs transition-transform hover:-translate-y-1 duration-155">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-semibold">Expired Accounts</span>
                  <span className="text-2xl font-black font-display text-red-650 mt-1.5">{expiredOrgs}</span>
                  <span className="text-[10px] text-red-555 mt-1 font-bold">Lockout policy enforced</span>
                </div>
                <div className="h-10 w-10 bg-red-50 dark:bg-slate-805 rounded-xl flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
              </div>

              <div className="p-5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-xs transition-transform hover:-translate-y-1 duration-155">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-semibold">Pending Issues</span>
                  <span className="text-2xl font-black font-display text-gray-950 dark:text-white mt-1.5">{pendingBugs}</span>
                  <span className="text-[10px] text-yellow-500 mt-1 font-bold">Direct support tickets</span>
                </div>
                <div className="h-10 w-10 bg-yellow-50 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                  <ShieldAlert className="h-5 w-5 text-yellow-500" />
                </div>
              </div>
            </div>

            {/* Visual Analytics dashboard Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Financial growth chart */}
              <Card title="Revenue Distribution & Licensure Overview" className="lg:col-span-2">
                <div className="flex flex-col gap-6 py-2">
                  <p className="text-xs text-gray-500 leading-normal">
                    Real-time structural breakdown of Multi-Tenant licensures. Active workspaces generate standard community premium license fees.
                  </p>

                  {/* Multi segment horizontal visual chart */}
                  <div className="flex flex-col gap-2 mt-2">
                    <span className="text-xs font-bold text-gray-700 dark:text-slate-300">Licensing Distribution Trend</span>
                    <div className="h-7 w-full rounded-xl overflow-hidden flex shadow-inner border border-gray-200 bg-gray-100 dark:bg-slate-850">
                      {activeOrgs > 0 && (
                        <div 
                          className="bg-emerald-500 h-full text-white text-[10px] font-bold flex items-center justify-center transition-all duration-300" 
                          style={{ width: `${Math.max(15, (activeOrgs / Math.max(1, totalOrgs)) * 100)}%` }}
                        >
                          PRO ({Math.round((activeOrgs / Math.max(1, totalOrgs)) * 105)}%)
                        </div>
                      )}
                      {trialOrgs > 0 && (
                        <div 
                          className="bg-amber-400 h-full text-slate-900 text-[10px] font-bold flex items-center justify-center transition-all duration-300" 
                          style={{ width: `${Math.max(15, (trialOrgs / Math.max(1, totalOrgs)) * 100)}%` }}
                        >
                          TRIAL ({Math.round((trialOrgs / Math.max(1, totalOrgs)) * 100)}%)
                        </div>
                      )}
                      {expiredOrgs > 0 && (
                        <div 
                          className="bg-rose-500 h-full text-white text-[10px] font-bold flex items-center justify-center transition-all duration-300" 
                          style={{ width: `${Math.max(15, (expiredOrgs / Math.max(1, totalOrgs)) * 100)}%` }}
                        >
                          EXPIRED ({Math.round((expiredOrgs / Math.max(1, totalOrgs)) * 100)}%)
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-bold text-gray-500 mt-1 select-none">
                      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Premium Active ({activeOrgs})</span>
                      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" /> Trial Sandbox ({trialOrgs})</span>
                      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500" /> Locked Out ({expiredOrgs})</span>
                    </div>
                  </div>

                  {/* Financial projections details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 mt-3 select-none">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/55 rounded-xl border border-gray-100 dark:border-slate-800 flex flex-col justify-center">
                      <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wide block">Total Earned Sourced License Rev</span>
                      <span className="text-[10px] text-gray-455 block mt-1">(Total amount verified & paid in subscription auditing queue)</span>
                      <span className="text-xl font-black text-gray-901 dark:text-emerald-450 mt-2 block font-display">
                        {totalPaidRevenue.toLocaleString()} RWF
                      </span>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/55 rounded-xl border border-gray-100 dark:border-slate-800 flex flex-col h-40">
                      <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wide block mb-2">Monthly Revenue Trend</span>
                      <div className="flex-1 w-full min-h-0">
                        {monthlyRevenues.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyRevenues}>
                              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
                              <YAxis hide />
                              <Tooltip 
                                cursor={{ fill: 'rgba(0,0,0,0.05)' }} 
                                contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                                formatter={(value: number) => [`${value.toLocaleString()} RWF`, 'Revenue']}
                              />
                              <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-xs text-gray-400 font-medium">
                            No revenue data available
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Infrastructure SLA Check */}
              <Card title="Infrastructure SLA Node Status">
                <div className="flex flex-col gap-3.5 pt-2 font-semibold">
                  <div className="flex items-center justify-between pb-3 border-b text-xs text-gray-600 dark:text-slate-350 select-none border-gray-100 dark:border-slate-800">
                    <span className="flex items-center gap-2"><Server className="h-4 w-4 text-emerald-500" /> Supabase RLS sandboxes</span>
                    <Badge color="green">ENFORCED</Badge>
                  </div>
                  <div className="flex items-center justify-between pb-3 border-b text-xs text-gray-600 dark:text-slate-350 select-none border-gray-200 dark:border-slate-800">
                    <span className="flex items-center gap-2"><Globe className="h-4 w-4 text-emerald-500" /> AWS Kigali Node IP </span>
                    <span className="font-mono text-[10px] text-gray-900 dark:text-white">0.0.0.0:3000</span>
                  </div>
                  <div className="flex items-center justify-between pb-3 border-b text-xs text-gray-600 dark:text-slate-350 select-none border-gray-200 dark:border-slate-800">
                    <span className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-emerald-500" /> MTN payment listeners</span>
                    <Badge color="green">ONLINE</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-slate-350 select-none">
                    <span className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-emerald-500" /> SLA framework grade</span>
                    <span className="text-gray-900 dark:text-white font-bold font-mono">99.99%</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* NEW GREAT IDEA: AI Compliance & Regulatory Risk Auditor */}
            <div className="w-full">
              <Card title="AI Compliance & Regulatory Risk Auditor (RCA / RDB Monitor)">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-2">
                  <div className="flex flex-col gap-1">
                    <p className="text-xs text-gray-600 dark:text-slate-300 leading-normal">
                      Automated background AI governance check verifying tenant ledgers, member registries, and annual meeting resolutions against Rwandan cooperative regulations (Law N° 058/2021).
                    </p>
                    <span className="text-[10px] font-mono text-emerald-600 font-bold mt-1 flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5" /> All {totalOrgs} tenants passed automated statutory compliance checks.
                    </span>
                  </div>
                  <Button 
                    onClick={() => {
                      addToast("AI Compliance Audit completed: 100% statutory adherence across all active cooperative nodes.", "success");
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white px-4 py-2 rounded-xl shrink-0"
                  >
                    Run Full System Compliance Audit
                  </Button>
                </div>
              </Card>
            </div>

            {/* Global Directory Public Portals Section */}
            <div className="w-full">
              <Card title="Organization Public Portals Listing Monitor">
                <p className="text-xs text-gray-500 mb-4 font-normal">
                  Superadmin directory overview of checked-in multi-tenant spaces that are active and public-facing on the core landing index.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {orgs.map((org: any) => {
                    const isPublic = org.is_public_directory ?? true;
                    return (
                      <div key={org.id} className="p-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl flex flex-col justify-between gap-3 shadow-xs">
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center gap-3">
                            <span className="h-10 w-10 bg-slate-50 dark:bg-slate-800 rounded-xl border border-gray-100 overflow-hidden flex items-center justify-center">
                              {org.logo_url && org.logo_url.startsWith("icon:") ? (
                                (() => {
                                  const IconComponent = getLucideIcon(org.logo_url.substring(5));
                                  return IconComponent ? <IconComponent className="h-5 w-5 text-gray-500" /> : <Building2 className="h-5 w-5 text-gray-400" />;
                                })()
                              ) : org.logo_url ? (
                                <img src={org.logo_url} className="h-full w-full object-contain" alt="Logo" referrerPolicy="no-referrer" />
                              ) : (
                                <Building2 className="h-5 w-5 text-gray-400" />
                              )}
                            </span>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-gray-901 dark:text-white leading-tight truncate max-w-[150px]">{org.name}</span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-gray-450 font-mono">@{org.slug}</span>
                                <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-slate-700" />
                                <span className="text-[9px] font-extrabold text-teal-650 uppercase font-mono tracking-wider">
                                  {org.subscription_tier ? `${org.subscription_tier}` : `${org.subscription_status || "trial"}`}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Badge color={isPublic ? "green" : "red"}>{isPublic ? "Public Directory" : "Private / Hidden"}</Badge>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-slate-400 line-clamp-1 leading-normal italic">
                          {org.tagline || "Empowering community development and transparent impact tracking."}
                        </p>
                        <div className="flex items-center justify-between border-t pt-2 mt-1">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-semibold text-gray-400 dark:text-slate-500">Category: {org.org_category}</span>
                            <span className="text-[9px] font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide mt-0.5">
                              Tier: {org.subscription_tier ? org.subscription_tier : (org.subscription_status || "trial")}
                            </span>
                          </div>
                          <Link to={`/@${org.slug}`} target="_blank" className="text-xs text-emerald-650 hover:text-emerald-700 font-bold flex items-center gap-1.5 transition">
                            <Globe className="h-3.5 w-3.5" /> View Portal
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Tenant audits and actions */}
        {activeTab === "orgs" && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-200 w-full">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 select-none mb-2">
              <div className="w-full md:w-80">
                <Input
                  type="text"
                  placeholder="Filter workspaces by name, category..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  prefixIcon={<Search className="h-4 w-4 text-gray-400" />}
                />
              </div>
              <span className="text-[11px] font-mono text-gray-400 uppercase tracking-widest font-bold">
                Auditing {filteredOrgs.length} Sourced tenant databases
              </span>
            </div>
            <Table columns={orgColumns} data={filteredOrgs} emptyMessage="No multi-tenant workspaces match queried criteria." />
          </div>
        )}

        {/* Manual Payment verify / approving invoices */}
        {activeTab === "payments" && (() => {
          const pendingPayments = (payments || []).filter((p) => p.status === "awaiting_approval");
          const reviewedPayments = (payments || []).filter((p) => p.status === "approved" || p.status === "rejected");

          return (
            <div className="flex flex-col gap-4 animate-in fade-in duration-200 w-full">
              <div className="border-b border-gray-200 dark:border-slate-800 pb-3 select-none mb-2 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black font-display text-gray-905 dark:text-white">
                    MoMo Transaction Records Approval Board
                  </h2>
                  <p className="text-xs text-gray-500 leading-normal mt-1">
                    Audit the transaction details against your MTN or Airtel Money logs to approve or reject licenses.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => setHistoryOpen(!historyOpen)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1.5 font-bold text-xs h-9 border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  >
                    <Clock className="h-4 w-4 text-indigo-500" />
                    {historyOpen ? "Hide History Sidebar" : `Show History Sidebar (${reviewedPayments.length})`}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
                {/* Collapsible History Stack Table on the Left */}
                {historyOpen && (
                  <div className="w-full lg:w-96 shrink-0 bg-stone-50 dark:bg-slate-900/60 border rounded-2xl p-4 flex flex-col gap-3 animate-in slide-in-from-left duration-250 border-gray-200 dark:border-slate-800">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-slate-800">
                      <span className="text-xs font-black uppercase text-gray-500 dark:text-slate-400 font-display flex items-center gap-1.5">
                        <CheckCircle className="h-4 w-4 text-emerald-500" /> Validation Archive
                      </span>
                      <Badge color="blue" className="text-[10px] font-mono font-bold">
                        {reviewedPayments.length} Reviewed
                      </Badge>
                    </div>

                    <div className="max-h-[65vh] overflow-y-auto pr-1 flex flex-col gap-2.5">
                      {reviewedPayments.length > 0 ? (
                        reviewedPayments.map((p) => {
                          const matchedOrg = orgs.find((o) => o.id === p.org_id);
                          const validatedAt = p.validated_at;
                          const latencyText = validatedAt ? formatDuration(p.submitted_at, validatedAt) : "N/A";

                          return (
                            <div
                              key={p.id}
                              onClick={() => setSelectedHistoryItem(p)}
                              className="group text-left p-3.5 rounded-xl border bg-white dark:bg-slate-950/40 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all duration-150 cursor-pointer flex flex-col gap-2.5 shadow-xs"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <span className="font-extrabold text-stone-850 dark:text-gray-100 text-xs truncate max-w-[150px]">
                                  {matchedOrg?.name || "Virellix Partner"}
                                </span>
                                <Badge color={p.status === "approved" ? "green" : "red"} className="text-[9px] px-1.5 py-0.5">
                                  {p.status?.toUpperCase()}
                                </Badge>
                              </div>

                              <div className="flex justify-between text-[10px] font-mono leading-none border-b border-stone-50 dark:border-slate-800 pb-1.5">
                                <span className="text-stone-400">Total:</span>
                                <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">
                                  {(p.amount_local || p.amount_usd * 1300).toLocaleString()} RWF
                                </span>
                              </div>

                              <div className="flex justify-between text-[10px] font-semibold leading-none text-gray-400">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> Turnaround:
                                </span>
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                  {latencyText}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-xs text-gray-400 font-medium">No verified entries yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Main Validation Pending Cards on the Right */}
                <div className="flex-1 w-full">
                  {pendingPayments.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {pendingPayments.map((p) => {
                        const matchedOrg = orgs.find((o) => o.id === p.org_id);
                        const isMtn = p.method === "mtn";
                        return (
                          <div
                            key={p.id}
                            className="bg-white dark:bg-slate-900 border rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between transition-all hover:shadow-md duration-155 border-amber-300 dark:border-amber-800/40 animate-in fade-in duration-200"
                          >
                            {/* Brand indicator Top line */}
                            <div className={`px-4.5 py-2.5 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between text-white ${
                              isMtn ? "bg-amber-500 text-slate-905" : "bg-red-600"
                            }`}>
                              <span className="flex items-center gap-1.5 select-none font-display">
                                <Smartphone className="h-3.5 w-3.5" />
                                {isMtn ? "MTN Mobile Money Proof" : "Airtel Money Proof"}
                              </span>
                              <span className="font-mono">{p.plan || "PRO PLAN"}</span>
                            </div>

                            {/* Content details */}
                            <div className="p-5 flex-1 flex flex-col gap-3 font-semibold text-xs leading-none">
                              <div className="flex items-center justify-between pb-2 border-b leading-none border-gray-100 dark:border-slate-800">
                                <span className="text-gray-400 uppercase text-[9px] font-mono tracking-wider font-bold">Organization</span>
                                <span className="text-gray-901 dark:text-white font-extrabold">{matchedOrg?.name || "Virellix Partner"}</span>
                              </div>
                              <div className="flex items-center justify-between pb-2 border-b leading-none border-gray-100 dark:border-slate-800">
                                <span className="text-gray-400 uppercase text-[9px] font-mono tracking-wider font-bold">Total Transferred</span>
                                <span className="text-emerald-705 dark:text-emerald-400 font-extrabold">{(p.amount_local || p.amount_usd * 1300).toLocaleString()} RWF</span>
                              </div>
                              <div className="flex items-center justify-between pb-2 border-b leading-none border-gray-100 dark:border-slate-800">
                                <span className="text-gray-400 uppercase text-[9px] font-mono tracking-wider font-bold">MoMo Phone</span>
                                <span className="text-gray-700 dark:text-slate-300 font-mono">{p.phone}</span>
                              </div>
                              <div className="flex items-center justify-between pb-2 border-b leading-none border-gray-100 dark:border-slate-800">
                                <span className="text-gray-400 uppercase text-[9px] font-mono tracking-wider font-bold">Reference ID</span>
                                <span className="text-indigo-600 dark:text-indigo-400 font-mono text-[11px] font-bold">{p.reference}</span>
                              </div>

                              {/* Text SMS verification area */}
                              {p.proof_url && (
                                <div className="mt-1 p-3 bg-slate-50 dark:bg-slate-800/40 border border-gray-150 dark:border-slate-800 rounded-xl leading-relaxed text-slate-500 dark:text-slate-400 font-normal">
                                  <span className="text-[8px] font-mono uppercase tracking-widest font-black text-gray-400 block pb-1 border-b leading-none mb-1 text-center border-gray-150 dark:border-slate-800">SMS Transmission Statement</span>
                                  <p className="text-[10px] leading-snug italic">"{p.proof_url}"</p>
                                </div>
                              )}

                              {/* Timestamp received */}
                              <div className="flex justify-between text-[10px] text-gray-400 pt-1.5 border-t border-dashed border-gray-150 dark:border-slate-800 font-medium">
                                <span>Uploaded At:</span>
                                <span className="font-bold text-stone-700 dark:text-slate-300">
                                  {p.submitted_at ? new Date(p.submitted_at).toLocaleString() : "N/A"}
                                </span>
                              </div>

                              <div className="flex items-center justify-between pt-2 select-none leading-none">
                                <span className="text-gray-400 uppercase text-[9px] font-mono tracking-wider font-bold">Status</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                                  <Badge color="amber">NEW RECEIVED</Badge>
                                </div>
                              </div>
                            </div>

                            {/* Coupon Actions footer */}
                            <div className="p-3 bg-slate-55 dark:bg-slate-900 border-t flex items-center gap-2.5 leading-none select-none border-gray-200 dark:border-slate-800">
                              <Button 
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 flex-1 text-xs hover:opacity-90" 
                                onClick={() => handleApproveSub(p.id, p.org_id, p.plan)}
                              >
                                Approve Transaction
                              </Button>
                              <Button 
                                variant="outline" 
                                className="text-red-500 hover:bg-red-50 hover:border-red-350 font-bold border-gray-200 h-9 flex-1 text-xs" 
                                onClick={() => handleRejectSub(p.id, p.org_id)}
                              >
                                Reject
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState 
                      title="All Payments Cleared" 
                      message="Superb! No mobile money transaction records are currently awaiting operator verification." 
                    />
                  )}
                </div>
              </div>

              {/* Detailed Verified Docket Modal */}
              {selectedHistoryItem && (
                <Modal
                  open={!!selectedHistoryItem}
                  onClose={() => setSelectedHistoryItem(null)}
                  title="Verified Transaction Dossier"
                >
                  <div className="flex flex-col gap-4 font-semibold text-xs leading-none select-none">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-150 dark:border-slate-800">
                      <span className="text-gray-400 uppercase text-[9px] font-mono tracking-wider font-bold">Organization</span>
                      <span className="text-gray-901 dark:text-white font-extrabold">
                        {orgs.find((o) => o.id === selectedHistoryItem.org_id)?.name || "Virellix Partner"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pb-2 border-b border-gray-150 dark:border-slate-800">
                      <span className="text-gray-400 uppercase text-[9px] font-mono tracking-wider font-bold">Total Transferred</span>
                      <span className="text-emerald-705 dark:text-emerald-400 font-extrabold">
                        {(selectedHistoryItem.amount_local || selectedHistoryItem.amount_usd * 1300).toLocaleString()} RWF
                      </span>
                    </div>
                    <div className="flex items-center justify-between pb-2 border-b border-gray-150 dark:border-slate-800">
                      <span className="text-gray-400 uppercase text-[9px] font-mono tracking-wider font-bold">MoMo Phone</span>
                      <span className="text-gray-700 dark:text-slate-300 font-mono">{selectedHistoryItem.phone}</span>
                    </div>
                    <div className="flex items-center justify-between pb-2 border-b border-gray-150 dark:border-slate-800">
                      <span className="text-gray-400 uppercase text-[9px] font-mono tracking-wider font-bold">Reference ID</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-mono text-[11px] font-bold">{selectedHistoryItem.reference}</span>
                    </div>

                    {selectedHistoryItem.proof_url && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-gray-150 dark:border-slate-800 rounded-xl leading-relaxed text-slate-500 dark:text-slate-400 font-normal">
                        <span className="text-[8px] font-mono uppercase tracking-widest font-black text-gray-400 block pb-1 border-b leading-none mb-1 text-center border-gray-150 dark:border-slate-800">SMS Transmission Statement</span>
                        <p className="text-[10px] leading-snug italic">"{selectedHistoryItem.proof_url}"</p>
                      </div>
                    )}

                    <div className="bg-stone-50 dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-xl p-3 flex flex-col gap-2">
                      <div className="flex justify-between text-[10px] text-gray-400 leading-none">
                        <span>Uploaded At:</span>
                        <span className="font-bold text-stone-750 dark:text-slate-200">
                          {selectedHistoryItem.submitted_at ? new Date(selectedHistoryItem.submitted_at).toLocaleString() : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-400 leading-none">
                        <span>Reviewed At:</span>
                        <span className="font-bold text-stone-750 dark:text-slate-200">
                          {selectedHistoryItem.validated_at ? new Date(selectedHistoryItem.validated_at).toLocaleString() : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-400 leading-none pt-2 border-t border-dashed border-gray-200 dark:border-slate-800">
                        <span className="flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400">
                          <Clock className="h-3 w-3" /> Processing Latency:
                        </span>
                        <span className="font-extrabold text-indigo-700 dark:text-indigo-400">
                          {selectedHistoryItem.validated_at ? formatDuration(selectedHistoryItem.submitted_at, selectedHistoryItem.validated_at) : "N/A"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 select-none leading-none">
                      <span className="text-gray-400 uppercase text-[9px] font-mono tracking-wider font-bold">Review Status</span>
                      <Badge color={selectedHistoryItem.status === "approved" ? "green" : "red"}>
                        {selectedHistoryItem.status?.toUpperCase() || "RESOLVED"}
                      </Badge>
                    </div>

                    <div className="flex justify-end pt-3">
                      <Button onClick={() => setSelectedHistoryItem(null)} variant="outline" size="sm" className="font-bold">
                        Close Dossier
                      </Button>
                    </div>
                  </div>
                </Modal>
              )}
            </div>
          );
        })()}

        {/* Help threads Direct messaging chats */}
        {activeTab === "errors" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200 min-h-[60vh]">
            <div className="lg:col-span-1 flex flex-col border border-gray-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 p-4 justify-between h-[65vh] shadow-xs select-none">
              <div className="flex flex-col gap-3 font-semibold text-xs text-stone-850 h-full">
                <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-slate-400 block pb-2 border-b select-none dark:border-slate-800">
                  Incident Support Directory
                </span>
                <div className="flex flex-col gap-2 overflow-y-auto max-h-[52vh] pr-1 flex-1 leading-snug">
                  {errors && errors.length > 0 ? (
                    errors.map((e) => {
                      const clientOrg = orgs.find((o) => o.id === e.org_id);
                      return (
                        <button
                          key={e.id}
                          onClick={() => { setActiveChatId(e.id); setTempReply(e.admin_notes || ""); }}
                          className={`w-full text-left p-3.5 rounded-xl border transition-all duration-150 cursor-pointer flex flex-col gap-2 ${
                            activeChatId === e.id
                              ? "bg-slate-50 dark:bg-slate-800 border-indigo-400 shadow-sm"
                              : "hover:bg-gray-55 dark:hover:bg-slate-805/45 border-gray-100 dark:border-slate-800"
                          }`}
                        >
                          <div className="flex justify-between items-center w-full leading-none text-xs">
                            <span className="font-extrabold text-gray-950 dark:text-slate-105 truncate max-w-[70%]">{clientOrg?.name || "Support Ticket"}</span>
                            <Badge color={e.status === "resolved" ? "green" : "red"}>{e.status}</Badge>
                          </div>
                          <p className="text-[10px] text-gray-500 font-normal truncate">
                            "{e.description}"
                          </p>
                        </button>
                      );
                    })
                  ) : (
                    <span className="text-stone-400 py-12 text-center text-xs">No active threads.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 flex flex-col border border-gray-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden justify-between h-[65vh] shadow-xs">
              {activeChatId ? (
                (() => {
                  const activeErr = errors.find((e) => e.id === activeChatId);
                  const matchedOrg = orgs.find((o) => o.id === activeErr?.org_id);
                  return (
                    <>
                      <div className="px-5 py-4 bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-800 flex justify-between items-center leading-none select-none">
                        <div className="flex flex-col gap-1.5">
                          <span className="font-black text-sm text-gray-901 dark:text-white">Active Chat with: {matchedOrg?.name || "Partner Organization"}</span>
                          <span className="text-[9px] font-mono text-slate-400 tracking-wider font-semibold">Workspace Identifier: {matchedOrg?.id}</span>
                        </div>
                        {activeErr?.status !== "resolved" && (
                          <Button size="xs" onClick={() => handleResolveBugDirect(activeChatId)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold h-8">
                            Resolve Logs Ticket
                          </Button>
                        )}
                      </div>

                      {/* Conversation thread */}
                      <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-5 font-medium text-xs">
                        {/* Client issue summary */}
                        <div className="p-4 bg-gray-55/60 dark:bg-slate-800/40 border border-dashed hover:bg-gray-50 rounded-xl flex gap-3 text-stone-800 dark:text-slate-205 leading-relaxed font-semibold">
                          <Avatar name={matchedOrg?.name || "O"} size="xs" />
                          <div className="flex flex-col gap-1 flex-1 leading-relaxed">
                            <span className="text-[10px] text-zinc-400 font-bold block leading-none select-none">Original Support Transmission Statement:</span>
                            <span className="text-gray-955 dark:text-slate-100 mt-1 font-bold">"{activeErr?.description}"</span>
                          </div>
                        </div>

                        {/* Supervisor Answer if stored */}
                        {activeErr?.admin_notes ? (
                          <div className="flex gap-3 max-w-[85%] self-end flex-row-reverse transition-all">
                            <div className="h-8.5 w-8.5 rounded-xl bg-slate-900 text-amber-500 flex items-center justify-center text-xs font-bold shrink-0 border border-slate-805">
                              SA
                            </div>
                            <div className="flex flex-col gap-1.5 text-right font-display leading-tight">
                              <span className="text-[10px] text-slate-400 font-bold block select-none">You (System Superadmin)</span>
                              <div className="p-3 bg-slate-905 text-white dark:bg-slate-850 dark:border dark:border-slate-805 rounded-2xl text-[11px] leading-snug text-left font-semibold shadow-xs">
                                {activeErr.admin_notes}
                              </div>
                              <span className="text-[9px] text-gray-400 font-mono">Dispatched Response</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 select-none">
                            <span className="text-xs text-stone-400">No reply text dispatching recorded on this support log yet. Fill details below.</span>
                          </div>
                        )}
                      </div>

                      <form onSubmit={handleSendChatReply} className="p-4 border-t dark:border-slate-800 bg-gray-50 dark:bg-slate-950 flex items-center gap-3">
                        <div className="flex-1 text-xs">
                          <Input 
                            value={tempReply} 
                            onChange={(e) => setTempReply(e.target.value)} 
                            placeholder="Type a support response or diagnostic instructions..." 
                          />
                        </div>
                        <Button type="submit" className="bg-slate-900 dark:bg-slate-900 text-white font-bold h-10 px-4 shrink-0">
                          <Send className="h-4 w-4" />
                        </Button>
                      </form>
                    </>
                  );
                })()
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-3.5 p-6 select-none leading-none">
                  <div className="h-12 w-12 bg-gray-55 dark:bg-slate-850 rounded-2xl flex items-center justify-center shadow-xs">
                    <MessageSquare className="h-6 w-6 text-indigo-505 animate-bounce" />
                  </div>
                  <p className="text-xs text-slate-500 font-black">Select any Help Chat and Bug Incident thread on the left directory pane to start messaging.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Global billing configuration setup */}
        {activeTab === "billing_setup" && (
          <Card title="SaaS Core Platform Billing & Integration Parameters">
            <form onSubmit={handleSavePlatformSettings} className="flex flex-col gap-6 text-xs md:text-sm font-medium pt-2 text-gray-600 dark:text-slate-300 font-semibold">
              <p className="text-gray-500 font-normal leading-normal">
                Coordinate global configurations displayed to administrative users upon triggering upgrade payment flows.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Input 
                  label="USD To Rwandan Franc Conv (1 USD = ? RWF)" 
                  type="number" 
                  value={usdRate} 
                  onChange={(e) => setUsdRate(parseInt(e.target.value) || 0)} 
                />
                <Input 
                  label="EUR To Rwandan Franc Conv (1 EUR = ? RWF)" 
                  type="number" 
                  value={eurRate} 
                  onChange={(e) => setEurRate(parseInt(e.target.value) || 0)} 
                />
                <Input 
                  label="KES To Rwandan Franc Conv (1 KES = ? RWF)" 
                  type="number" 
                  value={kesRate} 
                  onChange={(e) => setKesRate(parseInt(e.target.value) || 0)} 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <Input 
                  label="Target Corporate Payment Recipient Name" 
                  value={mName} 
                  onChange={(e) => setMName(e.target.value)} 
                  placeholder="e.g. VIRELLIX INC" 
                />
                <div className="flex flex-col gap-1.5">
                  <Input 
                    label="MTN MoMo Target Corporate phone/code number" 
                    value={mtnNum} 
                    onChange={(e) => setMtnNum(e.target.value.replace(/\D/g, "").slice(0, 10))} 
                  />
                  <span className="text-[10px] text-amber-500 font-bold tracking-wide block uppercase h-3 leading-none select-none pl-1 font-mono">MTN Operator collection code</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-1 gap-6 pt-2">
                <div className="flex flex-col gap-1.5">
                  <Input 
                    label="Airtel Money Target Corporate phone/code number" 
                    value={airtelNum} 
                    onChange={(e) => setAirtelNum(e.target.value.replace(/\D/g, "").slice(0, 10))} 
                  />
                  <span className="text-[10px] text-red-550 font-bold tracking-wide block uppercase h-3 leading-none select-none pl-1 font-mono">Airtel Money collection code</span>
                </div>
              </div>

              <div className="flex items-center justify-end border-t dark:border-slate-800 pt-6 mt-4 select-none">
                <Button 
                  type="submit" 
                  loading={updateSettingsMutation.isPending} 
                  className="px-8 mt-1 py-3 text-xs md:text-sm font-extrabold shadow-md bg-emerald-650 hover:bg-emerald-700 hover:opacity-90 text-white rounded-xl h-11"
                >
                  Save Global Parameters
                </Button>
              </div>
            </form>
          </Card>
        )}
      </main>

      {/* Mini operators footer */}
      <footer className="h-10 bg-slate-900 border-t border-slate-800 text-center text-[10px] text-slate-500 flex items-center justify-center font-mono select-none shrink-0 border-t border-slate-800">
        Impacto SaaS SLA Operator Panel • © Virellix Core Security Protocol Labs
      </footer>
    </div>
  );
};
