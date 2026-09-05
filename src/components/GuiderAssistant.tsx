import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Compass,
  Sparkles,
  X,
  Search,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  RotateCcw,
  BookOpen,
  Send,
  MessageSquare,
  Globe,
  Layers,
  Wallet,
  FileText,
  Users,
  Calendar,
  Clock,
  Target,
  ShoppingBag,
  Crown,
  Settings,
  Lightbulb,
  Maximize2,
  Minimize2,
  Check,
  ShieldCheck,
  Building2,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import guiderData from "../data/guiderKnowledgeBase.json";
import { useAuthStore } from "../store/authStore";
import { useOrgStore } from "../store/orgStore";

interface GuiderAssistantProps {
  defaultOpen?: boolean;
}

type LangCode = "en" | "rw" | "fr";

interface ChatItem {
  id: string;
  sender: "bot" | "user";
  text?: string;
  nodeId?: string;
  flowId?: string;
  timestamp: string;
  options?: {
    id: string;
    label: Record<string, string>;
    targetNode?: string;
    flowId?: string;
  }[];
  actionUrl?: string;
  actionText?: Record<string, string>;
  roleNote?: string;
}

export const GuiderAssistant: React.FC<GuiderAssistantProps> = ({ defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentNodeId, setCurrentNodeId] = useState<string>("root");
  const [chatHistory, setChatHistory] = useState<ChatItem[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [expandedView, setExpandedView] = useState(false);

  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Store user & organization context
  const { user, updateUserLanguage } = useAuthStore();
  const { activeOrg, activeMember } = useOrgStore();

  // Active language detection: default to i18n.language or localStorage or fallback to "en"
  const [currentLang, setCurrentLang] = useState<LangCode>(() => {
    const l = (user?.preferred_language || i18n.language || localStorage.getItem("i18nextLng") || "en").toLowerCase();
    if (l.startsWith("rw")) return "rw";
    if (l.startsWith("fr")) return "fr";
    return "en";
  });

  // Keep in sync with main app i18n
  useEffect(() => {
    const l = (i18n.language || "en").toLowerCase();
    if (l.startsWith("rw")) setCurrentLang("rw");
    else if (l.startsWith("fr")) setCurrentLang("fr");
    else setCurrentLang("en");
  }, [i18n.language]);

  const changeLanguage = (lang: LangCode) => {
    setCurrentLang(lang);
    try {
      updateUserLanguage(lang);
    } catch (e) {
      console.warn("Language switch fallback:", e);
    }
  };

  // Determine user role and plan details
  const userRole = activeMember?.role || (user?.is_superadmin ? "superadmin" : "member");
  const subscriptionPlan = activeOrg?.subscription_tier || "starter";

  const roleLabels: Record<string, Record<LangCode, string>> = {
    superadmin: { en: "Super Admin", rw: "Umuyobozi Mukuru", fr: "Super Administrateur" },
    org_admin: { en: "Organization Admin", rw: "Umuyobozi wa Koperative", fr: "Administrateur" },
    manager: { en: "Operations Manager", rw: "Umuyobozi w'Imirimo", fr: "Gestionnaire" },
    accountant: { en: "Chief Accountant", rw: "Umucungamari", fr: "Comptable en Chef" },
    member: { en: "Cooperative Member", rw: "Umunyamuryango", fr: "Membre Coopérateur" }
  };

  const planLabels: Record<string, Record<LangCode, string>> = {
    trial: { en: "Free Trial", rw: "Icyiciro cy'Igerageza", fr: "Essai Gratuit" },
    starter: { en: "Starter Tier ($10)", rw: "Ifatabuguzi rya Starter ($10)", fr: "Forfait Starter (10 $)" },
    growth: { en: "Growth Tier ($25)", rw: "Ifatabuguzi rya Growth ($25)", fr: "Forfait Growth (25 $)" },
    enterprise: { en: "Pro Plan ($40)", rw: "Ifatabuguzi rya Pro ($40)", fr: "Forfait Pro (40 $)" }
  };

  const displayRoleName = roleLabels[userRole]?.[currentLang] || roleLabels.member[currentLang];
  const displayPlanName = planLabels[subscriptionPlan]?.[currentLang] || planLabels.starter[currentLang];
  const userName = user?.full_name || (currentLang === "rw" ? "Umunyamuryango" : "Member");

  // Localized UI strings
  const labels = useMemo(() => {
    if (currentLang === "rw") {
      return {
        floatingBtn: "Baza",
        floatingSubtitle: "Imfashanyigisho",
        title: "Baza • Imfashanyigisho ya Koperative",
        subtitle: "Ubuyobozi buhagije ku bikoresho byose bya Impacto",
        searchPlaceholder: "Andika ikibazo cyangwa icyo ushaka...",
        categories: "Ibyiciro by'Amakuru",
        browseFlows: "Inzira z'Imfashanyigisho",
        quickTips: "Inama Z'Ingirakamaro",
        startInteractive: "Tangira Imfashanyigisho",
        stepCount: "Intambwe ya",
        of: "kuri",
        nextStep: "Intambwe Ikurikira",
        prevStep: "Subira Inyuma",
        finishFlow: "Nsoje Imfashanyigisho",
        restartFlow: "Ongera Utangire",
        targetScreen: "Aho Uribusange",
        proTip: "Inama y'Inzobere",
        jumpToFeature: "Fungura Iki Gikoresho",
        askSomething: "Andika ubutumwa cyangwa ikibazo...",
        resetChat: "Subira ku ntangiriro",
        close: "Funga",
        noResults: "Nta gisubizo kibonetse kuri iri jambo.",
        noResultsTip: "Gerageza andi magambo nka 'imisanzu', 'inyandiko', 'inama', cyangwa 'ubwisungane'.",
        suggestedNext: "Ibyo wakora bikurikira:",
        faqTitle: "Ibibazo Bikunze Kubazwa",
        myRole: "Inshingano zanjye",
        myPlan: "Ifatabuguzi",
        contextBanner: "Urugero rwa Paji urimo",
        jumpContextAction: "Fasha kuri iyi paji"
      };
    }
    if (currentLang === "fr") {
      return {
        floatingBtn: "Guider",
        floatingSubtitle: "Assistant",
        title: "Guider • Assistant Coopératif Impacto",
        subtitle: "Accompagnement interactif pas-à-pas pour toutes vos fonctionnalités",
        searchPlaceholder: "Posez une question ou recherchez une action...",
        categories: "Catégories thématiques",
        browseFlows: "Guides disponibles",
        quickTips: "Astuces & Bonnes Pratiques",
        startInteractive: "Lancer le guide",
        stepCount: "Étape",
        of: "sur",
        nextStep: "Étape suivante",
        prevStep: "Étape précédente",
        finishFlow: "Terminer le guide",
        restartFlow: "Recommencer",
        targetScreen: "Élément cible",
        proTip: "Conseil pratique",
        jumpToFeature: "Accéder au module",
        askSomething: "Tapez une question ou choisissez une option...",
        resetChat: "Réinitialiser",
        close: "Fermer",
        noResults: "Aucun résultat trouvé.",
        noResultsTip: "Essayez avec d'autres mots-clés comme 'cotisations', 'membres', 'rapports' ou 'documents'.",
        suggestedNext: "Suggestions d'actions :",
        faqTitle: "Foire Aux Questions",
        myRole: "Mon rôle",
        myPlan: "Forfait actif",
        contextBanner: "Page actuelle",
        jumpContextAction: "Aide pour cette page"
      };
    }
    return {
      floatingBtn: "Guider",
      floatingSubtitle: "Assistant",
      title: "Guider • Interactive Cooperative Assistant",
      subtitle: "Contextual walkthroughs, state machines, and help for every Impacto feature",
      searchPlaceholder: "Ask a question or search for actions...",
      categories: "Knowledge Categories",
      browseFlows: "Interactive Walkthroughs",
      quickTips: "Quick Tips & Best Practices",
      startInteractive: "Start Walkthrough",
      stepCount: "Step",
      of: "of",
      nextStep: "Next Step",
      prevStep: "Previous Step",
      finishFlow: "Finish Guide",
      restartFlow: "Restart",
      targetScreen: "Target Interface",
      proTip: "Pro-Tip",
      jumpToFeature: "Jump to Feature",
      askSomething: "Ask a question or select a node...",
      resetChat: "Reset",
      close: "Close",
      noResults: "No results matched your search.",
      noResultsTip: "Try keywords like 'dues', 'members', 'private document', 'excel', 'meetings', or 'downgrade'.",
      suggestedNext: "Suggested Next Actions:",
      faqTitle: "Frequently Asked Questions",
      myRole: "My Role",
      myPlan: "Current Plan",
      contextBanner: "Current Context",
      jumpContextAction: "Get help for this page"
    };
  }, [currentLang]);

  // Translate node helper
  const getNodeText = (node: any) => {
    let t = node?.text?.[currentLang] || node?.text?.en || "";
    t = t.replace("{userName}", userName);
    t = t.replace("{roleLabel}", displayRoleName);
    t = t.replace("{planLabel}", displayPlanName);
    return t;
  };

  // Get role specific note for a node
  const getRoleNote = (node: any) => {
    if (!node?.roleSpecificNotes) return null;
    const noteObj = node.roleSpecificNotes[userRole] || node.roleSpecificNotes["member"];
    return noteObj?.[currentLang] || noteObj?.en || null;
  };

  // Initialize root chat node
  const initChatWithNode = (nodeId: string = "root") => {
    const rawNode = (guiderData.nodes as any)?.[nodeId] || (guiderData.nodes as any)?.root;
    if (!rawNode) return;

    setCurrentNodeId(nodeId);
    setActiveFlowId(null);
    setCurrentStepIndex(0);

    const initialItem: ChatItem = {
      id: "node_" + Date.now(),
      sender: "bot",
      text: getNodeText(rawNode),
      nodeId: rawNode.id,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      options: rawNode.options || [],
      actionUrl: rawNode.actionUrl,
      actionText: rawNode.actionText,
      roleNote: getRoleNote(rawNode) || undefined
    };

    setChatHistory([initialItem]);
  };

  // Reset or initialize on first load
  useEffect(() => {
    if (chatHistory.length === 0) {
      initChatWithNode("root");
    }
  }, []);

  // Sync scroll to bottom of chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, activeFlowId, currentStepIndex]);

  // Contextual current page helper
  const currentPath = location.pathname;
  const pageContext = useMemo(() => {
    if (currentPath.includes("fees")) {
      return {
        title: currentLang === "rw" ? "Paji y'Imisanzu & Amafaranga" : "Fees & Dues Management",
        nodeId: "node_dues",
        flowId: "record_dues_payment"
      };
    }
    if (currentPath.includes("documents")) {
      return {
        title: currentLang === "rw" ? "Paji y'Inyandiko & Office" : "Documents & Office Workspace",
        nodeId: "node_documents",
        flowId: "private_doc_access"
      };
    }
    if (currentPath.includes("members")) {
      return {
        title: currentLang === "rw" ? "Paji y'Abanyamuryango" : "Members Directory",
        nodeId: "node_members",
        flowId: "member_management_roles"
      };
    }
    if (currentPath.includes("meetings")) {
      return {
        title: currentLang === "rw" ? "Paji y'Inama n'Imyanzuro" : "Meetings & Assembly",
        nodeId: "node_meetings",
        flowId: "meetings_and_minutes"
      };
    }
    if (currentPath.includes("events")) {
      return {
        title: currentLang === "rw" ? "Paji y'Ibikorwa & QR" : "Events & QR Scanner",
        nodeId: "node_events",
        flowId: "events_and_qr_attendance"
      };
    }
    if (currentPath.includes("ledger")) {
      return {
        title: currentLang === "rw" ? "Igitabo cy'Imari" : "Financial Ledger",
        nodeId: "node_dues",
        flowId: "financial_ledger_bookkeeping"
      };
    }
    return null;
  }, [currentPath, currentLang]);

  // Select node option handler
  const handleSelectOption = (opt: any) => {
    // Add user response bubble
    const userMsg: ChatItem = {
      id: "user_" + Date.now(),
      sender: "user",
      text: opt.label?.[currentLang] || opt.label?.en || "Selected Option",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    if (opt.flowId) {
      setChatHistory((prev) => [...prev, userMsg]);
      handleStartFlow(opt.flowId);
      return;
    }

    if (opt.targetNode) {
      const nextNode = (guiderData.nodes as any)?.[opt.targetNode];
      if (nextNode) {
        setCurrentNodeId(opt.targetNode);
        const botMsg: ChatItem = {
          id: "bot_" + Date.now(),
          sender: "bot",
          text: getNodeText(nextNode),
          nodeId: nextNode.id,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          options: nextNode.options || [],
          actionUrl: nextNode.actionUrl,
          actionText: nextNode.actionText,
          roleNote: getRoleNote(nextNode) || undefined
        };
        setChatHistory((prev) => [...prev, userMsg, botMsg]);
      }
    }
  };

  // Start a step-by-step interactive flow
  const handleStartFlow = (flowId: string) => {
    setActiveFlowId(flowId);
    setCurrentStepIndex(0);
    const flow = guiderData.flows.find((f) => f.id === flowId);
    if (flow) {
      const botMsg: ChatItem = {
        id: "flow_launch_" + Date.now(),
        sender: "bot",
        text: `### 🚀 ${flow.titles[currentLang] || flow.titles.en}\n\n${flow.explanation[currentLang] || flow.explanation.en}`,
        flowId: flow.id,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        actionUrl: flow.targetUrl,
        actionText: {
          en: "Navigate to " + (flow.titles.en || "Feature"),
          rw: "Jya kuri iyi paji",
          fr: "Aller à cette section"
        }
      };
      setChatHistory((prev) => [...prev, botMsg]);
    }
  };

  // Natural Language Search / Query Matching
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputVal.trim().toLowerCase();
    if (!query) return;

    const userMessage: ChatItem = {
      id: "usr_" + Date.now(),
      sender: "user",
      text: inputVal,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setInputVal("");

    // Look for matching flows in database
    const matchedFlows = guiderData.flows.filter((flow) => {
      const enKw = flow.keywords.en || [];
      const rwKw = flow.keywords.rw || [];
      const frKw = flow.keywords.fr || [];
      const allKw = [...enKw, ...rwKw, ...frKw];

      const titleMatch =
        (flow.titles.en && flow.titles.en.toLowerCase().includes(query)) ||
        (flow.titles.rw && flow.titles.rw.toLowerCase().includes(query)) ||
        (flow.titles.fr && flow.titles.fr.toLowerCase().includes(query));

      const kwMatch = allKw.some((k) => query.includes(k.toLowerCase()) || k.toLowerCase().includes(query));
      return titleMatch || kwMatch;
    });

    let botResponseText = "";
    let matchedOptions: any[] = [];

    if (matchedFlows.length > 0) {
      const topFlow = matchedFlows[0];
      botResponseText = `### 💡 ${topFlow.titles[currentLang] || topFlow.titles.en}\n\n${topFlow.descriptions[currentLang] || topFlow.descriptions.en}\n\n${topFlow.explanation[currentLang] || topFlow.explanation.en}`;

      matchedOptions = [
        {
          id: "opt_flow_" + topFlow.id,
          label: {
            en: `👉 Start Step-by-Step Guide: ${topFlow.titles.en}`,
            rw: `👉 Tangira Imfashanyigisho: ${topFlow.titles.rw || topFlow.titles.en}`,
            fr: `👉 Lancer le guide : ${topFlow.titles.fr || topFlow.titles.en}`
          },
          flowId: topFlow.id
        },
        {
          id: "opt_back_menu",
          label: { en: "🏠 Back to Main Menu", rw: "🏠 Subira ku Ntangiriro", fr: "🏠 Menu principal" },
          targetNode: "root"
        }
      ];
    } else {
      botResponseText =
        currentLang === "rw"
          ? `Ntabwo mbashije guhita mbona igisubizo cy'ijambo "${query}". Gerageza guhitamo kimwe mu byiciro by'amakuru biri hasi cyangwa usubire ku ntangiriro:`
          : currentLang === "fr"
          ? `Je n'ai pas trouvé de correspondance exacte pour "${query}". Vous pouvez sélectionner un thème ci-dessous ou revenir au menu principal :`
          : `I couldn't find an exact match for "${query}". You can select from one of our structured guides below:`;

      matchedOptions = [
        {
          id: "opt_dues",
          label: { en: "💳 Cooperative Dues & Payments", rw: "💳 Imisanzu & Kwishyura", fr: "💳 Cotisations & Paiements" },
          targetNode: "node_dues"
        },
        {
          id: "opt_documents",
          label: { en: "📄 In-App Word & Excel Office", rw: "📄 Inyandiko & Office", fr: "📄 Bureautique Word & Excel" },
          targetNode: "node_documents"
        },
        {
          id: "opt_plans",
          label: { en: "👑 Subscription Plans & Quotas", rw: "👑 Ifatabuguzi n'Ubushobozi", fr: "👑 Forfaits & Quotas" },
          targetNode: "node_plans"
        },
        {
          id: "opt_root_fallback",
          label: { en: "🏠 Main Guide Menu", rw: "🏠 Intangiriro", fr: "🏠 Menu principal" },
          targetNode: "root"
        }
      ];
    }

    const botMessage: ChatItem = {
      id: "bot_reply_" + Date.now(),
      sender: "bot",
      text: botResponseText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      options: matchedOptions
    };

    setChatHistory((prev) => [...prev, userMessage, botMessage]);
  };

  // Filter flows by category and search
  const filteredFlows = useMemo(() => {
    return guiderData.flows.filter((flow) => {
      const matchCat = activeCategory === "all" || flow.category === activeCategory;
      if (!matchCat) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const title = (flow.titles[currentLang] || flow.titles.en).toLowerCase();
      const desc = (flow.descriptions[currentLang] || flow.descriptions.en).toLowerCase();
      const keywords = (flow.keywords[currentLang] || flow.keywords.en || []).join(" ").toLowerCase();

      return title.includes(q) || desc.includes(q) || keywords.includes(q);
    });
  }, [activeCategory, searchQuery, currentLang]);

  // Current active flow object
  const activeFlow = useMemo(() => {
    return guiderData.flows.find((f) => f.id === activeFlowId) || null;
  }, [activeFlowId]);

  // Current active step
  const currentStep = useMemo(() => {
    if (!activeFlow || !activeFlow.steps) return null;
    return activeFlow.steps[currentStepIndex] || null;
  }, [activeFlow, currentStepIndex]);

  // Category Icon mapper
  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case "Wallet":
        return <Wallet className="w-4 h-4" />;
      case "FileText":
        return <FileText className="w-4 h-4" />;
      case "Users":
        return <Users className="w-4 h-4" />;
      case "Calendar":
        return <Calendar className="w-4 h-4" />;
      case "Clock":
        return <Clock className="w-4 h-4" />;
      case "Target":
        return <Target className="w-4 h-4" />;
      case "ShoppingBag":
        return <ShoppingBag className="w-4 h-4" />;
      case "Crown":
        return <Crown className="w-4 h-4" />;
      case "Settings":
        return <Settings className="w-4 h-4" />;
      default:
        return <Layers className="w-4 h-4" />;
    }
  };

  return (
    <>
      {/* FLOATING ACTION BUTTON (With Impacto Logo and Dynamic Language Label) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end print:hidden">
        {!isOpen && (
          <button
            id="guider-floating-trigger-btn"
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-3 bg-[#156c45] hover:bg-[#105536] active:scale-[0.98] text-white px-4 py-2.5 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 border border-emerald-400/20 cursor-pointer"
            title={labels.title}
          >
            {/* Impacto Brand Icon Logo */}
            <div className="w-7 h-7 rounded-xl bg-white flex items-center justify-center shadow-xs overflow-hidden shrink-0">
              <img
                src="/impacto-logo.png"
                alt="Impacto Logo"
                className="w-5 h-5 object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                  (e.currentTarget.parentElement as HTMLElement).innerHTML =
                    '<span class="text-[#156c45] font-black text-xs">IM</span>';
                }}
              />
            </div>

            <div className="flex flex-col items-start pr-1">
              <div className="flex items-center gap-1.5 font-bold text-xs leading-tight tracking-wide">
                <span>{labels.floatingBtn}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-300" />
              </div>
              <span className="text-[10px] text-emerald-100 font-medium leading-none opacity-90 mt-0.5">
                {labels.floatingSubtitle}
              </span>
            </div>
          </button>
        )}
      </div>

      {/* EXPANDABLE CHAT DRAWER */}
      {isOpen && (
        <div
          id="guider-interactive-drawer"
          className={`fixed bottom-0 right-0 z-50 flex flex-col bg-white dark:bg-slate-900 shadow-2xl border-l border-t border-slate-200 dark:border-slate-800 transition-all duration-300 ${
            expandedView
              ? "w-full md:w-[680px] h-[92vh] max-h-[900px] rounded-t-2xl md:rounded-tl-2xl md:rounded-tr-none"
              : "w-full sm:w-[460px] h-[82vh] max-h-[760px] rounded-t-2xl sm:rounded-tl-2xl sm:rounded-tr-none"
          }`}
        >
          {/* HEADER */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-[#156c45] text-white rounded-t-2xl sm:rounded-tl-2xl sm:rounded-tr-none select-none border-b border-emerald-800/40">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white p-1 flex items-center justify-center shadow-xs shrink-0">
                <img
                  src="/impacto-logo.png"
                  alt="Impacto Logo"
                  className="w-5.5 h-5.5 object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                    (e.currentTarget.parentElement as HTMLElement).innerHTML =
                      '<span class="text-[#156c45] font-black text-xs">IM</span>';
                  }}
                />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-tight flex items-center gap-2">
                  <span>{labels.floatingBtn}</span>
                  <span className="text-xs font-normal text-emerald-200">
                    ({currentLang === "rw" ? "Baza" : "Guider"})
                  </span>
                </h3>
                <p className="text-[11px] text-emerald-100/90 font-medium">
                  {labels.subtitle}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1.5">
              {/* Expand Toggle */}
              <button
                onClick={() => setExpandedView(!expandedView)}
                className="p-1.5 text-emerald-100 hover:text-white hover:bg-emerald-700/60 rounded-xl transition-colors cursor-pointer"
                title={expandedView ? "Minimize" : "Expand"}
              >
                {expandedView ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-emerald-100 hover:text-white hover:bg-emerald-700/60 rounded-xl transition-colors cursor-pointer"
                title={labels.close}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* CONTEXTUAL PAGE BANNER (Chat-To-Dashboard Bridge) */}
          {pageContext && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800/40 px-4 py-2 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
              <div className="flex items-center gap-2 truncate">
                <Compass className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 animate-spin" />
                <span className="truncate">
                  {labels.contextBanner}: <strong>{pageContext.title}</strong>
                </span>
              </div>
              <button
                onClick={() => {
                  if (pageContext.flowId) handleStartFlow(pageContext.flowId);
                  else if (pageContext.nodeId) initChatWithNode(pageContext.nodeId);
                }}
                className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:underline flex-shrink-0 flex items-center gap-1"
              >
                {labels.jumpContextAction} <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* MAIN CHAT & FLOW CONTAINER */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/60">
            {/* RENDER CHAT HISTORY (NODE TREE STREAM) */}
            {chatHistory.map((item) => (
              <div
                key={item.id}
                className={`flex flex-col ${item.sender === "user" ? "items-end" : "items-start"} space-y-1.5`}
              >
                {/* SENDER BUBBLE */}
                <div
                  className={`max-w-[88%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-sm ${
                    item.sender === "user"
                      ? "bg-emerald-600 text-white rounded-br-none"
                      : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-none"
                  }`}
                >
                  {/* Markdown-style content parsing */}
                  <div className="space-y-2 whitespace-pre-wrap">
                    {item.text?.split("\n\n").map((para, pIdx) => {
                      if (para.startsWith("### ")) {
                        return (
                          <h4 key={pIdx} className="font-bold text-sm text-emerald-800 dark:text-emerald-400">
                            {para.replace("### ", "")}
                          </h4>
                        );
                      }
                      return <p key={pIdx}>{para}</p>;
                    })}
                  </div>

                  {/* Role Specific Note Box */}
                  {item.roleNote && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <span>{item.roleNote}</span>
                    </div>
                  )}

                  {/* Direct Action Link if provided in node */}
                  {item.actionUrl && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                      <button
                        onClick={() => {
                          navigate(item.actionUrl!);
                          setIsOpen(false);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all"
                      >
                        <span>{item.actionText?.[currentLang] || item.actionText?.en || labels.jumpToFeature}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* INTERACTIVE NODE DECISION BUTTONS */}
                {item.options && item.options.length > 0 && (
                  <div className="w-full pl-2 pr-4 pt-1 space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {labels.suggestedNext}
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {item.options.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => handleSelectOption(opt)}
                          className="flex items-center justify-between text-left w-full px-3.5 py-2.5 text-xs font-medium bg-white hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 hover:text-emerald-700 dark:text-slate-200 dark:hover:text-emerald-300 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500 transition-all shadow-xs group"
                        >
                          <span className="flex-1 pr-2">{opt.label?.[currentLang] || opt.label?.en}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <span className="text-[10px] text-slate-400 px-1">{item.timestamp}</span>
              </div>
            ))}

            {/* ACTIVE INTERACTIVE FLOW WALKTHROUGH CARD */}
            {activeFlow && currentStep && (
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-emerald-500/40 shadow-lg space-y-3.5 my-2 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-white truncate max-w-[260px]">
                      {activeFlow.titles[currentLang] || activeFlow.titles.en}
                    </h4>
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    {labels.stepCount} {currentStep.stepNumber} {labels.of} {activeFlow.steps.length}
                  </span>
                </div>

                {/* Step Content */}
                <div className="space-y-2">
                  <h5 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>{currentStep.title[currentLang] || currentStep.title.en}</span>
                  </h5>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    {currentStep.action[currentLang] || currentStep.action.en}
                  </p>
                </div>

                {/* Target Element / Screen */}
                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 bg-emerald-50/50 dark:bg-slate-900/40 px-2.5 py-1.5 rounded-lg border border-emerald-100 dark:border-slate-800">
                  <Compass className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>
                    {labels.targetScreen}: <strong className="text-slate-700 dark:text-slate-200">{currentStep.targetElement}</strong>
                  </span>
                </div>

                {/* Pro-Tip */}
                {currentStep.tip && (
                  <div className="flex items-start gap-2 text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/40">
                    <Lightbulb className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>{currentStep.tip[currentLang] || currentStep.tip.en}</span>
                  </div>
                )}

                {/* Stepper Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    disabled={currentStepIndex === 0}
                    onClick={() => setCurrentStepIndex((i) => Math.max(0, i - 1))}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>{labels.prevStep}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        navigate(activeFlow.targetUrl);
                        setIsOpen(false);
                      }}
                      className="px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:underline"
                    >
                      {labels.jumpToFeature}
                    </button>

                    {currentStepIndex < activeFlow.steps.length - 1 ? (
                      <button
                        onClick={() => setCurrentStepIndex((i) => i + 1)}
                        className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-all"
                      >
                        <span>{labels.nextStep}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setActiveFlowId(null);
                          initChatWithNode("root");
                        }}
                        className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-sm transition-all"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{labels.finishFlow}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* SEARCH & QUICK TOPIC EXPLORER TOGGLE */}
          <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-2">
            {/* Quick Topic Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
              <button
                onClick={() => initChatWithNode("root")}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium whitespace-nowrap transition-colors flex-shrink-0"
              >
                <RotateCcw className="w-3 h-3 text-slate-400" />
                <span>{labels.resetChat}</span>
              </button>
              {guiderData.categories.slice(1, 6).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    const matched = guiderData.flows.find((f) => f.category === cat.id);
                    if (matched) handleStartFlow(matched.id);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-medium whitespace-nowrap transition-colors flex-shrink-0"
                >
                  {getCategoryIcon(cat.icon)}
                  <span>{cat.labels[currentLang] || cat.labels.en}</span>
                </button>
              ))}
            </div>

            {/* Chat Question Input Box */}
            <form onSubmit={handleSendMessage} className="relative flex items-center">
              <input
                id="guider-chat-question-input"
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder={labels.askSomething}
                className="w-full pl-3.5 pr-11 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-slate-900 dark:text-slate-100"
              />
              <button
                type="submit"
                disabled={!inputVal.trim()}
                className="absolute right-1.5 p-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg transition-all shadow-xs"
                title="Send query"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default GuiderAssistant;
