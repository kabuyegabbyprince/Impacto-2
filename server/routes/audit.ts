import { Router } from "express";
import { getSupabaseAdminClient, hasSupabaseCredentials } from "../services/supabaseAdmin";

const router = Router();

// POST /api/audit-logs/create
router.post("/create", async (req, res) => {
  try {
    const { id, org_id, user_id, actor_name, action_type, description, metadata_json, created_at } = req.body;
    if (!org_id || !action_type) {
      return res.status(400).json({ error: "Missing required parameters: org_id and action_type" });
    }

    const logPayload = {
      id: id || `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      org_id,
      user_id: user_id || null,
      actor_name: actor_name || "System User",
      action_type,
      description: description || action_type,
      metadata_json: metadata_json || {},
      created_at: created_at || new Date().toISOString()
    };

    if (hasSupabaseCredentials()) {
      const supabaseService = getSupabaseAdminClient();
      if (supabaseService) {
        const { data, error } = await supabaseService.from("audit_logs").upsert(logPayload).select();
        if (error) {
          console.warn("[Audit API] Error writing audit log:", error.message);
          return res.status(400).json({ error: error.message });
        }
        return res.json({ success: true, log: data?.[0] || logPayload });
      }
    }

    res.json({ success: true, log: logPayload, bypassed: true });
  } catch (error: any) {
    console.error("[Audit API] Create failed:", error);
    res.status(500).json({ error: "Failed to create audit log.", details: error.message });
  }
});

export default router;
