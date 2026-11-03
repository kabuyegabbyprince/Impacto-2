import React, { useState } from "react";
import {
  ChevronDown,
  CheckCircle2,
  Users,
  HardDrive,
  ShieldCheck,
  Crown,
  Sparkles,
  Zap,
  Award,
  Layers,
  FileSpreadsheet,
  QrCode,
  FileText,
  Clock,
  Store,
  Lock,
  Smartphone
} from "lucide-react";

export interface PlanDetailsDisclosureProps {
  defaultOpen?: boolean;
  className?: string;
}

export const PlanDetailsDisclosure: React.FC<PlanDetailsDisclosureProps> = ({
  defaultOpen = false,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [activeTab, setActiveTab] = useState<"all" | "free" | "growth" | "pro">("all");

  return (
    <div className={`w-full rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-3xs overflow-hidden transition-all ${className}`}>
      {/* Accordion Header / Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Included Package Features & Details Breakdown
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
              Click to view all modules, storage quotas, and capabilities in each tier.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium hidden sm:inline">
            {isOpen ? "Collapse Details" : "Expand Details"}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-slate-500 transition-transform duration-300 ${
              isOpen ? "rotate-180 text-emerald-600" : ""
            }`}
          />
        </div>
      </button>

      {/* Expanded Content Section */}
      {isOpen && (
        <div className="p-4 sm:p-5 border-t border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 animate-in fade-in duration-200">
          {/* Quick Filter Pill Buttons */}
          <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                activeTab === "all"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-3xs"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100"
              }`}
            >
              All 3 Tiers Side-by-Side
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("free")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                activeTab === "free"
                  ? "bg-slate-700 text-white shadow-3xs"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100"
              }`}
            >
              Free Plan ($0)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("growth")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                activeTab === "growth"
                  ? "bg-emerald-600 text-white shadow-3xs"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100"
              }`}
            >
              Growth Plan ($10/mo)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("pro")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                activeTab === "pro"
                  ? "bg-amber-600 text-white shadow-3xs"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100"
              }`}
            >
              Pro Plan ($25/mo)
            </button>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 1. FREE PLAN SECTION */}
            {(activeTab === "all" || activeTab === "free") && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col justify-between shadow-3xs">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-3">
                    <div>
                      <h5 className="text-base font-bold text-slate-900 dark:text-white">
                        Free Plan
                      </h5>
                    </div>
                    <span className="text-sm font-extrabold text-slate-700 dark:text-slate-300 font-mono">
                      $0 <span className="text-[10px] font-normal text-slate-400">/ forever</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300 mb-3 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg font-medium">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-slate-500" /> Up to 30 members
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <HardDrive className="h-3.5 w-3.5 text-slate-500" /> 100 MB storage
                    </span>
                  </div>

                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2 font-mono">
                    Included Features:
                  </span>
                  <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>Member Directory with role assignment (Admin, Member, Accountant)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>Announcements news feed & broadcast communication</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>Standard community chat channels for internal coordination</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>Strategic Goals Tracker (view-only dashboard overview)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>Event listings & basic member RSVPs</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>Member Dues & fee invoicing schedules</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>MoMo & bank receipt upload for accountant verification</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Safe Read-Only Data Preservation (zero record deletion upon trial end)</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 font-medium">
                  Ideal for grassroots community groups and cooperatives testing basic coordination.
                </div>
              </div>
            )}

            {/* 2. GROWTH PLAN SECTION */}
            {(activeTab === "all" || activeTab === "growth") && (
              <div className="rounded-xl border-2 border-emerald-500/80 bg-white dark:bg-slate-900 p-4 flex flex-col justify-between shadow-3xs">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-3">
                    <div>
                      <h5 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        Growth Plan
                      </h5>
                    </div>
                    <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                      $10 <span className="text-[10px] font-normal text-slate-400">/ month</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300 mb-3 bg-emerald-50/50 dark:bg-emerald-950/30 p-2.5 rounded-lg font-medium border border-emerald-100 dark:border-emerald-900/40">
                    <span className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300">
                      <Users className="h-3.5 w-3.5 text-emerald-600" /> Up to 500 members
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300">
                      <HardDrive className="h-3.5 w-3.5 text-emerald-600" /> 5 GB cloud storage
                    </span>
                  </div>

                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block mb-2 font-mono">
                    All Free Features Plus:
                  </span>
                  <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Event Attendance & Live Check-in with QR code scanners</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Excel Attendance & Member Dues Data Export (.xlsx / .csv)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Meeting Minutes Recorder with assigned action item tracking</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Interactive Voice Notes & Live Polls in community channels</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Double-Entry Financial Accounting Ledger with category breakdown</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>DocumentOffice Suite (Official Letterhead writer & sheets)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Real-Time Security & System Audit Logs for leadership accountability</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 font-medium">
                  Designed for active local cooperatives, farmer groups, and growing associations.
                </div>
              </div>
            )}

            {/* 3. PRO PLAN SECTION */}
            {(activeTab === "all" || activeTab === "pro") && (
              <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 p-4 flex flex-col justify-between shadow-3xs">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-3">
                    <div>
                      <h5 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Crown className="h-4 w-4 text-amber-500" /> Pro Plan
                      </h5>
                    </div>
                    <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                      $25 <span className="text-[10px] font-normal text-slate-400">/ month</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300 mb-3 bg-amber-50/60 dark:bg-amber-950/30 p-2.5 rounded-lg font-medium border border-amber-200/60 dark:border-amber-900/40">
                    <span className="flex items-center gap-1 font-bold text-amber-700 dark:text-amber-300">
                      <Users className="h-3.5 w-3.5 text-amber-600" /> Unlimited members
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1 font-bold text-amber-700 dark:text-amber-300">
                      <HardDrive className="h-3.5 w-3.5 text-amber-600" /> Unlimited storage
                    </span>
                  </div>

                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 block mb-2 font-mono">
                    All Growth Features Plus:
                  </span>
                  <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>Automated Certificate Generation & Public Verification Portal</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>Hardware, Equipment & Asset Inventory Tracker with depreciation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>Advanced Financial Ledger Reports & interactive charts</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>Mobile Money Live Gateway (Direct MTN & Airtel MoMo push prompts)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>Public Cooperative Marketplace & Storefront showcase</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>Full Audit Trail Dossiers (CSV & JSON export, multi-tenant compliance)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>End-to-End Encryption & 24/7 Priority Hotline Support</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 font-medium">
                  Ideal for large unions, agricultural federations, institutions, and high-scale NGOs.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
