import React from "react";
import { Plus, ArrowRight, BookOpen, Award, FileText, CheckCircle2, Coins, Building2, Users } from "lucide-react";
import { Button } from "./ui";

// ============================================================================
// 1. BESPOKE SVG ILLUSTRATIONS
// ============================================================================

export const LedgerIllustration: React.FC<{ className?: string }> = ({ className = "w-48 h-36" }) => (
  <svg
    viewBox="0 0 240 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Soft backdrop glow */}
    <ellipse cx="120" cy="130" rx="90" ry="18" fill="currentColor" className="text-emerald-500/10 dark:text-emerald-400/10" />
    
    {/* Base ledger book */}
    <rect x="40" y="30" width="160" height="96" rx="10" className="fill-white dark:fill-slate-800 stroke-slate-200 dark:stroke-slate-700" strokeWidth="2" />
    <path d="M120 30 V126" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="2" strokeDasharray="3 3" />
    
    {/* Left Page Rows (Debits/Income) */}
    <rect x="52" y="44" width="56" height="6" rx="3" className="fill-emerald-100 dark:fill-emerald-950/60" />
    <rect x="52" y="58" width="42" height="4" rx="2" className="fill-slate-200 dark:fill-slate-700" />
    <rect x="52" y="70" width="50" height="4" rx="2" className="fill-slate-200 dark:fill-slate-700" />
    <rect x="52" y="82" width="36" height="4" rx="2" className="fill-slate-200 dark:fill-slate-700" />
    <rect x="52" y="98" width="56" height="14" rx="4" className="fill-emerald-50 dark:fill-emerald-950/40 stroke-emerald-400/50" strokeWidth="1" />
    <circle cx="60" cy="105" r="3" className="fill-emerald-500" />
    <rect x="68" y="103" width="30" height="4" rx="2" className="fill-emerald-600 dark:fill-emerald-400" />

    {/* Right Page Rows (Credits/Expenses) */}
    <rect x="132" y="44" width="56" height="6" rx="3" className="fill-slate-200 dark:fill-slate-700" />
    <rect x="132" y="58" width="48" height="4" rx="2" className="fill-slate-200 dark:fill-slate-700" />
    <rect x="132" y="70" width="38" height="4" rx="2" className="fill-slate-200 dark:fill-slate-700" />
    <rect x="132" y="82" width="52" height="4" rx="2" className="fill-slate-200 dark:fill-slate-700" />
    <rect x="132" y="98" width="56" height="14" rx="4" className="fill-slate-100 dark:fill-slate-800/80 stroke-slate-300 dark:stroke-slate-600" strokeWidth="1" />
    <rect x="140" y="103" width="36" height="4" rx="2" className="fill-slate-400 dark:fill-slate-500" />

    {/* Stacked Coins / Currency Token */}
    <g transform="translate(160, 16)">
      <ellipse cx="20" cy="32" rx="16" ry="6" className="fill-emerald-600/30 dark:fill-emerald-500/20" />
      <ellipse cx="20" cy="24" rx="16" ry="6" className="fill-emerald-600 dark:fill-emerald-500 stroke-emerald-700 dark:stroke-emerald-400" strokeWidth="1.5" />
      <path d="M4 24 V29 C4 32.3 11.2 35 20 35 C28.8 35 36 32.3 36 29 V24" className="fill-emerald-700 dark:fill-emerald-600 stroke-emerald-800 dark:stroke-emerald-400" strokeWidth="1.5" />
      <ellipse cx="20" cy="18" rx="16" ry="6" className="fill-emerald-500 dark:fill-emerald-400 stroke-emerald-600 dark:stroke-emerald-300" strokeWidth="1.5" />
      <path d="M4 18 V23 C4 26.3 11.2 29 20 29 C28.8 29 36 26.3 36 23 V18" className="fill-emerald-600 dark:fill-emerald-500 stroke-emerald-700 dark:stroke-emerald-400" strokeWidth="1.5" />
      <ellipse cx="20" cy="12" rx="16" ry="6" className="fill-emerald-400 dark:fill-emerald-300 stroke-emerald-500 dark:stroke-emerald-200" strokeWidth="1.5" />
      <text x="20" y="15" textAnchor="middle" fill="#064e3b" fontSize="8" fontWeight="bold" fontFamily="monospace">RWF</text>
    </g>

    {/* Floating Calculation Pin */}
    <g transform="translate(26, 20)">
      <circle cx="16" cy="16" r="14" className="fill-white dark:fill-slate-800 stroke-emerald-500 shadow-md" strokeWidth="2" />
      <path d="M12 16 L15 19 L21 13" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </svg>
);

