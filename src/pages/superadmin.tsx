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
  ChevronRight
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
    <div className="flex flex-col gap-2 min-w-[170px]">
      <select
        value={selectedTier}
        onChange={(e) => setSelectedTier(e.target.value)}
        className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900 dark:text-slate-100 outline-none cursor-pointer shadow-xs"
      >
        <option value="trial">Trial Plan (Free)</option>
        <option value="starter">Starter Plan ($10)</option>
        <option value="growth">Growth Plan ($25)</option>
        <option value="enterprise">Pro VIP Room ($40)</option>
      </select>
      <Button
        size="sm"
        className="bg-emerald-600 hover:bg-emerald-700 text-[11px] font-bold py-1.5 px-3 h-8 rounded-xl transition flex items-center gap-1.5 justify-center whitespace-nowrap text-white shadow-xs"
        onClick={() => onUpdate(row.id, selectedTier)}
      >
        <RefreshCw className="h-3.5 w-3.5" />
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

  const settings = platformData?.settings || {
    usd_to_rwf_rate: 1350,
    eur_to_rwf_rate: 1450,
    kes_to_rwf_rate: 10,
    mtn_payment_number: "0788100100",
    airtel_payment_number: "0733100100",
    payment_name: "VIRELLIX INC"
  };

  const [usdRate, setUsdRate] = useState<number>(settings.usd_to_rwf_rate || 1350);
  const [eurRate, setEurRate] = useState<number>(settings.eur_to_rwf_rate || 1450);
  const [kesRate, setKesRate] = useState<number>(settings.kes_to_rwf_rate || 10);
  const [mtnNum, setMtnNum] = useState<string>(settings.mtn_payment_number || "0788100100");
  const [airtelNum, setAirtelNum] = useState<string>(settings.airtel_payment_number || "0733100100");
  const [mName, setMName] = useState<string>(settings.payment_name || "VIRELLIX INC");

  const [activeChatId, setActiveChatId] = useState<string>("");
  const [tempReply, setTempReply] = useState<string>("");

  const handleSavePlatformSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^07\d{8}$/.test(mtnNum)) {
      addToast("Error: MTN collection number must be 10 digits starting with 07", "error");
      return;
    }
    if (!/^07\d{8}$/.test(airtelNum)) {
      addToast("Error: Airtel collection number must be 10 digits starting with 07", "error");
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
      setSuccessMsg("Platform operator billing parameters saved successfully!");
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
        if (lower.includes("enterprise") || lower.includes("pro") || lower.includes("vip")) deducedTier = "enterprise";
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
      setSuccessMsg("Support response dispatched successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error(err);
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
            <span className="font-extrabold text-slate-950 dark:text-white text-sm">{row.name}</span>
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
      header: "License Status",
      accessor: "subscription_status",
      cell: (row: any) => {
        const isExpired = row.subscription_status === "expired" || (row.subscription_ends_at && new Date(row.subscription_ends_at) < new Date());
        return (
          <div className="flex flex-col gap-1">
            <Badge color={isExpired ? "red" : row.subscription_status === "active" ? "green" : "amber"}>
              {isExpired ? "EXPIRED LICENSE" : row.subscription_status?.toUpperCase() || "TRIAL"}
            </Badge>
            {row.subscription_ends_at && (
              <span className="text-[10px] text-slate-400 font-mono">
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
          <div className="flex items-center gap-2 font-sans font-extrabold text-xs">
            <span className={`h-2.5 w-2.5 rounded-full ${isExpired || daysLeft === 0 ? "bg-rose-500" : daysLeft <= 5 ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
            <span>
              {isExpired || daysLeft === 0 ? (
                <span className="text-rose-600 font-black">0 Days (Locked)</span>
              ) : (
                <span className="text-slate-900 dark:text-slate-100 font-bold">{daysLeft} Days</span>
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
    return o.name.toLowerCase().includes(query) || o.slug.toLowerCase().includes(query);
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
            <span className="text-[10px] text-emerald-600 font-mono font-semibold">superadmin@impact-o.app</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-slate-900 dark:bg-slate-800 text-emerald-400 font-black flex items-center justify-center text-xs shadow-sm">
            SA
          </div>
          <Link to="/">
            <Button size="sm" variant="outline" className="font-bold text-xs h-10 px-4 rounded-xl">
              Exit to App
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8 flex-1 w-full flex flex-col gap-8">
        {/* Navigation Tabs Header */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-2 rounded-2xl shadow-xs flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("stats")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "stats"
                ? "bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Activity className="h-4 w-4" /> SaaS Overview & Analytics
          </button>
          <button
            onClick={() => setActiveTab("orgs")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "orgs"
                ? "bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Building2 className="h-4 w-4" /> Tenant Audits & Licenses ({totalOrgs})
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "payments"
                ? "bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <CreditCard className="h-4 w-4" /> MoMo Approval Queue
            {awaitingPayments > 0 && (
              <span className="px-2 py-0.5 text-[10px] bg-rose-500 text-white rounded-full font-mono font-black">
                {awaitingPayments}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("errors")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "errors"
                ? "bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <MessageSquare className="h-4 w-4" /> Support & Incidents
            {pendingBugs > 0 && (
              <span className="px-2 py-0.5 text-[10px] bg-amber-500 text-slate-950 rounded-full font-mono font-black">
                {pendingBugs}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("billing_setup")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "billing_setup"
                ? "bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Settings className="h-4 w-4" /> Global Billing Config
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
        {activeTab === "orgs" && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col gap-6 w-full">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black font-display text-slate-900 dark:text-white">Tenant Workspaces & Licenses</h3>
                <p className="text-xs text-slate-500 mt-0.5">Manage subscription plans, extend 30-day billing periods, or enforce lockouts.</p>
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
        )}

        {/* 3. PAYMENTS APPROVAL QUEUE TAB */}
        {activeTab === "payments" && (() => {
          const pendingPayments = (payments || []).filter((p) => p.status === "awaiting_approval");
          const reviewedPayments = (payments || []).filter((p) => p.status === "approved" || p.status === "rejected");

          return (
            <div className="flex flex-col gap-6 w-full">
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-base font-black font-display text-slate-900 dark:text-white">MoMo Transaction Records Approval Board</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Audit transaction proofs against your MTN / Airtel merchant collection statements.</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => setHistoryOpen(!historyOpen)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 font-bold text-xs h-10 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl"
                  >
                    <Clock className="h-4 w-4 text-emerald-600" />
                    {historyOpen ? "Hide History Sidebar" : `Show History Archive (${reviewedPayments.length})`}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
                {historyOpen && (
                  <div className="w-full lg:w-96 shrink-0 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-3 shadow-xs">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 font-display flex items-center gap-1.5">
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
                              className="text-left p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all cursor-pointer flex flex-col gap-2 shadow-xs"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <span className="font-extrabold text-slate-900 dark:text-gray-100 text-xs truncate max-w-[150px]">
                                  {matchedOrg?.name || "Virellix Partner"}
                                </span>
                                <Badge color={p.status === "approved" ? "green" : "red"} className="text-[9px] px-1.5 py-0.5">
                                  {p.status?.toUpperCase()}
                                </Badge>
                              </div>

                              <div className="flex justify-between text-[11px] font-mono leading-none border-b border-slate-200/60 dark:border-slate-800 pb-2">
                                <span className="text-slate-400">Total:</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                                  {(p.amount_local || p.amount_usd * 1350).toLocaleString()} RWF
                                </span>
                              </div>

                              <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                                <span>Turnaround:</span>
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">{latencyText}</span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-10">
                          <p className="text-xs text-slate-400 font-medium">No archived transactions found.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex-1 w-full flex flex-col gap-4">
                  {pendingPayments.length > 0 ? (
                    pendingPayments.map((p: any) => {
                      const matchedOrg = orgs.find((o: any) => o.id === p.org_id);
                      return (
                        <div key={p.id} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                          <div className="flex items-start gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-slate-800 border border-emerald-200/50 dark:border-slate-700 flex items-center justify-center text-emerald-600 font-bold shrink-0">
                              <Smartphone className="h-6 w-6" />
                            </div>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-slate-900 dark:text-white">{matchedOrg?.name || "Cooperative Workspace"}</span>
                                <span className="text-[10px] font-mono bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-md font-bold">AWAITING APPROVAL</span>
                              </div>
                              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                {(p.amount_local || (p.amount_usd * 1350)).toLocaleString()} RWF ({p.amount_usd ? `$${p.amount_usd}` : "$25"})
                              </span>
                              <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 font-medium">
                                <span>Sender MoMo: <strong className="text-slate-800 dark:text-slate-200">{p.phone_number || "0780000000"}</strong></span>
                                <span>TXN Ref: <strong className="font-mono text-slate-800 dark:text-slate-200">{p.transaction_reference || "TXN998811"}</strong></span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 w-full md:w-auto justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold h-10 px-4 rounded-xl"
                              onClick={() => handleRejectSub(p.id, p.org_id)}
                            >
                              Reject Proof
                            </Button>
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-10 px-5 rounded-xl shadow-xs"
                              onClick={() => handleApproveSub(p.id, p.org_id, p.plan_details)}
                            >
                              Approve & Extend 30d
                            </Button>
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
                      <p className="text-xs text-slate-500 max-w-sm">No pending mobile money subscription proof submissions require verification right now.</p>
                    </div>
                  )}
                </div>
              </div>

              {selectedHistoryItem && (
                <Modal title="Transaction Validation Audit Detail" isOpen={!!selectedHistoryItem} onClose={() => setSelectedHistoryItem(null)}>
                  <div className="flex flex-col gap-4 text-xs">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-2 font-medium">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Transaction ID:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedHistoryItem.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Reference:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedHistoryItem.transaction_reference}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Amount:</span>
                        <span className="font-bold text-emerald-600">{(selectedHistoryItem.amount_local || selectedHistoryItem.amount_usd * 1350).toLocaleString()} RWF</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Status:</span>
                        <Badge color={selectedHistoryItem.status === "approved" ? "green" : "red"}>{selectedHistoryItem.status?.toUpperCase()}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Turnaround Latency:</span>
                        <span className="font-bold text-indigo-600">{formatDuration(selectedHistoryItem.submitted_at, selectedHistoryItem.validated_at)}</span>
                      </div>
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
                  return (
                    <div key={errItem.id} className="p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 rounded-2xl flex flex-col gap-4 shadow-xs">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${isResolved ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>
                            {isResolved ? <CheckCircle className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
                          </div>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900 dark:text-white font-display">{errItem.page || "Cooperative Portal"}</span>
                              <Badge color={isResolved ? "green" : "amber"}>{isResolved ? "Resolved" : "Pending Support"}</Badge>
                            </div>
                            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">{errItem.error_message}</p>
                            <span className="text-[10px] text-slate-400 font-mono mt-1">Reported: {new Date(errItem.created_at).toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {!isResolved && (
                            <Button size="sm" variant="outline" className="text-xs font-bold h-9 px-3 rounded-xl border-slate-300 dark:border-slate-700" onClick={() => setActiveChatId(isChatOpen ? "" : errItem.id)}>
                              {isChatOpen ? "Close Reply" : "Reply Ticket"}
                            </Button>
                          )}
                          {!isResolved && (
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9 px-3 rounded-xl shadow-xs" onClick={() => handleResolveBugDirect(errItem.id)}>
                              Resolve Ticket
                            </Button>
                          )}
                        </div>
                      </div>

                      {errItem.admin_notes && (
                        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 flex flex-col gap-1">
                          <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-700 dark:text-emerald-400">Admin Response Dispatched:</span>
                          <p>{errItem.admin_notes}</p>
                        </div>
                      )}

                      {isChatOpen && (
                        <form onSubmit={handleSendChatReply} className="flex items-center gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                          <Input
                            placeholder="Type direct support operator response..."
                            value={tempReply}
                            onChange={(e) => setTempReply(e.target.value)}
                            className="flex-1 text-xs"
                          />
                          <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-5 rounded-xl shadow-xs" icon={<Send className="h-4 w-4" />}>
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
                  <label className="font-bold text-slate-700 dark:text-slate-300">MTN MoMo Collection Number</label>
                  <Input type="text" value={mtnNum} onChange={(e) => setMtnNum(e.target.value)} placeholder="0788100100" />
                  <span className="text-[10px] text-slate-400">Must be 10 digits starting with 07</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Airtel Money Collection Number</label>
                  <Input type="text" value={airtelNum} onChange={(e) => setAirtelNum(e.target.value)} placeholder="0733100100" />
                  <span className="text-[10px] text-slate-400">Must be 10 digits starting with 07</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">Merchant Registered Legal Entity Name</label>
                <Input type="text" value={mName} onChange={(e) => setMName(e.target.value)} placeholder="VIRELLIX INC" />
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-6 rounded-xl shadow-xs">
                  Save Operator Billing Settings
                </Button>
              </div>
            </form>
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
