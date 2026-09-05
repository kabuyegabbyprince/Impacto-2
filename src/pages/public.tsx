import React, { useState, useEffect, useMemo } from "react";
import { OrganizationMarketplace } from "./marketplace";
import { Link, useParams, useNavigate, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLocalTranslation } from "../locales/additional-translations";
import { useForm, ValidationError } from "@formspree/react";
import {
  Search,
  Share2,
  Heart,
  Globe,
  MapPin,
  Check,
  Building2,
  AlertCircle,
  FileCheck,
  Eye,
  Camera,
  CalendarDays,
  Target,
  ArrowRight,
  ArrowLeft,
  X,
  Plus,
  Minus,
  Lock,
  ChevronDown,
  ChevronUp,
  Tv,
  Compass,
  Signal,
  QrCode,
  CheckCircle2,
  ShieldAlert,
  Users,
  FileSpreadsheet,
  Vote,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useOrgStore } from "../store/orgStore";
import { useCurrencyStore } from "../store/currencyStore";
import { LogoLoader } from "../components/LogoLoader";
import { PartnersSection } from "../components/PartnersSection";
import {
  useOrganizations,
  useOrganization,
  useNews,
  useGoals,
  useDonations,
  useEvents,
  useCreateDonation,
  useCheckIn,
  useActivityLogs,
  useMeetings,
  useMeetingAttendance,
  useSaveMeetingAttendance,
  useSubmitErrorReport
} from "../hooks/useImpactoData";
import { Button, Input, Card, Badge, Avatar, ProgressBar, EmptyState, Modal, getLucideIcon, Tabs } from "../components/ui";
import { ResolvedImage } from "../components/ResolvedMedia";
import { resolveFileUrl } from "../lib/storageService";
import { Organization } from "../types";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { MockDB } from "../lib/mockData";

