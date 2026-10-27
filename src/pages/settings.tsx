import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useLocalTranslation } from "../locales/additional-translations";
import {
  Sliders,
  CreditCard,
  Ambulance,
  Check,
  Save,
  Send,
  Globe,
  Plus,
  Crown,
  HelpCircle,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Clock,
  BadgeCheck,
  User,
  Building2,
  Lock,
  KeyRound,
  Eye,
  Type,
  Languages,
  X,
  UserMinus,
  ClipboardList,
  Trash2,
  Star,
  CheckCircle2,
  ListPlus,
  FileText,
  BarChart2,
  ArrowUp,
  ArrowDown,
  Edit3,
  ShieldCheck,
  Zap,
  HeartHandshake,
  Copy
} from "lucide-react";
import { useOrgStore } from "../store/orgStore";
import { useCurrencyStore } from "../store/currencyStore";
import { useAuthStore } from "../store/authStore";
import {
  useUpdateOrganization,
  useSubmitErrorReport,
  usePlatformAdminData,
  usePlatformSettings,
  useSubmitSubscriptionPayment,
  useErrorReports,
  useDeleteOrganization,
  useUpdateUserProfile,
  useMembers,
  useReferrals
} from "../hooks/useImpactoData";
import { MockDB } from "../lib/mockData";
import { isSupabaseConfigured } from "../lib/supabase";
import { useToast } from "../components/Toast";
import { Button, Input, Card, Badge, Modal, Avatar, ImageUploadInput, getLucideIcon } from "../components/ui";
import { ResolvedImage } from "../components/ResolvedMedia";
import { V2AdvancedFeatures } from "../components/V2AdvancedFeatures";
import { UssdPaymentHelper } from "../components/UssdPaymentHelper";
import { SubscriptionPaymentDashboard } from "../components/SubscriptionPaymentDashboard";
import { OrganizationVerificationModal } from "../components/OrganizationVerificationModal";
import { ReferralCenterModal } from "../components/ReferralCenterModal";
import { 
  ADDON_PACKAGES, 
  AddOnPackageId, 
  SUBSCRIPTION_TIERS,
  getOrgSubscriptionLifecycle 
} from "../lib/subscriptionMatrix";
import { notifyPlanOrPackageGranted } from "../lib/crossTabSync";
import { 
  QrCode, 
  FileSpreadsheet, 
  Layers, 
  Vote, 
  Package, 
  Receipt, 
  Activity,
  Award,
  Coins,
  FileCheck
} from "lucide-react";

