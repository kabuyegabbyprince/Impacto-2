import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation, Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Building2,
  Globe,
  MapPin,
  Calendar,
  Users,
  Award,
  Target,
  ShoppingBag,
  Megaphone,
  Phone,
  Mail,
  FileText,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Download,
  Share2,
  Heart,
  Shield,
  ShieldCheck,
  Lock,
  ArrowLeft,
  Search,
  MessageSquare,
  AlertCircle,
  QrCode,
  Copy,
  Check,
  Building,
  Hash,
  User,
  Clock,
  Briefcase,
  Image as ImageIcon,
  Maximize2,
  X,
  BookOpen,
  Smartphone,
  Send,
  Loader2,
  Receipt,
  PhoneCall,
  Store
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { MockDB } from "../lib/mockData";
import { Organization, Goal, NewsPost, MarketplaceProduct } from "../types";
import { useToast } from "../components/Toast";
import { useAuthStore } from "../store/authStore";
import { useOrgStore } from "../store/orgStore";
import { MoMoPushPaymentModal, MoMoPaymentSuccessData } from "../components/MoMoPushPaymentModal";
import { cleanMerchantCode, cleanPhoneNumber } from "../components/UssdPaymentHelper";
import { useCreateDonation } from "../hooks/useImpactoData";
import { resolveFileUrl } from "../lib/storageService";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * Bulletproof Safe Image Component
 * Resolves Supabase storage keys, local data URLs, or external links,
 * and falls back gracefully if the image fails to load.
 */
