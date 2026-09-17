import crypto from "crypto";
import fs from "fs";
import path from "path";
import { cleanValue, getSupabaseAdminClient, hasSupabaseCredentials } from "./supabaseAdmin";

export interface PawaPayDepositParams {
  orgId?: string;
  amount: number | string;
  currency?: string;
  phoneNumber: string;
  payerName?: string;
  provider?: string;
  clientReferenceId?: string;
  customerMessage?: string;
  itemType?: "subscription" | "dues" | "donation" | "general";
  itemId?: string;
  metadata?: any;
}

export interface PawaPayDepositResult {
  success: boolean;
  depositId: string;
  status: string;
  nextStep: string;
  message: string;
  provider?: string;
  formattedPhone?: string;
  providerTransactionId?: string;
}

// Persistent disk cache fallback file for container recyclings
const CACHE_FILE = path.join("/tmp", "pawapay_recent_transactions.json");

// In-memory cache of recent transactions for fast status lookup & dev/fallback
const recentTransactions = new Map<string, any>();

// Load from disk if exists
try {
  if (fs.existsSync(CACHE_FILE)) {
    const raw = fs.readFileSync(CACHE_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      Object.entries(parsed).forEach(([k, v]) => recentTransactions.set(k, v));
      console.log(`[pawaPay] Loaded ${recentTransactions.size} cached transactions from disk`);
    }
  }
} catch (e) {
  console.warn("[pawaPay] Disk cache load warning:", e);
}

function persistCacheToDisk() {
  try {
    const obj: Record<string, any> = {};
    recentTransactions.forEach((v, k) => {
      obj[k] = v;
    });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), "utf-8");
  } catch (e) {
    console.warn("[pawaPay] Disk cache save warning:", e);
  }
}

/**
 * Normalizes Rwandan and East African phone numbers for PawaPay MSISDN format.
 * PawaPay expects digits only with country code, no "+" and no leading "0".
 * e.g., "0788123456" -> "250788123456"
 * "+250 788 123 456" -> "250788123456"
 */
export function formatPawaPayPhoneNumber(rawPhone: string, defaultCountryPrefix = "250"): string {
  if (!rawPhone) return "";
  // Strip all non-digit characters
  let digits = rawPhone.replace(/\D/g, "");

  // If starts with leading 0 (e.g. 078..., 072..., 073...)
  if (digits.startsWith("0")) {
    digits = defaultCountryPrefix + digits.substring(1);
  }

  // If digits are 9 length (e.g. 788123456)
  if (digits.length === 9) {
    digits = defaultCountryPrefix + digits;
  }

  return digits;
}

/**
 * Normalizes provider code to valid PawaPay operator identifiers.
 */
export function normalizePawaPayProvider(provider?: string): string {
  if (!provider) return "MTN_MOMO_RWA";
  const p = provider.trim().toUpperCase();
  if (p === "AIRTEL_MONEY_RWA" || p === "AIRTEL" || p === "AIRTEL_RWANDA") {
    return "AIRTEL_RWA";
  }
  return p;
}

/**
 * Checks if a given phone number is an MTN Rwanda number (078... or 079...).
 * Accepts local 10-digit format (078XXXXXXX, 079XXXXXXX) or international (25078..., 25079...).
 */
export function isMtnRwandaPhoneNumber(phone: string): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, "");
  if (/^07[89]\d{7}$/.test(digits)) return true;
  if (/^2507[89]\d{7}$/.test(digits)) return true;
  return false;
}

/**
 * Predicts the Mobile Money Operator in Rwanda based on phone prefix.
 * Defaults strictly to MTN_MOMO_RWA if prefix matches 078/079.
 */
export function predictPawaPayProvider(phoneNumber?: string): string {
  if (!phoneNumber) return "MTN_MOMO_RWA";
  const clean = phoneNumber.replace(/\D/g, "");
  if (
    clean.startsWith("078") ||
    clean.startsWith("079") ||
    clean.startsWith("25078") ||
    clean.startsWith("25079")
  ) {
    return "MTN_MOMO_RWA";
  }
  if (
    clean.startsWith("072") ||
    clean.startsWith("073") ||
    clean.startsWith("25072") ||
    clean.startsWith("25073")
  ) {
    return "AIRTEL_RWA";
  }
  return "MTN_MOMO_RWA";
}

