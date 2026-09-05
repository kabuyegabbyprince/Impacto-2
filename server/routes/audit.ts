import { Router } from "express";
import { getSupabaseAdminClient, hasSupabaseCredentials } from "../services/supabaseAdmin";

const router = Router();

// GET /api/audit-logs
router.get("/", async (req, res) => {
  try {
    const orgId = req.query.orgId as string;
    if (!orgId) {
      return res.status(400).json({ error: "Missing required query parameter: orgId" });
    }

    if (hasSupabaseCredentials()) {
      const supabaseService = getSupabaseAdminClient();
      if (supabaseService) {
        const { data, error } = await supabaseService
          .from("audit_logs")
          .select("*")
          .eq("org_id", orgId)
          .order("created_at", { ascending: false })
          .limit(100);

        if (!error && data) {
          const formatted = data.map((row: any) => ({
            ...row,
            action_type: row.action_type || row.action,
            description: row.description || row.action_label,
            actor_name: row.actor_name || row.target_label || row.performed_by || "System User",
            staff_name: row.staff_name || row.actor_name || row.target_label || row.performed_by || "System User",
            metadata_json: row.metadata_json || row.new_value,
          }));
          return res.json({ success: true, logs: formatted });
        }
      }
    }

    return res.json({ success: true, logs: [] });
  } catch (error: any) {
    console.error("[Audit API] Fetch failed:", error);
    res.status(500).json({ error: "Failed to fetch audit logs.", details: error.message });
  }
});

// POST /api/audit-logs/create
router.post("/create", async (req, res) => {
  try {
    const body = req.body || {};
    const org_id = body.org_id;
    const action = body.action || body.action_type;

    if (!org_id || !action) {
      return res.status(400).json({ error: "Missing required parameters: org_id and action (or action_type)" });
    }

    const action_label = body.action_label || body.description || body.action_type || action || "System Action";
    const actor_name = body.actor_name || body.staff_name || body.target_label || "System User";
    const user_id = body.performed_by || body.user_id || null;
    const target_table = body.target_table || (body.metadata_json?.target_ids || body.metadata_json?.fee_id ? "member_fees" : null);
    const target_id = body.target_id || body.metadata_json?.fee_id || (Array.isArray(body.metadata_json?.target_ids) ? body.metadata_json.target_ids[0] : null);
    const target_label = body.target_label || actor_name || null;
    const old_value = body.old_value || null;
    const new_value = body.new_value || body.metadata_json || null;
    const ip_address = body.ip_address || (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket?.remoteAddress || null;
    const user_agent = body.user_agent || (req.headers["user-agent"] as string) || null;
    const created_at = body.created_at || new Date().toISOString();
    const id = body.id || `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    if (hasSupabaseCredentials()) {
      const supabaseService = getSupabaseAdminClient();
      if (supabaseService) {
        let validUserId: string | null = null;
        if (user_id) {
          try {
            const { data: u } = await supabaseService.from("users").select("id").eq("id", user_id).maybeSingle();
            if (u?.id) validUserId = u.id;
          } catch {
            // ignore lookup error
          }
        }

        // Schema-safe payload strictly matching public.audit_logs table columns
        const logPayload = {
          id,
          org_id,
          performed_by: validUserId,
          action,
          action_label,
          target_table,
          target_id,
          target_label,
          old_value,
          new_value,
          ip_address,
          user_agent,
          created_at
        };

        let { data, error } = await supabaseService.from("audit_logs").upsert(logPayload).select();

        // If foreign key constraint failed on performed_by, retry with null
        if (error && error.code === "23503") {
          const retryLog = { ...logPayload, performed_by: null };
          const retryRes = await supabaseService.from("audit_logs").upsert(retryLog).select();
          data = retryRes.data;
          error = retryRes.error;
        }

        if (error) {
          console.warn("[Audit API] Error writing audit log:", error.message);
          return res.status(400).json({ error: error.message });
        }

        const responseLog = {
          ...logPayload,
          action_type: action,
          description: action_label,
          actor_name,
          metadata_json: new_value,
          user_id: logPayload.performed_by,
        };

        return res.json({ success: true, log: data?.[0] || responseLog });
      }
    }

    const fallbackLog = {
      id,
      org_id,
      performed_by: user_id,
      action,
      action_label,
      target_table,
      target_id,
      target_label,
      old_value,
      new_value,
      ip_address,
      user_agent,
      created_at,
      action_type: action,
      description: action_label,
      actor_name,
      metadata_json: new_value,
      user_id,
    };

    res.json({ success: true, log: fallbackLog, bypassed: true });
  } catch (error: any) {
    console.error("[Audit API] Create failed:", error);
    res.status(500).json({ error: "Failed to create audit log.", details: error.message });
  }
});

export default router;
