import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  HeartHandshake,
  Copy,
  Check,
  Users,
  Building2,
  TrendingUp,
  Share2,
  Award,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import { Modal, Button, Card, Badge } from "./ui";
import { useAuthStore } from "../store/authStore";
import { useReferrals } from "../hooks/useImpactoData";
import { useToast } from "./Toast";

interface ReferralCenterModalProps {
  open: boolean;
  onClose: () => void;
}

export const ReferralCenterModal: React.FC<ReferralCenterModalProps> = ({
  open,
  onClose,
}) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const { addToast } = useToast();
  const [copied, setCopied] = useState(false);

  // Fetch referrals associated with this user
  const { data: referrals = [] } = useReferrals(user?.id);

  // User's personalized referral code
  const referralCode =
    user?.referral_code ||
    `REF-${(user?.full_name || "USER").substring(0, 4).toUpperCase().replace(/[^A-Z]/g, "")}-${(user?.id || "101").slice(-4).toUpperCase()}`;

  // Unique shareable referral link
  const referralLink = `${window.location.origin}/register?ref=${referralCode}&mode=ngo`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    addToast(t("referrals.link_copied", "Referral link copied to clipboard!"), "success");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    addToast(t("referrals.code_copied", "Referral code copied!"), "success");
    setTimeout(() => setCopied(false), 2500);
  };

  // Metrics
  const level1Referrals = referrals.filter(
    (r) => r.referrer_user_id === user?.id && r.level === 1
  );
  const level2Referrals = referrals.filter(
    (r) => r.parent_referrer_id === user?.id || r.level === 2
  );
  const orgsReferred = referrals.filter((r) => r.referred_org_id || r.status === "org_created" || r.status === "verified");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title=""
      maxWidth="max-w-2xl"
    >
      <div className="flex flex-col gap-5 pt-1">
        {/* Header Hero */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4 dark:border-slate-800">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="h-11 w-11 rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <HeartHandshake className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 break-words">
                {t("referrals.title", "Promoter & Referral Attribution Hub")}
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 break-words">
                {t("referrals.subtitle", "Invite cooperatives, leaders, and members to build verified impact networks.")}
              </p>
            </div>
          </div>

          <Badge variant="outline" className="border-emerald-300 text-emerald-700 font-mono text-[10px] shrink-0">
            {t("referrals.active_ambassador", "ACTIVE AMBASSADOR")}
          </Badge>
        </div>

        {/* Link Share Box */}
        <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-200/80 dark:border-emerald-800/50 rounded-2xl flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider break-words">
              {t("referrals.shareable_link_label", "Your Shareable Referral Link")}
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 font-bold bg-white/80 dark:bg-slate-900/80 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 shrink-0 cursor-pointer hover:bg-white"
            >
              {t("referrals.code_label", "Code")}: {referralCode}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 min-w-0">
            <input
              type="text"
              readOnly
              value={referralLink}
              className="w-full sm:flex-1 min-w-0 text-xs font-mono bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700/80 rounded-xl px-3 py-2 text-gray-800 dark:text-slate-200 outline-none select-all"
            />
            <Button
              type="button"
              onClick={handleCopyLink}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5 py-2 px-3.5 shrink-0"
            >
              {copied ? <Check className="h-3.5 w-3.5 shrink-0" /> : <Copy className="h-3.5 w-3.5 shrink-0" />}
              <span>{copied ? t("referrals.copied", "Copied") : t("referrals.copy_link", "Copy Link")}</span>
            </Button>
          </div>

          <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed break-words">
            {t("referrals.share_help", "When organizations or members register via your link or enter your code on sign-up, they are automatically credited to your referral network.")}
          </p>
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col gap-1 min-w-0">
            <span className="text-[10px] font-bold uppercase text-gray-400 break-words">{t("referrals.level1_title", "Direct Referrals (Level 1)")}</span>
            <div className="flex flex-wrap items-baseline gap-1.5">
              <span className="text-2xl font-black font-display text-gray-900 dark:text-white">
                {level1Referrals.length}
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold">{t("referrals.direct_badge", "Direct")}</span>
            </div>
            <span className="text-[10px] text-gray-400 break-words">{t("referrals.level1_sub", "Joined via your code directly")}</span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col gap-1 min-w-0">
            <span className="text-[10px] font-bold uppercase text-gray-400 break-words">{t("referrals.level2_title", "Network Chain (Level 2)")}</span>
            <div className="flex flex-wrap items-baseline gap-1.5">
              <span className="text-2xl font-black font-display text-gray-900 dark:text-white">
                {level2Referrals.length}
              </span>
              <span className="text-[10px] text-blue-600 font-semibold">{t("referrals.secondary_badge", "Secondary")}</span>
            </div>
            <span className="text-[10px] text-gray-400 break-words">{t("referrals.level2_sub", "Referred by someone you referred")}</span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col gap-1 min-w-0">
            <span className="text-[10px] font-bold uppercase text-gray-400 break-words">{t("referrals.orgs_title", "Cooperatives Created")}</span>
            <div className="flex flex-wrap items-baseline gap-1.5">
              <span className="text-2xl font-black font-display text-gray-900 dark:text-white">
                {orgsReferred.length}
              </span>
              <span className="text-[10px] text-purple-600 font-semibold">{t("referrals.entities_badge", "Entities")}</span>
            </div>
            <span className="text-[10px] text-gray-400 break-words">{t("referrals.orgs_sub", "Organizations successfully founded")}</span>
          </div>
        </div>

        {/* History Table */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 break-words">
              {t("referrals.activity_log", "Referral Activity Log")} ({referrals.length})
            </h3>
            <span className="text-[11px] text-gray-400">{t("referrals.realtime_attr", "Real-time Attribution")}</span>
          </div>

          {referrals.length === 0 ? (
            <div className="p-6 text-center border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-2">
              <Users className="h-8 w-8 text-gray-300 dark:text-slate-600" />
              <p className="text-xs font-semibold text-gray-600 dark:text-slate-400 break-words">
                {t("referrals.empty_title", "No referrals recorded yet")}
              </p>
              <p className="text-[11px] text-gray-400 max-w-xs break-words">
                {t("referrals.empty_desc", "Share your referral link with cooperatives and partners across Rwanda to track sign-ups here.")}
              </p>
            </div>
          ) : (
            <div className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-slate-900 text-gray-500 font-semibold border-b dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">{t("referrals.col_referee", "Referee")}</th>
                    <th className="py-2.5 px-3">{t("referrals.col_org", "Organization")}</th>
                    <th className="py-2.5 px-3">{t("referrals.col_tier", "Tier")}</th>
                    <th className="py-2.5 px-3">{t("referrals.col_status", "Status")}</th>
                    <th className="py-2.5 px-3 text-right">{t("referrals.col_date", "Date")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-gray-700 dark:text-slate-300">
                  {referrals.map((ref) => (
                    <tr key={ref.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                      <td className="py-2 px-3 font-semibold text-gray-900 dark:text-white break-words">
                        {ref.referred_user_name}
                      </td>
                      <td className="py-2 px-3">
                        {ref.referred_org_name ? (
                          <span className="font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1 break-words">
                            <Building2 className="h-3 w-3 shrink-0" />
                            {ref.referred_org_name}
                          </span>
                        ) : (
                          <span className="text-gray-400">{t("referrals.individual", "Individual Participant")}</span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px]">
                        {ref.level === 1 ? (
                          <span className="text-emerald-600 font-bold">{t("referrals.level1_tag", "Level 1 (Direct)")}</span>
                        ) : (
                          <span className="text-blue-500 font-bold">{t("referrals.level2_tag", "Level 2 (Chain)")}</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {ref.status === "verified" ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1 w-max">
                            <CheckCircle2 className="h-2.5 w-2.5 shrink-0" /> {t("payments.verified", "Verified")}
                          </span>
                        ) : ref.status === "org_created" ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 flex items-center gap-1 w-max">
                            {t("referrals.status_org_active", "Org Active")}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300 w-max">
                            {t("referrals.status_registered", "Registered")}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-400 font-mono text-[10px]">
                        {new Date(ref.created_at).toLocaleDateString(i18n.language)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t dark:border-slate-800">
          <Button type="button" onClick={onClose} variant="outline" className="text-xs">
            {t("common.done", "Done")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