export async function initiatePawaPayDeposit(params: PawaPayDepositParams): Promise<PawaPayDepositResult> {
  const {
    orgId,
    amount,
    currency = "RWF",
    phoneNumber,
    payerName,
    provider: explicitProvider,
    clientReferenceId,
    customerMessage,
    itemType,
    itemId,
    metadata,
  } = params;

  // Strict check: enforce MTN Rwanda numbers starting with 078 or 079 to reduce telco errors
  const isMtn = isMtnRwandaPhoneNumber(phoneNumber);
  if (!isMtn) {
    return {
      success: false,
      depositId: "",
      status: "REJECTED",
      nextStep: "REJECTED",
      provider: "MTN_MOMO_RWA",
      formattedPhone: phoneNumber,
      message: "MTN number required: Please enter an MTN Rwanda phone number starting with 078 or 079 (e.g. 078XXXXXXX or 079XXXXXXX) to receive the SIM authorization push prompt.",
    };
  }

  const depositId = crypto.randomUUID ? crypto.randomUUID() : `dep-${Math.random().toString(36).substring(2, 15)}`;
  const formattedPhone = formatPawaPayPhoneNumber(phoneNumber);
  const provider = "MTN_MOMO_RWA"; // Strictly enforced for MTN MoMo prompt to reduce carrier mismatch errors

  const pawapayApiToken = cleanValue(process.env.PAWAPAY_API_TOKEN);
  const isProd = process.env.PAWAPAY_PROD === "true";
  const baseUrl = isProd ? "https://api.pawapay.io" : "https://api.sandbox.pawapay.io";

  // Customer message: 4 to 22 characters alphanumeric
  const cleanMessage = (customerMessage || payerName || "Impacto Dues").substring(0, 22).trim();

  // Structured metadata array for PawaPay specification
  const structuredMetadata = Array.isArray(metadata)
    ? metadata
    : [
        { orgId: String(orgId || "global") },
        { itemType: String(itemType || "general") },
        { itemId: String(itemId || "") },
        { payerName: String(payerName || "Payer") },
        { payerPhone: String(formattedPhone) }
      ];

  const depositPayload = {
    depositId,
    amount: String(Math.round(Number(amount))),
    currency,
    payer: {
      type: "MMO",
      accountDetails: {
        phoneNumber: formattedPhone,
        provider,
      },
    },
    clientReferenceId: clientReferenceId || `TX-${orgId || "SYS"}-${Date.now().toString().slice(-8)}`,
    customerMessage: cleanMessage || "Impacto Payment",
    metadata: structuredMetadata,
  };

  let pawaResponseStatus = "ACCEPTED";
  let providerTxId = "";
  let responseMessage = "Deposit requested successfully. Please approve the Mobile Money PIN prompt on your phone.";

  if (pawapayApiToken && !pawapayApiToken.startsWith("placeholder")) {
    try {
      console.log(`[pawaPay] Initiating ${isProd ? "LIVE" : "SANDBOX"} deposit for ${formattedPhone} (${provider}) amount ${amount} ${currency}`);
      const pRes = await fetch(`${baseUrl}/v2/deposits`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${pawapayApiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(depositPayload),
      });

      const pData: any = await pRes.json();
      console.log("[pawaPay] Deposit response:", pRes.status, pData);

      pawaResponseStatus = pData.status || (pRes.ok ? "ACCEPTED" : "REJECTED");
      providerTxId = pData.providerTransactionId || "";

      if (pawaResponseStatus === "REJECTED" || !pRes.ok) {
        console.warn("[pawaPay] Deposit request rejected or error:", pData);
        responseMessage =
          pData.failureReason?.failureMessage ||
          pData.rejectionReason?.message ||
          pData.message ||
          "Deposit request was rejected by telecom provider.";
      }
    } catch (pErr: any) {
      console.error("[pawaPay] API connection error:", pErr);
      pawaResponseStatus = "ACCEPTED";
    }
  } else {
    console.log("[pawaPay] No PAWAPAY_API_TOKEN detected, simulating prompt in sandbox mode.");
  }

  // Cache initial transaction in memory and disk
  const txnRecord = {
    depositId,
    status: pawaResponseStatus,
    amount,
    currency,
    formattedPhone,
    provider,
    payerName,
    orgId,
    itemType: itemType || "general",
    itemId: itemId || "",
    createdAt: new Date().toISOString(),
    providerTransactionId: providerTxId,
  };
  recentTransactions.set(depositId, txnRecord);
  persistCacheToDisk();

  return {
    success: pawaResponseStatus !== "REJECTED",
    depositId,
    status: pawaResponseStatus,
    nextStep: "FINAL_STATUS",
    provider,
    formattedPhone,
    providerTransactionId: providerTxId,
    message: responseMessage,
  };
}

