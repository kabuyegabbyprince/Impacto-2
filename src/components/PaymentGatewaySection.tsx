import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyRound, AlertTriangle, Copy, Check, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button, Input } from "./ui";
import { useToast } from "./Toast";
import { usePlatformSettings } from "../hooks/useImpactoData";
import { useOrgStore } from "../store/orgStore";
import {
  UssdPaymentHelper,
  getEffectivePaymentCode,
  getOrgMomoDisplayMethods,
  cleanMerchantCode,
  cleanPhoneNumber
} from "./UssdPaymentHelper";
import { PaymentSuccessPulse } from "./PaymentSuccessPulse";
import { Organization, PlatformSettings } from "../types";

export interface PaymentGatewaySuccessState {
  title?: string;
  message: string;
  reference?: string;
  amountRwf?: number;
}

export interface PaymentGatewaySectionProps {
  targetType: "platform" | "organization";
  itemName: string;
  amountRwf: number;
  amountUsd?: number;
  usdToRwfRate?: number;
  platformSettings?: PlatformSettings;
  activeOrg?: Organization | null;
  tierSelector?: React.ReactNode;
  readOnlyPreview?: boolean;
  showSenderName?: boolean;
  showReferenceInput?: boolean;
  showNoteInput?: boolean;
  phone?: string;
  onPhoneChange?: (val: string) => void;
  senderName?: string;
  onSenderNameChange?: (val: string) => void;
  reference?: string;
  onReferenceChange?: (val: string) => void;
  smsProof?: string;
  onSmsProofChange?: (val: string) => void;
  note?: string;
  onNoteChange?: (val: string) => void;
  onSubmit?: (e: React.FormEvent) => void;
  submitting?: boolean;
  submitLabel?: string;
  onBack?: () => void;
  backLabel?: string;
  onRequestAdmin?: () => Promise<void> | void;
  successState?: PaymentGatewaySuccessState | null;
  onDoneSuccess?: () => void;
  doneLabel?: string;
  formId?: string;
  hideDefaultActions?: boolean;
  smsPlaceholder?: string;
  className?: string;
}

