import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation, useSearchParams, Link } from "react-router-dom";
import { 
  Award, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Building, 
  Calendar, 
  ShieldCheck, 
  ExternalLink, 
  Copy, 
  Check, 
  ArrowLeft,
  QrCode,
  FileBadge,
  User,
  Share2,
  Lock,
  Download,
  Printer,
  Building2,
  MapPin,
  CheckCheck,
  FileText,
  Shield,
  Fingerprint,
  LogIn,
  UserPlus,
  ArrowRight,
  HelpCircle,
  Clock,
  Briefcase,
  Layers,
  ChevronRight,
  Smartphone
} from "lucide-react";
import { MockDB } from "../lib/mockData";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { Certificate, Organization, OrgMember } from "../types";
import { useToast } from "../components/Toast";
import { useAuthStore } from "../store/authStore";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export const CertificateVerifyPage: React.FC = () => {
  const { code: paramCode } = useParams<{ code?: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuthStore();

  const queryCode = searchParams.get("code") || searchParams.get("id") || searchParams.get("serial") || searchParams.get("org") || "";
  const initialCode = paramCode || queryCode || "";

  const [inputCode, setInputCode] = useState<string>(initialCode);
  const [activeCode, setActiveCode] = useState<string>(initialCode);
  const [filterType, setFilterType] = useState<"all" | "cert" | "org" | "member">("all");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // Result state
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [orgRegistrationVerification, setOrgRegistrationVerification] = useState<Organization | null>(null);
  const [memberRecord, setMemberRecord] = useState<OrgMember | null>(null);
  const [memberUser, setMemberUser] = useState<any | null>(null);

  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);
  const certCardRef = useRef<HTMLDivElement>(null);

  // Sync state if URL param or search query changes
  useEffect(() => {
    const code = paramCode || searchParams.get("code") || searchParams.get("org") || "";
    if (code) {
      setInputCode(code);
      setActiveCode(code);
      runVerification(code);
    }
  }, [paramCode, searchParams]);

  const runVerification = async (codeToVerify: string) => {
    const trimmed = codeToVerify.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setHasSearched(true);
    setActiveCode(trimmed);
    setCertificate(null);
    setOrg(null);
    setOrgRegistrationVerification(null);
    setMemberRecord(null);
    setMemberUser(null);

    try {
      let foundCert: Certificate | null = null;
      let matchedOrg: Organization | null = null;

      // Clean search tokens
      const normalized = trimmed.toLowerCase();
      const cleanSlug = normalized.replace(/^@/, "").replace(/^cert-2026-/, "");

      // ----------------------------------------------------
      // 1. Check if matching a Certificate in Supabase
      // ----------------------------------------------------
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("certificates")
            .select("*")
            .or(`certificate_code.ilike.${trimmed},id.ilike.${trimmed}`)
            .maybeSingle();

          if (data && !error) {
            foundCert = data as Certificate;
          }
        } catch (e) {
          console.warn("Supabase certificate query notice:", e);
        }
      }

      // ----------------------------------------------------
      // 2. Fallback: Check MockDB certificates
      // ----------------------------------------------------
      if (!foundCert) {
        const localCerts = MockDB.getCertificates();
        foundCert = localCerts.find(
          (c: any) =>
            (c.certificate_code && c.certificate_code.toLowerCase() === normalized) ||
            (c.id && c.id.toLowerCase() === normalized) ||
            (c.certificate_code && c.certificate_code.toLowerCase().includes(cleanSlug))
        ) || null;
      }

      // ----------------------------------------------------
      // 3. If certificate found, load issuing organization
      // ----------------------------------------------------
      if (foundCert) {
        setCertificate(foundCert);

        if (foundCert.org_id) {
          if (isSupabaseConfigured) {
            try {
              const { data: orgData } = await supabase
                .from("organizations")
                .select("*")
                .eq("id", foundCert.org_id)
                .maybeSingle();
              if (orgData) matchedOrg = orgData as Organization;
            } catch (e) {}
          }
          if (!matchedOrg) {
            const localOrgs = MockDB.getOrgs();
            matchedOrg = localOrgs.find((o) => o.id === foundCert?.org_id) || null;
          }
        }
        setOrg(matchedOrg);
      } else {
        // ----------------------------------------------------
        // 4. Check if searching by Organization Registration Number, Slug, or Org ID
        // ----------------------------------------------------
        let foundOrg: Organization | null = null;
        if (isSupabaseConfigured) {
          try {
            const { data: orgData } = await supabase
              .from("organizations")
              .select("*")
              .or(`slug.ilike.${cleanSlug},registration_number.ilike.${trimmed},name.ilike.${trimmed},id.ilike.${trimmed}`)
              .maybeSingle();
            if (orgData) foundOrg = orgData as Organization;
          } catch (e) {}
        }

        if (!foundOrg) {
          const allOrgs = MockDB.getOrgs();
          foundOrg =
            allOrgs.find(
              (o) =>
                (o.slug && o.slug.toLowerCase() === cleanSlug) ||
                (o.registration_number && o.registration_number.toLowerCase() === normalized) ||
                (o.id && o.id.toLowerCase() === normalized) ||
                (o.name && o.name.toLowerCase().replace(/\s+/g, "-") === cleanSlug) ||
                (o.name && o.name.toLowerCase() === normalized)
            ) || null;
        }

        if (foundOrg) {
          setOrgRegistrationVerification(foundOrg);
        } else {
          // ----------------------------------------------------
          // 5. Check if searching Member ID or badge serial
          // ----------------------------------------------------
          const allMembers = MockDB.getMembers();
          const foundMember = allMembers.find(
            (m) =>
              (m.id && m.id.toLowerCase() === normalized) ||
              (m.user_id && m.user_id.toLowerCase() === normalized)
          );
          if (foundMember) {
            setMemberRecord(foundMember);
            const parentOrg = MockDB.getOrgs().find((o) => o.id === foundMember.org_id);
            if (parentOrg) setOrg(parentOrg);

            const allUsers = MockDB.getUsers();
            const u = allUsers.find((u) => u.id === foundMember.user_id);
            if (u) setMemberUser(u);
          }
        }
      }
    } catch (err) {
      console.error("Verification engine failure:", err);
      addToast("Failed to complete digital verification lookup.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    navigate(`/verify?code=${encodeURIComponent(inputCode.trim())}`);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    addToast("Official verification link copied to clipboard!", "success");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadPdf = async () => {
    if (!certCardRef.current) return;
    setDownloadingPdf(true);
    try {
      const canvas = await html2canvas(certCardRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`verified-credential-${activeCode || "record"}.pdf`);
      addToast("Official Credential PDF downloaded!", "success");
    } catch (err) {
      console.error("PDF generation failed:", err);
      addToast("Could not generate PDF download.", "error");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* ========================================================
          IMPACTO BRANDED NAVBAR WITH SIGN IN & SIGN UP BUTTONS
          ======================================================== */}
      <header className="border-b border-gray-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-40 transition-colors shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo & Registry Label */}
          <a href="https://impacto-landing.vercel.app/" className="flex items-center gap-3 group focus:outline-none">
            {/* Impacto 3-circle Knot Brand Icon */}
            <div className="relative flex items-center justify-center">
              <svg className="h-8 w-8 text-emerald-600 dark:text-emerald-500 transition-transform group-hover:scale-105" viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="35" r="25" stroke="currentColor" strokeWidth="8" />
                <circle cx="35" cy="65" r="25" stroke="currentColor" strokeWidth="8" />
                <circle cx="65" cy="65" r="25" stroke="currentColor" strokeWidth="8" />
                <polygon points="53,48 47,48 50,42" fill="#F59E0B" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight font-display text-gray-950 dark:text-white leading-none">
                IMPACT<span className="text-emerald-600 dark:text-emerald-500">O</span>
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-700 dark:text-emerald-400 font-bold mt-0.5">
                Verification Registry
              </span>
            </div>
          </a>

          {/* Action Buttons: Sign In & Sign Up */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 text-xs font-bold text-gray-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 bg-gray-50 dark:bg-slate-800/80 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl transition shadow-3xs"
            >
              <LogIn className="h-3.5 w-3.5 text-gray-500 dark:text-slate-400" />
              <span>Sign In</span>
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl transition shadow-xs hover:shadow-emerald-600/20"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Sign Up</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ========================================================
          MAIN REGISTRY CONTENT AREA
          ======================================================== */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col items-center">
        {/* HERO INTRO SECTION */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/90 dark:bg-emerald-950/80 border border-emerald-300/80 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 text-xs font-bold mb-3 shadow-3xs">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Cryptographic Digital Credential Registry</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black font-display tracking-tight text-gray-950 dark:text-white">
            Verify Official Credentials
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 mt-2.5 leading-relaxed max-w-xl mx-auto">
            Instant authentication for cooperative certificates, member identification badges, and institutional registration accreditations across Rwanda.
          </p>
        </div>

        {/* SEARCH FORM */}
        <div className="w-full max-w-xl mb-8">
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className="relative flex items-center shadow-lg rounded-2xl bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-800 focus-within:border-emerald-600 dark:focus-within:border-emerald-500 transition-all p-1.5">
              <div className="pl-3.5 text-gray-400 dark:text-slate-500">
                <Search className="h-5 w-5" />
              </div>
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Enter token e.g. CERT-2026-COOP-8821, REG-2026-RW, @slug..."
                className="w-full text-xs sm:text-sm font-mono font-semibold px-3 py-2.5 bg-transparent border-0 outline-none text-gray-900 dark:text-white placeholder:text-gray-400 placeholder:font-sans"
              />
              {inputCode && (
                <button
                  type="button"
                  onClick={() => {
                    setInputCode("");
                    setHasSearched(false);
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 mr-1 rounded-lg text-xs"
                  title="Clear input"
                >
                  ✕
                </button>
              )}
              <button
                type="submit"
                disabled={isLoading || !inputCode.trim()}
                className="px-4 sm:px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer shrink-0 shadow-xs flex items-center gap-1.5"
              >
                {isLoading ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                <span>{isLoading ? "Verifying..." : "Verify Record"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* ========================================================
            VERIFICATION RESULT DISPLAY (Cards & States)
            ======================================================== */}
        {hasSearched ? (
          <div className="w-full max-w-2xl">
            {isLoading ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-10 text-center flex flex-col items-center shadow-xs">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent mb-3.5" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Validating Cryptographic Security Hash...
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 font-mono">
                  Cross-referencing digital ledger records & authorized cooperative signatures.
                </p>
              </div>
            ) : certificate ? (
              /* ========================================================
                 CASE 1: INDIVIDUAL CERTIFICATE VERIFICATION CARD
                 ======================================================== */
              <div
                ref={certCardRef}
                className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-emerald-500/60 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
              >
                {/* Official Verified Status Header */}
                <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 shadow-inner">
                      <CheckCircle2 className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider font-extrabold bg-white/20 px-2 py-0.5 rounded">
                          AUTHENTIC & VERIFIED
                        </span>
                        <span className="text-[10px] font-mono text-emerald-100 font-bold">
                          ID: {certificate.certificate_code}
                        </span>
                      </div>
                      <h2 className="text-base sm:text-lg font-black tracking-tight mt-0.5 font-display">
                        Official Registered Credential
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition"
                      title="Copy Share Link"
                    >
                      {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
                      <span>{copiedLink ? "Copied" : "Share"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      disabled={downloadingPdf}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-extrabold transition shadow-3xs"
                      title="Download PDF"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>{downloadingPdf ? "Saving..." : "PDF"}</span>
                    </button>
                  </div>
                </div>

                {/* Details Body */}
                <div className="p-6 sm:p-8 space-y-6">
                  {/* Conferred Recipient Area */}
                  <div className="border-b border-gray-100 dark:border-slate-800 pb-6 text-center sm:text-left">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-700 dark:text-emerald-400 font-bold block mb-1">
                      Conferred Recipient
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-serif font-black text-gray-950 dark:text-white">
                      {certificate.recipient_name}
                    </h3>
                    {certificate.recipient_email && (
                      <p className="text-xs text-gray-500 font-mono mt-0.5">
                        {certificate.recipient_email}
                      </p>
                    )}

                    {/* Certificate Title & Description Box */}
                    <div className="mt-4 p-5 rounded-2xl bg-stone-50 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80">
                      <span className="text-[10px] uppercase font-mono text-gray-400 font-bold block mb-1">
                        Certificate Title & Program
                      </span>
                      <h4 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                        {certificate.title}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-slate-300 mt-2 leading-relaxed italic">
                        "{certificate.description}"
                      </p>
                    </div>
                  </div>

                  {/* Issuing Organization Card */}
                  <div className="border-b border-gray-100 dark:border-slate-800 pb-6">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-gray-400 font-bold block mb-2">
                      Issuing Cooperative / Organization
                    </span>
                    <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-xs">
                          {org?.name ? org.name.substring(0, 1).toUpperCase() : <Building2 className="h-6 w-6" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                              {org?.name || "Impacto Cooperative Society"}
                            </h4>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              Verified Org
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {org?.org_category || "Agriculture & Economic Cooperative"} • {org?.province || "Rwanda"}
                          </p>
                        </div>
                      </div>

                      {org?.slug && (
                        <Link
                          to={`/@${org.slug}`}
                          className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-700 flex items-center gap-1.5 transition shrink-0 shadow-3xs"
                        >
                          <span>View Public Portal</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                    <div className="p-3.5 bg-gray-50 dark:bg-slate-800/40 rounded-xl border border-gray-200/60 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-mono text-gray-400 font-bold block">
                        Issue Date
                      </span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white block mt-0.5">
                        {certificate.issue_date}
                      </span>
                    </div>

                    <div className="p-3.5 bg-gray-50 dark:bg-slate-800/40 rounded-xl border border-gray-200/60 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-mono text-gray-400 font-bold block">
                        Status
                      </span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5 capitalize">
                        {certificate.status || "Active & Valid"}
                      </span>
                    </div>

                    <div className="p-3.5 bg-gray-50 dark:bg-slate-800/40 rounded-xl border border-gray-200/60 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-mono text-gray-400 font-bold block">
                        Authorized Signatory
                      </span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white block mt-0.5 truncate">
                        {certificate.signatory_name || "Executive Committee"}
                      </span>
                      <span className="text-[9px] text-gray-400 block truncate">
                        {certificate.signatory_title || "Cooperative President"}
                      </span>
                    </div>

                    <div className="p-3.5 bg-gray-50 dark:bg-slate-800/40 rounded-xl border border-gray-200/60 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-mono text-gray-400 font-bold block">
                        Serial Token
                      </span>
                      <span className="text-xs font-mono font-bold text-gray-900 dark:text-white block mt-0.5 truncate">
                        {certificate.certificate_code}
                      </span>
                    </div>
                  </div>

                  {/* Tamper-evident Seal Footer */}
                  <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500 border-t border-gray-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-emerald-600" />
                      <span>Tamper-evident record authenticated on Impacto Cloud Registry.</span>
                    </div>
                    <div className="text-[11px] font-mono text-gray-400">
                      Registered: {certificate.created_at ? new Date(certificate.created_at).toLocaleDateString() : certificate.issue_date}
                    </div>
                  </div>
                </div>
              </div>
            ) : orgRegistrationVerification ? (
              /* ========================================================
                 CASE 2: ORGANIZATION REGISTRATION VERIFICATION CARD
                 ======================================================== */
              <div
                ref={certCardRef}
                className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-emerald-500/60 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
              >
                <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 shadow-inner">
                      <Building2 className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider font-extrabold bg-white/20 px-2 py-0.5 rounded">
                        OFFICIAL ORGANIZATION REGISTRATION
                      </span>
                      <h2 className="text-base sm:text-lg font-black tracking-tight mt-0.5 font-display">
                        {orgRegistrationVerification.name}
                      </h2>
                    </div>
                  </div>

                  <Link
                    to={`/@${orgRegistrationVerification.slug}`}
                    className="px-3.5 py-1.5 rounded-xl bg-white text-emerald-800 font-extrabold text-xs shadow-3xs flex items-center gap-1.5"
                  >
                    <span>View Public Portal</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="p-6 sm:p-8 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200/60 dark:border-slate-700 flex flex-col gap-2">
                      <span className="text-[10px] uppercase font-mono text-gray-400 font-bold">
                        Registry Accreditation
                      </span>
                      <div className="flex justify-between py-1 border-b border-gray-200/60 dark:border-slate-700">
                        <span className="text-gray-500">Legal Registration:</span>
                        <span className="font-mono font-bold text-gray-900 dark:text-white">
                          {orgRegistrationVerification.registration_number || "REG-2026-RW"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-200/60 dark:border-slate-700">
                        <span className="text-gray-500">Founded Date:</span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {orgRegistrationVerification.founded_date || "2024"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-gray-500">Founders / Board:</span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {orgRegistrationVerification.founders || "Executive Committee"}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200/60 dark:border-slate-700 flex flex-col gap-2">
                      <span className="text-[10px] uppercase font-mono text-gray-400 font-bold">
                        Jurisdiction & Category
                      </span>
                      <div className="flex justify-between py-1 border-b border-gray-200/60 dark:border-slate-700">
                        <span className="text-gray-500">Country:</span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {orgRegistrationVerification.country || "Rwanda"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-200/60 dark:border-slate-700">
                        <span className="text-gray-500">Sector / District:</span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {orgRegistrationVerification.district || "Kigali"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-gray-500">Primary Sector:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {orgRegistrationVerification.org_category || "Social Action"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <span>
                      This organization holds an active verified accreditation and operates with digital governance transparency on Impacto.
                    </span>
                  </div>
                </div>
              </div>
            ) : memberRecord ? (
              /* ========================================================
                 CASE 3: MEMBER ID BADGE VERIFICATION CARD
                 ======================================================== */
              <div
                ref={certCardRef}
                className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-emerald-500/60 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-6 sm:p-8 flex flex-col gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-lg">
                    {memberUser?.full_name ? memberUser.full_name.charAt(0).toUpperCase() : <User className="h-6 w-6" />}
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      VERIFIED ACTIVE MEMBER
                    </span>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white mt-1">
                      {memberUser?.full_name || `Member ID: ${memberRecord.id}`}
                    </h3>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200/60 dark:border-slate-700 text-xs flex flex-col gap-2.5">
                  <div className="flex justify-between py-1 border-b border-gray-200/60 dark:border-slate-700">
                    <span className="text-gray-500">Cooperative Organization:</span>
                    <span className="font-bold text-gray-900 dark:text-white">{org?.name || "Cooperative Workspace"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-200/60 dark:border-slate-700">
                    <span className="text-gray-500">Member Role:</span>
                    <span className="font-bold uppercase text-emerald-600 dark:text-emerald-400">{memberRecord.role}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-200/60 dark:border-slate-700">
                    <span className="text-gray-500">Membership Status:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase">{memberRecord.status}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Joined Date:</span>
                    <span className="font-mono text-gray-900 dark:text-white">{new Date(memberRecord.joined_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              /* ========================================================
                 CASE 4: NOT FOUND / INVALID RECORD
                 ======================================================== */
              <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-rose-200 dark:border-rose-900/60 shadow-xl p-8 text-center animate-in fade-in duration-200">
                <div className="h-16 w-16 rounded-3xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
                  <XCircle className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-black font-display text-gray-900 dark:text-white">
                  Credential Record Not Found
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
                  No certificate, member badge, or organization registration matching <strong className="font-mono text-gray-800 dark:text-gray-200">"{inputCode}"</strong> could be verified on the registry.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setInputCode("");
                      setHasSearched(false);
                    }}
                    className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition"
                  >
                    Clear & Search Again
                  </button>
                  <Link
                    to="/login"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span>Sign In</span>
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-100 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <UserPlus className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Sign Up</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ========================================================
             DEFAULT LANDING STATE: REGISTRY TRUST PILLARS
             ======================================================== */
          <div className="w-full max-w-3xl mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 flex flex-col gap-2.5 shadow-xs">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Tamper-Proof Ledger
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                All issued credentials and certificates are sealed with cryptographic signatures that prevent forgery.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 flex flex-col gap-2.5 shadow-xs">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                <QrCode className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Instant QR Validation
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                Scan physical ID badges and certificate QR codes with any smartphone camera for sub-second verification.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 flex flex-col gap-2.5 shadow-xs">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                <Building2 className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Institutional Trust
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                Official accreditation registry for Rwandan cooperatives, social enterprises, and community initiatives.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================
          FOOTER WITH CLEAN REGISTRY NAVIGATION
          ======================================================== */}
      <footer className="border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-center text-xs text-gray-500 dark:text-slate-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-emerald-600" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="35" r="25" stroke="currentColor" strokeWidth="8" />
              <circle cx="35" cy="65" r="25" stroke="currentColor" strokeWidth="8" />
              <circle cx="65" cy="65" r="25" stroke="currentColor" strokeWidth="8" />
              <polygon points="53,48 47,48 50,42" fill="#F59E0B" />
            </svg>
            <p>© 2026 Impacto Digital Credential Registry. Republic of Rwanda.</p>
          </div>
          <div className="flex items-center gap-4 font-medium">
            <Link to="/login" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition">Sign In</Link>
            <Link to="/register" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition">Sign Up</Link>
            <Link to="/verify" className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline">Verify Credential</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CertificateVerifyPage;
