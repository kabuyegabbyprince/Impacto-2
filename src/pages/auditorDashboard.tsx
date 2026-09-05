import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ShieldCheck,
  CreditCard,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Smartphone,
  Eye,
  Building2,
  FileCheck,
  History,
  FileText,
  Filter,
  Check,
  X,
  AlertTriangle,
  ArrowRight,
  LogOut,
  RefreshCw,
  ExternalLink,
  Lock,
  Download
} from "lucide-react";
import {
  usePlatformAdminData,
  useApproveSubscription,
  usePlatformAuditLogs
} from "../hooks/useImpactoData";
import { useAuthStore } from "../store/authStore";
import { Button, Input, Card, Badge, Modal } from "../components/ui";
import { useToast } from "../components/Toast";

export const AuditorDashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { addToast } = useToast();

  const { data: platformData, refetch, isLoading } = usePlatformAdminData();
  const { data: auditLogs = [] } = usePlatformAuditLogs();
  const approveSubMutation = useApproveSubscription();

  const orgs = platformData?.orgs || [];
  const payments = platformData?.payments || [];

  const [activeTab, setActiveTab] = useState<"pending" | "search" | "history">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [auditModalAction, setAuditModalAction] = useState<"approve" | "reject" | null>(null);
  const [auditNotes, setAuditNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Filters
  const pendingPayments = payments.filter((p: any) => p.status === "awaiting_approval");
  const completedPayments = payments.filter((p: any) => p.status === "approved" || p.status === "rejected");

  const myAuditedLogs = auditLogs.filter((l: any) => 
    l.staff_id === user?.id || l.staff_name === user?.full_name || user?.is_superadmin
  );

  const filteredAllPayments = payments.filter((p: any) => {
    const q = searchQuery.toLowerCase();
    const matchedOrg = orgs.find((o: any) => o.id === p.org_id);
    const orgName = matchedOrg?.name?.toLowerCase() || "";
    const ref = (p.reference || p.transaction_reference || "").toLowerCase();
    const phone = (p.phone || p.phone_number || "").toLowerCase();
    return orgName.includes(q) || ref.includes(q) || phone.includes(q);
  });

  const handleOpenAuditModal = (payment: any, action: "approve" | "reject") => {
    setSelectedPayment(payment);
    setAuditModalAction(action);
    setAuditNotes(
      action === "approve"
        ? `Verified against Mobile Money statement. Ref: ${payment.reference || payment.transaction_reference || "N/A"}`
        : "Payment proof could not be verified on carrier statement."
    );
  };

  const handleExecuteAudit = async () => {
    if (!selectedPayment || !auditModalAction) return;
    setIsProcessing(true);
    try {
      let deducedTier: "starter" | "growth" | "enterprise" = "growth";
      const planText = selectedPayment.plan || selectedPayment.plan_details;
      if (planText) {
        const lower = planText.toLowerCase();
        if (lower.includes("enterprise") || lower.includes("pro") || lower.includes("vip")) deducedTier = "enterprise";
        else if (lower.includes("starter")) deducedTier = "starter";
      }

      await approveSubMutation.mutateAsync({
        paymentId: selectedPayment.id,
        orgId: selectedPayment.org_id,
        status: auditModalAction === "approve" ? "approved" : "rejected",
        tier: deducedTier,
        auditedBy: user?.id || "auditor-current",
        auditedByName: user?.full_name || "Platform Auditor",
        auditNotes: auditNotes.trim()
      });

      addToast(
        auditModalAction === "approve"
          ? "Payment verified & approved successfully! Organization license extended."
          : "Payment marked as rejected.",
        auditModalAction === "approve" ? "success" : "info"
      );

      setSelectedPayment(null);
      setAuditModalAction(null);
      setAuditNotes("");
      refetch();
    } catch (err: any) {
      console.error(err);
      addToast("Failed to process transaction audit", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const exportAuditSummary = () => {
    const csvContent = [
      ["Date", "Auditor", "Action", "Organization", "Amount (RWF)", "Reference", "Notes"].join(","),
      ...auditLogs.map((l: any) => [
        `"${new Date(l.created_at).toLocaleString()}"`,
        `"${l.staff_name || "Auditor"}"`,
        `"${l.action_type}"`,
        `"${l.target_org_name || "Workspace"}"`,
        `"${l.amount || 0}"`,
        `"${l.reference || ""}"`,
        `"${(l.notes || "").replace(/"/g, '""')}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `impacto_audit_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("Audit report CSV exported successfully", "success");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans flex flex-col justify-between">
      {/* Top Auditor Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 lg:px-10 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
            <FileCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-black text-lg text-slate-900 dark:text-white tracking-tight">
                IMPACT<span className="text-indigo-600">O</span> Auditor Console
              </h1>
              <span className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold">
                VERIFICATION PORTAL
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Mobile Money proof-of-payment auditing & multi-tenant transaction reconciliation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-900 dark:text-white">{user?.full_name || "Platform Auditor"}</span>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-semibold">
              {user?.email || "auditor@impact-o.app"}
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-black flex items-center justify-center text-xs shadow-xs border border-indigo-100 dark:border-slate-700">
            AUD
          </div>

          {user?.is_superadmin && (
            <Link to="/platform/admin">
              <Button size="sm" variant="outline" className="font-bold text-xs h-10 px-3.5 rounded-xl border-slate-300 dark:border-slate-700">
                Super Admin Panel
              </Button>
            </Link>
          )}

          <Button
            size="sm"
            variant="outline"
            className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900 font-bold text-xs h-10 px-3.5 rounded-xl flex items-center gap-1.5"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            <LogOut className="h-3.5 w-3.5" /> Log Out
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8 flex-1 w-full flex flex-col gap-8">
        {/* KPI Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Pending Review Queue</span>
              <span className="text-2xl font-black font-display text-slate-900 dark:text-white mt-1 block">
                {pendingPayments.length}
              </span>
              <span className="text-[10px] text-amber-600 font-medium block">Awaiting confirmation</span>
            </div>
            <div className="h-11 w-11 bg-amber-50 dark:bg-amber-950/40 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Reviewed & Completed</span>
              <span className="text-2xl font-black font-display text-slate-900 dark:text-white mt-1 block">
                {completedPayments.length}
              </span>
              <span className="text-[10px] text-emerald-600 font-medium block">Reconciled transactions</span>
            </div>
            <div className="h-11 w-11 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Total Audit Stamped</span>
              <span className="text-2xl font-black font-display text-indigo-600 dark:text-indigo-400 mt-1 block">
                {auditLogs.length}
              </span>
              <span className="text-[10px] text-slate-500 font-medium block">Logged across platform</span>
            </div>
            <div className="h-11 w-11 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">My Verified Records</span>
              <span className="text-2xl font-black font-display text-slate-900 dark:text-white mt-1 block">
                {myAuditedLogs.length}
              </span>
              <span className="text-[10px] text-indigo-600 font-medium block">Audited by your account</span>
            </div>
            <div className="h-11 w-11 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300">
              <FileText className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Navigation Tabs Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 inline-flex items-center gap-1 shadow-3xs overflow-x-auto scrollbar-none select-none">
            <button
              onClick={() => setActiveTab("pending")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "pending"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-3xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
              }`}
            >
              <Clock className="h-3.5 w-3.5" /> Pending Approvals ({pendingPayments.length})
            </button>
            <button
              onClick={() => setActiveTab("search")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "search"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-3xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
              }`}
            >
              <Search className="h-3.5 w-3.5" /> All Transaction Archive ({payments.length})
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "history"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-3xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
              }`}
            >
              <History className="h-3.5 w-3.5" /> Platform Audit Trail ({auditLogs.length})
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              size="sm"
              variant="outline"
              onClick={exportAuditSummary}
              className="text-xs font-bold h-9 px-3 rounded-xl border-slate-300 dark:border-slate-700 flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" /> Export Audit Log (.CSV)
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              className="text-xs font-bold h-9 px-3 rounded-xl border-slate-300 dark:border-slate-700 flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        </div>

        {/* 1. PENDING APPROVAL QUEUE TAB */}
        {activeTab === "pending" && (
          <div className="flex flex-col gap-4 w-full">
            {pendingPayments.length > 0 ? (
              pendingPayments.map((payment: any) => {
                const matchedOrg = orgs.find((o: any) => o.id === payment.org_id);
                const localAmount = payment.amount_local || (payment.amount_usd ? payment.amount_usd * 1350 : 33750);
                const usdAmount = payment.amount_usd || Math.round(localAmount / 1350);

                return (
                  <div
                    key={payment.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 transition hover:border-indigo-300 dark:hover:border-indigo-800"
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-amber-50 dark:bg-slate-800 border border-amber-200/60 dark:border-slate-700 flex items-center justify-center text-amber-600 font-bold shrink-0">
                        <Smartphone className="h-7 w-7" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-black text-slate-900 dark:text-white font-display">
                            {matchedOrg?.name || "Cooperative Workspace"}
                          </span>
                          <span className="text-[10px] font-mono bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-md font-bold uppercase">
                            Awaiting Auditor Confirmation
                          </span>
                          <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md font-semibold">
                            {payment.plan || payment.plan_details || "Growth Plan"}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                            {localAmount.toLocaleString()} RWF
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            (${usdAmount} USD)
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 dark:bg-slate-800/60 px-2 py-0.5 rounded-md">
                            Method: {payment.method ? payment.method.toUpperCase() : "MTN MOMO"}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-1 gap-x-4 text-xs text-slate-500 mt-1">
                          <span>
                            Sender Phone: <strong className="text-slate-800 dark:text-slate-200 font-mono">{payment.phone || payment.phone_number || "0780000000"}</strong>
                          </span>
                          <span>
                            Carrier TXN Ref: <strong className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{payment.reference || payment.transaction_reference || "TXN-998811"}</strong>
                          </span>
                          <span>
                            Submitted: <strong className="text-slate-700 dark:text-slate-300">{new Date(payment.submitted_at || payment.created_at || Date.now()).toLocaleString()}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 w-full lg:w-auto justify-end border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100 dark:border-slate-800">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold h-10 px-4 rounded-xl flex items-center gap-1.5"
                        onClick={() => handleOpenAuditModal(payment, "reject")}
                      >
                        <X className="h-4 w-4" /> Reject Proof
                      </Button>
                      <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-10 px-5 rounded-xl shadow-xs flex items-center gap-1.5"
                        onClick={() => handleOpenAuditModal(payment, "approve")}
                      >
                        <Check className="h-4 w-4" /> Verify & Approve
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
                <h4 className="text-base font-black font-display text-slate-900 dark:text-white">Auditor Queue Is Completely Clear</h4>
                <p className="text-xs text-slate-500 max-w-sm">
                  All submitted mobile money transaction proofs have been inspected and reconciled.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 2. TRANSACTION SEARCH & ARCHIVE TAB */}
        {activeTab === "search" && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col gap-6 w-full">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black font-display text-slate-900 dark:text-white">Global Multi-Tenant Payment Records</h3>
                <p className="text-xs text-slate-500 mt-0.5">Search and inspect all historical payments, references, and auditor stamps across all organizations.</p>
              </div>
              <div className="w-full md:w-80">
                <Input
                  type="text"
                  placeholder="Search by org, TXN reference, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  prefixIcon={<Search className="h-4 w-4 text-slate-400" />}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">
                    <th className="py-3 px-3">Organization</th>
                    <th className="py-3 px-3">Amount</th>
                    <th className="py-3 px-3">Reference / Phone</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Auditor Verification Stamp</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {filteredAllPayments.map((p: any) => {
                    const matchedOrg = orgs.find((o: any) => o.id === p.org_id);
                    const isApproved = p.status === "approved";
                    const isRejected = p.status === "rejected";
                    const isPending = p.status === "awaiting_approval";

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-white">{matchedOrg?.name || "Workspace"}</span>
                            <span className="text-[10px] font-mono text-slate-400">@{matchedOrg?.slug || p.org_id}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {(p.amount_local || p.amount_usd * 1350 || 33750).toLocaleString()} RWF
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="flex flex-col font-mono text-[11px]">
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">{p.reference || p.transaction_reference || "N/A"}</span>
                            <span className="text-slate-400">{p.phone || p.phone_number || "0780000000"}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <Badge color={isApproved ? "green" : isRejected ? "red" : "amber"}>
                            {p.status?.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-3">
                          {p.audited_by_name || p.validated_at ? (
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 dark:text-slate-200">
                                {p.audited_by_name || "Platform Auditor"}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(p.validated_at || p.audited_at || Date.now()).toLocaleDateString()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Not audited yet</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          {isPending && (
                            <div className="flex items-center gap-1.5 justify-end">
                              <Button
                                size="xs"
                                variant="outline"
                                className="text-rose-600 border-rose-200"
                                onClick={() => handleOpenAuditModal(p, "reject")}
                              >
                                Reject
                              </Button>
                              <Button
                                size="xs"
                                className="bg-indigo-600 text-white"
                                onClick={() => handleOpenAuditModal(p, "approve")}
                              >
                                Confirm
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. AUDIT TRAIL LOGS TAB */}
        {activeTab === "history" && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col gap-6 w-full">
            <div>
              <h3 className="text-base font-black font-display text-slate-900 dark:text-white">Platform Auditor Action Audit Trail</h3>
              <p className="text-xs text-slate-500 mt-0.5">Immutable record of every payment proof approval and rejection made by assigned auditors.</p>
            </div>

            <div className="flex flex-col gap-3">
              {auditLogs.length > 0 ? (
                auditLogs.map((log: any) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${log.action_type?.includes("approve") ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"}`}>
                        {log.action_type?.includes("approve") ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{log.staff_name || "Auditor"}</span>
                          <span className="text-[10px] font-mono bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.2 rounded font-bold uppercase">
                            {log.staff_role || "Auditor"}
                          </span>
                          <span className="text-xs text-slate-500">• {log.target_org_name || "Workspace"}</span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">{log.notes || "Transaction reviewed"}</p>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono mt-1">
                          <span>Ref: <strong>{log.reference || "N/A"}</strong></span>
                          <span>Amount: <strong>{(log.amount || 0).toLocaleString()} RWF</strong></span>
                          <span>Timestamp: {new Date(log.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <Badge color={log.action_type?.includes("approve") ? "green" : "red"}>
                      {log.action_type?.replace(/_/g, " ").toUpperCase()}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-xs text-slate-400 font-medium">No audit log records recorded yet.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Confirmation Modal */}
      {selectedPayment && auditModalAction && (
        <Modal
          title={auditModalAction === "approve" ? "Confirm Transaction Approval" : "Confirm Proof Rejection"}
          isOpen={!!selectedPayment}
          onClose={() => {
            setSelectedPayment(null);
            setAuditModalAction(null);
          }}
        >
          <div className="flex flex-col gap-4 text-xs">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-2 font-medium">
              <div className="flex justify-between">
                <span className="text-slate-400">Carrier Reference:</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {selectedPayment.reference || selectedPayment.transaction_reference || "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount:</span>
                <span className="font-bold text-emerald-600">
                  {(selectedPayment.amount_local || selectedPayment.amount_usd * 1350 || 0).toLocaleString()} RWF
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Auditor Name:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {user?.full_name || "Platform Auditor"}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Auditor Statement & Notes <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={auditNotes}
                onChange={(e) => setAuditNotes(e.target.value)}
                placeholder="Enter audit statement or verification details..."
                className="w-full text-xs rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 p-3 h-24 focus:ring-2 focus:ring-indigo-500 font-semibold outline-none shadow-3xs"
              />
              <span className="text-[10px] text-slate-400">
                This note is recorded in the platform audit trail and visible to the Super Admin.
              </span>
            </div>

            <div className="flex items-center gap-3 pt-2 justify-end">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  setSelectedPayment(null);
                  setAuditModalAction(null);
                }}
              >
                Cancel
              </Button>
              <Button
                className={`font-bold rounded-xl text-white ${auditModalAction === "approve" ? "bg-indigo-600 hover:bg-indigo-700" : "bg-rose-600 hover:bg-rose-700"}`}
                onClick={handleExecuteAudit}
                loading={isProcessing}
                disabled={!auditNotes.trim()}
              >
                {auditModalAction === "approve" ? "Confirm & Extend Subscription" : "Confirm Rejection"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 px-6 text-center text-xs text-slate-500 font-medium">
        IMPACTO Auditor & Transaction Verification Portal • Certified Financial Auditing System
      </footer>
    </div>
  );
};
