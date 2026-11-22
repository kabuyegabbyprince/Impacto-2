import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

interface RealtimeTaskCountdownProps {
  deadline: string;
  isCompleted?: boolean;
  compact?: boolean;
}

export const RealtimeTaskCountdown: React.FC<RealtimeTaskCountdownProps> = ({
  deadline,
  isCompleted = false,
  compact = false
}) => {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState<{
    totalMs: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPastDue: boolean;
  }>({
    totalMs: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPastDue: false
  });

  useEffect(() => {
    const calculateTime = () => {
      if (!deadline) return;
      const targetTime = new Date(deadline).getTime();
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        const overdueMs = Math.abs(diff);
        const days = Math.floor(overdueMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((overdueMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((overdueMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((overdueMs % (1000 * 60)) / 1000);

        setTimeLeft({
          totalMs: diff,
          days,
          hours,
          minutes,
          seconds,
          isPastDue: true
        });
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setTimeLeft({
          totalMs: diff,
          days,
          hours,
          minutes,
          seconds,
          isPastDue: false
        });
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  if (isCompleted) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/50 break-words">
        <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
        <span>{t("task_countdown.completed", "Task Completed")}</span>
      </span>
    );
  }

  const { days, hours, minutes, seconds, isPastDue } = timeLeft;
  const pad = (n: number) => String(n).padStart(2, "0");
  const dUnit = t("task_countdown.day_short", "d");
  const hUnit = t("task_countdown.hour_short", "h");
  const mUnit = t("task_countdown.min_short", "m");

  if (isPastDue) {
    const overdueLabel = days > 0 
      ? t("task_countdown.overdue_days", "Overdue by {{days}}{{d}} {{hours}}{{h}} {{minutes}}{{m}}", { days, hours, minutes, d: dUnit, h: hUnit, m: mUnit })
      : t("task_countdown.overdue_time", "Overdue by {{time}}", { time: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` });

    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-1 rounded-md border border-rose-200 dark:border-rose-900 shadow-3xs animate-pulse break-words">
        <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
        <span className="font-mono">{overdueLabel}</span>
      </span>
    );
  }

  // Not past due:
  const isUrgent = days === 0 && hours < 24;
  const isCritical = days === 0 && hours < 3;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 font-mono text-[11px] font-semibold ${
        isCritical 
          ? "text-rose-600 dark:text-rose-400" 
          : isUrgent 
          ? "text-amber-600 dark:text-amber-400" 
          : "text-slate-600 dark:text-slate-300"
      }`}>
        <Clock className="h-3 w-3 shrink-0" />
        {days > 0 ? `${days}${dUnit} ${hours}${hUnit} ${minutes}${mUnit}` : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`}
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-mono text-[11px] font-bold ${
      isCritical
        ? "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800"
        : isUrgent
        ? "bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800"
        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
    }`}>
      <Clock className={`h-3.5 w-3.5 shrink-0 ${
        isCritical ? "text-rose-600 animate-spin" : isUrgent ? "text-amber-600" : "text-emerald-600"
      }`} />
      <span>
        {days > 0 && <span className="mr-1">{days}{dUnit}</span>}
        <span>{pad(hours)}:{pad(minutes)}:{pad(seconds)}</span>
        <span className="text-[10px] font-sans font-normal opacity-75 ml-1">{t("task_countdown.left", "left")}</span>
      </span>
    </div>
  );
};