export const GrantsIllustration: React.FC<{ className?: string }> = ({ className = "w-48 h-36" }) => (
  <svg
    viewBox="0 0 240 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Soft backdrop glow */}
    <ellipse cx="120" cy="132" rx="90" ry="18" fill="currentColor" className="text-amber-500/10 dark:text-amber-400/10" />

    {/* Grant Award Certificate Card */}
    <rect x="46" y="26" width="148" height="102" rx="12" className="fill-white dark:fill-slate-800 stroke-slate-200 dark:stroke-slate-700" strokeWidth="2" />
    <rect x="54" y="34" width="132" height="86" rx="8" className="stroke-amber-300/60 dark:stroke-amber-500/30" strokeWidth="1.5" strokeDasharray="4 3" />

    {/* Certificate Banner & Title */}
    <rect x="80" y="44" width="80" height="8" rx="4" className="fill-amber-100 dark:fill-amber-950/60" />
    <rect x="94" y="58" width="52" height="4" rx="2" className="fill-slate-200 dark:fill-slate-700" />
    <rect x="74" y="70" width="92" height="4" rx="2" className="fill-slate-200 dark:fill-slate-700" />

    {/* Funding Metric Capsule */}
    <rect x="70" y="84" width="100" height="24" rx="6" className="fill-amber-50 dark:fill-amber-950/40 stroke-amber-400/60" strokeWidth="1" />
    <text x="120" y="99" textAnchor="middle" fill="#b45309" fontSize="9" fontWeight="bold" fontFamily="monospace">$50,000 GRANT POOL</text>

    {/* Wax Seal / Award Ribbon */}
    <g transform="translate(162, 78)">
      {/* Ribbons */}
      <path d="M12 24 L6 42 L16 38 L24 42 L20 24" className="fill-amber-600 dark:fill-amber-500" />
      {/* Circular Medallion */}
      <circle cx="16" cy="18" r="14" className="fill-amber-500 stroke-amber-600 dark:stroke-amber-400" strokeWidth="2" />
      <circle cx="16" cy="18" r="10" className="fill-amber-400 stroke-amber-200" strokeWidth="1" />
      <polygon points="16,11 18,15 22,16 19,19 20,23 16,21 12,23 13,19 10,16 14,15" fill="#78350f" />
    </g>

    {/* Floating Foundation / Funder Icon */}
    <g transform="translate(24, 28)">
      <circle cx="16" cy="16" r="15" className="fill-white dark:fill-slate-800 stroke-amber-500" strokeWidth="2" />
      <path d="M16 8 L10 13 V23 H22 V13 Z" fill="none" stroke="#d97706" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="14" y="17" width="4" height="6" fill="#d97706" />
    </g>
  </svg>
);

export const ReportsIllustration: React.FC<{ className?: string }> = ({ className = "w-48 h-36" }) => (
  <svg
    viewBox="0 0 240 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Soft backdrop glow */}
    <ellipse cx="120" cy="132" rx="90" ry="18" fill="currentColor" className="text-blue-500/10 dark:text-blue-400/10" />

    {/* Behind document */}
    <rect x="65" y="24" width="120" height="96" rx="8" className="fill-slate-100 dark:fill-slate-850 stroke-slate-200 dark:stroke-slate-700" strokeWidth="1.5" transform="rotate(3 125 72)" />

    {/* Main Audit Dossier Report */}
    <rect x="52" y="26" width="126" height="106" rx="10" className="fill-white dark:fill-slate-800 stroke-slate-200 dark:stroke-slate-700" strokeWidth="2" />

    {/* Document Header & Title */}
    <rect x="64" y="38" width="50" height="6" rx="3" className="fill-blue-100 dark:fill-blue-950/70" />
    <rect x="64" y="48" width="35" height="4" rx="2" className="fill-slate-200 dark:fill-slate-700" />

    {/* Integrated Bar Chart on Paper */}
    <g transform="translate(64, 60)">
      <rect x="0" y="0" width="102" height="44" rx="4" className="fill-slate-50 dark:fill-slate-800/80 stroke-slate-200 dark:stroke-slate-700/80" strokeWidth="1" />
      {/* Bars */}
      <rect x="12" y="22" width="10" height="18" rx="2" className="fill-blue-400 dark:fill-blue-500" />
      <rect x="28" y="14" width="10" height="26" rx="2" className="fill-emerald-500 dark:fill-emerald-400" />
      <rect x="44" y="26" width="10" height="14" rx="2" className="fill-amber-400 dark:fill-amber-500" />
      <rect x="60" y="8" width="10" height="32" rx="2" className="fill-emerald-600 dark:fill-emerald-400" />
      <rect x="76" y="16" width="10" height="24" rx="2" className="fill-blue-500 dark:fill-blue-400" />
      {/* Trend Line */}
      <path d="M17 20 L33 12 L49 24 L65 6 L81 14" fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" />
    </g>

    {/* Official RCA / Audit Compliance Seal Stamp */}
    <g transform="translate(156, 84)">
      <circle cx="18" cy="18" r="16" className="fill-emerald-50 dark:fill-emerald-950/60 stroke-emerald-600 dark:stroke-emerald-400" strokeWidth="2" strokeDasharray="3 2" />
      <circle cx="18" cy="18" r="12" className="fill-emerald-600 dark:fill-emerald-500" />
      <path d="M13 18 L16 21 L23 14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </g>

    {/* Download / Export Pin */}
    <g transform="translate(32, 22)">
      <circle cx="14" cy="14" r="13" className="fill-white dark:fill-slate-800 stroke-blue-500" strokeWidth="2" />
      <path d="M14 8 V17 M10 13 L14 17 L18 13 M9 20 H19" stroke="#3b82f6" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </svg>
);

