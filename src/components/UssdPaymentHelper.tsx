import React, { useState } from "react";
import {
  PhoneCall,
  Store,
  Copy,
  Check,
  AlertTriangle,
  Send,
  Sparkles,
  Smartphone,
  ExternalLink,
  Info
} from "lucide-react";
import { useToast } from "./Toast";

export interface UssdPaymentHelperProps {
  targetType: "organization" | "platform";
  mtnNumber?: string;
  merchantCode?: string;
  airtelNumber?: string;
  recipientName?: string;
  amountRwf?: number;
  itemName?: string;
  onRequestAdmin?: () => void;
  className?: string;
  isDonation?: boolean;
}

/**
 * Extracts a clean numeric code from user input (e.g. *182*8*1*880099# -> 880099)
 */
export function cleanMerchantCode(input?: string): string {
  if (!input) return "";
  const match = input.match(/\*182\*8\*1\*([0-9]+)#?/);
  if (match && match[1]) return match[1];
  return input.replace(/[^\d]/g, "");
}

/**
 * Normalizes phone numbers to standard Rwandan format 078XXXXXXX / 079XXXXXXX
 */
export function cleanPhoneNumber(input?: string): string {
  if (!input) return "";
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("250")) {
    digits = "0" + digits.substring(3);
  }
  return digits;
}

/**
 * Resolves the active payment code across platform settings, active organization, localStorage, and system defaults.
 */
export function getEffectivePaymentCode(
  platformSettings?: any,
  activeOrg?: any,
  targetType: "platform" | "organization" = "platform"
): string {
  if (targetType === "organization") {
    const orgCode = activeOrg?.momo_merchant_code || activeOrg?.dues_mtn_number || activeOrg?.mtn_payment_number;
    if (orgCode && typeof orgCode === "string" && orgCode.trim()) return orgCode.trim();

    if (activeOrg?.id) {
      try {
        const orgLocal = localStorage.getItem(`impacto_org_momo_merchant_code_${activeOrg.id}`);
        if (orgLocal && typeof orgLocal === "string" && orgLocal.trim()) return orgLocal.trim();
      } catch (e) {}
    }
    return "";
  }

  const psCode = platformSettings?.momo_merchant_code || platformSettings?.mtn_merchant_code || platformSettings?.mtn_payment_number;
  if (psCode && typeof psCode === "string" && psCode.trim()) return psCode.trim();

  try {
    const rawPs = localStorage.getItem("impacto_mock_platform_settings");
    if (rawPs) {
      const parsed = JSON.parse(rawPs);
      const cachedPs = parsed?.momo_merchant_code || parsed?.mtn_merchant_code || parsed?.mtn_payment_number;
      if (cachedPs && typeof cachedPs === "string" && cachedPs.trim()) return cachedPs.trim();
    }
  } catch (e) {}

  try {
    const globalCode = localStorage.getItem("impacto_global_momo_merchant_code");
    if (globalCode && typeof globalCode === "string" && globalCode.trim()) return globalCode.trim();
  } catch (e) {}

  return "2325266";
}