const SafeImage: React.FC<{
  src?: string;
  alt?: string;
  className?: string;
  fallbackContent?: React.ReactNode;
  bucketName?: string;
  onClick?: () => void;
}> = ({ src, alt, className = "", fallbackContent, bucketName = "avatars", onClick }) => {
  const [resolvedSrc, setResolvedSrc] = useState<string>("");
  const [hasError, setHasError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setHasError(false);
    if (!src || src.trim() === "" || src.startsWith("from-")) {
      setResolvedSrc("");
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    resolveFileUrl(src, bucketName)
      .then((url) => {
        if (active) {
          setResolvedSrc(url);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setHasError(true);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [src, bucketName]);

  if (!src || hasError || (!resolvedSrc && !loading)) {
    return fallbackContent ? (
      <>{fallbackContent}</>
    ) : (
      <div className={`bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-400 ${className}`}>
        <ImageIcon className="h-6 w-6 opacity-40" />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`} onClick={onClick}>
      {loading && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-slate-800 animate-pulse" />
      )}
      {resolvedSrc && (
        <img
          src={resolvedSrc}
          alt={alt || "Image"}
          onError={() => setHasError(true)}
          onLoad={() => setLoading(false)}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            loading ? "opacity-0" : "opacity-100"
          }`}
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  );
};

export const PublicOrgPage: React.FC = () => {
  const { t } = useTranslation();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuthStore();
  const { setActiveOrg } = useOrgStore();
  const createDonationMutation = useCreateDonation();

  // Extract clean slug from route parameters or path
  let rawSlug = params.slug || "";
  if (!rawSlug || rawSlug.startsWith("/")) {
    const segments = location.pathname.split("/").filter(Boolean);
    if (segments.length > 0) {
      rawSlug = segments[0];
      if ((rawSlug === "org" || rawSlug === "public") && segments.length > 1) {
        rawSlug = segments[1];
      }
    }
  }
  let targetSlug = "";
  try {
    targetSlug = decodeURIComponent(rawSlug).replace(/^@/, "").trim().toLowerCase();
  } catch {
    targetSlug = rawSlug.replace(/^@/, "").trim().toLowerCase();
  }

  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"about" | "goals" | "impact" | "news" | "marketplace">("about");

  // Related data
  const [goals, setGoals] = useState<Goal[]>([]);
  const [news, setNews] = useState<NewsPost[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [membersCount, setMembersCount] = useState<number>(0);

  // Gallery Lightbox Modal
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // MTN Push-to-Pay Support Modal
  const [momoModalOpen, setMomoModalOpen] = useState(false);
  const [momoSenderPhone, setMomoSenderPhone] = useState("");
  const [momoAmount, setMomoAmount] = useState("2000");
  const [momoSenderName, setMomoSenderName] = useState("");
  const [momoReason, setMomoReason] = useState("Support Contribution");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Product Inquiry Modal
  const [inquiryProduct, setInquiryProduct] = useState<any | null>(null);
  const [inquiryName, setInquiryName] = useState("");
  const [inquiryContact, setInquiryContact] = useState("");
  const [inquiryMsg, setInquiryMsg] = useState("");
  const [inquirySubmitting, setInquirySubmitting] = useState(false);
  const [inquirySuccess, setInquirySuccess] = useState(false);

  const pageDossierRef = useRef<HTMLDivElement>(null);

  // Load Organization by slug
  useEffect(() => {
    async function fetchOrg() {
      setLoading(true);
      try {
        let matchedOrg: Organization | null = null;

        // 1. Query Supabase if configured
        if (isSupabaseConfigured) {
          try {
            const { data, error } = await supabase
              .from("organizations")
              .select("*")
              .ilike("slug", targetSlug)
              .maybeSingle();

            if (data && !error) {
              matchedOrg = data as Organization;
            }
          } catch (err) {
            console.warn("Supabase public org lookup error, falling back to local DB:", err);
          }
        }

        // 2. Query MockDB if not found
        if (!matchedOrg) {
          const allOrgs = MockDB.getOrgs();
          matchedOrg =
            allOrgs.find(
              (o) =>
                (o.slug && o.slug.toLowerCase() === targetSlug) ||
                (o.id && o.id.toLowerCase() === targetSlug) ||
                (o.name && o.name.toLowerCase().replace(/\s+/g, "-") === targetSlug)
            ) || null;
        }

        // 3. Fallback: If still not found and targetSlug is generic e.g. "workspace" or "coop", pick first available
        if (!matchedOrg && (targetSlug === "workspace" || targetSlug === "default" || targetSlug === "")) {
          const allOrgs = MockDB.getOrgs();
          if (allOrgs.length > 0) {
            matchedOrg = allOrgs[0];
          }
        }

        setOrg(matchedOrg);

        if (matchedOrg) {
          // Fetch related goals
          if (isSupabaseConfigured) {
            try {
              const { data: gData } = await supabase
                .from("goals")
                .select("*")
                .eq("org_id", matchedOrg.id);
              if (gData) setGoals(gData as Goal[]);

              const { data: nData } = await supabase
                .from("news_posts")
                .select("*")
                .eq("org_id", matchedOrg.id);
              if (nData) setNews(nData as NewsPost[]);

              const { data: pData } = await supabase
                .from("marketplace_products")
                .select("*")
                .eq("org_id", matchedOrg.id);
              if (pData) setProducts(pData);

              const { count } = await supabase
                .from("org_members")
                .select("*", { count: "exact", head: true })
                .eq("org_id", matchedOrg.id)
                .eq("status", "active");
              setMembersCount(count || 12);
            } catch (e) {
              console.warn("Supabase related data fallback:", e);
            }
          } else {
            const mGoals = MockDB.getGoals().filter((g) => g.org_id === matchedOrg?.id);
            setGoals(mGoals);

            const mNews = MockDB.getNews().filter((n) => n.org_id === matchedOrg?.id);
            setNews(mNews);

            const mProducts = MockDB.getMarketplaceProducts().filter((p) => p.org_id === matchedOrg?.id);
            setProducts(mProducts);

            const mMembers = MockDB.getMembers().filter((m) => m.org_id === matchedOrg?.id && m.status === "active");
            setMembersCount(mMembers.length || 18);
          }
        }
      } catch (err) {
        console.error("Failed to load public organization:", err);
      } finally {
        setLoading(false);
      }
    }

    if (targetSlug) {
      fetchOrg();
    } else {
      setLoading(false);
    }
  }, [targetSlug]);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    addToast(`${field} copied to clipboard!`, "success");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: org?.name || "Impacto Public Profile",
        text: org?.tagline || `Discover ${org?.name} on Impacto Platform.`,
        url,
      });
    } else {
      handleCopy(url, "Public link");
    }
  };

  /**
   * Navigate to registration with this organization preselected
   */
  const handleJoinOrganization = () => {
    if (!org) return;
    navigate(`/register?org_id=${org.id}&mode=participant`);
  };

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org || !inquiryProduct) return;
    if (!inquiryName.trim() || !inquiryContact.trim()) {
      addToast("Please enter your name and contact info.", "warning");
      return;
    }

    setInquirySubmitting(true);
    try {
      const newLead = {
        id: `lead-${Date.now()}`,
        product_id: inquiryProduct.id,
        org_id: org.id,
        visitor_name: inquiryName,
        visitor_contact: inquiryContact,
        message: inquiryMsg || `Public inquiry for "${inquiryProduct.title}"`,
        created_at: new Date().toISOString(),
      };

      if (!isSupabaseConfigured) {
        const leads = MockDB.getMarketplaceLeads();
        MockDB.saveMarketplaceLeads([newLead, ...leads]);
      } else {
        await supabase.from("marketplace_leads").insert(newLead);
      }

      setInquirySuccess(true);
      addToast("Your inquiry has been sent to the cooperative coordinator!", "success");
    } catch (err: any) {
      console.error(err);
      addToast("Failed to submit inquiry.", "error");
    } finally {
      setInquirySubmitting(false);
    }
  };

  const primaryColor = org?.primary_color || "#156c45";
  const secondaryColor = org?.secondary_color || "#f59e0b";

  // Gallery URLs list
  const rawGallery = org?.gallery_urls && org.gallery_urls.length > 0 ? org.gallery_urls : [];

  // Payment credentials configured by organization
  const donationMCode = cleanMerchantCode(org?.momo_merchant_code || "");
  const donationPhone = cleanPhoneNumber(org?.donation_mtn_number || org?.dues_mtn_number || "");
  const codeUssd = donationMCode ? `*182*8*1*${donationMCode}#` : "";
  const phoneUssd = donationPhone ? `*182*1*1*${donationPhone}#` : "";

  const adminMomoCode = org?.momo_merchant_code || donationMCode;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center shadow-xs animate-pulse">
            <Globe className="h-7 w-7 text-emerald-600 dark:text-emerald-400 animate-spin-slow" />
          </div>
          <div className="text-center">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Resolving Public Organization Portal...
            </h3>
            <p className="text-xs text-gray-500 font-mono mt-1">/@{targetSlug || "workspace"}</p>
          </div>
        </div>
      </div>
    );
  }

  // Not Found View
  if (!org) {
    const allOrgs = MockDB.getOrgs();
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-sm">
          <div className="h-16 w-16 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto mb-4 text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white font-display">
            Organization Not Found
          </h1>
          <p className="text-xs text-gray-500 mt-2">
            No public organization matching <span className="font-mono font-bold text-emerald-600">/@{targetSlug}</span> exists on the platform.
          </p>

          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-800 flex flex-col gap-3">
            <div className="text-left">
              <span className="text-[11px] font-mono uppercase text-gray-400 font-bold">Discover Active Cooperatives:</span>
              <div className="flex flex-col gap-2 mt-2">
                {allOrgs.slice(0, 3).map((o) => (
                  <Link
                    key={o.id}
                    to={`/@${o.slug}`}
                    className="p-3 bg-gray-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-gray-200/60 dark:border-slate-700/60 rounded-xl flex items-center justify-between text-xs font-bold text-gray-800 dark:text-white transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 className="h-4 w-4 text-emerald-600" />
                      <span>{o.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400">/@{o.slug}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <a
                href="https://impacto-landing.vercel.app/"
                className="py-2.5 px-3.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 font-bold text-xs rounded-xl text-center flex items-center justify-center gap-1.5 transition"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Home
              </a>
              <Link
                to="/login"
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs text-center"
              >
                Sign In to Workspace
              </Link>
              <Link
                to="/verify"
                className="py-2.5 px-3.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 font-bold text-xs rounded-xl text-center"
              >
                Verify Badges
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Cover image / gradient logic
  const isGradientCover = org.cover_url && (org.cover_url.startsWith("from-") || org.cover_url.includes("gradient"));

  return (
    <div className="min-h-screen bg-[#F4F6F8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Dossier Container for Screenshot/PDF */}
      <div ref={pageDossierRef} className="flex-1 flex flex-col">
        {/* ========================================================
            HERO COVER BANNER AREA (Clean, Single Top-Left Home Pill)
            ======================================================== */}
        <div className="relative w-full h-64 sm:h-80 md:h-96 overflow-hidden bg-slate-900 select-none">
          {/* Top Left Floating Home Button */}
          <div className="absolute top-4 left-4 sm:top-6 sm:left-8 z-30">
            <a
              href="https://impacto-landing.vercel.app/"
              className="px-3.5 py-1.5 rounded-full bg-white/30 hover:bg-white/40 dark:bg-black/40 dark:hover:bg-black/60 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5 border border-white/30 shadow-xs transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Home</span>
            </a>
          </div>

          {/* Render Cover: Either Image or Smooth Atmospheric Gradient */}
          {org.cover_url && !isGradientCover ? (
            <SafeImage
              src={org.cover_url}
              alt={`${org.name} Cover`}
              className="w-full h-full object-cover"
              bucketName="avatars"
              fallbackContent={
                <div
                  className="w-full h-full bg-gradient-to-b from-slate-400 via-slate-600 to-slate-800"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}dd 0%, #1e293b 100%)`,
                  }}
                />
              }
            />
          ) : isGradientCover ? (
            <div className={`w-full h-full bg-gradient-to-tr ${org.cover_url}`} />
          ) : (
            <div
              className="w-full h-full bg-gradient-to-b from-slate-300 via-slate-500 to-slate-700"
              style={{
                background: `linear-gradient(160deg, #64748b 0%, #334155 50%, #0f172a 100%)`,
              }}
            />
          )}

          {/* Soft vignette overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />
        </div>

        {/* ========================================================
            FLOATING IDENTITY ISLAND (Logo + Name + Actions)
            ======================================================== */}
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 -mt-16 sm:-mt-20">
            {/* Left side: Logo + Name & Tagline Box */}
            <div className="flex flex-wrap sm:flex-nowrap items-end gap-3 sm:gap-4">
              {/* Logo Card */}
              <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-3xl bg-white dark:bg-slate-900 border-4 border-white dark:border-slate-900 shadow-xl flex items-center justify-center overflow-hidden shrink-0">
                {org.logo_url ? (
                  <SafeImage
                    src={org.logo_url}
                    alt={org.name}
                    className="w-full h-full object-contain p-2"
                    bucketName="avatars"
                    fallbackContent={
                      <div
                        className="w-full h-full bg-gradient-to-br from-green-600 via-emerald-600 to-amber-500 flex items-center justify-center text-white font-extrabold text-4xl sm:text-5xl shadow-inner font-display"
                      >
                        {org.name.substring(0, 1).toUpperCase()}
                      </div>
                    }
                  />
                ) : (
                  <div
                    className="w-full h-full bg-gradient-to-br from-green-600 via-emerald-600 to-amber-500 flex items-center justify-center text-white font-extrabold text-4xl sm:text-5xl shadow-inner font-display"
                  >
                    {org.name.substring(0, 1).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Name & Tagline Pill Card */}
              <div className="bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl px-5 sm:px-6 py-3.5 sm:py-4 shadow-sm min-w-[200px] flex flex-col justify-center">
                <h1 className="text-xl sm:text-2xl font-black font-display text-gray-950 dark:text-white tracking-tight leading-tight">
                  {org.name}
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 font-medium mt-0.5 max-w-md">
                  {org.tagline || org.description || "Civic organization & cooperative workspace"}
                </p>
              </div>
            </div>

            {/* Right side: Action Buttons Island (Clean: Share + Join Organization) */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-2xl p-1.5 sm:p-2 shadow-sm flex items-center gap-2 shrink-0 self-start md:self-end">
              <button
                onClick={handleShare}
                className="px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5"
                title="Share public showcase link"
              >
                <Share2 className="h-4 w-4" />
                <span>Share</span>
              </button>

              {org.allow_public_joining !== false && (
                <button
                  onClick={handleJoinOrganization}
                  className="px-5 py-2.5 rounded-xl bg-[#00875A] hover:bg-[#00704A] text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                  title={`Sign up and join ${org.name}`}
                >
                  <Users className="h-4 w-4" />
                  <span>Join Organization</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================
            HORIZONTAL TAB NAVIGATION (Underneath Banner)
            ======================================================== */}
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <div className="flex items-center gap-6 sm:gap-8 border-b border-gray-200 dark:border-slate-800 overflow-x-auto no-scrollbar select-none">
            <button
              onClick={() => setActiveTab("about")}
              className={`pb-3 text-sm font-bold transition-all relative ${
                activeTab === "about"
                  ? "text-emerald-700 dark:text-emerald-400 font-extrabold"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 font-medium"
              }`}
            >
              About
              {activeTab === "about" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("goals")}
              className={`pb-3 text-sm font-bold transition-all relative ${
                activeTab === "goals"
                  ? "text-emerald-700 dark:text-emerald-400 font-extrabold"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 font-medium"
              }`}
            >
              Goals
              {activeTab === "goals" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("impact")}
              className={`pb-3 text-sm font-bold transition-all relative ${
                activeTab === "impact"
                  ? "text-emerald-700 dark:text-emerald-400 font-extrabold"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 font-medium"
              }`}
            >
              Impact Log
              {activeTab === "impact" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("news")}
              className={`pb-3 text-sm font-bold transition-all relative ${
                activeTab === "news"
                  ? "text-emerald-700 dark:text-emerald-400 font-extrabold"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 font-medium"
              }`}
            >
              News Feed
              {activeTab === "news" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("marketplace")}
              className={`pb-3 text-sm font-bold transition-all relative ${
                activeTab === "marketplace"
                  ? "text-emerald-700 dark:text-emerald-400 font-extrabold"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 font-medium"
              }`}
            >
              Marketplace
              {activeTab === "marketplace" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* ========================================================
            MAIN 2-COLUMN CONTENT GRID (Matches Design Layout)
            ======================================================== */}
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* ==========================================
                LEFT COLUMN (Main Content Area / 65% width)
                ========================================== */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* TAB 1: ABOUT */}
              {activeTab === "about" && (
                <>
                  {/* Card: About Our Organization */}
                  <div className="bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col gap-3">
                    <h2 className="text-base sm:text-lg font-extrabold font-display text-gray-950 dark:text-white">
                      About Our Organization
                    </h2>
                    <p className="text-xs sm:text-sm leading-relaxed text-gray-700 dark:text-slate-300 whitespace-pre-line">
                      {org.description ||
                        org.tagline ||
                        `${org.name} is a verified community organization and cooperative society organized to foster shared socio-economic resilience, transparent governance, and sustainable impact.`}
                    </p>

                    {(org.mission || org.vision) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                        {org.mission && (
                          <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
                            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                              <Target className="h-3.5 w-3.5" /> Our Mission
                            </span>
                            <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
                              {org.mission}
                            </p>
                          </div>
                        )}
                        {org.vision && (
                          <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
                            <span className="text-xs font-bold text-amber-600 flex items-center gap-1.5">
                              <Target className="h-3.5 w-3.5" /> Our Vision
                            </span>
                            <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
                              {org.vision}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card: Organizational Gallery */}
                  <div className="bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base sm:text-lg font-extrabold font-display text-gray-950 dark:text-white">
                        Organizational Gallery
                      </h2>
                      {rawGallery.length > 0 && (
                        <span className="text-[11px] font-mono text-gray-400">
                          {rawGallery.length} {rawGallery.length === 1 ? "Photo" : "Photos"}
                        </span>
                      )}
                    </div>

                    {rawGallery.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {rawGallery.map((imgUrl, idx) => (
                          <div
                            key={idx}
                            onClick={() => setLightboxIndex(idx)}
                            className="group relative h-48 sm:h-56 rounded-2xl overflow-hidden border border-gray-200/70 dark:border-slate-800 bg-gray-100 dark:bg-slate-800 cursor-pointer shadow-xs"
                          >
                            <SafeImage
                              src={imgUrl}
                              alt={`Gallery photo ${idx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              bucketName="avatars"
                              fallbackContent={
                                <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                                  <ImageIcon className="h-8 w-8 mb-1.5 opacity-40 text-emerald-600" />
                                  <span className="text-xs font-bold text-gray-600 dark:text-slate-400">
                                    Community Activity #{idx + 1}
                                  </span>
                                </div>
                              }
                            />
                            {/* Hover overlay icon */}
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Maximize2 className="h-6 w-6 drop-shadow-md" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Clean Showcase Preview when no gallery uploaded yet */
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="h-44 sm:h-48 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/40 p-5 flex flex-col items-center justify-center text-center">
                          <Building2 className="h-8 w-8 text-emerald-600 mb-2 opacity-60" />
                          <h4 className="text-xs font-bold text-gray-800 dark:text-white">Community Assembly</h4>
                          <p className="text-[11px] text-gray-500 mt-1 max-w-[200px]">
                            General assemblies, strategic discussions, and cooperative planning sessions.
                          </p>
                        </div>
                        <div className="h-44 sm:h-48 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/40 p-5 flex flex-col items-center justify-center text-center">
                          <Target className="h-8 w-8 text-amber-500 mb-2 opacity-60" />
                          <h4 className="text-xs font-bold text-gray-800 dark:text-white">Field Operations & Outreach</h4>
                          <p className="text-[11px] text-gray-500 mt-1 max-w-[200px]">
                            Verified community milestones, shared equipment, and agricultural outputs.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* TAB 2: GOALS */}
              {activeTab === "goals" && (
                <div className="bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col gap-6">
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
                    <div>
                      <h2 className="text-base sm:text-lg font-extrabold font-display text-gray-950 dark:text-white">
                        Organization Goals & Targets
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Strategic milestones, sustainability objectives, and verified progress.
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-mono text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                      {goals.length} Goals
                    </span>
                  </div>

                  {goals.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <Target className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p className="text-xs font-medium">No public goals registered yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {goals.map((goal) => {
                        const percent = Math.min(
                          100,
                          Math.round(((goal.current_value || 0) / (goal.target_value || 1)) * 100)
                        );
                        const isDone = goal.status === "completed" || percent >= 100;

                        return (
                          <div
                            key={goal.id}
                            className="p-5 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200/60 dark:border-slate-700/60 flex flex-col justify-between gap-4"
                          >
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between">
                                <span
                                  className={`text-[10px] font-mono uppercase font-black px-2 py-0.5 rounded-full ${
                                    isDone
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                      : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                  }`}
                                >
                                  {isDone ? "Achieved Milestone" : "In Progress"}
                                </span>
                                <span className="font-mono text-xs font-black text-gray-900 dark:text-white">
                                  {goal.current_value} / {goal.target_value} {goal.unit || "Units"}
                                </span>
                              </div>
                              <h4 className="text-sm font-bold text-gray-900 dark:text-white mt-1">{goal.title}</h4>
                              {goal.description && (
                                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{goal.description}</p>
                              )}
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <div className="flex justify-between text-[11px] font-mono text-gray-400 font-bold">
                                <span>Progress</span>
                                <span className="text-emerald-600">{percent}%</span>
                              </div>
                              <div className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  style={{ width: `${percent}%`, backgroundColor: primaryColor }}
                                  className="h-full rounded-full transition-all"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: IMPACT LOG */}
              {activeTab === "impact" && (
                <div className="bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col gap-6">
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
                    <div>
                      <h2 className="text-base sm:text-lg font-extrabold font-display text-gray-950 dark:text-white">
                        Verified Impact Registry
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Documented community outputs, workshop attendance, and physical project deployments.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                      <span className="text-[10px] font-mono uppercase text-emerald-800 dark:text-emerald-300 font-bold">
                        Verified Members
                      </span>
                      <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
                        {membersCount}+
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                      <span className="text-[10px] font-mono uppercase text-blue-800 dark:text-blue-300 font-bold">
                        Goals Achieved
                      </span>
                      <p className="text-2xl font-black text-blue-700 dark:text-blue-300 mt-1">
                        {goals.filter((g) => g.status === "completed").length}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                      <span className="text-[10px] font-mono uppercase text-amber-800 dark:text-amber-300 font-bold">
                        Digital Seal
                      </span>
                      <p className="text-sm font-mono font-bold text-amber-700 dark:text-amber-300 mt-2">
                        SECURE-BLOCK-2026
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200/60 dark:border-slate-700/60 flex flex-col gap-2">
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" /> Transparent Governance Guarantee
                    </h4>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      All activities, meeting minutes, and financial resolutions published on this public ledger are authenticated against verified membership rolls and digital signatures.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 4: NEWS FEED */}
              {activeTab === "news" && (
                <div className="bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col gap-6">
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
                    <div>
                      <h2 className="text-base sm:text-lg font-extrabold font-display text-gray-950 dark:text-white">
                        Official News & Bulletins
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Latest announcements, resolutions, and community updates.
                      </p>
                    </div>
                  </div>

                  {news.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <Megaphone className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p className="text-xs font-medium">No bulletins published yet.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {news.map((item) => (
                        <div
                          key={item.id}
                          className="p-5 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200/60 dark:border-slate-700/60 flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
                            <span className="font-bold text-emerald-600">OFFICIAL DISPATCH</span>
                            <span>{new Date(item.created_at).toLocaleDateString()}</span>
                          </div>
                          <h3 className="text-sm font-bold text-gray-900 dark:text-white">{item.title}</h3>
                          <p className="text-xs leading-relaxed text-gray-600 dark:text-slate-300 whitespace-pre-line">
                            {item.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: MARKETPLACE */}
              {activeTab === "marketplace" && (
                <div className="bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col gap-6">
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
                    <div>
                      <h2 className="text-base sm:text-lg font-extrabold font-display text-gray-950 dark:text-white">
                        Marketplace & Member Products
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Browse handcrafted goods, yields, and services directly from cooperative members.
                      </p>
                    </div>
                  </div>

                  {products.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <ShoppingBag className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p className="text-xs font-medium">No marketplace products listed yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {products.map((item) => (
                        <div
                          key={item.id}
                          className="bg-gray-50 dark:bg-slate-800/60 border border-gray-200/60 dark:border-slate-700/60 rounded-xl overflow-hidden flex flex-col justify-between hover:shadow-md transition"
                        >
                          {item.image_url ? (
                            <SafeImage
                              src={item.image_url}
                              alt={item.title}
                              className="h-40 w-full object-cover"
                              bucketName="chat-attachments"
                              fallbackContent={
                                <div className="h-40 w-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600">
                                  <ShoppingBag className="h-8 w-8 opacity-60" />
                                </div>
                              }
                            />
                          ) : (
                            <div className="h-40 w-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600">
                              <ShoppingBag className="h-8 w-8 opacity-60" />
                            </div>
                          )}

                          <div className="p-4 flex flex-col gap-2 flex-1 justify-between">
                            <div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-white dark:bg-slate-700 text-gray-600 dark:text-slate-300 border border-gray-200/60 dark:border-slate-600">
                                  {item.category || "Product"}
                                </span>
                                <span className="text-xs font-mono font-black text-emerald-600">
                                  {Number(item.price || 0).toLocaleString()} {item.currency || "RWF"}
                                </span>
                              </div>
                              <h4 className="text-sm font-bold text-gray-900 dark:text-white mt-1.5">{item.title}</h4>
                              <p className="text-xs text-gray-500 line-clamp-2 mt-1">{item.description}</p>
                            </div>

                            <div className="mt-3 pt-3 border-t border-gray-200/60 dark:border-slate-700 flex items-center justify-between">
                              <span className="text-[10px] text-gray-400 font-mono">
                                Stock: {item.stock_quantity ?? "Available"}
                              </span>
                              <button
                                onClick={() => {
                                  setInquiryProduct(item);
                                  setInquirySuccess(false);
                                }}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                              >
                                Inquire / Order
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ==========================================
                RIGHT COLUMN (Quick Info & MoMo / 35% width)
                ========================================== */}
            <div className="flex flex-col gap-6">
              {/* Card 1: Quick Info (Single Official Verification Link) */}
              <div className="bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col gap-4">
                <h3 className="text-base font-extrabold font-display text-gray-950 dark:text-white">
                  Quick Info
                </h3>

                <div className="flex flex-col gap-3 text-xs text-gray-700 dark:text-slate-300">
                  {/* Category */}
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {org.org_category || "Social Action"}
                    </span>
                  </div>

                  {/* Location */}
                  <div className="flex items-center gap-2.5">
                    <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      {org.location_name ||
                        (org.district ? `${org.district}, ${org.country || "Rwanda"}` : "Kigali, Rwanda")}
                    </span>
                  </div>

                  {/* Public Slug URL */}
                  <div className="flex items-center gap-2.5">
                    <Globe className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span
                      onClick={() => handleCopy(window.location.href, "Public URL")}
                      className="font-mono text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                      title="Click to copy public portal link"
                    >
                      impact-o.app/@{org.slug}
                    </span>
                  </div>
                </div>

                {/* Contact Us Subsection */}
                <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex flex-col gap-1">
                  <span className="text-xs font-bold text-gray-900 dark:text-white">Contact Us:</span>
                  <p className="text-xs text-gray-600 dark:text-slate-400 break-words font-medium">
                    {org.contact_us ||
                      (org.donation_mtn_number
                        ? `contact@ourorganization.org / +250 ${org.donation_mtn_number}`
                        : "contact@ourorganization.org / +250 788 123 456")}
                  </p>
                </div>

                {/* THE SINGLE OFFICIAL VERIFICATION LINK ON THIS PAGE */}
                <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span>Official Verification</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      ACTIVE
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    Verify official certificates, member ID badges, and compliance seals issued by {org.name}.
                  </p>
                  <Link
                    to={`/verify?code=${org.registration_number || "CERT-2026-" + org.slug}`}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-300 dark:border-emerald-700 flex items-center justify-center gap-2 transition shadow-3xs"
                  >
                    <Award className="h-4 w-4 text-emerald-600" />
                    <span>Verify Badge & Certificate</span>
                  </Link>
                </div>
              </div>

              {/* Card 2: Community Support & Donations */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4 text-slate-900 dark:text-slate-100">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                    <Heart className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold font-display text-slate-900 dark:text-white">
                      Community Support and Contributions
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      Voluntary Mobile Money contributions for {org.name}. Give any amount to support cooperative initiatives.
                    </p>
                  </div>
                </div>

                {/* Direct USSD Payment Code and Phone to Pay */}
                {(codeUssd || phoneUssd) && (
                  <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                    {/* Option 1: MoMo Pay Merchant Code */}
                    {codeUssd ? (
                      <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex flex-col justify-between gap-2.5">
                        <div>
                          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                            <span className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                              <Store className="h-3.5 w-3.5 text-slate-500" /> Merchant Code
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(donationMCode, "Merchant Code")}
                              className="font-mono text-xs text-slate-700 dark:text-slate-300 hover:text-emerald-600 cursor-pointer"
                              title="Click to copy code"
                            >
                              {copiedField === "Merchant Code" ? "Copied" : donationMCode}
                            </button>
                          </div>
                          <div className="font-mono text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 select-all">
                            <span>{codeUssd}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => handleCopy(codeUssd, "Merchant USSD Code")}
                            className="flex-1 py-1.5 px-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            {copiedField === "Merchant USSD Code" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                            <span>{copiedField === "Merchant USSD Code" ? "Copied" : "Copy USSD"}</span>
                          </button>
                          <a
                            href={`tel:${encodeURIComponent(codeUssd)}`}
                            className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Smartphone className="h-3.5 w-3.5" />
                            <span>Dial</span>
                          </a>
                        </div>
                      </div>
                    ) : null}

                    {/* Option 2: Pay to Phone Number */}
                    {phoneUssd ? (
                      <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex flex-col justify-between gap-2.5">
                        <div>
                          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                            <span className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                              <PhoneCall className="h-3.5 w-3.5 text-slate-500" /> Phone Number
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(donationPhone, "Phone Number")}
                              className="font-mono text-xs text-slate-700 dark:text-slate-300 hover:text-emerald-600 cursor-pointer"
                              title="Click to copy phone number"
                            >
                              {copiedField === "Phone Number" ? "Copied" : donationPhone}
                            </button>
                          </div>
                          <div className="font-mono text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 select-all">
                            <span>{phoneUssd}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => handleCopy(phoneUssd, "Phone USSD Code")}
                            className="flex-1 py-1.5 px-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            {copiedField === "Phone USSD Code" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                            <span>{copiedField === "Phone USSD Code" ? "Copied" : "Copy USSD"}</span>
                          </button>
                          <a
                            href={`tel:${encodeURIComponent(phoneUssd)}`}
                            className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Smartphone className="h-3.5 w-3.5" />
                            <span>Dial</span>
                          </a>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Voluntary contribution: Dial either code and enter your chosen contribution amount when prompted by MTN Mobile Money.
                </p>

                <button
                  onClick={() => {
                    setMomoModalOpen(true);
                  }}
                  className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-medium text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Smartphone className="h-4 w-4" />
                  <span>Send Direct SIM Payment Prompt</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-auto border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 px-4 text-center text-xs text-gray-400">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 font-display font-extrabold text-gray-900 dark:text-white">
              <span>{org.name}</span>
              <span className="text-gray-300 dark:text-slate-700">•</span>
              <span className="text-emerald-600 font-mono text-[11px]">/@{org.slug}</span>
            </div>

            <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
              <a href="https://impacto-landing.vercel.app/" className="hover:text-emerald-600 transition">
                Home
              </a>
              <Link to={`/verify?code=${org.registration_number || "CERT-2026-" + org.slug}`} className="hover:text-emerald-600 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Verify Badges
              </Link>
              <Link to="/login" className="hover:text-emerald-600 flex items-center gap-1">
                <Lock className="h-3.5 w-3.5" /> Staff Portal
              </Link>
            </div>

            <p className="text-[11px] font-mono">
              Powered by <a href="https://impacto-landing.vercel.app/" className="hover:underline text-emerald-600 dark:text-emerald-400">Impacto Cooperative Platform</a>
            </p>
          </div>
        </footer>
      </div>

      {/* ========================================================
          MODAL: LIGHTBOX FULL IMAGE VIEW
          ======================================================== */}
      {lightboxIndex !== null && rawGallery[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setLightboxIndex(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxIndex(null)}
              className="absolute -top-12 right-0 p-2 rounded-full bg-white/20 text-white hover:bg-white/40 transition"
              title="Close"
            >
              <X className="h-6 w-6" />
            </button>
            <SafeImage
              src={rawGallery[lightboxIndex]}
              alt={`Gallery Full View ${lightboxIndex + 1}`}
              className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl"
              bucketName="avatars"
            />
            <div className="mt-3 text-white text-xs font-mono">
              Image {lightboxIndex + 1} of {rawGallery.length}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: MTN/AIRTEL PUSH-TO-PAY DONATION CHECKOUT
          ======================================================== */}
      <MoMoPushPaymentModal
        isOpen={momoModalOpen}
        onClose={() => setMomoModalOpen(false)}
        title={`Support ${org.name} via Mobile Money Push`}
        description="Enter your phone number to receive an instant USSD authorization push prompt on your phone screen."
        amountRwf={Number(momoAmount || 2000)}
        orgId={org.id}
        defaultPayerName={momoSenderName}
        defaultPayerPhone={momoSenderPhone}
        itemType="donation"
        itemName={`Donation to ${org.name}`}
        recipientName={org.donation_account_name || org.name}
        recipientMerchantCode={donationMCode}
        recipientMtnNumber={donationPhone}
        recipientAirtelNumber={org.donation_airtel_number || org.dues_airtel_number || ""}
        onSuccess={async (data: MoMoPaymentSuccessData) => {
          try {
            await createDonationMutation.mutateAsync({
              org_id: org.id,
              amount: Number(momoAmount || 2000),
              donor_name: momoSenderName || "Anonymous Supporter",
              donor_email: "",
              message: momoReason || "Public portal contribution",
              payment_method: data.provider?.includes("AIRTEL") ? "airtel" : "mtn",
              proof_url: data.providerTransactionId || data.depositId,
            });
            addToast(`Contribution of ${Number(momoAmount || 2000).toLocaleString()} RWF successfully recorded for ${org.name}!`, "success");
            setMomoModalOpen(false);
          } catch (err: any) {
            console.error("Failed to save donation record:", err);
            addToast("Payment authorized by telecom, but saving record failed: " + err.message, "warning");
          }
        }}
      />

      {/* ========================================================
          MODAL: PRODUCT INQUIRY
          ======================================================== */}
      {inquiryProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold font-display text-gray-900 dark:text-white">
                  Inquire: {inquiryProduct.title}
                </h3>
              </div>
              <button
                onClick={() => setInquiryProduct(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {inquirySuccess ? (
              <div className="text-center py-6 flex flex-col items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Check className="h-6 w-6 stroke-[3]" />
                </div>
                <h4 className="text-base font-extrabold text-gray-900 dark:text-white">
                  Inquiry Sent!
                </h4>
                <p className="text-xs text-gray-500">
                  The cooperative coordinator will reach out to you directly regarding this product.
                </p>
                <button
                  onClick={() => setInquiryProduct(null)}
                  className="w-full mt-3 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleInquirySubmit} className="flex flex-col gap-3.5 text-xs">
                <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl flex items-center justify-between font-mono">
                  <span className="text-gray-500">Unit Price:</span>
                  <span className="font-bold text-emerald-600">
                    {Number(inquiryProduct.price || 0).toLocaleString()} {inquiryProduct.currency || "RWF"}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-gray-700 dark:text-slate-300">Your Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jean Pierre"
                    value={inquiryName}
                    onChange={(e) => setInquiryName(e.target.value)}
                    className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-gray-700 dark:text-slate-300">Phone or WhatsApp *</label>
                  <input
                    type="text"
                    required
                    placeholder="+250 788 123 456"
                    value={inquiryContact}
                    onChange={(e) => setInquiryContact(e.target.value)}
                    className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-gray-700 dark:text-slate-300">Quantity / Message</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. I would like to purchase 50 kg..."
                    value={inquiryMsg}
                    onChange={(e) => setInquiryMsg(e.target.value)}
                    className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setInquiryProduct(null)}
                    className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inquirySubmitting}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                  >
                    {inquirySubmitting ? "Sending..." : "Send Inquiry"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicOrgPage;