// ============================================================================
// 2. EMPTY LEDGER STATE COMPONENT
// ============================================================================

export interface EmptyLedgerStateProps {
  onAddTransaction: () => void;
  onBatchEntry?: () => void;
}

export const EmptyLedgerState: React.FC<EmptyLedgerStateProps> = ({
  onAddTransaction,
  onBatchEntry
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-6 md:p-10 bg-gradient-to-b from-white to-stone-50/70 dark:from-slate-800/80 dark:to-slate-900/90 border border-dashed border-emerald-300 dark:border-emerald-800/70 rounded-3xl text-center shadow-3xs">
      <div className="relative mb-5">
        <LedgerIllustration className="w-44 h-32 md:w-52 md:h-36" />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold uppercase tracking-wider font-mono mb-2">
        <Coins className="h-3 w-3 text-emerald-600" /> Double-Entry Accounting
      </div>

      <h3 className="text-lg md:text-xl font-bold font-display text-slate-900 dark:text-white">
        No Financial Transactions Recorded Yet
      </h3>
      <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 max-w-lg mt-1.5 mb-6 leading-relaxed">
        Establish audit-ready financial transparency for your cooperative. Track all operational income, farm equipment assets, donor grants, and expense vouchers with real-time balance sheet balancing.
      </p>

      {/* 3 Step Onboarding Guidance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-2xl mb-8 text-left">
        <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-3xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center justify-center font-mono">1</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Select Classification</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            Choose between Income (+), Expense (-), Asset (+), or Liability (+) balance sheet categories.
          </p>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-3xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center justify-center font-mono">2</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Assign Category</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            Tag transactions to grants, member fees, salaries, rent, crop inputs, or operational reserves.
          </p>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-3xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center justify-center font-mono">3</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Link Receipts & Goals</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            Provide verifiable invoice references and link transactions directly to strategic goals.
          </p>
        </div>
      </div>

      {/* Call to Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          onClick={onAddTransaction}
          icon={<Plus className="h-4 w-4" />}
          className="rounded-xl bg-emerald-700 hover:bg-emerald-800 shadow-sm text-xs font-bold"
        >
          Record First Transaction
        </Button>
        {onBatchEntry && (
          <Button
            variant="outline"
            onClick={onBatchEntry}
            icon={<FileText className="h-4 w-4" />}
            className="rounded-xl text-xs font-bold"
          >
            Multi-Row Batch Entry
          </Button>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 3. EMPTY GRANTS STATE COMPONENT
// ============================================================================

export interface EmptyGrantsStateProps {
  onAddGrant: () => void;
  onAddDonation?: () => void;
}

export const EmptyGrantsState: React.FC<EmptyGrantsStateProps> = ({
  onAddGrant,
  onAddDonation
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-6 md:p-10 bg-gradient-to-b from-white to-amber-50/40 dark:from-slate-800/80 dark:to-slate-900/90 border border-dashed border-amber-300 dark:border-amber-800/70 rounded-3xl text-center shadow-3xs">
      <div className="relative mb-5">
        <GrantsIllustration className="w-44 h-32 md:w-52 md:h-36" />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/70 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[11px] font-bold uppercase tracking-wider font-mono mb-2">
        <Award className="h-3 w-3 text-amber-600" /> Capital & Funding Pipeline
      </div>

      <h3 className="text-lg md:text-xl font-bold font-display text-slate-900 dark:text-white">
        No Grant Pipelines or Funder Proposals Tracked Yet
      </h3>
      <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 max-w-lg mt-1.5 mb-6 leading-relaxed">
        Track opportunities from government bodies, philanthropic foundations, and bilateral donors. Manage proposal deadlines, compliance guidelines, and fund disbursements seamlessly.
      </p>

      {/* 3 Step Onboarding Guidance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-2xl mb-8 text-left">
        <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-3xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-5 w-5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center justify-center font-mono">1</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Identify Funder</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            Document granting agencies, USAID, EU bilateral funds, or private foundation partners.
          </p>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-3xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-5 w-5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center justify-center font-mono">2</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Set Target Capital</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            Define funding range (RWF or USD), submission deadlines, and key eligibility criteria.
          </p>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-3xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-5 w-5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center justify-center font-mono">3</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Monitor Lifecycle</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            Advance opportunities from &apos;Tracking&apos; to &apos;Applied&apos; and celebrate &apos;Successful&apos; awards.
          </p>
        </div>
      </div>

      {/* Call to Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          onClick={onAddGrant}
          icon={<Plus className="h-4 w-4" />}
          className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-sm text-xs font-bold"
        >
          Track First Grant Opportunity
        </Button>
        {onAddDonation && (
          <Button
            variant="outline"
            onClick={onAddDonation}
            icon={<Coins className="h-4 w-4" />}
            className="rounded-xl text-xs font-bold"
          >
            Log Sourced Donation
          </Button>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 4. EMPTY REPORTS STATE COMPONENT
// ============================================================================

export interface EmptyReportsStateProps {
  onGoToLedger: () => void;
  onGoToMembers?: () => void;
}

export const EmptyReportsState: React.FC<EmptyReportsStateProps> = ({
  onGoToLedger,
  onGoToMembers
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-6 md:p-10 bg-gradient-to-b from-white to-blue-50/40 dark:from-slate-800/80 dark:to-slate-900/90 border border-dashed border-blue-300 dark:border-blue-800/70 rounded-3xl text-center shadow-3xs">
      <div className="relative mb-5">
        <ReportsIllustration className="w-44 h-32 md:w-52 md:h-36" />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100/70 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 text-[11px] font-bold uppercase tracking-wider font-mono mb-2">
        <FileText className="h-3 w-3 text-blue-600" /> Compliance & Executive Dossier
      </div>

      <h3 className="text-lg md:text-xl font-bold font-display text-slate-900 dark:text-white">
        Annual Audit & Compliance Reports Awaiting Operational Records
      </h3>
      <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 max-w-lg mt-1.5 mb-6 leading-relaxed">
        Comprehensive financial audits, cash-flow projections, and Rwanda Cooperative Agency (RCA) compliance scores compile automatically once activity data is entered into the system.
      </p>

      {/* 3 Step Guidance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-2xl mb-8 text-left">
        <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-3xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 text-xs font-bold flex items-center justify-center font-mono">1</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Log Ledger Records</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            Record revenue, expenses, and capital reserves in the Financial Ledger to populate cash flow trends.
          </p>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-3xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 text-xs font-bold flex items-center justify-center font-mono">2</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Verify Members & Shares</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            Add member registration numbers and share capital payments to meet statutory legal reserve ratios.
          </p>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-3xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 text-xs font-bold flex items-center justify-center font-mono">3</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">One-Click PDF/CSV Export</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            Download certified A4 annual report packets or standardized RCA CSV data ready for general assemblies.
          </p>
        </div>
      </div>

      {/* Call to Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          onClick={onGoToLedger}
          icon={<Coins className="h-4 w-4" />}
          className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm text-xs font-bold"
        >
          Open Financial Ledger
        </Button>
        {onGoToMembers && (
          <Button
            variant="outline"
            onClick={onGoToMembers}
            icon={<Users className="h-4 w-4" />}
            className="rounded-xl text-xs font-bold"
          >
            Manage Member Shares
          </Button>
        )}
      </div>
    </div>
  );
};