export const UssdPaymentHelper: React.FC<UssdPaymentHelperProps> = ({
  targetType,
  mtnNumber,
  merchantCode,
  airtelNumber,
  recipientName,
  amountRwf,
  itemName = "Payment",
  onRequestAdmin,
  className = "",
  isDonation = false
}) => {
  const { addToast } = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isRequestingAdmin, setIsRequestingAdmin] = useState(false);
  const [adminRequestSent, setAdminRequestSent] = useState(false);

  const effectiveMCode =
    targetType === "organization"
      ? (merchantCode || "")
      : (merchantCode || getEffectivePaymentCode(undefined, undefined, "platform"));
  const hasExplicitMtn = Boolean(mtnNumber && mtnNumber.trim() && mtnNumber !== "0788300000");
  const hasExplicitAirtel = Boolean(airtelNumber && airtelNumber.trim() && airtelNumber !== "0728300000");
  const cleanNum = hasExplicitMtn ? cleanPhoneNumber(mtnNumber) : "";
  const cleanMCode = cleanMerchantCode(effectiveMCode);
  const cleanAirtel = hasExplicitAirtel ? cleanPhoneNumber(airtelNumber) : "";
  // For donations, contributions are random so no fixed amount is attached to the USSD dial code
  const formattedAmount = isDonation ? null : (amountRwf && amountRwf > 0 ? Math.round(amountRwf) : null);

  // Auto-generate standard Rwanda MTN USSD strings:
  // 1. Pay on MTN Phone Number (Send Money / P2P):
  //    Direct with fee: *182*1*1*<number>*<amount>#
  //    Base / Donation: *182*1*1*<number>#
  const p2pUssdWithAmount = cleanNum && formattedAmount ? `*182*1*1*${cleanNum}*${formattedAmount}#` : "";
  const p2pUssdBase = cleanNum ? `*182*1*1*${cleanNum}#` : "";
  const p2pUssdPrimary = p2pUssdWithAmount || p2pUssdBase;

  // 2. MoMo Pay Merchant Code:
  //    Direct with fee: *182*8*1*<code>*<amount>#
  //    Base / Donation: *182*8*1*<code>#
  const merchantUssdWithAmount = cleanMCode && formattedAmount ? `*182*8*1*${cleanMCode}*${formattedAmount}#` : "";
  const merchantUssdBase = cleanMCode ? `*182*8*1*${cleanMCode}#` : "";
  const merchantUssdPrimary = merchantUssdWithAmount || merchantUssdBase;

  // 3. Airtel Money USSD:
  const airtelUssdWithAmount = cleanAirtel && formattedAmount ? `*182*1*1*${cleanAirtel}*${formattedAmount}#` : "";
  const airtelUssdBase = cleanAirtel ? `*182*1*1*${cleanAirtel}#` : "";
  const airtelUssdPrimary = airtelUssdWithAmount || airtelUssdBase;

  const hasAnyPayment = Boolean(cleanNum || cleanMCode || cleanAirtel);

  const copyToClipboard = async (text: string, key: string, label: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedKey(key);
      addToast(`${label} copied: ${text}`, "success");
      setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      addToast(`Could not copy. Please manually dial: ${text}`, "info");
    }
  };

  const handleAdminRequestClick = async () => {
    setIsRequestingAdmin(true);
    try {
      if (onRequestAdmin) {
        await onRequestAdmin();
      } else {
        // Fallback default notification
        const pending = JSON.parse(localStorage.getItem("impacto_admin_payment_requests") || "[]");
        pending.push({
          date: new Date().toISOString(),
          targetType,
          item: itemName,
          amount: amountRwf
        });
        localStorage.setItem("impacto_admin_payment_requests", JSON.stringify(pending));
      }
      setAdminRequestSent(true);
      addToast("Request sent to administrator to configure MoMo payment details.", "success");
    } catch {
      addToast("Could not send request. Please alert your admin directly.", "error");
    } finally {
      setIsRequestingAdmin(false);
    }
  };

  // Determine active columns count for clean responsive grid
  const activeCount = (cleanNum ? 1 : 0) + (cleanMCode ? 1 : 0) + (cleanAirtel ? 1 : 0);

  if (!hasAnyPayment) {
    return null;
  }

  return (
    <div className={`w-full min-w-0 box-sizing-border-box space-y-3 ${className}`}>
        <div className="w-full min-w-0 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Smartphone className="h-4 w-4 text-emerald-600" /> Mobile Money USSD Gateway
            </span>
            {recipientName && (
              <span className="truncate max-w-full">
                Account: <strong className="text-slate-800 dark:text-slate-200 font-bold">{recipientName}</strong>
              </span>
            )}
          </div>

          <div className={`grid grid-cols-1 ${activeCount > 1 ? "md:grid-cols-2" : ""} gap-3 w-full min-w-0`}>
            {/* 1. MoMo Pay Merchant Code (Primary when code is set) */}
            {cleanMCode && (
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-3 w-full min-w-0 shadow-2xs">
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 shrink-0">
                      <Store className="h-4 w-4 text-amber-500 shrink-0" /> MTN MoMo Code
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(cleanMCode, "code_raw", "Merchant code")}
                      className="font-mono text-slate-700 dark:text-slate-300 hover:text-emerald-600 cursor-pointer text-xs font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded shrink-0"
                      title="Click to copy merchant code"
                    >
                      {copiedKey === "code_raw" ? "Copied" : cleanMCode}
                    </button>
                  </div>

                  {/* Primary USSD String Block */}
                  <div className="font-mono text-xs text-slate-900 dark:text-slate-100 bg-slate-100/80 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 min-w-0">
                    <span className="font-bold select-all break-all overflow-wrap-anywhere min-w-0 flex-1">
                      {merchantUssdPrimary}
                    </span>
                    {formattedAmount ? (
                      <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 shrink-0 border border-emerald-200 dark:border-emerald-800">
                        {formattedAmount.toLocaleString()} RWF
                      </span>
                    ) : null}
                  </div>

                  {merchantUssdWithAmount && (
                    <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between gap-2 min-w-0">
                      <span className="truncate min-w-0">Base: <span className="select-all text-slate-700 dark:text-slate-300 font-semibold">{merchantUssdBase}</span></span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(merchantUssdBase, "merchant_base", "Base merchant code")}
                        className="text-slate-600 dark:text-slate-400 hover:text-emerald-600 text-[11px] shrink-0 cursor-pointer font-semibold underline"
                      >
                        {copiedKey === "merchant_base" ? "Copied" : "Copy"}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(merchantUssdPrimary, "merchant", "USSD code")}
                    className="flex-1 min-h-[38px] min-w-[110px] py-1.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200/80 dark:border-slate-700"
                  >
                    {copiedKey === "merchant" ? <Check className="h-4 w-4 text-emerald-600 shrink-0" /> : <Copy className="h-4 w-4 shrink-0" />}
                    <span>{copiedKey === "merchant" ? "Copied" : "Copy USSD"}</span>
                  </button>
                  <a
                    href={`tel:${encodeURIComponent(merchantUssdPrimary)}`}
                    className="min-h-[38px] min-w-[80px] py-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs"
                  >
                    <Smartphone className="h-4 w-4 shrink-0" />
                    <span>Dial</span>
                  </a>
                </div>
              </div>
            )}

            {/* 2. Pay on MTN Phone Number */}
            {cleanNum && (
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-3 w-full min-w-0 shadow-2xs">
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 shrink-0">
                      <PhoneCall className="h-4 w-4 text-yellow-500 shrink-0" /> MTN Phone
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(cleanNum, "phone_raw", "Phone number")}
                      className="font-mono text-slate-700 dark:text-slate-300 hover:text-emerald-600 cursor-pointer text-xs font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded shrink-0"
                      title="Click to copy phone number"
                    >
                      {copiedKey === "phone_raw" ? "Copied" : cleanNum}
                    </button>
                  </div>

                  {/* Primary USSD String Block */}
                  <div className="font-mono text-xs text-slate-900 dark:text-slate-100 bg-slate-100/80 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 min-w-0">
                    <span className="font-bold select-all break-all overflow-wrap-anywhere min-w-0 flex-1">
                      {p2pUssdPrimary}
                    </span>
                    {formattedAmount ? (
                      <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 shrink-0 border border-emerald-200 dark:border-emerald-800">
                        {formattedAmount.toLocaleString()} RWF
                      </span>
                    ) : null}
                  </div>

                  {p2pUssdWithAmount && (
                    <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between gap-2 min-w-0">
                      <span className="truncate min-w-0">Base: <span className="select-all text-slate-700 dark:text-slate-300 font-semibold">{p2pUssdBase}</span></span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(p2pUssdBase, "p2p_base", "Base phone code")}
                        className="text-slate-600 dark:text-slate-400 hover:text-emerald-600 text-[11px] shrink-0 cursor-pointer font-semibold underline"
                      >
                        {copiedKey === "p2p_base" ? "Copied" : "Copy"}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(p2pUssdPrimary, "p2p", "USSD code")}
                    className="flex-1 min-h-[38px] min-w-[110px] py-1.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200/80 dark:border-slate-700"
                  >
                    {copiedKey === "p2p" ? <Check className="h-4 w-4 text-emerald-600 shrink-0" /> : <Copy className="h-4 w-4 shrink-0" />}
                    <span>{copiedKey === "p2p" ? "Copied" : "Copy USSD"}</span>
                  </button>
                  <a
                    href={`tel:${encodeURIComponent(p2pUssdPrimary)}`}
                    className="min-h-[38px] min-w-[80px] py-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs"
                  >
                    <Smartphone className="h-4 w-4 shrink-0" />
                    <span>Dial</span>
                  </a>
                </div>
              </div>
            )}

            {/* 3. Pay on Airtel Money Phone Number */}
            {cleanAirtel && (
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-3 w-full min-w-0 shadow-2xs">
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 shrink-0">
                      <PhoneCall className="h-4 w-4 text-rose-500 shrink-0" /> Airtel Money
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(cleanAirtel, "airtel_raw", "Airtel number")}
                      className="font-mono text-slate-700 dark:text-slate-300 hover:text-emerald-600 cursor-pointer text-xs font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded shrink-0"
                      title="Copy Airtel number"
                    >
                      {copiedKey === "airtel_raw" ? "Copied" : cleanAirtel}
                    </button>
                  </div>

                  {/* Primary USSD String Block */}
                  <div className="font-mono text-xs text-slate-900 dark:text-slate-100 bg-slate-100/80 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 min-w-0">
                    <span className="font-bold select-all break-all overflow-wrap-anywhere min-w-0 flex-1">
                      {airtelUssdPrimary}
                    </span>
                    {formattedAmount ? (
                      <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 shrink-0 border border-emerald-200 dark:border-emerald-800">
                        {formattedAmount.toLocaleString()} RWF
                      </span>
                    ) : null}
                  </div>

                  {airtelUssdWithAmount && (
                    <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between gap-2 min-w-0">
                      <span className="truncate min-w-0">Base: <span className="select-all text-slate-700 dark:text-slate-300 font-semibold">{airtelUssdBase}</span></span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(airtelUssdBase, "airtel_base", "Base Airtel code")}
                        className="text-slate-600 dark:text-slate-400 hover:text-emerald-600 text-[11px] shrink-0 cursor-pointer font-semibold underline"
                      >
                        {copiedKey === "airtel_base" ? "Copied" : "Copy"}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(airtelUssdPrimary, "airtel", "USSD code")}
                    className="flex-1 min-h-[38px] min-w-[110px] py-1.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200/80 dark:border-slate-700"
                  >
                    {copiedKey === "airtel" ? <Check className="h-4 w-4 text-emerald-600 shrink-0" /> : <Copy className="h-4 w-4 shrink-0" />}
                    <span>{copiedKey === "airtel" ? "Copied" : "Copy USSD"}</span>
                  </button>
                  <a
                    href={`tel:${encodeURIComponent(airtelUssdPrimary)}`}
                    className="min-h-[38px] min-w-[80px] py-1.5 px-3.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs"
                  >
                    <Smartphone className="h-4 w-4 shrink-0" />
                    <span>Dial</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800 leading-relaxed">
            Dial the USSD string directly on your mobile device and authorize the transaction with your secret PIN.
          </p>
        </div>
    </div>
  );
};
