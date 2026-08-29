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
  Sliders
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useOrgStore } from "../store/orgStore";
import { useCurrencyStore } from "../store/currencyStore";
import { Avatar, Badge, Button, Input, Card, getLucideIcon, Modal } from "./ui";
import {
  useSubmitSubscriptionPayment,
  useSubmitErrorReport,
  usePlatformAdminData,
  useNews,
  useMeetings,
  useOrganizations,
  useNotificationSends,
  useMemberFees,
  useMembers
} from "../hooks/useImpactoData";
import { useToast } from "./Toast";
import { MockDB } from "../lib/mockData";
import { GuiderAssistant } from "./GuiderAssistant";

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
export const Topbar: React.FC<{ onToggleSidebar: () => void }> = ({ onToggleSidebar }) => {
  const { user, logout, updateUserLanguage } = useAuthStore();
  const { activeOrg, clearOrg, setActiveOrg } = useOrgStore();
  const { data: orgs } = useOrganizations();
  const userMemberships = user ? MockDB.getMembers().filter(
    (m) => m.user_id === user.id && m.status === "active"
  ) : [];
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
      const isConfirmed = lower.includes("confirmed") || lower.includes("cleared") || lower.includes("verified");
      const isRejected = lower.includes("rejected");
      return {
        id: "notif-" + ns.id,
        type: isConfirmed ? ("payment_success" as const) : isRejected ? ("payment_rejected" as const) : ("notification" as const),
        title: isConfirmed ? "Payment Confirmed" : isRejected ? "Payment Rejected" : lower.includes("submitted") ? "Payment Slip Submitted" : "Cooperative Update",
        summary: ns.body_text || "Notice dispatched",
        time: ns.created_at || new Date().toISOString(),
        path: "/dashboard/fees",
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
    <header className="fixed top-0 left-0 right-0 h-14 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl backdrop-saturate-150 border-b border-black/5 dark:border-white/10 flex items-center justify-between px-4 z-40 shrink-0 select-none">
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button
          onClick={onToggleSidebar}
          className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Brand Logo / Icon */}
        <Link to="/" className="flex items-center gap-2" onClick={() => clearOrg()}>
          {activeOrg?.dashboard_logo && activeOrg.dashboard_logo.startsWith("icon:") ? (
            (() => {
              const IconComponent = getLucideIcon(activeOrg.dashboard_logo.substring(5));
              return IconComponent ? (
                <IconComponent className="h-7 w-7 text-[var(--org-primary)] shrink-0" />
              ) : (
                <svg className="h-7 w-7 text-[var(--org-primary)] shrink-0" viewBox="0 0 100 100" fill="none">
                  <circle cx="50" cy="35" r="25" stroke="currentColor" strokeWidth="8" />
                  <circle cx="35" cy="65" r="25" stroke="currentColor" strokeWidth="8" />
                  <circle cx="65" cy="65" r="25" stroke="currentColor" strokeWidth="8" />
                </svg>
              );
            })()
          ) : activeOrg?.dashboard_logo ? (
            <img 
              src={activeOrg.dashboard_logo} 
              alt="Dashboard Logo" 
              className="h-8 shrink-0 object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/logo.png";
              }}
            />
          ) : (
            <svg className="h-7 w-7 text-[var(--org-primary)] shrink-0" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="35" r="25" stroke="currentColor" strokeWidth="8" />
              <circle cx="35" cy="65" r="25" stroke="currentColor" strokeWidth="8" />
              <circle cx="65" cy="65" r="25" stroke="currentColor" strokeWidth="8" />
              <polygon points="53,48 47,48 50,42" fill="currentColor" opacity="0.8" />
            </svg>
          )}
          <span className="font-display font-extrabold text-lg tracking-tight text-gray-900 dark:text-white hidden sm:inline">
            {activeOrg ? activeOrg.name : <>IMPACT<span className="text-emerald-600 dark:text-emerald-500 font-black">O</span></>}
          </span>
        </Link>

        {activeOrg && (
          <div className="hidden xs:flex items-center gap-2 relative">
            <span className="text-gray-300 dark:text-slate-700 font-light font-sans">/</span>
            <button
              onClick={() => setOrgSwitcherOpen(!orgSwitcherOpen)}
              className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[var(--org-primary-l)] text-[var(--org-primary)] hover:brightness-95 transition flex items-center gap-1.5 font-sans cursor-pointer focus:outline-none"
            >
              <span>{activeOrg.name}</span>
              {userMemberships.length > 1 && (
                <svg className={`h-3 w-3 transition-transform ${orgSwitcherOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>
            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full select-none font-mono ${
              activeOrg.subscription_status === "active"
                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                : activeOrg.subscription_status === "expired"
                ? "bg-rose-100 text-rose-800 border border-rose-300 animate-pulse"
                : "bg-amber-100 text-amber-850 border border-amber-300"
            }`}>
              {activeOrg.subscription_status === "active" ? "PREMIUM MASTER" : activeOrg.subscription_status === "expired" ? "EXPIRED LICENSE" : "TRIAL PERIOD"}
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

      <div className="flex items-center gap-3">
        {/* Currency Switcher */}
        <div className="relative flex items-center">
          <button
            type="button"
            onClick={() => {
              setCurrencyOpen(!currencyOpen);
              setLangMenuOpen(false);
              setUserMenuOpen(false);
              setNotificationOpen(false);
              setOrgSwitcherOpen(false);
            }}
            className="flex items-center gap-1.5 px-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-gray-250 dark:border-slate-700 rounded-lg text-xs font-extrabold text-gray-750 dark:text-slate-200 transition h-8 cursor-pointer shadow-xs whitespace-nowrap"
          >
            <Coins className="h-3.5 w-3.5 text-amber-500 shrink-0 animate-spin-slow" />
            <span>{activeCurrency}</span>
          </button>
          {currencyOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setCurrencyOpen(false)} />
              <div className="absolute right-0 top-9 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl w-36 overflow-hidden shrink-0 z-50">
                <div className="px-2.5 py-1.5 border-b text-[9px] uppercase tracking-wider font-mono text-gray-400 font-bold dark:border-slate-700">
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
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-750 transition cursor-pointer ${
                      activeCurrency === code ? "text-[var(--org-primary)] font-bold bg-slate-50 dark:bg-slate-750" : "text-gray-700 dark:text-slate-200"
                    }`}
                  >
                    <span>{code === "USD" ? "USD ($)" : code === "EUR" ? "EUR (€)" : code === "KES" ? "KES (KES)" : "RWF (RWF)"}</span>
                    {activeCurrency === code && <span className="h-1.5 w-1.5 rounded-full bg-[var(--org-primary)]" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Language switch */}
        <div className="relative flex items-center">
          <button
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
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400 cursor-pointer flex items-center gap-1"
          >
            <Globe className="h-4.5 w-4.5" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider hidden sm:inline">
              {(i18n.language || "en").substring(0, 2)}
            </span>
          </button>
          {langMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setLangMenuOpen(false)} />
              <div className="absolute right-0 top-9 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl w-52 overflow-hidden shrink-0 z-50 py-1">
                <div className="px-3 py-1.5 border-b border-gray-100 dark:border-slate-700">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400">
                    Personal Language (Accessibility)
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
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center justify-between transition cursor-pointer ${
                        isSelected
                          ? "bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-bold"
                          : "text-gray-700 dark:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{item.flag}</span>
                        <div className="flex flex-col">
                          <span>{item.native}</span>
                          <span className="text-[10px] text-gray-400">{item.label}</span>
                        </div>
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
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
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400"
        >
          {dark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
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
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400 relative focus:outline-none"
            >
              <Bell className="h-4.5 w-4.5" />
              {hasNewNotification && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
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
                      logout();
                      navigate("/login");
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
export const Sidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { activeOrg, activeMember } = useOrgStore();
  const { user } = useAuthStore();
  const location = useLocation();
  const { data: members } = useMembers(activeOrg?.id);

  const isAdmin = activeMember?.role === "org_admin" || !!user?.is_superadmin;
  const isAccountant = (activeMember?.role as string) === "accountant" || !!user?.is_superadmin;
  const isStaff = (activeMember?.role as string) === "org_admin" || (activeMember?.role as string) === "manager" || (activeMember?.role as string) === "accountant" || !!user?.is_superadmin;

  const navigation = [
    { name: t("nav.dashboard"), path: "/dashboard", icon: LayoutDashboard },
    { name: t("nav.news"), path: "/dashboard/news", icon: Megaphone },
    { name: t("nav.chat"), path: "/dashboard/chat", icon: MessageSquare },
    { name: t("nav.events"), path: "/dashboard/events", icon: Calendar },
    { name: t("nav.goals"), path: "/dashboard/goals", icon: Target },
    { name: t("nav.documents"), path: "/dashboard/documents", icon: FolderOpen },
    { name: "Marketplace", path: "/dashboard/marketplace", icon: ShoppingBag },
    { name: "Member Fees", path: "/dashboard/fees", icon: Coins },
    // Admin & Management links:
    { name: "Organization Profile", path: "/dashboard/org-profile", icon: Building2 },
    { name: t("nav.members"), path: "/dashboard/members", icon: Users, admin: true },
    { name: t("nav.ledger"), path: "/dashboard/ledger", icon: Coins, accountantOnly: true },
    { name: t("nav.grants"), path: "/dashboard/grants", icon: Award, accountantOnly: true },
    { name: t("nav.reports"), path: "/dashboard/reports", icon: FileBarChart, admin: true },
    { name: t("nav.settings"), path: "/dashboard/settings", icon: Settings, admin: true }
  ];

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
        className={`fixed top-14 left-0 bottom-0 w-52 bg-gray-50 dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 z-50 transition-transform duration-200 shrink-0 md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col justify-between p-3 select-none overflow-y-auto">
          <nav className="flex flex-col gap-1 w-full">
            {navigation.map((item) => {
              // Hide marketplace if disabled by admin
              if (item.name === "Marketplace" && activeOrg && activeOrg.marketplace_enabled === false) {
                return null;
              }
              // Hide Ledger from non-accountants
              if (item.accountantOnly && !isAccountant) {
                return null;
              }
              // Hide admin links from standard members
              if (item.admin && !isStaff) return null;

              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                    isActive
                      ? "bg-[var(--org-primary-l)] text-[var(--org-primary)] shadow-xs"
                      : "text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-[var(--org-primary)]" : "text-gray-400"}`} />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 pt-4 border-t border-gray-200 dark:border-slate-800 shrink-0">
            <div className="px-3">
              <span className="text-[10px] font-mono tracking-wider uppercase text-gray-500 block">Organization Suite</span>
              <span className="text-[9px] text-gray-400 block mt-0.5">ImpactO v1.0.1 • © 2026</span>
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

  const isAdmin = activeMember?.role === "org_admin";
  const isBlocked = (() => {
    if (!activeOrg) return false;
    if (activeOrg.subscription_status === "expired") return true;

    const now = Date.now();
    const createdTime = activeOrg.created_at ? new Date(activeOrg.created_at).getTime() : now;

    // 1. Trial / unset checks (30 days limit)
    if (activeOrg.subscription_status === "trial" || !activeOrg.subscription_status) {
      const trialLimit = 30 * 24 * 3600 * 1000; // 30 days
      const elapsed = now - createdTime;
      if (elapsed > trialLimit) {
        return true;
      }
    }

    // 2. Active checks with ends at
    if (activeOrg.subscription_ends_at) {
      if (new Date(activeOrg.subscription_ends_at).getTime() < now) {
        return true;
      }
    }

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
      if (selectedTier.includes("Starter")) costUsd = 10;
      if (selectedTier.includes("Enterprise")) costUsd = 50;

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
      if (selectedTier.includes("Starter")) costUsd = 10;
      if (selectedTier.includes("Enterprise")) costUsd = 50;

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
                        <option value="Starter Plan - $10/month">Starter Tier — $10 ({(10 * platformSettings.usd_to_rwf_rate).toLocaleString()} RWF / {formatAmount(convertToRWF(10, 'USD'))})</option>
                        <option value="Growth Plan - $25/month">Growth Tier — $25 ({(25 * platformSettings.usd_to_rwf_rate).toLocaleString()} RWF / {formatAmount(convertToRWF(25, 'USD'))})</option>
                        <option value="Enterprise Plan - $50/month">Enterprise Monolith — $50 ({(50 * platformSettings.usd_to_rwf_rate).toLocaleString()} RWF / {formatAmount(convertToRWF(50, 'USD'))})</option>
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
                        <option value="Starter Plan - $10/month">Starter Tier — $10 ({(10 * platformSettings.usd_to_rwf_rate).toLocaleString()} RWF / {formatAmount(convertToRWF(10, 'USD'))})</option>
                        <option value="Growth Plan - $25/month">Growth Tier — $25 ({(25 * platformSettings.usd_to_rwf_rate).toLocaleString()} RWF / {formatAmount(convertToRWF(25, 'USD'))})</option>
                        <option value="Enterprise Plan - $50/month">Enterprise Monolith — $50 ({(50 * platformSettings.usd_to_rwf_rate).toLocaleString()} RWF / {formatAmount(convertToRWF(50, 'USD'))})</option>
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
      <Topbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 md:pl-52 min-w-0 flex flex-col">
        <div className="flex-1 p-4 md:p-8 overflow-y-auto w-full max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      <GuiderAssistant />
    </div>
  );
};

