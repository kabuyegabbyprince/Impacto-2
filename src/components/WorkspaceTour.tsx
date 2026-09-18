import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Compass,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2,
  Lightbulb,
  Layers,
  Coins,
  Globe,
  Users,
  ShieldCheck,
  Building2,
  FolderOpen,
  HelpCircle,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";

export interface TourStep {
  id: string;
  targetSelector: string;
  icon: React.ElementType;
  title: {
    en: string;
    fr: string;
    rw: string;
  };
  description: {
    en: string;
    fr: string;
    rw: string;
  };
  tips: {
    en: string;
    fr: string;
    rw: string;
  };
  preferredPlacement?: "bottom" | "top" | "right" | "left";
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "org-switcher",
    targetSelector: '[data-tour="org-switcher"], #tour-org-switcher',
    icon: Building2,
    title: {
      en: "Workspace & Cooperative Hub",
      fr: "Espace de Travail & Coopérative",
      rw: "Ibiro bya Koperative & Umuryango",
    },
    description: {
      en: "Switch between registered cooperatives, view your active branch slug, and manage organization profile credentials.",
      fr: "Basculez entre les coopératives enregistrées, consultez le lien direct de votre branche et gérez les identifiants de l'organisation.",
      rw: "Hinduranya amakoperative wanditsweho, reba umurongo wa koperative yawe, kandi ucunge amakuru y'umuryango.",
    },
    tips: {
      en: "Tip: Superadmins and managers can toggle multiple branches seamlessly from this picker.",
      fr: "Astuce : Les administrateurs peuvent basculer entre plusieurs branches en un clic.",
      rw: "Inama: Abayobozi bashobora guhinduranya amashami menshi y'amakoperative biboroheye.",
    },
    preferredPlacement: "bottom",
  },
  {
    id: "currency-selector",
    targetSelector: '[data-tour="currency"], #tour-currency-selector',
    icon: Coins,
    title: {
      en: "Multi-Currency Financial Switch",
      fr: "Sélecteur Multi-Devises",
      rw: "Guhindura Ifaranga Rikoreshwa",
    },
    description: {
      en: "Switch your display currency between Rwandan Francs (RWF), USD ($), EUR (€), and KES with live exchange rates across all ledgers.",
      fr: "Changez votre devise d'affichage entre Francs Rwandais (RWF), USD ($), EUR (€) et KES avec conversion instantanée.",
      rw: "Hindura ifaranga ryifashishwa hagati y'Amafaranga y'u Rwanda (RWF), USD, EUR, na KES mu bitabo byose by'imari.",
    },
    tips: {
      en: "Tip: All dues, pledges, and reports convert automatically without altering underlying audit data.",
      fr: "Astuce : Les cotisations et rapports se convertissent sans modifier les données réelles.",
      rw: "Inama: Imisanzu na raporo bihinduka mu buryo bw'ikoranabuhanga hatabangamiwe imibare nyakuri.",
    },
    preferredPlacement: "bottom",
  },
  {
    id: "language-selector",
    targetSelector: '[data-tour="language"], #tour-lang-selector',
    icon: Globe,
    title: {
      en: "Multilingual Interface (EN • FR • RW)",
      fr: "Interface Multilingue (EN • FR • RW)",
      rw: "Ururimi rw'Urubuga (EN • FR • RW)",
    },
    description: {
      en: "Instant localized experience in English, Français, and Ikinyarwanda tailored for local cooperative members and field staff.",
      fr: "Expérience localisée instantanée en Anglais, Français et Ikinyarwanda pour les membres et le personnel de terrain.",
      rw: "Hitamo ururimi wifuza gukoresha: Icyongereza, Igifaransa, cyangwa Ikinyarwanda cyoroheye abanyamuryango bose.",
    },
    tips: {
      en: "Tip: Your language preference syncs to your personal profile across all devices.",
      fr: "Astuce : Vos préférences de langue sont synchronisées sur tous vos appareils.",
      rw: "Inama: Ururimi wahisemo rubikwa kuri konte yawe ku bikoresho byose ukoresha.",
    },
    preferredPlacement: "bottom",
  },
  {
    id: "nav-workspace",
    targetSelector: '[data-tour="nav-workspace"], #tour-nav-workspace',
    icon: Layers,
    title: {
      en: "Workspace Collaboration Tools",
      fr: "Outils Collaboratifs de l'Espace",
      rw: "Ibikoresho by'Ubufatanye bw'Umuryango",
    },
    description: {
      en: "Access real-time member announcements, interactive chat channels, event QR attendance, strategic goals, and cloud document vaults.",
      fr: "Accédez aux annonces en temps réel, aux canaux de discussion, aux présences QR code, aux objectifs et documents sécurisés.",
      rw: "Reba amatangazo agezweho, ibiganiro by'abanyamuryango, kwandika abitabiriye inama na QR code, n'ububiko bw'inyandiko.",
    },
    tips: {
      en: "Tip: Use DocumentOffice to draft, sign, and export official certificates directly.",
      fr: "Astuce : Utilisez DocumentOffice pour rédiger, signer et exporter des certificats officiels.",
      rw: "Inama: Koresha DocumentOffice mu kwandika, gushyiraho umukono, no gusohora impamyabushobozi z'umwimerere.",
    },
    preferredPlacement: "right",
  },
  {
    id: "nav-management",
    targetSelector: '[data-tour="nav-management"], #tour-nav-management',
    icon: Users,
    title: {
      en: "Member Management & Financial Ledger",
      fr: "Gestion des Membres & Grand Livre",
      rw: "Ubuyobozi bw'Abanyamuryango & Igitabo cy'Imari",
    },
    description: {
      en: "Maintain verified member rosters, verify national IDs, track inventory & stock assets, log double-entry ledgers, and view audit reports.",
      fr: "Gérez le registre des membres, vérifiez les pièces d'identité, suivez le stock d'actifs et consultez le grand livre comptable.",
      rw: "Cunga urutonde rw'abanyamuryango, suzuma indangamuntu zabo, kwandika umutungo n'ibikoresho, no gukurikirana igitabo cy'imari.",
    },
    tips: {
      en: "Tip: Accountants can reconcile MoMo transaction receipts and export Excel audit sheets.",
      fr: "Astuce : Les comptables peuvent rapprocher les reçus MoMo et exporter des bilans Excel.",
      rw: "Inama: Abacungamutungo bashobora kwemeza inyemezabwishyu za MoMo no gusohora raporo muri Excel.",
    },
    preferredPlacement: "right",
  },
  {
    id: "profile-menu",
    targetSelector: '[data-tour="profile"], #tour-profile',
    icon: ShieldCheck,
    title: {
      en: "Profile, Offline Sync & Support",
      fr: "Profil, Synchronisation Hors-Ligne & Support",
      rw: "Konte yawe, Gukorera Kuri Murandasi & Ubufasha",
    },
    description: {
      en: "Update your personal credentials, monitor real-time offline PWA sync, download the mobile APK, and access auditor support.",
      fr: "Mettez à jour vos identifiants, suivez la synchronisation hors ligne, téléchargez l'APK mobile et accédez à l'aide.",
      rw: "Vugurura amakuru yawe bwite, koresha porogaramu niyo waba udafite murandasi, shyiramo APK kuri telefone, no gusaba ubufasha.",
    },
    tips: {
      en: "Tip: You can relaunch this interactive tour at any time by clicking the Compass icon in the top header.",
      fr: "Astuce : Vous pouvez relancer cette visite à tout moment en cliquant sur l'icône Boussole en haut.",
      rw: "Inama: Ushobora kongera gufungura aka gatabo k'amabwiriza igihe icyo aricyo cyose ukanze ku kimenyetso cy'Icyerekezo hejuru.",
    },
    preferredPlacement: "bottom",
  },
];

