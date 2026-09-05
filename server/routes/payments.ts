import { Router } from "express";
import {
  initiatePawaPayDeposit,
  predictPawaPayProvider,
  getPawaPayActiveConfig,
} from "../services/pawapayService";

const router = Router();

// POST /api/payments/pawapay/deposit
router.post("/pawapay/deposit", async (req, res) => {
  try {
    const result = await initiatePawaPayDeposit(req.body);
    res.json(result);
  } catch (err: any) {
    console.error("[pawaPay Deposit Error]:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to initiate deposit" });
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
  res.json({ phoneNumber, predictedProvider: provider });
});

// POST /api/payments/webhook (Universal Payment Gateway Webhook Receiver)
router.post("/webhook", async (req, res) => {
  try {
    const payload = req.body;
    console.log("[Payment Webhook Inbound Payload]:", JSON.stringify(payload));
    
    // Process standard Mobile Money / Card gateway callback events
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
    res.json({ status: "acknowledged", receivedAt: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ status: "error", error: err.message });
  }
});

export default router;