export async function checkPawaPayDepositStatus(depositId: string): Promise<any> {
  const pawapayApiToken = cleanValue(process.env.PAWAPAY_API_TOKEN);
  const isProd = process.env.PAWAPAY_PROD === "true";
  const baseUrl = isProd ? "https://api.pawapay.io" : "https://api.sandbox.pawapay.io";

  if (pawapayApiToken && !pawapayApiToken.startsWith("placeholder")) {
    try {
      const res = await fetch(`${baseUrl}/v2/deposits/${depositId}`, {
        headers: {
          Authorization: `Bearer ${pawapayApiToken}`,
        },
      });
      if (res.ok) {
        const data: any = await res.json();
        const depositData = data.data || data;
        if (depositData && depositData.status) {
          const cached = recentTransactions.get(depositId) || {};
          const updatedRecord = {
            ...cached,
            status: depositData.status,
            providerTransactionId: depositData.providerTransactionId || cached.providerTransactionId,
            updatedAt: new Date().toISOString(),
          };
          recentTransactions.set(depositId, updatedRecord);
          persistCacheToDisk();

          // If transaction reached final success, auto-reconcile with Supabase
          if (depositData.status === "COMPLETED" || depositData.status === "SUCCESS") {
            await reconcileCompletedPayment(updatedRecord);
          }

          return {
            success: true,
            depositId,
            status: depositData.status,
            data: depositData,
            providerTransactionId: depositData.providerTransactionId,
          };
        }
      }
    } catch (err) {
      console.warn("[pawaPay] Status check error:", err);
    }
  }

  // Fallback to cache
  const cached = recentTransactions.get(depositId);
  return {
    success: !!cached,
    depositId,
    status: cached?.status || "COMPLETED",
    data: cached,
    providerTransactionId: cached?.providerTransactionId,
  };
}

/**
 * Automatically reconciles completed payments into Supabase even if the user
 * closed their browser tab before client-side polling finished.
 */
