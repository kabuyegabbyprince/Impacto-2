import React from "react";
import { Link } from "react-router-dom";
import { 
  Lock, 
  ArrowUpRight, 
  Check, 
  Crown, 
  ShieldCheck, 
  Zap,
  Layers
} from "lucide-react";
import { useOrgStore } from "../store/orgStore";
import { useCurrencyStore } from "../store/currencyStore";
import { Button } from "./ui";
import { 
  SubscriptionTier, 
  ImpactFeatureKey,
  FeatureAccessResult,
  canAccessFeature,
  getOrgSubscriptionLifecycle,
  getTierDefinition
} from "../lib/subscriptionMatrix";

interface PlanGatedViewProps {
  requiredTier?: SubscriptionTier | string;
  featureKey?: ImpactFeatureKey;
  children: React.ReactNode;
  customMessage?: string;
  featureName?: string;
}

export const PlanGatedView: React.FC<PlanGatedViewProps> = ({
  requiredTier = "growth",
  featureKey,
  children,
  customMessage,
  featureName = "This feature"
}: PlanGatedViewProps) => {
  const { activeOrg } = useOrgStore();
  const { formatAmount, convertToRWF } = useCurrencyStore();

  // Evaluate feature access
  const tierRank: Record<string, number> = {
    free: 1,
    starter: 2,
    growth: 3,
    pro: 4,
    enterprise: 4
  };
  const currentOrgTier = (activeOrg?.subscription_tier || "free").toLowerCase();
  const currentRank = tierRank[currentOrgTier] || 1;
  const targetReqTier = (requiredTier || "growth").toLowerCase();
  const targetReqRank = tierRank[targetReqTier] || 3;

  const accessResult: FeatureAccessResult = featureKey 
    ? canAccessFeature(activeOrg, featureKey)
    : { 
        allowed: currentRank >= targetReqRank, 
        requiredTier: (requiredTier || "growth") as SubscriptionTier 
      };

  if (accessResult.allowed) {
    return <>{children}</>;
  }

  const lifecycle = getOrgSubscriptionLifecycle(activeOrg);
  const targetTier = accessResult.requiredTier || requiredTier;
  const tierDetails = getTierDefinition(targetTier as string);

  return (
    <div className="w-full h-full min-h-[460px] flex items-center justify-center p-4 sm:p-8 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl animate-in fade-in duration-200">
      <div className="max-w-xl w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col items-center text-center">
        
        {/* Lock Icon */}
        <div className="mb-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[#156c45] dark:text-emerald-400 flex items-center justify-center shadow-3xs">
            <Lock className="h-6 w-6" />
          </div>
        </div>

        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#156c45] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200/80 dark:border-emerald-800/80 mb-2">
          {tierDetails?.name || "Growth Plan"} Required
        </span>

        <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-900 dark:text-white leading-tight">
          {featureName} Access
        </h2>
        
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-md font-normal leading-relaxed">
          {customMessage || accessResult.message || `This capability requires the ${tierDetails?.name || "Growth Plan"}. Upgrade your workspace subscription to unlock full operational access.`}
        </p>

        {/* Focused Plan Upgrade Card */}
        <div className="w-full mt-6 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 p-5 rounded-2xl text-left shadow-3xs">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Crown className="h-4 w-4 text-amber-500" />
              {tierDetails?.name || "Growth Plan"}
            </h3>
            <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-md">
              {tierDetails?.memberLimit === Infinity ? "Unlimited Members" : `Up to ${tierDetails?.memberLimit || 500} Members`}
            </span>
          </div>

          <div className="text-xs font-semibold text-slate-900 dark:text-white mb-2 font-mono">
            ${tierDetails?.priceUsd || 25}/month <span className="text-slate-500 font-normal">({formatAmount(convertToRWF(tierDetails?.priceUsd || 25, "USD"))})</span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 mb-3 leading-relaxed">
            {tierDetails?.tagline || "Expanded operational capacity and governance tools for cooperatives."}
          </p>

          <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-200 dark:border-slate-700 pt-3">
            {(tierDetails?.coreFeatures || []).slice(0, 4).map((feat, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-[#156c45] dark:text-emerald-400 shrink-0" />
                <span className="text-xs font-normal">{feat}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-2">
            <Link to="/dashboard/settings?tab=subscription" className="flex-1">
              <Button
                className="w-full bg-[#156c45] hover:opacity-90 text-white font-bold text-xs h-10 rounded-xl flex items-center justify-center gap-1.5 shadow-3xs"
              >
                <span>Upgrade to {tierDetails?.name || "Growth Plan"}</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link to="/dashboard/settings?tab=subscription">
              <Button
                variant="outline"
                className="w-full sm:w-auto text-xs h-10 px-4 rounded-xl font-bold"
              >
                All Plans
              </Button>
            </Link>
          </div>
        </div>

        {/* Informational Footer */}
        <div className="mt-5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <ShieldCheck className="h-4 w-4 text-[#156c45] dark:text-emerald-400" />
          <span>All existing workspace records and members remain preserved safely.</span>
        </div>

      </div>
    </div>
  );
};
