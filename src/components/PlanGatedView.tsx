import React, { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Lock, 
  ArrowUpRight, 
  Check, 
  Crown, 
  Coins, 
  Smartphone, 
  Users, 
  ShieldCheck, 
  Clock,
  QrCode,
  X,
  FileSpreadsheet
} from "lucide-react";
import { useOrgStore } from "../store/orgStore";
import { useAuthStore } from "../store/authStore";
import { useCurrencyStore } from "../store/currencyStore";
import { useToast } from "./Toast";
import { Button, Input, Modal, Badge } from "./ui";
import { useSubmitSubscriptionPayment } from "../hooks/useImpactoData";
import { 
  SUBSCRIPTION_TIERS, 
  ADDON_PACKAGES, 
  SubscriptionTier, 
  AddOnPackageId,
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
  const { activeOrg, activeMember, setActiveOrg } = useOrgStore();
  const { user } = useAuthStore();
  const { formatAmount, convertToRWF } = useCurrencyStore();
  const { addToast } = useToast();

  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<AddOnPackageId | null>(null);
  const [momoNumber, setMomoNumber] = useState("");
  const [momoName, setMomoName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const submitPaymentMutation = useSubmitSubscriptionPayment();

  // Evaluate feature access
  const accessResult: FeatureAccessResult = featureKey 
    ? canAccessFeature(activeOrg, featureKey)
    : { allowed: false, requiredTier: (requiredTier || "growth") as SubscriptionTier };

  if (accessResult.allowed) {
    return <>{children}</>;
  }

  const lifecycle = getOrgSubscriptionLifecycle(activeOrg);
  const targetTier = accessResult.requiredTier || requiredTier;
  const tierDetails = getTierDefinition(targetTier as string);
  const recommendedPackage = accessResult.packageDef || (accessResult.recommendedPackage ? ADDON_PACKAGES[accessResult.recommendedPackage] : undefined);

  const handleOpenPackageCheckout = (pkgId: AddOnPackageId) => {
    setSelectedPackage(pkgId);
    setPackageModalOpen(true);
  };

  const handleConfirmPackagePurchase = async () => {
    if (!activeOrg || !selectedPackage) return;
    if (!momoNumber.trim()) {
      addToast("Please provide your MTN MoMo or Airtel Money phone number.", "error");
      return;
    }

    setIsProcessing(true);
    try {
      const pkgDef = selectedPackage ? ADDON_PACKAGES[selectedPackage] : null;
      if (!pkgDef) {
        addToast("Selected package definition was not found.", "error");
        return;
      }
      const existingPackages = lifecycle.activePackages;
      const updatedPackages = Array.from(new Set([...existingPackages, selectedPackage]));
      const paymentRef = `PKG-${Date.now().toString().slice(-6)}`;

      // Save into subscription_payments table so it enters the Super Admin MoMo approval queue
      await submitPaymentMutation.mutateAsync({
        org_id: activeOrg.id,
        plan: `Package: ${pkgDef.name} (${selectedPackage})`,
        package_id: selectedPackage,
        item_type: "package",
        amount_usd: pkgDef.priceUsd,
        amount_local: pkgDef.priceUsd * 1350,
        method: momoNumber.startsWith("078") || momoNumber.startsWith("079") ? "mtn" : "airtel",
        phone: momoNumber,
        reference: paymentRef,
        proof_url: `MoMo Direct checkout for ${pkgDef.name} by ${momoName || "Payer"} (${momoNumber})`
      });

      localStorage.setItem(`impacto_org_packages_${activeOrg.id}`, JSON.stringify(updatedPackages));

      // Update org store for immediate provisional access
      const updatedOrg = {
        ...activeOrg,
        active_packages: updatedPackages
      };
      setActiveOrg(updatedOrg, activeMember);

      addToast(`Payment proof logged for ${pkgDef.name}! Super Admin MoMo queue notified for audit verification.`, "success");
      setPackageModalOpen(false);
    } catch (e) {
      console.error(e);
      addToast("Failed to process add-on activation.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full h-full min-h-[460px] flex items-center justify-center p-4 sm:p-8 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl animate-in fade-in duration-200">
      <div className="max-w-3xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 rounded-2xl shadow-sm flex flex-col items-center text-center">
        
        {/* Lock Icon */}
        <div className="mb-4">
          <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
            <Lock className="h-5 w-5" />
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-900 dark:text-white leading-tight">
          {featureName} Access
        </h2>
        
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xl font-normal leading-relaxed">
          {customMessage || accessResult.message || `This capability is available as an affordable $4 add-on package or with the ${tierDetails?.name || "Pro Plan"}. Choose the option that fits your cooperative.`}
        </p>

        {/* Dual Recommendation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mt-6 text-left">
          
          {/* Option 1: $4 Add-On Package (if applicable) */}
          {recommendedPackage ? (
            <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 p-5 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {recommendedPackage.name}
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    +20 members
                  </span>
                </div>
                <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2">
                  $4/mo ({formatAmount(convertToRWF(4, "USD"))})
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 mb-3 leading-relaxed">
                  {recommendedPackage.description}
                </p>

                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-200 dark:border-slate-700 pt-3">
                  {recommendedPackage.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="text-xs font-normal">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-200 dark:border-slate-700">
                <Button
                  type="button"
                  onClick={() => handleOpenPackageCheckout(recommendedPackage.id)}
                  className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-medium text-xs h-9 rounded-lg flex items-center justify-center gap-2"
                >
                  <Coins className="h-3.5 w-3.5" />
                  Add {recommendedPackage.name} ($4/mo)
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-850 p-5 rounded-xl border border-slate-200 dark:border-slate-750 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Add-On Feature Packages
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Enhance your workspace with modular $4/mo toolkits plus +20 extra member capacity.
                </p>
              </div>
              <Link to="/dashboard/settings?tab=subscription" className="mt-4">
                <Button variant="outline" className="w-full text-xs h-9 rounded-lg">
                  Browse Add-On Packages
                </Button>
              </Link>
            </div>
          )}

          {/* Option 2: Full Plan Upgrade */}
          <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 p-5 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {tierDetails?.name || "Pro Plan"}
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {tierDetails?.memberLimit === Infinity ? "Unlimited members" : `${tierDetails?.memberLimit || 500} members`}
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-900 dark:text-white mb-2">
                ${tierDetails?.priceUsd || 40}/mo ({formatAmount(convertToRWF(tierDetails?.priceUsd || 40, "USD"))})
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 mb-3 leading-relaxed">
                {tierDetails?.tagline || "Expanded operational capacity and governance tools for cooperatives"}
              </p>

              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-200 dark:border-slate-700 pt-3">
                {(tierDetails?.coreFeatures || []).slice(0, 4).map((feat, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400 shrink-0" />
                    <span className="text-xs font-normal">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-200 dark:border-slate-700">
              <Link to="/dashboard/settings?tab=subscription" className="w-full">
                <Button
                  className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white font-medium text-xs h-9 rounded-lg flex items-center justify-center gap-1.5"
                >
                  Upgrade to {tierDetails?.name || "Pro Plan"} <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Informational Footer */}
        <div className="mt-6 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-normal">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>All existing workspace records and members remain preserved in your organization database.</span>
        </div>

      </div>

      {/* Package Instant MoMo Checkout Modal */}
      {packageModalOpen && selectedPackage && (
        <Modal
          open={packageModalOpen}
          onClose={() => setPackageModalOpen(false)}
          title={`Activate ${ADDON_PACKAGES[selectedPackage].name}`}
        >
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {ADDON_PACKAGES[selectedPackage].name} ($4.00 / month)
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {ADDON_PACKAGES[selectedPackage].tagline}
                  </p>
                </div>
                <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 font-mono bg-emerald-200/60 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md">
                  +20 Member Slots
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                MTN MoMo or Airtel Money Number
              </label>
              <Input
                type="tel"
                placeholder="e.g. 078XXXXXXX"
                value={momoNumber}
                onChange={(e) => setMomoNumber(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                Account Holder Name
              </label>
              <Input
                type="text"
                placeholder="e.g. Jean Dupont"
                value={momoName}
                onChange={(e) => setMomoName(e.target.value)}
              />
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-gray-500 flex items-center justify-between">
              <span>Total Amount:</span>
              <span className="font-bold text-gray-900 dark:text-white font-mono text-sm">
                5,400 RWF ($4.00)
              </span>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setPackageModalOpen(false)}
                className="flex-1 text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmPackagePurchase}
                disabled={isProcessing}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 flex items-center justify-center gap-1.5"
              >
                <Smartphone className="h-3.5 w-3.5" />
                {isProcessing ? "Activating..." : "Confirm & Pay via MoMo"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};