export async function reconcileCompletedPayment(depositData: any): Promise<{ reconciled: boolean; reason?: string; target?: string }> {
  const depositId = depositData.depositId || depositData.id;
  const status = (depositData.status || "").toUpperCase();
  if (status !== "COMPLETED" && status !== "SUCCESS" && status !== "APPROVED") {
    return { reconciled: false, reason: "Status not completed" };
  }

  const cached = (depositId ? recentTransactions.get(depositId) : null) || {};
  
  // Extract metadata if passed by PawaPay webhook or API
  let metaOrgId = "";
  let metaItemType = "";
  let metaItemId = "";
  let metaPayerPhone = "";
  let metaPayerName = "";

  if (Array.isArray(depositData.metadata)) {
    for (const item of depositData.metadata) {
      if (item.fieldName && item.fieldValue) {
        if (item.fieldName === "orgId") metaOrgId = item.fieldValue;
        if (item.fieldName === "itemType") metaItemType = item.fieldValue;
        if (item.fieldName === "itemId") metaItemId = item.fieldValue;
      }
      if (item.orgId) metaOrgId = item.orgId;
      if (item.itemType) metaItemType = item.itemType;
      if (item.itemId) metaItemId = item.itemId;
      if (item.payerPhone) metaPayerPhone = item.payerPhone;
      if (item.payerName) metaPayerName = item.payerName;
    }
  } else if (depositData.metadata && typeof depositData.metadata === "object") {
    metaOrgId = depositData.metadata.orgId || "";
    metaItemType = depositData.metadata.itemType || "";
    metaItemId = depositData.metadata.itemId || "";
  }

  const orgId = depositData.orgId || cached.orgId || metaOrgId;
  const itemType = depositData.itemType || cached.itemType || metaItemType || "general";
  const itemId = depositData.itemId || cached.itemId || metaItemId;
  const payerPhone = depositData.payerPhone || cached.formattedPhone || metaPayerPhone || depositData.payer?.accountDetails?.phoneNumber || "";
  const payerName = depositData.payerName || cached.payerName || metaPayerName || "Payer";
  const amount = Number(depositData.amount || cached.amount || 0);
  const providerTransactionId = depositData.providerTransactionId || cached.providerTransactionId || depositId;

  console.log(`[pawaPay Auto-Reconcile] Reconciling deposit ${depositId} (${itemType})`);

  if (!hasSupabaseCredentials()) {
    console.log("[pawaPay Auto-Reconcile] Supabase credentials not present, recorded in persistent cache.");
    return { reconciled: true, target: "cache" };
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) return { reconciled: false, reason: "Supabase client unavailable" };

  try {
    if (itemType === "subscription") {
      // 1. Record in subscription_payments if not already present
      const { data: existingSub } = await supabase
        .from("subscription_payments")
        .select("id")
        .eq("reference", providerTransactionId || depositId)
        .limit(1);

      if (!existingSub || existingSub.length === 0) {
        await supabase.from("subscription_payments").insert({
          org_id: orgId || "global",
          plan: itemId ? `${itemId.charAt(0).toUpperCase() + itemId.slice(1)} Plan` : "Growth Plan",
          amount_usd: itemId === "pro" ? 40 : itemId === "enterprise" ? 80 : 25,
          amount_local: amount,
          method: "pawapay_push",
          phone: payerPhone,
          reference: providerTransactionId || depositId,
          proof_url: `[PawaPay Auto-Reconciled] Direct MoMo SIM push verified. Deposit: ${depositId}`,
          status: "approved",
          submitted_at: new Date().toISOString(),
        });
      }

      // 2. Immediately unlock/activate the organization
      if (orgId && orgId !== "global") {
        const tierCode = itemId ? itemId.toLowerCase() : "growth";
        await supabase
          .from("organizations")
          .update({
            subscription_status: "active",
            subscription_tier: tierCode,
            subscription_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq("id", orgId);
        console.log(`[pawaPay Auto-Reconcile] Organization ${orgId} auto-activated on tier ${tierCode}`);
      }
      return { reconciled: true, target: "subscription" };
    }

    if (itemType === "dues" && itemId) {
      // Mark member fee as paid
      const { error: feeErr } = await supabase
        .from("member_fees")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          paid_by_method: "MTN MoMo",
          transaction_reference: providerTransactionId || depositId,
          report_note: `[PawaPay Webhook Auto-Reconciled] MoMo prompt confirmed on SIM. Deposit ID: ${depositId}`,
        })
        .eq("id", itemId);

      if (feeErr) {
        console.warn("[pawaPay Auto-Reconcile] Fee update notice:", feeErr.message);
      } else {
        console.log(`[pawaPay Auto-Reconcile] Fee ${itemId} cleared as PAID`);
      }
      return { reconciled: true, target: "dues" };
    }

    if (itemType === "donation" && orgId) {
      await supabase.from("donations").insert({
        org_id: orgId,
        amount,
        donor_name: payerName || "Anonymous Donor",
        payment_method: "mtn",
        status: "confirmed",
        proof_url: providerTransactionId || depositId,
        created_at: new Date().toISOString(),
      });
      console.log(`[pawaPay Auto-Reconcile] Donation of ${amount} RWF confirmed for org ${orgId}`);
      return { reconciled: true, target: "donation" };
    }
  } catch (reconcileErr) {
    console.error("[pawaPay Auto-Reconcile] Execution error:", reconcileErr);
  }

  return { reconciled: true, target: "completed" };
}

export async function recordPawaPayWebhookEvent(event: any) {
  const depositId = event.depositId || event.id;
  if (depositId) {
    const existing = recentTransactions.get(depositId) || {};
    const updated = {
      ...existing,
      ...event,
      status: event.status || "COMPLETED",
      providerTransactionId: event.providerTransactionId || existing.providerTransactionId,
      receivedAt: new Date().toISOString(),
    };
    recentTransactions.set(depositId, updated);
    persistCacheToDisk();

    // Auto-reconcile webhook completion
    await reconcileCompletedPayment(updated);
  }
}

export function getPawaPayActiveConfig() {
  const isProd = process.env.PAWAPAY_PROD === "true";
  return {
    environment: isProd ? "production" : "sandbox",
    country: "RWA",
    providers: [
      {
        provider: "MTN_MOMO_RWA",
        name: "MTN Mobile Money Rwanda",
        currency: "RWF",
        status: "OPERATIONAL",
        pinPrompt: "AUTOMATIC",
        minAmount: 5,
        maxAmount: 2000000,
        ussdRevivalCode: "*182*7*1#",
      },
      {
        provider: "AIRTEL_RWA",
        name: "Airtel Money Rwanda",
        currency: "RWF",
        status: "OPERATIONAL",
        pinPrompt: "AUTOMATIC",
        minAmount: 100,
        maxAmount: 1500000,
        ussdRevivalCode: "*182*5*6*1#",
      },
    ],
    limits: { min: 5, max: 2000000 },
  };
}
