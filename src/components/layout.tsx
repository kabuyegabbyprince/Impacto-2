import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Clock,
  Megaphone,
  MessageSquare,
  Vote,
  FolderOpen,
  BarChart3,
  Target,
  Award,
  Coins,
  ShoppingBag,
  Heart,
  FileBarChart,
  Settings,
  Shield,
  Bell,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
  Globe,
  Crown,
  AlertTriangle,
  Send,
  CheckCircle,
  HelpCircle,
  Building2,
  Check,
  Sliders,
  Sparkles,
  PenTool,
  Upload,
  PackageCheck,
  ShieldAlert,
  Compass,
  User
} from "lucide-react";
import { getOrgSubscriptionLifecycle } from "../lib/subscriptionMatrix";
import { useAuthStore } from "../store/authStore";
import { useOrgStore } from "../store/orgStore";
import { useCurrencyStore } from "../store/currencyStore";
import { Avatar, Badge, Button, Input, Card, getLucideIcon, Modal } from "./ui";
import { WorkspaceTour, WorkspaceTourWelcomePrompt, TOUR_STEPS } from "./WorkspaceTour";
import {
  useSubmitSubscriptionPayment,
  useSubmitErrorReport,
  usePlatformAdminData,
  useNews,
  useMeetings,
  useOrganizations,
  useNotificationSends,
  useMemberFees,
  useMembers,
  useUserMemberships,
  useOrgSubscriptionPayments
} from "../hooks/useImpactoData";
import { useToast } from "./Toast";
import { MockDB } from "../lib/mockData";
import { GuiderAssistant } from "./GuiderAssistant";
import { resolveFileUrl } from "../lib/storageService";

// ==========================================
// 1. ORGANIZATIONAL BRANDING INJECTOR
// ==========================================
export const OrgThemeInjector: React.FC = () => {
  const { activeOrg } = useOrgStore();

  useEffect(() => {
    const root = document.documentElement;
    if (activeOrg) {
      root.style.setProperty("--org-primary", activeOrg.primary_color);
      root.style.setProperty("--org-primary-l", activeOrg.primary_color + "1e"); // rgba equivalent or opacity hex
      root.style.setProperty("--org-primary-d", activeOrg.primary_color); // standard fallback
      root.style.setProperty("--org-secondary", activeOrg.secondary_color);
      document.title = `${activeOrg.name} | Impacto`;
      
      // Inject the dashboard theme if it is not "custom"
      if (activeOrg.dashboard_theme === "dark") {
        root.setAttribute("data-theme", "dark");
        localStorage.setItem("theme", "dark");
      } else if (activeOrg.dashboard_theme === "light") {
        root.setAttribute("data-theme", "light");
        localStorage.setItem("theme", "light");
      }
    } else {
      root.style.setProperty("--org-primary", "#15803D"); // Default Impacto Green
      root.style.setProperty("--org-primary-l", "rgba(21, 128, 61, 0.12)");
      root.style.setProperty("--org-primary-d", "#14532D");
      root.style.setProperty("--org-secondary", "#F59E0B");
      document.title = "Impacto";
    }
  }, [activeOrg]);

  return null;
};