export const PaymentGatewaySection: React.FC<PaymentGatewaySectionProps> = ({
  targetType,
  itemName,
  amountRwf,
  amountUsd,
  usdToRwfRate,
  platformSettings: propPlatformSettings,
  activeOrg: propActiveOrg,
  tierSelector,
  readOnlyPreview = false,
  showSenderName = false,
  showReferenceInput = true,
  showNoteInput = false,
  phone = "",
  onPhoneChange,
  senderName = "",
  onSenderNameChange,
  reference = "",
  onReferenceChange,
  smsProof = "",
  onSmsProofChange,
  note = "",
  onNoteChange,
  onSubmit,
  submitting = false,
  submitLabel = "Submit Payment Receipt Proof",
  onBack,
  backLabel = "Back",
  onRequestAdmin,
  successState,
  onDoneSuccess,
  doneLabel = "Done",
  formId,
  hideDefaultActions = false,
  smsPlaceholder,
  className = ""
}) => {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const { data: fetchedPlatformSettings } = usePlatformSettings();
  const { activeOrg: storeOrg, activeMember } = useOrgStore();
  const [copiedCode, setCopiedCode] = useState(false);
  const [autoSuccess, setAutoSuccess] = useState<PaymentGatewaySuccessState | null>(null);

  const effectivePlatformSettings = propPlatformSettings || fetchedPlatformSettings;
  const effectiveOrg = propActiveOrg ?? storeOrg;
  const effectiveRate = usdToRwfRate || effectivePlatformSettings?.usd_to_rwf_rate || 1400;

  const isPlatform = targetType === "platform";

  const resolvedMerchantCode = isPlatform
    ? getEffectivePaymentCode(effectivePlatformSettings, effectiveOrg, "platform")
    : cleanMerchantCode(effectiveOrg?.momo_merchant_code || "") ||
      getEffectivePaymentCode(undefined, effectiveOrg, "organization");

  const resolvedMtnNumber = isPlatform
    ? effectivePlatformSettings?.mtn_payment_number
    : effectiveOrg?.dues_mtn_number || effectiveOrg?.donation_mtn_number;

  const resolvedAirtelNumber = isPlatform
    ? effectivePlatformSettings?.airtel_payment_number
    : effectiveOrg?.dues_airtel_number || effectiveOrg?.donation_airtel_number;

  const resolvedRecipientName = isPlatform
    ? effectivePlatformSettings?.payment_name || "VIRELLIX INC"
    : effectiveOrg?.dues_account_name || effectiveOrg?.donation_account_name || effectiveOrg?.name || "Organization Treasury";

  const orgDisplayMethods = !isPlatform ? getOrgMomoDisplayMethods(effectiveOrg) : undefined;
  const allowMerchantCode = isPlatform || orgDisplayMethods!.includes("merchant_code");
  const allowMtnPhone = isPlatform || orgDisplayMethods!.includes("mtn_phone");
  const allowAirtelPhone = isPlatform || orgDisplayMethods!.includes("airtel_phone");

  const hasOrgPaymentConfigured =
    isPlatform ||
    Boolean(
      (allowMerchantCode && cleanMerchantCode(resolvedMerchantCode)) ||
        (allowMtnPhone && cleanPhoneNumber(resolvedMtnNumber)) ||
        (allowAirtelPhone && cleanPhoneNumber(resolvedAirtelNumber))
    );

  const isOrgAdminOrAccountant =
    activeMember?.role === "org_admin" ||
    activeMember?.role === "accountant" ||
    activeMember?.role === "superadmin";

  const handleCopyCode = () => {
    if (!resolvedMerchantCode) return;
    navigator.clipboard?.writeText(resolvedMerchantCode);
    setCopiedCode(true);
    addToast(`Payment code ${resolvedMerchantCode} copied to clipboard`, "success");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const resolvedSuccess = successState !== undefined ? successState : autoSuccess;

  if (resolvedSuccess) {
    return (
      <PaymentSuccessPulse
        title={resolvedSuccess.title || "Payment Proof Submitted"}
        message={resolvedSuccess.message}
        reference={resolvedSuccess.reference}
        amountRwf={resolvedSuccess.amountRwf ?? amountRwf}
        doneLabel={onDoneSuccess || successState === undefined ? doneLabel : undefined}
        onDone={() => {
          setAutoSuccess(null);
          onDoneSuccess?.();
        }}
        className={className}
      />
    );
  }

  const content = (
    <div className={`flex flex-col gap-4 text-xs text-slate-700 dark:text-slate-300 ${className}`}>
      {/* Amount & Item Summary */}
      <div className="p-3.5 sm:p-4 bg-emerald-50/80 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/60 flex flex-col gap-1.5">
        <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-800 dark:text-emerald-300 font-semibold">
          {isPlatform ? "Selected License Tier" : "Collection Gateway Target"}
        </span>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold text-sm text-slate-900 dark:text-white">{itemName}</span>
          <span className="text-base font-bold font-mono text-emerald-900 dark:text-emerald-300 tabular-nums">
            {Math.round(amountRwf).toLocaleString()} RWF
          </span>
        </div>
        {amountUsd !== undefined && amountUsd > 0 && (
          <p className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 tabular-nums">
            Local Rate: 1 USD = {effectiveRate.toLocaleString()} RWF (${amountUsd} USD)
          </p>
        )}
      </div>

      {/* Configured Payment Code Banner */}
      {hasOrgPaymentConfigured ? (
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
              <KeyRound className="h-4 w-4 text-emerald-600 shrink-0" />
              {isPlatform ? "Super Admin Payment Code" : "Organization Payment Code"}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 rounded font-semibold">
              Configured
            </span>
          </div>

          {allowMerchantCode && resolvedMerchantCode && (
            <div className="bg-white dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 min-w-0 overflow-hidden">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-mono text-slate-400 block">
                  {isPlatform ? "Platform Merchant Code" : "Org Merchant / Collection Code"}
                </span>
                <span className="font-mono text-sm font-bold text-slate-900 dark:text-white tabular-nums break-all block">
                  {resolvedMerchantCode}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition flex items-center gap-1 shrink-0 min-h-[30px] cursor-pointer"
              >
                {copiedCode ? <Check className="h-3.5 w-3.5 shrink-0" /> : <Copy className="h-3.5 w-3.5 shrink-0" />}
                <span>{copiedCode ? t("common.copied") : t("payments.copy_code")}</span>
              </button>
            </div>
          )}

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            {isPlatform
              ? "Configured from the Super Admin Dashboard. Transfer to this merchant code via USSD or mobile money before submitting proof."
              : `Configured for ${effectiveOrg?.name || "this organization"}. Use the enabled payment channel${orgDisplayMethods && orgDisplayMethods.length > 1 ? "s" : ""} below to settle dues or contributions.`}
          </p>
        </div>
      ) : (
        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl flex flex-col gap-2">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1 min-w-0">
              <span className="font-semibold text-xs text-amber-900 dark:text-amber-200 block">
                Organization Payment Code Not Configured Yet
              </span>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                This organization has not saved its MTN MoMo merchant code or enabled a receiving phone channel in MoMo Carrier Portals yet.
              </p>
              {isOrgAdminOrAccountant && (
                <Link
                  to="/dashboard/settings?tab=momo"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline pt-0.5"
                >
                  <span>Configure Organization Payment Code in Settings</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* USSD Helper */}
      {hasOrgPaymentConfigured && (
        <UssdPaymentHelper
          targetType={targetType}
          mtnNumber={resolvedMtnNumber}
          merchantCode={resolvedMerchantCode}
          airtelNumber={resolvedAirtelNumber}
          recipientName={resolvedRecipientName}
          amountRwf={amountRwf}
          itemName={itemName}
          onRequestAdmin={onRequestAdmin}
          allowedMethods={orgDisplayMethods}
          compact
        />
      )}

      {/* Optional Tier / Plan Selector */}
      {tierSelector}

      {/* Form Inputs */}
      {!readOnlyPreview && (
        <div className="flex flex-col gap-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1">
              <Input
                label={t("payments.payer_phone")}
                value={phone}
                onChange={(e) => onPhoneChange?.(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="078... / 072..."
              />
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-[10px] text-slate-400 font-mono">Prefix:</span>
                {[
                  { prefix: "078", label: "078 (MTN)", cls: "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800" },
                  { prefix: "079", label: "079 (MTN)", cls: "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800" },
                  { prefix: "072", label: "072 (Airtel)", cls: "bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800" },
                  { prefix: "073", label: "073 (Airtel)", cls: "bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800" }
                ].map((btn) => (
                  <button
                    key={btn.prefix}
                    type="button"
                    onClick={() => onPhoneChange?.(btn.prefix)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border transition cursor-pointer ${btn.cls}`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {showSenderName ? (
              <Input
                label={t("auth.full_name")}
                value={senderName}
                onChange={(e) => onSenderNameChange?.(e.target.value)}
                placeholder="e.g. Jean Pierre N."
                required
              />
            ) : showReferenceInput ? (
              <Input
                label={t("payments.tx_ref")}
                value={reference}
                onChange={(e) => onReferenceChange?.(e.target.value)}
                placeholder="e.g. TXN2468135"
              />
            ) : null}
          </div>

          {showSenderName && showReferenceInput && (
            <Input
              label={`${t("payments.tx_ref")} (${t("common.optional")})`}
              value={reference}
              onChange={(e) => onReferenceChange?.(e.target.value)}
              placeholder="e.g. TXN2468135"
            />
          )}

          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("payments.sms_proof")}
            </label>
            <textarea
              className="w-full text-xs rounded-xl border bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-600 focus:outline-none font-mono"
              value={smsProof}
              onChange={(e) => onSmsProofChange?.(e.target.value)}
              placeholder={
                smsPlaceholder ||
                "TxId: 4810294..."
              }
              rows={3}
              required
            />
          </div>

          {showNoteInput && (
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t("Note")} ({t("common.optional")})
              </label>
              <textarea
                rows={2}
                placeholder={t("Note")}
                value={note}
                onChange={(e) => onNoteChange?.(e.target.value)}
                className="w-full text-xs rounded-xl border bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>
          )}

          {!hideDefaultActions && (
            <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 dark:border-slate-800 pt-3">
              {onBack && (
                <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
                  {backLabel === "Back" ? t("common.back") : backLabel}
                </Button>
              )}
              <Button
                type="submit"
                loading={submitting}
                className={`${onBack ? "flex-1" : "w-full"} bg-emerald-600 hover:bg-emerald-700 text-white font-semibold`}
              >
                {submitLabel === "Submit Payment Receipt Proof" ? t("btn_submit_receipt") : submitLabel}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const handleFormSubmit = async (e: React.FormEvent) => {
    if (!onSubmit) return;
    const maybePromise = onSubmit(e) as unknown;
    if (
      successState === undefined &&
      maybePromise &&
      typeof (maybePromise as Promise<unknown>).then === "function"
    ) {
      try {
        await maybePromise;
        if (!e.defaultPrevented || !smsProof.trim()) return;
        setAutoSuccess({
          title: "Payment Proof Submitted",
          message: `Confirmation proof for ${itemName} has been received.`,
          reference: reference.trim() || undefined,
          amountRwf
        });
      } catch {
        // Parent handles error toast
      }
    }
  };

  if (onSubmit && !readOnlyPreview) {
    return (
      <form id={formId} onSubmit={handleFormSubmit} className="w-full">
        {content}
      </form>
    );
  }

  return content;
};
