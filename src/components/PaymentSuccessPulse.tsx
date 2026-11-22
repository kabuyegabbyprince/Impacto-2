import React from "react";
import { useTranslation } from "react-i18next";
import { motion, useReducedMotion } from "motion/react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "./ui";

export interface PaymentSuccessPulseProps {
  title?: string;
  message: string;
  reference?: string;
  amountRwf?: number;
  doneLabel?: string;
  onDone?: () => void;
  className?: string;
}

export const PaymentSuccessPulse: React.FC<PaymentSuccessPulseProps> = ({
  title,
  message,
  reference,
  amountRwf,
  doneLabel,
  onDone,
  className = ""
}) => {
  const { t, i18n } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const resolvedTitle = title || t("payments.proof_submitted_title", "Payment Proof Submitted");

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.96, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
      className={`relative overflow-hidden rounded-2xl border border-emerald-200 dark:border-emerald-800/70 ring-2 ring-emerald-500/20 bg-emerald-50/90 dark:bg-emerald-950/35 p-6 text-center flex flex-col items-center gap-3.5 ${className}`}
    >
      {/* Subtle single radial screen pulse (compositor-only transform + opacity) */}
      {!prefersReducedMotion && (
        <motion.div
          aria-hidden="true"
          initial={{ scale: 0.4, opacity: 0.45 }}
          animate={{ scale: 2.6, opacity: 0 }}
          transition={{ duration: 1.15, ease: "easeOut" }}
          className="pointer-events-none absolute top-10 left-1/2 -translate-x-1/2 h-24 w-24 rounded-full bg-emerald-400/30 dark:bg-emerald-500/20"
        />
      )}

      {/* Animated SVG Checkmark Morph Badge */}
      <div className="relative z-10 flex items-center justify-center">
        {!prefersReducedMotion && (
          <motion.span
            aria-hidden="true"
            initial={{ scale: 0.85, opacity: 0.55 }}
            animate={{ scale: 1.45, opacity: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="absolute inset-0 rounded-full border-2 border-emerald-500/60"
          />
        )}
        <motion.div
          initial={prefersReducedMotion ? { scale: 1 } : { scale: 0.65, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
          className="h-14 w-14 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm"
        >
          {prefersReducedMotion ? (
            <CheckCircle2 className="h-7 w-7" />
          ) : (
            <svg
              viewBox="0 0 36 36"
              className="h-8 w-8"
              fill="none"
              aria-hidden="true"
            >
              <motion.circle
                cx="18"
                cy="18"
                r="15"
                stroke="currentColor"
                strokeOpacity="0.35"
                strokeWidth="2"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              />
              <motion.path
                d="M11 18.5L15.8 23.2L25.5 13.5"
                stroke="currentColor"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.35, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
              />
            </svg>
          )}
        </motion.div>
      </div>

      <div className="relative z-10 space-y-1.5 max-w-md min-w-0">
        <h4 className="font-display font-bold text-base text-emerald-950 dark:text-emerald-100 break-words">
          {resolvedTitle}
        </h4>
        <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed break-words">
          {message}
        </p>
      </div>

      {(reference || (amountRwf !== undefined && amountRwf > 0)) && (
        <div className="relative z-10 flex flex-wrap items-center justify-center gap-2 pt-1 max-w-full">
          {amountRwf !== undefined && amountRwf > 0 && (
            <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 font-mono text-xs font-bold text-slate-900 dark:text-white tabular-nums">
              {Math.round(amountRwf).toLocaleString(i18n.language)} RWF
            </span>
          )}
          {reference && (
            <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 font-mono text-xs font-semibold text-emerald-800 dark:text-emerald-300 break-all">
              {t("payments.ref_prefix", "Ref:")} {reference}
            </span>
          )}
        </div>
      )}

      {onDone && doneLabel && (
        <div className="relative z-10 pt-2 w-full max-w-xs">
          <Button
            type="button"
            onClick={onDone}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2 rounded-xl"
          >
            {doneLabel}
          </Button>
        </div>
      )}
    </motion.div>
  );
};
