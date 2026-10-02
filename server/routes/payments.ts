import { Router } from "express";
import {
  initiatePawaPayDeposit,
  predictPawaPayProvider,
  getPawaPayActiveConfig,
  checkPawaPayDepositStatus,
  formatPawaPayPhoneNumber,
  recordPawaPayWebhookEvent,
} from "../services/pawapayService";

const router = Router();

// POST /api/payments/pawapay/deposit - initiates MoMo push to user handset
router.post("/pawapay/deposit", async (req, res) => {
  try {
    const result = await initiatePawaPayDeposit(req.body);
    res.json(result);
  } catch (err: any) {
    console.error("[pawaPay Deposit Error]:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to initiate deposit" });
  }
});

// GET /api/payments/pawapay/status/:depositId - poll real-time status of the USSD prompt
router.get("/pawapay/status/:depositId", async (req, res) => {
  try {
    const { depositId } = req.params;
    const result = await checkPawaPayDepositStatus(depositId);
    res.json(result);
  } catch (err: any) {
    console.error("[pawaPay Status Check Error]:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/payments/pawapay/active-conf
router.get("/pawapay/active-conf", async (req, res) => {
  res.json(getPawaPayActiveConfig());
});

// POST /api/payments/predict-provider
router.post("/predict-provider", async (req, res) => {
  const { phoneNumber } = req.body;
  const provider = predictPawaPayProvider(phoneNumber);
  const formattedPhone = formatPawaPayPhoneNumber(phoneNumber);
  res.json({ phoneNumber, formattedPhone, predictedProvider: provider });
});

// POST /api/payments/webhook (Universal Payment Gateway Webhook Receiver)
router.post("/webhook", async (req, res) => {
  try {
    const payload = req.body;
    console.log("[Payment Webhook Inbound Payload]:", JSON.stringify(payload));
    
    // Process standard Mobile Money / Card gateway callback events and auto-reconcile
    await recordPawaPayWebhookEvent(payload);
    const transactionReference = payload?.reference || payload?.depositId || payload?.tx_ref || payload?.id;
    const status = (payload?.status || payload?.state || "").toLowerCase();
    const isSuccess = status === "completed" || status === "successful" || status === "success" || status === "paid";
    
    res.json({
      success: true,
      received: true,
      transactionReference,
      status: isSuccess ? "approved" : status || "pending",
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error("[Payment Webhook Error]:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/payments/momo/callback
router.post("/momo/callback", async (req, res) => {
  try {
    const data = req.body;
    console.log("[MTN/Airtel MoMo Callback]:", data);
    await recordPawaPayWebhookEvent(data);
    res.json({ status: "acknowledged", receivedAt: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ status: "error", error: err.message });
  }
});

// ========================================================
// SUBSCRIPTION & PACKAGE PAYMENTS LEDGER (Server-Authoritative)
// Ensures accountant/admin purchases always land on super admin dashboard
// ========================================================
interface ServerSubPayment {
  id: string;
  org_id: string;
  plan: string;
  amount_usd?: number;
  amount_local: number;
  method: string;
  phone: string;
  reference: string;
  proof_url?: string | null;
  status: "awaiting_approval" | "approved" | "rejected";
  submitted_at: string;
  validated_at?: string | null;
  audited_at?: string | null;
  audited_by?: string | null;
  audited_by_name?: string | null;
  audit_notes?: string | null;
  package_id?: string | null;
  item_type?: "subscription" | "package";
}

let serverSubPayments: ServerSubPayment[] = [];

// GET /api/payments/subscription-payments - retrieve all ledger entries
router.get("/subscription-payments", (req, res) => {
  const orgId = req.query.org_id as string | undefined;
  if (orgId) {
    const filtered = serverSubPayments.filter((p) => p.org_id === orgId);
    return res.json({ success: true, data: filtered });
  }
  res.json({ success: true, data: serverSubPayments });
});

// POST /api/payments/subscription-payments - record purchase from accountant/admin
router.post("/subscription-payments", (req, res) => {
  try {
    const payload = req.body || {};
    const newId = payload.id || `sub-pay-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 6)}`;
    const newPayment: ServerSubPayment = {
      id: newId,
      org_id: payload.org_id || "default-org",
      plan: payload.plan || "Growth Plan - $25/mo",
      amount_usd: payload.amount_usd !== undefined ? Number(payload.amount_usd) : 25,
      amount_local: payload.amount_local !== undefined ? Number(payload.amount_local) : 33750,
      method: payload.method || "mtn",
      phone: payload.phone || "",
      reference: payload.reference || `REF-${Date.now().toString().slice(-6)}`,
      proof_url: payload.proof_url || null,
      status: payload.status || "awaiting_approval",
      submitted_at: payload.submitted_at || new Date().toISOString(),
      package_id: payload.package_id || null,
      item_type: payload.item_type || (payload.package_id ? "package" : "subscription"),
    };

    // Prepend to server ledger (deduplicating by id AND org_id + reference)
    const cleanRef = (newPayment.reference || "").trim().toLowerCase();
    serverSubPayments = [
      newPayment,
      ...serverSubPayments.filter((p) => {
        if (p.id === newId) return false;
        if (cleanRef && p.org_id === newPayment.org_id && (p.reference || "").trim().toLowerCase() === cleanRef) {
          return false;
        }
        return true;
      })
    ];
    console.log("[Subscription Payment Logged on Server]:", newPayment.id, newPayment.plan, newPayment.org_id);

    res.json({
      success: true,
      message: "Subscription payment recorded and visible on Super Admin dashboard",
      data: newPayment
    });
  } catch (err: any) {
    console.error("[Subscription Payment Server Record Error]:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/payments/subscription-payments/:id - Super Admin approve/reject
router.patch("/subscription-payments/:id", (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    const index = serverSubPayments.findIndex((p) => p.id === id);
    if (index === -1) {
      // Create if not found
      const newEntry: ServerSubPayment = {
        id,
        org_id: updates.org_id || "default-org",
        plan: updates.plan || "Growth Plan",
        amount_local: updates.amount_local || 33750,
        method: updates.method || "mtn",
        phone: updates.phone || "",
        reference: updates.reference || "AUDITED",
        status: updates.status || "approved",
        submitted_at: new Date().toISOString(),
        ...updates
      };
      serverSubPayments.unshift(newEntry);
      return res.json({ success: true, data: newEntry });
    }

    serverSubPayments[index] = {
      ...serverSubPayments[index],
      ...updates,
      validated_at: updates.status === "approved" ? new Date().toISOString() : serverSubPayments[index].validated_at,
      audited_at: new Date().toISOString()
    };

    console.log("[Subscription Payment Status Updated on Server]:", id, serverSubPayments[index].status);
    res.json({ success: true, data: serverSubPayments[index] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
