import React, { useState, useRef, useId } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle2, AlertTriangle, Clock, AlertCircle, Coins } from "lucide-react";
import { MemberFee } from "../types";
import { getFeeBalances } from "../lib/feeUtils";

export type ResolvedFeeStatusKey =
  | "fully_paid"
  | "partially_paid"
  | "overdue"
  | "pending_confirmation"
  | "pending";

export interface FeeStatusBadgeProps {
  fee: MemberFee;
  isOverdue: boolean;
  overdueDays?: number;
  formattedDueDate?: string;
}

export function resolveFeeStatusKey(fee: MemberFee, isOverdue: boolean): ResolvedFeeStatusKey {
  const bal = getFeeBalances(fee);
  if (fee.status === "paid" || bal.isFullyPaid) {
    return "fully_paid";
  }
  if (fee.status === "pending_confirmation") {
    return "pending_confirmation";
  }
  if (fee.status === "partially_paid" || bal.isPartiallyPaid) {
    return "partially_paid";
  }
  if (isOverdue) {
    return "overdue";
  }
  return "pending";
}

export const FeeStatusBadge: React.FC<FeeStatusBadgeProps> = ({
  fee,
  isOverdue,
  overdueDays = 0,
  formattedDueDate,
}) => {
  const { t } = useTranslation();
  const bal = getFeeBalances(fee);
  const statusKey = resolveFeeStatusKey(fee, isOverdue);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const tooltipId = useId();
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; placement: "top" | "bottom" } | null>(null);

  const showTooltip = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceAbove = rect.top;
    const placement = spaceAbove > 140 ? "top" : "bottom";
    const clampedLeft = Math.min(
      Math.max(rect.left + rect.width / 2, 130),
      window.innerWidth - 130
    );
    setTooltipPos({
      top: placement === "top" ? rect.top - 8 : rect.bottom + 8,
      left: clampedLeft,
      placement,
    });
  };

  const hideTooltip = () => {
    setTooltipPos(null);
  };

  const chipConfig: Record<
    ResolvedFeeStatusKey,
    {
      label: string;
      chipClass: string;
      icon: React.ReactNode;
      titlePrefix: string;
    }
  > = {
    fully_paid: {
      label: t("payments.fee_fully_paid"),
      chipClass:
        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/70",
      icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
      titlePrefix: t("payments.fee_fully_paid"),
    },
    partially_paid: {
      label: `${t("payments.fee_partially_paid")} (${bal.percentPaid}%)`,
      chipClass:
        "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/70",
      icon: <Coins className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />,
      titlePrefix: `${t("payments.fee_partially_paid")} (${bal.percentPaid}%)`,
    },
    overdue: {
      label: overdueDays > 0 ? `${t("payments.fee_overdue")} (${overdueDays}d)` : t("payments.fee_overdue"),
      chipClass:
        "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/70",
      icon: <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0" />,
      titlePrefix: t("payments.fee_overdue"),
    },
    pending_confirmation: {
      label: t("payments.fee_pending_review"),
      chipClass:
        "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/70",
      icon: <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />,
      titlePrefix: t("payments.fee_pending_review"),
    },
    pending: {
      label: t("payments.fee_unpaid"),
      chipClass:
        "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700",
      icon: <AlertCircle className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 shrink-0" />,
      titlePrefix: t("payments.fee_unpaid"),
    },
  };

  const cfg = chipConfig[statusKey];
  const nativeTitle = `${cfg.titlePrefix} — ${t("payments.remaining_balance")}: ${bal.remainingBalance.toLocaleString()} RWF`;

  return (
    <div
      ref={triggerRef}
      tabIndex={0}
      aria-describedby={tooltipPos ? tooltipId : undefined}
      title={nativeTitle}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      className="inline-flex flex-wrap items-center gap-1.5 cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-md max-w-full"
    >
      <span
        data-status-badge={statusKey}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-semibold leading-tight max-w-full tabular-nums transition-colors ${cfg.chipClass}`}
      >
        {cfg.icon}
        <span className="break-words">{cfg.label}</span>
      </span>

      {(statusKey === "partially_paid" || statusKey === "pending_confirmation") && isOverdue && (
        <span
          data-status-badge="overdue"
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-semibold leading-tight tabular-nums bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/70"
        >
          <AlertTriangle className="h-3 w-3 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{t("payments.fee_overdue")}{overdueDays > 0 ? ` ${overdueDays}d` : ""}</span>
        </span>
      )}

      {tooltipPos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            id={tooltipId}
            role="tooltip"
            style={{
              position: "fixed",
              top: tooltipPos.top,
              left: tooltipPos.left,
              transform:
                tooltipPos.placement === "top"
                  ? "translate(-50%, -100%)"
                  : "translate(-50%, 0)",
              zIndex: 9999,
            }}
            className="pointer-events-none w-60 max-w-[calc(100vw-1.5rem)] rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs text-slate-100 shadow-xl"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-1.5">
              <span className="font-bold text-white break-words">{cfg.titlePrefix}</span>
              <span className="font-mono text-[10px] text-slate-400 tabular-nums shrink-0">
                {bal.percentPaid}%
              </span>
            </div>

            <div className="space-y-1 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">{t("payments.remaining_balance")}:</span>
                <span
                  className={`font-mono font-extrabold tabular-nums shrink-0 ${
                    bal.remainingBalance > 0 ? "text-rose-400" : "text-emerald-400"
                  }`}
                >
                  {bal.remainingBalance.toLocaleString()} RWF
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-slate-300">
                <span className="text-slate-400">{t("payments.installment_progress")}:</span>
                <span className="font-mono font-semibold tabular-nums text-emerald-300 shrink-0">
                  {bal.paidAmount.toLocaleString()} / {bal.totalDueAmount.toLocaleString()} RWF
                </span>
              </div>
              {fee.status === "pending_confirmation" && bal.pendingInstallmentAmount > 0 && (
                <div className="flex items-center justify-between gap-2 text-amber-300">
                  <span>{t("payments.pending")}:</span>
                  <span className="font-mono font-semibold tabular-nums shrink-0">
                    {bal.pendingInstallmentAmount.toLocaleString()} RWF
                  </span>
                </div>
              )}
              {isOverdue && !bal.isFullyPaid && (
                <div className="pt-1 mt-1 border-t border-slate-800 text-[10px] font-medium text-rose-300">
                  {t("payments.fee_overdue")} {overdueDays > 0 ? `(${overdueDays}d)` : ""}
                  {formattedDueDate ? ` · ${formattedDueDate}` : ""}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
