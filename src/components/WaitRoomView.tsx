import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { 
  Clock, 
  ShieldAlert, 
  RotateCw, 
  LogOut, 
  Building2, 
  CheckCircle2, 
  ArrowRight,
  LayoutDashboard,
  Lock
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useOrgStore } from "../store/orgStore";
import { useToast } from "./Toast";
import { Button } from "./ui";
import { MockDB } from "../lib/mockData";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export const WaitRoomView: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const { activeOrg, activeMember, setActiveOrg } = useOrgStore();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  const handleCheckStatus = async () => {
    if (!activeOrg || !user) return;
    setChecking(true);
    try {
      let freshMember: any = null;
      if (isSupabaseConfigured) {
        const { data } = await supabase
          .from("org_members")
          .select("*")
          .eq("org_id", activeOrg.id)
          .eq("user_id", user.id)
          .maybeSingle();
        freshMember = data;
      }

      if (!freshMember) {
        const members = MockDB.getMembers();
        freshMember = members.find((m) => m.org_id === activeOrg.id && m.user_id === user.id);
      }

      if (freshMember && freshMember.status === "active") {
        setActiveOrg(activeOrg, freshMember);
        addToast(`Congratulations! Your membership in ${activeOrg?.name || "Cooperative"} has been confirmed. Welcome aboard!`, "success");
        navigate("/dashboard");
      } else if (freshMember && freshMember.status === "rejected") {
        addToast("Notice: Your membership request was declined by the organization administrator.", "error");
      } else {
        addToast("Membership still awaiting administrator approval. Please check back shortly.", "warning");
      }
    } catch (e) {
      console.error(e);
      addToast("Failed to verify membership status.", "error");
    } finally {
      setChecking(false);
    }
  };

  const handleSignOut = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 select-none animate-in fade-in duration-300">
      <div className="max-w-xl w-full flex flex-col gap-6">
        
        {/* Header Branding */}
        <div className="text-center flex flex-col items-center">
          <div className="h-16 w-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 shadow-inner">
            <Clock className="h-8 w-8 animate-pulse" />
          </div>
          <span className="text-[11px] font-mono font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-950/60 px-3 py-1 rounded-full border border-amber-300/60 dark:border-amber-800 max-w-full break-words">
            {t("waitroom.status_badge")}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-display mt-3 tracking-tight break-words">
            {t("waitroom.title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto leading-relaxed break-words">
            {t("waitroom.subtitle", { org: activeOrg?.name || t("public_org.verified_org") })}
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col gap-6 min-w-0">
          
          {/* Target Organization Information */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 min-w-0">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div 
                className="h-12 w-12 rounded-xl flex items-center justify-center font-bold text-white shadow-sm shrink-0"
                style={{ backgroundColor: activeOrg?.primary_color || "#15803D" }}
              >
                <Building2 className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block tracking-wider">
                  {t("nav.org_profile")}
                </span>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white break-words">
                  {activeOrg?.name || "Organization"}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 break-words">
                  {activeOrg?.tagline || activeOrg?.org_category || t("waitroom.status_badge")}
                </p>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-500/20">
              <Lock className="h-3 w-3 shrink-0" />
              <span>{t("common.pending")}</span>
            </div>
          </div>

          {/* Privacy Protocol Notice */}
          <div className="p-4 bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20 rounded-2xl text-xs text-amber-900 dark:text-amber-200 leading-relaxed space-y-2">
            <div className="font-bold flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
              <span>Private Organization Security Policy</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              This organization is configured as <strong>private</strong>. To safeguard internal files, discussions, strategic goals, and financial statements, new registrations remain in this <strong>Wait Room</strong> until an organization administrator or manager reviews and confirms your account.
            </p>
          </div>

          {/* Progress Timeline */}
          <div className="space-y-3">
            <h3 className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400">
              {t("waitroom.what_next")}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-start gap-2.5 min-w-0">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="font-bold text-emerald-900 dark:text-emerald-300">{t("auth.register")}</div>
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-400">{t("common.approved")}</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 flex items-start gap-2.5 min-w-0">
                <Clock className="h-4 w-4 text-amber-600 animate-spin shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="font-bold text-amber-900 dark:text-amber-300">{t("waitroom.status_badge")}</div>
                  <div className="text-[10px] text-amber-700 dark:text-amber-400 break-words">{t("waitroom.step1")}</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-start gap-2.5 opacity-60 min-w-0">
                <LayoutDashboard className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="font-bold text-slate-700 dark:text-slate-300">{t("nav.dashboard")}</div>
                  <div className="text-[10px] text-slate-500 break-words">{t("waitroom.step2")}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Controls */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={handleCheckStatus}
              loading={checking}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs min-h-[40px] flex items-center justify-center gap-2"
            >
              <RotateCw className={`h-3.5 w-3.5 shrink-0 ${checking ? "animate-spin" : ""}`} />
              <span>{t("waitroom.refresh_status")}</span>
            </Button>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap justify-between items-center gap-2 px-2 text-xs text-slate-400">
          <span className="break-words">{t("waitroom.step1")}</span>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1 text-slate-500 hover:text-rose-600 font-semibold transition shrink-0"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            <span>{t("waitroom.sign_out")}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