interface WorkspaceTourProps {
  isOpen: boolean;
  currentStepIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  onJumpToStep: (index: number) => void;
}

export const WorkspaceTour: React.FC<WorkspaceTourProps> = ({
  isOpen,
  currentStepIndex,
  onNext,
  onPrev,
  onClose,
  onJumpToStep,
}) => {
  const { i18n } = useTranslation();
  const lang = (i18n.language || "en").substring(0, 2) as "en" | "fr" | "rw";
  const safeLang: "en" | "fr" | "rw" = ["en", "fr", "rw"].includes(lang) ? lang : "en";

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; placement: string }>({
    top: 0,
    left: 0,
    placement: "bottom",
  });
  const [isMeasuring, setIsMeasuring] = useState(true);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = TOUR_STEPS[currentStepIndex] || TOUR_STEPS[0];
  const totalSteps = TOUR_STEPS.length;
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === totalSteps - 1;

  // Calculate target position and calculate smart non-blocking tooltip anchor
  const updatePosition = useCallback(() => {
    if (!isOpen || !step) return;

    let targetEl: HTMLElement | null = null;
    const selectors = step.targetSelector.split(",").map((s) => s.trim());
    for (const sel of selectors) {
      const found = document.querySelector(sel) as HTMLElement;
      if (found && found.offsetParent !== null) {
        targetEl = found;
        break;
      }
    }

    if (!targetEl) {
      // Fallback to center if element is not in DOM (e.g. mobile hidden sidebar)
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;
      setTargetRect(null);
      setTooltipPos({
        top: Math.max(80, viewportH / 2 - 160),
        left: Math.max(16, viewportW / 2 - 180),
        placement: "center",
      });
      setIsMeasuring(false);
      return;
    }

    const rect = targetEl.getBoundingClientRect();
    setTargetRect(rect);

    // Auto scroll target into view if offscreen
    if (rect.top < 70 || rect.bottom > window.innerHeight - 20) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    const tooltipEl = tooltipRef.current;
    const tooltipW = tooltipEl ? tooltipEl.offsetWidth : 360;
    const tooltipH = tooltipEl ? tooltipEl.offsetHeight : 240;
    const gap = 12;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    const isMobile = window.innerWidth < 640;

    if (isMobile) {
      // On mobile devices, dock comfortably at the bottom with safe margins
      setTooltipPos({
        top: window.innerHeight - (tooltipRef.current?.offsetHeight || 260) - 16,
        left: 16,
        placement: "bottom-dock",
      });
      setIsMeasuring(false);
      return;
    }

    let placement = step.preferredPlacement || "bottom";
    let top = 0;
    let left = 0;

    if (placement === "bottom") {
      top = rect.bottom + gap;
      left = rect.left + rect.width / 2 - tooltipW / 2;
      // If overflows bottom, flip to top
      if (top + tooltipH > viewportH - 16) {
        top = Math.max(16, rect.top - tooltipH - gap);
        placement = "top";
      }
    } else if (placement === "top") {
      top = rect.top - tooltipH - gap;
      left = rect.left + rect.width / 2 - tooltipW / 2;
      if (top < 70) {
        top = rect.bottom + gap;
        placement = "bottom";
      }
    } else if (placement === "right") {
      top = rect.top + rect.height / 2 - tooltipH / 2;
      left = rect.right + gap;
      // If overflows right, place bottom
      if (left + tooltipW > viewportW - 16) {
        top = rect.bottom + gap;
        left = Math.max(16, rect.left);
        placement = "bottom";
      }
    } else if (placement === "left") {
      top = rect.top + rect.height / 2 - tooltipH / 2;
      left = rect.left - tooltipW - gap;
      if (left < 16) {
        top = rect.bottom + gap;
        left = Math.max(16, rect.left);
        placement = "bottom";
      }
    }

    // Clamp within viewport
    left = Math.max(16, Math.min(left, viewportW - tooltipW - 16));
    top = Math.max(70, Math.min(top, viewportH - tooltipH - 16));

    setTooltipPos({ top, left, placement });
    setIsMeasuring(false);
  }, [isOpen, step]);

  useEffect(() => {
    if (!isOpen) return;
    setIsMeasuring(true);
    const timer = setTimeout(updatePosition, 60);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, currentStepIndex, updatePosition]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight") {
        if (!isLast) onNext();
      } else if (e.key === "ArrowLeft") {
        if (!isFirst) onPrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isFirst, isLast, onNext, onPrev, onClose]);

  if (!isOpen) return null;

  const Icon = step.icon;
  const currentTitle = step.title[safeLang] || step.title.en;
  const currentDesc = step.description[safeLang] || step.description.en;
  const currentTip = step.tips[safeLang] || step.tips.en;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none select-none font-sans">
      {/* Mobile backdrop for clarity and contrast */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/35 backdrop-blur-[1px] pointer-events-auto sm:hidden z-40 transition-opacity"
      />

      {/* Soft focus ring spotlight on target element (Subtle non-blocking overlay) */}
      {targetRect && (
        <div
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
          }}
          className="fixed z-50 rounded-2xl pointer-events-none transition-all duration-300 ring-4 ring-emerald-500/50 dark:ring-emerald-400/60 shadow-[0_0_24px_rgba(16,185,129,0.35)] bg-emerald-500/5"
        />
      )}

      {/* Floating Tooltip Card (Step-by-Step Popover) */}
      <div
        ref={tooltipRef}
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
        }}
        className={`fixed z-50 w-90 sm:w-96 max-w-[calc(100vw-32px)] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl pointer-events-auto transition-all duration-200 flex flex-col p-5 gap-3.5 backdrop-blur-md ${
          isMeasuring ? "opacity-0 scale-95" : "opacity-100 scale-100"
        }`}
      >
        {/* Tooltip Header: Step Counter & Close button */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center h-6 px-2.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
              {safeLang === "fr"
                ? `Étape ${currentStepIndex + 1} sur ${totalSteps}`
                : safeLang === "rw"
                ? `Intambwe ${currentStepIndex + 1} kuri ${totalSteps}`
                : `Step ${currentStepIndex + 1} of ${totalSteps}`}
            </span>
            <span className="text-[11px] font-bold text-slate-400 font-mono">
              {Math.round(((currentStepIndex + 1) / totalSteps) * 100)}%
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onClose}
              aria-label="Close tour"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Close tour (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Step Content: Icon, Title & Body */}
        <div className="flex items-start gap-3.5 pt-0.5">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs border border-emerald-100 dark:border-emerald-900/50">
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <h3 className="text-sm font-black font-display text-slate-900 dark:text-white leading-tight">
              {currentTitle}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {currentDesc}
            </p>
          </div>
        </div>

        {/* Pro-Tip Box */}
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5 border border-slate-200/60 dark:border-slate-800 flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
          <Lightbulb className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <span className="leading-snug">{currentTip}</span>
        </div>

        {/* Navigation Controls: Dots & Next/Back Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* Step Progress Dots */}
          <div className="flex items-center gap-1">
            {TOUR_STEPS.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => onJumpToStep(idx)}
                aria-label={`Go to step ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === currentStepIndex
                    ? "w-5 bg-emerald-600 dark:bg-emerald-400"
                    : idx < currentStepIndex
                    ? "w-2 bg-emerald-300 dark:bg-emerald-700"
                    : "w-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300"
                }`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={onPrev}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="h-3 w-3" />
                <span>
                  {safeLang === "fr" ? "Retour" : safeLang === "rw" ? "Gusubira" : "Back"}
                </span>
              </button>
            )}

            <button
              onClick={isLast ? onClose : onNext}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <span>
                {isLast
                  ? safeLang === "fr"
                    ? "Terminer"
                    : safeLang === "rw"
                    ? "Soza"
                    : "Got it!"
                  : safeLang === "fr"
                  ? "Suivant"
                  : safeLang === "rw"
                  ? "Komeza"
                  : "Next"}
              </span>
              {isLast ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// Welcome Tour Banner (Gentle Non-Disturbing Prompt)
// ==========================================
export const WorkspaceTourWelcomePrompt: React.FC<{
  onStart: () => void;
  onDismiss: () => void;
}> = ({ onStart, onDismiss }) => {
  const { i18n } = useTranslation();
  const lang = (i18n.language || "en").substring(0, 2);

  const title =
    lang === "fr"
      ? "Nouveau sur Impacto Suite ?"
      : lang === "rw"
      ? "Murakaza neza kuri Impacto ?"
      : "New to Impacto Suite?";

  const desc =
    lang === "fr"
      ? "Prenez une visite interactive de 60 secondes pour découvrir vos outils coopératifs."
      : lang === "rw"
      ? "Fata umunota umwe witegereze ibikoresho by'ingenzi bya koperative yawe."
      : "Take a 60-second interactive guided tour of your cooperative management tools.";

  const btnStart =
    lang === "fr" ? "Démarrer la visite" : lang === "rw" ? "Tangira amabwiriza" : "Take quick tour";

  const btnSkip = lang === "fr" ? "Plus tard" : lang === "rw" ? "Hanyuma" : "Dismiss";

  return (
    <div className="fixed bottom-5 right-5 z-40 max-w-sm w-full bg-white dark:bg-slate-900 border border-emerald-500/40 rounded-2xl p-4 shadow-xl flex items-start gap-3.5 animate-in slide-in-from-bottom-4 duration-300 font-sans">
      <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
        <Compass className="h-5 w-5 animate-spin-slow" />
      </div>

      <div className="flex flex-col gap-2 min-w-0 flex-1">
        <div>
          <h4 className="text-xs font-black font-display text-slate-900 dark:text-white">
            {title}
          </h4>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug mt-0.5">
            {desc}
          </p>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={onStart}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <span>{btnStart}</span>
            <ArrowRight className="h-3 w-3" />
          </button>
          <button
            onClick={onDismiss}
            className="px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            {btnSkip}
          </button>
        </div>
      </div>

      <button
        onClick={onDismiss}
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
