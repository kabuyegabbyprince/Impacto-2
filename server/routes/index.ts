import { Router, Request, Response } from "express";
import aiRouter from "./ai";
import paymentsRouter from "./payments";
import authRouter from "./auth";
import feesRouter from "./fees";
import auditRouter from "./audit";
import storageRouter from "./storage";
import { cleanValue } from "../services/supabaseAdmin";

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

// pawaPay Webhook endpoint (root-level webhook route)
apiRouter.post("/webhooks/pawapay/deposit", (req: Request, res: Response) => {
  try {
    const webhookData = req.body;
    console.log("[pawaPay Webhook Received]:", webhookData);
    const depositId = webhookData.depositId;
    const status = webhookData.status;
    res.json({ received: true, depositId, status });
  } catch (err: any) {
    console.error("[pawaPay Webhook Error]:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Dynamic environment variables endpoint for client-side consumption
apiRouter.get("/env.js", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/javascript");
  const env = {
    VITE_SUPABASE_URL: cleanValue(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ""),
    VITE_SUPABASE_ANON_KEY: cleanValue(process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "")
  };
  res.send(`window.__RUNTIME_ENV__ = ${JSON.stringify(env)};`);
});

export default apiRouter;
