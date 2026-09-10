import React, { useState, useEffect, useRef } from "react";
import {
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Zap,
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
  X,
  CreditCard,
  Building2,
  FileText
} from "lucide-react";
import { Button, Input } from "./ui";
import { useCurrencyStore } from "../store/currencyStore";

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

interface MoMoPushPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  amountRwf: number;
  amountUsd?: number;
  orgId?: string;
  defaultPayerName?: string;
  defaultPayerPhone?: string;
  defaultPhone?: string;
  itemType?: "subscription" | "package" | "member_due" | "dues" | "donation" | "general" | string;
  itemName?: string;
  recipientName?: string;
  recipientMtnNumber?: string;
  recipientAirtelNumber?: string;
  recipientMerchantCode?: string;
  isPlatformFee?: boolean;
  onSuccess: (data: MoMoPaymentSuccessData) => Promise<void> | void;
}

export const MoMoPushPaymentModal: React.FC<MoMoPushPaymentModalProps> = ({
  isOpen,
  onClose,
  title = "Mobile Money Prompt (Instant Push)",
  description = "Enter your phone number to receive a direct USSD payment prompt on your phone screen.",
  amountRwf,
  amountUsd,
  orgId,
  defaultPayerName = "",
  defaultPayerPhone = "",
  defaultPhone = "",
  itemType = "general",
  itemName = "Payment",
  recipientName,
  recipientMtnNumber,
  recipientAirtelNumber,
  recipientMerchantCode,
  isPlatformFee,
  onSuccess,
}) => {
  const { formatAmount } = useCurrencyStore();
  const [tab, setTab] = useState<"instant_push" | "manual_sms">("instant_push");

  const effectivePhone = defaultPayerPhone || defaultPhone || "";

  // Form states
  const [payerName, setPayerName] = useState(defaultPayerName);
  const [phoneNumber, setPhoneNumber] = useState(effectivePhone);
  const [comment, setComment] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Determine if this is a platform license payment vs organization dues payment
  const isPlatformTarget = isPlatformFee !== undefined 
    ? isPlatformFee 
    : (itemType === "subscription" || itemType === "package");

  const finalRecipientName = recipientName || (isPlatformTarget ? "VIRELLIX INC (Impacto SaaS Platform)" : "Organization Treasury");
  const finalMtnNumber = recipientMtnNumber || (isPlatformTarget ? "0788100100" : "0788100100");
  const finalAirtelNumber = recipientAirtelNumber || (isPlatformTarget ? "0733100100" : "0733100100");
  const finalMerchantCode = recipientMerchantCode || (isPlatformTarget ? "*182*8*1*880099#" : undefined);

  // Push Lifecycle States: 'idle' | 'initiating' | 'awaiting_pin' | 'verifying' | 'success' | 'failed'
  const [pushStatus, setPushStatus] = useState<"idle" | "initiating" | "awaiting_pin" | "verifying" | "success" | "failed">("idle");
  const [depositId, setDepositId] = useState("");
  const [providerTxId, setProviderTxId] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [countdown, setCountdown] = useState(90);
  const [detectedProvider, setDetectedProvider] = useState<"MTN" | "Airtel">("MTN");

  // Manual fallback states
  const [manualTxRef, setManualTxRef] = useState("");
  const [manualSms, setManualSms] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Detect operator from phone input
  useEffect(() => {
    const clean = phoneNumber.replace(/\D/g, "");
    if (
      clean.startsWith("072") ||
      clean.startsWith("073") ||
      clean.startsWith("25072") ||
      clean.startsWith("25073") ||
      clean.includes("72") ||
      clean.includes("73")
    ) {
      setDetectedProvider("Airtel");
    } else {
      setDetectedProvider("MTN");
    }
  }, [phoneNumber]);

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
    if (!phoneNumber || phoneNumber.replace(/\D/g, "").length < 9) {
      setStatusMessage("Please enter a valid 10-digit phone number (e.g. 078XXXXXXX or 072XXXXXXX)");
      return;
    }

    setPushStatus("initiating");
    setStatusMessage("Sending Mobile Money authorization prompt to your SIM...");

    try {
      const res = await fetch("/api/payments/pawapay/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          amount: Math.round(amountRwf),
          currency: "RWF",
          phoneNumber,
          payerName: payerName || "Impacto Payer",
          customerMessage: (comment || itemName || "Impacto Payment").substring(0, 22),
          metadata: {
            fieldName: "itemType",
            fieldValue: itemType,
          },
        }),
      });

      const data = await res.json();

      if (data.success && data.depositId) {
        setDepositId(data.depositId);
        setPushStatus("awaiting_pin");
        setStatusMessage(
          `Prompt sent to ${phoneNumber}! Check your phone screen now and enter your Mobile Money PIN.`
        );
        startCountdownAndPolling(data.depositId);
      } else {
        setPushStatus("failed");
        setStatusMessage(data.message || "Could not trigger Mobile Money push. Please check your phone number or try the manual tab.");
      }
    } catch (err: any) {
      setPushStatus("failed");
      setStatusMessage(err.message || "Connection error. Please try again.");
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
          const currentStatus = (checkData.status || checkData.data?.status || "").toUpperCase();
          const txId = checkData.providerTransactionId || checkData.data?.providerTransactionId || depId.slice(0, 8);

          if (currentStatus === "COMPLETED" || currentStatus === "SUCCESS" || currentStatus === "FOUND") {
            if (pollingRef.current) clearInterval(pollingRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
            setProviderTxId(txId);
            setPushStatus("success");
            setStatusMessage("Payment successfully confirmed by telecom provider!");

            // Call parent onSuccess callback
            await onSuccess({
              depositId: depId,
              providerTransactionId: txId,
              amount: amountRwf,
              currency: "RWF",
              payerPhone: phoneNumber,
              payerName: payerName || "Payer",
              provider: detectedProvider === "MTN" ? "MTN_MOMO_RWA" : "AIRTEL_MONEY_RWA",
              comment: comment || itemName,
              method: "pawapay_push",
            });
          } else if (currentStatus === "FAILED" || currentStatus === "REJECTED") {
            if (pollingRef.current) clearInterval(pollingRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
            setPushStatus("failed");
            setStatusMessage("Transaction was cancelled or rejected on the handset.");
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
    if (!manualSms && !manualTxRef) {
      alert("Please provide the transaction reference ID or paste the SMS proof.");
      return;
    }

    setManualSubmitting(true);
    try {
      await onSuccess({
        depositId: manualTxRef || `MAN-${Date.now().toString().slice(-8)}`,
        providerTransactionId: manualTxRef || undefined,
        amount: amountRwf,
        currency: "RWF",
        payerPhone: phoneNumber,
        payerName: payerName || "Payer",
        provider: detectedProvider === "MTN" ? "MTN_MOMO_RWA" : "AIRTEL_MONEY_RWA",
        comment: comment || itemName,
        method: "manual_proof",
        proofText: manualSms,
      });
      setPushStatus("success");
    } catch (err: any) {
      alert(err.message || "Failed to submit manual proof.");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-900 dark:text-white leading-tight">
                {title}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {itemName} &bull; {amountRwf.toLocaleString()} RWF
                {amountUsd ? ` (~$${amountUsd})` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="px-6 pt-3 pb-0 flex gap-2 border-b border-slate-100 dark:border-slate-800/60">
          <button
            type="button"
            onClick={() => {
              setTab("instant_push");
              setPushStatus("idle");
            }}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              tab === "instant_push"
                ? "border-emerald-600 text-emerald-700 dark:text-emerald-400"
                : "border-transparent text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            Instant MoMo Push (Auto PIN)
          </button>
          <button
            type="button"
            onClick={() => setTab("manual_sms")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              tab === "manual_sms"
                ? "border-emerald-600 text-emerald-700 dark:text-emerald-400"
                : "border-transparent text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Manual SMS / Agent Code
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Amount and Beneficiary Header Card */}
          <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-150 dark:border-emerald-900/40 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block tracking-wider">
                  Total Payable Amount
                </span>
                <span className="text-xl font-black font-mono text-emerald-900 dark:text-emerald-300">
                  {amountRwf.toLocaleString()} <span className="text-xs font-sans">RWF</span>
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-semibold text-stone-400 block">
                  {isPlatformTarget ? "Platform SaaS License Receiver" : "Organization Receiver"}
                </span>
                <span className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  {finalRecipientName}
                </span>
              </div>
            </div>

            {/* Destination Credentials Strip */}
            <div className="pt-2 border-t border-emerald-200/50 dark:border-emerald-900/40 flex flex-wrap items-center justify-between gap-2 text-[10.5px] font-mono text-stone-600 dark:text-stone-300">
              <div className="flex items-center gap-1.5">
                <span className="text-[9.5px] font-bold uppercase text-stone-500 font-sans">
                  Target:
                </span>
                <span className="bg-amber-100/80 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 px-1.5 py-0.5 rounded font-bold">
                  MTN {finalMtnNumber}
                </span>
                <span className="bg-rose-100/80 dark:bg-rose-950/50 text-rose-900 dark:text-rose-300 px-1.5 py-0.5 rounded font-bold">
                  Airtel {finalAirtelNumber}
                </span>
              </div>
              {finalMerchantCode && (
                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-lg text-emerald-700 dark:text-emerald-400 font-bold">
                  <span>Pay Code: {finalMerchantCode}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(finalMerchantCode, "merchant_strip")}
                    className="hover:text-emerald-900 p-0.5"
                    title="Copy Code"
                  >
                    {copiedCode === "merchant_strip" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {tab === "instant_push" ? (
            <div>
              {pushStatus === "idle" && (
                <form onSubmit={handleInitiatePush} className="space-y-4">
                  <p className="text-stone-500 dark:text-stone-400 leading-relaxed text-xs">
                    {description}
                  </p>

                  <div className="space-y-3">
                    <Input
                      label="Payer Full Name"
                      placeholder="e.g. Jean Pierre Nsanzimana"
                      value={payerName}
                      onChange={(e) => setPayerName(e.target.value)}
                      required
                    />

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                          MoMo / Airtel Phone Number <span className="text-rose-500">*</span>
                        </label>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                            detectedProvider === "MTN"
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : "bg-rose-100 text-rose-900 border border-rose-300"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              detectedProvider === "MTN" ? "bg-amber-600" : "bg-rose-600"
                            }`}
                          />
                          {detectedProvider} Mobile Money
                        </span>
                      </div>
                      <input
                        type="tel"
                        className="w-full text-sm font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                        placeholder="0788123456 or 0728123456"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d+]/g, ""))}
                        required
                      />
                      <p className="text-[10px] text-stone-400 mt-1">
                        The phone with this SIM card will receive the automatic popup authorization.
                      </p>
                    </div>

                    <Input
                      label="Transaction Note / Comment (Optional)"
                      placeholder="e.g. Monthly Solidarity Contribution"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                  </div>

                  {statusMessage && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {statusMessage}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    Send MoMo PIN Prompt ({amountRwf.toLocaleString()} RWF)
                  </Button>
                </form>
              )}

              {pushStatus === "initiating" && (
                <div className="py-8 text-center space-y-4">
                  <div className="h-16 w-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center animate-spin">
                    <RefreshCw className="h-8 w-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-800 dark:text-white text-sm">
                      Connecting to Telecom Gateway...
                    </h4>
                    <p className="text-xs text-stone-400 mt-1">{statusMessage}</p>
                  </div>
                </div>
              )}

              {pushStatus === "awaiting_pin" && (
                <div className="py-4 space-y-4 text-center animate-in zoom-in-95">
                  <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-30 animate-ping" />
                    <div className="relative h-16 w-16 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg">
                      <Smartphone className="h-8 w-8 animate-pulse" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-stone-900 dark:text-white text-base">
                      Prompt Sent to {phoneNumber}!
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-300 mt-1 max-w-xs mx-auto">
                      Please look at your phone screen right now and enter your Mobile Money PIN to approve{" "}
                      <span className="font-bold text-emerald-600">{amountRwf.toLocaleString()} RWF</span>.
                    </p>
                  </div>

                  {/* Timer & USSD manual shortcut box */}
                  <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-left space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-stone-700 dark:text-stone-300">
                      <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                        <Clock className="h-4 w-4 animate-spin" />
                        Listening for confirmation...
                      </span>
                      <span className="font-mono text-stone-500">{countdown}s remaining</span>
                    </div>

                    <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-800 text-[11px] text-stone-500">
                      <p className="font-bold text-stone-700 dark:text-stone-300 mb-1">
                        Didn't get the pop-up on your screen?
                      </p>
                      {detectedProvider === "MTN" ? (
                        <p>
                          Dial <span className="font-mono font-bold text-amber-700 bg-amber-50 px-1 py-0.5 rounded">*182*7*1#</span> on your phone and enter your PIN to approve pending transaction.
                        </p>
                      ) : (
                        <p>
                          Dial <span className="font-mono font-bold text-rose-700 bg-rose-50 px-1 py-0.5 rounded">*182*5*6*1#</span> on your phone to confirm the pending prompt.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setPushStatus("idle")}
                      className="w-1/2 py-2 text-xs"
                    >
                      Change Phone Number
                    </Button>
                    <Button
                      onClick={() => setTab("manual_sms")}
                      className="w-1/2 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-white"
                    >
                      Use Manual Reference
                    </Button>
                  </div>
                </div>
              )}

              {pushStatus === "success" && (
                <div className="py-6 text-center space-y-4 animate-in zoom-in-95">
                  <div className="h-16 w-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-md">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-stone-900 dark:text-white text-lg">
                      Payment Confirmed!
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                      {statusMessage}
                    </p>
                    {providerTxId && (
                      <div className="mt-2 inline-block bg-slate-100 dark:bg-slate-800 font-mono text-[11px] font-bold px-3 py-1 rounded-lg text-stone-700 dark:text-stone-300">
                        Ref: {providerTxId}
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={onClose}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                  >
                    Done & Close
                  </Button>
                </div>
              )}

              {pushStatus === "failed" && (
                <div className="py-4 space-y-3 text-center animate-in zoom-in-95">
                  <div className="h-14 w-14 mx-auto rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                    <AlertCircle className="h-8 w-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900 dark:text-white text-sm">
                      Transaction Incomplete
                    </h4>
                    <p className="text-xs text-rose-600 mt-1">{statusMessage}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setPushStatus("idle")}
                      className="w-1/2 py-2 text-xs"
                    >
                      Try Again
                    </Button>
                    <Button
                      onClick={() => setTab("manual_sms")}
                      className="w-1/2 py-2 text-xs bg-emerald-600 text-white"
                    >
                      Paste SMS Proof
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-3.5">
              <p className="text-stone-500 dark:text-stone-400 text-xs leading-relaxed">
                If you made a manual Mobile Money transfer via dial code or bank agent, paste the SMS confirmation or reference ID below for the accountant to reconcile.
              </p>

              <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-3 text-[11px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider text-[10px]">
                    Authorized {isPlatformTarget ? "Platform" : "Organization"} Settlement Numbers:
                  </span>
                  <span className="text-[10px] font-bold text-stone-600 dark:text-stone-300">
                    {finalRecipientName}
                  </span>
                </div>
                <div className="flex items-center justify-between text-stone-700 dark:text-stone-300 font-mono">
                  <span>MTN MoMo: <strong>{finalMtnNumber}</strong></span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(finalMtnNumber, "mtn")}
                    className="text-amber-700 hover:text-amber-900 p-1 flex items-center gap-1 text-[10px]"
                  >
                    {copiedCode === "mtn" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span className="font-sans">Copy</span>
                  </button>
                </div>
                <div className="flex items-center justify-between text-stone-700 dark:text-stone-300 font-mono">
                  <span>Airtel Money: <strong>{finalAirtelNumber}</strong></span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(finalAirtelNumber, "airtel")}
                    className="text-amber-700 hover:text-amber-900 p-1 flex items-center gap-1 text-[10px]"
                  >
                    {copiedCode === "airtel" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span className="font-sans">Copy</span>
                  </button>
                </div>
                {finalMerchantCode && (
                  <div className="flex items-center justify-between text-stone-700 dark:text-stone-300 font-mono pt-1 border-t border-amber-200/60 dark:border-amber-900/40">
                    <span>Merchant Pay Code: <strong>{finalMerchantCode}</strong></span>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(finalMerchantCode, "code")}
                      className="text-emerald-700 hover:text-emerald-900 p-1 flex items-center gap-1 text-[10px]"
                    >
                      {copiedCode === "code" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      <span className="font-sans">Copy</span>
                    </button>
                  </div>
                )}
              </div>

              <Input
                label="Payer Full Name"
                placeholder="e.g. Jean Pierre Nsanzimana"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                required
              />

              <Input
                label="Payer Phone Number"
                placeholder="078XXXXXXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />

              <Input
                label="Transaction ID / Reference Key (Optional if pasting SMS)"
                placeholder="e.g. TXN93821034"
                value={manualTxRef}
                onChange={(e) => setManualTxRef(e.target.value)}
              />

              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Pasted SMS Confirmation Message <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  className="w-full text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Paste transaction SMS: 'You have transferred 25,000 RWF to Impacto Ltd. TxId: 98124...'"
                  value={manualSms}
                  onChange={(e) => setManualSms(e.target.value)}
                  required={!manualTxRef}
                />
              </div>

              <Button
                type="submit"
                loading={manualSubmitting}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
              >
                Submit Payment Slip for Accountant Verification
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
