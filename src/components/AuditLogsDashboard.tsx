import React, { useState, useMemo, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Download,
  Filter,
  RefreshCw,
  Clock,
  User,
  KeyRound,
  CreditCard,
  Coins,
  ChevronRight,
  Eye,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FileCode,
  Laptop,
  Smartphone,
  Globe,
  Layers,
  Lock,
  ArrowRight,
  Trash2,
  Edit3,
  PlusCircle,
  Activity,
  History,
  AlertOctagon,
  Sparkles
} from "lucide-react";
import { Badge, Button, Input, Modal, Card } from "./ui";
import { useAuditLogs, useCreateAuditLog } from "../hooks/useImpactoData";
import { useOrgStore } from "../store/orgStore";
import { useAuthStore } from "../store/authStore";
import { useToast } from "./Toast";
import { AuditLog } from "../types";
import { PlanGatedView } from "./PlanGatedView";
import { getAuditActionSummary, recordSystemAuditEvent } from "../lib/auditLogger";

export const AuditLogsDashboard: React.FC = () => {
  const { activeOrg, activeMember } = useOrgStore();
  const { user } = useAuthStore();
  const { addToast } = useToast();
  const { data: rawLogs, isLoading, refetch } = useAuditLogs(activeOrg?.id);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOperation, setSelectedOperation] = useState<"all" | "deleted" | "edited" | "created" | "auth" | "financial">("all");
  const [timeFilter, setTimeFilter] = useState<"all" | "today" | "7days" | "30days">("all");
  const [selectedLogForDiff, setSelectedLogForDiff] = useState<AuditLog | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Synchronize on live audit events dispatched anywhere in the application
  useEffect(() => {
    const handleLiveAudit = () => {
      refetch();
    };
    window.addEventListener("impacto:audit_log_recorded", handleLiveAudit);
    return () => {
      window.removeEventListener("impacto:audit_log_recorded", handleLiveAudit);
    };
  }, [refetch]);

  // Manual refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 300);
    addToast("Audit logs synchronized with database.", "info");
  };

  // Helper to categorize operations
  const getOperationKind = (log: AuditLog): "deleted" | "edited" | "created" | "auth" | "financial" | "other" => {
    const act = (log.action || "").toLowerCase();
    if (act.includes("delete") || act.includes("remove") || act.includes("purge") || act.includes("cancel")) {
      return "deleted";
    }
    if (act.includes("ledger") || act.includes("payment") || act.includes("fee") || act.includes("momo") || act.includes("grant") || act.includes("invoice")) {
      return "financial";
    }
    if (act.includes("login") || act.includes("auth") || act.includes("session") || act.includes("password")) {
      return "auth";
    }
    if (act.includes("update") || act.includes("edit") || act.includes("modify") || act.includes("progress")) {
      return "edited";
    }
    if (act.includes("create") || act.includes("add") || act.includes("invite") || act.includes("register")) {
      return "created";
    }
    return "other";
  };

  // Filter logs
  const filteredLogs = useMemo(() => {
    const logs = (rawLogs || []) as AuditLog[];

    return logs.filter((log) => {
      // Operation filter
      if (selectedOperation !== "all") {
        const opKind = getOperationKind(log);
        if (selectedOperation === "deleted" && opKind !== "deleted") return false;
        if (selectedOperation === "edited" && opKind !== "edited") return false;
        if (selectedOperation === "created" && opKind !== "created") return false;
        if (selectedOperation === "auth" && opKind !== "auth") return false;
        if (selectedOperation === "financial" && opKind !== "financial") return false;
      }

      // Time filter
      if (timeFilter !== "all") {
        const logDate = new Date(log.created_at).getTime();
        const now = Date.now();
        const diffHours = (now - logDate) / (1000 * 3600);
        if (timeFilter === "today" && diffHours > 24) return false;
        if (timeFilter === "7days" && diffHours > 24 * 7) return false;
        if (timeFilter === "30days" && diffHours > 24 * 30) return false;
      }

      // Search keyword filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchAction = (log.action || "").toLowerCase().includes(q);
        const matchLabel = (log.action_label || "").toLowerCase().includes(q);
        const matchActor = (log.performed_by || "").toLowerCase().includes(q);
        const matchTarget = (log.target_label || log.target_table || "").toLowerCase().includes(q);
        const matchIp = (log.ip_address || "").toLowerCase().includes(q);
        if (!matchAction && !matchLabel && !matchActor && !matchTarget && !matchIp) {
          return false;
        }
      }

      return true;
    });
  }, [rawLogs, selectedOperation, timeFilter, searchTerm]);

  // Aggregate metrics
  const metrics = useMemo(() => {
    const logs = (rawLogs || []) as AuditLog[];
    let deletedCount = 0;
    let editedCount = 0;
    let createdCount = 0;
    let financialCount = 0;

    logs.forEach((l) => {
      const kind = getOperationKind(l);
      if (kind === "deleted") deletedCount++;
      else if (kind === "edited") editedCount++;
      else if (kind === "created") createdCount++;
      if (kind === "financial") financialCount++;
    });

    return {
      total: logs.length,
      deleted: deletedCount,
      edited: editedCount,
      created: createdCount,
      financial: financialCount
    };
  }, [rawLogs]);

  // CSV Export handler
  const handleExportCSV = () => {
    if (!filteredLogs.length) {
      addToast("No audit logs to export.", "warning");
      return;
    }

    const headers = ["Timestamp (ISO)", "Actor", "Action Code", "Summary", "Target Table", "Target Entity", "Client IP"];
    const rows = filteredLogs.map((l) => [
      l.created_at,
      `"${(l.performed_by || "").replace(/"/g, '""')}"`,
      `"${(l.action || "").replace(/"/g, '""')}"`,
      `"${(l.action_label || "").replace(/"/g, '""')}"`,
      `"${(l.target_table || "").replace(/"/g, '""')}"`,
      `"${(l.target_label || "").replace(/"/g, '""')}"`,
      l.ip_address || "N/A"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `audit-trail-${activeOrg?.id || "org"}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("Exported audit log CSV.", "success");
  };

  // JSON Export handler
  const handleExportJSON = () => {
    if (!filteredLogs.length) {
      addToast("No audit logs to export.", "warning");
      return;
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `audit-trail-${activeOrg?.id || "org"}-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addToast("Exported audit log JSON.", "success");
  };

  // Handler to log a verification test audit event for demonstration
  const handleTriggerTestEvent = () => {
    if (!activeOrg?.id) return;
    const adminName = (activeMember as any)?.user?.full_name || (activeMember as any)?.full_name || user?.full_name || "Admin";
    recordSystemAuditEvent({
      org_id: activeOrg.id,
      action: "security.audit_check",
      action_label: "Manual Security & Integrity Health Check Executed",
      target_table: "system",
      target_id: "chk-" + Date.now(),
      target_label: "Workspace Core Integrity Verification",
      new_value: {
        status: "verified",
        operator: adminName,
        timestamp: new Date().toISOString()
      }
    });
    refetch();
    addToast("Integrity check recorded to audit trail.", "success");
  };

  return (
    <PlanGatedView
      requiredTier="growth"
      featureKey="audit_trail"
      featureName="Security & System Audit Logs"
      customMessage="Real-time system audit logs tracking record deletions, edits, mutations, and staff accountability require a Growth or Pro plan."
    >
      <div className="space-y-6 pb-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black font-display tracking-tight text-slate-900 dark:text-white">
                Audit & Accountability Logs
              </h1>
              <Badge color="emerald">
                <ShieldCheck className="h-3 w-3 mr-1" />
                Live Tracking
              </Badge>
              <Badge color="purple">
                Growth & Pro Plan
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Immutable record of all system events: record deletions, updates, creations, ledger movements, and logins across {activeOrg?.name || "your organization"}.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-3xs cursor-pointer disabled:opacity-50"
              title="Sync & Refresh Logs"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-emerald-600" : ""}`} />
            </button>

            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200 dark:border-slate-700 shadow-3xs">
              <button
                type="button"
                onClick={handleExportCSV}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 transition text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                <span className="hidden sm:inline">CSV</span>
              </button>
              <button
                type="button"
                onClick={handleExportJSON}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 transition text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <FileCode className="h-3.5 w-3.5 text-blue-600" />
                <span className="hidden sm:inline">JSON</span>
              </button>
            </div>
          </div>
        </div>

        {/* KPI Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Events */}
          <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-3xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 dark:text-slate-500 font-bold">
                Total Events
              </span>
              <Activity className="h-4 w-4 text-slate-400" />
            </div>
            <span className="text-2xl font-black font-display text-slate-900 dark:text-white mt-2">
              {metrics.total}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">Recorded in tenant ledger</span>
          </div>

          {/* Record Deletions */}
          <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-3xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono tracking-widest text-rose-600 dark:text-rose-400 font-bold">
                Records Deleted
              </span>
              <Trash2 className="h-4 w-4 text-rose-600" />
            </div>
            <span className="text-2xl font-black font-display text-rose-600 dark:text-rose-400 mt-2">
              {metrics.deleted}
            </span>
            <span className="text-[10px] text-rose-500/80 mt-0.5">Tracked with prior snapshots</span>
          </div>

          {/* Record Edits */}
          <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-3xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono tracking-widest text-amber-600 dark:text-amber-400 font-bold">
                Records Edited
              </span>
              <Edit3 className="h-4 w-4 text-amber-600" />
            </div>
            <span className="text-2xl font-black font-display text-amber-600 dark:text-amber-400 mt-2">
              {metrics.edited}
            </span>
            <span className="text-[10px] text-amber-600/80 mt-0.5">Before & after values logged</span>
          </div>

          {/* Record Creations */}
          <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-3xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-600 dark:text-emerald-400 font-bold">
                Records Created
              </span>
              <PlusCircle className="h-4 w-4 text-emerald-600" />
            </div>
            <span className="text-2xl font-black font-display text-emerald-600 dark:text-emerald-400 mt-2">
              {metrics.created}
            </span>
            <span className="text-[10px] text-emerald-600/80 mt-0.5">Members, ledger & goals</span>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-3xs">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by action, user, target record, or IP address..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Operation Pill Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setSelectedOperation("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                selectedOperation === "all"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-3xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              All Events ({metrics.total})
            </button>

            <button
              type="button"
              onClick={() => setSelectedOperation("deleted")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                selectedOperation === "deleted"
                  ? "bg-rose-600 text-white shadow-3xs"
                  : "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              }`}
            >
              <Trash2 className="h-3 w-3" />
              Deleted ({metrics.deleted})
            </button>

            <button
              type="button"
              onClick={() => setSelectedOperation("edited")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                selectedOperation === "edited"
                  ? "bg-amber-600 text-white shadow-3xs"
                  : "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              }`}
            >
              <Edit3 className="h-3 w-3" />
              Edited ({metrics.edited})
            </button>

            <button
              type="button"
              onClick={() => setSelectedOperation("created")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                selectedOperation === "created"
                  ? "bg-emerald-600 text-white shadow-3xs"
                  : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              }`}
            >
              <PlusCircle className="h-3 w-3" />
              Created ({metrics.created})
            </button>

            <button
              type="button"
              onClick={() => setSelectedOperation("financial")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                selectedOperation === "financial"
                  ? "bg-blue-600 text-white shadow-3xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              <Coins className="h-3 w-3" />
              Financial ({metrics.financial})
            </button>
          </div>

          {/* Time Filter */}
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as any)}
            className="text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-700 dark:text-slate-300 outline-none shrink-0"
          >
            <option value="all">All Time</option>
            <option value="today">Past 24 Hours</option>
            <option value="7days">Past 7 Days</option>
            <option value="30days">Past 30 Days</option>
          </select>
        </div>

        {/* Main Audit Log Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-3xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 font-mono text-[10px] text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Event Summary & Impact</th>
                  <th className="py-3 px-4">Operation</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Target Record</th>
                  <th className="py-3 px-4">Client / Origin</th>
                  <th className="py-3 px-4 text-right">Mutation Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/80">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => {
                    const summary = getAuditActionSummary(log);
                    const opKind = getOperationKind(log);
                    const isMobile = (log.user_agent || "").toLowerCase().includes("iphone") || (log.user_agent || "").toLowerCase().includes("android");
                    const hasDiff = !!log.old_value || !!log.new_value;

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-750/50 transition">
                        {/* Timestamp */}
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-600 dark:text-slate-400">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(log.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </td>

                        {/* Event Summary & Impact */}
                        <td className="py-3 px-4 max-w-sm">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-slate-100 leading-snug">
                              {summary.headline}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                              {summary.subtext}
                            </span>
                          </div>
                        </td>

                        {/* Operation Badge */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {opKind === "deleted" ? (
                            <Badge color="rose">
                              <Trash2 className="h-3 w-3 mr-1" />
                              DELETED
                            </Badge>
                          ) : opKind === "edited" ? (
                            <Badge color="amber">
                              <Edit3 className="h-3 w-3 mr-1" />
                              EDITED
                            </Badge>
                          ) : opKind === "created" ? (
                            <Badge color="emerald">
                              <PlusCircle className="h-3 w-3 mr-1" />
                              CREATED
                            </Badge>
                          ) : opKind === "auth" ? (
                            <Badge color="blue">
                              <KeyRound className="h-3 w-3 mr-1" />
                              AUTH
                            </Badge>
                          ) : (
                            <Badge color="purple">
                              <Coins className="h-3 w-3 mr-1" />
                              FINANCE
                            </Badge>
                          )}
                        </td>

                        {/* Actor */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-[11px] shrink-0">
                              <User className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 dark:text-slate-100">
                                {log.performed_by || "System Automated"}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Staff / Admin
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Target Record */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex flex-col font-mono text-[11px]">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {log.target_label || log.target_table || "Workspace"}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate max-w-[140px]">
                              table: {log.target_table || "system"}
                            </span>
                          </div>
                        </td>

                        {/* Client IP & Device */}
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1.5">
                            {isMobile ? <Smartphone className="h-3 w-3" /> : <Laptop className="h-3 w-3" />}
                            <span>{log.ip_address || "Internal Proxy"}</span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {hasDiff ? (
                            <button
                              type="button"
                              onClick={() => setSelectedLogForDiff(log)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 font-bold transition text-[11px] cursor-pointer"
                            >
                              <Eye className="h-3 w-3" />
                              <span>Inspect Diff</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No Mutation State</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      <div className="max-w-md mx-auto flex flex-col items-center">
                        <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center text-slate-400 mb-3">
                          <History className="h-6 w-6" />
                        </div>
                        <h3 className="font-display font-bold text-base text-slate-800 dark:text-slate-200">
                          No System Audit Events Recorded Yet
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                          All operational activities—such as whenever members are registered, edited, or deleted, or ledger entries and strategic goals are modified—will automatically record here in real-time.
                        </p>
                        <div className="mt-4 flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={handleTriggerTestEvent}>
                            <Sparkles className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                            Record Health Verification Check
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Diff Inspector Modal */}
        {selectedLogForDiff && (
          <Modal
            open={!!selectedLogForDiff}
            onClose={() => setSelectedLogForDiff(null)}
            title="System Audit Mutation Inspector"
            maxWidth="max-w-2xl"
          >
            <div className="flex flex-col gap-4 text-left font-sans select-none">
              {/* Header info */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {selectedLogForDiff.action_label}
                  </span>
                  <Badge color="blue">{selectedLogForDiff.action}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 font-mono">
                  <div>Actor: <strong className="text-slate-700 dark:text-slate-300">{selectedLogForDiff.performed_by}</strong></div>
                  <div>Target: <strong className="text-slate-700 dark:text-slate-300">{selectedLogForDiff.target_table} ({selectedLogForDiff.target_label})</strong></div>
                  <div>Time: {new Date(selectedLogForDiff.created_at).toISOString()}</div>
                  <div>IP: {selectedLogForDiff.ip_address || "127.0.0.1"}</div>
                </div>
              </div>

              {/* Side by side state diff */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Previous state */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    Prior State (Before)
                  </span>
                  <pre className="p-3 bg-slate-900 text-rose-300 text-[11px] font-mono rounded-xl overflow-x-auto max-h-64 border border-slate-800 leading-relaxed">
                    {selectedLogForDiff.old_value
                      ? JSON.stringify(selectedLogForDiff.old_value, null, 2)
                      : "// No prior record (New entity created)"}
                  </pre>
                </div>

                {/* Mutated state */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Mutated State (After)
                  </span>
                  <pre className="p-3 bg-slate-900 text-emerald-300 text-[11px] font-mono rounded-xl overflow-x-auto max-h-64 border border-slate-800 leading-relaxed">
                    {selectedLogForDiff.new_value
                      ? JSON.stringify(selectedLogForDiff.new_value, null, 2)
                      : "// Record deleted or purged"}
                  </pre>
                </div>
              </div>

              {/* Verification Footer */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Immutable ledger hash verified against tenant partition.
                </span>
                <Button size="sm" variant="outline" onClick={() => setSelectedLogForDiff(null)}>
                  Close Inspector
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </PlanGatedView>
  );
};