// ==========================================
// 2. TOPBAR COMPONENT
// ==========================================
export const Topbar: React.FC<{ onToggleSidebar: () => void; onStartTour?: () => void }> = ({ onToggleSidebar, onStartTour }) => {
  const { user, logout, updateUserLanguage } = useAuthStore();
  const { activeOrg, activeMember, clearOrg, setActiveOrg } = useOrgStore();
  const { data: orgs } = useOrganizations();
  const { data: userMembershipsData } = useUserMemberships(user?.id);
  
  // Combine live query memberships with local fallback ensuring active status
  const userMemberships = React.useMemo(() => {
    if (!user) return [];
    if (userMembershipsData && userMembershipsData.length > 0) {
      return userMembershipsData.filter((m) => m.status === "active");
    }
    return MockDB.getMembers().filter(
      (m) => m.user_id === user.id && m.status === "active"
    );
  }, [user, userMembershipsData]);

  // Keep activeMember synchronized with the latest role in the current active organization
  React.useEffect(() => {
    if (!activeOrg || !user) return;
    const currentMem = userMemberships.find((m) => m.org_id === activeOrg.id);
    if (currentMem && (!activeMember || activeMember.role !== currentMem.role || activeMember.org_id !== activeOrg.id)) {
      setActiveOrg(activeOrg, currentMem);
    }
  }, [activeOrg, user, userMemberships, activeMember, setActiveOrg]);

  const { t, i18n } = useTranslation();
  const [dark, setDark] = useState(() => {
    const currentTheme = localStorage.getItem("theme") || "light";
    return currentTheme === "dark";
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [orgSwitcherOpen, setOrgSwitcherOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [lastNotificationTimestamp, setLastNotificationTimestamp] = useState(() => {
    return localStorage.getItem("last_notification_seen") || "1970-01-01T00:00:00.000Z";
  });
  const navigate = useNavigate();

  const { activeCurrency, setActiveCurrency, setRates } = useCurrencyStore();
  const { addToast } = useToast();
  const { data: platformData } = usePlatformAdminData();

  const { data: news } = useNews(activeOrg?.id);
  const { data: meetings } = useMeetings(activeOrg?.id);
  const { data: notificationSends } = useNotificationSends(activeOrg?.id);
  const { data: memberFees } = useMemberFees(activeOrg?.id);
  const { data: orgSubPayments } = useOrgSubscriptionPayments(activeOrg?.id);

  const rawLogo = activeOrg?.logo_url || (activeOrg?.dashboard_logo && !activeOrg.dashboard_logo.startsWith("icon:") ? activeOrg.dashboard_logo : "");
  const [resolvedHeaderLogo, setResolvedHeaderLogo] = useState<string>("");

  useEffect(() => {
    if (!rawLogo || rawLogo === "/logo.png") {
      setResolvedHeaderLogo("");
      return;
    }
    if (rawLogo.startsWith("http") || rawLogo.startsWith("blob:") || rawLogo.startsWith("data:")) {
      setResolvedHeaderLogo(rawLogo);
      return;
    }
    let active = true;
    resolveFileUrl(rawLogo, "avatars").then((url) => {
      if (active) setResolvedHeaderLogo(url);
    });
    return () => { active = false; };
  }, [rawLogo]);

  const announcementsList = [
    ...(news || []).map((n) => ({
      id: "news-" + n.id,
      type: "news" as const,
      title: n.title,
      summary: n.excerpt,
      time: n.published_at || new Date().toISOString(),
      path: "/dashboard/news",
    })),
    ...(meetings || []).map((m) => ({
      id: "meeting-" + m.id,
      type: "meeting" as const,
      title: `Upcoming Meeting: ${m.title}`,
      summary: `Meeting venue/link at ${m.location}.`,
      time: m.date_time || new Date().toISOString(),
      path: "/dashboard",
    })),
    ...(notificationSends || []).map((ns) => {
      const lower = (ns.body_text || "").toLowerCase();
      const isConfirmed = lower.includes("confirmed") || lower.includes("cleared") || lower.includes("verified") || lower.includes("approved");
      const isRejected = lower.includes("rejected");
      return {
        id: "notif-" + ns.id,
        type: isConfirmed ? ("payment_success" as const) : isRejected ? ("payment_rejected" as const) : ("notification" as const),
        title: isConfirmed ? "Payment / Subscription Approved" : isRejected ? "Payment Proof Rejected" : lower.includes("submitted") ? "Payment Slip Submitted" : "Cooperative Update",
        summary: ns.body_text || "Notice dispatched",
        time: ns.created_at || new Date().toISOString(),
        path: lower.includes("subscription") || lower.includes("package") ? "/dashboard/settings?tab=subscription" : "/dashboard/fees",
      };
    }),
    ...(orgSubPayments || []).filter(p => p.status === "approved" || p.status === "rejected").map((p) => {
      const isPkg = p.package_id || p.item_type === "package" || (p.plan || "").toLowerCase().includes("package");
      const isApproved = p.status === "approved";
      return {
        id: `sub-payment-notif-${p.id}-${p.status}`,
        type: isApproved ? ("payment_success" as const) : ("payment_rejected" as const),
        title: isApproved 
          ? (isPkg ? "🎉 Add-On Package Activated!" : "🎉 Subscription Approved & Active!")
          : "⚠️ Subscription Payment Rejected",
        summary: isApproved
          ? `${p.plan || "Plan"} payment of ${(p.amount_local || 0).toLocaleString()} RWF (Ref: ${p.reference || p.transaction_reference || "TXN"}) was verified. All features active.`
          : `${p.plan || "Plan"} proof of ${(p.amount_local || 0).toLocaleString()} RWF was rejected. Notes: ${p.audit_notes || "Please check transaction details and resubmit."}`,
        time: p.validated_at || p.audited_at || p.submitted_at || new Date().toISOString(),
        path: "/dashboard/settings?tab=subscription",
      };
    }),
    ...(memberFees || []).filter(f => f.status === "paid" || f.status === "pending_confirmation").map((f) => ({
      id: "fee-status-" + f.id + "-" + (f.paid_at || f.reported_at || f.status),
      type: f.status === "paid" ? ("payment_success" as const) : ("payment_pending" as const),
      title: f.status === "paid"
        ? `Payment Cleared: ${f.member_name}`
        : `Slip Pending Review: ${f.member_name}`,
      summary: f.status === "paid"
        ? `${f.amount.toLocaleString()} RWF for ${f.payment_period.toUpperCase()} (${f.period_date}) verified and confirmed by accountant.`
        : `Slip submitted for ${f.amount.toLocaleString()} RWF (${f.payment_period.toUpperCase()}). Pending verification.`,
      time: f.paid_at || f.reported_at || f.created_at || new Date().toISOString(),
      path: "/dashboard/fees",
    }))
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const hasNewNotification = announcementsList.length > 0 && 
    new Date(announcementsList[0].time).getTime() > new Date(lastNotificationTimestamp).getTime();

  useEffect(() => {
    if (platformData?.settings) {
      setRates({
        USD_to_RWF: Number(platformData.settings.usd_to_rwf_rate) || 1300,
        EUR_to_RWF: Number(platformData.settings.eur_to_rwf_rate) || 1400,
        KES_to_RWF: Number(platformData.settings.kes_to_rwf_rate) || 10,
      });
    }
  }, [platformData, setRates]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    const nextTheme = next ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("theme", nextTheme);
  };

  const handleLanguageSwitch = (lng: "en" | "fr" | "rw") => {
    updateUserLanguage(lng);
    const langNames = { en: "English", fr: "Français", rw: "Ikinyarwanda" };
    addToast(
      lng === "rw"
        ? `Ururimi rwawe rwahinduwe kuri ${langNames[lng]} (Bitabangamiye abandi banyamuryango).`
        : lng === "fr"
        ? `Votre langue personnelle a été définie sur ${langNames[lng]} (sans affecter les autres).`
        : `Your personal interface language has been set to ${langNames[lng]}.`,
      "info"
    );
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between px-4 sm:px-6 z-40 shrink-0 select-none shadow-3xs">
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Brand Logo / Icon */}
        <Link to="/" className="flex items-center gap-2 group" onClick={() => clearOrg()}>
          {activeOrg?.dashboard_logo && !activeOrg.dashboard_logo.startsWith("http") && !activeOrg.dashboard_logo.startsWith("/") && activeOrg.dashboard_logo.startsWith("icon:") ? (
            (() => {
              const IconComponent = getLucideIcon(activeOrg.dashboard_logo.substring(5));
              return IconComponent ? (
                <IconComponent className="h-7 w-7 text-[#156c45] dark:text-emerald-400 shrink-0" />
              ) : (
                <svg className="h-7 w-7 text-[#156c45] dark:text-emerald-400 shrink-0" viewBox="0 0 100 100" fill="none">
                  <circle cx="50" cy="35" r="25" stroke="currentColor" strokeWidth="8" />
                  <circle cx="35" cy="65" r="25" stroke="currentColor" strokeWidth="8" />
                  <circle cx="65" cy="65" r="25" stroke="currentColor" strokeWidth="8" />
                </svg>
              );
            })()
          ) : resolvedHeaderLogo ? (
            <img 
              id="org-header-logo-img"
              src={resolvedHeaderLogo} 
              alt={activeOrg?.name || "Logo"} 
              className="h-8 max-w-[120px] shrink-0 object-contain rounded"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <svg className="h-7 w-7 text-[#156c45] dark:text-emerald-400 shrink-0" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="35" r="25" stroke="currentColor" strokeWidth="8" />
              <circle cx="35" cy="65" r="25" stroke="currentColor" strokeWidth="8" />
              <circle cx="65" cy="65" r="25" stroke="currentColor" strokeWidth="8" />
              <polygon points="53,48 47,48 50,42" fill="#F59E0B" />
            </svg>
          )}
          <span className="font-display font-extrabold text-lg tracking-tight text-slate-900 dark:text-white hidden sm:inline">
            {activeOrg ? activeOrg.name : <>Impact<span className="text-[#156c45] dark:text-emerald-500 font-black">o</span></>}
          </span>
        </Link>

        {activeOrg && (
          <div className="hidden xs:flex items-center gap-2 relative">
            <span className="text-slate-300 dark:text-slate-700 font-light font-sans">/</span>
            <button
              id="tour-org-switcher"
              data-tour="org-switcher"
              onClick={() => setOrgSwitcherOpen(!orgSwitcherOpen)}
              className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 border border-slate-200/60 dark:border-slate-700/60 transition flex items-center gap-1.5 font-sans cursor-pointer focus:outline-none"
            >
              <span className="truncate max-w-[130px]">{activeOrg.name}</span>
              {userMemberships.length > 1 && (
                <svg className={`h-3 w-3 transition-transform ${orgSwitcherOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full select-none font-mono bg-emerald-50 text-[#156c45] border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50">
              {activeOrg.subscription_status === "active" ? "MASTER WORKSPACE" : activeOrg.subscription_status === "expired" ? "RENEWAL DUE" : "FREE PLAN"}
            </span>

            {orgSwitcherOpen && userMemberships.length > 1 && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOrgSwitcherOpen(false)} />
                <div className="absolute left-3 top-8 w-56 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl py-1.5 z-50 text-xs overflow-hidden">
                  <div className="px-3 py-1.5 border-b border-gray-100 dark:border-slate-750 font-mono text-[9px] uppercase tracking-wider text-gray-400 font-bold">
                    Switch Workspace ({userMemberships.length})
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {userMemberships.map((row) => {
                      const org = orgs?.find((o) => o.id === row.org_id) || MockDB.getOrgs().find((o) => o.id === row.org_id);
                      if (!org) return null;
                      const isCurrent = org.id === activeOrg.id;
                      return (
                        <button
                          key={row.id}
                          onClick={() => {
                            setOrgSwitcherOpen(false);
                            setActiveOrg(org, row);
                            addToast(`Switched to workspace: ${org.name}`, "success");
                            navigate("/dashboard");
                          }}
                          className={`w-full text-left px-3.5 py-2.5 flex flex-col gap-0.5 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-gray-50 dark:border-slate-800/50 last:border-0 transition cursor-pointer ${
                            isCurrent ? "bg-emerald-50/30 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400 font-bold" : "text-gray-700 dark:text-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="truncate max-w-[150px]">{org.name}</span>
                            {isCurrent && <span className="text-[9px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 px-1 py-0.2 rounded font-mono font-bold uppercase scale-90">Active</span>}
                          </div>
                          <span className="text-[9px] text-gray-400 font-mono">@{org.slug} • {row.role === "org_admin" ? "Admin" : "Member"}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="p-1 border-t border-gray-100 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-900/10">
                    <button
                      onClick={() => {
                        setOrgSwitcherOpen(false);
                        clearOrg();
                        navigate("/org-picker");
                      }}
                      className="w-full text-center py-1.5 font-bold hover:text-emerald-600 dark:hover:text-emerald-400 text-[10px] text-gray-500 uppercase tracking-wide flex items-center justify-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition cursor-pointer"
                    >
                      Workspace Directory ➜
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Currency Switcher */}
        <div className="relative flex items-center">
          <button
            id="tour-currency-selector"
            data-tour="currency"
            type="button"
            onClick={() => {
              setCurrencyOpen(!currencyOpen);
              setLangMenuOpen(false);
              setUserMenuOpen(false);
              setNotificationOpen(false);
              setOrgSwitcherOpen(false);
            }}
            className="flex items-center gap-1.5 px-2.5 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 transition h-8.5 cursor-pointer shadow-3xs whitespace-nowrap"
          >
            <Coins className="h-3.5 w-3.5 text-[#156c45] dark:text-emerald-400 shrink-0" />
            <span>{activeCurrency}</span>
          </button>
          {currencyOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setCurrencyOpen(false)} />
              <div className="absolute right-0 top-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl w-36 overflow-hidden shrink-0 z-50 py-1">
                <div className="px-2.5 py-1.5 border-b text-[9px] uppercase tracking-wider font-mono text-slate-400 font-bold dark:border-slate-700">
                  Active Currency
                </div>
                {(["RWF", "USD", "EUR", "KES"] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setActiveCurrency(code);
                      setCurrencyOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-750 transition cursor-pointer ${
                      activeCurrency === code ? "text-[#156c45] dark:text-emerald-400 font-bold bg-slate-50 dark:bg-slate-750" : "text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <span>{code === "USD" ? "USD ($)" : code === "EUR" ? "EUR (€)" : code === "KES" ? "KES (KES)" : "RWF (RWF)"}</span>
                    {activeCurrency === code && <span className="h-1.5 w-1.5 rounded-full bg-[#156c45] dark:bg-emerald-400" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Language switch */}
        <div className="relative flex items-center">
          <button
            id="tour-lang-selector"
            data-tour="language"
            type="button"
            onClick={() => {
              setLangMenuOpen(!langMenuOpen);
              setCurrencyOpen(false);
              setUserMenuOpen(false);
              setNotificationOpen(false);
              setOrgSwitcherOpen(false);
            }}
            aria-label="Personal Language and Accessibility Selector"
            title="Choose your personal language preference"
            className="flex items-center gap-1.5 px-2.5 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 transition h-8.5 cursor-pointer shadow-3xs"
          >
            <Globe className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider">
              {(i18n.language || "en").substring(0, 2)}
            </span>
          </button>
          {langMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setLangMenuOpen(false)} />
              <div className="absolute right-0 top-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl w-52 overflow-hidden shrink-0 z-50 py-1">
                <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                    Personal Language
                  </span>
                </div>
                {[
                  { code: "en", label: "English", native: "English", flag: "🇬🇧" },
                  { code: "rw", label: "Kinyarwanda", native: "Ikinyarwanda", flag: "🇷🇼" },
                  { code: "fr", label: "Français", native: "Français", flag: "🇫🇷" },
                ].map((item) => {
                  const isSelected = (i18n.language || "en").startsWith(item.code);
                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => {
                        handleLanguageSwitch(item.code as any);
                        setLangMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between transition cursor-pointer ${
                        isSelected
                          ? "bg-emerald-50/80 dark:bg-emerald-950/30 text-[#156c45] dark:text-emerald-300 font-bold"
                          : "text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{item.flag}</span>
                        <div className="flex flex-col">
                          <span>{item.native}</span>
                          <span className="text-[10px] text-slate-400">{item.label}</span>
                        </div>
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 text-[#156c45] dark:text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
          className="w-8.5 h-8.5 rounded-xl flex items-center justify-center bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 transition cursor-pointer shadow-3xs"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Notifications */}
        {activeOrg && (
          <div className="relative">
            <button
              onClick={() => {
                setNotificationOpen(!notificationOpen);
                const now = new Date().toISOString();
                localStorage.setItem("last_notification_seen", now);
                setLastNotificationTimestamp(now);
              }}
              aria-label="Notifications"
              className="w-8.5 h-8.5 rounded-xl flex items-center justify-center bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 transition cursor-pointer relative shadow-3xs"
            >
              <Bell className="h-4 w-4" />
              {hasNewNotification && (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>

            {notificationOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotificationOpen(false)} />
                <div className="absolute right-0 top-10 w-80 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl py-3.5 z-50 text-sm shrink-0 flex flex-col gap-2">
                  <div className="px-4 pb-2 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                    <span className="font-bold text-gray-950 dark:text-white">Announcements & Notices</span>
                    <Badge color={hasNewNotification ? "red" : "blue"}>{hasNewNotification ? "New" : "All Read"}</Badge>
                  </div>

                  <div className="max-h-72 overflow-y-auto px-2 flex flex-col gap-1.5">
                    {announcementsList.length > 0 ? (
                      announcementsList.map((ann) => (
                        <button
                          key={ann.id}
                          onClick={() => {
                            setNotificationOpen(false);
                            navigate(ann.path);
                          }}
                          className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-755 transition flex items-start gap-3 border border-transparent hover:border-slate-100 dark:hover:border-slate-700 leading-tight"
                        >
                          <div className={`p-2 rounded-lg shrink-0 ${
                            ann.type === "payment_success"
                              ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40"
                              : ann.type === "payment_rejected"
                                ? "bg-rose-100 text-rose-600 dark:bg-rose-950/40"
                                : ann.type === "payment_pending"
                                  ? "bg-amber-100 text-amber-600 dark:bg-amber-950/40"
                                  : ann.type === "news"
                                    ? "bg-amber-100 text-amber-600 dark:bg-amber-950/40"
                                    : "bg-blue-100 text-blue-600 dark:bg-blue-950/40"
                          }`}>
                            {ann.type === "payment_success" ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : ann.type === "payment_rejected" ? (
                              <AlertTriangle className="h-4 w-4" />
                            ) : ann.type === "news" ? (
                              <Megaphone className="h-4 w-4" />
                            ) : (
                              <Clock className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex flex-col gap-1 min-w-0">
                            <span className="font-bold text-xs text-gray-900 dark:text-white truncate">{ann.title}</span>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">{ann.summary}</span>
                            <span className="text-[9px] text-gray-400 font-mono mt-0.5">{new Date(ann.time).toLocaleDateString()}</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="py-8 text-center text-xs text-gray-450 font-semibold gap-1.5 flex flex-col items-center">
                        <Bell className="h-6 w-6 text-gray-400" />
                        <span>No announcements posted yet.</span>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-gray-100 dark:border-slate-700 pt-2.5 px-3.5 flex justify-between select-none">
                    <button
                      onClick={() => {
                        setNotificationOpen(false);
                        navigate("/dashboard/news");
                      }}
                      className="text-[11px] text-emerald-600 hover:underline font-bold"
                    >
                      View all news →
                    </button>
                    <button
                      onClick={() => {
                        setNotificationOpen(false);
                        navigate("/dashboard/chat");
                      }}
                      className="text-[11px] text-gray-400 hover:underline font-bold"
                    >
                      Open Chat Rooms
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Profile Avatar Menu */}
        {user ? (
          <div className="relative">
            <button
              id="tour-profile"
              data-tour="profile"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 hover:opacity-90 outline-none"
            >
              <Avatar name={user.full_name} size="xs" />
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 top-10 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl py-2 z-50 overflow-hidden text-sm shrink-0">
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-700">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                      {user.full_name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>

                  <Link
                    to="/dashboard/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="w-full text-left px-4 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 flex items-center gap-2 text-xs font-semibold"
                  >
                    <User className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    {t("nav.my_profile", "My Profile")}
                  </Link>

                  {user.is_superadmin && (
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate("/platform/admin");
                      }}
                      className="w-full text-left px-4 py-2 text-xs flex items-center gap-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                    >
                      <Shield className="h-3.5 w-3.5" />
                      {t("nav.platform_admin")}
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onStartTour?.();
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 flex items-center gap-2 text-xs font-semibold"
                  >
                    <Compass className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    Workspace Tour
                  </button>

                  <a
                    href="/app/impacto.apk"
                    download="impacto.apk"
                    onClick={() => setUserMenuOpen(false)}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 text-xs"
                  >
                    Get Apk
                  </a>

                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      clearOrg();
                      navigate("/org-picker");
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300"
                  >
                    Switch Organization
                  </button>

                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      const slug = activeOrg?.slug || "workspace";
                      logout();
                      window.location.href = `https://impacto-landing.vercel.app/@${slug}`;
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 flex items-center gap-2 border-t border-gray-100 dark:border-slate-700 font-semibold"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    {t("auth.logout")}
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <Link to="/login" className="text-xs font-semibold hover:underline text-gray-500">
            Sign In
          </Link>
        )}
      </div>

      <></>
    </header>
  );
};

// ==========================================
// 3. SIDEBAR COMPONENT
// ==========================================
export const Sidebar: React.FC<{ isOpen: boolean; onClose: () => void; onStartTour?: () => void }> = ({ isOpen, onClose, onStartTour }) => {
  const { t } = useTranslation();
  const { activeOrg, activeMember } = useOrgStore();
  const { user } = useAuthStore();
  const location = useLocation();
  const { data: members } = useMembers(activeOrg?.id);

  const isAdmin = activeMember?.role === "org_admin" || !!user?.is_superadmin;
  const isAccountant = (activeMember?.role as string) === "accountant" || !!user?.is_superadmin;
  const isStaff = (activeMember?.role as string) === "org_admin" || (activeMember?.role as string) === "manager" || (activeMember?.role as string) === "accountant" || !!user?.is_superadmin;

  const workspaceNav = [
    { name: t("nav.dashboard"), path: "/dashboard", icon: LayoutDashboard },
    { name: t("nav.news"), path: "/dashboard/news", icon: Megaphone },
    { name: t("nav.chat"), path: "/dashboard/chat", icon: MessageSquare },
    { name: t("nav.events"), path: "/dashboard/events", icon: Calendar },
    { name: t("nav.goals"), path: "/dashboard/goals", icon: Target },
    { name: t("nav.documents"), path: "/dashboard/documents", icon: FolderOpen },
    { name: "Member Fees", path: "/dashboard/fees", icon: Coins },
    ...(activeOrg?.marketplace_enabled !== false
      ? [{ name: "Marketplace", path: "/dashboard/marketplace", icon: ShoppingBag }]
      : [])
  ];

  const managementNav = [
    { name: "Organization Profile", path: "/dashboard/org-profile", icon: Building2, allowed: true },
    { name: t("nav.members"), path: "/dashboard/members", icon: Users, allowed: isStaff },
    { name: "Asset & Stock Management", path: "/dashboard/assets", icon: PackageCheck, allowed: isStaff },
    { name: t("nav.ledger"), path: "/dashboard/ledger", icon: Coins, allowed: isAccountant },
    { name: t("nav.grants"), path: "/dashboard/grants", icon: Award, allowed: isAccountant },
    { name: t("nav.reports"), path: "/dashboard/reports", icon: FileBarChart, allowed: isAdmin },
    { name: t("nav.settings", "Workspace Settings"), path: "/dashboard/settings", icon: Settings, allowed: isAdmin },
  ].filter(item => item.allowed);

  return (
    <>
      {/* Sidebar background shade on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 blur-xs md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-14 left-0 bottom-0 w-56 bg-white dark:bg-slate-900 border-r border-gray-200/80 dark:border-slate-800 z-50 transition-transform duration-200 shrink-0 md:translate-x-0 flex flex-col justify-between ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col justify-between p-3 select-none overflow-y-auto">
          <div className="flex flex-col gap-5 w-full">
            {/* Workspace section */}
            <div id="tour-nav-workspace" data-tour="nav-workspace">
              <div className="px-3 pb-1 text-[10px] font-mono uppercase font-bold tracking-wider text-gray-400 dark:text-slate-500">
                Workspace
              </div>
              <nav className="flex flex-col gap-0.5 mt-1">
                {workspaceNav.map((item) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-150 ${
                        isActive
                          ? "bg-[#e8f5ee] dark:bg-emerald-950/40 text-[#156c45] dark:text-emerald-400 font-bold shadow-2xs"
                          : "text-gray-600 hover:text-[#156c45] hover:bg-[#e8f5ee]/40 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-emerald-400"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? "text-[#156c45] dark:text-emerald-400" : "text-gray-400 dark:text-slate-500"}`} />
                        <span className="truncate">{item.name}</span>
                      </div>
                      {isActive && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#156c45] dark:bg-emerald-400 shrink-0" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Management section */}
            {managementNav.length > 0 && (
              <div id="tour-nav-management" data-tour="nav-management">
                <div className="px-3 pb-1 text-[10px] font-mono uppercase font-bold tracking-wider text-gray-400 dark:text-slate-500">
                  {isAdmin || isStaff || isAccountant ? "Management & Settings" : "Profile & Settings"}
                </div>
                <nav className="flex flex-col gap-0.5 mt-1">
                  {managementNav.map((item) => {
                    const isActive =
                      item.path === "/dashboard/settings"
                        ? location.pathname === "/dashboard/settings"
                        : location.pathname === item.path;
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={onClose}
                        className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-150 ${
                          isActive
                            ? "bg-[#e8f5ee] dark:bg-emerald-950/40 text-[#156c45] dark:text-emerald-400 font-bold shadow-2xs"
                            : "text-gray-600 hover:text-[#156c45] hover:bg-[#e8f5ee]/40 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-emerald-400"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? "text-[#156c45] dark:text-emerald-400" : "text-gray-400 dark:text-slate-500"}`} />
                          <span className="truncate">{item.name}</span>
                        </div>
                        {isActive && (
                          <span className="h-1.5 w-1.5 rounded-full bg-[#156c45] dark:bg-emerald-400 shrink-0" />
                        )}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            )}
          </div>

          <div className="mt-6 pt-3 border-t border-gray-100 dark:border-slate-800 shrink-0 flex flex-col gap-2.5">
            {/* User Profile Card footer widget */}
            {user && (
              <Link
                to="/dashboard/profile"
                onClick={onClose}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-[#e8f5ee]/70 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 transition group text-left shadow-3xs"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Avatar name={user.full_name || user.email} size="sm" src={user.avatar_url} />
                  <div className="flex flex-col truncate">
                    <span className="text-xs font-bold text-gray-800 dark:text-slate-200 truncate group-hover:text-[#156c45] dark:group-hover:text-emerald-400">
                      {user.full_name || user.email.split("@")[0]}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono capitalize">
                      {activeMember?.role?.replace("_", " ") || "Member"}
                    </span>
                  </div>
                </div>
                <User className="h-3.5 w-3.5 text-gray-400 group-hover:text-[#156c45] dark:group-hover:text-emerald-400 shrink-0" />
              </Link>
            )}

            {onStartTour && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartTour();
                }}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/70 dark:border-emerald-800/60 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 transition cursor-pointer shadow-3xs"
              >
                <Compass className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 animate-spin-slow" />
                <span>Take Workspace Tour</span>
              </button>
            )}
            <div className="px-2 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-tight text-gray-900 dark:text-white block font-display">
                  Impact<span className="text-[#156c45] dark:text-[#22c06b] font-black">o</span> Suite
                </span>
                <span className="text-[9px] text-gray-400 font-mono block">v1.0.1 • 2026</span>
              </div>
              <span className="h-2 w-2 rounded-full bg-[#22c06b] ring-4 ring-[#22c06b]/20 shrink-0" title="Connected" />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

// ==========================================
// 4. MAIN DASHBOARD LAYOUT COMPONENT WITH EXPIRED SHIELD
// ==========================================
export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { activeOrg, activeMember, setActiveOrg } = useOrgStore();
  const { user } = useAuthStore();
  const { activeCurrency, formatAmount, convertToRWF } = useCurrencyStore();
  const { addToast } = useToast();

  const { data: platformData, refetch: refetchSaas } = usePlatformAdminData();

  // Synchronize active organization status in real-time
  useEffect(() => {
    if (activeOrg && platformData?.orgs) {
      const dbOrg = platformData.orgs.find(o => o.id === activeOrg.id);
      if (dbOrg) {
        const statusChanged = dbOrg.subscription_status !== activeOrg.subscription_status;
        const endsAtChanged = dbOrg.subscription_ends_at !== activeOrg.subscription_ends_at;
        const tierChanged = dbOrg.subscription_tier !== activeOrg.subscription_tier;
        const nameChanged = dbOrg.name !== activeOrg.name;
        
        if (statusChanged || endsAtChanged || tierChanged || nameChanged) {
          setActiveOrg(dbOrg, activeMember);
          if (activeOrg.subscription_status !== "active" && dbOrg.subscription_status === "active") {
            addToast(`Your cooperative workspace "${dbOrg.name}" has been approved and unlocked in real-time!`, "success");
          } else {
            addToast(`Cooperative Workspace workspace configuration updated in real-time.`, "info");
          }
        }
      }
    }
  }, [platformData?.orgs, activeOrg?.id, activeOrg?.subscription_status, activeOrg?.subscription_ends_at, activeOrg?.subscription_tier, activeOrg?.name, activeMember, setActiveOrg, addToast]);
  const submitPaymentMutation = useSubmitSubscriptionPayment();
  const supportMutation = useSubmitErrorReport();

  const [supportText, setSupportText] = useState("");
  const [momoPhone, setMomoPhone] = useState("");
  const [momoRef, setMomoRef] = useState("");
  const [smsProof, setSmsProof] = useState("");
  const [selectedTier, setSelectedTier] = useState("Growth Plan - $25/month");
  
  const [alertNotify, setAlertNotify] = useState(false);
  const [paySuccessAlert, setPaySuccessAlert] = useState("");
  const [supportSuccessAlert, setSupportSuccessAlert] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [sendingSupport, setSendingSupport] = useState(false);

  // Interactive Tour State & Lifecycle
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [currentTourStep, setCurrentTourStep] = useState(0);
  const [showWelcomePrompt, setShowWelcomePrompt] = useState(false);

  useEffect(() => {
    if (!user) return;
    const seenKey = `impacto_tour_seen_${user.id}`;
    const hasSeen = localStorage.getItem(seenKey);
    if (!hasSeen) {
      const timer = setTimeout(() => {
        setShowWelcomePrompt(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleStartTour = (stepIndex = 0) => {
    setCurrentTourStep(stepIndex);
    setIsTourOpen(true);
    setShowWelcomePrompt(false);
  };

  const handleCloseTour = () => {
    setIsTourOpen(false);
    if (user) {
      localStorage.setItem(`impacto_tour_seen_${user.id}`, "true");
    }
  };

  const handleDismissPrompt = () => {
    setShowWelcomePrompt(false);
    if (user) {
      localStorage.setItem(`impacto_tour_seen_${user.id}`, "true");
    }
  };

  // New state variables for lockout / recommendation flows
  const [memberSupportMsg, setMemberSupportMsg] = useState("");
  const [memberSupportSuccess, setMemberSupportSuccess] = useState("");
  const [recommendSuccess, setRecommendSuccess] = useState("");

  const platformSettings = platformData?.settings || {
    usd_to_rwf_rate: 1300,
    mtn_payment_number: "0788100100",
    airtel_payment_number: "0733100100",
    payment_name: "VIRELLIX INC"
  };

  const { data: orgMembersData } = useMembers(activeOrg?.id);
  const activeMembersCount = orgMembersData?.filter((m: any) => m.status === "active").length || 0;
  const lifecycle = getOrgSubscriptionLifecycle(activeOrg, activeMembersCount);

  const isAdmin = activeMember?.role === "org_admin";
  const isBlocked = (() => {
    if (!activeOrg) return false;
    // Explicit lockout by platform admin
    if (activeOrg.subscription_status === "expired") return true;

    // Free Forever plan does not expire
    if (activeOrg.subscription_tier === "free") return false;

    // Per Section 1 specification: transitioning to Free preserves all records safely.
    // Organizations are not completely locked out of their records upon trial completion.
    return false;
  })();

  const handlePayLockout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsProof) {
      addToast("Please provide the payment text/message receipt to alert Superadmin.", "error");
      return;
    }

    setSubmittingPayment(true);
    try {
      const rate = platformSettings.usd_to_rwf_rate || 1350;
      let costUsd = 25;
      if (selectedTier.includes("Free")) costUsd = 0;
      else if (selectedTier.includes("Growth")) costUsd = 25;
      else if (selectedTier.includes("Pro")) costUsd = 40;
      else if (selectedTier.includes("Enterprise")) costUsd = 80;

      const randomRef = "TXN" + Math.floor(100000000 + Math.random() * 900000000);
      const isMtn = momoPhone ? (momoPhone.startsWith("078") || momoPhone.startsWith("079")) : true;

      await submitPaymentMutation.mutateAsync({
        org_id: activeOrg?.id || "",
        plan: selectedTier,
        amount_usd: costUsd,
        amount_local: costUsd * rate,
        method: isMtn ? "mtn" : "airtel",
        phone: momoPhone || "N/A",
        reference: momoRef || randomRef,
        proof_url: smsProof
      });

      setPaySuccessAlert("Invoice proof dispatched! Platform Superadmin notified to verify and unlock licenses.");
      setMomoPhone("");
      setMomoRef("");
      setSmsProof("");
      refetchSaas();
    } catch (err) {
      console.error(err);
      addToast("Failed to submit payment details. Please retry.", "error");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleSubmitMemberPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsProof) {
      addToast("Please provide the payment text/message receipt to alert Superadmin.", "error");
      return;
    }

    setSubmittingPayment(true);
    try {
      const rate = platformSettings.usd_to_rwf_rate || 1350;
      let costUsd = 25;
      if (selectedTier.includes("Free")) costUsd = 0;
      else if (selectedTier.includes("Growth")) costUsd = 25;
      else if (selectedTier.includes("Pro")) costUsd = 40;
      else if (selectedTier.includes("Enterprise")) costUsd = 80;

      const randomRef = "TXN" + Math.floor(100000000 + Math.random() * 900000000);
      const isMtn = momoPhone ? (momoPhone.startsWith("078") || momoPhone.startsWith("079")) : true;

      await submitPaymentMutation.mutateAsync({
        org_id: activeOrg?.id || "",
        plan: selectedTier,
        amount_usd: costUsd,
        amount_local: costUsd * rate,
        method: isMtn ? "mtn" : "airtel",
        phone: momoPhone || "N/A",
        reference: momoRef || randomRef,
        proof_url: smsProof
      });

      // Save local recommendation too
      const existingRecs = localStorage.getItem(`plan_recs_${activeOrg?.id}`);
      const recs = existingRecs ? JSON.parse(existingRecs) : [];
      recs.push({
        user: user?.full_name || "Cooperative Member",
        tier: selectedTier,
        date: new Date().toISOString()
      });
      localStorage.setItem(`plan_recs_${activeOrg?.id}`, JSON.stringify(recs));

      setRecommendSuccess(`Success! Payment proof and recommendation for "${selectedTier}" submitted successfully! Platform Superadmin has been notified to verify the logs and unlock your workspace.`);
      setMomoPhone("");
      setMomoRef("");
      setSmsProof("");
      refetchSaas();
    } catch (err) {
      console.error(err);
      addToast("Failed to submit payment details. Please retry.", "error");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleSupportLockout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportText.trim()) return;

    setSendingSupport(true);
    try {
      await supportMutation.mutateAsync({
        org_id: activeOrg?.id || "",
        title: "Incident Lockout Direct Comment",
        description: supportText,
        priority: "critical",
        screenshot_url: "Lockout direct line"
      });
      setSupportText("");
      setSupportSuccessAlert("Direct support comments successfully saved and escalated!");
    } catch (err) {
      console.error(err);
    } finally {
      setSendingSupport(false);
    }
  };

  // If blocked (30-day trial limit finished or subscription expired), block all users out
  if (isBlocked) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col pt-14 text-sm select-none font-sans">
        <OrgThemeInjector />
        <Topbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <div className="flex-1 max-w-4xl mx-auto p-4 md:p-8 flex flex-col gap-6 justify-center items-center w-full my-auto animate-in zoom-in-95">
          <div className="text-center flex flex-col items-center gap-2 mb-2 select-none">
            <div className="h-16 w-16 bg-red-100 border border-red-200 text-red-600 flex items-center justify-center rounded-3xl shrink-0 shadow-lg mb-2">
              <AlertTriangle className="h-8 w-8 shrink-0 animate-bounce" />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold font-display leading-none tracking-tight text-gray-901">
              Workspace Access Paused
            </h1>
            <p className="text-xs text-gray-400 font-medium">
              The active licensing subscription plan or 30-day trial for <span className="text-emerald-750 font-bold">@{activeOrg?.slug}</span> has hit its limit.
            </p>
          </div>
          
          {isAdmin ? (
            // ADMIN LICENSE UPGRADE & ESCALATION CONTROL HUB
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full font-medium">
              <Card title="Recommend Plan Tier Upgrade & Subscriptions">
                {paySuccessAlert ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-150 text-[11px] text-emerald-800 font-semibold rounded-lg flex flex-col gap-2 leading-relaxed">
                    <span className="font-bold flex items-center gap-1.5"><CheckCircle className="h-4 w-4 shrink-0" /> Receipt Sent</span>
                    <p>{paySuccessAlert}</p>
                  </div>
                ) : (
                  <form onSubmit={handlePayLockout} className="flex flex-col gap-3 text-xs font-semibold text-gray-700">
                    <p className="text-gray-500 font-normal leading-normal text-[11px] mb-1">
                      Select a recommended plan to update your workspace license, then pay via Mobile Money.
                    </p>

                    <div className="bg-amber-50/50 border border-amber-250 p-2.5 rounded-lg text-[10px] text-amber-950 font-mono flex flex-col leading-5 select-none">
                      <span className="font-bold uppercase tracking-wider text-amber-800 mb-1 text-[9px]">Platform Transfer Targets</span>
                      <span>MTN: <span className="font-extrabold">{platformSettings.mtn_payment_number}</span> ({platformSettings.payment_name})</span>
                      <span>Airtel: <span className="font-extrabold">{platformSettings.airtel_payment_number}</span> ({platformSettings.payment_name})</span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase text-gray-400 font-mono tracking-wider font-bold">Select Active Tier</label>
                      <select
                        value={selectedTier}
                        onChange={(e) => setSelectedTier(e.target.value)}
                        className="w-full text-xs rounded-lg border bg-white border-gray-305 px-3 py-2 text-stone-800 select-none focus:ring-1 focus:ring-emerald-500 font-semibold dark:bg-slate-900 dark:border-slate-705 dark:text-slate-100"
                      >
                        <option value="Free Forever Plan - $0/month">Free Forever Plan — $0</option>
                        <option value="Growth Plan - $25/month">Growth Tier — $25 ({(25 * platformSettings.usd_to_rwf_rate).toLocaleString()} RWF / {formatAmount(convertToRWF(25, 'USD'))})</option>
                        <option value="Pro Plan - $40/month">Pro Plan — $40 ({(40 * platformSettings.usd_to_rwf_rate).toLocaleString()} RWF / {formatAmount(convertToRWF(40, 'USD'))})</option>
                        <option value="Enterprise Plan - Custom">Enterprise Plan — Custom / Contact Sales</option>
                      </select>
                    </div>

                    <Input label="MoMo Payer Phone Number (Optional)" value={momoPhone} onChange={(e) => setMomoPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="078XXXXXXX" />
                    <Input label="MoMo / Airtel Ref ID Key (Optional)" value={momoRef} onChange={(e) => setMomoRef(e.target.value)} placeholder="TXNXXXXXXX" />

                    <div className="flex flex-col gap-1 w-full">
                      <label className="text-[10px] uppercase text-emerald-800 font-mono tracking-wider font-bold">Payment SMS Message / Proof of Transfer <span className="text-red-500">*</span></label>
                      <textarea
                        className="w-full text-xs rounded-lg border bg-white border-gray-350 p-2.5 h-20 bg-slate-50/20 text-stone-900 font-sans focus:ring-1 focus:ring-emerald-500"
                        value={smsProof}
                        onChange={(e) => setSmsProof(e.target.value)}
                        required
                        placeholder="Paste transaction SMS or write details e.g. 'Paid 32,500 RWF for Growth tier from John'. Admin will verify later."
                      />
                    </div>

                    <Button type="submit" loading={submittingPayment} className="w-full py-2.5 mt-2">
                      Submit Plan Upgrade & Proof
                    </Button>
                  </form>
                )}
              </Card>

              <Card title="Contact Platform Superadmin Direct Line">
                {supportSuccessAlert ? (
                  <div className="p-3 bg-emerald-55/10 border border-emerald-500/25 text-emerald-800 text-[11px] font-semibold rounded-lg flex flex-col gap-1.5 leading-relaxed">
                    <span className="font-bold flex items-center gap-1.5"><CheckCircle className="h-4 w-4 shrink-0" /> Conversation Log Update</span>
                    {supportSuccessAlert}
                  </div>
                ) : (
                  <form onSubmit={handleSupportLockout} className="flex flex-col gap-4 text-xs font-semibold text-gray-700">
                    <p className="text-gray-500 font-normal leading-normal text-[11px]">
                      Stuck or experiencing confirmation lags? Text platform superadmin directly below.
                    </p>

                    <div className="flex flex-col gap-1.5 w-full">
                      <label className="text-[10px] uppercase text-gray-400 font-mono tracking-wider font-bold">Write support ticket message or just talk</label>
                      <textarea
                        className="w-full text-xs rounded-lg border bg-white border-gray-305 p-3 h-28 bg-slate-50/20 text-stone-900 font-sans"
                        value={supportText}
                        onChange={(e) => setSupportText(e.target.value)}
                        placeholder="Type direct support Comments here, e.g. Just paid Growth plan, please approve..."
                      />
                    </div>

                    <Button type="submit" loading={sendingSupport} icon={<Send className="h-4 w-4" />} className="w-full py-2.5">
                      Transmit Direct Support Comments
                    </Button>
                  </form>
                )}
              </Card>
            </div>
          ) : (
            // MEMBER/STAFF LOCK SCREEN: RECOMMEND PLAN & TEXT ADMIN
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full font-medium">
              <Card title="Pay & Recommend Plan Tier Upgrade">
                {recommendSuccess ? (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-150 text-emerald-850 rounded-lg font-bold flex flex-col gap-2 text-xs">
                    <span className="flex items-center gap-2 text-sm text-emerald-900"><CheckCircle className="h-5 w-5 shrink-0" /> Submission Successful</span>
                    <p className="font-normal text-[11px] text-emerald-800 leading-relaxed">{recommendSuccess}</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitMemberPayment} className="flex flex-col gap-3 text-xs font-semibold text-gray-700">
                    <p className="text-gray-500 font-normal leading-normal text-[11px] mb-1">
                      Select the plan tier that best suits your cooperative size, pay via Mobile Money, and submit the proof details. The platform Superadmin will instantly verify the logs and unlock your workspace!
                    </p>

                    <div className="bg-amber-50/50 border border-amber-250 p-2.5 rounded-lg text-[10px] text-amber-950 font-mono flex flex-col leading-5 select-none">
                      <span className="font-bold uppercase tracking-wider text-amber-800 mb-1 text-[9px]">Platform Transfer Targets</span>
                      <span>MTN: <span className="font-extrabold">{platformSettings.mtn_payment_number}</span> ({platformSettings.payment_name})</span>
                      <span>Airtel: <span className="font-extrabold">{platformSettings.airtel_payment_number}</span> ({platformSettings.payment_name})</span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase text-gray-400 font-mono tracking-wider font-bold">Select Tier to Recommend & Pay</label>
                      <select
                        value={selectedTier}
                        onChange={(e) => setSelectedTier(e.target.value)}
                        className="w-full text-xs rounded-lg border bg-white border-gray-305 px-3 py-2 text-stone-855 select-none focus:ring-1 focus:ring-emerald-500 font-semibold dark:bg-slate-900 dark:border-slate-750 dark:text-slate-100"
                      >
                        <option value="Free Forever Plan - $0/month">Free Forever Plan — $0</option>
                        <option value="Growth Plan - $25/month">Growth Tier — $25 ({(25 * platformSettings.usd_to_rwf_rate).toLocaleString()} RWF / {formatAmount(convertToRWF(25, 'USD'))})</option>
                        <option value="Pro Plan - $40/month">Pro Plan — $40 ({(40 * platformSettings.usd_to_rwf_rate).toLocaleString()} RWF / {formatAmount(convertToRWF(40, 'USD'))})</option>
                        <option value="Enterprise Plan - Custom">Enterprise Plan — Custom / Contact Sales</option>
                      </select>
                    </div>

                    <Input label="MoMo Payer Phone Number (Optional)" value={momoPhone} onChange={(e) => setMomoPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="078XXXXXXX" />
                    <Input label="MoMo / Airtel Ref ID Key (Optional)" value={momoRef} onChange={(e) => setMomoRef(e.target.value)} placeholder="TXNXXXXXXX" />

                    <div className="flex flex-col gap-1 w-full">
                      <label className="text-[10px] uppercase text-emerald-800 font-mono tracking-wider font-bold">Payment SMS Message / Proof of Transfer <span className="text-red-500">*</span></label>
                      <textarea
                        className="w-full text-xs rounded-lg border bg-white border-gray-350 p-2.5 h-20 bg-slate-50/20 text-stone-900 font-sans focus:ring-1 focus:ring-emerald-500"
                        value={smsProof}
                        onChange={(e) => setSmsProof(e.target.value)}
                        required
                        placeholder="Paste transaction SMS or write details e.g. 'Paid 32,500 RWF for Growth tier from John'. Admin will verify later."
                      />
                    </div>

                    <Button type="submit" loading={submittingPayment} icon={<Crown className="h-4 w-4" />} className="w-full py-2.5 mt-1">
                      Submit Payment Proof & Recommend
                    </Button>
                  </form>
                )}
              </Card>

              <Card title="Text/Message Workspace Admin">
                {memberSupportSuccess ? (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-150 text-emerald-850 rounded-lg font-bold flex items-center gap-2 text-xs">
                    <CheckCircle className="h-4.5 w-4.5" /> {memberSupportSuccess}
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 text-xs font-semibold text-gray-700">
                    <p className="text-gray-500 font-normal leading-normal text-[11px]">
                      Send a secure internal text message or pager notice to your Workspace Admin requesting to restore workspace access.
                    </p>
                    <div className="flex flex-col gap-1.5 w-full">
                      <label className="text-[10px] uppercase text-gray-400 font-mono tracking-wider font-bold">Write message to admin</label>
                      <textarea
                        className="w-full text-xs rounded-lg border bg-white border-gray-305 p-3 h-24 bg-slate-50/20 text-stone-900 font-sans"
                        value={memberSupportMsg}
                        onChange={(e) => setMemberSupportMsg(e.target.value)}
                        placeholder="e.g. Hi Admin, our 30-day trial is finished and we are locked out. Please upgrade our subscription so we can record today's ledger..."
                      />
                    </div>
                    <Button 
                      onClick={() => {
                        if (!memberSupportMsg.trim()) return;
                        setMemberSupportSuccess("Message successfully transmitted and page alerted to Administrator!");
                        const existingMsgs = localStorage.getItem(`admin_messages_${activeOrg?.id}`);
                        const msgs = existingMsgs ? JSON.parse(existingMsgs) : [];
                        msgs.push({
                          sender: user?.full_name || "Cooperative Member",
                          message: memberSupportMsg,
                          date: new Date().toISOString()
                        });
                        localStorage.setItem(`admin_messages_${activeOrg?.id}`, JSON.stringify(msgs));
                        setMemberSupportMsg("");
                      }} 
                      icon={<Send className="h-4 w-4" />} 
                      className="w-full py-2.5"
                    >
                      Message Workspace Administrator
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col pt-14 text-sm">
      <OrgThemeInjector />
      <Topbar 
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
        onStartTour={() => handleStartTour(0)}
      />
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        onStartTour={() => handleStartTour(0)} 
      />
      <main className="flex-1 md:pl-52 min-w-0 flex flex-col">
        <div className="flex-1 p-4 md:p-8 overflow-y-auto w-full max-w-7xl mx-auto">
          {lifecycle.isInGracePeriod && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-250 dark:border-amber-900 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    3-Day Grace Period Active — {lifecycle.graceDaysRemaining} day{lifecycle.graceDaysRemaining === 1 ? "" : "s"} remaining
                  </h4>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                    Your 30-day Growth Plan trial has concluded. Upgrade now to preserve full Growth capabilities (up to 250 members, DocumentOffice, QR attendance) before Free Forever limits take effect.
                  </p>
                </div>
              </div>
              <Link to="/dashboard/settings?tab=subscription">
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-9 px-4 rounded-xl whitespace-nowrap">
                  Upgrade Plan →
                </Button>
              </Link>
            </div>
          )}

          {lifecycle.isReadOnlyMode && (
            <div className="mb-6 p-4 bg-amber-50/90 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Free Plan Safe Mode Active ({lifecycle.activeMemberCount}/{lifecycle.memberLimit} members)
                  </h4>
                  <p className="text-xs text-amber-800 dark:text-amber-400 mt-0.5">
                    All records are securely preserved without data deletion. Because active member count exceeds the Free Forever limit of 30, excess records have entered safe read-only mode. Upgrade to Growth or Pro to resume full write privileges.
                  </p>
                </div>
              </div>
              <Link to="/dashboard/settings?tab=subscription">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 rounded-xl whitespace-nowrap">
                  Upgrade to Growth (250 members)
                </Button>
              </Link>
            </div>
          )}

          {children}
        </div>
      </main>
      <GuiderAssistant />

      {/* Interactive Tooltips-with-Steps Tour */}
      <WorkspaceTour
        isOpen={isTourOpen}
        currentStepIndex={currentTourStep}
        onNext={() => setCurrentTourStep((prev) => Math.min(prev + 1, TOUR_STEPS.length - 1))}
        onPrev={() => setCurrentTourStep((prev) => Math.max(prev - 1, 0))}
        onClose={handleCloseTour}
        onJumpToStep={(idx) => setCurrentTourStep(idx)}
      />

      {/* Non-disturbing first-time welcome invitation toast */}
      {showWelcomePrompt && (
        <WorkspaceTourWelcomePrompt
          onStart={() => handleStartTour(0)}
          onDismiss={handleDismissPrompt}
        />
      )}
    </div>
  );
};

