import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area
} from "recharts";
import {
  Calendar,
  CreditCard,
  Crown,
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  TrendingUp,
  FileText,
  ChevronRight,
  ExternalLink,
  Coins,
  Sparkles,
  Smartphone
} from "lucide-react";
import { Organization, SubscriptionPayment } from "../types";
import { useOrgSubscriptionPayments } from "../hooks/useImpactoData";
import { 
  getOrgSubscriptionLifecycle, 
  SUBSCRIPTION_TIERS, 
  ADDON_PACKAGES,
  AddOnPackageId 
} from "../lib/subscriptionMatrix";
import { useCurrencyStore } from "../store/currencyStore";
import { Badge, Button, Card, Modal } from "./ui";

interface SubscriptionPaymentDashboardProps {
  org: Organization;
  onOpenRenewModal: () => void;
  onOpenAddonModal: (pkgId?: AddOnPackageId) => void;
}

export const SubscriptionPaymentDashboard: React.FC<SubscriptionPaymentDashboardProps> = ({
  org,
  onOpenRenewModal,
  onOpenAddonModal,
}) => {
  const { t } = useTranslation();
  const { data: payments = [], isLoading } = useOrgSubscriptionPayments(org?.id);
  const { formatAmount, convertToRWF } = useCurrencyStore();
  const [chartCurrency, setChartCurrency] = useState<"RWF" | "USD">("RWF");
  const [chartViewType, setChartViewType] = useState<"bar" | "cumulative">("bar");
  const [selectedPaymentDetail, setSelectedPaymentDetail] = useState<SubscriptionPayment | null>(null);

  const lifecycle = getOrgSubscriptionLifecycle(org);
  const usdRate = 1350;

  // Compute financial KPIs
  const stats = useMemo(() => {
    let totalSpentUsd = 0;
    let totalSpentLocal = 0;
    let approvedCount = 0;
    let pendingCount = 0;
    let pendingLocal = 0;
    let packageCount = 0;

    payments.forEach((p) => {
      const amountUsd = p.amount_usd || (p.amount_local ? p.amount_local / usdRate : 25);
      const amountLocal = p.amount_local || amountUsd * usdRate;

      if (p.status === "approved") {
        totalSpentUsd += amountUsd;
        totalSpentLocal += amountLocal;
        approvedCount++;
        const isPkg = p.package_id || p.item_type === "package" || p.plan?.toLowerCase()?.includes("package");
        if (isPkg) packageCount++;
      } else if (p.status === "awaiting_approval") {
        pendingCount++;
        pendingLocal += amountLocal;
      }
    });

    // Determine upcoming renewal date
    let renewalDate: Date;
    if (org.subscription_ends_at) {
      renewalDate = new Date(org.subscription_ends_at);
    } else {
      const created = org.created_at ? new Date(org.created_at) : new Date();
      renewalDate = new Date(created.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    const now = Date.now();
    const msRemaining = renewalDate.getTime() - now;
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

    // Next renewal estimated fee
    const currentTier = lifecycle.tier || "growth";
    const tierPrice = SUBSCRIPTION_TIERS[currentTier]?.priceUsd || 25;
    const activePackagesCount = lifecycle.activePackages.length;
    const packageAddonTotal = activePackagesCount * 4;
    const nextInvoiceUsd = tierPrice + packageAddonTotal;
    const nextInvoiceLocal = nextInvoiceUsd * usdRate;

    return {
      totalSpentUsd,
      totalSpentLocal,
      approvedCount,
      pendingCount,
      pendingLocal,
      packageCount,
      renewalDate,
      daysRemaining,
      nextInvoiceUsd,
      nextInvoiceLocal,
      activePackagesCount
    };
  }, [payments, org, lifecycle, usdRate]);

  // Aggregate monthly data for Recharts visualization
  const { chartData, cumulativeData } = useMemo(() => {
    // Generate chronological monthly points
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthMap: Record<string, {
      monthKey: string;
      displayMonth: string;
      planRwf: number;
      planUsd: number;
      packageRwf: number;
      packageUsd: number;
      totalRwf: number;
      totalUsd: number;
      transactionCount: number;
      isProjected?: boolean;
    }> = {};

    // Seed the past 5 months up to current & next month
    const currentDate = new Date();
    for (let i = 4; i >= -1; i--) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const isNextMonth = i === -1;
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}${isNextMonth ? " (Proj)" : ""}`;
      
      monthMap[key] = {
        monthKey: key,
        displayMonth: label,
        planRwf: 0,
        planUsd: 0,
        packageRwf: 0,
        packageUsd: 0,
        totalRwf: 0,
        totalUsd: 0,
        transactionCount: 0,
        isProjected: isNextMonth
      };
    }

    // Populate with actual approved and awaiting payments
    payments.forEach((p) => {
      const pDate = p.created_at || p.submitted_at ? new Date(p.created_at || p.submitted_at) : new Date();
      const key = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, "0")}`;
      
      const amountUsd = p.amount_usd || (p.amount_local ? p.amount_local / usdRate : 25);
      const amountLocal = p.amount_local || amountUsd * usdRate;
      const isPkg = p.package_id || p.item_type === "package" || p.plan?.toLowerCase()?.includes("package");

      if (!monthMap[key]) {
        monthMap[key] = {
          monthKey: key,
          displayMonth: `${monthNames[pDate.getMonth()]} ${pDate.getFullYear().toString().slice(-2)}`,
          planRwf: 0,
          planUsd: 0,
          packageRwf: 0,
          packageUsd: 0,
          totalRwf: 0,
          totalUsd: 0,
          transactionCount: 0
        };
      }

      if (isPkg) {
        monthMap[key].packageRwf += amountLocal;
        monthMap[key].packageUsd += amountUsd;
      } else {
        monthMap[key].planRwf += amountLocal;
        monthMap[key].planUsd += amountUsd;
      }
      monthMap[key].totalRwf += amountLocal;
      monthMap[key].totalUsd += amountUsd;
      monthMap[key].transactionCount += 1;
    });

    // Add upcoming renewal projection point to the projected month
    const nextDate = stats.renewalDate;
    const nextKey = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;
    if (monthMap[nextKey]) {
      // Add projected renewal values if not already present
      if (monthMap[nextKey].totalRwf === 0) {
        monthMap[nextKey].planRwf = stats.nextInvoiceLocal;
        monthMap[nextKey].planUsd = stats.nextInvoiceUsd;
        monthMap[nextKey].totalRwf = stats.nextInvoiceLocal;
        monthMap[nextKey].totalUsd = stats.nextInvoiceUsd;
      }
    }

    const sortedMonths = Object.keys(monthMap).sort().map(k => monthMap[k]);

    // Build cumulative data series
    let rollingRwf = 0;
    let rollingUsd = 0;
    const cumData = sortedMonths.map((m) => {
      rollingRwf += m.totalRwf;
      rollingUsd += m.totalUsd;
      return {
        displayMonth: m.displayMonth,
        cumulativeRwf: rollingRwf,
        cumulativeUsd: rollingUsd,
        monthTotalRwf: m.totalRwf,
        monthTotalUsd: m.totalUsd,
        isProjected: m.isProjected
      };
    });

    return { chartData: sortedMonths, cumulativeData: cumData };
  }, [payments, stats, usdRate]);

  // Billing cycle completion percentage
  const cycleProgress = useMemo(() => {
    const totalCycleDays = 30;
    const daysElapsed = Math.max(0, Math.min(30, 30 - stats.daysRemaining));
    const percentage = Math.round((daysElapsed / totalCycleDays) * 100);
    return { daysElapsed, percentage };
  }, [stats.daysRemaining]);

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Lifetime Subscriptions & Packages */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-3xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>{t("Total Verified Payments", "Total Verified Payments")}</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black font-display text-slate-900 dark:text-white block tracking-tight">
              {stats.totalSpentLocal.toLocaleString()} <span className="text-xs font-mono font-bold text-emerald-600">RWF</span>
            </span>
            <span className="text-xs text-slate-500 font-medium">
              ${stats.totalSpentUsd.toFixed(2)} USD • {stats.approvedCount} verified records
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>Add-On Packages: <strong>{stats.packageCount}</strong></span>
            <span className="text-emerald-600 font-bold flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Audit Logged
            </span>
          </div>
        </div>

        {/* Card 2: Current Active License Tier */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-3xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>{t("Active Subscription Tier", "Active Subscription Tier")}</span>
            <div className="h-8 w-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center font-bold">
              <Crown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black font-display text-slate-900 dark:text-white tracking-tight uppercase">
                {lifecycle.tier || "Growth"}
              </span>
              <Badge color={lifecycle.isPaidActive ? "green" : lifecycle.isInGracePeriod ? "amber" : "blue"}>
                {lifecycle.statusLabel}
              </Badge>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Capacity: {lifecycle.memberLimit === Infinity ? "Unlimited" : `${lifecycle.memberLimit} Members`}
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Active Add-Ons:</span>
            <span className="font-bold text-purple-600 dark:text-purple-400">
              {stats.activePackagesCount} Packages (+{stats.activePackagesCount * 20} slots)
            </span>
          </div>
        </div>

        {/* Card 3: Next Renewal Countdown */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-3xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>{t("Next Renewal Target", "Next Renewal Target")}</span>
            <div className="h-8 w-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black font-display text-slate-900 dark:text-white block tracking-tight">
              {stats.daysRemaining} <span className="text-xs font-normal text-slate-500">days left</span>
            </span>
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Due: {stats.renewalDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Projected Fee:</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {stats.nextInvoiceLocal.toLocaleString()} RWF (${stats.nextInvoiceUsd})
            </span>
          </div>
        </div>

        {/* Card 4: MoMo Approval Queue Status */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-3xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>{t("MoMo Approval Queue", "MoMo Approval Queue")}</span>
            <div className="h-8 w-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center font-bold">
              <Smartphone className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black font-display text-slate-900 dark:text-white block tracking-tight">
              {stats.pendingCount}{" "}
              <span className="text-xs font-normal text-slate-500">
                {stats.pendingCount === 1 ? "pending submission" : "pending submissions"}
              </span>
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {stats.pendingLocal > 0
                ? `${stats.pendingLocal.toLocaleString()} RWF awaiting auditor stamp`
                : "All payments cleared and verified"}
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Superadmin Audit:</span>
            <span className={stats.pendingCount > 0 ? "text-amber-600 font-bold" : "text-emerald-600 font-bold"}>
              {stats.pendingCount > 0 ? "In Verification Queue" : "100% Up to Date"}
            </span>
          </div>
        </div>
      </div>

      {/* Recharts Visualizations Area */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-3xs flex flex-col gap-6">
        {/* Controls and Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              <h3 className="text-base font-black font-display text-slate-900 dark:text-white">
                {t("Subscription Payment History & Renewal Trends", "Subscription Payment History & Renewal Trends")}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Visual breakdown of SaaS subscription licenses and add-on feature packages over time with upcoming renewal projection.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            {/* Currency Toggle */}
            <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800 text-xs font-bold border border-slate-200/60 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => setChartCurrency("RWF")}
                className={`px-3 py-1 rounded-lg transition ${
                  chartCurrency === "RWF"
                    ? "bg-white dark:bg-slate-900 text-emerald-600 shadow-3xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                RWF
              </button>
              <button
                type="button"
                onClick={() => setChartCurrency("USD")}
                className={`px-3 py-1 rounded-lg transition ${
                  chartCurrency === "USD"
                    ? "bg-white dark:bg-slate-900 text-emerald-600 shadow-3xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                USD ($)
              </button>
            </div>

            {/* View Type Toggle */}
            <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800 text-xs font-bold border border-slate-200/60 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => setChartViewType("bar")}
                className={`px-3 py-1 rounded-lg transition ${
                  chartViewType === "bar"
                    ? "bg-white dark:bg-slate-900 text-emerald-600 shadow-3xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Monthly Breakdown
              </button>
              <button
                type="button"
                onClick={() => setChartViewType("cumulative")}
                className={`px-3 py-1 rounded-lg transition ${
                  chartViewType === "cumulative"
                    ? "bg-white dark:bg-slate-900 text-emerald-600 shadow-3xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Cumulative Growth
              </button>
            </div>
          </div>
        </div>

        {/* 30-Day Billing Cycle Visual Progress Banner */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-col gap-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Current 30-Day Billing Cycle ({cycleProgress.percentage}% Elapsed)
              </span>
            </div>
            <div className="flex items-center gap-4 text-slate-500 font-mono text-[11px]">
              <span>Elapsed: <strong className="text-slate-800 dark:text-slate-200">{cycleProgress.daysElapsed} days</strong></span>
              <span>Remaining: <strong className="text-emerald-600 dark:text-emerald-400">{stats.daysRemaining} days</strong></span>
              <span>Next Renewal: <strong className="text-slate-800 dark:text-slate-200">{stats.renewalDate.toLocaleDateString()}</strong></span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
            <div 
              className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${cycleProgress.percentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-0.5">
            <span>Cycle Start</span>
            <span className="text-emerald-600 font-bold">Today</span>
            <span>Renewal Target ({stats.nextInvoiceLocal.toLocaleString()} RWF)</span>
          </div>
        </div>

        {/* Recharts Chart Canvas */}
        <div className="w-full h-72 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            {chartViewType === "bar" ? (
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.2)" />
                <XAxis 
                  dataKey="displayMonth" 
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={{ stroke: "rgba(148, 163, 184, 0.3)" }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={{ stroke: "rgba(148, 163, 184, 0.3)" }}
                  tickLine={false}
                  tickFormatter={(val) => chartCurrency === "RWF" ? `${(val / 1000).toFixed(0)}k` : `$${val}`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs font-sans border border-slate-700 min-w-48">
                          <div className="flex items-center justify-between font-bold border-b border-slate-700 pb-1.5 mb-2">
                            <span>{label}</span>
                            {data.isProjected && (
                              <span className="text-[10px] font-mono text-amber-400 bg-amber-400/20 px-1.5 py-0.5 rounded">
                                Upcoming Renewal
                              </span>
                            )}
                          </div>
                          <div className="space-y-1 font-mono">
                            <div className="flex justify-between items-center text-emerald-400">
                              <span>Subscription Plans:</span>
                              <span className="font-bold">
                                {chartCurrency === "RWF"
                                  ? `${data.planRwf.toLocaleString()} RWF`
                                  : `$${data.planUsd.toFixed(2)}`}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-purple-400">
                              <span>Add-On Packages:</span>
                              <span className="font-bold">
                                {chartCurrency === "RWF"
                                  ? `${data.packageRwf.toLocaleString()} RWF`
                                  : `$${data.packageUsd.toFixed(2)}`}
                              </span>
                            </div>
                            <div className="flex justify-between items-center border-t border-slate-700 pt-1 font-bold text-white">
                              <span>Monthly Total:</span>
                              <span>
                                {chartCurrency === "RWF"
                                  ? `${data.totalRwf.toLocaleString()} RWF`
                                  : `$${data.totalUsd.toFixed(2)}`}
                              </span>
                            </div>
                          </div>
                          {data.transactionCount > 0 && (
                            <div className="mt-2 text-[10px] text-slate-400">
                              {data.transactionCount} verified transaction{data.transactionCount > 1 ? "s" : ""}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  verticalAlign="top" 
                  align="right"
                  wrapperStyle={{ paddingBottom: "10px", fontSize: "11px", fontWeight: "bold" }} 
                />
                <Bar 
                  dataKey={chartCurrency === "RWF" ? "planRwf" : "planUsd"} 
                  name="Plan Subscription" 
                  fill="#10b981" 
                  stackId="a" 
                  radius={[0, 0, 4, 4]} 
                />
                <Bar 
                  dataKey={chartCurrency === "RWF" ? "packageRwf" : "packageUsd"} 
                  name="Add-On Packages ($4/mo)" 
                  fill="#8b5cf6" 
                  stackId="a" 
                  radius={[4, 4, 0, 0]} 
                />
              </BarChart>
            ) : (
              <AreaChart
                data={cumulativeData}
                margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="cumGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.2)" />
                <XAxis 
                  dataKey="displayMonth" 
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={{ stroke: "rgba(148, 163, 184, 0.3)" }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={{ stroke: "rgba(148, 163, 184, 0.3)" }}
                  tickLine={false}
                  tickFormatter={(val) => chartCurrency === "RWF" ? `${(val / 1000).toFixed(0)}k` : `$${val}`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs font-sans border border-slate-700 min-w-44">
                          <div className="font-bold border-b border-slate-700 pb-1 mb-1.5">{label}</div>
                          <div className="text-emerald-400 font-mono">
                            <span className="block text-[10px] text-slate-400">Cumulative Investment:</span>
                            <span className="font-bold text-sm">
                              {chartCurrency === "RWF"
                                ? `${data.cumulativeRwf.toLocaleString()} RWF`
                                : `$${data.cumulativeUsd.toFixed(2)}`}
                            </span>
                          </div>
                          <div className="text-slate-300 font-mono mt-1 text-[11px]">
                            Monthly Amount: {chartCurrency === "RWF" ? `${data.monthTotalRwf.toLocaleString()} RWF` : `$${data.monthTotalUsd.toFixed(2)}`}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey={chartCurrency === "RWF" ? "cumulativeRwf" : "cumulativeUsd"} 
                  name="Cumulative Investment" 
                  stroke="#10b981" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#cumGradient)" 
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Legend / Quick Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-4 text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-md bg-emerald-500 inline-block" />
              SaaS Plan Subscriptions (Growth $25 / Pro $40)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-md bg-purple-500 inline-block" />
              Add-On Feature Packages ($4.00/mo)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenAddonModal()}
              className="text-xs font-bold h-8.5 rounded-xl border-slate-200"
            >
              <Package className="h-3.5 w-3.5 mr-1" />
              Browse Add-Ons ($4/mo)
            </Button>
            <Button
              size="sm"
              onClick={onOpenRenewModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8.5 rounded-xl shadow-xs"
            >
              <Crown className="h-3.5 w-3.5 mr-1" />
              Extend / Renew Subscription
            </Button>
          </div>
        </div>
      </div>

      {/* Verified Transactions & Invoices Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-3xs flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-black font-display text-slate-900 dark:text-white">
              {t("Organization Payment Ledger & MoMo Records", "Organization Payment Ledger & MoMo Records")}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time synchronization with Supabase and platform audit logs.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400">
            {payments.length} total entries
          </span>
        </div>

        {payments.length > 0 ? (
          <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-mono text-[10px] uppercase border-b border-slate-200/80 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Item / Category</th>
                  <th className="px-4 py-3">Gateway & MoMo Phone</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {payments.map((p) => {
                  const pDate = p.created_at || p.submitted_at ? new Date(p.created_at || p.submitted_at) : new Date();
                  const isPkg = p.package_id || p.item_type === "package" || p.plan?.toLowerCase()?.includes("package");
                  const itemTitle = p.plan || p.plan_details || (isPkg ? "Add-On Package" : "Plan Subscription");
                  const senderPhone = p.phone || p.phone_number || "N/A";
                  const txnRef = p.reference || p.transaction_reference || "N/A";
                  const amountLocal = p.amount_local || (p.amount_usd ? p.amount_usd * usdRate : 33750);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {pDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        <div className="flex items-center gap-1.5">
                          {isPkg ? (
                            <span className="p-1 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-600">
                              <Package className="h-3.5 w-3.5" />
                            </span>
                          ) : (
                            <span className="p-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
                              <Crown className="h-3.5 w-3.5" />
                            </span>
                          )}
                          <span>{itemTitle}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span className={`h-1.5 w-1.5 rounded-full ${p.method === "airtel" ? "bg-red-500" : "bg-amber-500"}`} />
                          <span>{senderPhone}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300 font-bold whitespace-nowrap">
                        <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                          {txnRef}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {amountLocal.toLocaleString()} RWF
                        {p.amount_usd && <span className="text-[10px] text-slate-400 ml-1">(${p.amount_usd})</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {p.status === "approved" ? (
                          <Badge color="green">APPROVED</Badge>
                        ) : p.status === "awaiting_approval" ? (
                          <Badge color="yellow">AWAITING REVIEW</Badge>
                        ) : (
                          <Badge color="red">REJECTED</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedPaymentDetail(p)}
                          className="h-7 text-[11px] px-2.5 rounded-lg"
                        >
                          View Receipt
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-2">
            <Coins className="h-8 w-8 text-slate-400" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">No payment records found yet</span>
            <p className="text-[11px] text-slate-500 max-w-sm">
              Use MTN MoMo or Airtel Money to activate your subscription plan or add-on feature packages.
            </p>
          </div>
        )}
      </div>

      {/* Payment Receipt / Audit Details Modal */}
      {selectedPaymentDetail && (
        <Modal
          open={!!selectedPaymentDetail}
          onClose={() => setSelectedPaymentDetail(null)}
          title="Mobile Money Payment Evidence & Audit Log"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5 font-medium">
              <div className="flex justify-between">
                <span className="text-slate-400">Payment ID:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedPaymentDetail.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Purchased Item:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedPaymentDetail.plan || selectedPaymentDetail.plan_details || "Subscription"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Transaction Reference:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {selectedPaymentDetail.reference || selectedPaymentDetail.transaction_reference || "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Sender MoMo Number:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {selectedPaymentDetail.phone || selectedPaymentDetail.phone_number || "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Transferred:</span>
                <span className="font-mono font-bold text-emerald-600 text-sm">
                  {(selectedPaymentDetail.amount_local || (selectedPaymentDetail.amount_usd ? selectedPaymentDetail.amount_usd * usdRate : 33750)).toLocaleString()} RWF
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <Badge color={selectedPaymentDetail.status === "approved" ? "green" : selectedPaymentDetail.status === "awaiting_approval" ? "yellow" : "red"}>
                  {selectedPaymentDetail.status?.toUpperCase()}
                </Badge>
              </div>
              {selectedPaymentDetail.audited_by_name && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Verified By:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{selectedPaymentDetail.audited_by_name}</span>
                </div>
              )}
              {selectedPaymentDetail.audit_notes && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex flex-col gap-1">
                  <span className="text-slate-400">Auditor Notes:</span>
                  <p className="italic text-slate-600 dark:text-slate-300">{selectedPaymentDetail.audit_notes}</p>
                </div>
              )}
              {selectedPaymentDetail.proof_url && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex flex-col gap-1">
                  <span className="text-slate-400">MoMo SMS Receipt Copy / Proof:</span>
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300 break-all">
                    {selectedPaymentDetail.proof_url}
                  </div>
                </div>
              )}
            </div>

            <Button
              className="w-full bg-slate-900 dark:bg-emerald-600 text-white font-bold h-10 rounded-xl"
              onClick={() => setSelectedPaymentDetail(null)}
            >
              Close Receipt
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
