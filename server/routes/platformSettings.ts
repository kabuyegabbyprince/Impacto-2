import { Router, Request, Response } from "express";

const router = Router();

// Server-backed in-memory platform settings store with default configuration
let serverPlatformSettings: {
  id: string;
  usd_to_rwf_rate: number;
  eur_to_rwf_rate: number;
  kes_to_rwf_rate: number;
  mtn_payment_number: string;
  airtel_payment_number: string;
  momo_merchant_code: string;
  mtn_merchant_code: string;
  payment_name: string;
  updated_at: string;
} = {
  id: "global",
  usd_to_rwf_rate: 1400,
  eur_to_rwf_rate: 1450,
  kes_to_rwf_rate: 10,
  mtn_payment_number: "",
  airtel_payment_number: "",
  momo_merchant_code: "",
  mtn_merchant_code: "",
  payment_name: "VIRELLIX INC",
  updated_at: new Date().toISOString()
};

// GET /api/platform-settings - Fetch global operator billing parameters
router.get("/", (req: Request, res: Response) => {
  res.json({
    success: true,
    data: serverPlatformSettings
  });
});

// POST /api/platform-settings - Update operator billing parameters system-wide
router.post("/", (req: Request, res: Response) => {
  try {
    const payload = req.body || {};
    serverPlatformSettings = {
      ...serverPlatformSettings,
      ...payload,
      id: "global",
      usd_to_rwf_rate: Number(payload.usd_to_rwf_rate) || serverPlatformSettings.usd_to_rwf_rate || 1400,
      eur_to_rwf_rate: Number(payload.eur_to_rwf_rate) || serverPlatformSettings.eur_to_rwf_rate || 1450,
      kes_to_rwf_rate: Number(payload.kes_to_rwf_rate) || serverPlatformSettings.kes_to_rwf_rate || 10,
      mtn_payment_number: payload.mtn_payment_number !== undefined ? String(payload.mtn_payment_number).trim() : serverPlatformSettings.mtn_payment_number,
      airtel_payment_number: payload.airtel_payment_number !== undefined ? String(payload.airtel_payment_number).trim() : serverPlatformSettings.airtel_payment_number,
      momo_merchant_code: payload.momo_merchant_code !== undefined ? String(payload.momo_merchant_code).trim() : serverPlatformSettings.momo_merchant_code,
      mtn_merchant_code: payload.mtn_merchant_code !== undefined ? String(payload.mtn_merchant_code).trim() : (payload.momo_merchant_code || serverPlatformSettings.mtn_merchant_code),
      payment_name: payload.payment_name ? String(payload.payment_name).trim() : serverPlatformSettings.payment_name,
      updated_at: new Date().toISOString()
    };

    console.log("[Global Billing Config Updated on Server]:", serverPlatformSettings);
    res.json({
      success: true,
      message: "Platform settings updated and broadcasted system-wide",
      data: serverPlatformSettings
    });
  } catch (err: any) {
    console.error("[Platform Settings Update Error]:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
