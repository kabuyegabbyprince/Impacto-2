import React, { useState, useEffect, useRef } from "react";
import {
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
  X,
  CreditCard,
  Building2,
  FileText
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button, Input } from "./ui";
import { useCurrencyStore } from "../store/currencyStore";
import { UssdPaymentHelper, DEFAULT_MOMO_DISPLAY_METHODS, MomoDisplayMethod } from "./UssdPaymentHelper";
import { PaymentSuccessPulse } from "./PaymentSuccessPulse";

export interface MoMoPaymentSuccessData {
  depositId: string;
  providerTransactionId?: string;
  amount: number;
  currency: string;
  payerPhone: string;
  payerName: string;
  provider: string;
  comment?: string;
  method: "pawapay_push" | "manual_proof";
  proofText?: string;
}

/**
 * Validates whether a phone number is an MTN Rwanda number (078... or 079...).
 * Style required: exactly 10 digits starting with 078 or 079 (e.g. 078XXXXXXX or 079XXXXXXX).
 * Also accepts 25078... or 25079... (12 digits).
 */
export function isValidMtnRwandaNumber(phone: string): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, "");
  return /^07[89]\d{7}$/.test(digits) || /^2507[89]\d{7}$/.test(digits);
}

/**
 * Normalizes input to local Rwandan style (078XXXXXXX or 079XXXXXXX)
 */
export function normalizeMtnRwandaNumber(input: string): string {
  if (!input) return "";
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("250")) {
    digits = "0" + digits.substring(3);
  }
  return digits.slice(0, 10);
}

interface MoMoPushPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  amountRwf?: number;
  amount?: number;
  amountUsd?: number;
  orgId?: string;
  defaultPayerName?: string;
  defaultPayerPhone?: string;
  defaultPhone?: string;
  itemType?: "subscription" | "package" | "member_due" | "dues" | "donation" | "general" | string;
  itemId?: string;
  itemName?: string;
  recipientName?: string;
  recipientMtnNumber?: string;
  recipientAirtelNumber?: string;
  recipientMerchantCode?: string;
  allowedDisplayMethods?: MomoDisplayMethod[];
  isPlatformFee?: boolean;
  onSuccess: (data: MoMoPaymentSuccessData) => Promise<void> | void;
}