// ==========================================
// 1. DYNAMIC HOMEPAGE & DISCOVERY FEED
// ==========================================
export const Landing: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { updateUserLanguage } = useAuthStore();
  const { data: orgs, isLoading } = useOrganizations();
  const navigate = useNavigate();
  const { convertToRWF, formatAmount, activeCurrency } = useCurrencyStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [logoError, setLogoError] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  // Contact modal states
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactLoading, setContactLoading] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);

  const submitErrorReport = useSubmitErrorReport();
  const [formspreeState, handleFormspreeSubmit] = useForm("xojbrlel");

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !contactEmail || !contactMessage) return;
    setContactLoading(true);
    try {
      await submitErrorReport.mutateAsync({
        org_id: "system",
        title: `Landing Contact: ${contactSubject || contactName}`,
        description: `Sender: ${contactName} (${contactEmail})\nSubject: ${contactSubject || "N/A"}\n\nMessage:\n${contactMessage}`,
        priority: "high",
      });
      try {
        handleFormspreeSubmit(e);
      } catch (fErr) {
        console.warn("Formspree fallback notice:", fErr);
      }
      setContactSuccess(true);
      setContactName("");
      setContactEmail("");
      setContactSubject("");
      setContactMessage("");
    } catch (err) {
      console.error("Error submitting contact form to super admin:", err);
    } finally {
      setContactLoading(false);
    }
  };

  useEffect(() => {
    if (formspreeState.succeeded) {
      setContactSuccess(true);
      setContactName("");
      setContactEmail("");
      setContactSubject("");
      setContactMessage("");
    }
  }, [formspreeState.succeeded]);

  const isRw = i18n.language?.startsWith("rw");
  const isFr = i18n.language?.startsWith("fr");

  const handleLanguageSwitch = (lng: "en" | "fr" | "rw") => {
    updateUserLanguage(lng);
  };

  const categories = ["All", "Environment", "Education", "Health", "Social Action", "Enterprise"];

  const getCategoryLabel = (cat: string) => {
    if (isRw) {
      switch (cat) {
        case "All": return "Byose";
        case "Environment": return "Ibidukikije";
        case "Education": return "Uburezi";
        case "Health": return "Ubuzima";
        case "Social Action": return "Imibereho Myiza";
        case "Enterprise": return "Koperative n'Ubucuruzi";
        default: return cat;
      }
    }
    if (isFr) {
      switch (cat) {
        case "All": return "Tout";
        case "Environment": return "Environnement";
        case "Education": return "Éducation";
        case "Health": return "Santé";
        case "Social Action": return "Action Sociale";
        case "Enterprise": return "Entreprise";
        default: return cat;
      }
    }
    return cat;
  };

  const rwFaqs = [
    {
      id: 1,
      question: "Impacto ni iki kandi ese ni uburyo bwo gucunga imiryango ku buntu?",
      answer: "Yego! Impacto ni uburyo bwuzuye bwo gucunga amakoperative n'imiryango ku buntu 100%. Butanga ibikoresho byose by'ingenzi — urutonde rw'abanyamuryango, ibitabo by'imari bya Mobile Money, ibiro by'amabaruwa afite ikirango, kwandika abitabiriye na QR Code, n'amatora mu mucyo ku buntu."
    },
    {
      id: 2,
      question: "Ibitabo by'imari bya Mobile Money bikora bite kuri Impacto?",
      answer: "Impacto itanga igitabo cy'imari gikurikirana inkunga n'inkunga z'abaturage. Abayobozi bashobora kwandika ibikorwa by'imari byemejwe na nimero ya gihamya (MTN MoMo cyangwa Airtel Money ID), hagamijwe umucyo wa 100%."
    },
    {
      id: 3,
      question: "Ese mbuga z'imiryango ziba ziri kuri Google / moteri zishakisha?",
      answer: "Yego! Buri muryango wemejwe uhabwa urubuga rwa rwo kuri impact-o.app/@slug. Uru rubuga rugaragaza ibikorwa bihari, impeshyi z'inkunga zakusanyijwe, amatangazo, n'inkunga zose mu buryo bugaragarira buri wese."
    },
    {
      id: 4,
      question: "Twaba dushobora gutumira abayobozi bacu cyangwa abakozi mu nzego zo mukarere?",
      answer: "Yego rwose. Impacto ifite inshingano zinyuranye: Ubuyobozi bushobora gucunga porogaramu, guhindura ibitabo by'imari, no gutangaza amakuru, mu gihe abanyamuryango basanzwe bashobora kwerekana ko bahari bakokesheje QR code, cyangwa bagatunganya ibijyanye n'amatora."
    },
    {
      id: 5,
      question: "Agasanduku ko kwandikisha abantu hakoreshejwe QR kodi ni iki?",
      answer: "Kugira ngo hemezwe ko inama rusange cyangwa amahugurwa byabayeho koko, abayobozi bashobora kurema QR kodi yihariye. Abanyamuryango bascaninga iyo kodi bakoresheje terefone zabo kugira ngo bandikwe ku rutonde rw'ababonetse."
    },
    {
      id: 6,
      question: "Twakorera gute ihererekanya ry'ifatabuguzi?",
      answer: "Ushobora guhindura ifatabuguzi mu buryo bworoshye unyuze ku kiganiro cy'Igenamiterere ryawe. Ifatabuguzi ryishyurwa buri kwezi (agaciro mu mafaranga y'u Rwanda - RWF kaboneka mu buryo bworoshye), kandi umwanya wo kubika ukaba wagera kuri 20GB ku rwego rwa Pro."
    },
    {
      id: 7,
      question: "Impacto yaba ifasha gukoresha indimi zinyuranye?",
      answer: "Yego kaboneka! urubuga ndetse n'ibikorwa byarwo byose bikorwa mu ndimi eshatu: Ikinyarwanda (RW), Icyongereza (EN), ndetse n'Igifaransa (FR), byorohereza abakozi gukora mu rurimi rwo guhitamo kwabo."
    }
  ];

  const frFaqs = [
    {
      id: 1,
      question: "Qu'est-ce qu'Impacto et est-ce un système de gestion d'organisation gratuit ?",
      answer: "Impacto est un système complet et 100% gratuit de gestion d'organisation conçu pour les coopératives, les ONG et les associations communautaires. Tous les modules essentiels — répertoires des membres, registres Mobile Money, studio de lettres à en-tête, pointage QR et vote numérique — sont inclus gratuitement."
    },
    {
      id: 2,
      question: "Comment fonctionnent les registres Mobile Money sur Impacto ?",
      answer: "Impacto propose un registre manuel et numérique auditable qui suit les campagnes de dons et le soutien local. Les administrateurs peuvent enregistrer les transactions vérifiées par rapport aux références de paiement officielles (MTN MoMo ou Airtel Money ID)."
    },
    {
      id: 3,
      question: "Les pages publiques sous @slug sont-elles indexées par les moteurs de recherche ?",
      answer: "Oui ! Chaque espace de travail vérifié reçoit un profil public sur impact-o.app/@slug. Cette page présente les programmes civiques actifs, les jalons de campagne en temps réel, les annonces publiques et un mur de donateurs."
    },
    {
      id: 4,
      question: "Pouvons-nous inviter les membres de notre conseil d'administration et nos agents de terrain ?",
      answer: "Absolument. Impacto dispose de rôles granulaires : les administrateurs peuvent coordonner les programmes, modifier les registres et publier des bulletins d'information, tandis que les membres peuvent s'enregistrer avec des codes QR."
    },
    {
      id: 5,
      question: "Qu'est-ce que le registre de présence par QR Code ?",
      answer: "Pour vérifier les réunions physiques et les sessions de formation, les administrateurs peuvent générer des codes QR spécifiques. Les membres scannent simplement le code avec leur appareil mobile pour signer le registre de présence."
    },
    {
      id: 6,
      question: "Comment pouvons-nous mettre à niveau notre abonnement ?",
      answer: "Vous pouvez effectuer la transition entre les plans dans vos paramètres d'administration. Les abonnements sont facturés mensuellement (avec des prix convertis en Francs Rwandais - RWF)."
    },
    {
      id: 7,
      question: "Impacto prend-il en charge la traduction multilingue ?",
      answer: "Oui ! La plateforme et les processus de travail sont entièrement traduits pour prendre en charge l'anglais, le français (FR) et le kinyarwanda (RW)."
    }
  ];

  const enFaqs = [
    {
      id: 1,
      question: "What is Impacto and is it really a free organization management system?",
      answer: "Yes! Impacto is a complete, 100% free organization management system designed specifically for cooperatives, NGOs, and community associations. It provides all core modules — from member directories and Mobile Money dues to official letterhead document studios, dynamic QR attendance, and democratic voting — completely free forever."
    },
    {
      id: 2,
      question: "How do Mobile Money ledgers work on Impacto?",
      answer: "Impacto provides an auditable manual and digital ledger that tracks donor campaigns and local support. Administrators can log transactions, verified against official payment references (such as MTN MoMo or Airtel Money receipt IDs), ensuring 100% transparency in local fundraising."
    },
    {
      id: 3,
      question: "Are the public organization pages under @slug search-engine indexed?",
      answer: "Yes! Every verified workspace receives a public profile at impact-o.app/@slug. This public page showcases active civic programs, real-time campaign milestones, public announcements, and a donor wall to securely verify impact to the community and global partners."
    },
    {
      id: 4,
      question: "Can we invite our board members and field workers into the workspace?",
      answer: "Absolutely. Impacto has granular roles: Workspace Administrators can coordinate programs, edit ledger books, and publish news bulletins, while Field Members can check-in on-site using QR codes, upload documents, and participate in votes and decisions."
    },
    {
      id: 5,
      question: "What is the QR Attendance Register capability?",
      answer: "To verify physical community meetings and cooperative training sessions, admins can dynamically generate session-specific QR codes. Members simply scan the code with their mobile devices to sign the attendance log with a verified date stamp, keeping community operations honest and auditable."
    },
    {
      id: 6,
      question: "How can we upgrade our workspace subscription plan?",
      answer: "You can seamlessly transition between plans inside your Admin Panel Settings. Subscriptions are billed monthly (with approximate prices shown in Rwandan Francs - RWF), and storage scales up to 20GB on our Pro tier with priority technical support."
    },
    {
      id: 7,
      question: "Does Impacto support multi-language translation?",
      answer: "Yes! The core platform and workflows are fully localized to support English, French (FR), and Kinyarwanda (RW), ensuring field coordinators and community groups can operate in their language of choice."
    }
  ];

  const faqsData = isRw ? rwFaqs : isFr ? frFaqs : enFaqs;

  const filteredOrgs = useMemo(() => {
    if (!orgs) return [];
    const validOrgs = orgs.filter((o) => {
      // Check if organization allows being visible in public directory
      const isPublic = o.is_public_directory !== false && o.allow_public_joining !== false;
      const matchesSearch = !searchQuery || 
                            o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (o.tagline && o.tagline.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === "All" || o.org_category === selectedCategory;
      return isPublic && matchesSearch && matchesCategory;
    });

    if (validOrgs.length <= 6) return validOrgs;

    // If more than 6, pick 6 randomly from available public organizations
    const shuffled = [...validOrgs].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 6);
  }, [orgs, searchQuery, selectedCategory]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-800 text-sm font-sans flex flex-col justify-between">
      {/* Dynamic Header */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between px-6 md:px-12 z-50 select-none shrink-0 transition-all duration-200 shadow-3xs">
        <Link to="/" className="flex items-center gap-2.5 group">
          {!logoError ? (
            <img 
              src="/logo.png" 
              onError={() => setLogoError(true)} 
              className="h-8 w-auto shrink-0 max-w-[140px] object-contain" 
              alt="Impacto Logo" 
            />
          ) : (
            <div className="flex items-center gap-2">
              <svg className="h-8 w-8 text-[#156c45] dark:text-emerald-500 shrink-0 transition-transform group-hover:scale-105" viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="35" r="25" stroke="currentColor" strokeWidth="8" />
                <circle cx="35" cy="65" r="25" stroke="currentColor" strokeWidth="8" />
                <circle cx="65" cy="65" r="25" stroke="currentColor" strokeWidth="8" />
                <polygon points="53,48 47,48 50,42" fill="#F59E0B" />
              </svg>
              <span className="font-display font-extrabold text-2xl tracking-tight text-gray-900 dark:text-white">
                IMPACT<span className="text-[#156c45] dark:text-emerald-500 font-black">O</span>
              </span>
            </div>
          )}
        </Link>
        
        {/* Navigation Content Links */}
        <div className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <a href="#capabilities" className="px-3 py-1.5 rounded-lg hover:text-[#156c45] dark:hover:text-emerald-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors duration-150">{t("landing.nav_capabilities")}</a>
          <a href="#discovery" className="px-3 py-1.5 rounded-lg hover:text-[#156c45] dark:hover:text-emerald-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors duration-150">{t("landing.nav_discover")}</a>
          <a href="#pricing" className="px-3 py-1.5 rounded-lg hover:text-[#156c45] dark:hover:text-emerald-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors duration-150">{t("landing.nav_pricing")}</a>
          <a href="#faqs" className="px-3 py-1.5 rounded-lg hover:text-[#156c45] dark:hover:text-emerald-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors duration-150">{t("landing.nav_faqs")}</a>
        </div>

        {/* Action Button Header */}
        <div className="flex items-center gap-2.5">
          {/* Language Switcher Segmented Control */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/70 select-none">
            <button
              onClick={() => handleLanguageSwitch("en")}
              title="English"
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all duration-150 cursor-pointer ${
                i18n.language === "en"
                  ? "bg-white dark:bg-slate-700 text-[#156c45] dark:text-emerald-400 shadow-3xs"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => handleLanguageSwitch("fr")}
              title="Français"
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all duration-150 cursor-pointer ${
                i18n.language?.startsWith("fr")
                  ? "bg-white dark:bg-slate-700 text-[#156c45] dark:text-emerald-400 shadow-3xs"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              FR
            </button>
            <button
              onClick={() => handleLanguageSwitch("rw")}
              title="Kinyarwanda"
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all duration-150 cursor-pointer ${
                i18n.language?.startsWith("rw")
                  ? "bg-white dark:bg-slate-700 text-[#156c45] dark:text-emerald-400 shadow-3xs"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              RW
            </button>
          </div>

          <Link to="/login">
            <button className="px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-[#156c45] dark:hover:text-emerald-400 hover:bg-slate-100/80 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer">
              {t("auth.login")}
            </button>
          </Link>
          <Link to="/register">
            <button className="flex items-center gap-1.5 bg-[#156c45] hover:bg-[#115636] active:scale-[0.98] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-3xs hover:shadow-xs transition-all cursor-pointer">
              <span>{t("landing.nav_get_started")}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </Link>
        </div>
      </nav>

      {/* Modern Hero Section */}
      <section className="pt-36 pb-20 px-6 max-w-5xl mx-auto text-center flex flex-col items-center relative overflow-hidden">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[550px] h-[250px] bg-emerald-500/10 dark:bg-emerald-400/5 blur-[100px] pointer-events-none rounded-full" />
        
        <span className="inline-flex items-center gap-2 px-3.5 py-1 text-[10px] font-bold tracking-widest text-[#15803D] bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 rounded-full font-display uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {t("landing.hero_badge")}
        </span>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white font-display mt-6 max-w-4xl leading-tight uppercase">
          {t("landing.title")}
        </h1>
        <p className="text-sm md:text-base text-gray-500 mt-4 max-w-2xl leading-normal">
          {t("landing.tagline")}
        </p>

        <div className="flex gap-4 mt-8 shrink-0">
          <a href="#discovery">
            <Button variant="primary" size="lg" className="bg-emerald-700 hover:bg-emerald-800 text-white" icon={<Search className="h-4 w-4" />}>
              {t("landing.cta_discover")}
            </Button>
          </a>
          <Link to="/register">
            <Button variant="outline" size="lg">
              {t("landing.cta_start")}
            </Button>
          </Link>
        </div>

        {/* Highlight Tickers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mt-16 pt-10 border-t border-gray-200/60 dark:border-slate-800/80 w-full text-center">
          <div className="flex flex-col">
            <span className="text-2xl font-black text-gray-900 dark:text-white">1M+</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">{t("landing.ticker_trees")}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black text-gray-900 dark:text-white">100%</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">{t("landing.ticker_momo")}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black text-gray-900 dark:text-white">RWF 15M+</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">{t("landing.ticker_donations")}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black text-gray-900 dark:text-white">Active</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">{t("landing.ticker_active")}</span>
          </div>
        </div>
      </section>

      {/* Feature Bento Grid Section */}
      <section id="capabilities" className="py-20 bg-slate-50/60 dark:bg-slate-900/90 border-t border-b border-gray-200/60 dark:border-slate-800/60 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-[11px] font-bold tracking-widest text-[#156c45] dark:text-emerald-400 uppercase font-mono shadow-3xs">
              <Sparkles className="h-3 w-3" />
              {t("landing.capabilities_badge")}
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold font-display text-gray-900 dark:text-white mt-3 tracking-tight">
              {t("landing.capabilities_title")}
            </h2>
            <p className="text-sm md:text-base text-gray-500 dark:text-slate-400 mt-2.5 leading-relaxed">
              {t("landing.capabilities_desc")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1: Branded Public Portals */}
            <div id="capability-card-portals" className="card-glow bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 p-6 rounded-2xl flex flex-col justify-between gap-5 shadow-xs hover:shadow-md transition duration-200 relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500 opacity-80" />
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-[#156c45] dark:text-emerald-400 h-10 w-10 flex items-center justify-center shrink-0">
                    <Globe className="h-5 w-5" />
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/40 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-700/50">
                    <Check className="h-3 w-3" /> Free Forever Plan
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base font-display">
                  {t("landing.card1_title")}
                </h3>
                <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed mt-2">
                  {t("landing.card1_desc")}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">/@slug Web Domain</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">Donor Wall</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">Public News</span>
              </div>
            </div>

            {/* Feature 2: Auditable Mobile Money Gates */}
            <div id="capability-card-momo" className="card-glow bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 p-6 rounded-2xl flex flex-col justify-between gap-5 shadow-xs hover:shadow-md transition duration-200 relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600 opacity-80" />
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-700 dark:text-emerald-400 h-10 w-10 flex items-center justify-center shrink-0">
                    <Heart className="h-5 w-5" />
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/40 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-700/50">
                    <Check className="h-3 w-3" /> Free Forever Plan
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base font-display">
                  {t("landing.card2_title")}
                </h3>
                <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed mt-2">
                  {t("landing.card2_desc")}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">MTN MoMo & Airtel</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">Ref Code Matching</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">Audited Slips</span>
              </div>
            </div>

            {/* Feature 3: Interactive Member Rosters */}
            <div id="capability-card-roster" className="card-glow bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 p-6 rounded-2xl flex flex-col justify-between gap-5 shadow-xs hover:shadow-md transition duration-200 relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500 opacity-80" />
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-700 dark:text-emerald-400 h-10 w-10 flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5" />
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/40 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-700/50">
                    <Check className="h-3 w-3" /> Free Forever Plan
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base font-display">
                  {t("landing.card3_title")}
                </h3>
                <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed mt-2">
                  {t("landing.card3_desc")}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">Unlimited Directory</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">Roles & Badges</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">Offboarding Logs</span>
              </div>
            </div>

            {/* Feature 4: Branded Office & Letterhead Studio */}
            <div id="capability-card-office" className="card-glow bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 p-6 rounded-2xl flex flex-col justify-between gap-5 shadow-xs hover:shadow-md transition duration-200 relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600 opacity-80" />
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-700 dark:text-emerald-400 h-10 w-10 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/40 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-700/50">
                    <Check className="h-3 w-3" /> Free Forever Plan
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base font-display">
                  {t("landing.card4_title")}
                </h3>
                <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed mt-2">
                  {t("landing.card4_desc")}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">Official Letterhead</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">Member Mailings</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">Excel & PDF Export</span>
              </div>
            </div>

            {/* Feature 5: Democratic Digital Voting & Quorum */}
            <div id="capability-card-voting" className="card-glow bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 p-6 rounded-2xl flex flex-col justify-between gap-5 shadow-xs hover:shadow-md transition duration-200 relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500 opacity-80" />
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-700 dark:text-emerald-400 h-10 w-10 flex items-center justify-center shrink-0">
                    <Vote className="h-5 w-5" />
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/40 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-700/50">
                    <Check className="h-3 w-3" /> Free Forever Plan
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base font-display">
                  {t("landing.card5_title")}
                </h3>
                <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed mt-2">
                  {t("landing.card5_desc")}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">Secret Ballots</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">Quorum Verifier</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">Audited Tallies</span>
              </div>
            </div>

            {/* Feature 6: Dynamic QR Attendance & Event Radar */}
            <div id="capability-card-attendance" className="card-glow bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 p-6 rounded-2xl flex flex-col justify-between gap-5 shadow-xs hover:shadow-md transition duration-200 relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600 opacity-80" />
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-[#156c45] dark:text-emerald-400 h-10 w-10 flex items-center justify-center shrink-0">
                    <QrCode className="h-5 w-5" />
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/40 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-700/50">
                    <Check className="h-3 w-3" /> Free Forever Plan
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base font-display">
                  {t("landing.card6_title")}
                </h3>
                <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed mt-2">
                  {t("landing.card6_desc")}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">Dynamic QR Gates</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">Mobile Check-In</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">Real-Time Ledger</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Organizations Discovery Feed */}
      <section id="discovery" className="py-12 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8.5">
            <div>
              <h2 className="text-xl md:text-2xl font-bold font-display text-gray-900 dark:text-white">
                {t("landing.featured")}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">{t("landing.directory_desc")}</p>
            </div>

            {/* Quick Search Input */}
            <div className="w-full md:w-80 select-none">
              <Input
                type="text"
                placeholder={t("landing.search_placeholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                prefixIcon={<Search className="h-4 w-4 text-gray-400" />}
              />
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex gap-2.5 overflow-x-auto pb-4 mb-6">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-full shrink-0 border cursor-pointer transition ${
                  selectedCategory === cat
                    ? "bg-[#15803D] border-[#15803D] text-white shadow-xs"
                    : "bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-100"
                }`}
              >
                {getCategoryLabel(cat)}
              </button>
            ))}
          </div>

          {/* Org Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="h-64 bg-gray-50 dark:bg-slate-800 border rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredOrgs.length === 0 ? (
            <EmptyState 
              title={isRw ? "Nta Muyoboro Uhuye" : isFr ? "Aucune Organisation trouvée" : "No Organizations Matched"}  
              message={isRw ? "Gerageza guhindura amagambo ushakisha cyangwa uhitemo ibindi bice." : isFr ? "Essayez de modifier vos mots-clés ou sélectionnez d'autres catégories." : "Try customizing your keywords or select another categories."} 
              action={
                <Button onClick={() => navigate("/register")} className="bg-emerald-600 hover:bg-emerald-700">
                  Register New Organization
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOrgs.map((org) => (
                <Card 
                  key={org.id} 
                  padding={false} 
                  className="flex flex-col h-full group hover:border-[var(--org-primary)] transition cursor-pointer"
                  onClick={() => navigate(`/@${org.slug}`)}
                >
                  <div className="relative h-28 w-full bg-slate-100 overflow-hidden">
                    {org.cover_url && !(org.cover_url.startsWith("from-") || !org.cover_url.includes("/")) ? (
                      <ResolvedImage src={org.cover_url} alt={org.name} className="h-full w-full object-cover group-hover:scale-103 transition duration-200" bucketName="avatars" />
                    ) : org.cover_url ? (
                      <div className={`h-full w-full bg-gradient-to-tr ${org.cover_url} group-hover:scale-103 transition duration-200`} />
                    ) : (
                      <div className={`h-full w-full bg-gradient-to-tr ${
                        org.org_category?.toLowerCase() === "environment" ? "from-emerald-500 to-green-600" :
                        org.org_category?.toLowerCase() === "education" ? "from-indigo-500 to-purple-600" :
                        org.org_category?.toLowerCase() === "health" ? "from-cyan-500 to-sky-600" :
                        org.org_category?.toLowerCase() === "social action" || org.org_category?.toLowerCase() === "social_action" ? "from-rose-500 to-pink-600" :
                        org.org_category?.toLowerCase() === "enterprise" ? "from-amber-500 to-orange-600" :
                        "from-slate-500 to-zinc-600"
                      } opacity-80`} />
                    )}
                    <Badge color="green" className="absolute top-3 left-3">{getCategoryLabel(org.org_category)}</Badge>
                  </div>
                  <div className="p-5 flex flex-col flex-grow justify-between gap-4">
                    <div className="flex flex-col">
                      <span className="font-display font-bold text-base text-gray-900 dark:text-white group-hover:text-[var(--org-primary)] truncate">
                        {org.name}
                      </span>
                      <span className="text-xs text-gray-500 mt-1 line-clamp-2 h-8.5">
                        {org.tagline}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-700 pt-4 mt-auto">
                      <div className="flex flex-col gap-0.5 font-sans leading-none border-0 select-none">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{isRw ? "Ihuriro" : isFr ? "Espace" : "Workspace"}</span>
                        <span className="font-mono text-[11px] font-bold text-[var(--org-primary)]">@{org.slug}</span>
                      </div>
                      <Link to={`/@${org.slug}`} onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" icon={<Eye className="h-3.5 w-3.5" />}>
                          {isRw ? "Sura Umuryango" : isFr ? "Voir l'Organisation" : "View Organization"}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Pricing Tiers Section */}
      <section id="pricing" className="py-20 bg-gray-50/55 dark:bg-slate-950 border-t border-gray-150 dark:border-slate-900 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[10px] font-mono tracking-widest text-[#15803D] uppercase block font-bold">{t("landing.pricing_badge")}</span>
            <h2 className="text-2xl md:text-3xl font-bold font-display mt-1 text-gray-950 dark:text-white">
              {t("landing.pricing_title")}
            </h2>
            <p className="text-xs text-gray-500 mt-2 max-w-md mx-auto">
              {t("landing.pricing_desc")}
            </p>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 select-none">
            {/* 1. Free Forever */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-6 rounded-2xl flex flex-col justify-between hover:border-emerald-600 transition">
              <div>
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{isRw ? "Ubuntu" : isFr ? "Gratuit pour toujours" : "Free Forever"}</span>
                <h3 className="text-base font-extrabold text-gray-900 dark:text-white mt-1">{isRw ? "Plan y'Ubuntu" : isFr ? "Plan Gratuit" : "Free Forever Plan"}</h3>
                <p className="text-2xl font-black text-slate-950 dark:text-white mt-3">
                  {formatAmount(convertToRWF(0, "RWF"), "USD")}
                  <span className="text-xs font-semibold text-gray-400">{isRw ? " / burundu" : isFr ? " / pour toujours" : " / forever"}</span>
                </p>
                <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                  {formatAmount(convertToRWF(0, "RWF"), activeCurrency)}
                </p>
                <div className="mt-5 pt-4 border-t border-gray-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-gray-800 dark:text-slate-200">{isRw ? "Ibikubiyemo:" : isFr ? "Comprend :" : "Includes:"}</p>
                  <ul className="text-[11px] text-slate-500 flex flex-col gap-2 mt-2 font-medium">
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> {isRw ? "Kugeza ku banyamuryango 30" : isFr ? "Jusqu'à 30 membres" : "Up to 30 active members"}</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> {isRw ? "Gucunga umuryango bwite" : isFr ? "Gestion basique" : "Basic directory & chat"}</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> {isRw ? "Ubushobozi bw'ibanze (100MB)" : isFr ? "Stockage 100 Mo" : "100MB storage cap"}</li>
                  </ul>
                </div>
              </div>
              <Link to="/register" className="mt-8">
                <Button variant="outline" className="w-full text-xs font-bold py-2">
                  {isRw ? "Tangira Ubuntu" : isFr ? "Démarrer Gratuitement" : "Get Started Free"}
                </Button>
              </Link>
            </div>

            {/* 2. Starter */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-6 rounded-2xl flex flex-col justify-between hover:border-emerald-600 transition">
              <div>
                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block font-bold">{isRw ? "Ihuriro rito ry'Abaturage" : isFr ? "Rassemblement Local" : "Local Grassroots"}</span>
                <h3 className="text-base font-extrabold text-gray-900 dark:text-white mt-1">{isRw ? "Ifatabuguzi ry'Imberabutsa" : isFr ? "Formule Starter" : "Starter Plan"}</h3>
                <p className="text-2xl font-black text-slate-950 dark:text-white mt-3">
                  {formatAmount(convertToRWF(10, "USD"), "USD")}
                  <span className="text-xs font-semibold text-gray-400">{isRw ? " / ukwezi" : isFr ? " / mois" : " / mo"}</span>
                </p>
                <p className="text-[10px] text-emerald-600 font-semibold font-mono mt-0.5">
                  {formatAmount(convertToRWF(10, "USD"), activeCurrency)}
                </p>
                <div className="mt-5 pt-4 border-t border-gray-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-gray-800 dark:text-slate-200">{isRw ? "Ibikubiyemo:" : isFr ? "Comprend :" : "Includes:"}</p>
                  <ul className="text-[11px] text-slate-500 flex flex-col gap-2 mt-2 font-medium">
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> {isRw ? "Kugeza ku banyamuryango 100" : isFr ? "Jusqu'à 100 membres" : "Up to 100 members"}</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> {isRw ? "Igitabo cy'imari n'ibikorwa" : isFr ? "Grand livre local & événements" : "Local ledger & events"}</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> {isRw ? "1 GB y'ubushiko" : isFr ? "Stockage 1 Go" : "1 GB storage cap"}</li>
                  </ul>
                </div>
              </div>
              <Link to="/register" className="mt-8">
                <Button variant="outline" className="w-full text-xs font-bold py-2">
                  {isRw ? "Tangiza Plan" : isFr ? "Lancer Starter" : "Launch Starter"}
                </Button>
              </Link>
            </div>

            {/* 3. Growth */}
            <div className="bg-white dark:bg-slate-900 border-2 border-[#15803D] p-6 rounded-2xl relative flex flex-col justify-between shadow-sm">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#15803D] text-white px-3 py-0.5 text-[8px] uppercase font-bold tracking-widest rounded-full">{isRw ? "Icyerekezo Cyiza" : isFr ? "Hautement Recommandé" : "Highly Recommended"}</span>
              <div>
                <span className="text-[9px] font-bold text-[#15803D] uppercase tracking-widest block font-bold">{isRw ? "Umuryango Uri Gukura" : isFr ? "Organisation en Croissance" : "Scaling Organization"}</span>
                <h3 className="text-base font-extrabold text-gray-900 dark:text-white mt-1">{isRw ? "Ifatabuguzi ry'Iterambere" : isFr ? "Formule Growth" : "Growth Plan"}</h3>
                <p className="text-2xl font-black text-slate-950 dark:text-white mt-3">
                  {formatAmount(convertToRWF(25, "USD"), "USD")}
                  <span className="text-xs font-semibold text-gray-400">{isRw ? " / ukwezi" : isFr ? " / mois" : " / mo"}</span>
                </p>
                <p className="text-[10px] text-[#15803D] font-mono font-bold mt-0.5">
                  {formatAmount(convertToRWF(25, "USD"), activeCurrency)}
                </p>
                <div className="mt-5 pt-4 border-t border-gray-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-gray-800 dark:text-slate-200">{isRw ? "Ibikubiyemo:" : isFr ? "Comprend :" : "Includes:"}</p>
                  <ul className="text-[11px] text-slate-500 flex flex-col gap-2 mt-2 font-medium">
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> {isRw ? "Kugeza ku banyamuryango 500" : isFr ? "Jusqu'à 500 membres" : "Up to 500 members"}</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> {isRw ? "Ubufasha bwa Guider (Baza Assistant)" : isFr ? "Assistant Guider (Baza)" : "Guider (Baza Assistant)"}</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> {isRw ? "Ipima ry'Imisanzu ry'Umucungamari" : isFr ? "Indicateur de cotisations comptable" : "Accountant Dues Health Meter"}</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> {isRw ? "Ibiganiro bitsinda birakora" : isFr ? "Messagerie de groupe active" : "Group messaging active"}</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> {isRw ? "5 GB y'ubushiko" : isFr ? "Stockage 5 Go" : "5 GB storage cap"}</li>
                  </ul>
                </div>
              </div>
              <Link to="/register" className="mt-8">
                <Button className="w-full bg-[#15803D] hover:bg-[#14532D] text-xs font-bold py-2">
                  {isRw ? "Tangiza Iterambere" : isFr ? "Lancer Growth" : "Launch Growth"}
                </Button>
              </Link>
            </div>

            {/* 4. Pro Plan */}
            <div className="bg-[#0F172A] border-2 border-amber-500/80 p-6 rounded-2xl flex flex-col justify-between text-white hover:border-amber-400 transition shadow-lg relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 px-3 py-0.5 text-[8px] uppercase font-black tracking-widest rounded-full">PRO PLAN</span>
              <div>
                <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest block font-bold">{isRw ? "Icyerekezo Cyihariye" : isFr ? "Sécurité Maximale & Pro" : "Pro Plan & Ultimate Security"}</span>
                <h3 className="text-base font-extrabold text-slate-50 mt-1">{isRw ? "Ifatabuguzi rya Pro" : isFr ? "Licence Pro" : "Pro Plan License"}</h3>
                <p className="text-2xl font-black text-white mt-3">
                  {formatAmount(convertToRWF(40, "USD"), "USD")}
                  <span className="text-xs font-semibold text-slate-400">{isRw ? " / ukwezi" : isFr ? " / mois" : " / mo"}</span>
                </p>
                <p className="text-[10px] text-amber-400 font-mono font-bold mt-0.5">
                  {formatAmount(convertToRWF(40, "USD"), activeCurrency)}
                </p>
                <div className="mt-5 pt-4 border-t border-slate-800">
                  <p className="text-xs font-bold text-slate-200">{isRw ? "Ibikubiyemo byose bya Pro:" : isFr ? "Avantages Pro :" : "Pro Plan Features & Perks:"}</p>
                  <ul className="text-[11px] text-slate-300 flex flex-col gap-2 mt-2 font-medium">
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-amber-400 shrink-0" /> <strong>{isRw ? "Ubufasha bwihariye bw'end-to-end encryption" : "Highly secure end-to-end encryption"}</strong></li>
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-amber-400 shrink-0" /> <strong>{isRw ? "Gucunga amakuru yihariye (Auto-personalized data management)" : "Auto-personalized data management"}</strong></li>
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-amber-400 shrink-0" /> <strong>{isRw ? "Itsinda ry'icyiciro cya Pro" : "Treated as Pro group tier"}</strong></li>
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-amber-400 shrink-0" /> <strong>{isRw ? "Uburenganzira bwuzuye kuri buri kintu cyose (Unlimited all features)" : "Unlimited on all features & storage"}</strong></li>
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-amber-400 shrink-0" /> <strong>{isRw ? "Umuhuza w'umuyobozi bwite (Admin direct contact)" : "Admin direct contact (Pro Plan)"}</strong></li>
                  </ul>
                </div>
              </div>
              <Link to="/register" className="mt-8">
                <Button className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black py-2.5 shadow-md">
                  {isRw ? "Tangiza Pro Plan" : isFr ? "Choisir le Plan Pro" : "Get Pro Plan"}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Deep Feature Comparison Matrix Section */}
      <section id="comparison-matrix" className={`bg-slate-50 dark:bg-slate-950 border-t border-gray-150 dark:border-slate-800 px-6 transition-all duration-300 ${showComparison ? "py-20" : "py-12"}`}>
        <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
          <div className="text-center max-w-2xl mx-auto mb-6 select-none">
            <span className="text-[10px] font-mono tracking-widest text-emerald-600 dark:text-emerald-400 block uppercase font-bold">
              {isRw ? "Igereranya ry'Ibikoresho" : isFr ? "Comparaison des fonctionnalités" : "Feature Capabilities"}
            </span>
            <h2 className="text-2xl md:text-3xl font-bold font-display mt-1 text-gray-950 dark:text-white uppercase leading-tight">
              {isRw ? "Imbonerahamwe y'Igereranya ry'Ibikoresho" : isFr ? "Matrice de comparaison détaillée des fonctionnalités" : "Deep Feature Comparison Matrix"}
            </h2>
            <p className="text-xs text-gray-500 mt-2 max-w-md mx-auto leading-relaxed">
              {isRw ? "Genzura neza ibikoresho byemewe ku rwego rw'ifatabuguzi ryawe." : isFr ? "Analysez exactement quels modules techniques sont autorisés sur votre abonnement." : "Analyze exactly which technical modules are allowed on your plan tier."}
            </p>
          </div>

          <div className="flex justify-center mb-6">
            <Button
              onClick={() => setShowComparison(!showComparison)}
              variant="outline"
              className="flex items-center gap-2 text-xs font-semibold py-2 px-5 rounded-full border-gray-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition duration-150 shadow-xs"
            >
              <span>
                {showComparison 
                  ? (isRw ? "Hisha Igereranya ry'Ibikoresho" : isFr ? "Masquer la matrice détaillée" : "Hide Detailed Feature Comparison")
                  : (isRw ? "Tunga Igereranya ry'Ibikoresho" : isFr ? "Afficher la matrice détaillée" : "Show Detailed Feature Comparison")
                }
              </span>
              {showComparison ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
            </Button>
          </div>

          {showComparison && (
            <div className="border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-xs animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="p-5 bg-slate-50/50 dark:bg-slate-900/60 border-b border-gray-200 dark:border-slate-800">
                <h4 className="font-semibold text-gray-900 dark:text-white text-xs">
                  {isRw ? "Imbonerahamwe y'Igereranya ry'Ibikoresho" : isFr ? "Matrice de comparaison détaillée des fonctionnalités" : "Detailed Feature Plan Comparison"}
                </h4>
                <p className="text-[10px] text-gray-400 dark:text-slate-400 mt-0.5">
                  {isRw ? "Genzura neza ibikoresho byemewe ku rwego rw'ifatabuguzi ryawe." : isFr ? "Analysez exactement quels modules techniques sont autorisés sur votre abonnement." : "Analyze exactly which technical modules are allowed on your plan tier."}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-800 bg-slate-100/30 dark:bg-slate-900 font-semibold text-gray-800 dark:text-white font-mono">
                      <th className="p-3 w-1/3">
                        {isRw ? "Ibiranga Ubushobozi" : isFr ? "Fonctionnalités de la plateforme" : "Feature Capabilities"}
                      </th>
                      <th className="p-3 text-center text-[10px]">{isRw ? "Ikigereranyo" : "Trial"}</th>
                      <th className="p-3 text-center text-[10px]">{isRw ? "Igihe cyo Gutangira" : "Starter"}</th>
                      <th className="p-3 text-center text-[10px]">{isRw ? "Ukwiyongera" : "Growth"}</th>
                      <th className="p-3 text-center text-[10px]">Pro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-medium">
                    <tr className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition text-[11px]">
                      <td className="p-3 font-semibold text-gray-900 dark:text-slate-200">
                        {isRw ? "Membres (kugeza)" : isFr ? "Membres (jusqu'à)" : "Members (up to)"}
                      </td>
                      <td className="p-3 text-center text-gray-700 dark:text-slate-300">50</td>
                      <td className="p-3 text-center text-gray-700 dark:text-slate-300">100</td>
                      <td className="p-3 text-center text-gray-700 dark:text-slate-300">500</td>
                      <td className="p-3 text-center font-semibold text-gray-950 dark:text-white">∞</td>
                    </tr>
                    
                    {[
                      { name: isRw ? "Ubufasha bwa Guider (Baza Assistant)" : isFr ? "Assistant Guider (Baza interactif)" : "Guider (Baza Interactive Assistant)", trial: true, starter: false, growth: true, pro: true },
                      { name: isRw ? "Ipima ry'Imisanzu ry'Umucungamari" : isFr ? "Compteur de recouvrement des cotisations" : "Accountant Dues Health & Collection Meter", trial: true, starter: false, growth: true, pro: true },
                      { name: isRw ? "Gucunga Abanyamuryango" : isFr ? "Gestion des membres" : "Member Management", trial: true, starter: true, growth: true, pro: true },
                      { name: isRw ? "Ibikorwa + Kwandika hakoreshejwe QR" : isFr ? "Événements + Présence QR" : "Events + QR Attendance", trial: true, starter: true, growth: true, pro: true },
                      { name: isRw ? "Amakuru & Amatangazo" : isFr ? "Actualités & Annonces" : "News & Announcements", trial: true, starter: true, growth: true, pro: true },
                      { name: isRw ? "Intego Nyamukuru (kurikirana & gutangaza)" : isFr ? "Objectifs (suivre & publier)" : "Goals (track & publish)", trial: true, starter: true, growth: true, pro: true },
                      { name: isRw ? "Inyandiko n'Impapuro" : isFr ? "Documents" : "Documents", trial: true, starter: true, growth: true, pro: true },
                      { name: isRw ? "Urubuga rusange rw'umuryango (@slug)" : isFr ? "Page publique de l'Organisation (@slug)" : "Public Organization Page (@slug)", trial: true, starter: true, growth: true, pro: true },
                      { name: isRw ? "Igitabo cy'Imari bafata n'intoki" : isFr ? "Grand ledger manuel" : "Manual Ledger", trial: true, starter: true, growth: true, pro: true },
                      { name: isRw ? "Ibiganiro bitsinda n'umuntu ku giti cye" : isFr ? "Chat (groupe & direct)" : "Chat (group & direct)", trial: true, starter: true, growth: true, pro: true },
                      { name: isRw ? "Amatora n'Imyanzuro" : isFr ? "Votes & Décisions" : "Votes & Decisions", trial: true, starter: false, growth: true, pro: true },
                      { name: isRw ? "Porogaramu n'Ibyagezweho" : isFr ? "Programmes & Jalons" : "Programs & Milestones", trial: true, starter: false, growth: true, pro: true },
                      { name: isRw ? "Inama n'Ibyemezo byazo" : isFr ? "Réunions + Comptes-rendus" : "Meetings + Minutes", trial: true, starter: false, growth: true, pro: true },
                      { name: isRw ? "Ibipimo by'Umusaruro" : isFr ? "Indicateurs d'Impact" : "Impact Metrics", trial: true, starter: false, growth: true, pro: true },
                      { name: isRw ? "Gukurikirana Ibihe by'Inkunga" : isFr ? "Suivi des échéances d'aide" : "Grant Deadline Tracker", trial: true, starter: false, growth: true, pro: true },
                      { name: isRw ? "Ihuriro n'ibikorwa by'abaterankunga" : isFr ? "Portail des donateurs & campagnes" : "Donor Portal & campaigns", trial: true, starter: true, growth: true, pro: true },
                      { name: isRw ? "Raporo z'Umusaruro mu buryo bwa PDF" : isFr ? "Générateur PDF de rapports annuels" : "Annual Report PDF Gen", trial: true, starter: false, growth: false, pro: true },
                      { name: isRw ? "Indimi nyinshi (FR/RW/EN)" : isFr ? "Multi-langues (FR/RW)" : "Multi-language (FR/RW)", trial: true, starter: true, growth: true, pro: true },
                      { name: isRw ? "Kugaragara ku Rutonde rw'Imiryango" : isFr ? "Inscription au registre des organisations" : "Organization Discovery Listing", trial: true, starter: true, growth: true, pro: true },
                      { name: isRw ? "Ubufasha bw'isumbuye" : isFr ? "Support Prioritaire" : "Priority Support", trial: false, starter: false, growth: false, pro: true },
                    ].map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition text-[11px]">
                        <td className="p-2.5 text-gray-600 dark:text-slate-300">{row.name}</td>
                        <td className="p-2.5 text-center">
                          {row.trial ? <Check className="h-3.5 w-3.5 text-emerald-600 mx-auto" /> : <span className="text-red-500 font-bold">✗</span>}
                        </td>
                        <td className="p-2.5 text-center">
                          {row.starter ? <Check className="h-3.5 w-3.5 text-emerald-600 mx-auto" /> : <span className="text-red-500 font-bold">✗</span>}
                        </td>
                        <td className="p-2.5 text-center">
                          {row.growth ? <Check className="h-3.5 w-3.5 text-emerald-600 mx-auto" /> : <span className="text-red-500 font-bold">✗</span>}
                        </td>
                        <td className="p-2.5 text-center">
                          {row.pro ? <Check className="h-3.5 w-3.5 text-emerald-600 mx-auto" /> : <span className="text-red-500 font-bold">✗</span>}
                        </td>
                      </tr>
                    ))}

                    <tr className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition text-[11px]">
                      <td className="p-3 font-semibold text-gray-800 dark:text-slate-200">
                        {isRw ? "Kubika (Space Limit)" : isFr ? "Limite de stockage" : "Storage Limit"}
                      </td>
                      <td className="p-3 text-center font-mono text-[10px] text-gray-500">500MB</td>
                      <td className="p-3 text-center font-mono text-[10px] text-gray-500">1GB</td>
                      <td className="p-3 text-center font-mono text-[10px] text-gray-500">5GB</td>
                      <td className="p-3 text-center font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400">20GB</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Frequently Asked Questions Section */}
      <section id="faqs" className="py-20 bg-white dark:bg-slate-900 border-t border-gray-150 dark:border-slate-800 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12 select-none">
            <span className="text-[10px] font-mono tracking-widest text-emerald-600 dark:text-emerald-400 block uppercase font-bold">{t("landing.faq_badge")}</span>
            <h2 className="text-2xl md:text-3xl font-bold font-display mt-1 text-gray-950 dark:text-white uppercase leading-tight">
              {t("landing.faq_title")}
            </h2>
            <p className="text-xs text-gray-500 mt-2 max-w-md mx-auto leading-relaxed">
              {t("landing.faq_desc")}
            </p>
          </div>

          {/* FAQ Accordion List */}
          <div className="flex flex-col gap-4">
            {faqsData.map((faq, index) => {
              const isOpen = expandedFaq === index;
              return (
                <div 
                  key={faq.id} 
                  className="border border-gray-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden transition-all duration-150 shadow-xs"
                >
                  <button
                    onClick={() => setExpandedFaq(isOpen ? null : index)}
                    className="w-full flex items-center justify-between p-5 text-left font-display font-bold text-xs md:text-sm text-gray-950 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-850 transition duration-150 focus:outline-none"
                  >
                    <span>{faq.question}</span>
                    <span className="ml-4 shrink-0 p-1 bg-slate-50 dark:bg-slate-805 rounded-full border border-gray-150 dark:border-slate-750">
                      {isOpen ? (
                        <Minus className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <Plus className="h-3.5 w-3.5 text-gray-400 dark:text-slate-400 shrink-0" />
                      )}
                    </span>
                  </button>
                  
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs text-gray-600 dark:text-slate-300 leading-relaxed border-t border-gray-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/40">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Partners Section */}
          <div className="mt-12">
            <PartnersSection />
          </div>

          {/* Still have questions? Block */}
          <div className="mt-12 bg-emerald-50/50 dark:bg-slate-900/60 border border-emerald-100/80 dark:border-slate-800 p-8 rounded-3xl text-center max-w-xl mx-auto select-none animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h3 className="font-display font-extrabold text-base text-slate-900 dark:text-white">
              {t("landing.contact_box_title")}
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-2 leading-relaxed">
              {t("landing.contact_box_desc")}
            </p>
            <div className="mt-5">
              <Button
                onClick={() => {
                  setContactModalOpen(true);
                  setContactSuccess(false);
                }}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-6 py-2.5 rounded-xl transition cursor-pointer"
              >
                {t("landing.contact_box_btn")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Branded Navigation & Product-centric Footer */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-850 pt-16 pb-8 px-6 md:px-12 select-none">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 border-b border-slate-800 pb-12 mb-8">
          {/* Brand Col */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <svg className="h-7 w-7 text-emerald-500 shrink-0" viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="35" r="25" stroke="currentColor" strokeWidth="8" />
                <circle cx="35" cy="65" r="25" stroke="currentColor" strokeWidth="8" />
                <circle cx="65" cy="65" r="25" stroke="currentColor" strokeWidth="8" />
                <polygon points="53,48 47,48 50,42" fill="#F59E0B" />
              </svg>
              <span className="font-display font-extrabold text-lg tracking-tight text-white uppercase">
                IMPACT<span className="text-emerald-500 font-black">O</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Equipping registered Rwandan cooperatives, local forest initiatives, and social welfare organizations with beautiful workspaces that verify impact digitally.
            </p>
            <span className="text-[10px] font-semibold text-slate-500 font-mono uppercase tracking-wide">
              Kigali Office • Rwanda
            </span>
          </div>

          {/* Module Links */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider font-display">Core Modules</span>
            <ul className="text-xs text-slate-400 flex flex-col gap-2 font-medium">
              <li><span className="hover:text-white transition cursor-pointer">Member CRM Directory</span></li>
              <li><span className="hover:text-white transition cursor-pointer">Mobile Money Ledgers</span></li>
              <li><span className="hover:text-white transition cursor-pointer">QR Attendance Registers</span></li>
              <li><span className="hover:text-white transition cursor-pointer">Annual Report Compiler</span></li>
              <li><span className="hover:text-white transition cursor-pointer">Interactive Goals Tracker</span></li>
              <li>
                <a href="/verify" className="text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1.5 font-semibold">
                  <span>Verify Credential / Badge</span>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 rounded uppercase font-mono">Public</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Platform Directory Links */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider font-display">Verified Directory</span>
            <ul className="text-xs text-slate-400 flex flex-col gap-2 font-medium">
              <li><a href="#discovery" className="hover:text-white transition">Environments & Forestry</a></li>
              <li><a href="#discovery" className="hover:text-white transition">Education & Mentorship</a></li>
              <li><a href="#discovery" className="hover:text-white transition">Health Care Cooperatives</a></li>
              <li><a href="#discovery" className="hover:text-white transition">Social Action & Welfare</a></li>
              <li><a href="#discovery" className="hover:text-white transition">Enterprise Cooperatives</a></li>
            </ul>
          </div>

          {/* Contact Col */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider font-display">Get Support</span>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              {t("landing.footer_desc")}
            </p>
            <button
              onClick={() => {
                setContactModalOpen(true);
                setContactSuccess(false);
              }}
              className="mt-1 w-full bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold py-2 px-3 rounded-xl transition duration-150 transform hover:scale-[1.02] text-center cursor-pointer select-none"
            >
              {t("landing.footer_btn")}
            </button>
            <div className="text-xs font-mono font-bold text-emerald-500 mt-1">
              support@impact-o.app
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
              Multi-language support available in Kinyarwanda, English, and French.
            </p>
          </div>
        </div>

        {/* Lower copyright row */}
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-500">
          <p>© 2026 Virellix Inc. All rights reserved. Registered trademark under Rwanda RDB.</p>
          <div className="flex flex-wrap items-center gap-4 font-mono text-[10px] uppercase tracking-wider">
            <button
              onClick={() => setTermsModalOpen(true)}
              className="hover:text-emerald-400 underline transition cursor-pointer"
            >
              Terms of Service
            </button>
            <button
              onClick={() => setPrivacyModalOpen(true)}
              className="hover:text-emerald-400 underline transition cursor-pointer"
            >
              Privacy Policy
            </button>
            <span>Rwandan SaaS Protocol</span>
          </div>
        </div>
      </footer>

      {/* Contact Support Modal */}
      <Modal open={contactModalOpen} onClose={() => setContactModalOpen(false)} title="Contact support & registration desk">
        {contactSuccess ? (
          <div className="flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in zoom-in duration-200">
            <span className="p-3 bg-emerald-50 dark:bg-slate-900/40 text-emerald-600 rounded-full mb-4">
              <Check className="h-6 w-6" />
            </span>
            <h3 className="font-display font-extrabold text-sm text-gray-900 dark:text-white uppercase">
              Message submitted successfully!
            </h3>
            <p className="text-xs text-gray-500 max-w-xs mt-2 leading-relaxed">
              Murakoze! Your registration or system inquiry has been dispatched to our support managers in Kigali. We will follow up via email within 24 hours.
            </p>
            <Button
              className="mt-6 font-bold"
              onClick={() => {
                setContactModalOpen(false);
                setContactSuccess(false);
              }}
            >
              Back to landing page
            </Button>
          </div>
        ) : (
          <form
            onSubmit={handleContactSubmit}
            className="flex flex-col gap-4 text-xs font-semibold"
          >
            <p className="text-gray-500 dark:text-slate-400 font-medium leading-relaxed mb-1">
              Have complex questions about setting up your Organization, custom local workflows, or Mobile Money integrations? Fill in the form and our team in Kigali will respond promptly.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-gray-700 dark:text-slate-300">Full Name *</label>
              <Input
                type="text"
                name="name"
                placeholder="e.g. Jean Damascene"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
              <ValidationError field="name" prefix="Name" errors={formspreeState.errors} className="text-red-500 text-xxs mt-0.5" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-gray-700 dark:text-slate-300">Email Address *</label>
              <Input
                type="email"
                name="email"
                placeholder="e.g. contact@cooperative.org"
                required
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
              <ValidationError field="email" prefix="Email" errors={formspreeState.errors} className="text-red-500 text-xxs mt-0.5" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-gray-700 dark:text-slate-300">Subject (Optional)</label>
              <Input
                type="text"
                name="subject"
                placeholder="e.g. Setup support, Upgrade request"
                value={contactSubject}
                onChange={(e) => setContactSubject(e.target.value)}
              />
              <ValidationError field="subject" prefix="Subject" errors={formspreeState.errors} className="text-red-500 text-xxs mt-0.5" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-gray-700 dark:text-slate-300">Message / Inquiry *</label>
              <textarea
                name="message"
                placeholder="How can we help your social workspace?"
                required
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-gray-250 dark:border-slate-850 rounded-xl p-3 text-xs outline-none focus:border-emerald-600 dark:focus:border-emerald-400 focus:ring-1 focus:ring-emerald-600 dark:focus:ring-emerald-400 transition min-h-[90px] resize-y text-gray-900 dark:text-white"
              />
              <ValidationError field="message" prefix="Message" errors={formspreeState.errors} className="text-red-500 text-xxs mt-0.5" />
            </div>

            <div className="flex items-center justify-end gap-3 mt-4">
              <Button
                variant="outline"
                type="button"
                onClick={() => setContactModalOpen(false)}
                disabled={contactLoading || formspreeState.submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                disabled={contactLoading || formspreeState.submitting}
              >
                {contactLoading || formspreeState.submitting ? "Sending..." : "Send Message"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Terms of Service Modal */}
      <Modal open={termsModalOpen} onClose={() => setTermsModalOpen(false)} title="ImpactO Terms of Service & Member Agreement" size="lg">
        <div className="flex flex-col gap-4 text-xs font-sans text-gray-700 dark:text-slate-300 select-none leading-relaxed overflow-y-auto max-h-[70vh] pr-1">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 font-semibold text-[11px]">
            Official Operating Regulations for Cooperatives, Unions, Associations & Non-Profits using the ImpactO SaaS Management Platform (Regulated under Rwandan Law N° 058/2021).
          </div>

          <div className="flex flex-col gap-1.5">
            <h4 className="font-bold text-sm text-gray-900 dark:text-white border-b pb-1">1. Acceptance of Terms & Governance Framework</h4>
            <p>
              By registering an organization or logging into an active cooperative workspace on ImpactO, officers, administrators, and members agree to comply with these Terms of Service. ImpactO provides SaaS software infrastructure for member directories, financial ledgers, assembly votes, and grant tracking in accordance with Rwanda Development Board (RDB) and Rwanda Cooperative Agency (RCA) guidelines.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <h4 className="font-bold text-sm text-gray-900 dark:text-white border-b pb-1">2. Organizational Accuracy & Ledger Responsibility</h4>
            <p>
              Cooperative leaders and designated accountants are solely responsible for ensuring that member rosters, share contribution records, and Mobile Money deposit slips uploaded to the platform reflect legitimate transaction histories. Falsification of audit records or improper manual balance adjustments constitutes a breach of platform terms.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <h4 className="font-bold text-sm text-gray-900 dark:text-white border-b pb-1">3. Subscription Plans & Mobile Money Billing</h4>
            <p>
              Platform licensing (Starter, Growth, Pro / Enterprise) is billed on a monthly or annual auto-recurring cycle via Mobile Money (MTN MoMo / Airtel Money) or international card processing. Plan upgrades apply immediately. Cancellations must be initiated prior to the renewal date; paid subscription periods remain active until term expiry.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <h4 className="font-bold text-sm text-gray-900 dark:text-white border-b pb-1">4. Anti-Fraud & Compliance Assurance</h4>
            <p>
              Organizations are strictly prohibited from using the platform for unauthorized crowdfunding, Ponzi schemes, unverified public donor requests, or illicit money transfers. ImpactO reserves the right to suspend workspaces flagged by regulators or anti-money laundering automated monitors.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <h4 className="font-bold text-sm text-gray-900 dark:text-white border-b pb-1">5. Uptime SLA & Data Backups</h4>
            <p>
              ImpactO guarantees a 99.9% platform uptime SLA, backed by automated hourly encrypted database snapshot backups and geo-redundant storage.
            </p>
          </div>

          <div className="pt-4 border-t flex justify-end">
            <Button onClick={() => setTermsModalOpen(false)} className="bg-emerald-700 text-white font-bold">
              I Understand & Accept
            </Button>
          </div>
        </div>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal open={privacyModalOpen} onClose={() => setPrivacyModalOpen(false)} title="ImpactO Privacy Policy & Data Protection Notice" size="lg">
        <div className="flex flex-col gap-4 text-xs font-sans text-gray-700 dark:text-slate-300 select-none leading-relaxed overflow-y-auto max-h-[70vh] pr-1">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-800 dark:text-blue-300 font-semibold text-[11px]">
            Comprehensive Data Privacy Guarantee aligned with Rwanda Law N° 058/2021 relating to the Protection of Personal Data and Privacy.
          </div>

          <div className="flex flex-col gap-1.5">
            <h4 className="font-bold text-sm text-gray-900 dark:text-white border-b pb-1">1. Information We Collect</h4>
            <p>To provide cooperative management services, we securely collect:</p>
            <ul className="list-disc pl-5 flex flex-col gap-1 text-[11px]">
              <li><strong>Member Identity Data</strong>: Full name, phone number, national ID/passport number, email address, and assigned cooperative role.</li>
              <li><strong>Financial Logs</strong>: Mobile Money transaction references, member dues payment slips, grant allocation records, and donation receipts.</li>
              <li><strong>Operational Media</strong>: Organization logos, bylaws, general assembly minutes, and public news releases.</li>
            </ul>
          </div>

          <div className="flex flex-col gap-1.5">
            <h4 className="font-bold text-sm text-gray-900 dark:text-white border-b pb-1">2. Purpose of Data Processing</h4>
            <p>
              Collected information is strictly processed to manage cooperative membership registers, compute financial dues, verify identity trust levels, compile RCA compliance reports, and enable real-time committee chat messaging.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <h4 className="font-bold text-sm text-gray-900 dark:text-white border-b pb-1">3. Data Ownership & Non-Disclosure Guarantee</h4>
            <p>
              Your organization maintains 100% ownership of all uploaded data. ImpactO does <strong>never</strong> sell, lease, or distribute member lists or financial records to third-party advertisers or data brokers.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <h4 className="font-bold text-sm text-gray-900 dark:text-white border-b pb-1">4. Member Rights & Data Access</h4>
            <p>
              Under Rwandan Data Protection laws, members have the right to request access to their stored personal data, request correction of inaccurate records through their organization administrator, or request export of their personal activity logs upon offboarding.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <h4 className="font-bold text-sm text-gray-900 dark:text-white border-b pb-1">5. Security Infrastructure</h4>
            <p>
              All traffic between your browser or mobile phone and ImpactO is encrypted using 256-bit SSL/TLS protocol. Member credentials and authorization tokens are protected using industry-standard salted hashing and role-based access control (RBAC).
            </p>
          </div>

          <div className="pt-4 border-t flex justify-end">
            <Button onClick={() => setPrivacyModalOpen(false)} className="bg-emerald-700 text-white font-bold">
              Close Privacy Notice
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ==========================================
// 2. WHITE-LABELED PUBLIC ORGANIZATION PROFILE PAGE
// ==========================================
export const OrgPublicPage: React.FC = () => {
  const { slug } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { activeOrg, activeMember, setActiveOrg } = useOrgStore();

  const cleanSlug = slug?.startsWith("@") ? slug.slice(1) : slug;

  const { data: org, isLoading: loadingOrg } = useOrganization(cleanSlug);
  const { data: news } = useNews(org?.id);
  const { data: goals } = useGoals(org?.id);
  const { data: donations } = useDonations(org?.id);
  const { data: activities } = useActivityLogs(org?.id);

  const [activeTab, setActiveTab] = useState("about");
  const [successMsg, setSuccessMsg] = useState("");
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Apply organization branding dynamically in head
  React.useEffect(() => {
    if (org) {
      const primary = org.primary_color || "#10b981";
      const secondary = org.secondary_color || "#ca8a04";
      document.documentElement.style.setProperty("--org-primary", primary);
      document.documentElement.style.setProperty("--org-primary-l", primary + "14");
      document.documentElement.style.setProperty("--org-secondary", secondary);
      document.documentElement.style.setProperty("--org-secondary-l", secondary + "14");
    }
  }, [org]);

  // Redirect selected tab if it is configured to be hidden
  React.useEffect(() => {
    if (activeTab === "goals" && org && !(org.show_goals_publicly ?? true)) {
      setActiveTab("about");
    }
    if (activeTab === "impact" && org && !(org.show_impact_publicly ?? true)) {
      setActiveTab("about");
    }
  }, [activeTab, org]);

  if (loadingOrg) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <LogoLoader
          message={t("loading_portal", "Retrieving Organization Portal")}
          subMessage={t("loading_portal_sub", "Secure white-labeled Organization ledger loading...")}
        />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-955 flex items-center justify-center">
        <EmptyState
          icon={<AlertCircle className="h-8 w-8 text-amber-500" />}
          title="Organization Portal Not Found"
          message="The slug or workspace you queried is currently unavailable or doesn't exist."
          action={<Link to="/"><Button>Return Home</Button></Link>}
        />
      </div>
    );
  }

  const isSuperadmin = user?.is_superadmin === true;
  const isMemberOrAdminOfThisOrg = activeOrg?.id === org?.id && activeMember !== null;
  const isAllowedToView = (org.public_page_enabled ?? true) || isSuperadmin || isMemberOrAdminOfThisOrg;

  if (!isAllowedToView) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-955 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-xl flex flex-col items-center gap-5">
          <div className="h-16 w-16 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/10 text-amber-500 rounded-3xl flex items-center justify-center shadow-lg">
            <Lock className="h-8 w-8 animate-pulse" />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-extrabold font-display leading-tight text-gray-910 leading-tight">Organization Portal is Private</h2>
            <p className="text-xs text-gray-400 leading-relaxed font-semibold">
              The workspace administrator of <span className="text-[var(--org-primary)] font-bold">@{org.slug}</span> has set the public portal visibility to private.
            </p>
          </div>
          <p className="text-xs text-slate-400 font-normal max-w-sm">
            If you are an active member or workspace administrator of this Organization, please sign in to your workspace dashboard to access resources.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full mt-2 select-none">
            {user ? (
              <Button onClick={() => navigate("/dashboard")} className="w-full font-bold">
                Go to Workspace Dashboard
              </Button>
            ) : (
              <>
                <Button onClick={() => navigate("/login")} className="w-full font-bold bg-[var(--org-primary)] hover:opacity-95">
                  Sign In to Workspace
                </Button>
                <Button onClick={() => navigate("/")} variant="outline" className="w-full font-bold">
                  Discover Organizations
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const defaultTaglines: Record<string, string> = {
    "Environment": "Preserving Rwanda's landscapes, promoting sustainable practices, and securing a green future.",
    "Education": "Expanding access to knowledge, empowering local schools, and building tomorrow's leaders.",
    "Health": "Providing equitable healthcare, public health training, and community wellness programs.",
    "Social Action": "Mobilizing civic action, supporting vulnerable groups, and cultivating social harmony.",
    "Enterprise": "Empowering local entrepreneurship, fostering trade cooperatives, and driving community wealth."
  };

  const tagline = org.tagline || defaultTaglines[org.org_category] || "Empowering community development and transparent impact tracking.";
  const description = org.description || `We are a registered community organization in Rwanda focused on ${org.org_category || 'development'}. Through transparent leadership, collaborative programs, and verified civic involvement, we strive to build sustainable, high-impact communities across our region. Join us, review our progress, or support our goals below.`;

  const handleShare = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setSuccessMsg("Link copied to clipboard!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch {
      setSuccessMsg("Could not copy automatically.");
    }
  };

  const handleJoinRequest = () => {
    navigate(`/register?org_id=${org.id}`);
    setShowJoinModal(false);
  };

  const confirmedDonors = donations?.filter((d) => d.status === "confirmed") || [];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 pb-16 font-sans">
      <OrgBrandingHeader org={org} onShare={handleShare} onJoin={() => setShowJoinModal(true)} />

      {/* Quick alert */}
      {successMsg && (
        <div className="max-w-4xl mx-auto px-4 mt-4">
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold rounded-lg flex items-center gap-2">
            <Check className="h-4.5 w-4.5" />
            {successMsg}
          </div>
        </div>
      )}

      {/* Dynamic Tabs list */}
      <div className="max-w-4xl mx-auto px-4 mt-6">
        <Tabs
          tabs={[
            { id: "about", label: "About" },
            ...(org.show_goals_publicly ?? true) ? [{ id: "goals", label: "Goals" }] : [],
            ...(org.show_impact_publicly ?? true) ? [{ id: "impact", label: "Impact Log" }] : [],
            { id: "news", label: "News Feed" },
            ...org.marketplace_enabled ? [{ id: "marketplace", label: "Marketplace" }] : []
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />

        {/* Tab content renders */}
        {activeTab === "marketplace" && org.marketplace_enabled && (
          <OrganizationMarketplace orgId={org.id} org={org} isPublic={true} />
        )}
        {activeTab === "about" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {/* Main Column */}
              <div className="md:col-span-2 flex flex-col gap-6">
                <Card title="About Our Organization">
                  <p className="text-sm text-gray-700 dark:text-slate-200 leading-relaxed font-medium">
                    {description}
                  </p>
                  {org.mission && (
                    <div className="mt-4 p-4 bg-emerald-50/70 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40">
                      <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block font-display">Mission Statement</span>
                      <p className="text-sm font-semibold text-gray-800 dark:text-slate-100 mt-1 leading-snug">{org.mission}</p>
                    </div>
                  )}
                  {org.vision && (
                    <div className="mt-3.5 p-4 bg-amber-50/70 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-900/40">
                      <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider block font-display">Vision Statement</span>
                      <p className="text-sm font-semibold text-gray-800 dark:text-slate-100 mt-1 leading-snug">{org.vision}</p>
                    </div>
                  )}
                </Card>

                {/* Integrated Organizational Gallery */}
                {org.gallery_urls && org.gallery_urls.length > 0 && (
                  <Card 
                    title={
                      <div className="flex items-center justify-between w-full">
                        <span className="text-sm font-bold font-display text-gray-900 dark:text-white">Organizational Gallery</span>
                        <Badge color="blue">{org.gallery_urls.length} {org.gallery_urls.length === 1 ? "Photo" : "Photos"}</Badge>
                      </div>
                    }
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 pt-1">
                      {org.gallery_urls.map((url, idx) => (
                        <div key={idx} className="group aspect-square rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-gray-100 dark:bg-slate-800 shadow-2xs relative">
                          <ResolvedImage 
                            src={url} 
                            alt={`Gallery photo ${idx + 1}`} 
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" 
                            bucketName="avatars" 
                          />
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>

              {/* Sidebar Contact & Support */}
              <div className="flex flex-col gap-6">
                <Card title="Quick Info">
                  <div className="flex flex-col gap-3.5 text-xs md:text-sm font-medium">
                    <div className="flex items-center gap-2.5 text-gray-500 dark:text-slate-400">
                      <Building2 className="h-4.5 w-4.5 text-[var(--org-primary,#10b981)] shrink-0" />
                      <span className="text-gray-800 dark:text-slate-200 font-semibold">{org.org_category}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-gray-500 dark:text-slate-400">
                      <MapPin className="h-4.5 w-4.5 text-[var(--org-primary,#10b981)] shrink-0" />
                      <span className="text-gray-800 dark:text-slate-200">{org.location_name || "Kigali, Rwanda"}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-gray-500 dark:text-slate-400">
                      <Globe className="h-4.5 w-4.5 text-[var(--org-primary,#10b981)] shrink-0" />
                      <span className="text-gray-800 dark:text-slate-200 truncate font-semibold">impact-o.app/@{org.slug}</span>
                    </div>

                    {org.contact_us && (
                      <div className="mt-2 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1 text-xs text-gray-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                        <span className="font-bold text-gray-900 dark:text-white">Contact Us:</span>
                        {org.contact_us}
                      </div>
                    )}
                  </div>
                </Card>

                {org.donations_enabled && (
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm border border-amber-400/30 text-center flex flex-col items-center gap-3">
                    <Heart className="h-8 w-8 text-amber-100 fill-amber-200" />
                    <div>
                      <h4 className="font-bold text-sm text-white">Fuel the Workspace</h4>
                      <p className="text-xs text-amber-50/90 mt-1">MoMo Donations are active for this organization.</p>
                    </div>
                    <Link to={`/@${org.slug}/donate`} className="w-full mt-1">
                      <Button variant="secondary" className="w-full font-bold bg-white text-amber-900 hover:bg-amber-50 border-none">
                        Donate Now
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "goals" && (
          <div className="flex flex-col gap-6">
            {goals && goals.length > 0 ? (
              (() => {
                // Group goals by period
                const groups: Record<string, { type: string; label: string; goals: typeof goals }> = {};
                goals.forEach((g) => {
                  const gType = g.period_type || "yearly";
                  const gLabel = g.period_label || (gType === "yearly" ? `${new Date().getFullYear()}` : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
                  const key = `${gType}_${gLabel}`;
                  if (!groups[key]) {
                    groups[key] = { type: gType, label: gLabel, goals: [] };
                  }
                  groups[key].goals.push(g);
                });

                return Object.values(groups).map((periodGroup) => {
                  const pTotal = periodGroup.goals.length;
                  const pAvgAchievement = pTotal > 0
                    ? Math.round(periodGroup.goals.reduce((sum, g) => sum + (g.achievement_percentage || 0), 0) / pTotal)
                    : 0;

                  return (
                    <div key={`${periodGroup.type}_${periodGroup.label}`} className="bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-xs space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white capitalize">
                            {periodGroup.label} {periodGroup.type} Goals
                          </h3>
                          <Badge color={periodGroup.type === "yearly" ? "amber" : "green"}>
                            {periodGroup.type.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-slate-500">Average Score:</span>
                          <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                            {pAvgAchievement}%
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {periodGroup.goals.map((goal) => {
                          const isCompleted = goal.status === "completed" || (goal.achievement_percentage || 0) >= 100;
                          return (
                            <div key={goal.id} className="p-3.5 rounded-xl border bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${isCompleted ? "bg-emerald-500" : "bg-amber-500"}`} />
                                <div className="min-w-0">
                                  <h4 className={`text-sm font-bold text-slate-800 dark:text-slate-100 ${isCompleted ? "line-through text-slate-400" : ""}`}>
                                    {goal.title}
                                  </h4>
                                  {goal.description && (
                                    <p className="text-xs text-slate-500 truncate">{goal.description}</p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                                  {goal.achievement_percentage || 0}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()
            ) : (
              <EmptyState title="No Goals Logged" message="This Organization workspace has not shared any public goals yet." />
            )}
          </div>
        )}

        {activeTab === "news" && (
          <div className="flex flex-col gap-6">
            {news && news.length > 0 ? (
              news.filter((post) => post.visibility === "public").map((post) => (
                <Card key={post.id} title={post.title} action={<Badge color="blue">{post.category}</Badge>} padding={false}>
                  {post.cover_url && (
                    <div className="h-48 w-full">
                      <img src={post.cover_url} alt={post.title} className="h-full w-full object-cover" />
                    </div>
                  )}
                  <div className="p-6">
                    <p className="text-sm font-semibold text-gray-800 leading-normal">{post.excerpt}</p>
                    <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs text-gray-400 leading-none">
                      <span>Published: {new Date(post.published_at || "").toLocaleDateString()}</span>
                      <div className="flex gap-4">
                        <span>Likes: {post.likes_count}</span>
                        <span>Comments: {post.comments_count}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <EmptyState title="No news postings" message="This organization has not posted any announcements recently." />
            )}
          </div>
        )}

      </div>

      {/* Join US Modal */}
      <Modal open={showJoinModal} onClose={() => setShowJoinModal(false)} title="Join Organization Workspace">
        <div className="flex flex-col gap-4 text-sm leading-relaxed">
          <p className="text-gray-500 text-xs">
            Apply to become an active community member of **{org.name}** workspace on Impacto. 
            Once approved, you will get access to full internal events calendars, documents tab, and localized member messaging boards.
          </p>
          <div className="flex items-center justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowJoinModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleJoinRequest}>
              Submit Application
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Subcomponent: Org header
const OrgBrandingHeader: React.FC<{ org: Organization; onShare: () => void; onJoin: () => void }> = ({ org, onShare, onJoin }) => {
  const [resolvedLogo, setResolvedLogo] = React.useState<string>("");
  const [logoErr, setLogoErr] = React.useState(false);
  const [coverErr, setCoverErr] = React.useState(false);

  const rawLogo = org.logo_url || org.dashboard_logo;

  React.useEffect(() => {
    setLogoErr(false);
    if (!rawLogo || rawLogo.startsWith("icon:") || rawLogo === "/logo.png") {
      setResolvedLogo("");
      return;
    }
    let active = true;
    resolveFileUrl(rawLogo, "avatars").then((url) => {
      if (active) setResolvedLogo(url);
    });
    return () => { active = false; };
  }, [rawLogo]);

  const getInitials = (name: string) => {
    return name ? name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() : "ORG";
  };

  const isGradientCover = org.cover_url && (org.cover_url.startsWith("from-") || !org.cover_url.includes("/"));

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800">
      {/* Cover picture - responsive and high contrast */}
      <div className="h-56 md:h-72 w-full bg-slate-900 relative overflow-hidden">
        {org.cover_url && !coverErr ? (
          isGradientCover ? (
            <div className={`h-full w-full bg-gradient-to-r ${org.cover_url}`} />
          ) : (
            <ResolvedImage 
              src={org.cover_url} 
              alt={org.name} 
              className="h-full w-full object-cover" 
              bucketName="avatars"
            />
          )
        ) : (
          <div 
            className="h-full w-full"
            style={{
              background: `linear-gradient(135deg, var(--org-primary, #10b981) 0%, #064e3b 100%)`
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        <Link 
          to="/" 
          className="absolute top-4 left-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur-md hover:bg-white/30 text-white text-xs font-bold px-4 py-2 rounded-full z-30 transition border border-white/20 shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
      </div>

      {/* Profile area - enhanced */}
      <div className="max-w-4xl mx-auto px-4 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 -mt-20 md:-mt-24 relative z-10">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-5">
          <div className="h-20 w-20 md:h-28 md:w-28 rounded-2xl bg-white dark:bg-slate-800 p-1.5 shadow-xl shrink-0 overflow-hidden flex items-center justify-center border border-slate-200/80 dark:border-slate-700">
            {resolvedLogo && !logoErr ? (
              <img 
                src={resolvedLogo} 
                alt={org.name} 
                className="h-full w-full object-contain rounded-xl" 
                onError={() => setLogoErr(true)}
              />
            ) : (
              <div 
                className="h-full w-full rounded-xl flex items-center justify-center text-white text-3xl font-extrabold shadow-inner"
                style={{
                  background: `linear-gradient(135deg, var(--org-primary, #10b981) 0%, var(--org-secondary, #ca8a04) 100%)`
                }}
              >
                {getInitials(org.name)}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1 pb-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white leading-tight">
              {org.name}
            </h1>
            <p className="text-xs md:text-sm text-gray-700 dark:text-slate-300 font-medium">
              {org.tagline}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <Button variant="outline" size="sm" icon={<Share2 className="h-4 w-4" />} onClick={onShare}>
            Share
          </Button>
          {(org.allow_public_joining ?? true) && (
            <Button size="sm" onClick={onJoin} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9">
              Join Organization
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 3. INTEGRATED DONATION EXECUTION PAGE
// ==========================================
export const DonatePage: React.FC = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { t } = useLocalTranslation();

  const cleanSlug = slug?.startsWith("@") ? slug.slice(1) : slug;
  const { data: org, isLoading } = useOrganization(cleanSlug);
  const donationMutation = useCreateDonation();

  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [amount, setAmount] = useState<number>(5000);
  const [msg, setMsg] = useState("");
  const [momoMethod, setMomoMethod] = useState<"mtn" | "airtel">("mtn");
  const [proofSent, setProofSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const presets = [1000, 5000, 10000, 25000];

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donorName || !donorEmail || !amount) {
      setErrorMsg(t("Please fill in Name, Email and select Amount."));
      return;
    }

    try {
      await donationMutation.mutateAsync({
        org_id: org?.id || "",
        amount,
        donor_name: donorName,
        donor_email: donorEmail,
        message: msg,
        payment_method: momoMethod,
        proof_url: ""
      });
      setProofSent(true);
    } catch {
      setErrorMsg(t("Failed to upload receipt record."));
    }
  };

  if (isLoading) return <div className="p-16 text-center text-sm">{t("Validating Portal...")}</div>;
  if (!org) return <div className="p-16 text-center text-sm">{t("Organization workspace is offline.")}</div>;

  if (!org.donations_enabled) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <EmptyState 
          title="Donations Not Active" 
          message="This organization currently has public donations disabled." 
          action={<Link to={`/@${org.slug}`}><Button>Return to Profile</Button></Link>}
        />
      </div>
    );
  }

  const momoNumber = momoMethod === "mtn" ? org.donation_mtn_number : org.donation_airtel_number;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 pb-16 pt-8 px-4 font-sans select-none">
      <div className="w-full max-w-xl mx-auto flex flex-col gap-6 animate-in fade-in duration-150">
        <div className="flex flex-col gap-2 border-b pb-4 mb-4">
          <Link to={`/@${org.slug}`} className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-emerald-600 font-bold mb-2 w-fit bg-white dark:bg-slate-900 border border-gray-250 dark:border-slate-800 px-3.5 py-1.5 rounded-full transition shadow-3xs cursor-pointer">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Profile
          </Link>
          <div className="flex items-center gap-3">
            <Avatar name={org.name} size="xs" src={org.logo_url} />
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-gray-910 leading-none">{org.name}</span>
              <span className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">{t("Branded Donation System")}</span>
            </div>
          </div>
        </div>

        {proofSent ? (
          <Card title={t("Donation Submitted")} className="text-center font-display flex flex-col items-center">
            <div className="p-3 bg-emerald-50 rounded-full text-emerald-600 mb-4 h-12 w-12 flex items-center justify-center">
              <FileCheck className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-gray-900 text-base md:text-lg">{t("Donation Submitted!")}</h3>
            <p className="text-xs text-gray-500 max-w-sm mt-2">
              {t("Our administration at")} **{org.name}** {t("has received your pledge. Your name will be approved and placed on our public wall shortly.")}
            </p>
            <div className="flex gap-4 mt-8 w-full md:w-3/4 shrink-0 justify-center">
              <Button onClick={() => navigate(`/@${slug}`)} className="w-1/2">{t("Back to Profile")}</Button>
            </div>
          </Card>
        ) : (
          <form onSubmit={handleSubmitProof} className="flex flex-col gap-6">
            <Card title={t("MoMo Donation Options")}>
              {errorMsg && <div className="p-3 bg-red-50 text-red-700 text-xs rounded border border-red-150 font-semibold mb-4 leading-normal">{errorMsg}</div>}

              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label={t("Full Name (for Wall)")}
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    placeholder={t("e.g. Alphonse Nshuti")}
                  />
                  <Input
                    label={t("Email (Auditable)")}
                    type="email"
                    value={donorEmail}
                    onChange={(e) => setDonorEmail(e.target.value)}
                    placeholder="alphonse@work.rw"
                  />
                </div>

                {/* Amount presets slider */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-750">{t("Donation Amount (RWF)")}</label>
                  <div className="grid grid-cols-4 gap-2">
                    {presets.map((p) => (
                      <button
                        type="button"
                        key={p}
                        onClick={() => setAmount(p)}
                        className={`py-2 text-xs font-bold rounded-lg border transition ${
                          amount === p
                            ? "bg-[var(--org-primary)] border-[var(--org-primary)] text-white shadow"
                            : "bg-white border-gray-250 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {p.toLocaleString()}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 w-full">
                    <Input
                      type="number"
                      placeholder={t("Or enter custom amount in RWF")}
                      value={amount || ""}
                      onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <Input
                  label={t("Optional message")}
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  placeholder={t("e.g. Keep up the high effort reforestation guides!")}
                />
              </div>
            </Card>

            {/* Merchant info */}
            <Card title={t("Rwandan Mobile Money Instructions")}>
              <div className="flex flex-col gap-4 text-xs font-medium">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setMomoMethod("mtn")}
                    className={`p-3.5 border rounded-xl font-bold font-display flex flex-col items-center gap-1.5 transition ${
                      momoMethod === "mtn"
                        ? "border-[#15803D] bg-emerald-50/40 text-[#15803D]"
                        : "border-gray-250 bg-white"
                    }`}
                  >
                    {t("MTN Mobile Money")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMomoMethod("airtel")}
                    className={`p-3.5 border rounded-xl font-bold font-display flex flex-col items-center gap-1.5 transition ${
                      momoMethod === "airtel"
                        ? "border-[#15803D] bg-emerald-50/40 text-[#15803D]"
                        : "border-gray-250 bg-white"
                    }`}
                  >
                    {t("Airtel Money")}
                  </button>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-750 border rounded-xl flex flex-col gap-3">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-gray-450 leading-none">{t("Registered Name:")}</span>
                    <span className="font-bold text-gray-901">{org.donation_account_name || org.name}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-gray-450 leading-none">{t("Registered Number:")}</span>
                    <span className="font-mono font-bold text-emerald-650">{momoNumber || t("Not Configured")}</span>
                  </div>
                  <div className="flex justify-between items-center leading-none">
                    <span className="text-gray-450">{t("Estimated confirm window:")}</span>
                    <span className="font-semibold text-slate-700">{t("Instant — 2 hours")}</span>
                  </div>
                </div>

                {/* Dial instructions */}
                <div className="p-3 bg-amber-50 rounded-lg text-amber-800 text-[11px] leading-relaxed select-none">
                  <span className="font-bold text-amber-900 block">{t("Dial to Deposit Instructions:")}</span>
                  {t("Dial")} <span className="font-bold font-mono text-gray-901">*182#</span> {t("on your mobile device. Pay Amount of")} **{amount.toLocaleString()} RWF** {t("directly to merchant code/phone listed above.")} 
                </div>
              </div>
            </Card>

            <Button type="submit" loading={donationMutation.isPending} className="w-full py-3 text-sm font-bold shadow-md">
              {t("Confirm Donation")}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

// Haversine formula helper for geo-fencing checks
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
}

// ==========================================
// 4. EVENT & MEETING CHECK-IN SCREEN (@slug/checkin)
// ==========================================
export const EventCheckinPage: React.FC = () => {
  const navigate = useNavigate();
  const { slug } = useParams();

  const cleanSlug = slug?.startsWith("@") ? slug.slice(1) : slug;
  const checkinMutation = useCheckIn();
  const { data: org } = useOrganization(cleanSlug);
  const { data: events } = useEvents(org?.id);
  const { data: meetings } = useMeetings(org?.id);
  const saveMeetingAttendanceMutation = useSaveMeetingAttendance();

  // URL Query Parameters
  const params = new URLSearchParams(window.location.search);
  const urlMeetId = params.get("meetId") || "";
  const urlEventId = params.get("eventId") || "";

  // Selection state
  const [selectedType, setSelectedType] = useState<"event" | "meeting">(urlMeetId ? "meeting" : "event");
  const [selectedId, setSelectedId] = useState(urlMeetId || urlEventId || "");
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isVerifyingGeo, setIsVerifyingGeo] = useState(false);
  const [geoResult, setGeoResult] = useState<{
    success: boolean;
    distance?: number;
    limit?: number;
    message?: string;
    status: "present" | "mismatch" | "attempted";
  } | null>(null);

  // Auto-fill or adjust state when data loads
  useEffect(() => {
    if (urlMeetId) {
      setSelectedType("meeting");
      setSelectedId(urlMeetId);
    } else if (urlEventId) {
      setSelectedType("event");
      setSelectedId(urlEventId);
    }
  }, [urlMeetId, urlEventId]);

  // Find selected item details
  const activeEvent = selectedType === "event" ? events?.find((e) => e.id === selectedId) : null;
  const activeMeeting = selectedType === "meeting" ? meetings?.find((m) => m.id === selectedId) : null;

  const itemTitle = activeEvent ? activeEvent.title : activeMeeting ? activeMeeting.title : "";
  const itemLocationType = activeEvent 
    ? (activeEvent.location_type || "on-site") 
    : activeMeeting 
      ? (activeMeeting.location_type || "on-site") 
      : "on-site";

  const targetLat = activeEvent ? activeEvent.latitude : activeMeeting ? activeMeeting.latitude : undefined;
  const targetLng = activeEvent ? activeEvent.longitude : activeMeeting ? activeMeeting.longitude : undefined;
  const radiusMeters = activeEvent 
    ? (activeEvent.radius_meters || 100) 
    : activeMeeting 
      ? (activeMeeting.radius_meters || 100) 
      : 100;

  const handleVerifyAndCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) {
      setErrorMsg("Please select a valid scheduled session.");
      return;
    }

    setErrorMsg("");
    setIsVerifyingGeo(true);
    setGeoResult(null);

    // Default coordinates in case geofence is used but fails (e.g. Kigali central coordinates)
    let userLat = -1.9441;
    let userLng = 30.0619;
    let distance: number | undefined = undefined;
    let finalStatus: "present" | "mismatch" | "attempted" = "present";
    let geoMessage = "Attendance logged successfully as Present.";

    const completeCheckinProcess = async (statusVal: "present" | "mismatch" | "attempted", distanceVal?: number) => {
      try {
        if (selectedType === "event") {
          await checkinMutation.mutateAsync({
            event_id: selectedId,
            member_id: "member-2", // standard mock user
            method: "qr",
            status: statusVal,
            attempt_lat: userLat,
            attempt_lng: userLng,
            distance_meters: distanceVal,
          });
        } else {
          // For meeting attendance, load existing checklist, append member-2, and save
          const key = `meet_attn_${selectedId}`;
          const currentList = JSON.parse(localStorage.getItem(key) || "[]");
          if (!currentList.includes("member-2")) {
            currentList.push("member-2");
          }
          localStorage.setItem(key, JSON.stringify(currentList));

          // Save coordinates & status detail for admin review
          const detailKey = `meet_att_detail_${selectedId}_member-2`;
          localStorage.setItem(detailKey, JSON.stringify({
            status: statusVal,
            attempt_lat: userLat,
            attempt_lng: userLng,
            distance_meters: distanceVal,
            check_in_method: "qr",
            check_in_time: new Date().toISOString()
          }));

          await saveMeetingAttendanceMutation.mutateAsync({
            meetingId: selectedId,
            memberIds: currentList
          });
        }
        setSuccess(true);
      } catch (err: any) {
        setErrorMsg(err?.message || "Check in failed to compile in logs.");
      } finally {
        setIsVerifyingGeo(false);
      }
    };

    // If it's online, no geofence check is required. Easy check-in.
    if (itemLocationType === "online") {
      setSuccessMessage("Thank you! Your virtual attendance has been instantly confirmed with the organizer.");
      await completeCheckinProcess("present");
      return;
    }

    // Geofenced physical session checks
    if (targetLat !== undefined && targetLng !== undefined) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            userLat = pos.coords.latitude;
            userLng = pos.coords.longitude;
            distance = calculateDistance(userLat, userLng, targetLat, targetLng);

            if (distance <= radiusMeters) {
              finalStatus = "present";
              setSuccessMessage(`Excellent! Geofence verified. You are within ${distance.toFixed(0)}m of the venue. Attendance logged successfully!`);
              await completeCheckinProcess("present", distance);
            } else {
              finalStatus = "mismatch";
              setSuccessMessage(`Attendance logged! You are ${distance.toFixed(0)}m away, which is outside the set ${radiusMeters}m fence. We recorded your presence attempt gently so your administrator can review and confirm it.`);
              await completeCheckinProcess("mismatch", distance);
            }
          },
          async (err) => {
            // Geolocation permissions denied or timed out. Be kind and log anyway!
            finalStatus = "attempted";
            setSuccessMessage("Attendance logged! Geolocation permissions were unavailable, but we have submitted your presence attempt for administrator approval.");
            await completeCheckinProcess("attempted");
          },
          { enableHighAccuracy: true, timeout: 6000 }
        );
      } else {
        // Geolocation not supported by browser
        finalStatus = "attempted";
        setSuccessMessage("Attendance logged! Your browser does not support geolocation tracking, so we submitted your presence check-in for admin review.");
        await completeCheckinProcess("attempted");
      }
    } else {
      // No coordinates set on the event, standard presence
      setSuccessMessage("On-site attendance recorded successfully. The administrators did not configure active geolocation fencing for this session.");
      await completeCheckinProcess("present");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <Card title="Mobile Attendance Portal" className="w-full max-w-md shadow-xl border border-gray-150">
        {success ? (
          <div className="text-center flex flex-col items-center gap-3">
            <span className="p-3 bg-emerald-50 rounded-full text-emerald-600 mb-2 border border-emerald-200">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <h3 className="font-bold text-gray-900 text-base md:text-lg">Check-In Completed!</h3>
            <p className="text-xs text-gray-600 dark:text-slate-300 font-medium leading-relaxed px-2">
              {successMessage || "Your presence has been saved to our cooperative logs."}
            </p>
            <div className="p-3 bg-gray-50 dark:bg-slate-900 rounded-xl w-full text-[11px] text-gray-400 font-mono mt-2 leading-tight">
              Type: {selectedType.toUpperCase()} | Session: {itemTitle || "Active Sync"}
            </div>
            <Button onClick={() => navigate(`/@${slug}`)} className="mt-4 w-full">
              Return to Public Profile
            </Button>
          </div>
        ) : (
          <form onSubmit={handleVerifyAndCheckin} className="flex flex-col gap-4">
            <p className="text-xs text-gray-500 mb-2 leading-relaxed">
              Scan or select your cooperative's current scheduled session to verify your attendance presence.
            </p>

            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded border border-red-150 font-semibold mb-4 leading-normal">
                {errorMsg}
              </div>
            )}

            {/* Toggle Session Type */}
            {!urlMeetId && !urlEventId && (
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => { setSelectedType("event"); setSelectedId(""); }}
                  className={`py-1.5 text-xs font-bold rounded-md transition ${selectedType === "event" ? "bg-white text-stone-900 shadow-sm" : "text-gray-500"}`}
                >
                  Community Events
                </button>
                <button
                  type="button"
                  onClick={() => { setSelectedType("meeting"); setSelectedId(""); }}
                  className={`py-1.5 text-xs font-bold rounded-md transition ${selectedType === "meeting" ? "bg-white text-stone-900 shadow-sm" : "text-gray-500"}`}
                >
                  Governance Meetings
                </button>
              </div>
            )}

            {/* Selector list */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-700">Active Sessions</label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full text-xs rounded-lg border bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 px-3.5 py-2.5 text-gray-805 outline-none focus:ring-2 focus:ring-[var(--org-primary)] transition"
              >
                <option value="">-- Choose Active Session --</option>
                {selectedType === "event" ? (
                  events?.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      🗓️ {ev.title} ({new Date(ev.date_time).toLocaleDateString()})
                    </option>
                  ))
                ) : (
                  meetings?.map((meet) => (
                    <option key={meet.id} value={meet.id}>
                      🕒 {meet.title} ({new Date(meet.date_time).toLocaleDateString()})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Details Widget of Selected Item */}
            {selectedId && (activeEvent || activeMeeting) && (
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 dark:bg-slate-900/40 text-xs flex flex-col gap-2.5 animate-in">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[10px] tracking-wider uppercase text-gray-400">Session Mode</span>
                  {itemLocationType === "online" ? (
                    <Badge color="blue">💻 ONLINE VIRTUAL</Badge>
                  ) : (
                    <Badge color="green">📍 PHYSICAL ON-SITE</Badge>
                  )}
                </div>

                <div className="flex flex-col leading-tight">
                  <span className="font-bold text-gray-900 dark:text-white text-sm leading-snug">{itemTitle}</span>
                  <span className="text-[10px] text-gray-400 mt-1 font-mono">
                    Time: {new Date(activeEvent ? activeEvent.date_time : activeMeeting!.date_time).toLocaleString()}
                  </span>
                </div>

                {itemLocationType === "on-site" && (
                  <div className="pt-2 border-t border-dashed border-gray-200 mt-1">
                    <span className="text-[10px] text-gray-400 font-bold block mb-1">🌍 GEOLOCATION SECURITY:</span>
                    {targetLat !== undefined && targetLng !== undefined ? (
                      <div className="flex flex-col gap-1 text-[11px] text-gray-600 dark:text-slate-300">
                        <span className="flex items-center gap-1 font-semibold">
                          <MapPin className="h-3 w-3 text-emerald-500" /> Fence Target: {targetLat.toFixed(4)}, {targetLng.toFixed(4)}
                        </span>
                        <span className="flex items-center gap-1 font-semibold">
                          <Compass className="h-3 w-3 text-emerald-500" /> Acceptable Boundary: within {radiusMeters} meters
                        </span>
                        <p className="text-[10px] text-stone-400 leading-snug mt-1">
                          You will be scanned. If you are outside the boundary, your presence is still marked as Tried to Attend for admin confirmation.
                        </p>
                      </div>
                    ) : (
                      <span className="text-[10px] text-amber-600 font-semibold italic flex items-center gap-1">
                        <ShieldAlert className="h-3.5 w-3.5" /> No strict geofence configured. Normal check-in will run.
                      </span>
                    )}
                  </div>
                )}

                {itemLocationType === "online" && (
                  <div className="pt-2 border-t border-dashed border-gray-200 text-[11px] text-gray-600 dark:text-slate-300">
                    <p className="leading-relaxed">
                      Simply click below to declare your attendance. Virtual presence requires no location scan.
                    </p>
                  </div>
                )}
              </div>
            )}

            <Button
              type="submit"
              loading={isVerifyingGeo || checkinMutation.isPending || saveMeetingAttendanceMutation.isPending}
              disabled={!selectedId}
              className={`w-full mt-3 font-bold py-3 text-sm flex items-center justify-center gap-2 ${
                itemLocationType === "online" 
                  ? "bg-blue-600 hover:bg-blue-700 text-white" 
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              {isVerifyingGeo ? (
                <>
                  <Compass className="h-4 w-4 animate-spin" />
                  Verifying Geofence Boundary...
                </>
              ) : (
                <>
                  <QrCode className="h-4 w-4" />
                  {itemLocationType === "online" ? "Confirm Online Attendance" : "Verify & Check-In On-Site"}
                </>
              )}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
};
