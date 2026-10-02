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
  Menu,
  Smartphone,
  Tablet,
  Monitor,
  RotateCcw,
  Sparkles,
} from "lucide-react";

export type DeviceTier = "mobile" | "tablet" | "pc";

export function getDeviceTier(width: number): DeviceTier {
  if (width < 768) return "mobile";
  if (width <= 1024) return "tablet";
  return "pc";
}

export function useDeviceTier(): DeviceTier {
  const [tier, setTier] = useState<DeviceTier>(() => {
    if (typeof window === "undefined") return "pc";
    return getDeviceTier(window.innerWidth);
  });

  useEffect(() => {
    const handleResize = () => {
      setTier(getDeviceTier(window.innerWidth));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return tier;
}

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

// ==========================================
// 1. MOBILE GUIDE STEPS (Compact, touch-first)
// ==========================================
export const MOBILE_TOUR_STEPS: TourStep[] = [
  {
    id: "org-switcher",
    targetSelector: '[data-tour="org-switcher"], #tour-org-switcher',
    icon: Building2,
    title: {
      en: "Workspace & Branch Hub",
      fr: "Espace de Travail & Coopérative",
      rw: "Ibiro bya Koperative & Umuryango",
    },
    description: {
      en: "Tap here to switch between your registered cooperatives or view your active branch credentials directly on mobile.",
      fr: "Appuyez ici pour basculer entre vos coopératives enregistrées ou consulter votre lien de branche sur mobile.",
      rw: "Kanda hano uhinduranye amakoperative yawe cyangwa urebe amakuru y'ishami ryawe kuri telefone.",
    },
    tips: {
      en: "Tip: One tap switches branches instantly without losing your current progress.",
      fr: "Astuce : Basculez entre vos branches en un seul clic sans perdre votre progression.",
      rw: "Inama: Guhindura amashami byoroshye mu gukanda rimwe gusa.",
    },
    preferredPlacement: "bottom",
  },
  {
    id: "mobile-menu-toggle",
    targetSelector: '#tour-mobile-menu-toggle, [data-tour="mobile-menu-toggle"]',
    icon: Menu,
    title: {
      en: "Mobile Navigation Drawer",
      fr: "Tiroir de Navigation Mobile",
      rw: "Menu Rusange kuri Telefone",
    },
    description: {
      en: "Tap this menu button at any time to open your full tool suite: Members, Accounting Ledgers, Stock Inventory, Attendance, and Reports.",
      fr: "Appuyez sur ce bouton pour ouvrir l'ensemble des modules : Membres, Grand Livre Comptable, Stocks, Présences QR et Rapports.",
      rw: "Kanda kuri iyi menu ufungure ibikoresho byose: Urutonde rw'abanyamuryango, Igitabo cy'imari, Ububiko, n'Ibyegeranyo.",
    },
    tips: {
      en: "Tip: You can swipe left or tap the darkened screen area to quickly close the drawer.",
      fr: "Astuce : Glissez vers la gauche ou appuyez sur l'arrière-plan pour refermer le tiroir.",
      rw: "Inama: Kanda ahandi hose ku kirere cyangwa usunike ibumoso kugira ngo ufunge iyi menu.",
    },
    preferredPlacement: "bottom",
  },
  {
    id: "currency-selector",
    targetSelector: '[data-tour="currency"], #tour-currency-selector',
    icon: Coins,
    title: {
      en: "Quick Currency Converter",
      fr: "Convertisseur de Devises",
      rw: "Guhindura Ifaranga",
    },
    description: {
      en: "Switch display amounts instantly between Rwandan Francs (RWF), USD ($), EUR (€), and KES on your mobile screen.",
      fr: "Changez instantanément la devise d'affichage entre Francs Rwandais (RWF), USD, EUR et KES sur votre téléphone.",
      rw: "Hindura ifaranga ryifashishwa hagati y'Amafaranga y'u Rwanda (RWF), USD, EUR, na KES mu buryo bwihuse.",
    },
    tips: {
      en: "Tip: Dues and reports update with live rates without altering underlying accounting records.",
      fr: "Astuce : Les cotisations et bilans s'actualisent en direct sans modifier les écritures comptables.",
      rw: "Inama: Imisanzu yose ihita yerekana agaciro k'ifaranga wahisemo.",
    },
    preferredPlacement: "bottom",
  },
  {
    id: "language-selector",
    targetSelector: '[data-tour="language"], #tour-lang-selector',
    icon: Globe,
    title: {
      en: "Multilingual Interface",
      fr: "Interface Multilingue",
      rw: "Ururimi rw'Urubuga",
    },
    description: {
      en: "Toggle between English, Français, and Ikinyarwanda for localized field operations and staff members.",
      fr: "Basculez entre Anglais, Français et Ikinyarwanda pour vos équipes et membres sur le terrain.",
      rw: "Hitamo ururimi rukunoze: Icyongereza, Igifaransa, cyangwa Ikinyarwanda cyoroheye abanyamuryango bose.",
    },
    tips: {
      en: "Tip: Language preference syncs automatically across all your devices.",
      fr: "Astuce : Vos préférences de langue sont enregistrées sur tous vos appareils.",
      rw: "Inama: Ururimi wahisemo ruhita rubikwa kuri konti yawe.",
    },
    preferredPlacement: "bottom",
  },
  {
    id: "profile-menu",
    targetSelector: '[data-tour="profile"], #tour-profile',
    icon: ShieldCheck,
    title: {
      en: "Profile & Offline Mode",
      fr: "Profil & Mode Hors-Ligne",
      rw: "Konti yawe & Gukorera Kuri Murandasi",
    },
    description: {
      en: "Manage credentials, check offline PWA sync status, toggle dark mode, or install the Android mobile APK.",
      fr: "Gérez vos accès, vérifiez la synchronisation hors ligne, activez le mode sombre ou installez l'APK mobile.",
      rw: "Cunga amakuru yawe, reba uko amakuru abikwa kuri murandasi, shyiramo APK kuri telefone, no guhindura isura y'urubuga.",
    },
    tips: {
      en: "Tip: You can re-open this guide anytime by tapping the Compass icon in the top header.",
      fr: "Astuce : Relancez ce guide à tout moment en cliquant sur l'icône Boussole en haut.",
      rw: "Inama: Ushobora kongera gufungura amabwiriza igihe cyose ukanze ku kimenyetso cy'Icyerekezo hejuru.",
    },
    preferredPlacement: "bottom",
  },
];

// ==========================================
// 2. TABLET GUIDE STEPS (Semi-expanded screen)
// ==========================================
export const TABLET_TOUR_STEPS: TourStep[] = [
  {
    id: "org-switcher",
    targetSelector: '[data-tour="org-switcher"], #tour-org-switcher',
    icon: Building2,
    title: {
      en: "Cooperative Workspace Hub",
      fr: "Espace de Travail & Coopérative",
      rw: "Ibiro bya Koperative & Umuryango",
    },
    description: {
      en: "Switch between registered cooperatives, view branch details, and manage organization profile credentials on your tablet.",
      fr: "Basculez entre coopératives enregistrées, consultez vos branches et gérez les identifiants sur tablette.",
      rw: "Hinduranya amakoperative wanditsweho, reba amashami yayo, kandi ucunge amakuru y'umuryango.",
    },
    tips: {
      en: "Tip: Optimized touch selectors designed specifically for iPad and Android tablets.",
      fr: "Astuce : Sélecteurs tactiles optimisés pour iPad et tablettes tactiles.",
      rw: "Inama: Bikozwe mu buryo bworoheye gukoresha intoki kuri mudasobwa zigendanwa.",
    },
    preferredPlacement: "bottom",
  },
  {
    id: "currency-selector",
    targetSelector: '[data-tour="currency"], #tour-currency-selector',
    icon: Coins,
    title: {
      en: "Multi-Currency Switcher",
      fr: "Sélecteur Multi-Devises",
      rw: "Guhindura Ifaranga Rikoreshwa",
    },
    description: {
      en: "Switch display currency between Rwandan Francs (RWF), USD ($), EUR (€), and KES with live conversion across ledgers.",
      fr: "Changez votre devise d'affichage entre Francs Rwandais (RWF), USD ($), EUR (€) et KES avec conversion instantanée.",
      rw: "Hindura ifaranga ryifashishwa hagati y'Amafaranga y'u Rwanda (RWF), USD, EUR, na KES mu bitabo by'imari.",
    },
    tips: {
      en: "Tip: All financial analytics on your tablet reflect live exchange conversions seamlessly.",
      fr: "Astuce : Les graphiques financiers s'adaptent instantanément à la devise choisie.",
      rw: "Inama: Imbonerahamwe n'ibarurishamari bihita bihuza n'ifaranga wahisemo.",
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
      en: "Access real-time member announcements, interactive chat channels, event attendance, strategic goals, and cloud document vaults.",
      fr: "Accédez aux annonces en temps réel, aux canaux de discussion, aux présences QR code, aux objectifs et documents sécurisés.",
      rw: "Reba amatangazo agezweho, ibiganiro by'abanyamuryango, kwandika abitabiriye inama na QR code, n'ububiko bw'inyandiko.",
    },
    tips: {
      en: "Tip: Use DocumentOffice to draft, sign, and export official certificates directly.",
      fr: "Astuce : Utilisez DocumentOffice pour rédiger, signer et exporter des certificats officiels.",
      rw: "Inama: Koresha DocumentOffice mu kwandika, gushyiraho umukono, no gusohora impamyabushobozi.",
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
      rw: "Inama: Abacungamutungo bashobora kwemeza inyemezabwishyu no gusohora raporo muri Excel.",
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
      en: "Update personal credentials, monitor real-time offline PWA sync, download the mobile APK, and access auditor support.",
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

// ==========================================
// 3. DESKTOP / PC GUIDE STEPS (Full workspace)
// ==========================================
export const DESKTOP_TOUR_STEPS: TourStep[] = [
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
      en: "Access real-time member announcements, interactive chat channels, event attendance, strategic goals, and cloud document vaults.",
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

// Backwards compatibility export
export const TOUR_STEPS = DESKTOP_TOUR_STEPS;

interface WorkspaceTourProps {
  isOpen: boolean;
  currentStepIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  onJumpToStep: (index: number) => void;
  isSidebarOpen?: boolean;
  onOpenSidebar?: () => void;
}

export const WorkspaceTour: React.FC<WorkspaceTourProps> = ({
  isOpen,
  currentStepIndex,
  onNext,
  onPrev,
  onClose,
  onJumpToStep,
  isSidebarOpen,
  onOpenSidebar,
}) => {
  const { i18n } = useTranslation();
  const lang = (i18n.language || "en").substring(0, 2) as "en" | "fr" | "rw";
  const safeLang: "en" | "fr" | "rw" = ["en", "fr", "rw"].includes(lang) ? lang : "en";

  // Dynamic Screen Sensing
  const detectedTier = useDeviceTier();
  const [selectedTier, setSelectedTier] = useState<DeviceTier | null>(null);

  // Active Device Tier (Auto-sensed or user-selected override)
  const activeTier: DeviceTier = selectedTier || detectedTier;

  // Active tour steps based on detected / selected device
  const activeSteps =
    activeTier === "mobile"
      ? MOBILE_TOUR_STEPS
      : activeTier === "tablet"
      ? TABLET_TOUR_STEPS
      : DESKTOP_TOUR_STEPS;

  const totalSteps = activeSteps.length;
  // Ensure step index is safely bounded within the active tier's step list
  const safeStepIndex = Math.min(Math.max(0, currentStepIndex), totalSteps - 1);
  const step = activeSteps[safeStepIndex] || activeSteps[0];
  const isFirst = safeStepIndex === 0;
  const isLast = safeStepIndex === totalSteps - 1;

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; placement: string }>({
    top: 0,
    left: 0,
    placement: "bottom",
  });
  const [isMeasuring, setIsMeasuring] = useState(true);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // If mobile or tablet needs the drawer opened for workspace/management steps
  useEffect(() => {
    if (!isOpen) return;
    if ((step.id === "nav-workspace" || step.id === "nav-management") && !isSidebarOpen && onOpenSidebar) {
      onOpenSidebar();
    }
  }, [isOpen, step.id, isSidebarOpen, onOpenSidebar]);

  // Calculate target position and smart non-blocking tooltip anchor
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

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const isMobileViewport = activeTier === "mobile" || viewportW < 768;

    if (!targetEl) {
      // Fallback positioning if element is offscreen or hidden
      setTargetRect(null);
      if (isMobileViewport) {
        setTooltipPos({
          top: viewportH - (tooltipRef.current?.offsetHeight || 290) - 16,
          left: 12,
          placement: "bottom-dock",
        });
      } else {
        setTooltipPos({
          top: Math.max(80, viewportH / 2 - 160),
          left: Math.max(16, viewportW / 2 - 190),
          placement: "center",
        });
      }
      setIsMeasuring(false);
      return;
    }

    const rect = targetEl.getBoundingClientRect();
    setTargetRect(rect);

    // Auto scroll target into view if offscreen
    if (rect.top < 70 || rect.bottom > viewportH - 20) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    const tooltipEl = tooltipRef.current;
    const tooltipW = tooltipEl ? tooltipEl.offsetWidth : isMobileViewport ? viewportW - 24 : 380;
    const tooltipH = tooltipEl ? tooltipEl.offsetHeight : 250;
    const gap = 12;

    if (isMobileViewport) {
      // On mobile devices, dock comfortably at the bottom with safe margins
      setTooltipPos({
        top: Math.max(16, viewportH - tooltipH - 16),
        left: Math.max(12, Math.floor((viewportW - tooltipW) / 2)),
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
  }, [isOpen, step, activeTier]);

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
  }, [isOpen, safeStepIndex, activeTier, updatePosition]);

  // Keyboard navigation (Desktop / PC)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
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
      {/* Dim backdrop overlay for clarity and focus */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-[1px] pointer-events-auto transition-opacity"
        aria-hidden="true"
      />

      {/* Target element spotlight cutout with emerald pulsing ring */}
      {targetRect && (
        <div
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
          }}
          className="fixed z-50 rounded-2xl pointer-events-none transition-all duration-300 ring-4 ring-emerald-500/60 dark:ring-emerald-400/70 shadow-[0_0_28px_rgba(16,185,129,0.45)] bg-emerald-500/10 animate-pulse"
        />
      )}

      {/* Floating Tour Card */}
      <div
        ref={tooltipRef}
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
        }}
        className={`fixed z-50 w-full sm:w-[400px] max-w-[calc(100vw-24px)] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl pointer-events-auto transition-all duration-200 flex flex-col p-4 sm:p-5 gap-3 backdrop-blur-md ${
          isMeasuring ? "opacity-0 scale-95" : "opacity-100 scale-100"
        }`}
      >
        {/* Top Header: Device Sensing Selector & Close */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
          {/* Device Tier Selector Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg text-[10px] font-bold">
            <button
              type="button"
              onClick={() => {
                setSelectedTier("mobile");
                onJumpToStep(0);
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all cursor-pointer ${
                activeTier === "mobile"
                  ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs font-black"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
              title="Switch to Mobile Guide"
            >
              <Smartphone className="h-3 w-3" />
              <span>Mobile</span>
              {detectedTier === "mobile" && !selectedTier && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedTier("tablet");
                onJumpToStep(0);
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all cursor-pointer ${
                activeTier === "tablet"
                  ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs font-black"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
              title="Switch to Tablet Guide"
            >
              <Tablet className="h-3 w-3" />
              <span>Tablet</span>
              {detectedTier === "tablet" && !selectedTier && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedTier("pc");
                onJumpToStep(0);
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all cursor-pointer ${
                activeTier === "pc"
                  ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs font-black"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
              title="Switch to PC Desktop Guide"
            >
              <Monitor className="h-3 w-3" />
              <span>PC</span>
              {detectedTier === "pc" && !selectedTier && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              )}
            </button>

            {selectedTier && selectedTier !== detectedTier && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTier(null);
                  onJumpToStep(0);
                }}
                className="px-1.5 py-1 text-slate-400 hover:text-emerald-600 transition flex items-center gap-0.5 cursor-pointer"
                title={`Reset to auto-sensed (${detectedTier.toUpperCase()})`}
              >
                <RotateCcw className="h-2.5 w-2.5" />
                <span className="text-[9px]">Auto</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Auto-sensed badge indicator */}
            <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40">
              <Sparkles className="h-2.5 w-2.5 text-emerald-500" />
              <span>{activeTier.toUpperCase()} GUIDE</span>
            </span>

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

        {/* Step Progress & Count */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center justify-center h-5 px-2 rounded-full text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
            {safeLang === "fr"
              ? `Étape ${safeStepIndex + 1} sur ${totalSteps}`
              : safeLang === "rw"
              ? `Intambwe ${safeStepIndex + 1} kuri ${totalSteps}`
              : `Step ${safeStepIndex + 1} of ${totalSteps}`}
          </span>
          <span className="text-[10px] font-bold text-slate-400 font-mono">
            {Math.round(((safeStepIndex + 1) / totalSteps) * 100)}%
          </span>
        </div>

        {/* Step Content: Icon, Title & Body */}
        <div className="flex items-start gap-3 pt-0.5">
          <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs border border-emerald-100 dark:border-emerald-900/50">
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <h3 className="text-xs sm:text-sm font-black font-display text-slate-900 dark:text-white leading-tight">
              {currentTitle}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {currentDesc}
            </p>
          </div>
        </div>

        {/* Pro-Tip Box */}
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5 border border-slate-200/60 dark:border-slate-800 flex items-start gap-2 text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-300 font-medium">
          <Lightbulb className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <span className="leading-snug">{currentTip}</span>
        </div>

        {/* Navigation Controls: Dots & Next/Back Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* Step Progress Dots */}
          <div className="flex items-center gap-1">
            {activeSteps.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => onJumpToStep(idx)}
                aria-label={`Go to step ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === safeStepIndex
                    ? "w-5 bg-emerald-600 dark:bg-emerald-400"
                    : idx < safeStepIndex
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
                className="px-3 py-1.5 sm:px-2.5 sm:py-1.5 min-h-[36px] sm:min-h-0 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="h-3 w-3" />
                <span>
                  {safeLang === "fr" ? "Retour" : safeLang === "rw" ? "Gusubira" : "Back"}
                </span>
              </button>
            )}

            <button
              onClick={isLast ? onClose : onNext}
              className="px-4 py-2 sm:px-3.5 sm:py-1.5 min-h-[40px] sm:min-h-0 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
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

        {/* Keyboard hint for PC/Desktop */}
        {activeTier === "pc" && (
          <div className="hidden sm:flex items-center justify-center gap-2 text-[9px] text-slate-400 font-mono">
            <span>[← / →] to navigate</span>
            <span>•</span>
            <span>[Esc] to close</span>
          </div>
        )}
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
  const detectedTier = useDeviceTier();

  const title =
    lang === "fr"
      ? "Nouveau sur Impacto Suite ?"
      : lang === "rw"
      ? "Murakaza neza kuri Impacto ?"
      : "New to Impacto Suite?";

  const tierLabel =
    detectedTier === "mobile"
      ? "Mobile"
      : detectedTier === "tablet"
      ? "Tablet"
      : "Desktop";

  const desc =
    lang === "fr"
      ? `Prenez une visite interactive adaptée à votre écran (${tierLabel}) pour découvrir vos outils.`
      : lang === "rw"
      ? `Fata umunota umwe witegereze ibikoresho by'ingenzi bihuye na (${tierLabel}) yawe.`
      : `Take a 60-second interactive tour customized for your ${tierLabel} screen.`;

  const btnStart =
    lang === "fr" ? "Démarrer la visite" : lang === "rw" ? "Tangira amabwiriza" : "Take quick tour";

  const btnSkip = lang === "fr" ? "Plus tard" : lang === "rw" ? "Hanyuma" : "Dismiss";

  return (
    <div className="fixed bottom-4 sm:bottom-5 right-3 sm:right-5 z-40 max-w-sm w-[calc(100vw-24px)] sm:w-full bg-white dark:bg-slate-900 border border-emerald-500/40 rounded-2xl p-4 shadow-xl flex items-start gap-3.5 animate-in slide-in-from-bottom-4 duration-300 font-sans">
      <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
        <Compass className="h-5 w-5 animate-spin-slow" />
      </div>

      <div className="flex flex-col gap-2 min-w-0 flex-1">
        <div>
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-black font-display text-slate-900 dark:text-white">
              {title}
            </h4>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold">
              {tierLabel}
            </span>
          </div>
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