export const MoMoPushPaymentModal: React.FC<MoMoPushPaymentModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  amountRwf: rawAmountRwf,
  amount: rawAmount,
  amountUsd,
  orgId,
  defaultPayerName = "",
  defaultPayerPhone = "",
  defaultPhone = "",
  itemType = "general",
  itemId = "",
  itemName,
  recipientName,
  recipientMtnNumber,
  recipientAirtelNumber,
  recipientMerchantCode,
  allowedDisplayMethods,
  isPlatformFee,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const resolvedTitle = title || t("momo_modal.default_title", { defaultValue: "Mobile Money Prompt (Instant Push)" });
  const resolvedDescription = description || t("momo_modal.default_description", { defaultValue: "Enter your MTN phone number (078.. or 079..) to receive a direct USSD payment prompt on your SIM card." });
  const resolvedItemName = itemName || t("momo_modal.default_item_name", { defaultValue: "Payment" });
  const amountRwf = rawAmountRwf ?? rawAmount ?? 0;
  const { formatAmount } = useCurrencyStore();
  const [tab, setTab] = useState<"instant_push" | "manual_sms">("instant_push");

  const effectivePhone = normalizeMtnRwandaNumber(defaultPayerPhone || defaultPhone || "");

  // Form states
  const [payerName, setPayerName] = useState(defaultPayerName);
  const [phoneNumber, setPhoneNumber] = useState(effectivePhone);
  const [comment, setComment] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Determine if this is a platform license payment vs organization dues payment
  const isPlatformTarget = isPlatformFee !== undefined 
    ? isPlatformFee 
    : (itemType === "subscription" || itemType === "package");

  const effectiveAllowedMethods: MomoDisplayMethod[] =
    isPlatformTarget
      ? ["merchant_code", "mtn_phone", "airtel_phone"]
      : (allowedDisplayMethods && allowedDisplayMethods.length > 0
          ? allowedDisplayMethods
          : DEFAULT_MOMO_DISPLAY_METHODS);

  const finalRecipientName = recipientName || (
    isPlatformTarget
      ? t("momo_modal.platform_admin_name", { defaultValue: "Impacto Platform Administration" })
      : t("momo_modal.org_treasury_name", { defaultValue: "Organization Treasury" })
  );
  const finalMtnNumber = recipientMtnNumber || "";
  const finalAirtelNumber = recipientAirtelNumber || "";
  const finalMerchantCode = recipientMerchantCode || undefined;

  // Push Lifecycle States: 'idle' | 'initiating' | 'awaiting_pin' | 'verifying' | 'success' | 'failed'
  const [pushStatus, setPushStatus] = useState<"idle" | "initiating" | "awaiting_pin" | "verifying" | "success" | "failed">("idle");
  const [depositId, setDepositId] = useState("");
  const [providerTxId, setProviderTxId] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [countdown, setCountdown] = useState(90);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [detectedProvider] = useState<"MTN">("MTN");

  // Phone number validation logic for MTN Rwanda (078.. or 079..)
  const cleanPhone = phoneNumber.replace(/\D/g, "");
  const isMtnPrefix = cleanPhone.startsWith("078") || cleanPhone.startsWith("079");
  const isAirtelPrefix = cleanPhone.startsWith("072") || cleanPhone.startsWith("073");
  const isCompleteMtn = cleanPhone.length === 10 && isMtnPrefix;
  const isAirtelOrInvalidPrefix = cleanPhone.length >= 3 && !isMtnPrefix;

  // Manual fallback states
  const [manualTxRef, setManualTxRef] = useState("");
  const [manualSms, setManualSms] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState("");

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timers on unmount or close
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // Handle push prompt initiation
  const handleInitiatePush = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDigits = phoneNumber.replace(/\D/g, "");
    if (!isValidMtnRwandaNumber(cleanDigits)) {
      setStatusMessage(t("momo_modal.err_mtn_required_desc", { defaultValue: "MTN number required: Please enter an MTN Rwanda number starting with 078 or 079 (e.g. 078XXXXXXX or 079XXXXXXX) to receive the push prompt on your SIM card." }));
      return;
    }

    setPushStatus("initiating");
    setStatusMessage(t("momo_modal.status_initiating", { defaultValue: "Connecting to PawaPay and dispatching Mobile Money authorization prompt to your SIM card..." }));

    try {
      const res = await fetch("/api/payments/pawapay/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          amount: Math.round(amountRwf),
          currency: "RWF",
          phoneNumber: cleanDigits,
          payerName: payerName || "Impacto Payer",
          provider: "MTN_MOMO_RWA",
          customerMessage: (comment || resolvedItemName || "Impacto Payment").substring(0, 22),
          itemType,
          itemId,
          metadata: [
            { orgId: String(orgId || "global") },
            { itemType: String(itemType || "general") },
            { itemId: String(itemId || "") },
            { payerName: String(payerName || "Impacto Payer") },
            { payerPhone: String(cleanDigits) }
          ],
        }),
      });

      const data = await res.json();

      if (data.success && data.depositId) {
        setDepositId(data.depositId);
        setPushStatus("awaiting_pin");
        setStatusMessage(
          t("momo_modal.status_dispatched", {
            phone: phoneNumber,
            defaultValue: `MoMo prompt dispatched to SIM (${phoneNumber})! Please look at your phone screen now and enter your Mobile Money PIN.`
          })
        );
        startCountdownAndPolling(data.depositId);
      } else {
        setPushStatus("failed");
        setStatusMessage(data.message || t("momo_modal.err_push_failed", { defaultValue: "Could not trigger Mobile Money push. Please verify your MTN phone number or try the manual tab." }));
      }
    } catch (err: any) {
      setPushStatus("failed");
      setStatusMessage(err.message || t("momo_modal.err_connection", { defaultValue: "Connection error. Please try again." }));
    }
  };

  // Immediate status check when user clicks "Check Status Now" or enters *182*7*1#
  const handleCheckStatusNow = async () => {
    if (!depositId) return;
    setCheckingStatus(true);
    setStatusMessage(t("momo_modal.status_querying", { defaultValue: "Querying MTN network status for your authorization..." }));
    try {
      const checkRes = await fetch(`/api/payments/pawapay/status/${depositId}`);
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        const pawaStatus = (checkData.status || "").toUpperCase();
        const nestedStatus = (checkData.data?.status || "").toUpperCase();
        const txId = checkData.providerTransactionId || checkData.data?.providerTransactionId || depositId.slice(0, 8);

        const isCompleted = pawaStatus === "COMPLETED" || pawaStatus === "SUCCESS" || nestedStatus === "COMPLETED" || nestedStatus === "SUCCESS";
        const isFailed = pawaStatus === "FAILED" || pawaStatus === "REJECTED" || nestedStatus === "FAILED" || nestedStatus === "REJECTED";

        if (isCompleted) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          if (countdownRef.current) clearInterval(countdownRef.current);
          setProviderTxId(txId);
          setPushStatus("success");
          setStatusMessage(t("momo_modal.status_confirmed", { defaultValue: "Payment authorized! Mobile Money transaction confirmed by MTN." }));

          await onSuccess({
            depositId,
            providerTransactionId: txId,
            amount: amountRwf,
            currency: "RWF",
            payerPhone: phoneNumber,
            payerName: payerName || "Payer",
            provider: "MTN_MOMO_RWA",
            comment: comment || resolvedItemName,
            method: "pawapay_push",
          });
        } else if (isFailed) {
          setPushStatus("failed");
          setStatusMessage(t("momo_modal.status_rejected", { defaultValue: "Transaction was rejected or cancelled on handset." }));
        } else {
          setStatusMessage(t("momo_modal.status_still_pending", { defaultValue: "Transaction is still pending on MTN network. If you just entered your PIN, please wait a moment and click Check Status again." }));
        }
      }
    } catch (err: any) {
      console.warn("Manual check error:", err);
      setStatusMessage(t("momo_modal.err_query_failed", { defaultValue: "Could not query network status. Please try again." }));
    } finally {
      setCheckingStatus(false);
    }
  };

  const startCountdownAndPolling = (depId: string) => {
    setCountdown(90);

    // Countdown timer
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Polling status
    if (pollingRef.current) clearInterval(pollingRef.current);
    let attempts = 0;
    pollingRef.current = setInterval(async () => {
      attempts++;
      try {
        const checkRes = await fetch(`/api/payments/pawapay/status/${depId}`);
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          const pawaStatus = (checkData.status || "").toUpperCase();
          const nestedStatus = (checkData.data?.status || "").toUpperCase();
          const txId = checkData.providerTransactionId || checkData.data?.providerTransactionId || depId.slice(0, 8);

          const isCompleted = pawaStatus === "COMPLETED" || pawaStatus === "SUCCESS" || nestedStatus === "COMPLETED" || nestedStatus === "SUCCESS";
          const isFailed = pawaStatus === "FAILED" || pawaStatus === "REJECTED" || nestedStatus === "FAILED" || nestedStatus === "REJECTED";

          if (isCompleted) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
            setProviderTxId(txId);
            setPushStatus("success");
            setStatusMessage(t("momo_modal.status_confirmed", { defaultValue: "Payment authorized! Mobile Money transaction confirmed by MTN." }));

            // Call parent onSuccess callback
            await onSuccess({
              depositId: depId,
              providerTransactionId: txId,
              amount: amountRwf,
              currency: "RWF",
              payerPhone: phoneNumber,
              payerName: payerName || "Payer",
              provider: "MTN_MOMO_RWA",
              comment: comment || resolvedItemName,
              method: "pawapay_push",
            });
          } else if (isFailed) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
            setPushStatus("failed");
            setStatusMessage(t("momo_modal.status_cancelled_handset", { defaultValue: "Transaction was cancelled or rejected on the handset." }));
          }
        }
      } catch (err) {
        console.warn("Polling error:", err);
      }

      // Stop polling after 40 attempts (~100 seconds)
      if (attempts >= 40) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        if (pushStatus !== "success") {
          setPushStatus("awaiting_pin");
        }
      }
    }, 2500);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualError("");
    const cleanRef = manualTxRef.trim();
    const cleanSms = manualSms.trim();
    if (!cleanSms && !cleanRef) {
      setManualError(t("momo_modal.err_manual_required", { defaultValue: "Please provide the transaction reference ID or paste the SMS proof." }));
      return;
    }

    setManualSubmitting(true);
    try {
      await onSuccess({
        depositId: cleanRef || `MAN-${Date.now().toString().slice(-8)}`,
        providerTransactionId: cleanRef || undefined,
        amount: amountRwf,
        currency: "RWF",
        payerPhone: phoneNumber.trim(),
        payerName: (payerName || "Payer").trim(),
        provider: detectedProvider === "MTN" ? "MTN_MOMO_RWA" : "AIRTEL_RWA",
        comment: comment || resolvedItemName,
        method: "manual_proof",
        proofText: manualSms,
      });
      setProviderTxId(cleanRef || `MAN-${Date.now().toString().slice(-6)}`);
      setStatusMessage(t("momo_modal.status_manual_submitted", { defaultValue: "Payment slip recorded and submitted for accountant verification." }));
      setPushStatus("success");
    } catch (err: any) {
      setManualError(err?.message || t("momo_modal.err_manual_submit_failed", { defaultValue: "Failed to submit manual proof." }));
    } finally {
      setManualSubmitting(false);
    }
  };

  const handleCopyCode = (code: string, key?: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(key || code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in select-none">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-[0.98] duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-[#156c45] dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center shadow-xs shrink-0">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight break-words">
                {resolvedTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium break-words mt-0.5">
                {resolvedItemName} &bull; <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{amountRwf.toLocaleString()} RWF</span>
                {amountUsd ? ` (~$${amountUsd})` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0 ml-2 cursor-pointer"
            aria-label={t("common.close", { defaultValue: "Close" })}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="px-4 sm:px-6 pt-3 pb-1 shrink-0">
          <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/70 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => {
                setTab("instant_push");
                setPushStatus("idle");
                setManualError("");
              }}
              className={`py-2 px-2.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 min-w-0 cursor-pointer ${
                tab === "instant_push"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{t("momo_modal.tab_instant_push", { defaultValue: "Direct SIM Prompt" })}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("manual_sms");
                setManualError("");
              }}
              className={`py-2 px-2.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 min-w-0 cursor-pointer ${
                tab === "manual_sms"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{t("momo_modal.tab_manual_sms", { defaultValue: "Manual Transfer" })}</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {/* Amount and Beneficiary Header Card */}
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
                  {itemType === "donation"
                    ? t("momo_modal.voluntary_contribution", { defaultValue: "Voluntary Contribution" })
                    : t("momo_modal.payable_amount", { defaultValue: "Payable Amount" })}
                </span>
                {itemType === "donation" ? (
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <span className="text-xl sm:text-2xl font-bold font-display text-slate-900 dark:text-white">
                      {t("momo_modal.open_donation", { defaultValue: "Open Donation" })}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      · {t("momo_modal.any_amount", { defaultValue: "Any amount" })}
                    </span>
                  </div>
                ) : (
                  <span className="text-2xl sm:text-3xl font-bold font-display text-slate-900 dark:text-white">
                    {amountRwf.toLocaleString()} <span className="text-xs font-mono font-medium text-slate-600 dark:text-slate-400">RWF</span>
                  </span>
                )}
              </div>
              <div className="sm:text-right min-w-0">
                <span className="text-xs text-slate-400 block">
                  {isPlatformTarget
                    ? t("momo_modal.platform_license_treasury", { defaultValue: "Platform License Treasury" })
                    : t("momo_modal.beneficiary_treasury", { defaultValue: "Beneficiary Treasury" })}
                </span>
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200 flex items-center sm:justify-end gap-1 mt-0.5 min-w-0">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="break-words">{finalRecipientName}</span>
                </span>
              </div>
            </div>

            {/* Destination Credentials Strip */}
            <div className="pt-2.5 border-t border-slate-200/70 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-600 dark:text-slate-300">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-400 font-sans">
                  {t("momo_modal.settlement_label", { defaultValue: "Settlement:" })}
                </span>
                {finalMtnNumber && effectiveAllowedMethods.includes("mtn_phone") && (
                  <span className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded-md font-bold text-[10px]">
                    MTN {finalMtnNumber}
                  </span>
                )}
                {finalAirtelNumber && effectiveAllowedMethods.includes("airtel_phone") && (
                  <span className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded-md font-bold text-[10px]">
                    Airtel {finalAirtelNumber}
                  </span>
                )}
              </div>
              {finalMerchantCode && effectiveAllowedMethods.includes("merchant_code") && (
                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-md text-[#156c45] dark:text-emerald-400 font-bold text-[10px]">
                  <span>{t("momo_modal.code_prefix", { code: finalMerchantCode, defaultValue: `Code: ${finalMerchantCode}` })}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(finalMerchantCode, "merchant_strip")}
                    className="hover:text-emerald-900 dark:hover:text-emerald-200 p-0.5 cursor-pointer"
                    title={t("momo_modal.copy_code", { defaultValue: "Copy Code" })}
                  >
                    {copiedCode === "merchant_strip" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {tab === "instant_push" ? (
            <div>
              <div className="mb-4">
                <UssdPaymentHelper
                  targetType={isPlatformTarget ? "platform" : "organization"}
                  mtnNumber={finalMtnNumber}
                  merchantCode={finalMerchantCode}
                  airtelNumber={finalAirtelNumber}
                  recipientName={finalRecipientName}
                  amountRwf={itemType === "donation" ? undefined : amountRwf}
                  isDonation={itemType === "donation"}
                  itemName={resolvedItemName}
                  allowedMethods={isPlatformTarget ? undefined : effectiveAllowedMethods}
                  compact
                />
              </div>

              {pushStatus === "idle" && (
                <form onSubmit={handleInitiatePush} className="space-y-4">
                  <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed break-words">
                    {resolvedDescription}
                  </p>

                  <div className="space-y-3">
                    <Input
                      label={t("momo_modal.payer_full_name", { defaultValue: "Payer Full Name" })}
                      placeholder={t("momo_modal.payer_full_name_placeholder", { defaultValue: "e.g. Jean Pierre N." })}
                      value={payerName}
                      onChange={(e) => setPayerName(e.target.value)}
                      required
                    />

                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>{t("momo_modal.mtn_phone_label", { defaultValue: "MTN Phone Number" })}</span>
                          <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                          {t("momo_modal.mtn_badge", { defaultValue: "MTN Rwanda (078 / 079)" })}
                        </span>
                      </div>

                      <div className="relative">
                        <input
                          type="tel"
                          className={`w-full text-sm font-mono font-bold rounded-xl border px-3.5 py-2.5 text-slate-900 dark:text-white outline-none transition ${
                            isCompleteMtn
                              ? "border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 focus:ring-2 focus:ring-emerald-500"
                              : isAirtelOrInvalidPrefix
                              ? "border-rose-400 bg-rose-50/30 dark:bg-rose-950/20 focus:ring-2 focus:ring-rose-500"
                              : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-[#156c45]"
                          }`}
                          placeholder={t("momo_modal.phone_placeholder", { defaultValue: "078XXXXXXX or 079..." })}
                          value={phoneNumber}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPhoneNumber(normalizeMtnRwandaNumber(val));
                          }}
                          maxLength={10}
                          required
                        />
                        {isCompleteMtn && (
                          <span className="absolute right-3 top-2.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" /> {t("momo_modal.verified_badge", { defaultValue: "Verified" })}
                          </span>
                        )}
                      </div>

                      {/* Quick MTN Prefix Helpers */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-medium">{t("momo_modal.quick_prefix", { defaultValue: "Quick prefix:" })}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const rest = cleanPhone.startsWith("078") || cleanPhone.startsWith("079") ? cleanPhone.slice(3) : cleanPhone;
                              setPhoneNumber(("078" + rest).slice(0, 10));
                            }}
                            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 transition cursor-pointer"
                          >
                            078...
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const rest = cleanPhone.startsWith("078") || cleanPhone.startsWith("079") ? cleanPhone.slice(3) : cleanPhone;
                              setPhoneNumber(("079" + rest).slice(0, 10));
                            }}
                            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 transition cursor-pointer"
                          >
                            079...
                          </button>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {t("momo_modal.digits_count", { count: cleanPhone.length, defaultValue: `${cleanPhone.length}/10 digits` })}
                        </span>
                      </div>

                      {/* Real-time Validation Feedback */}
                      {isAirtelPrefix && (
                        <div className="mt-2.5 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 rounded-xl text-xs space-y-2">
                          <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                            <Smartphone className="h-4 w-4 shrink-0 text-amber-600" />
                            <span>{t("momo_modal.airtel_detected_title", { prefix: cleanPhone.slice(0, 3), defaultValue: `Airtel Money Rwanda Detected (${cleanPhone.slice(0, 3)}...)` })}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed break-words">
                            {t("momo_modal.airtel_detected_desc", { defaultValue: "Automated USSD push prompt is exclusive to MTN Rwanda SIMs. If you are using Airtel Money, switch to manual transfer to pay via *500# or *182# and submit your confirmation SMS." })}
                          </p>
                          <Button
                            type="button"
                            onClick={() => setTab("manual_sms")}
                            className="w-full py-2 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition"
                          >
                            {t("momo_modal.switch_airtel_btn", { defaultValue: "Switch to Airtel Transfer Instructions (*500# / *182#)" })}
                          </Button>
                        </div>
                      )}

                      {isAirtelOrInvalidPrefix && !isAirtelPrefix && (
                        <div className="mt-2.5 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 rounded-xl text-xs flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="font-bold">{t("momo_modal.mtn_required_title", { defaultValue: "MTN Rwanda Number Required" })}</p>
                            <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5 break-words">
                              {t("momo_modal.mtn_required_hint", { defaultValue: "Please enter an MTN number starting with 078 or 079 (e.g. 078XXXXXXX). Airtel users can switch to the Manual SMS tab above." })}
                            </p>
                          </div>
                        </div>
                      )}

                      {cleanPhone.length > 0 && isMtnPrefix && cleanPhone.length < 10 && (
                        <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3 shrink-0" />
                          {t("momo_modal.digits_remaining", { count: 10 - cleanPhone.length, defaultValue: `Please enter all 10 digits (${10 - cleanPhone.length} more needed)` })}
                        </p>
                      )}

                      {isCompleteMtn && (
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          {t("momo_modal.mtn_sim_verified", { defaultValue: "MTN SIM verified. Prompt will be delivered to this handset automatically." })}
                        </p>
                      )}
                    </div>

                    <Input
                      label={t("momo_modal.tx_note_label", { defaultValue: "Transaction Note / Comment (Optional)" })}
                      placeholder={t("momo_modal.tx_note_placeholder", { defaultValue: "e.g. Monthly Solidarity Contribution" })}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                  </div>

                  {statusMessage && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span className="break-words min-w-0">{statusMessage}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!isCompleteMtn}
                    className={`w-full py-3 px-4 font-medium text-xs sm:text-sm rounded-lg shadow-xs flex items-center justify-center gap-2 transition ${
                      isCompleteMtn
                        ? "bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white cursor-pointer"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
                    }`}
                  >
                    <Smartphone className="h-4 w-4 shrink-0" />
                    <span className="break-words">
                      {itemType === "donation"
                        ? t("momo_modal.authorize_donation_btn", { defaultValue: "Authorize MoMo Contribution" })
                        : t("momo_modal.pay_via_momo_btn", { amount: amountRwf.toLocaleString(), defaultValue: `Pay ${amountRwf.toLocaleString()} RWF via MoMo Prompt` })}
                    </span>
                  </button>
                </form>
              )}

              {pushStatus === "initiating" && (
                <div className="py-8 text-center space-y-4">
                  <div className="h-14 w-14 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-[#156c45] dark:text-emerald-400 flex items-center justify-center animate-spin">
                    <RefreshCw className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                      {t("momo_modal.connecting_pawapay", { defaultValue: "Connecting to PawaPay Gateway..." })}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 break-words">{statusMessage}</p>
                  </div>
                </div>
              )}

              {pushStatus === "awaiting_pin" && (
                <div className="py-3 space-y-4 text-center animate-in zoom-in-[0.98]">
                  <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-25 animate-ping" />
                    <div className="relative h-14 w-14 rounded-2xl bg-[#156c45] text-white flex items-center justify-center shadow-lg">
                      <Smartphone className="h-7 w-7 animate-pulse" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-display font-extrabold text-slate-900 dark:text-white text-sm sm:text-base break-words">
                      {t("momo_modal.prompt_sent_title", { phone: phoneNumber, defaultValue: `Prompt Sent to MTN SIM: ${phoneNumber}` })}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed break-words">
                      {t("momo_modal.prompt_sent_desc", { amount: amountRwf.toLocaleString(), defaultValue: `Please look at your phone screen right now and enter your MTN MoMo PIN to authorize ${amountRwf.toLocaleString()} RWF.` })}
                    </p>
                  </div>

                  {/* Timer & USSD manual shortcut box */}
                  <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-left space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                        <Clock className="h-4 w-4 animate-spin shrink-0" />
                        {countdown > 0
                          ? t("momo_modal.awaiting_pin_label", { defaultValue: "Awaiting your PIN on phone..." })
                          : t("momo_modal.waiting_clearance_label", { defaultValue: "Waiting for MTN clearance..." })}
                      </span>
                      <span className="font-mono text-slate-500">
                        {countdown > 0
                          ? t("momo_modal.seconds_remaining", { seconds: countdown, defaultValue: `${countdown}s remaining` })
                          : t("momo_modal.extended_wait", { defaultValue: "Extended wait" })}
                      </span>
                    </div>

                    <div className="pt-2.5 border-t border-dashed border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 space-y-2">
                      <p className="font-bold text-slate-700 dark:text-slate-300">
                        {t("momo_modal.didnt_see_ussd", { defaultValue: "Didn't see the USSD pop-up on your screen?" })}
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-[11px] text-slate-800 dark:text-slate-200">
                          {t("momo_modal.dial_shortcut_prefix", { defaultValue: "Dial" })} <strong className="font-mono font-bold text-[#156c45] dark:text-emerald-400">*182*7*1#</strong> {t("momo_modal.dial_shortcut_suffix", { defaultValue: "& enter MoMo PIN" })}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode("*182*7*1#", "ussd")}
                          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer shrink-0"
                        >
                          {copiedCode === "ussd" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                          <span>{copiedCode === "ussd" ? t("common.copied", { defaultValue: "Copied" }) : t("momo_modal.copy_code", { defaultValue: "Copy Code" })}</span>
                        </button>
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={handleCheckStatusNow}
                      loading={checkingStatus}
                      className="w-full py-2.5 text-xs bg-[#156c45] hover:bg-[#125939] text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${checkingStatus ? "animate-spin" : ""}`} />
                      {t("momo_modal.check_status_now_btn", { defaultValue: "I Approved PIN / Check MoMo Status Now" })}
                    </Button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setPushStatus("idle")}
                      className="w-full sm:w-1/2 py-2 text-xs rounded-xl"
                    >
                      {t("momo_modal.change_phone_btn", { defaultValue: "Change Phone Number" })}
                    </Button>
                    <Button
                      onClick={() => setTab("manual_sms")}
                      className="w-full sm:w-1/2 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded-xl"
                    >
                      {t("momo_modal.use_manual_ref_btn", { defaultValue: "Use Manual Reference" })}
                    </Button>
                  </div>
                </div>
              )}

              {pushStatus === "success" && (
                <PaymentSuccessPulse
                  title={t("momo_modal.payment_confirmed_title", { defaultValue: "Payment Confirmed!" })}
                  message={statusMessage}
                  reference={providerTxId || undefined}
                  amountRwf={amountRwf}
                  doneLabel={t("momo_modal.done_close_btn", { defaultValue: "Done & Close" })}
                  onDone={onClose}
                />
              )}

              {pushStatus === "failed" && (
                <div className="py-4 space-y-3.5 text-center animate-in zoom-in-[0.98]">
                  <div className="h-14 w-14 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center border border-rose-200 dark:border-rose-900/60">
                    <AlertCircle className="h-7 w-7" />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                      {t("momo_modal.tx_incomplete_title", { defaultValue: "Transaction Incomplete or Timed Out" })}
                    </h4>
                    <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 break-words">{statusMessage}</p>
                  </div>
                  {depositId && (
                    <Button
                      type="button"
                      onClick={handleCheckStatusNow}
                      loading={checkingStatus}
                      className="w-full py-2.5 text-xs bg-[#156c45] hover:bg-[#125939] text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${checkingStatus ? "animate-spin" : ""}`} />
                      {t("momo_modal.recheck_status_btn", { defaultValue: "Re-Check Status (If Approved via *182*7*1#)" })}
                    </Button>
                  )}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setPushStatus("idle")}
                      className="w-full sm:w-1/2 py-2 text-xs rounded-xl"
                    >
                      {t("momo_modal.try_again_btn", { defaultValue: "Try Again" })}
                    </Button>
                    <Button
                      onClick={() => setTab("manual_sms")}
                      className="w-full sm:w-1/2 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded-xl"
                    >
                      {t("momo_modal.paste_sms_proof_btn", { defaultValue: "Paste SMS Proof" })}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : pushStatus === "success" ? (
            <PaymentSuccessPulse
              title={t("momo_modal.proof_submitted_title", { defaultValue: "Payment Proof Submitted!" })}
              message={statusMessage || t("momo_modal.status_manual_submitted", { defaultValue: "Payment slip recorded and submitted for accountant verification." })}
              reference={providerTxId || manualTxRef || undefined}
              amountRwf={amountRwf}
              doneLabel={t("momo_modal.done_close_btn", { defaultValue: "Done & Close" })}
              onDone={onClose}
            />
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-3.5">
              <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed break-words">
                {t("momo_modal.manual_intro", { defaultValue: "If you made a manual Mobile Money transfer via dial code or bank agent, paste the SMS confirmation or reference ID below for the accountant to reconcile." })}
              </p>

              <UssdPaymentHelper
                targetType={isPlatformTarget ? "platform" : "organization"}
                mtnNumber={finalMtnNumber}
                merchantCode={finalMerchantCode}
                airtelNumber={finalAirtelNumber}
                recipientName={finalRecipientName}
                amountRwf={itemType === "donation" ? undefined : amountRwf}
                isDonation={itemType === "donation"}
                itemName={resolvedItemName}
                allowedMethods={isPlatformTarget ? undefined : effectiveAllowedMethods}
                compact
              />

              <Input
                label={t("momo_modal.payer_full_name", { defaultValue: "Payer Full Name" })}
                placeholder={t("momo_modal.payer_full_name_placeholder", { defaultValue: "e.g. Jean Pierre N." })}
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                required
              />

              <Input
                label={t("momo_modal.payer_phone_label", { defaultValue: "Payer Phone Number" })}
                placeholder={t("momo_modal.phone_placeholder", { defaultValue: "078XXXXXXX or 079..." })}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />

              <Input
                label={t("momo_modal.manual_tx_ref_label", { defaultValue: "Transaction ID / Reference Key (Optional if pasting SMS)" })}
                placeholder={t("momo_modal.manual_tx_ref_placeholder", { defaultValue: "e.g. TXN93821034" })}
                value={manualTxRef}
                onChange={(e) => setManualTxRef(e.target.value)}
              />

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {t("momo_modal.pasted_sms_label", { defaultValue: "Pasted SMS Confirmation Message" })} <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  className="w-full text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#156c45] outline-none"
                  placeholder={t("momo_modal.pasted_sms_placeholder", { defaultValue: "Paste transaction SMS: 'You have transferred 25,000 RWF to Impacto Ltd. TxId: 98124...'" })}
                  value={manualSms}
                  onChange={(e) => setManualSms(e.target.value)}
                  required={!manualTxRef}
                />
              </div>

              {manualError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="break-words min-w-0">{manualError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={manualSubmitting}
                className="w-full py-3 sm:py-3.5 bg-[#156c45] hover:bg-[#125939] active:scale-[0.99] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {manualSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
                    <span>{t("momo_modal.submitting_slip", { defaultValue: "Submitting Payment Slip..." })}</span>
                  </>
                ) : (
                  <span>{t("momo_modal.submit_slip_btn", { defaultValue: "Submit Payment Slip for Verification" })}</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
