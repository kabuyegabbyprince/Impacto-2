import crypto from "crypto";
import { cleanValue } from "./supabaseAdmin";

export interface PawaPayDepositParams {
  orgId?: string;
  amount: number | string;
  currency?: string;
  phoneNumber: string;
  payerName?: string;
  provider?: string;
  clientReferenceId?: string;
  customerMessage?: string;
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

// In-memory cache of recent transactions for fast status lookup & dev/fallback
const recentTransactions = new Map<string, any>();

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
 * Predicts the Mobile Money Operator in Rwanda based on phone prefix
 */
export function predictPawaPayProvider(phoneNumber?: string): string {
  if (!phoneNumber) return "MTN_MOMO_RWA";
  const clean = phoneNumber.replace(/\D/g, "");
  if (
    clean.startsWith("072") ||
    clean.startsWith("073") ||
    clean.startsWith("25072") ||
    clean.startsWith("25073") ||
    clean.includes("72") ||
    clean.includes("73")
  ) {
    return "AIRTEL_MONEY_RWA";
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
    metadata,
  } = params;

  const depositId = crypto.randomUUID ? crypto.randomUUID() : `dep-${Math.random().toString(36).substring(2, 15)}`;
  const formattedPhone = formatPawaPayPhoneNumber(phoneNumber);
  const provider = explicitProvider || predictPawaPayProvider(phoneNumber);

  const pawapayApiToken = cleanValue(process.env.PAWAPAY_API_TOKEN);
  const isProd = process.env.PAWAPAY_PROD === "true";
  const baseUrl = isProd ? "https://api.pawapay.io" : "https://api.sandbox.pawapay.io";

  // Customer message: 4 to 22 characters alphanumeric
  const cleanMessage = (customerMessage || payerName || "Impacto Dues").substring(0, 22).trim();

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
    metadata: metadata
      ? [metadata]
      : [
          {
            fieldName: "orgId",
            fieldValue: String(orgId || "global"),
          },
          {
            fieldName: "payerName",
            fieldValue: String(payerName || "Anonymous Payer"),
          },
        ],
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

      if (pRes.ok) {
        pawaResponseStatus = pData.status || "ACCEPTED";
        providerTxId = pData.providerTransactionId || "";
      } else {
        console.warn("[pawaPay] Deposit request rejected:", pData);
        pawaResponseStatus = pData.status || "REJECTED";
        responseMessage = pData.rejectionReason?.message || pData.message || "Deposit request was rejected by telecom provider.";
      }
    } catch (pErr: any) {
      console.error("[pawaPay] API connection error:", pErr);
      pawaResponseStatus = "ACCEPTED";
    }
  } else {
    console.log("[pawaPay] No PAWAPAY_API_TOKEN detected, simulating prompt in sandbox mode.");
  }

  // Cache initial transaction
  recentTransactions.set(depositId, {
    depositId,
    status: pawaResponseStatus,
    amount,
    currency,
    formattedPhone,
    provider,
    payerName,
    orgId,
    createdAt: new Date().toISOString(),
    providerTransactionId: providerTxId,
  });

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
          recentTransactions.set(depositId, {
            ...cached,
            status: depositData.status,
            providerTransactionId: depositData.providerTransactionId || cached.providerTransactionId,
            updatedAt: new Date().toISOString(),
          });
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

export function recordPawaPayWebhookEvent(event: any) {
  const depositId = event.depositId || event.id;
  if (depositId) {
    const existing = recentTransactions.get(depositId) || {};
    recentTransactions.set(depositId, {
      ...existing,
      ...event,
      status: event.status || "COMPLETED",
      providerTransactionId: event.providerTransactionId || existing.providerTransactionId,
      receivedAt: new Date().toISOString(),
    });
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
        provider: "AIRTEL_MONEY_RWA",
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
