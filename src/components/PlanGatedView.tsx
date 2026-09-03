import React from "react";
import { Link } from "react-router-dom";
import { Lock, ArrowUpRight, Check } from "lucide-react";
import { useOrgStore } from "../store/orgStore";
import { Button } from "./ui";

interface PlanGatedViewProps {
  requiredTier: "growth" | "enterprise";
  children: React.ReactNode;
  customMessage?: string;
  featureName?: string;
}

export const PlanGatedView: React.FC<PlanGatedViewProps> = ({
  requiredTier,
  children,
  customMessage,
  featureName = "This feature"
}) => {
  const { activeOrg } = useOrgStore();

  const orgStatus = activeOrg?.subscription_status || "trial";
  const currentTier = activeOrg?.subscription_tier || "growth";

  const tierLevels = {
    starter: 1,
    growth: 2,
    enterprise: 3
  };

  const userLevel = orgStatus === "trial" ? 3 : (tierLevels[currentTier] || 2);
  const requiredLevel = tierLevels[requiredTier];

  if (userLevel >= requiredLevel) {
    return <>{children}</>;
  }

  const planDetails = {
    growth: {
      name: "Growth Plan",
      price: "$25 / month",
      benefits: [
        "Unlimited members & volunteers directory",
        "Rich media chat: voice notes, attachments, large files",
        "Advanced accounting & financial ledgers",
        "Strategic goal sheets & bento analytics dashboard"
      ],
      color: "from-emerald-500 to-teal-600",
      textColor: "text-emerald-800"
    },
    enterprise: {
      name: "Pro VIP Room",
      price: "$40 / month",
      benefits: [
        "Highly secure end-to-end encryption",
        "Auto-personalized data management",
        "Treated as VIP group tier",
        "Unlimited on all features & storage",
        "Admin direct contact (VIP room)"
      ],
      color: "from-amber-600 to-amber-800",
      textColor: "text-amber-800"
    }
  };

  const details = planDetails[requiredTier];

  return (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center p-6 bg-stone-50/50 dark:bg-slate-950/20 border-2 border-dashed border-gray-250 dark:border-slate-850 rounded-2xl animate-in fade-in duration-200">
      <div className="max-w-md bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-8 rounded-2xl shadow-xl flex flex-col items-center text-center">
        <span className={`h-14 w-14 rounded-2xl bg-gradient-to-tr ${details.color} text-white flex items-center justify-center shadow-lg mb-5`}>
          <Lock className="h-6 w-6" />
        </span>
        
        <h2 className="text-xl font-extrabold font-display text-gray-900 dark:text-white leading-tight">
          Upgrade to unlock {featureName}
        </h2>
        
        <p className="text-xs text-gray-500 mt-2 font-medium leading-relaxed">
          {customMessage || `Access to ${featureName} is gated on the ${details.name} or higher. Upgrade to unlock total platform power.`}
        </p>

        <div className="w-full mt-6 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-dashed border-gray-200 dark:border-slate-800 text-left">
          <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400 font-bold block">
            What's included in {details.name}:
          </span>
          <ul className="mt-3 space-y-2 text-xs font-semibold text-gray-600 dark:text-slate-350">
            {details.benefits.map((b, i) => (
              <li key={i} className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3.5 w-full mt-6">
          <Link to="/dashboard/settings" className="w-full">
            <Button className="w-full bg-emerald-650 hover:bg-emerald-700 text-white font-bold h-10 flex items-center justify-center gap-1.5 shadow-md">
              Compare & Upgrade <ArrowUpRight className="h-4 w-4" />
            </Button>
          </Link>
          <span className="text-[10px] font-bold text-gray-400 font-mono">
            Requires {details.name} ({details.price})
          </span>
        </div>
      </div>
    </div>
  );
};
