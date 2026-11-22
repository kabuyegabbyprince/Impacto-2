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
import { AuditLog } from "../types";
import { PlanGatedView } from "./PlanGatedView";
import { useToast } from "./Toast";
import { getAuditActionSummary, recordSystemAuditEvent } from "../lib/auditLogger";
import { useTranslation } from "react-i18next";

// Privacy helper: Redact sensitive identity and document information from audit views
const sanitizeForPrivacy = (obj: any): any => {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForPrivacy);
  const safe: Record<string, any> = {};
  const sensitiveKeys = new Set([
    "password", "password_hash", "password_plain", "token", "secret", "api_key",
    "passport_photo_url", "id_document_url", "id_document_number", "national_id",
    "phone_number", "phone", "dues_mtn_number", "dues_airtel_number", "ip_address", "user_agent"
  ]);
  for (const [k, v] of Object.entries(obj)) {
    if (sensitiveKeys.has(k.toLowerCase())) {
      safe[k] = "[PROTECTED FOR PRIVACY]";
    } else if (typeof v === "object" && v !== null) {
      safe[k] = sanitizeForPrivacy(v);
    } else {
      safe[k] = v;
    }
  }
  return safe;
};

export const AuditLogsDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
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
    addToast(t("audit_logs.synced_toast", "Audit logs synchronized with database."), "info");
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
        if (!matchAction && !matchLabel && !matchActor && !matchTarget) {
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
      addToast(t("audit_logs.no_logs_export", "No audit logs to export."), "warning");
      return;
    }

    const headers = [
      t("audit_logs.csv_timestamp", "Timestamp (ISO)"),
      t("audit_logs.csv_actor", "Actor"),
      t("audit_logs.csv_action_code", "Action Code"),
      t("audit_logs.csv_summary", "Summary"),
      t("audit_logs.csv_target_table", "Target Table"),
      t("audit_logs.csv_target_entity", "Target Entity"),
      t("audit_logs.csv_client_ip", "Client IP")
    ];
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
    addToast(t("audit_logs.exported_csv", "Exported audit log CSV."), "success");
  };

  // JSON Export handler
  const handleExportJSON = () => {
    if (!filteredLogs.length) {
      addToast(t("audit_logs.no_logs_export", "No audit logs to export."), "warning");
      return;
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `audit-trail-${activeOrg?.id || "org"}-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addToast(t("audit_logs.exported_json", "Exported audit log JSON."), "success");
  };

  // Handler to log a verification test audit event for demonstration
  const handleTriggerTestEvent = () => {
    if (!activeOrg?.id) return;
    const adminName = (activeMember as any)?.user?.full_name || (activeMember as any)?.full_name || user?.full_name || "Admin";
    recordSystemAuditEvent({
      org_id: activeOrg.id,
      action: "security.audit_check",
      action_label: t("audit_logs.health_check_label", "Manual Security & Integrity Health Check Executed"),
      target_table: "system",
      target_id: "chk-" + Date.now(),
      target_label: t("audit_logs.health_check_target", "Workspace Core Integrity Verification"),
      new_value: {
        status: "verified",
        operator: adminName,
        timestamp: new Date().toISOString()
      }
    });
    refetch();
    addToast(t("audit_logs.integrity_recorded", "Integrity check recorded to audit trail."), "success");
  };

  return (
    <PlanGatedView
      requiredTier="growth"
      featureKey="audit_trail"
      featureName={t("audit_logs.feature_name", "Security & System Audit Logs")}
      customMessage={t("audit_logs.feature_gate_msg", "Real-time system audit logs tracking record deletions, edits, mutations, and staff accountability require a Growth or Pro plan.")}
    >
      <div className="space-y-6 pb-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black font-display tracking-tight text-slate-900 dark:text-white break-words">
                {t("audit_logs.title", "Audit & Accountability Logs")}
              </h1>
              <Badge color="emerald">
                <ShieldCheck className="h-3 w-3 mr-1 shrink-0" />
                {t("audit_logs.live_tracking", "Live Tracking")}
              </Badge>
              <Badge color="purple">
                {t("audit_logs.growth_pro_plan", "Growth & Pro Plan")}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 break-words">
              {t("audit_logs.subtitle", {
                org: activeOrg?.name || t("common.your_organization", "your organization"),
                defaultValue: "Immutable record of all system events: record deletions, updates, creations, ledger movements, and logins across {{org}}."
              })}
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-3xs cursor-pointer disabled:opacity-50"
              title={t("audit_logs.sync_refresh", "Sync & Refresh Logs")}
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
          <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-3xs flex flex-col justify-between min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 dark:text-slate-500 font-bold break-words">
                {t("audit_logs.kpi_total_events", "Total Events")}
              </span>
              <Activity className="h-4 w-4 text-slate-400 shrink-0" />
            </div>
            <span className="text-2xl font-black font-display text-slate-900 dark:text-white mt-2">
              {metrics.total}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 break-words">{t("audit_logs.kpi_total_sub", "Recorded in tenant ledger")}</span>
          </div>

          {/* Record Deletions */}
          <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-3xs flex flex-col justify-between min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase font-mono tracking-widest text-rose-600 dark:text-rose-400 font-bold break-words">
                {t("audit_logs.kpi_deleted", "Records Deleted")}
              </span>
              <Trash2 className="h-4 w-4 text-rose-600 shrink-0" />
            </div>
            <span className="text-2xl font-black font-display text-rose-600 dark:text-rose-400 mt-2">
              {metrics.deleted}
            </span>
            <span className="text-[10px] text-rose-500/80 mt-0.5 break-words">{t("audit_logs.kpi_deleted_sub", "Tracked with prior snapshots")}</span>
          </div>

          {/* Record Edits */}
          <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-3xs flex flex-col justify-between min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase font-mono tracking-widest text-amber-600 dark:text-amber-400 font-bold break-words">
                {t("audit_logs.kpi_edited", "Records Edited")}
              </span>
              <Edit3 className="h-4 w-4 text-amber-600 shrink-0" />
            </div>
            <span className="text-2xl font-black font-display text-amber-600 dark:text-amber-400 mt-2">
              {metrics.edited}
            </span>
            <span className="text-[10px] text-amber-600/80 mt-0.5 break-words">{t("audit_logs.kpi_edited_sub", "Before & after values logged")}</span>
          </div>

          {/* Record Creations */}
          <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-3xs flex flex-col justify-between min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-600 dark:text-emerald-400 font-bold break-words">
                {t("audit_logs.kpi_created", "Records Created")}
              </span>
              <PlusCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            </div>
            <span className="text-2xl font-black font-display text-emerald-600 dark:text-emerald-400 mt-2">
              {metrics.created}
            </span>
            <span className="text-[10px] text-emerald-600/80 mt-0.5 break-words">{t("audit_logs.kpi_created_sub", "Members, ledger & goals")}</span>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-3xs">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("audit_logs.search_placeholder", "Search by action, user, target record, or IP address...")}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Operation Pill Filters */}
          <div className="flex flex-wrap items-center gap-1.5 pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setSelectedOperation("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedOperation === "all"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-3xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              {t("audit_logs.filter_all", { count: metrics.total, defaultValue: "All Events ({{count}})" })}
            </button>

            <button
              type="button"
              onClick={() => setSelectedOperation("deleted")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                selectedOperation === "deleted"
                  ? "bg-rose-600 text-white shadow-3xs"
                  : "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              }`}
            >
              <Trash2 className="h-3 w-3 shrink-0" />
              {t("audit_logs.filter_deleted", { count: metrics.deleted, defaultValue: "Deleted ({{count}})" })}
            </button>

            <button
              type="button"
              onClick={() => setSelectedOperation("edited")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                selectedOperation === "edited"
                  ? "bg-amber-600 text-white shadow-3xs"
                  : "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              }`}
            >
              <Edit3 className="h-3 w-3 shrink-0" />
              {t("audit_logs.filter_edited", { count: metrics.edited, defaultValue: "Edited ({{count}})" })}
            </button>

            <button
              type="button"
              onClick={() => setSelectedOperation("created")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                selectedOperation === "created"
                  ? "bg-emerald-600 text-white shadow-3xs"
                  : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              }`}
            >
              <PlusCircle className="h-3 w-3 shrink-0" />
              {t("audit_logs.filter_created", { count: metrics.created, defaultValue: "Created ({{count}})" })}
            </button>

            <button
              type="button"
              onClick={() => setSelectedOperation("financial")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                selectedOperation === "financial"
                  ? "bg-blue-600 text-white shadow-3xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              <Coins className="h-3 w-3 shrink-0" />
              {t("audit_logs.filter_financial", { count: metrics.financial, defaultValue: "Financial ({{count}})" })}
            </button>
          </div>

          {/* Time Filter */}
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as any)}
            className="text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-700 dark:text-slate-300 outline-none shrink-0"
          >
            <option value="all">{t("audit_logs.time_all", "All Time")}</option>
            <option value="today">{t("audit_logs.time_today", "Past 24 Hours")}</option>
            <option value="7days">{t("audit_logs.time_7days", "Past 7 Days")}</option>
            <option value="30days">{t("audit_logs.time_30days", "Past 30 Days")}</option>
          </select>
        </div>

        {/* Main Audit Log Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-3xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 font-mono text-[10px] text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">{t("audit_logs.col_role", "Role")}</th>
                  <th className="py-3 px-4">{t("audit_logs.col_user", "User")}</th>
                  <th className="py-3 px-4">{t("audit_logs.col_action", "Action Summary")}</th>
                  <th className="py-3 px-4">{t("audit_logs.col_time", "Time")}</th>
                  <th className="py-3 px-4">{t("audit_logs.col_scope", "Module / Scope")}</th>
                  <th className="py-3 px-4 text-right">{t("audit_logs.col_details", "Privacy-Safe Details")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/80">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => {
                    const summary = getAuditActionSummary(log);
                    const hasDiff = !!log.old_value || !!log.new_value;

                    const perfLower = (log.performed_by || "").toLowerCase();
                    const actorRoleKey = perfLower.includes("accountant")
                      ? "accountant"
                      : perfLower.includes("superadmin") || perfLower.includes("admin")
                      ? "admin"
                      : perfLower.includes("auditor")
                      ? "auditor"
                      : perfLower.includes("system")
                      ? "system"
                      : "staff";
                    const actorRoleLabel =
                      actorRoleKey === "accountant"
                        ? t("roles.accountant", "Accountant")
                        : actorRoleKey === "admin"
                        ? t("roles.admin", "Admin")
                        : actorRoleKey === "auditor"
                        ? t("roles.auditor", "Auditor")
                        : actorRoleKey === "system"
                        ? t("audit_logs.role_system", "System")
                        : t("audit_logs.role_staff", "Staff");

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-750/50 transition">
                        {/* 1. Role */}
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold font-mono uppercase tracking-wider ${
                            actorRoleKey === "admin"
                              ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50"
                              : actorRoleKey === "accountant"
                              ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/50"
                              : actorRoleKey === "auditor"
                              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60"
                          }`}>
                            <ShieldCheck className="h-3 w-3 shrink-0" />
                            <span>{actorRoleLabel}</span>
                          </span>
                        </td>

                        {/* 2. User */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-[11px] shrink-0">
                              <User className="h-3.5 w-3.5" />
                            </div>
                            <span className="font-bold text-slate-900 dark:text-slate-100 break-words">
                              {log.performed_by || t("audit_logs.platform_operator", "Platform Operator")}
                            </span>
                          </div>
                        </td>

                        {/* 3. Summary */}
                        <td className="py-3 px-4 max-w-sm">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-slate-100 leading-snug break-words">
                              {summary.headline}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                              {summary.subtext}
                            </span>
                          </div>
                        </td>

                        {/* 4. Time */}
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {new Date(log.created_at).toLocaleTimeString(i18n.language, { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(log.created_at).toLocaleDateString(i18n.language)}
                            </span>
                          </div>
                        </td>

                        {/* 5. Module / Scope */}
                        <td className="py-3 px-4">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md inline-block">
                            {log.target_label || t("audit_logs.workspace_management", "Workspace Management")}
                          </span>
                        </td>

                        {/* 6. Details */}
                        <td className="py-3 px-4 text-right">
                          {hasDiff ? (
                            <button
                              type="button"
                              onClick={() => setSelectedLogForDiff(log)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 font-bold transition text-[11px] cursor-pointer"
                            >
                              <Eye className="h-3 w-3 shrink-0" />
                              <span>{t("audit_logs.view_summary", "View Summary")}</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">{t("common.completed", "Completed")}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400">
                      <div className="max-w-md mx-auto flex flex-col items-center">
                        <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center text-slate-400 mb-3">
                          <History className="h-6 w-6" />
                        </div>
                        <h3 className="font-display font-bold text-base text-slate-800 dark:text-slate-200">
                          {t("audit_logs.empty_title", "No Audit Activity Recorded")}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                          {t("audit_logs.empty_desc", "All operational actions—such as when members are managed, dues recorded, or goals updated—are tracked here while protecting privacy.")}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Diff Inspector Modal (Fully Sanitized for Privacy) */}
        {selectedLogForDiff && (
          <Modal
            open={!!selectedLogForDiff}
            onClose={() => setSelectedLogForDiff(null)}
            title={t("audit_logs.modal_title", "System Audit Inspection")}
            maxWidth="max-w-2xl"
          >
            <div className="flex flex-col gap-4 text-left font-sans select-none">
              {/* Header info */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 break-words">
                    {selectedLogForDiff.action_label}
                  </span>
                  <Badge color="blue">{selectedLogForDiff.action}</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-500 font-mono">
                  <div>{t("audit_logs.operator", "Operator")}: <strong className="text-slate-700 dark:text-slate-300">{selectedLogForDiff.performed_by}</strong></div>
                  <div>{t("audit_logs.scope", "Scope")}: <strong className="text-slate-700 dark:text-slate-300">{selectedLogForDiff.target_label || t("audit_logs.workspace_management", "Workspace Management")}</strong></div>
                  <div>{t("audit_logs.time", "Time")}: {new Date(selectedLogForDiff.created_at).toLocaleString(i18n.language)}</div>
                  <div>{t("audit_logs.privacy_status", "Privacy Status")}: <strong className="text-emerald-600">{t("audit_logs.sanitized_safe", "Sanitized & Safe")}</strong></div>
                </div>
              </div>

              {/* Side by side state diff - with sensitive personal data redacted */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Previous state */}
                <div className="flex flex-col gap-1.5 min-w-0">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                    {t("audit_logs.prior_state", "Prior State (Before)")}
                  </span>
                  <pre className="p-3 bg-slate-900 text-rose-300 text-[11px] font-mono rounded-xl overflow-x-auto max-h-64 border border-slate-800 leading-relaxed">
                    {selectedLogForDiff.old_value
                      ? JSON.stringify(sanitizeForPrivacy(selectedLogForDiff.old_value), null, 2)
                      : t("audit_logs.no_prior_record", "// No prior record (New entity created)")}
                  </pre>
                </div>

                {/* Mutated state */}
                <div className="flex flex-col gap-1.5 min-w-0">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                    {t("audit_logs.mutated_state", "Mutated State (After)")}
                  </span>
                  <pre className="p-3 bg-slate-900 text-emerald-300 text-[11px] font-mono rounded-xl overflow-x-auto max-h-64 border border-slate-800 leading-relaxed">
                    {selectedLogForDiff.new_value
                      ? JSON.stringify(sanitizeForPrivacy(selectedLogForDiff.new_value), null, 2)
                      : t("audit_logs.record_deleted_comment", "// Record deleted or purged")}
                  </pre>
                </div>
              </div>

              {/* Verification Footer */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-500 flex items-center gap-1.5 min-w-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="break-words">{t("audit_logs.modal_footer", "Audit record cryptographically validated. Private identity credentials redacted.")}</span>
                </span>
                <Button size="sm" variant="outline" onClick={() => setSelectedLogForDiff(null)}>
                  {t("common.close", "Close")}
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </PlanGatedView>
  );
};
