import { Router, Request, Response } from "express";
import aiRouter from "./ai";
import paymentsRouter from "./payments";
import authRouter from "./auth";
import feesRouter from "./fees";
import auditRouter from "./audit";
import storageRouter from "./storage";
import platformSettingsRouter from "./platformSettings";
import meetRouter from "./meet";
import { cleanValue } from "../services/supabaseAdmin";
import { recordPawaPayWebhookEvent } from "../services/pawapayService";

const apiRouter = Router();

// Health Check
apiRouter.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// Mount module sub-routers
apiRouter.use("/api/ai", aiRouter);
apiRouter.use("/api/payments", paymentsRouter);
apiRouter.use("/api/auth", authRouter);
apiRouter.use("/api/member-fees", feesRouter);
apiRouter.use("/api/audit-logs", auditRouter);
apiRouter.use("/api/storage", storageRouter);
apiRouter.use("/api/platform-settings", platformSettingsRouter);
apiRouter.use("/api/meet", meetRouter);

// pawaPay Webhook endpoints (handles Checkouts, Deposits, Payouts, Refunds)
const handlePawaPayCallback = (req: Request, res: Response) => {
  try {
    const webhookData = req.body || {};
    console.log("[pawaPay Webhook/Callback Received]:", req.path, webhookData);
    recordPawaPayWebhookEvent(webhookData);
    const depositId = webhookData.depositId || webhookData.payoutId || webhookData.refundId || webhookData.id;
    const status = webhookData.status || "COMPLETED";
    // Always return HTTP 200 to acknowledge PawaPay notification
    res.status(200).json({ status: "ACCEPTED", received: true, depositId, callbackStatus: status });
  } catch (err: any) {
    console.error("[pawaPay Webhook Error]:", err);
    res.status(200).json({ status: "ACCEPTED", received: false, error: err.message });
  }
};

apiRouter.all("/webhooks/pawapay/deposit", handlePawaPayCallback);
apiRouter.all("/webhooks/pawapay/checkout", handlePawaPayCallback);
apiRouter.all("/webhooks/pawapay/payout", handlePawaPayCallback);
apiRouter.all("/webhooks/pawapay/refund", handlePawaPayCallback);
apiRouter.all("/webhooks/pawapay", handlePawaPayCallback);
apiRouter.all("/api/payments/pawapay/callback", handlePawaPayCallback);
apiRouter.all("/api/payments/pawapay/webhook", handlePawaPayCallback);

// Dynamic environment variables endpoint for client-side consumption
apiRouter.get("/env.js", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/javascript");
  const env = {
    VITE_SUPABASE_URL: cleanValue(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "") || "https://jyluwvwghtirdmazhhym.supabase.co",
    VITE_SUPABASE_ANON_KEY: cleanValue(process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5bHV3dndnaHRpcmRtYXpoaHltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NjM5MjYsImV4cCI6MjA5NTAzOTkyNn0.KcV_8RXSnoNVObFqgeLm-9r3fBbRf7FSEM6woVjhG3Q"
  };
  res.send(`window.__RUNTIME_ENV__ = ${JSON.stringify(env)};`);
});

export default apiRouter;
