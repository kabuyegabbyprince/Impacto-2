import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";

const router = Router();
const SETTINGS_FILE_PATH = path.join(process.cwd(), ".data", "platform_settings.json");

// Default configuration with pre-set superadmin merchant code
const DEFAULT_SETTINGS = {
  id: "global",
  usd_to_rwf_rate: 1400,
  eur_to_rwf_rate: 1450,
  kes_to_rwf_rate: 10,
  mtn_payment_number: "",
  airtel_payment_number: "",
  momo_merchant_code: "2325266",
  mtn_merchant_code: "2325266",
  payment_name: "Gaby Prince / VIRELLIX INC",
  updated_at: new Date().toISOString()
};

function loadSettingsFromFile() {
  try {
    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      const raw = fs.readFileSync(SETTINGS_FILE_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.warn("[Platform Settings] Failed to load from file:", e);
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettingsToFile(settings: any) {
  try {
    const dir = path.dirname(SETTINGS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(settings, null, 2), "utf-8");
  } catch (e) {
    console.warn("[Platform Settings] Failed to save to file:", e);
  }
}

let serverPlatformSettings = loadSettingsFromFile();

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
    const updatedCode = payload.momo_merchant_code || payload.mtn_merchant_code || serverPlatformSettings.momo_merchant_code || "2325266";
    
    serverPlatformSettings = {
      ...serverPlatformSettings,
      ...payload,
      id: "global",
      usd_to_rwf_rate: Number(payload.usd_to_rwf_rate) || serverPlatformSettings.usd_to_rwf_rate || 1400,
      eur_to_rwf_rate: Number(payload.eur_to_rwf_rate) || serverPlatformSettings.eur_to_rwf_rate || 1450,
      kes_to_rwf_rate: Number(payload.kes_to_rwf_rate) || serverPlatformSettings.kes_to_rwf_rate || 10,
      mtn_payment_number: payload.mtn_payment_number !== undefined ? String(payload.mtn_payment_number).trim() : serverPlatformSettings.mtn_payment_number,
      airtel_payment_number: payload.airtel_payment_number !== undefined ? String(payload.airtel_payment_number).trim() : serverPlatformSettings.airtel_payment_number,
      momo_merchant_code: updatedCode,
      mtn_merchant_code: updatedCode,
      payment_name: payload.payment_name ? String(payload.payment_name).trim() : serverPlatformSettings.payment_name,
      updated_at: new Date().toISOString()
    };

    saveSettingsToFile(serverPlatformSettings);
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
