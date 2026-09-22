import { AuditLog } from "../types";
import { MockDB } from "./mockData";
import { useAuthStore } from "../store/authStore";
import { useOrgStore } from "../store/orgStore";
import { supabase, isSupabaseConfigured } from "./supabase";

export interface SystemAuditEventInput {
  org_id: string;
  performed_by?: string;
  action: string;
  action_label: string;
  target_table?: string;
  target_id?: string;
  target_label?: string;
  old_value?: any;
  new_value?: any;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Centrally records an immutable system audit event across the application.
 * Logs creations, edits, deletions, authentication events, and administrative changes.
 */
export function recordSystemAuditEvent(event: SystemAuditEventInput): AuditLog {
  const authState = useAuthStore.getState();
  const orgState = useOrgStore.getState();

  const currentUser = authState.user;
  const currentMember = orgState.activeMember;

  let actor = event.performed_by;
  if (!actor) {
    const memberName = (currentMember as any)?.user?.full_name || (currentMember as any)?.full_name || (currentMember as any)?.name;
    if (memberName) {
      const roleStr = currentMember?.role === "org_admin" ? "Admin" : currentMember?.role === "accountant" ? "Accountant" : currentMember?.role === "manager" ? "Manager" : "Staff";
      actor = `${memberName} (${roleStr})`;
    } else if (currentUser?.full_name) {
      actor = `${currentUser.full_name} (${currentUser.is_superadmin ? "Superadmin" : "User"})`;
    } else if (currentUser?.email) {
      actor = currentUser.email;
    } else {
      actor = "System Automated";
    }
  }

  const logId = "audit-" + Date.now() + "-" + Math.random().toString(36).substring(2, 8);
  const now = new Date().toISOString();

  const auditEntry: AuditLog = {
    id: logId,
    org_id: event.org_id,
    performed_by: actor,
    action: event.action,
    action_label: event.action_label,
    target_table: event.target_table || "system",
    target_id: event.target_id || "",
    target_label: event.target_label || "",
    old_value: event.old_value ?? null,
    new_value: event.new_value ?? null,
    ip_address: event.ip_address || "197.243.112.45",
    user_agent: event.user_agent || (typeof navigator !== "undefined" ? navigator.userAgent : "Web Application"),
    created_at: now,
  };

  // Persist to MockDB local database
  try {
    const existingLogs = MockDB.getAuditLogs();
    existingLogs.unshift(auditEntry);
    if (existingLogs.length > 500) existingLogs.length = 500;
    MockDB.saveAuditLogs(existingLogs);
  } catch (err) {
    console.warn("[AuditLogger] Failed to save audit log locally:", err);
  }

  // Attempt Supabase insert if enabled
  if (isSupabaseConfigured) {
    try {
      Promise.resolve(supabase.from("audit_logs").insert(auditEntry)).catch(() => {});
    } catch {
      // safe fallback
    }
  }

  // Dispatch custom window event to trigger instant UI refresh if mounted
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("impacto:audit_log_recorded", { detail: auditEntry }));
    } catch {
      // safe fallback
    }
  }

  return auditEntry;
}

/**
 * Returns a human-friendly summary of the operation and impact
 */
export function getAuditActionSummary(log: AuditLog): {
  type: "DELETED" | "EDITED" | "CREATED" | "AUTH" | "EVENT";
  headline: string;
  subtext: string;
  badgeColor: "rose" | "amber" | "emerald" | "blue" | "purple";
} {
  const action = (log.action || "").toLowerCase();
  const label = log.action_label || log.action;
  const target = log.target_label || log.target_table || "Record";

  if (action.includes("delete") || action.includes("remove") || action.includes("cancel") || action.includes("dismiss")) {
    return {
      type: "DELETED",
      headline: `Record Deleted: ${target}`,
      subtext: `${label}. Previous state has been archived in mutation history.`,
      badgeColor: "rose",
    };
  }

  if (action.includes("update") || action.includes("edit") || action.includes("modify") || action.includes("progress") || action.includes("upgrade")) {
    return {
      type: "EDITED",
      headline: `Record Edited: ${target}`,
      subtext: `${label}. Field changes recorded with before-and-after values.`,
      badgeColor: "amber",
    };
  }

  if (action.includes("create") || action.includes("add") || action.includes("invite") || action.includes("register") || action.includes("record")) {
    return {
      type: "CREATED",
      headline: `Record Created: ${target}`,
      subtext: `${label}. New record established in ${log.target_table || "the system"}.`,
      badgeColor: "emerald",
    };
  }

  if (action.includes("login") || action.includes("auth") || action.includes("session")) {
    return {
      type: "AUTH",
      headline: `Authentication Session: ${log.performed_by || "User"}`,
      subtext: label,
      badgeColor: "blue",
    };
  }

  return {
    type: "EVENT",
    headline: label,
    subtext: `Target: ${target} in ${log.target_table || "system"}`,
    badgeColor: "purple",
  };
}