export const OrganizationSettingsPage: React.FC = () => {
  const { t } = useLocalTranslation();
  const [searchParams] = useSearchParams();
  const { activeOrg, setActiveOrg, activeMember, clearOrg } = useOrgStore();
  const { activeCurrency, formatAmount, convertToRWF } = useCurrencyStore();
  const { addToast } = useToast();
  const { user, setUser, updateUserLanguage, updateAccessibilityPreferences } = useAuthStore();
  
  const updateMutation = useUpdateOrganization();
  const supportMutation = useSubmitErrorReport();
  const submitPaymentMutation = useSubmitSubscriptionPayment();
  const updateProfileMutation = useUpdateUserProfile();
  const { data: globalSettings } = usePlatformSettings();
  const { data: platformData } = usePlatformAdminData();
  const { data: supportChats, refetch: refetchSupport } = useErrorReports(activeOrg?.id);
  const { data: members } = useMembers(activeOrg?.id);
  const [openVerificationModal, setOpenVerificationModal] = useState(false);
  const [openReferralModal, setOpenReferralModal] = useState(false);
  const { data: userReferrals = [] } = useReferrals(user?.id);

  const canAccessMomo = activeMember?.role === "org_admin" || activeMember?.role === "accountant";
  const canAccessSupport = activeMember?.role === "org_admin";
  const canAccessSubscription = activeMember?.role === "org_admin" || activeMember?.role === "accountant" || !!user?.is_superadmin;
  const canAccessExitSurvey = activeMember?.role === "org_admin" || activeMember?.role === "manager" || !!user?.is_superadmin || !isSupabaseConfigured;
  const hasProPlan = activeOrg?.subscription_tier === "enterprise" || (activeOrg as any)?.subscription_tier === "pro";

  const defaultExitQuestions = [
    {
      id: "q_reason",
      question: "Primary reason for leaving or offboarding",
      type: "choice" as const,
      options: [
        "Relocation or Resettlement",
        "Mismatch with agropastoral targets",
        "Scheduling Conflicts / Lack of time",
        "Health/Personal Circumstances",
        "Financial / Membership Fee Concerns",
        "Leadership or Governance Concerns",
        "Other"
      ],
      required: true
    },
    {
      id: "q_rating",
      question: "Overall cooperative experience & leadership support rating",
      type: "rating" as const,
      required: true
    },
    {
      id: "q_feedback",
      question: "Constructive feedback or suggestions for cooperative leadership",
      type: "text" as const,
      required: false
    },
    {
      id: "q_rejoin",
      question: "Would you consider participating or rejoining this cooperative in the future?",
      type: "choice" as const,
      options: ["Yes, definitely", "Maybe in the future", "No, unlikely"],
      required: true
    }
  ];

  const [activeTab, setActiveTab] = useState<"general" | "public_portal" | "exit_survey" | "members_dashboard" | "momo" | "subscription" | "support" | "profile">(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "profile" || tabParam === "accessibility") return "profile";
    if (tabParam === "momo") return "momo";
    if (tabParam === "exit_survey" || tabParam === "survey" || tabParam === "offboarding") return "exit_survey";
    if (tabParam === "subscription" || tabParam === "billing") {
      return (activeMember?.role === "org_admin" || activeMember?.role === "accountant" || !!user?.is_superadmin) ? "subscription" : "general";
    }
    if (tabParam === "support") return "support";
    return "general";
  });

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "profile" || tabParam === "accessibility") {
      setActiveTab("profile");
    } else if (tabParam === "exit_survey" || tabParam === "survey" || tabParam === "offboarding") {
      setActiveTab("exit_survey");
    } else if ((tabParam === "subscription" || tabParam === "billing") && canAccessSubscription) {
      setActiveTab("subscription");
    } else if (tabParam === "momo" && canAccessMomo) {
      setActiveTab("momo");
    } else if (tabParam === "support" && canAccessSupport) {
      setActiveTab("support");
    }
  }, [searchParams, canAccessSubscription, canAccessMomo, canAccessSupport]);

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const platformSettings = globalSettings || platformData?.settings || MockDB.getPlatformSettings();

  // User profile settings states
  const [profileName, setProfileName] = useState(user?.full_name || "");
  const [profileAvatar, setProfileAvatar] = useState(user?.avatar_url || "icon:user");
  const [profileBio, setProfileBio] = useState(user?.bio || "");
  const [profilePhone, setProfilePhone] = useState(user?.phone_number || "");
  const [profileJobTitle, setProfileJobTitle] = useState(user?.job_title || "");
  const [profileLanguage, setProfileLanguage] = useState<"en" | "fr" | "rw">("en");
  const [accessibilityFontSize, setAccessibilityFontSize] = useState<"normal" | "large" | "x-large">("normal");
  const [accessibilityHighContrast, setAccessibilityHighContrast] = useState<boolean>(false);
  const [notificationEmail, setNotificationEmail] = useState<boolean>(user?.notification_email ?? true);
  const [notificationSms, setNotificationSms] = useState<boolean>(user?.notification_sms ?? true);
  const [uiDensity, setUiDensity] = useState<"normal" | "compact" | "spacious">(user?.ui_density || "normal");
  const [reducedMotion, setReducedMotion] = useState<boolean>(user?.reduced_motion ?? false);
  const [profileVisibility, setProfileVisibility] = useState<"public" | "members_only" | "private">(user?.profile_visibility || "members_only");
  const [statusBadge, setStatusBadge] = useState<"active" | "remote" | "field" | "away">(user?.status_badge || "active");

  useEffect(() => {
    if (user) {
      setProfileName(user.full_name || "");
      setProfileAvatar(user.avatar_url || "icon:user");
      setProfileBio(user.bio || "");
      setProfilePhone(user.phone_number || "");
      setProfileJobTitle(user.job_title || "");
      const currentStoredLang = (localStorage.getItem("impacto_user_lang_" + user.id) as any) || user.preferred_language || (localStorage.getItem("i18nextLng") as any) || "en";
      setProfileLanguage(currentStoredLang.startsWith("rw") ? "rw" : currentStoredLang.startsWith("fr") ? "fr" : "en");
      setAccessibilityFontSize(user.accessibility_font_size || "normal");
      setAccessibilityHighContrast(!!user.accessibility_high_contrast);
      setNotificationEmail(user.notification_email ?? true);
      setNotificationSms(user.notification_sms ?? true);
      setUiDensity(user.ui_density || "normal");
      setReducedMotion(!!user.reduced_motion);
      setProfileVisibility(user.profile_visibility || "members_only");
      setStatusBadge(user.status_badge || "active");
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !profileName.trim()) return;
    
    try {
      await updateProfileMutation.mutateAsync({
        userId: user.id,
        fullName: profileName,
        avatarUrl: profileAvatar,
        preferredLanguage: profileLanguage,
        accessibilityFontSize: accessibilityFontSize,
        accessibilityHighContrast: accessibilityHighContrast,
        bio: profileBio,
        phoneNumber: profilePhone,
        jobTitle: profileJobTitle,
        notificationEmail: notificationEmail,
        notificationSms: notificationSms,
        uiDensity: uiDensity,
        reducedMotion: reducedMotion,
        profileVisibility: profileVisibility,
        statusBadge: statusBadge
      });

      // Update auth store, language, and accessibility
      updateUserLanguage(profileLanguage);
      updateAccessibilityPreferences({
        fontSize: accessibilityFontSize,
        highContrast: accessibilityHighContrast
      });

      setUser({
        ...user,
        full_name: profileName,
        avatar_url: profileAvatar,
        preferred_language: profileLanguage,
        accessibility_font_size: accessibilityFontSize,
        accessibility_high_contrast: accessibilityHighContrast,
        bio: profileBio,
        phone_number: profilePhone,
        job_title: profileJobTitle,
        notification_email: notificationEmail,
        notification_sms: notificationSms,
        ui_density: uiDensity,
        reduced_motion: reducedMotion,
        profile_visibility: profileVisibility,
        status_badge: statusBadge
      });

      addToast("Your personal profile, accessibility, and account preferences have been successfully updated!", "success");
    } catch (err: any) {
      console.error(err);
      addToast(err?.message || "Failed to update user profile.", "error");
    }
  };

  // Password update form state
  const [newAccountPassword, setNewAccountPassword] = useState("");
  const [confirmAccountPassword, setConfirmAccountPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const handleUpdateAccountPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountPassword || newAccountPassword.length < 6) {
      addToast("Password must be at least 6 characters long.", "error");
      return;
    }
    if (newAccountPassword !== confirmAccountPassword) {
      addToast("Passwords do not match. Please retype carefully.", "error");
      return;
    }

    setUpdatingPassword(true);
    try {
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user?.email,
          userId: user?.id,
          newPassword: newAccountPassword
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password.");

      if (user?.email) {
        try {
          const raw = localStorage.getItem("impacto_user_passwords") || "{}";
          const map = JSON.parse(raw);
          map[user.email.trim().toLowerCase()] = newAccountPassword;
          localStorage.setItem("impacto_user_passwords", JSON.stringify(map));
        } catch (e) {}
      }

      addToast("Your password has been changed successfully!", "success");
      setNewAccountPassword("");
      setConfirmAccountPassword("");
    } catch (err: any) {
      console.error(err);
      addToast(err.message || "Failed to change password.", "error");
    } finally {
      setUpdatingPassword(false);
    }
  };

  // General Settings Form
  const [name, setName] = useState(activeOrg?.name || "");
  const [tagline, setTagline] = useState(activeOrg?.tagline || "");
  const [desc, setDesc] = useState(activeOrg?.description || "");
  const [mission, setMission] = useState(activeOrg?.mission || "");
  const [vision, setVision] = useState(activeOrg?.vision || "");
  const [pColor, setPColor] = useState(activeOrg?.primary_color || "#15803D");

  // Public Portal Settings Form
  const [slug, setSlug] = useState(activeOrg?.slug || "");
  const [locationName, setLocationName] = useState(activeOrg?.location_name || "Kigali, Rwanda");
  const [contactUs, setContactUs] = useState(activeOrg?.contact_us || "contact@ourorganization.org / +250 788 123 456");
  const [logoUrl, setLogoUrl] = useState(activeOrg?.logo_url || "");
  const [coverUrl, setCoverUrl] = useState(activeOrg?.cover_url || "from-emerald-500 to-green-600");
  const [galleryInput, setGalleryInput] = useState("");
  const [galleryUrls, setGalleryUrls] = useState<string[]>(activeOrg?.gallery_urls || []);
  const [isPublicDir, setIsPublicDir] = useState(activeOrg?.is_public_directory ?? true);
  const [allowPublicJoining, setAllowPublicJoining] = useState(activeOrg?.allow_public_joining ?? true);
  const [publicPageEnabled, setPublicPageEnabled] = useState(activeOrg?.public_page_enabled ?? true);
  const [showGoalsPublicly, setShowGoalsPublicly] = useState(activeOrg?.show_goals_publicly ?? true);
  const [showImpactPublicly, setShowImpactPublicly] = useState(activeOrg?.show_impact_publicly ?? true);
  const [showCalendarPublicly, setShowCalendarPublicly] = useState(activeOrg?.show_calendar_publicly ?? true);

  // Members Dashboard Style Form
  const [dashboardTheme, setDashboardTheme] = useState<"light" | "dark" | "custom">(activeOrg?.dashboard_theme || "light");
  const [dashboardLogo, setDashboardLogo] = useState(activeOrg?.dashboard_logo || "");
  const [marketplaceEnabled, setMarketplaceEnabled] = useState(activeOrg?.marketplace_enabled ?? true);

  // Exit Survey Settings Form
  const [exitSurveyEnabled, setExitSurveyEnabled] = useState<boolean>(activeOrg?.exit_survey_enabled ?? true);
  const [exitSurveyTitle, setExitSurveyTitle] = useState<string>(activeOrg?.exit_survey_title || "Member Departure & Offboarding Survey");
  const [exitSurveyDesc, setExitSurveyDesc] = useState<string>(activeOrg?.exit_survey_description || "Please share your candid feedback so cooperative leadership can continue improving operations and community support.");
  const [exitSurveyQuestions, setExitSurveyQuestions] = useState<any[]>(
    activeOrg?.exit_survey_questions && activeOrg.exit_survey_questions.length > 0
      ? activeOrg.exit_survey_questions
      : defaultExitQuestions
  );

  // Question modal state
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [qText, setQText] = useState("");
  const [qType, setQType] = useState<"text" | "rating" | "choice" | "boolean">("text");
  const [qOptions, setQOptions] = useState("");
  const [qRequired, setQRequired] = useState(false);

  // MoMo merchant details form
  const [mName, setMName] = useState(activeOrg?.dues_account_name || activeOrg?.donation_account_name || "");
  const [mtnNum, setMtnNum] = useState(activeOrg?.dues_mtn_number || activeOrg?.donation_mtn_number || "");
  const [airtelNum, setAirtelNum] = useState(activeOrg?.dues_airtel_number || activeOrg?.donation_airtel_number || "");
  const [momoMerchantCode, setMomoMerchantCode] = useState(activeOrg?.momo_merchant_code || "");
  const [enableDonations, setEnableDonations] = useState(activeOrg?.donations_enabled || false);

  // Manual Subscription payment modal form
  const [openSubModal, setOpenSubModal] = useState(false);
  const [subPlan, setSubPlan] = useState("Growth Plan - $25/month");
  const [payerPhone, setPayerPhone] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [momoSmsProof, setMomoSmsProof] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Only show upgrade packages to organizations on Free plan or Starter plan (or trial)
  const shouldShowPackages = !activeOrg?.subscription_tier || 
    activeOrg.subscription_tier === "free" || 
    activeOrg.subscription_tier === "starter" || 
    activeOrg.subscription_status === "trial";

  const handleOpenSubscriptionCheckout = (planName: string) => {
    setSubPlan(planName);
    setOpenSubModal(true);
  };

  // Support Request / Chat line Form
  const [supportMessage, setSupportMessage] = useState("");

  // Delete Workspace states
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const deleteOrgMutation = useDeleteOrganization();

  const isAdmin = activeMember?.role === "org_admin" || activeMember?.role === "manager" || !isSupabaseConfigured;

  const handleDeleteOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg?.id) return;
    if (deleteConfirmationText !== "DELETE") {
      addToast(t("Confirmation error: Please type 'DELETE' to authorize."), "error");
      return;
    }

    try {
      await deleteOrgMutation.mutateAsync(activeOrg.id);
      addToast(t("Workspace successfully deleted."), "success");
      setOpenDeleteModal(false);
      clearOrg();
      window.location.href = "/dashboard";
    } catch (err: any) {
      addToast(err?.message || t("Failed to delete organization workspace."), "error");
    }
  };

  useEffect(() => {
    if (activeOrg) {
      setName(activeOrg.name || "");
      setTagline(activeOrg.tagline || "");
      setDesc(activeOrg.description || "");
      setMission(activeOrg.mission || "");
      setVision(activeOrg.vision || "");
      setPColor(activeOrg.primary_color || "#15803D");
      setSlug(activeOrg.slug || "");
      setLocationName(activeOrg.location_name || "Kigali, Rwanda");
      setContactUs(activeOrg.contact_us || "contact@ourorganization.org / +250 788 123 456");
      setLogoUrl(activeOrg.logo_url || "");
      setCoverUrl(activeOrg.cover_url || "from-emerald-500 to-green-600");
      if (activeOrg.gallery_urls && activeOrg.gallery_urls.length > 0) {
        setGalleryUrls(activeOrg.gallery_urls);
      }
      setIsPublicDir(activeOrg.is_public_directory ?? true);
      setAllowPublicJoining(activeOrg.allow_public_joining ?? true);
      setPublicPageEnabled(activeOrg.public_page_enabled ?? true);
      setShowGoalsPublicly(activeOrg.show_goals_publicly ?? true);
      setShowImpactPublicly(activeOrg.show_impact_publicly ?? true);
      setShowCalendarPublicly(activeOrg.show_calendar_publicly ?? true);
      setDashboardTheme(activeOrg.dashboard_theme || "light");
      setDashboardLogo(activeOrg.dashboard_logo || "");
      setMarketplaceEnabled(activeOrg.marketplace_enabled ?? true);
      setMName(activeOrg.dues_account_name || activeOrg.donation_account_name || activeOrg.name || "");
      setMtnNum(activeOrg.dues_mtn_number || activeOrg.donation_mtn_number || "");
      setAirtelNum(activeOrg.dues_airtel_number || activeOrg.donation_airtel_number || "");
      setMomoMerchantCode(activeOrg.momo_merchant_code || "");
      setEnableDonations(activeOrg.donations_enabled || false);
      setExitSurveyEnabled(activeOrg.exit_survey_enabled ?? true);
      setExitSurveyTitle(activeOrg.exit_survey_title || "Member Departure & Offboarding Survey");
      setExitSurveyDesc(activeOrg.exit_survey_description || "Please share your candid feedback so cooperative leadership can continue improving operations and community support.");
      if (activeOrg.exit_survey_questions && activeOrg.exit_survey_questions.length > 0) {
        setExitSurveyQuestions(activeOrg.exit_survey_questions);
      } else {
        setExitSurveyQuestions(defaultExitQuestions);
      }
    }
  }, [activeOrg]);

  const colors = [
    { name: "Forest", hex: "#15803D" },
    { name: "Ocean", hex: "#1D4ED8" },
    { name: "Crimson", hex: "#B91C1C" },
    { name: "Indigo", hex: "#4338CA" },
    { name: "Teal", hex: "#0F766E" },
    { name: "Coffee", hex: "#78350F" }
  ];

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !tagline) return;

    try {
      const updated = await updateMutation.mutateAsync({
        id: activeOrg?.id || "",
        name,
        tagline,
        description: desc,
        mission,
        vision,
        primary_color: pColor,
        logo_url: logoUrl,
        cover_url: coverUrl,
        dashboard_logo: dashboardLogo || logoUrl,
        marketplace_enabled: marketplaceEnabled,
        donations_enabled: enableDonations,
        donation_account_name: mName,
        donation_mtn_number: mtnNum,
        donation_airtel_number: airtelNum
      });
      setActiveOrg(updated, useOrgStore.getState().activeMember);
      addToast("Organization workspace branding, logo, and theme saved successfully!", "success");
    } catch (err: any) {
      console.error(err);
      addToast(err?.message || "Failed to save general workspace variables.", "error");
    }
  };

  const handleSavePublicSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await updateMutation.mutateAsync({
        id: activeOrg?.id || "",
        slug,
        location_name: locationName,
        contact_us: contactUs,
        logo_url: logoUrl,
        cover_url: coverUrl,
        gallery_urls: galleryUrls,
        is_public_directory: isPublicDir,
        allow_public_joining: allowPublicJoining,
        public_page_enabled: publicPageEnabled,
        show_goals_publicly: showGoalsPublicly,
        show_impact_publicly: showImpactPublicly,
        show_calendar_publicly: showCalendarPublicly
      });
      setActiveOrg(updated, useOrgStore.getState().activeMember);
      addToast("Organization profile page configuration successfully synced live!", "success");
    } catch (err: any) {
      console.error(err);
      addToast(err?.message || "Failed to save public portal profile details.", "error");
    }
  };

  const handleSaveDashboardTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await updateMutation.mutateAsync({
        id: activeOrg?.id || "",
        dashboard_theme: dashboardTheme,
        dashboard_logo: dashboardLogo
      });
      setActiveOrg(updated, useOrgStore.getState().activeMember);
      addToast("Members' Internal Dashboard branding synced successfully!", "success");
    } catch (err: any) {
      console.error(err);
      addToast(err?.message || "Failed to update dashboard theme settings.", "error");
    }
  };

  const handleSaveExitSurvey = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!exitSurveyTitle.trim()) {
      addToast("Exit survey title cannot be empty.", "error");
      return;
    }
    try {
      const updated = await updateMutation.mutateAsync({
        id: activeOrg?.id || "",
        exit_survey_enabled: exitSurveyEnabled,
        exit_survey_title: exitSurveyTitle.trim(),
        exit_survey_description: exitSurveyDesc.trim(),
        exit_survey_questions: exitSurveyQuestions
      });
      setActiveOrg(updated, useOrgStore.getState().activeMember);
      addToast("Exit Survey & Offboarding settings successfully saved live!", "success");
    } catch (err: any) {
      console.error(err);
      addToast(err?.message || "Failed to save Exit Survey settings.", "error");
    }
  };

  const handleOpenAddQuestion = () => {
    setEditingQuestionId(null);
    setQText("");
    setQType("choice");
    setQOptions("Relocation, Personal Reasons, Financial, Lack of time, Other");
    setQRequired(true);
    setShowQuestionModal(true);
  };

  const handleOpenEditQuestion = (q: any) => {
    setEditingQuestionId(q.id);
    setQText(q.question);
    setQType(q.type || "text");
    setQOptions((q.options || []).join(", "));
    setQRequired(!!q.required);
    setShowQuestionModal(true);
  };

  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qText.trim()) {
      addToast("Question prompt text is required.", "error");
      return;
    }

    const parsedOptions =
      qType === "choice"
        ? qOptions
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    if (qType === "choice" && (!parsedOptions || parsedOptions.length < 2)) {
      addToast("Multiple choice questions require at least 2 comma-separated options.", "error");
      return;
    }

    if (editingQuestionId) {
      setExitSurveyQuestions((prev) =>
        prev.map((item) =>
          item.id === editingQuestionId
            ? {
                ...item,
                question: qText.trim(),
                type: qType,
                options: parsedOptions,
                required: qRequired
              }
            : item
        )
      );
      addToast("Survey question updated. Click 'Save Exit Survey Settings' to persist.", "info");
    } else {
      const newQuestion = {
        id: `q_custom_${Date.now()}`,
        question: qText.trim(),
        type: qType,
        options: parsedOptions,
        required: qRequired
      };
      setExitSurveyQuestions((prev) => [...prev, newQuestion]);
      addToast("New survey question added! Click 'Save Exit Survey Settings' to persist.", "info");
    }
    setShowQuestionModal(false);
  };

  const handleDeleteQuestion = (id: string) => {
    if (exitSurveyQuestions.length <= 1) {
      addToast("You must keep at least 1 question in the offboarding survey.", "error");
      return;
    }
    setExitSurveyQuestions((prev) => prev.filter((q) => q.id !== id));
    addToast("Question removed from survey draft.", "info");
  };

  const handleMoveQuestion = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= exitSurveyQuestions.length) return;
    const updated = [...exitSurveyQuestions];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, moved);
    setExitSurveyQuestions(updated);
  };

  const handleResetDefaultQuestions = () => {
    setExitSurveyQuestions(defaultExitQuestions);
    setExitSurveyTitle("Member Departure & Offboarding Survey");
    setExitSurveyDesc("Please share your candid feedback so cooperative leadership can continue improving operations and community support.");
    addToast("Reset to recommended standard exit survey questions.", "info");
  };

  const handleSaveMomo = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMtn = mtnNum ? mtnNum.replace(/\D/g, "") : "";
    if (cleanMtn && !/^07[89]\d{7}$/.test(cleanMtn)) {
      addToast("Error: MTN Collection number must be exactly 10 digits starting with 078 or 079 (e.g. 078XXXXXXX or 079XXXXXXX) to reduce payment errors.", "error");
      return;
    }
    if (airtelNum && !/^07\d{8}$/.test(airtelNum.replace(/\D/g, ""))) {
      addToast("Error: Airtel Collection number must be 10 digits and start with 07 (e.g. 073xxxxxxx)", "error");
      return;
    }
    try {
      const updated = await updateMutation.mutateAsync({
        id: activeOrg?.id || "",
        donations_enabled: enableDonations,
        donation_account_name: mName,
        donation_mtn_number: cleanMtn || mtnNum,
        donation_airtel_number: airtelNum,
        dues_account_name: mName,
        dues_mtn_number: cleanMtn || mtnNum,
        dues_airtel_number: airtelNum,
        momo_merchant_code: momoMerchantCode
      });
      setActiveOrg(updated, useOrgStore.getState().activeMember);
      addToast("Organization Mobile Money payment receiving credentials synced successfully!", "success");
    } catch (err: any) {
      console.error(err);
      addToast(err?.message || "Failed to update MoMo merchant details.", "error");
    }
  };

  const handlePaySubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    let cleanPayer = (payerPhone || "").replace(/\D/g, "");
    if (cleanPayer.startsWith("250") && cleanPayer.length === 12) {
      cleanPayer = "0" + cleanPayer.slice(3);
    }
    if (!cleanPayer) {
      cleanPayer = activeOrg?.dues_mtn_number || "";
    }

    if (!cleanPayer || !/^07[2389]\d{7}$/.test(cleanPayer)) {
      addToast("Please enter a valid 10-digit Rwanda mobile number starting with 078/079 (MTN) or 072/073 (Airtel).", "error");
      return;
    }

    setSubmittingPayment(true);
    try {
      const rate = platformSettings.usd_to_rwf_rate || 1400;
      let costUsd = 25;
      let itemType: "subscription" | "package" = "subscription";
      let packageId: string | undefined = undefined;

      const priceMatch = subPlan.match(/\$(\d+)/);
      if (priceMatch) {
        costUsd = parseInt(priceMatch[1], 10);
      }

      const lowerPlan = subPlan.toLowerCase();
      if (lowerPlan.includes("starter")) {
        costUsd = 10;
      } else if (lowerPlan.includes("growth")) {
        costUsd = 25;
      } else if (lowerPlan.includes("pro") || lowerPlan.includes("enterprise")) {
        costUsd = 40;
      }

      if (lowerPlan.includes("package") || lowerPlan.includes("pack") || costUsd === 4) {
        itemType = "package";
        costUsd = 4;
        if (lowerPlan.includes("event") || lowerPlan.includes("attendance")) {
          packageId = "event_pack";
        } else if (lowerPlan.includes("finance") || lowerPlan.includes("ledger")) {
          packageId = "finance_pack";
        } else if (lowerPlan.includes("doc") || lowerPlan.includes("signing")) {
          packageId = "document_pack";
        } else if (lowerPlan.includes("asset") || lowerPlan.includes("equipment")) {
          packageId = "asset_pack";
        } else {
          packageId = "pro_pack";
        }
      }

      const targetOrgId = activeOrg?.id || "org-1";
      const actualRef = paymentRef.trim() || `TXN-${Date.now().toString().slice(-6)}`;
      const actualProof = momoSmsProof.trim() || `Mobile money transfer proof for ${subPlan} from ${cleanPayer}`;

      await submitPaymentMutation.mutateAsync({
        org_id: targetOrgId,
        plan: subPlan,
        amount_usd: costUsd,
        amount_local: costUsd * rate,
        method: cleanPayer.startsWith("078") || cleanPayer.startsWith("079") ? "mtn" : "airtel",
        phone: cleanPayer,
        reference: actualRef,
        proof_url: actualProof,
        item_type: itemType,
        package_id: packageId
      });

      if (itemType === "package" && packageId && activeOrg) {
        const currentPkgs = activeOrg.active_packages || [];
        if (!currentPkgs.includes(packageId)) {
          const updatedOrg = {
            ...activeOrg,
            active_packages: [...currentPkgs, packageId]
          };
          setActiveOrg(updatedOrg, useOrgStore.getState().activeMember);
          localStorage.setItem(`impacto_org_${activeOrg.id}`, JSON.stringify(updatedOrg));
        }
      }

      addToast(`Payment proof logged! Super Admin MoMo Approval Queue notified.`, "success");
      setOpenSubModal(false);
      setPayerPhone("");
      setPaymentRef("");
      setMomoSmsProof("");
    } catch (err: any) {
      console.error(err);
      addToast(err?.message || "Failed to submit subscription receipt proof.", "error");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleSubmitEscalationChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;

    try {
      await supportMutation.mutateAsync({
        org_id: activeOrg?.id || "",
        title: "Support Ticket Message",
        description: supportMessage,
        priority: "normal",
        screenshot_url: "Support Chat"
      });
      setSupportMessage("");
      refetchSupport();
      addToast("Direct support message transmitted to Platform Superadmin!", "success");
    } catch (err) {
      console.error(err);
    }
  };

  // Math days setup (Precisely calculated based on dates to ensure consistency across panels)
  const getPrecisionDays = () => {
    if (!activeOrg) return { joinedDays: 0, daysLeft: 0, isUnlimited: false };
    const now = Date.now();
    const createdTime = activeOrg.created_at ? new Date(activeOrg.created_at).getTime() : now;
    
    // Accurate joined days elapsed since sign-up
    const elapsedMs = now - createdTime;
    const joinedDaysCalc = Math.max(0, Math.floor(elapsedMs / (1000 * 3600 * 24)));
    
    let daysLeftCalc = 0;
    let isUnlimited = false;

    if (activeOrg.subscription_status === "expired") {
      daysLeftCalc = 0;
    } else if (activeOrg.subscription_status === "trial" || !activeOrg.subscription_status) {
      // 30 days trial duration strictly starting from creation date
      const trialDuration = 30 * 24 * 3600 * 1000;
      const trialEnds = createdTime + trialDuration;
      daysLeftCalc = Math.max(0, Math.ceil((trialEnds - now) / (1000 * 3600 * 24)));
    } else if (activeOrg.subscription_status === "active" && !activeOrg.subscription_ends_at) {
      isUnlimited = true;
    } else if (activeOrg.subscription_ends_at) {
      const endsTime = new Date(activeOrg.subscription_ends_at).getTime();
      daysLeftCalc = Math.max(0, Math.ceil((endsTime - now) / (1000 * 3600 * 24)));
    } else {
      isUnlimited = true;
    }
    
    return { joinedDays: joinedDaysCalc, daysLeft: daysLeftCalc, isUnlimited };
  };

  const { joinedDays, daysLeft, isUnlimited } = getPrecisionDays();

  return (
    <div className="flex flex-col gap-6 select-none font-sans w-full animate-in">
      <div className="border-b border-gray-200 dark:border-slate-800 pb-5 shrink-0">
        <h2 className="text-xl md:text-2xl font-bold font-display text-gray-900 dark:text-white leading-none">{t("settings_title", "Organization Settings Management")}</h2>
        <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400 font-medium mt-1">{t("settings_subtitle", "Coordinate custom primary color palettes, public profile pages, members' layouts, and manual subscription billing gateways.")}</p>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 font-semibold rounded-xl flex items-center gap-2 shadow-3xs">
          <Check className="h-4.5 w-4.5" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 font-semibold rounded-xl flex items-center gap-2 shadow-3xs">
          <AlertTriangle className="h-4.5 w-4.5 text-rose-600" />
          {errorMsg}
        </div>
      )}

      {/* Settings Tab Headers - Modern Segmented Control */}
      <div className="p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-1 shadow-3xs overflow-x-auto no-scrollbar max-w-full select-none shrink-0">
        <button
          onClick={() => setActiveTab("general")}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === "general"
              ? "bg-white dark:bg-slate-900 text-[#156c45] dark:text-emerald-400 shadow-3xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
          }`}
        >
          <Sliders className="h-3.5 w-3.5" /> {t("set_tab_general")}
        </button>

        <button
          onClick={() => setActiveTab("public_portal")}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === "public_portal"
              ? "bg-white dark:bg-slate-900 text-[#156c45] dark:text-emerald-400 shadow-3xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
          }`}
        >
          <Globe className="h-3.5 w-3.5" /> {t("set_tab_public")}
        </button>

        {canAccessExitSurvey && (
          <button
            onClick={() => setActiveTab("exit_survey")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "exit_survey"
                ? "bg-white dark:bg-slate-900 text-[#156c45] dark:text-emerald-400 shadow-3xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
            }`}
          >
            <ClipboardList className="h-3.5 w-3.5" /> {t("Exit Survey & Offboarding")}
          </button>
        )}

        {canAccessMomo && (
          <button
            onClick={() => setActiveTab("momo")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "momo"
                ? "bg-white dark:bg-slate-900 text-[#156c45] dark:text-emerald-400 shadow-3xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" /> {t("set_tab_momo")}
          </button>
        )}

        {canAccessSubscription && (
          <button
            onClick={() => setActiveTab("subscription")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "subscription"
                ? "bg-white dark:bg-slate-900 text-[#156c45] dark:text-emerald-400 shadow-3xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
            }`}
          >
            <Crown className="h-3.5 w-3.5" /> {t("set_tab_subscription")}
          </button>
        )}

        {canAccessSupport && (
          <button
            onClick={() => setActiveTab("support")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "support"
                ? "bg-white dark:bg-slate-900 text-[#156c45] dark:text-emerald-400 shadow-3xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
            }`}
          >
            <Ambulance className="h-3.5 w-3.5" /> {t("set_tab_support")}
          </button>
        )}

        <button
          onClick={() => setActiveTab("profile")}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === "profile"
              ? "bg-white dark:bg-slate-900 text-[#156c45] dark:text-emerald-400 shadow-3xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
          }`}
        >
          <User className="h-3.5 w-3.5" /> {t("My Profile")}
        </button>
      </div>

      {/* Tabs Layout */}
      <div className="w-full">
        {/* General workspace properties */}
        {activeTab === "general" && (
          <div className="flex flex-col gap-6 pb-8">
            {/* Organization Authenticity Verification Card */}
            {activeOrg && (
              <div className={`p-4.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                activeOrg.verification_status === "verified"
                  ? "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
                  : activeOrg.verification_status === "pending_review"
                  ? "bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                  : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              }`}>
                <div className="flex items-start gap-3.5">
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                    activeOrg.verification_status === "verified"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                      : activeOrg.verification_status === "pending_review"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300"
                      : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}>
                    {activeOrg.verification_status === "verified" ? (
                      <CheckCircle2 className="h-6 w-6 fill-emerald-500 text-white dark:fill-emerald-400 dark:text-slate-900" />
                    ) : activeOrg.verification_status === "pending_review" ? (
                      <Clock className="h-6 w-6" />
                    ) : (
                      <ShieldCheck className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                        Organization Authenticity:{" "}
                        <span className={activeOrg.verification_status === "verified" ? "text-emerald-600 dark:text-emerald-400" : activeOrg.verification_status === "pending_review" ? "text-amber-600 dark:text-amber-400" : "text-gray-500 dark:text-slate-400"}>
                          {activeOrg.verification_status === "verified" ? "Verified Authentic Entity" : activeOrg.verification_status === "pending_review" ? "Dossier In Review" : "Unverified"}
                        </span>
                      </h3>
                      {activeOrg.verification_status === "verified" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Green Tick Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-xl">
                      {activeOrg.verification_status === "verified"
                        ? `Official Green Tick is published on your public portal and dashboard header. Verified by ${activeOrg.verified_by || "Platform Auditor"}.`
                        : activeOrg.verification_status === "pending_review"
                        ? "Administrator and Accountant identity credentials are submitted and pending platform audit approval."
                        : "All organizations start unverified. Submit Administrator and Accountant passport photo + National ID / Passport to verify authenticity."}
                    </p>
                  </div>
                </div>

                {activeMember?.role !== "member" && (
                  <Button
                    type="button"
                    onClick={() => setOpenVerificationModal(true)}
                    className="text-xs py-2 px-4 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                  >
                    {activeOrg.verification_status === "verified" ? "View Dossier" : activeOrg.verification_status === "pending_review" ? "Check Status" : "Verify Organization"}
                  </Button>
                )}
              </div>
            )}

            <Card title={t("settings_branding_title")}>
            <form onSubmit={handleSaveGeneral} className="flex flex-col gap-6 text-xs md:text-sm font-medium">

              {/* Primary color presets */}
              <div className="flex flex-col gap-2.5">
                <label className="text-xs font-semibold text-gray-755">{t("lbl_theme_brand")}</label>
                <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
                  {colors.map((col) => (
                    <button
                      type="button"
                      key={col.hex}
                      onClick={() => setPColor(col.hex)}
                      className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold font-display cursor-pointer transition flex items-center gap-2 ${
                        pColor === col.hex
                          ? "border-[var(--org-primary)] bg-[var(--org-primary-l)] text-[var(--org-primary)]"
                          : "border-gray-205 shadow-xs text-gray-700 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-gray-300"
                      }`}
                    >
                      <span className="h-4 w-4 rounded-full block border shadow-xs shrink-0" style={{ backgroundColor: col.hex }} />
                      {col.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Logo and Theme Configuration */}
              <div className="border-t border-slate-200/80 dark:border-slate-800 pt-5 flex flex-col gap-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <ImageUploadInput 
                    label="Official Organization Brand Logo (Replaces default letter badge)" 
                    value={logoUrl} 
                    onChange={(val) => {
                      setLogoUrl(val);
                      if (!dashboardLogo) setDashboardLogo(val);
                    }} 
                    bucketName="avatars"
                  />

                  <ImageUploadInput 
                    label="Organization Profile Banner / Cover Image" 
                    value={coverUrl} 
                    onChange={setCoverUrl} 
                    bucketName="avatars"
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl">
                  <div className="flex flex-col gap-1 text-left">
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-100">Cooperative Marketplace Integration</span>
                    <span className="text-[11px] text-gray-400">Allow members to buy/sell assets and commodities via the internal cooperative directory. Disable this to hide the Marketplace option from the navigation menu.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={marketplaceEnabled}
                    onChange={(e) => setMarketplaceEnabled(e.target.checked)}
                    className="h-4.5 w-4.5 text-[var(--org-primary)] focus:ring-[var(--org-primary)] border-gray-300 rounded cursor-pointer"
                  />
                </div>
              </div>

              <Button type="submit" loading={updateMutation.isPending} icon={<Save className="h-4.5 w-4.5" />} className="self-end px-7 mt-4 py-2.5">
                {t("btn_save_branding")}
              </Button>
            </form>
          </Card>

          {/* Danger Zone: Permanent Workspace Deletion */}
          {isAdmin && (
            <Card title={t("Danger Zone: Permanent Workspace Deletion")}>
              <div className="flex flex-col gap-4 text-xs md:text-sm font-medium">
                <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl">
                  <AlertTriangle className="h-6 w-6 text-rose-600 shrink-0" />
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-rose-900">{t("This action is completely IRREVERSIBLE!")}</span>
                    <p className="text-[11px] text-rose-700 font-medium leading-normal mt-0.5">
                      {t("Deleting this workspace will immediately remove all credentials, financial entries, shared documents, audit log metrics, events, and permanently revoke cooperative memberships. All links associated under this organization will go dead.")}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                  <div className="flex flex-col text-left gap-0.5">
                    <span className="text-xs font-bold text-stone-850">{t("Delete Cooperative Workspace")}</span>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="text-rose-700 border-rose-300 bg-rose-50 hover:bg-rose-100 font-bold self-start sm:self-center cursor-pointer hover:border-rose-400 active:bg-rose-200"
                    onClick={() => setOpenDeleteModal(true)}
                  >
                    {t("Delete Organization")}
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

        {/* Public profile page tab */}
        {activeTab === "public_portal" && (
          <Card title={t("settings_public_title")}>
            <form onSubmit={handleSavePublicSettings} className="flex flex-col gap-6 text-xs md:text-sm font-medium">
              <p className="text-gray-550 font-normal leading-normal mb-1">
                {t("Configure content displayed externally to donors and search crawlers on the public web directory.")}
              </p>

              {/* Public Page Live Link Preview */}
              <div className="p-4 bg-[var(--org-primary-l)] border border-[var(--org-primary)]/20 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-[var(--org-primary)] shrink-0 shadow-xs border">
                    <Globe className="h-5 w-5 animate-spin-slow" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-900 dark:text-white">{t("Your Public Organization Profile is Live")}</span>
                    <span className="text-[11px] text-gray-400 font-mono mt-0.5">/@{slug || activeOrg?.slug}</span>
                  </div>
                </div>
                <Link
                  to={`/@${slug || activeOrg?.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-[var(--org-primary)] text-white hover:opacity-90 font-bold text-xs rounded-xl flex items-center gap-1.5 self-start w-fit shadow-xs transition"
                >
                  <Globe className="h-4 w-4" /> {t("View Public Page")}
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label={t("lbl_public_slug")} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="e.g. green-kigali" />
                <Input label={t("Organization Location Name")} value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="e.g. Nyarugenge Hill, Sector 4" />
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-800 dark:text-slate-200">Enable Public Portal Page</span>
                  <span className="text-xs text-gray-500">Allow anyone on the internet to view your public profile at impacto.rw/@slug.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={publicPageEnabled} onChange={(e) => setPublicPageEnabled(e.target.checked)} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[var(--org-primary)]"></div>
                </label>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-800 dark:text-slate-200">Show Goals Publicly</span>
                  <span className="text-xs text-gray-500">Expose your active civic and environmental progress goals to community stakeholders.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={showGoalsPublicly} onChange={(e) => setShowGoalsPublicly(e.target.checked)} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[var(--org-primary)]"></div>
                </label>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-800 dark:text-slate-200">Show Impact Metrics Publicly</span>
                  <span className="text-xs text-gray-500">Expose physical activity log registries and verified impact metrics metrics transparently.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={showImpactPublicly} onChange={(e) => setShowImpactPublicly(e.target.checked)} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[var(--org-primary)]"></div>
                </label>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-800 dark:text-slate-200">Show Facilities & 24h Lending Calendar Publicly</span>
                  <span className="text-xs text-gray-500">Expose room capacities and 24-hour occupied reservation calendar to public visitors.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={showCalendarPublicly} onChange={(e) => setShowCalendarPublicly(e.target.checked)} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[var(--org-primary)]"></div>
                </label>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-800 dark:text-slate-200">Public Visibility on Discovery Feed</span>
                  <span className="text-xs text-gray-500">Allow your organization to be listed on the main Impacto discovery landing page.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={isPublicDir} onChange={(e) => setIsPublicDir(e.target.checked)} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[var(--org-primary)]"></div>
                </label>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-800 dark:text-slate-200">{t("Allow Member Registration Requests")}</span>
                  <span className="text-xs text-gray-500">{t("Display a registration request button on your public organization homepage.")}</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={allowPublicJoining} onChange={(e) => setAllowPublicJoining(e.target.checked)} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[var(--org-primary)]"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-gray-200 dark:border-slate-800">
                {/* Banner Cover Customization */}
                <div className="flex flex-col gap-3">
                  <label className="text-xs font-bold text-gray-750 dark:text-slate-300">{t("Organization Banner Cover")}</label>
                  <span className="text-[11px] text-gray-500 leading-none">{t("Upload a cover photo or choose a beautiful background gradient profile:")}</span>
                  
                  <div className="mb-1">
                    <ImageUploadInput 
                      label={t("Upload Cover Image / Photo")}
                      value={coverUrl.startsWith("from-") ? "" : coverUrl}
                      onChange={(url) => {
                        if (url) setCoverUrl(url);
                      }}
                      placeholder="Upload cover image file or paste URL..."
                    />
                  </div>

                  {/* Preset Gradients Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { name: "Forest", class: "from-emerald-500 to-green-600" },
                      { name: "Ocean", class: "from-blue-600 to-indigo-700" },
                      { name: "Sunset", class: "from-rose-500 to-orange-500" },
                      { name: "Amber", class: "from-amber-500 to-yellow-600" },
                      { name: "Royal", class: "from-violet-600 to-fuchsia-700" },
                      { name: "Slate", class: "from-slate-700 to-slate-900" }
                    ].map((grad) => (
                      <button
                        key={grad.name}
                        type="button"
                        onClick={() => setCoverUrl(grad.class)}
                        className={`p-2 rounded-lg text-xs font-semibold text-white shadow-sm bg-gradient-to-tr ${grad.class} hover:opacity-90 transition`}
                      >
                        {grad.name}
                      </button>
                    ))}
                  </div>

                  {/* Manual entry fallback */}
                  <Input
                    label={t("Or Custom Gradient/Image Link")}
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    placeholder="from-emerald-500 to-green-600 or https://..."
                  />
                </div>

                {/* Brand Logo Customization */}
                <div className="flex flex-col gap-3">
                  <ImageUploadInput 
                    label={t("Organization Brand Logo")} 
                    value={logoUrl} 
                    onChange={setLogoUrl} 
                    placeholder="Upload logo image file or enter URL..."
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-semibold text-gray-750">{t("Contact Us Details / Location coordinates")}</label>
                <textarea
                  className="w-full text-sm rounded-lg border bg-white border-gray-300 p-3 h-20 focus:ring-2 focus:ring-[var(--org-primary)] focus:outline-none"
                  value={contactUs}
                  onChange={(e) => setContactUs(e.target.value)}
                  placeholder="e.g. Email: info@organization.org | Tel: +250 788 000 000 | Location: Kigali"
                />
              </div>

              {/* Gallery List Preview */}
              <div className="flex flex-col gap-3">
                <label className="text-xs font-semibold text-gray-755">{t("lbl_gallery_photos")}</label>
                <div className="flex gap-4 items-end">
                   <div className="flex-1">
                     <ImageUploadInput 
                       value={galleryInput}
                       onChange={setGalleryInput}
                       placeholder="Paste image link or upload file..."
                     />
                   </div>
                   <Button type="button" onClick={() => {
                     if (galleryInput.trim()) {
                        setGalleryUrls([...galleryUrls, galleryInput]);
                        setGalleryInput("");
                     }
                   }}>
                     {t("btn_add_to_gallery")}
                   </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2 border-t pt-4">
                  {galleryUrls.map((g, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border">
                      <ResolvedImage src={g} alt="gallery" className="h-24 w-full object-cover" bucketName="avatars" />
                      <button
                        type="button"
                        onClick={() => {
                          const newG = [...galleryUrls];
                          newG.splice(idx, 1);
                          setGalleryUrls(newG);
                        }}
                        className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-red-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <Button type="submit" loading={updateMutation.isPending} icon={<Save className="h-4.5 w-4.5" />} className="self-end px-7 mt-4 py-2.5">
                {t("btn_save_public_settings")}
              </Button>
            </form>
          </Card>
        )}

        {/* Exit Survey & Offboarding Tab */}
        {activeTab === "exit_survey" && canAccessExitSurvey && (
          <div className="flex flex-col gap-6 pb-8">
            <Card title="Exit Survey & Offboarding Configuration">
              <form onSubmit={handleSaveExitSurvey} className="flex flex-col gap-6 text-xs md:text-sm font-medium">
                {/* Header overview & link to report */}
                <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-3xs">
                      <ClipboardList className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        Offboarding Survey & Member Retention Analytics
                      </span>
                      <p className="text-xs text-gray-600 dark:text-slate-400 mt-0.5">
                        Define questions asked to members when they choose to exit this organization workspace. Responses are compiled into executive retention reports.
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/admin-modules?tab=resignations"
                    className="px-4 py-2 bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800 border border-emerald-300 dark:border-emerald-700 font-bold text-xs rounded-xl flex items-center gap-1.5 self-start sm:self-center shadow-3xs transition whitespace-nowrap"
                  >
                    <BarChart2 className="h-4 w-4" /> View Survey Reports
                  </Link>
                </div>

                {/* Master switch */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      Enable Departure Survey for Exiting Members
                    </span>
                    <span className="text-xs text-gray-500 dark:text-slate-400">
                      When enabled, members exiting from the Organization Switcher (/org-picker) or submitting a resignation will be prompted to answer the survey questions before membership deletion is finalized.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={exitSurveyEnabled}
                      onChange={(e) => setExitSurveyEnabled(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[var(--org-primary)]"></div>
                  </label>
                </div>

                {/* Survey metadata */}
                <div className="grid grid-cols-1 gap-4">
                  <Input
                    label="Survey Title"
                    value={exitSurveyTitle}
                    onChange={(e) => setExitSurveyTitle(e.target.value)}
                    placeholder="e.g. Member Departure & Offboarding Survey"
                  />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-755 dark:text-slate-300">
                      Survey Instructions & Greeting Message
                    </label>
                    <textarea
                      value={exitSurveyDesc}
                      onChange={(e) => setExitSurveyDesc(e.target.value)}
                      rows={2}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs md:text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--org-primary)] focus:outline-none resize-none font-medium"
                      placeholder="e.g. Please share your feedback so cooperative leadership can continue improving community support."
                    />
                  </div>
                </div>

                {/* Questions Header & Actions */}
                <div className="border-t border-gray-200 dark:border-slate-800 pt-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span>Configured Survey Questions</span>
                        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold rounded-full">
                          {exitSurveyQuestions.length} Questions
                        </span>
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                        Customize, reorder, or add custom multiple choice and rating prompts to ask departing members.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleResetDefaultQuestions}
                        className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                      >
                        Reset Defaults
                      </button>
                      <Button
                        type="button"
                        onClick={handleOpenAddQuestion}
                        icon={<Plus className="h-3.5 w-3.5" />}
                        className="px-3.5 py-1.5 text-xs font-bold"
                      >
                        Add Question
                      </Button>
                    </div>
                  </div>

                  {/* Question Cards List */}
                  <div className="flex flex-col gap-3">
                    {exitSurveyQuestions.map((q, idx) => (
                      <div
                        key={q.id || idx}
                        className="p-4 bg-white dark:bg-slate-900/90 border border-gray-200 dark:border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-3xs hover:border-gray-300 dark:hover:border-slate-700 transition"
                      >
                        <div className="flex items-start gap-3 flex-1">
                          <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </div>
                          <div className="flex flex-col gap-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-gray-900 dark:text-white">
                                {q.question}
                              </span>
                              <span
                                className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider ${
                                  q.type === "rating"
                                    ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                    : q.type === "choice"
                                    ? "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                                    : q.type === "boolean"
                                    ? "bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                }`}
                              >
                                {q.type === "rating" ? "5-Star Rating" : q.type === "choice" ? "Choice" : q.type === "boolean" ? "Yes/No" : "Text"}
                              </span>
                              {q.required ? (
                                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">
                                  Required
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                  Optional
                                </span>
                              )}
                            </div>

                            {q.type === "choice" && q.options && q.options.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-0.5">
                                {q.options.map((opt: string, optIdx: number) => (
                                  <span
                                    key={optIdx}
                                    className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-400 rounded-md font-medium"
                                  >
                                    {opt}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 self-end md:self-center shrink-0 border-t md:border-t-0 pt-2 md:pt-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveQuestion(idx, "up")}
                            title="Move Up"
                            className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === exitSurveyQuestions.length - 1}
                            onClick={() => handleMoveQuestion(idx, "down")}
                            title="Move Down"
                            className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditQuestion(q)}
                            title="Edit Question"
                            className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(q.id)}
                            title="Delete Question"
                            className="p-1.5 text-rose-600 hover:text-rose-800 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-gray-200 dark:border-slate-800 pt-4 mt-2">
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    Changes take effect immediately for all departing cooperative members.
                  </span>
                  <Button
                    type="submit"
                    loading={updateMutation.isPending}
                    icon={<Save className="h-4.5 w-4.5" />}
                    className="px-7 py-2.5"
                  >
                    Save Exit Survey Settings
                  </Button>
                </div>
              </form>
            </Card>

            {/* Question Modal */}
            {showQuestionModal && (
              <Modal
                isOpen={showQuestionModal}
                onClose={() => setShowQuestionModal(false)}
                title={editingQuestionId ? "Edit Survey Question" : "Add Custom Survey Question"}
              >
                <form onSubmit={handleSaveQuestion} className="flex flex-col gap-4 text-xs md:text-sm font-medium">
                  <Input
                    label="Question Prompt"
                    value={qText}
                    onChange={(e) => setQText(e.target.value)}
                    placeholder="e.g. How satisfied were you with committee transparency?"
                    required
                  />

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-755 dark:text-slate-300">
                      Question Answer Format
                    </label>
                    <select
                      value={qType}
                      onChange={(e) => setQType(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs md:text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--org-primary)] focus:outline-none font-medium"
                    >
                      <option value="choice">Multiple Choice (Single Option Select)</option>
                      <option value="rating">5-Star Satisfaction Rating</option>
                      <option value="text">Open Text Response</option>
                      <option value="boolean">Yes / No Binary Response</option>
                    </select>
                  </div>

                  {qType === "choice" && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-755 dark:text-slate-300">
                        Answer Options (Comma-separated)
                      </label>
                      <input
                        type="text"
                        value={qOptions}
                        onChange={(e) => setQOptions(e.target.value)}
                        placeholder="e.g. Excellent, Good, Fair, Needs Improvement"
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs md:text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--org-primary)] focus:outline-none font-medium"
                      />
                      <span className="text-[11px] text-gray-400">
                        Separate choices with a comma (e.g., Option A, Option B, Option C)
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2.5 py-1">
                    <input
                      type="checkbox"
                      id="q_req_checkbox"
                      checked={qRequired}
                      onChange={(e) => setQRequired(e.target.checked)}
                      className="h-4 w-4 text-[var(--org-primary)] focus:ring-[var(--org-primary)] border-gray-300 rounded cursor-pointer"
                    />
                    <label htmlFor="q_req_checkbox" className="text-xs font-semibold text-gray-800 dark:text-gray-200 cursor-pointer select-none">
                      Make this question mandatory (Required)
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200 dark:border-slate-800">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowQuestionModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingQuestionId ? "Update Question" : "Add to Survey"}
                    </Button>
                  </div>
                </form>
              </Modal>
            )}
          </div>
        )}

        {/* Momo credentials setup */}
        {activeTab === "momo" && canAccessMomo && (
          <Card title="Organization MoMo & Settlement Accounts">
            <form onSubmit={handleSaveMomo} className="flex flex-col gap-6 text-xs md:text-sm font-medium">
              <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl p-4 text-xs space-y-1.5">
                <span className="font-extrabold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Organization Direct Payment Routing
                </span>
                <p className="text-stone-600 dark:text-stone-300 leading-relaxed text-[11.5px]">
                  When your members settle monthly dues, registrations, or contributions, money is directly collected into your registered Mobile Money numbers or Merchant Pay Code configured below.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <Input
                  label="Registered Merchant / Organization Account Name"
                  value={mName}
                  onChange={(e) => setMName(e.target.value)}
                  placeholder="e.g. KIGALI FARMERS COOPERATIVE"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="MTN MoMo Collection Number"
                    value={mtnNum}
                    onChange={(e) => setMtnNum(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="e.g. 078XXXXXXX"
                  />
                  <Input
                    label="Airtel Money Collection Number"
                    value={airtelNum}
                    onChange={(e) => setAirtelNum(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="e.g. 073XXXXXXX"
                  />
                </div>

                <Input
                  label="Merchant Pay Code / USSD Dial Shortcut (Optional)"
                  value={momoMerchantCode}
                  onChange={(e) => setMomoMerchantCode(e.target.value)}
                  placeholder="e.g. *182*8*1*123456# or 123456"
                />
              </div>

              <div className="flex items-center gap-3 select-none py-3 border-t border-slate-200 dark:border-slate-800">
                <input
                  type="checkbox"
                  id="momo_active_tick"
                  checked={enableDonations}
                  onChange={(e) => setEnableDonations(e.target.checked)}
                  className="h-4.5 w-4.5 text-[var(--org-primary)] focus:ring-[var(--org-primary)] rounded border-gray-300 cursor-pointer"
                />
                <label htmlFor="momo_active_tick" className="text-xs font-bold leading-none cursor-pointer text-stone-850 dark:text-stone-200">
                  Enable public donation and contribution portal forms for external supporters
                </label>
              </div>

              <Button type="submit" loading={updateMutation.isPending} icon={<Save className="h-4.5 w-4.5" />} className="self-end px-6.5 mt-2 py-2.5">
                Save Organization Settlement Numbers
              </Button>
            </form>
          </Card>
        )}

        {/* Subscription pricing structures & Workplace Packages */}
        {activeTab === "subscription" && canAccessSubscription && (() => {
          const lifecycle = getOrgSubscriptionLifecycle(activeOrg);

          return (
            <div className="flex flex-col gap-6 w-full animate-in fade-in">
              {/* Workspace Subscription & Packages Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Crown className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-display">
                      {activeOrg?.name || "Workspace"} Plans & Feature Packages
                    </h2>
                    <Badge color={lifecycle.isPaidActive ? "green" : lifecycle.tier === "free" ? "blue" : lifecycle.isTrial ? "amber" : "red"}>
                      {lifecycle.statusLabel.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Current Tier: <strong className="text-slate-800 dark:text-slate-200 uppercase">{lifecycle.tier || "Trial"}</strong> • {isUnlimited ? "Unlimited Access" : `${daysLeft} Days Remaining`} • Quota: {lifecycle.memberLimit === Infinity ? "Unlimited" : `${lifecycle.memberLimit} members`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => setOpenSubModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs px-4 py-2 shadow-xs shrink-0 whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    Submit Payment Receipt Proof
                  </Button>
                </div>
              </div>

              {activeOrg?.subscription_status === "trial" && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs select-none">
                  <div className="flex items-start gap-2.5">
                    <Clock className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wide text-[11px]">Free Trial Window:</span>
                      <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                        You have <strong className="text-amber-800 dark:text-amber-400 font-bold">{daysLeft} days left</strong> in your trial period. Upgrade to continue uninterrupted.
                      </p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => handleOpenSubscriptionCheckout("Growth Plan - $25/month")}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-3.5 py-1.5 rounded-xl shrink-0"
                  >
                    <Zap className="h-3.5 w-3.5 mr-1" />
                    Upgrade to Growth →
                  </Button>
                </div>
              )}

              {/* Base Workspace Plans */}
              <div>
                <div className="mb-4">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white font-display">
                    Workspace Plans
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Choose the capacity tier suited for your cooperative or organization.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Starter Plan */}
                  <div className={`rounded-xl p-5 flex flex-col justify-between transition border ${
                    activeOrg?.subscription_status === "active" && activeOrg?.subscription_tier === "starter"
                      ? "border-emerald-500 bg-white dark:bg-slate-900 shadow-sm ring-1 ring-emerald-500/30"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}>
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs uppercase font-bold text-slate-400 font-mono">STARTER</span>
                        {activeOrg?.subscription_status === "active" && activeOrg?.subscription_tier === "starter" ? (
                          <Badge color="green">Active</Badge>
                        ) : (
                          <Badge color="blue">Entry</Badge>
                        )}
                      </div>
                      <h4 className="text-2xl font-bold font-display text-slate-900 dark:text-white">
                        $10 <span className="text-xs font-normal text-slate-400">/ mo ({formatAmount(convertToRWF(10, "USD"))})</span>
                      </h4>
                      <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 mt-4">
                        <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Up to 100 active members</li>
                        <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Community event calendar</li>
                        <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Group & direct messaging</li>
                        <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> 1 GB secure file storage</li>
                      </ul>
                    </div>
                    <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                      {activeOrg?.subscription_status === "active" && activeOrg?.subscription_tier === "starter" ? (
                        <div className="w-full text-center py-2 px-3 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30">
                          ✓ Current Plan
                        </div>
                      ) : (
                        <Button variant="outline" className="w-full text-xs font-bold py-2 rounded-lg" onClick={() => handleOpenSubscriptionCheckout("Starter Plan - $10/month")}>
                          Choose Starter ($10/mo)
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Growth Plan */}
                  <div className={`rounded-xl p-5 flex flex-col justify-between transition border-2 ${
                    activeOrg?.subscription_status === "active" && activeOrg?.subscription_tier === "growth"
                      ? "border-emerald-600 bg-white dark:bg-slate-900 shadow-sm ring-1 ring-emerald-500/20"
                      : "bg-white dark:bg-slate-900 border-emerald-600/80 dark:border-emerald-500/80 shadow-xs"
                  }`}>
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs uppercase font-bold text-emerald-600 dark:text-emerald-400 font-mono">GROWTH</span>
                        <Badge color="green">Recommended</Badge>
                      </div>
                      <h4 className="text-2xl font-bold font-display text-slate-900 dark:text-white">
                        $25 <span className="text-xs font-normal text-slate-400">/ mo ({formatAmount(convertToRWF(25, "USD"))})</span>
                      </h4>
                      <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 mt-4">
                        <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Up to 500 active members</li>
                        <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Voice notes, media & live polls</li>
                        <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Advanced accounting ledgers</li>
                        <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> 5 GB secure file storage</li>
                      </ul>
                    </div>
                    <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                      {activeOrg?.subscription_status === "active" && activeOrg?.subscription_tier === "growth" ? (
                        <div className="w-full text-center py-2 px-3 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30">
                          ✓ Current Plan
                        </div>
                      ) : (
                        <Button className="w-full text-xs font-bold py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs" onClick={() => handleOpenSubscriptionCheckout("Growth Plan - $25/month")}>
                          Choose Growth ($25/mo)
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Pro Plan */}
                  <div className={`rounded-xl p-5 flex flex-col justify-between text-white transition border ${
                    activeOrg?.subscription_status === "active" && (activeOrg?.subscription_tier === "enterprise" || (activeOrg as any)?.subscription_tier === "pro")
                      ? "border-amber-400 bg-slate-900 shadow-sm ring-1 ring-amber-400/30"
                      : "bg-slate-900 border-slate-800"
                  }`}>
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs uppercase font-bold text-amber-400 font-mono">PRO</span>
                        <Crown className="h-4 w-4 text-amber-400" />
                      </div>
                      <h4 className="text-2xl font-bold font-display text-white">
                        $40 <span className="text-xs font-normal text-slate-400">/ mo ({formatAmount(convertToRWF(40, "USD"))})</span>
                      </h4>
                      <ul className="text-xs text-slate-200 space-y-2 mt-4">
                        <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-amber-400 shrink-0" /> Unlimited members & storage</li>
                        <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-amber-400 shrink-0" /> Automated digital certificates</li>
                        <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-amber-400 shrink-0" /> Hardware & asset registry</li>
                        <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-amber-400 shrink-0" /> Priority hotline support</li>
                      </ul>
                    </div>
                    <div className="mt-5 pt-3 border-t border-slate-800">
                      {activeOrg?.subscription_status === "active" && (activeOrg?.subscription_tier === "enterprise" || (activeOrg as any)?.subscription_tier === "pro") ? (
                        <div className="w-full text-center py-2 px-3 rounded-lg text-xs font-semibold text-amber-300 bg-amber-950/40">
                          ✓ Current Plan
                        </div>
                      ) : (
                        <Button className="w-full text-xs font-bold py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950" onClick={() => handleOpenSubscriptionCheckout("Pro Plan - $40/month")}>
                          Upgrade to Pro ($40/mo)
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Add-On Feature Packages: Gated only for Free and Starter workspaces */}
              {(() => {
                const orgTier = (activeOrg?.subscription_tier || "free").toLowerCase();
                const isPaidTier = ["growth", "pro", "enterprise"].includes(orgTier) || activeOrg?.subscription_status === "active";
                if (isPaidTier) {
                  return (
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                          <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                            <ShieldCheck className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white font-display flex items-center gap-2">
                              All Feature Packages Active & Included in your {orgTier.toUpperCase()} Plan
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                              Your cooperative subscription includes unrestricted access to Attendance & Check-In, Financial Ledgers, Document Verification, and Equipment Asset Management. No individual add-on packages are required.
                            </p>
                          </div>
                        </div>
                        <span className="self-start sm:self-auto px-3.5 py-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-full font-mono whitespace-nowrap">
                          ✓ All Features Included
                        </span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                      <div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white font-display flex items-center gap-2">
                          <Package className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          Add-On Feature Packages
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Unlock specific high-productivity capabilities for your workspace at a flat $4/mo (5,000 RWF).
                        </p>
                      </div>
                      <Badge color="purple">Modular Add-ons</Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        {
                          id: "event_pack",
                          name: "Event & Attendance Pack",
                          desc: "Instant attendee rosters, physical presence logging, and check-ins.",
                          planLabel: "Package: Event & Attendance Pack - $4/month",
                          icon: QrCode
                        },
                        {
                          id: "finance_pack",
                          name: "Financial Accounting Pack",
                          desc: "Complete financial ledger, dues collection meter, and exportable reports.",
                          planLabel: "Package: Financial Accounting Ledger Pack - $4/month",
                          icon: Coins
                        },
                        {
                          id: "document_pack",
                          name: "Document Verification Pack",
                          desc: "Digital certificate issuance, QR validation, and encrypted vault.",
                          planLabel: "Package: Document Signing & Verification Pack - $4/month",
                          icon: FileCheck
                        },
                        {
                          id: "asset_pack",
                          name: "Equipment & Asset Pack",
                          desc: "Equipment inventory tracking, maintenance schedules, and custodian logs.",
                          planLabel: "Package: Equipment & Asset Management Pack - $4/month",
                          icon: Layers
                        }
                      ].map((pkg) => {
                        const isPurchased = (activeOrg?.active_packages || []).includes(pkg.id);
                        const IconComp = pkg.icon;
                        return (
                          <div
                            key={pkg.id}
                            className={`p-4 rounded-xl border flex flex-col justify-between transition ${
                              isPurchased
                                ? "bg-purple-50/50 dark:bg-purple-950/20 border-purple-300 dark:border-purple-800"
                                : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-purple-200"
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <div className="h-8 w-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                  <IconComp className="h-4 w-4" />
                                </div>
                                {isPurchased ? (
                                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full font-mono">
                                    Active
                                  </span>
                                ) : (
                                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
                                    $4 <span className="text-[10px] font-normal text-slate-400">/ mo</span>
                                  </span>
                                )}
                              </div>
                              <h4 className="font-bold text-xs text-slate-900 dark:text-white leading-tight mb-1">
                                {pkg.name}
                              </h4>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                                {pkg.desc}
                              </p>
                            </div>
                            <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800">
                              {isPurchased ? (
                                <div className="text-center py-1.5 text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100/70 dark:bg-purple-950/50 rounded-lg">
                                  ✓ Package Enabled
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full text-xs font-bold py-1.5 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                                  onClick={() => handleOpenSubscriptionCheckout(pkg.planLabel)}
                                >
                                  Activate Package ($4)
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Billing & Invoices Ledger */}
              <div className="mt-2">
                <SubscriptionPaymentDashboard
                  org={activeOrg}
                  orgId={activeOrg?.id}
                  onOpenRenewModal={() => setOpenSubModal(true)}
                />
              </div>
            </div>
          );
        })()}

        {/* Support Chat dialog back and forth */}
        {activeTab === "support" && canAccessSupport && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full font-medium">
            <div className="lg:col-span-2 flex flex-col h-[65vh] border rounded-2xl bg-white overflow-hidden shadow-xs">
              <div className="px-5 py-4.5 bg-gray-50 border-b flex justify-between items-center leading-none">
                <span className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                  <MessageSquare className="h-4.5 w-4.5 text-[var(--org-primary)]" /> {t("Support Conversation Log with Platform Superadmin")}
                </span>
                <span className="text-[10px] font-mono font-bold text-gray-500 uppercase flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse block" /> {t("Live Direct Connection")}
                </span>
              </div>

              {/* Chat threads */}
              <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4">
                {supportChats && supportChats.length > 0 ? (
                  supportChats.map((c) => (
                    <div key={c.id} className="flex flex-col gap-3.5 border-b pb-4">
                      {/* Org Sent Message */}
                      <div className="flex gap-3 max-w-[85%] self-start">
                        <div className="h-8 w-8 rounded-full bg-stone-100 flex items-center justify-center text-xs font-bold shrink-0">
                          {activeOrg?.name ? activeOrg.name.charAt(0) : "O"}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] text-stone-500 font-bold">{activeOrg?.name || "Organization"} {t("Admin")}</span>
                          <div className="p-3 bg-gray-100 rounded-xl text-xs text-stone-850 leading-relaxed font-bold">
                            {c.description}
                          </div>
                          <span className="text-[9px] text-gray-450 font-mono">{new Date(c.created_at).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Superadmin Response */}
                      {c.admin_notes && (
                        <div className="flex gap-3 max-w-[85%] self-end flex-row-reverse">
                          <div className="h-8 w-8 rounded-full bg-slate-900 text-yellow-500 flex items-center justify-center text-xs font-bold shrink-0">
                            SA
                          </div>
                          <div className="flex flex-col gap-1.5 text-right">
                            <span className="text-[10px] text-stone-550 font-bold flex items-center justify-end gap-1">
                              {t("Platform Superadmin")} <BadgeCheck className="h-3 w-3 text-amber-500" />
                            </span>
                            <div className="p-3 bg-slate-900 text-white rounded-xl text-xs leading-relaxed text-left font-semibold">
                              {c.admin_notes}
                            </div>
                            <span className="text-[9px] text-gray-440 font-mono">{t("Verified Reply")}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-16 flex flex-col items-center justify-center gap-2">
                    <MessageSquare className="h-10 w-10 text-gray-300" />
                    <p className="text-xs text-gray-500 font-bold">{t("No previous direct line chats recorded with Superadmins.")}</p>
                    <p className="text-[11px] text-gray-455">{t("Type your first direct message below to talk as well or report an error.")}</p>
                  </div>
                )}
              </div>

              {/* Chat send input */}
              <form onSubmit={handleSubmitEscalationChat} className="p-4 border-t bg-gray-50 flex items-center gap-3">
                <div className="flex-1">
                  <Input value={supportMessage} onChange={(e) => setSupportMessage(e.target.value)} placeholder={t("Type a message to Platform Superadmin to report a bug or request help...")} />
                </div>
                <Button type="submit" loading={supportMutation.isPending}>
                  <Send className="h-4.5 w-4.5" />
                </Button>
              </form>
            </div>

            <div className="flex flex-col gap-6">
              <Card title={t("Direct Support Hotline")}>
                <div className="flex flex-col gap-4 text-xs font-semibold text-gray-700 leading-relaxed">
                  <p>
                    {t("Your dedicated subscription gives you direct communication with developers and system architects.")}
                  </p>
                  <p className="p-3 bg-amber-50 rounded-xl border border-amber-250 flex gap-2 text-amber-900 font-bold">
                    <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> {t("Response times generally range under 2 hours during GMT+2 business windows.")}
                  </p>
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "profile" && user && (
          <div className="flex flex-col gap-6 pb-8">
            <Card title={t("My Personal Profile Settings")}>
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-6 text-xs md:text-sm font-medium">
              <p className="text-gray-550 font-normal leading-normal">
                {t("Customize your personal profile branding. Your selected avatar emoji or custom icon will be displayed across internal chat rooms, activity attendance lists, and public directories.")}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="flex flex-col gap-4">
                  <Input
                    label={t("Full Name")}
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      label={t("Professional Title / Role")}
                      value={profileJobTitle}
                      onChange={(e) => setProfileJobTitle(e.target.value)}
                      placeholder="e.g. Cooperative Treasurer"
                    />
                    <Input
                      label={t("Phone Number")}
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder="e.g. +250 788..."
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700 dark:text-slate-300">{t("Personal Bio & Notes")}</label>
                    <textarea
                      className="w-full text-xs rounded-xl border bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 p-3 h-20 font-medium text-gray-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      value={profileBio}
                      onChange={(e) => setProfileBio(e.target.value)}
                      placeholder="Write a brief professional summary or personal note..."
                    />
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-400">{t("Email Address (Primary Identity)")}</label>
                    <div className="p-3 bg-gray-50 border border-gray-200 text-gray-500 rounded-lg text-sm select-all">
                      {user.email}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4 bg-slate-50 dark:bg-slate-900/40 p-4.5 rounded-xl border">
                  <div className="flex items-center gap-3">
                    <Avatar name={profileName} size="lg" src={profileAvatar} />
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-bold text-gray-800 dark:text-slate-100">{t("Profile Avatar Preview")}</span>
                      <span className="text-[11px] text-gray-500">{t("Choose from 5 clean standard avatar icons or input custom icon.")}</span>
                    </div>
                  </div>

                  {/* Icon Preset list */}
                  <div className="flex flex-wrap gap-2.5 pt-2">
                    {[
                      { name: "User", value: "icon:user" },
                      { name: "Shield", value: "icon:shield" },
                      { name: "Heart", value: "icon:heart" },
                      { name: "Graduation Cap", value: "icon:graduation-cap" },
                      { name: "Briefcase", value: "icon:briefcase" }
                    ].map((preset) => {
                      const IconComp = getLucideIcon(preset.value.substring(5));
                      return (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => setProfileAvatar(preset.value)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                            profileAvatar === preset.value
                              ? "bg-[var(--org-primary-l)] text-[var(--org-primary)] border border-[var(--org-primary)]"
                              : "bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50"
                          }`}
                        >
                          {IconComp && <IconComp className="h-4 w-4" />}
                          {preset.name}
                        </button>
                      );
                    })}
                  </div>

                  {/* Manual entry */}
                  <div className="pt-2">
                    <Input
                      label={t("Custom Avatar Icon Name")}
                      value={profileAvatar}
                      onChange={(e) => setProfileAvatar(e.target.value)}
                      placeholder="e.g. icon:award or image URL"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gray-700 dark:text-slate-300">{t("Status Badge")}</label>
                      <select
                        className="w-full text-xs rounded-xl border bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 p-2.5 font-semibold text-gray-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        value={statusBadge}
                        onChange={(e) => setStatusBadge(e.target.value as any)}
                      >
                        <option value="active">🟢 Active</option>
                        <option value="remote">💻 Remote</option>
                        <option value="field">🌾 In Field</option>
                        <option value="away">⏳ Away</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gray-700 dark:text-slate-300">{t("Profile Visibility")}</label>
                      <select
                        className="w-full text-xs rounded-xl border bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 p-2.5 font-semibold text-gray-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        value={profileVisibility}
                        onChange={(e) => setProfileVisibility(e.target.value as any)}
                      >
                        <option value="members_only">👥 Members Only</option>
                        <option value="public">🌐 Public Directory</option>
                        <option value="private">🔒 Private</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Personal Language & Accessibility Section */}
              <div className="border-t border-gray-100 dark:border-slate-800 pt-6 mt-2 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-gray-900 dark:text-slate-100 font-bold text-sm">
                  <Languages className="h-4.5 w-4.5 text-emerald-600" />
                  <span>{t("Personal Language & Accessibility (Only for You)")}</span>
                </div>
                <p className="text-xs text-gray-500 font-normal leading-normal">
                  {t("Set your personal interface language, visual accessibility options, and display density. These settings apply strictly to your user account and do not interfere with other members or the cooperative's default workspace settings.")}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Languages className="h-3.5 w-3.5 text-emerald-600" />
                      <span>{t("Interface Language")}</span>
                    </label>
                    <select
                      className="w-full text-xs rounded-xl border bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 p-3 font-semibold text-gray-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      value={profileLanguage}
                      onChange={(e) => setProfileLanguage(e.target.value as any)}
                    >
                      <option value="en">🇬🇧 English</option>
                      <option value="rw">🇷🇼 Kinyarwanda</option>
                      <option value="fr">🇫🇷 Français</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Type className="h-3.5 w-3.5 text-emerald-600" />
                      <span>{t("Font Size Scaling")}</span>
                    </label>
                    <select
                      className="w-full text-xs rounded-xl border bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 p-3 font-semibold text-gray-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      value={accessibilityFontSize}
                      onChange={(e) => setAccessibilityFontSize(e.target.value as any)}
                    >
                      <option value="normal">{t("Normal (100%)")}</option>
                      <option value="large">{t("Large (110%)")}</option>
                      <option value="x-large">{t("Extra Large (120%)")}</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Sliders className="h-3.5 w-3.5 text-emerald-600" />
                      <span>{t("UI Density Mode")}</span>
                    </label>
                    <select
                      className="w-full text-xs rounded-xl border bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 p-3 font-semibold text-gray-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      value={uiDensity}
                      onChange={(e) => setUiDensity(e.target.value as any)}
                    >
                      <option value="normal">{t("Comfortable")}</option>
                      <option value="compact">{t("Compact (Dense)")}</option>
                      <option value="spacious">{t("Spacious")}</option>
                    </select>
                  </div>

                  <div className="flex flex-col justify-end gap-2">
                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={accessibilityHighContrast}
                        onChange={(e) => setAccessibilityHighContrast(e.target.checked)}
                        className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-gray-800 dark:text-slate-200">{t("High Contrast")}</span>
                    </label>

                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={reducedMotion}
                        onChange={(e) => setReducedMotion(e.target.checked)}
                        className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-gray-800 dark:text-slate-200">{t("Reduce Motion")}</span>
                    </label>
                  </div>
                </div>

                {/* Notifications Preferences */}
                <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-gray-900 dark:text-slate-100 block mb-3">{t("Personal Alert & Notification Preferences")}</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={notificationEmail}
                        onChange={(e) => setNotificationEmail(e.target.checked)}
                        className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-800 dark:text-slate-200">{t("Email Fee & Meeting Alerts")}</span>
                        <span className="text-[10px] text-gray-500">{t("Receive receipts and due reminders via email")}</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={notificationSms}
                        onChange={(e) => setNotificationSms(e.target.checked)}
                        className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-800 dark:text-slate-200">{t("SMS / WhatsApp Reminders")}</span>
                        <span className="text-[10px] text-gray-500">{t("Receive instant mobile alerts")}</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <Button type="submit" loading={updateProfileMutation.isPending} icon={<Save className="h-4.5 w-4.5" />} className="self-end px-7 mt-4 py-2.5">
                {t("Save Profile Details")}
              </Button>
            </form>
          </Card>

          {/* Promoter & Referral Attribution Hub Card */}
          <Card title="Promoter & Referral Attribution Hub">
            <div className="flex flex-col gap-4 text-xs font-medium">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-200">
                    Your Personal Referral Link & Promoter Code
                  </h4>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                    Share this link with cooperatives and partners. Anyone who joins or creates an organization using your link will be credited to you.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => setOpenReferralModal(true)}
                  className="text-xs py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shrink-0 flex items-center gap-1.5"
                >
                  <HeartHandshake className="h-3.5 w-3.5" />
                  View Referral Network ({userReferrals.length})
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5 p-3 rounded-xl border bg-slate-50 dark:bg-slate-900 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase text-gray-400">Promoter Code</span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-gray-900 dark:text-white">
                      {user?.referral_code || `REF-${(user?.full_name || "USER").substring(0, 4).toUpperCase().replace(/[^A-Z]/g, "")}-${(user?.id || "101").slice(-4).toUpperCase()}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const code = user?.referral_code || `REF-${(user?.full_name || "USER").substring(0, 4).toUpperCase().replace(/[^A-Z]/g, "")}-${(user?.id || "101").slice(-4).toUpperCase()}`;
                        navigator.clipboard.writeText(code);
                        addToast("Referral code copied!", "success");
                      }}
                      className="text-xs text-emerald-600 hover:underline font-bold flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" /> Copy
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 p-3 rounded-xl border bg-slate-50 dark:bg-slate-900 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase text-gray-400">Total People & Orgs Credited</span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-gray-900 dark:text-white">
                      {userReferrals.length} Referees ({userReferrals.filter(r => r.referred_org_id).length} Orgs)
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpenReferralModal(true)}
                      className="text-xs text-emerald-600 hover:underline font-bold"
                    >
                      Open Hub →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Change Password / Account Security */}
          <Card title={t("Account Security & Password")}>
            <form onSubmit={handleUpdateAccountPassword} className="flex flex-col gap-5 text-xs md:text-sm font-medium">
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-3">
                <Lock className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold">Update Account Password</span>
                  <span className="text-blue-700 dark:text-blue-400">
                    Set a new password for <strong>{user?.email}</strong>. Must be at least 6 characters.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  type="password"
                  label={t("New Password *")}
                  value={newAccountPassword}
                  onChange={(e) => setNewAccountPassword(e.target.value)}
                  placeholder="Enter new secure password"
                  prefixIcon={<KeyRound className="h-4 w-4 text-gray-400" />}
                  required
                />

                <Input
                  type="password"
                  label={t("Confirm New Password *")}
                  value={confirmAccountPassword}
                  onChange={(e) => setConfirmAccountPassword(e.target.value)}
                  placeholder="Re-type new password"
                  prefixIcon={<KeyRound className="h-4 w-4 text-gray-400" />}
                  required
                />
              </div>

              <Button
                type="submit"
                loading={updatingPassword}
                icon={<Lock className="h-4 w-4" />}
                className="self-end px-7 mt-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                {t("Update Password")}
              </Button>
            </form>
          </Card>
        </div>
        )}
      </div>

      {/* Manual Subscription payment modal details */}
      <Modal open={openSubModal} onClose={() => setOpenSubModal(false)} title={t("lbl_license_sub_gateway", "License Subscription Gateway")}>
        <form onSubmit={handlePaySubscription} className="flex flex-col gap-4 text-xs font-semibold text-stone-704">
          <p className="text-stone-550 font-normal leading-normal">
            {t("lbl_momo_transfer_info", "As a Rwandese localized portal, payments resolve via MTN MoMo / Airtel Money. Please transfer correct funds to the official merchant/account numbers below, then enter your transaction reference and details.")}
          </p>

          <div className="p-4 bg-emerald-50 rounded-2xl border flex flex-col gap-2 font-display text-emerald-950">
            <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-800 leading-none">{t("lbl_selected_license_tier", "Selected License Tier")}</span>
            <div className="flex justify-between items-center select-none font-bold">
              <span>{subPlan}</span>
              <span className="text-base font-extrabold text-emerald-900">
                {(parseFloat(subPlan.split("$")[1]) * platformSettings.usd_to_rwf_rate).toLocaleString()} RWF
              </span>
            </div>
            <p className="text-[10px] text-emerald-650 mt-1 font-mono font-bold leading-none">{t("lbl_local_rate_label", "Local Rate:")} 1 USD = {platformSettings.usd_to_rwf_rate} RWF</p>
          </div>

          <UssdPaymentHelper
            targetType="platform"
            mtnNumber={platformSettings.mtn_payment_number}
            merchantCode={platformSettings.momo_merchant_code || platformSettings.mtn_merchant_code}
            airtelNumber={platformSettings.airtel_payment_number}
            recipientName={platformSettings.payment_name}
            amountRwf={parseFloat(subPlan.split("$")[1] || "25") * (platformSettings.usd_to_rwf_rate || 1400)}
            itemName={`Platform Plan: ${subPlan}`}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1">
              <Input
                label={t("lbl_payer_momo_phone", "Sender Phone (MTN 078/079 or Airtel 072/073)")}
                value={payerPhone}
                onChange={(e) => setPayerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="078... or 072/073..."
              />
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-[10px] text-stone-400 font-mono">Quick prefix:</span>
                <button
                  type="button"
                  onClick={() => setPayerPhone("078")}
                  className="px-1.5 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-[10px] font-mono font-bold text-amber-800 border border-amber-200"
                >
                  078 (MTN)
                </button>
                <button
                  type="button"
                  onClick={() => setPayerPhone("079")}
                  className="px-1.5 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-[10px] font-mono font-bold text-amber-800 border border-amber-200"
                >
                  079 (MTN)
                </button>
                <button
                  type="button"
                  onClick={() => setPayerPhone("072")}
                  className="px-1.5 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-[10px] font-mono font-bold text-rose-800 border border-rose-200"
                >
                  072 (Airtel)
                </button>
                <button
                  type="button"
                  onClick={() => setPayerPhone("073")}
                  className="px-1.5 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-[10px] font-mono font-bold text-rose-800 border border-rose-200"
                >
                  073 (Airtel)
                </button>
              </div>
            </div>
            <Input label={t("lbl_momo_trans_ref", "MoMo Transaction Ref ID")} value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="e.g. TXN2468135" />
          </div>

          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-xs font-bold text-gray-700 dark:text-slate-300">{t("lbl_momo_sms_proof", "MTN or Airtel Money confirmation SMS text proof")}</label>
            <textarea
              className="w-full text-xs rounded-xl border bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 p-2.5 focus:ring-2 focus:ring-[var(--org-primary)] focus:outline-none font-mono"
              value={momoSmsProof}
              onChange={(e) => setMomoSmsProof(e.target.value)}
              placeholder="Paste raw SMS text transaction copy, e.g. TxId: 4810294. Yello! You have sent 30,000 RWF to VIRELLIX INC..."
              rows={3}
            />
          </div>

          <div className="flex items-center gap-3 border-t border-slate-200 dark:border-slate-800 pt-3">
            <Button type="button" variant="outline" className="w-1/2" onClick={() => setOpenSubModal(false)}>
              {t("btn_back", "Back")}
            </Button>
            <Button type="submit" loading={submittingPayment} className="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              {t("btn_submit_receipt", "Submit Payment Receipt Proof")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Workspace Deletion Modal */}
      <Modal open={openDeleteModal} onClose={() => {
        setOpenDeleteModal(false);
        setDeleteConfirmationText("");
      }} title={t("Delete Organization Workspace")}>
        <form onSubmit={handleDeleteOrganization} className="flex flex-col gap-4 text-left">
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col gap-2">
            <span className="text-xs font-bold text-rose-900 leading-none">{t("Warning!")}</span>
            <p className="text-[11px] text-rose-700 font-semibold leading-normal">
              {t("This action is completely irreversible. All cooperative members register logs, shared documents, financial files, metrics database, and organization portal metadata will be instantly cleared and deleted forever.")}
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <label className="text-xs font-bold text-gray-700 leading-normal text-left">
              {t("To confirm deletion, please type 'DELETE' in the field below:")}
            </label>
            <input
              type="text"
              required
              placeholder="DELETE"
              className="w-full text-sm rounded-lg border bg-white border-gray-350 p-3 outline-none focus:ring-2 focus:ring-rose-500 font-extrabold text-rose-800"
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
            />
          </div>

          <div className="flex gap-3 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              className="w-1/2 cursor-pointer"
              onClick={() => {
                setOpenDeleteModal(false);
                setDeleteConfirmationText("");
              }}
            >
              {t("Cancel")}
            </Button>
            <Button
              type="submit"
              loading={deleteOrgMutation.isPending}
              className="w-1/2 bg-rose-600 hover:bg-rose-700 border-rose-600 text-white font-bold cursor-pointer"
            >
              {t("Delete Permanently")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Organization Authenticity Verification Modal */}
      {activeOrg && (
        <OrganizationVerificationModal
          open={openVerificationModal}
          onClose={() => setOpenVerificationModal(false)}
          org={activeOrg}
          members={members || []}
        />
      )}

      {/* Promoter & Referral Attribution Hub Modal */}
      <ReferralCenterModal
        open={openReferralModal}
        onClose={() => setOpenReferralModal(false)}
      />
    </div>
  );
};
