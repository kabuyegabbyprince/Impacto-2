import { Router } from "express";
import { getSupabaseAdminClient, hasSupabaseCredentials } from "../services/supabaseAdmin";

const router = Router();

// Create member fee API bypassing RLS with service role client
router.post("/create", async (req, res) => {
  try {
    const {
      id,
      org_id,
      member_id,
      amount,
      currency,
      payment_period,
      period_date,
      status,
      paid_at,
      due_date,
      is_recurring,
      admin_note,
      proof_url,
    } = req.body;

    if (!org_id || !member_id) {
      return res.status(400).json({ error: "Missing required parameters: org_id, member_id" });
    }

    if (!hasSupabaseCredentials()) {
      return res.json({ success: true, bypassed: true });
    }

    const supabaseService = getSupabaseAdminClient();
    if (!supabaseService) {
      return res.json({ success: true, bypassed: true });
    }

    const feeId = id || `fee-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const feePayload = {
      id: feeId,
      org_id,
      member_id,
      amount: amount || 0,
      currency: currency || "RWF",
      payment_period: payment_period || "monthly",
      period_date: period_date || new Date().toISOString().slice(0, 7),
      status: status || "pending",
      paid_at: paid_at || null,
      due_date: due_date || null,
      is_recurring: is_recurring ?? true,
      admin_note: admin_note || null,
      proof_url: proof_url || null,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabaseService
      .from("member_fees")
      .upsert(feePayload)
      .select();

    if (error) {
      console.error("[Fees API] Create error:", error);
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true, fee: data?.[0] || feePayload });
  } catch (error: any) {
    console.error("[Fees API] Create failed:", error);
    res.status(500).json({ error: "Failed to create member fee", details: error.message });
  }
});

// Update member fee status API bypassing RLS with service role client
router.post("/update", async (req, res) => {
  try {
    const {
      id,
      org_id,
      member_id,
      amount,
      payment_period,
      period_date,
      status,
      paid_at,
      paid_by_method,
      transaction_reference,
      sender_info,
      reported_at,
      report_note,
      admin_note,
      proof_url,
    } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Missing required parameter: id" });
    }

    if (!hasSupabaseCredentials()) {
      return res.json({ success: true, bypassed: true });
    }

    const supabaseService = getSupabaseAdminClient();
    if (!supabaseService) {
      return res.json({ success: true, bypassed: true });
    }

    const updateData: any = {
      status,
      paid_at: paid_at || null,
      paid_by_method: paid_by_method || null,
      transaction_reference: transaction_reference || null,
      sender_info: sender_info || null,
      reported_at: reported_at || null,
      report_note: report_note || null,
      admin_note: admin_note || null,
      proof_url: proof_url || null,
    };

    if (org_id) updateData.org_id = org_id;
    if (member_id) updateData.member_id = member_id;
    if (amount !== undefined) updateData.amount = amount;
    if (payment_period) updateData.payment_period = payment_period;
    if (period_date) updateData.period_date = period_date;

    // First attempt direct update
    let { data, error } = await supabaseService
      .from("member_fees")
      .update(updateData)
      .eq("id", id)
      .select();

    // If no row updated, perform upsert fallback
    if (!error && (!data || data.length === 0)) {
      const fullPayload = {
        id,
        org_id: org_id || "default-org",
        member_id: member_id || "default-mem",
        amount: amount || 0,
        currency: "RWF",
        payment_period: payment_period || "monthly",
        period_date: period_date || new Date().toISOString().slice(0, 7),
        ...updateData,
        created_at: new Date().toISOString()
      };

      const upsertRes = await supabaseService
        .from("member_fees")
        .upsert(fullPayload)
        .select();

      if (upsertRes.error) {
        console.error("[Fees API] Database upsert fallback error:", upsertRes.error);
      } else {
        data = upsertRes.data;
      }
    } else if (error) {
      console.error("[Fees API] Database update error:", error);
    }

    res.json({ success: true, fee: data?.[0] });
  } catch (error: any) {
    console.error("[Fees API] Update failed:", error);
    res.status(500).json({ error: "Failed to update member fee.", details: error.message });
  }
});

// Delete member fee API with service role client and ledger/audit cleanup
router.post("/delete", async (req, res) => {
  try {
    const { id, org_id, user_name, user_id, fee_amount, fee_ref, member_name } = req.body;
    if (!id) {
      return res.status(400).json({ error: "Missing required parameter: id" });
    }

    if (hasSupabaseCredentials()) {
      const supabaseService = getSupabaseAdminClient();
      if (supabaseService) {
        // 1. Delete fee record
        const { error: deleteErr } = await supabaseService
          .from("member_fees")
          .delete()
          .eq("id", id);

        if (deleteErr) {
          console.warn("[Fees API] Direct delete warning:", deleteErr.message);
        }

        // 2. Clean up associated ledger entry
        if (org_id) {
          try {
            if (fee_ref) {
              await supabaseService
                .from("ledger_entries")
                .delete()
                .eq("org_id", org_id)
                .eq("reference", fee_ref);
            }
            await supabaseService
              .from("ledger_entries")
              .delete()
              .eq("org_id", org_id)
              .ilike("reference", `%${id.slice(0, 8)}%`);
          } catch (ledgerErr) {
            console.warn("[Fees API] Ledger cleanup notice:", ledgerErr);
          }
        }

        // 3. Record Audit Log in database
        if (org_id) {
          try {
            const auditPayload = {
              id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              org_id: org_id,
              user_id: user_id || null,
              actor_name: user_name || "Accountant",
              action_type: "fee_deleted",
              description: `Deleted fee due record (ID: ${id}) for member ${member_name || "N/A"} - Amount: ${fee_amount ? Number(fee_amount).toLocaleString() + " RWF" : "N/A"}`,
              metadata_json: { fee_id: id, amount: fee_amount, ref: fee_ref },
              created_at: new Date().toISOString()
            };
            await supabaseService.from("audit_logs").insert(auditPayload);
          } catch (auditErr) {
            console.warn("[Fees API] Audit log write warning:", auditErr);
          }
        }
      }
    }

    res.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error("[Fees API] Delete failed:", error);
    res.status(500).json({ error: "Failed to delete member fee.", details: error.message });
  }
});

export default router;
