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

  const cleanNum = cleanPhoneNumber(mtnNumber);
  const cleanMCode = cleanMerchantCode(merchantCode);
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

  const hasAnyMtnPayment = Boolean(cleanNum || cleanMCode);

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

  return (
    <div className={`space-y-3 ${className}`}>
      {hasAnyMtnPayment ? (
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              MTN USSD Payment
            </span>
            {recipientName && (
              <span>Account: <strong className="text-slate-700 dark:text-slate-300 font-medium">{recipientName}</strong></span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. Pay on MTN Phone Number */}
            {cleanNum && (
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex flex-col justify-between gap-2.5">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      Phone number
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(cleanNum, "phone_raw", "Phone number")}
                      className="font-mono text-slate-700 dark:text-slate-300 hover:text-emerald-600 cursor-pointer"
                      title="Copy phone number"
                    >
                      {copiedKey === "phone_raw" ? "Copied" : cleanNum}
                    </button>
                  </div>
                  
                  {/* Primary USSD */}
                  <div className="font-mono text-xs text-slate-900 dark:text-slate-100 bg-slate-100/80 dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 break-all select-all flex items-center justify-between gap-1">
                    <span>{p2pUssdPrimary}</span>
                    {formattedAmount ? (
                      <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                        {formattedAmount.toLocaleString()} RWF
                      </span>
                    ) : null}
                  </div>

                  {p2pUssdWithAmount && (
                    <div className="text-xs text-slate-500 font-mono mt-1 flex items-center justify-between">
                      <span className="truncate">Base code: <span className="select-all text-slate-700 dark:text-slate-300">{p2pUssdBase}</span></span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(p2pUssdBase, "p2p_base", "Base phone code")}
                        className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs ml-1 cursor-pointer"
                      >
                        {copiedKey === "p2p_base" ? "Copied" : "Copy"}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(p2pUssdPrimary, "p2p", "USSD code")}
                    className="flex-1 py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    {copiedKey === "p2p" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedKey === "p2p" ? "Copied" : "Copy code"}</span>
                  </button>
                  <a
                    href={`tel:${encodeURIComponent(p2pUssdPrimary)}`}
                    className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    <span>Dial</span>
                  </a>
                </div>
              </div>
            )}

            {/* 2. Pay to MoMo Pay Merchant Code */}
            {cleanMCode && (
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex flex-col justify-between gap-2.5">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      Merchant code
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(cleanMCode, "code_raw", "Merchant code")}
                      className="font-mono text-slate-700 dark:text-slate-300 hover:text-emerald-600 cursor-pointer"
                      title="Copy merchant code"
                    >
                      {copiedKey === "code_raw" ? "Copied" : cleanMCode}
                    </button>
                  </div>

                  {/* Primary USSD */}
                  <div className="font-mono text-xs text-slate-900 dark:text-slate-100 bg-slate-100/80 dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 break-all select-all flex items-center justify-between gap-1">
                    <span>{merchantUssdPrimary}</span>
                    {formattedAmount ? (
                      <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                        {formattedAmount.toLocaleString()} RWF
                      </span>
                    ) : null}
                  </div>

                  {merchantUssdWithAmount && (
                    <div className="text-xs text-slate-500 font-mono mt-1 flex items-center justify-between">
                      <span className="truncate">Base code: <span className="select-all text-slate-700 dark:text-slate-300">{merchantUssdBase}</span></span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(merchantUssdBase, "merchant_base", "Base merchant code")}
                        className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs ml-1 cursor-pointer"
                      >
                        {copiedKey === "merchant_base" ? "Copied" : "Copy"}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(merchantUssdPrimary, "merchant", "USSD code")}
                    className="flex-1 py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    {copiedKey === "merchant" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedKey === "merchant" ? "Copied" : "Copy code"}</span>
                  </button>
                  <a
                    href={`tel:${encodeURIComponent(merchantUssdPrimary)}`}
                    className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    <span>Dial</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800">
            Dial from an MTN phone and approve the payment with your PIN.
          </p>
        </div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 space-y-2 text-xs">
          <p className="font-semibold text-slate-900 dark:text-slate-100">Payment details not yet configured</p>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
            This organization has not set up mobile money payment numbers yet.
          </p>
          <div className="pt-1">
            <button
              type="button"
              onClick={handleAdminRequestClick}
              disabled={isRequestingAdmin || adminRequestSent}
              className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium rounded text-xs transition cursor-pointer"
            >
              {adminRequestSent ? "Notification sent" : "Notify administrator"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
