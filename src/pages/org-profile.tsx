import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useOrgStore } from "../store/orgStore";
import { useAuthStore } from "../store/authStore";
import { useToast } from "../components/Toast";
import { Card, Button, Input } from "../components/ui";
import {
  Building2,
  Globe,
  Users,
  Building,
  MapPin,
  Hash,
  User,
  Calendar,
  Download,
  Eye,
  Mail,
  Phone,
  Sparkles,
  HelpCircle,
  Plus,
  Trash2,
  ShieldCheck,
  Target,
  Search,
  ExternalLink
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Organization } from "../types";
import { useUpdateOrganization } from "../hooks/useImpactoData";
import {
  buildDefaultOrgFaqs,
  buildOrgAiSnippet,
  buildOrgMetaTags,
  getCanonicalPublicOrgUrl,
  getLiveShareableOrgUrl,
  hydrateOrgProfileFallbacks,
  OrgFaqItem,
} from "../lib/publicOrgSeo";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const CATEGORY_OPTIONS = [
  "NGO",
  "Cooperative",
  "Association",
  "Environment & Forestry",
  "Education & Tech Mentoring",
  "Health & Sanitation",
  "Social Action & Welfare",
  "Enterprise Cooperative",
  "Company",
  "Other",
];

export const OrganizationProfilePage = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { activeOrg, setActiveOrg, activeMember } = useOrgStore();
  const { addToast } = useToast();
  const updateOrgMutation = useUpdateOrganization();

  const canEdit = Boolean(
    user?.is_superadmin ||
      activeMember?.role === "org_admin" ||
      activeMember?.role === "superadmin" ||
      activeMember?.role === "manager" ||
      activeMember?.role === "accountant" ||
      activeMember?.permissions?.manage_content ||
      activeMember?.permissions?.manage_settings ||
      (activeOrg && user && (activeOrg.owner_id === user.id || (activeOrg as any).created_by === user.id))
  );

  const [profile, setProfile] = useState<Partial<Organization>>({});
  const [faqItems, setFaqItems] = useState<OrgFaqItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(!canEdit);

  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeOrg) {
      const hydrated = hydrateOrgProfileFallbacks(activeOrg);
      setProfile(hydrated);
      if (Array.isArray(hydrated.faq_items) && hydrated.faq_items.length > 0) {
        setFaqItems(hydrated.faq_items);
      } else {
        setFaqItems([]);
      }
    }
  }, [activeOrg]);

  useEffect(() => {
    if (!canEdit) {
      setShowPreview(true);
    }
  }, [canEdit]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg) return;

    try {
      setSaving(true);

      const cleanedFaqs = faqItems
        .map((f) => ({
          question: (f.question || "").trim(),
          answer: (f.answer || "").trim(),
        }))
        .filter((f) => f.question && f.answer);

      const payload: Partial<Organization> & { id: string } = {
        id: activeOrg.id,
        name: profile.name?.trim() || activeOrg.name,
        alternate_name: profile.alternate_name?.trim() || "",
        org_category: profile.org_category?.trim() || activeOrg.org_category,
        tagline: profile.tagline?.trim() || "",
        description: profile.description?.trim() || "",
        mission: profile.mission?.trim() || "",
        vision: profile.vision?.trim() || "",
        country: profile.country?.trim() || "Rwanda",
        province: profile.province?.trim() || "",
        district: profile.district?.trim() || "",
        sector: profile.sector?.trim() || "",
        location_name:
          profile.location_name?.trim() ||
          [profile.district, profile.country || "Rwanda"].filter(Boolean).join(", "),
        contact_email: profile.contact_email?.trim() || "",
        contact_phone: profile.contact_phone?.trim() || "",
        contact_us:
          profile.contact_us?.trim() ||
          [profile.contact_email?.trim(), profile.contact_phone?.trim()].filter(Boolean).join(" / "),
        service_area: profile.service_area?.trim() || "",
        key_activities: profile.key_activities?.trim() || "",
        target_beneficiaries: profile.target_beneficiaries?.trim() || "",
        membership_info: profile.membership_info?.trim() || "",
        founded_date: profile.founded_date?.trim() || "",
        founders: profile.founders?.trim() || "",
        registration_number: profile.registration_number?.trim() || "",
        registration_authority: profile.registration_authority?.trim() || "",
        website: profile.website?.trim() || "",
        facebook_url: profile.facebook_url?.trim() || "",
        twitter_url: profile.twitter_url?.trim() || "",
        linkedin_url: profile.linkedin_url?.trim() || "",
        employee_count: profile.employee_count?.trim() || "",
        seo_keywords: profile.seo_keywords?.trim() || "",
        ai_summary: profile.ai_summary?.trim() || "",
        faq_items: cleanedFaqs,
      };

      const updated = await updateOrgMutation.mutateAsync(payload);
      const mergedUpdated = hydrateOrgProfileFallbacks({
        ...activeOrg,
        ...payload,
        ...updated,
        faq_items: cleanedFaqs,
      } as Organization);

      setActiveOrg(mergedUpdated, activeMember);
      addToast(
        t("org_profile.saved_success", "Organization profile updated successfully!"),
        "success"
      );
    } catch (err: any) {
      console.error("Save profile error:", err);
      addToast(err?.message || "Failed to save organization profile.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleAutoGenerateSeo = () => {
    const draftOrg: Partial<Organization> = { ...activeOrg, ...profile };
    const meta = buildOrgMetaTags({ ...draftOrg, seo_keywords: "" });
    const snippet = buildOrgAiSnippet({ ...draftOrg, ai_summary: "" });
    setProfile((prev) => ({
      ...prev,
      seo_keywords: meta.keywords.join(", "),
      ai_summary: snippet,
    }));
    addToast("SEO keywords and AI answer snippet generated from profile details!", "success");
  };

  const handleAutoFillFaqs = () => {
    const draftOrg: Partial<Organization> = { ...activeOrg, ...profile };
    setFaqItems(buildDefaultOrgFaqs(draftOrg));
    addToast("5 standard search & AI FAQ pairs populated from your profile!", "success");
  };

  const handleFaqChange = (index: number, field: "question" | "answer", value: string) => {
    setFaqItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const handleAddFaq = () => {
    setFaqItems((prev) => [...prev, { question: "", answer: "" }]);
  };

  const handleRemoveFaq = (index: number) => {
    setFaqItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const downloadPDF = async () => {
    if (!previewRef.current) return;
    try {
      const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${activeOrg?.name || "Organization"}_Profile.pdf`);
    } catch (error) {
      console.error("PDF generation failed", error);
      addToast("Failed to generate PDF", "error");
    }
  };

  if (!activeOrg) return null;

  const livePublicUrl = getLiveShareableOrgUrl(activeOrg.slug);
  const canonicalUrl = getCanonicalPublicOrgUrl(activeOrg.slug);
  const aiSnippetWordCount = (profile.ai_summary || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  const displayFaqs =
    faqItems.length > 0
      ? faqItems.filter((f) => f.question?.trim() || f.answer?.trim())
      : buildDefaultOrgFaqs({ ...activeOrg, ...profile });

  if (!canEdit || showPreview) {
    return (
      <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto space-y-6 pb-20">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          {canEdit ? (
            <Button variant="secondary" onClick={() => setShowPreview(false)}>
              &larr; {t("org_profile.back_to_edit", "Back to Edit")}
            </Button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <a
              href={`/@${activeOrg.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              <ExternalLink className="h-3.5 w-3.5 text-emerald-600" />
              <span>{t("nav.public_portal", "Public Portal")}</span>
            </a>
            <Button onClick={downloadPDF} icon={<Download className="h-4 w-4" />}>
              {t("org_profile.download_pdf", "Download PDF")}
            </Button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-8 rounded-2xl shadow-sm" ref={previewRef}>
          <div className="text-center mb-8 border-b border-slate-200 dark:border-slate-800 pb-6">
            {activeOrg.logo_url && !activeOrg.logo_url.includes("logo.png") && (
              <div className="h-20 max-w-[200px] mx-auto mb-4 flex items-center justify-center overflow-hidden">
                <img
                  src={activeOrg.logo_url}
                  alt="Logo"
                  className="max-h-20 max-w-full object-contain"
                  style={{ maxHeight: "80px", maxWidth: "200px", width: "auto" }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900 dark:text-white">
              {profile.name || activeOrg.name}
              {profile.alternate_name ? (
                <span className="text-base font-normal text-gray-500 ml-2">
                  ({profile.alternate_name})
                </span>
              ) : null}
            </h1>
            <p className="text-gray-500 mt-2">{profile.tagline || activeOrg.tagline}</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1.5 font-mono tracking-widest uppercase font-bold">
              Official Organization Profile • {canonicalUrl}
            </p>
          </div>

          <div className="space-y-6 text-sm text-gray-700 dark:text-gray-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2 mb-3">
                  {t("org_profile.identity_card", "Identity & Legal")}
                </h3>
                <ul className="space-y-2 text-xs sm:text-sm">
                  <li><strong>Founded Date:</strong> {profile.founded_date || "N/A"}</li>
                  <li><strong>Registration No:</strong> {profile.registration_number || "N/A"}</li>
                  <li><strong>Authority:</strong> {profile.registration_authority || "N/A"}</li>
                  <li><strong>Founders:</strong> {profile.founders || "N/A"}</li>
                  <li><strong>Team Size:</strong> {profile.employee_count || "N/A"}</li>
                  <li><strong>Category:</strong> {profile.org_category || activeOrg.org_category || "N/A"}</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2 mb-3">
                  {t("org_profile.location_contact_card", "Location & Contact")}
                </h3>
                <ul className="space-y-2 text-xs sm:text-sm">
                  <li><strong>Country:</strong> {profile.country || "Rwanda"}</li>
                  <li><strong>Province:</strong> {profile.province || "N/A"}</li>
                  <li><strong>District:</strong> {profile.district || "N/A"}</li>
                  <li><strong>Sector:</strong> {profile.sector || "N/A"}</li>
                  <li><strong>Email:</strong> {profile.contact_email || "N/A"}</li>
                  <li><strong>Phone:</strong> {profile.contact_phone || "N/A"}</li>
                  <li><strong>Website:</strong> {profile.website || "N/A"}</li>
                </ul>
              </div>
            </div>

            {(profile.key_activities || profile.target_beneficiaries || profile.service_area) && (
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2 mb-3">
                  {t("org_profile.activities_card", "Activities & Community Impact")}
                </h3>
                {profile.key_activities && (
                  <p className="mb-2"><strong>Key Activities:</strong> {profile.key_activities}</p>
                )}
                {profile.target_beneficiaries && (
                  <p className="mb-2"><strong>Who We Serve:</strong> {profile.target_beneficiaries}</p>
                )}
                {profile.service_area && (
                  <p><strong>Service Area:</strong> {profile.service_area}</p>
                )}
              </div>
            )}

            <div>
              <h3 className="font-bold text-gray-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2 mb-3">
                Mission & Vision
              </h3>
              <p className="mb-3"><strong>Mission:</strong> {profile.mission || activeOrg.mission || "N/A"}</p>
              <p><strong>Vision:</strong> {profile.vision || activeOrg.vision || "N/A"}</p>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2 mb-3">
                About Us
              </h3>
              <p className="whitespace-pre-wrap">{profile.description || activeOrg.description || "N/A"}</p>
            </div>

            {/* Shareable QR Code Stamp */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-4">
              <div className="p-2.5 bg-white rounded-xl border border-slate-200 shrink-0">
                <QRCodeSVG value={livePublicUrl} size={96} level="M" />
              </div>
              <div className="text-center sm:text-left min-w-0">
                <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                  {t("public_org.scan_qr", "Scan to Visit Public Portal")}
                </h4>
                <p className="text-xs text-gray-500 mt-1 break-all font-mono">
                  {canonicalUrl}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-gray-400">
            <p>Generated via Impacto Platform on {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <Building2 className="h-8 w-8 text-[#156c45] dark:text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold font-display text-gray-900 dark:text-white truncate">
              {t("org_profile.title", "Organization Profile")}
            </h1>
            <p className="text-gray-500 dark:text-slate-400 text-xs sm:text-sm">
              {t("org_profile.subtitle", `Detailed official profile & search visibility for ${activeOrg.name}`)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/@${activeOrg.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            <ExternalLink className="h-3.5 w-3.5 text-emerald-600" />
            <span>{t("nav.public_portal", "Public Portal")}</span>
          </a>
          <Button variant="secondary" onClick={() => setShowPreview(true)} icon={<Eye className="h-4 w-4" />}>
            {t("org_profile.preview_pdf", "Preview & PDF")}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Workspace Basics */}
        <Card title={t("org_profile.basics_card", "Workspace Basics")} icon={<Building2 className="h-4 w-4 text-[#156c45]" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            <Input
              label={t("org_profile.org_name", "Organization Name")}
              name="name"
              value={profile.name || ""}
              onChange={handleChange}
              placeholder="e.g. Kigali Green Action Cooperative"
            />
            <Input
              label={t("org_profile.alternate_name", "Alternate Name / Acronym")}
              name="alternate_name"
              value={profile.alternate_name || ""}
              onChange={handleChange}
              placeholder="e.g. KGAC"
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                {t("org_profile.category", "Category")}
              </label>
              <select
                name="org_category"
                value={profile.org_category || "Cooperative"}
                onChange={handleChange}
                className="w-full text-sm rounded-xl border bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 px-3.5 py-2 text-slate-900 dark:text-slate-100 shadow-3xs focus:outline-none focus:ring-2 focus:ring-[#156c45]"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
                {profile.org_category && !CATEGORY_OPTIONS.includes(profile.org_category) && (
                  <option value={profile.org_category}>{profile.org_category}</option>
                )}
              </select>
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <Input
                label={t("org_profile.tagline", "Short Tagline")}
                name="tagline"
                value={profile.tagline || ""}
                onChange={handleChange}
                placeholder="e.g. Empowering sustainable agriculture and local resilience"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3 flex flex-col gap-1.5 self-start">
              <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                {t("org_profile.description", "About / Short Description")}
              </label>
              <textarea
                name="description"
                value={profile.description || ""}
                onChange={handleChange}
                placeholder="Describe what your organization does, who it serves, and its impact in Rwanda..."
                className="w-full text-sm rounded-xl border bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 px-3.5 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 shadow-3xs focus:outline-none focus:ring-2 focus:ring-[#156c45] focus:border-transparent transition-all min-h-[100px]"
              />
            </div>

            <div className="flex flex-col gap-1.5 self-start md:col-span-1 lg:col-span-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                {t("org_profile.mission", "Mission Statement")}
              </label>
              <textarea
                name="mission"
                value={profile.mission || ""}
                onChange={handleChange}
                placeholder="Our mission..."
                className="w-full text-sm rounded-xl border bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 px-3.5 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 shadow-3xs focus:outline-none focus:ring-2 focus:ring-[#156c45] focus:border-transparent transition-all min-h-[100px]"
              />
            </div>

            <div className="flex flex-col gap-1.5 self-start md:col-span-1 lg:col-span-2">
              <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                {t("org_profile.vision", "Vision Blueprint")}
              </label>
              <textarea
                name="vision"
                value={profile.vision || ""}
                onChange={handleChange}
                placeholder="Our vision..."
                className="w-full text-sm rounded-xl border bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 px-3.5 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 shadow-3xs focus:outline-none focus:ring-2 focus:ring-[#156c45] focus:border-transparent transition-all min-h-[100px]"
              />
            </div>
          </div>
        </Card>

        {/* 2. Activities, Community & Membership */}
        <Card title={t("org_profile.activities_card", "Activities, Impact & Membership")} icon={<Target className="h-4 w-4 text-[#156c45]" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            <div className="md:col-span-2 lg:col-span-3">
              <Input
                label={t("org_profile.key_activities", "Key Activities (Comma separated)")}
                name="key_activities"
                value={profile.key_activities || ""}
                onChange={handleChange}
                placeholder="e.g. Tree planting, Farmer training, Compost production, Micro-savings"
              />
            </div>
            <Input
              label={t("org_profile.target_beneficiaries", "Target Beneficiaries / Who We Serve")}
              name="target_beneficiaries"
              value={profile.target_beneficiaries || ""}
              onChange={handleChange}
              placeholder="e.g. Smallholder farmers and youth"
            />
            <Input
              label={t("org_profile.service_area", "Service Area / Community")}
              name="service_area"
              value={profile.service_area || ""}
              onChange={handleChange}
              placeholder="e.g. Bugesera District & Eastern Province"
            />
            <div className="md:col-span-2 lg:col-span-1">
              <Input
                label={t("org_profile.membership_info", "How to Join / Membership Guide")}
                name="membership_info"
                value={profile.membership_info || ""}
                onChange={handleChange}
                placeholder="e.g. Apply online or visit our sector office"
              />
            </div>
          </div>
        </Card>

        {/* 3. Location & Public Contact Details */}
        <Card title={t("org_profile.location_contact_card", "Location & Public Contact")} icon={<MapPin className="h-4 w-4 text-[#156c45]" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            <Input
              label="Country"
              name="country"
              value={profile.country || ""}
              onChange={handleChange}
              placeholder="e.g. Rwanda"
            />
            <Input
              label="Province / Region"
              name="province"
              value={profile.province || ""}
              onChange={handleChange}
              placeholder="e.g. Kigali City"
            />
            <Input
              label="District"
              name="district"
              value={profile.district || ""}
              onChange={handleChange}
              placeholder="e.g. Gasabo"
            />
            <Input
              label="Sector / Street Area"
              name="sector"
              value={profile.sector || ""}
              onChange={handleChange}
              placeholder="e.g. Kacyiru"
            />
            <Input
              label={t("org_profile.location_display", "Public Location Display")}
              name="location_name"
              value={profile.location_name || ""}
              onChange={handleChange}
              placeholder="e.g. Gasabo, Kigali, Rwanda"
            />
            <Input
              label={t("org_profile.contact_email", "Official Public Email")}
              name="contact_email"
              type="email"
              value={profile.contact_email || ""}
              onChange={handleChange}
              placeholder="e.g. info@yourorg.rw"
              prefixIcon={<Mail className="h-4 w-4 text-gray-400" />}
            />
            <Input
              label={t("org_profile.contact_phone", "Official Public Phone")}
              name="contact_phone"
              value={profile.contact_phone || ""}
              onChange={handleChange}
              placeholder="e.g. +250 788 000 000"
              prefixIcon={<Phone className="h-4 w-4 text-gray-400" />}
            />
            <div className="md:col-span-2">
              <Input
                label={t("org_profile.contact_notes", "Additional Contact Info / Office Hours")}
                name="contact_us"
                value={profile.contact_us || ""}
                onChange={handleChange}
                placeholder="e.g. Mon–Fri 8:00 AM – 5:00 PM | info@yourorg.rw"
              />
            </div>
          </div>
        </Card>

        {/* 4. Official Identity & Registration */}
        <Card title={t("org_profile.identity_card", "Official Identity & Registration")} icon={<Building className="h-4 w-4 text-[#156c45]" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            <Input
              label="Founded Date / Year"
              name="founded_date"
              value={profile.founded_date || ""}
              onChange={handleChange}
              placeholder="e.g. 2018 or 15 Jan 2018"
              prefixIcon={<Calendar className="h-4 w-4 text-gray-400" />}
            />
            <Input
              label="Founders (Comma separated)"
              name="founders"
              value={profile.founders || ""}
              onChange={handleChange}
              placeholder="e.g. Jane Uwimana, Jean Paul Habimana"
              prefixIcon={<User className="h-4 w-4 text-gray-400" />}
            />
            <Input
              label="Registration Number (TIN / RGB / RCA ID)"
              name="registration_number"
              value={profile.registration_number || ""}
              onChange={handleChange}
              placeholder="e.g. RGB-2026-001"
              prefixIcon={<Hash className="h-4 w-4 text-gray-400" />}
            />
            <Input
              label={t("org_profile.registration_authority", "Registering Authority (e.g. RGB, RCA, RDB)")}
              name="registration_authority"
              value={profile.registration_authority || ""}
              onChange={handleChange}
              placeholder="e.g. Rwanda Governance Board (RGB)"
              prefixIcon={<ShieldCheck className="h-4 w-4 text-gray-400" />}
            />
            <Input
              label="Employee / Member Capacity"
              name="employee_count"
              value={profile.employee_count || ""}
              onChange={handleChange}
              placeholder="e.g. 15-50"
              prefixIcon={<Users className="h-4 w-4 text-gray-400" />}
            />
          </div>
        </Card>

        {/* 5. Digital Presence */}
        <Card title={t("org_profile.digital_card", "Digital Presence & Social Links")} icon={<Globe className="h-4 w-4 text-[#156c45]" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Input
              label={t("org_profile.website", "Official Website")}
              name="website"
              value={profile.website || ""}
              onChange={handleChange}
              placeholder="https://example.org"
            />
            <Input
              label="LinkedIn URL"
              name="linkedin_url"
              value={profile.linkedin_url || ""}
              onChange={handleChange}
              placeholder="https://linkedin.com/company/..."
            />
            <Input
              label="Twitter / X URL"
              name="twitter_url"
              value={profile.twitter_url || ""}
              onChange={handleChange}
              placeholder="https://x.com/..."
            />
            <Input
              label="Facebook URL"
              name="facebook_url"
              value={profile.facebook_url || ""}
              onChange={handleChange}
              placeholder="https://facebook.com/..."
            />
          </div>
        </Card>

        {/* 6. Search Engine (SEO) & AI Visibility (GEO) */}
        <Card
          title={t("org_profile.seo_section_title", "Search Engine (SEO) & AI Visibility")}
          icon={<Search className="h-4 w-4 text-[#156c45]" />}
          actions={
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={handleAutoGenerateSeo}
              icon={<Sparkles className="h-3.5 w-3.5 text-emerald-600" />}
            >
              {t("org_profile.auto_generate_seo", "Auto-Generate from Profile")}
            </Button>
          }
        >
          <div className="grid grid-cols-1 gap-4 mt-4">
            <Input
              label={t("org_profile.seo_keywords", "SEO Keywords (Comma separated)")}
              name="seo_keywords"
              value={profile.seo_keywords || ""}
              onChange={handleChange}
              placeholder="e.g. Kigali cooperative, tree planting Rwanda, community agriculture..."
              helperText="Used automatically in Google meta tags on your public Impacto portal."
            />
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                  {t("org_profile.ai_summary", "AI Answer Snippet (40–60 words)")}
                </label>
                <span className={`text-[11px] font-mono font-bold ${
                  aiSnippetWordCount >= 40 && aiSnippetWordCount <= 60
                    ? "text-emerald-600"
                    : "text-slate-400"
                }`}>
                  {aiSnippetWordCount} words
                </span>
              </div>
              <textarea
                name="ai_summary"
                value={profile.ai_summary || ""}
                onChange={handleChange}
                placeholder={`Leave blank to auto-generate, or write a crisp 40–60 word summary mentioning ${profile.name || "your organization"}, location, activities, and ${canonicalUrl}.`}
                className="w-full text-sm rounded-xl border bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 px-3.5 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 shadow-3xs focus:outline-none focus:ring-2 focus:ring-[#156c45] focus:border-transparent transition-all min-h-[90px]"
              />
            </div>
          </div>
        </Card>

        {/* 7. Public Frequently Asked Questions (FAQPage Schema) */}
        <Card
          title={t("org_profile.faq_section_title", "Public Frequently Asked Questions (FAQs)")}
          icon={<HelpCircle className="h-4 w-4 text-[#156c45]" />}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={handleAutoFillFaqs}
                icon={<Sparkles className="h-3.5 w-3.5 text-emerald-600" />}
              >
                {t("org_profile.faq_reset", "Auto-Fill 5 Standard FAQs")}
              </Button>
              <Button
                type="button"
                size="xs"
                variant="secondary"
                onClick={handleAddFaq}
                icon={<Plus className="h-3.5 w-3.5" />}
              >
                {t("org_profile.faq_add", "Add Question")}
              </Button>
            </div>
          }
        >
          <div className="space-y-4 mt-4">
            {faqItems.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/50 text-xs text-slate-600 dark:text-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    Standard 5 Search & AI FAQs are active automatically
                  </p>
                  <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                    Click &ldquo;{t("org_profile.faq_reset", "Auto-Fill 5 Standard FAQs")}&rdquo; to review or customize the exact questions and answers shown on your public page.
                  </p>
                </div>
              </div>
            ) : (
              faqItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono font-bold uppercase text-emerald-700 dark:text-emerald-400">
                      FAQ #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFaq(idx)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                      title="Remove question"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <Input
                    label="Question"
                    value={item.question}
                    onChange={(e) => handleFaqChange(idx, "question", e.target.value)}
                    placeholder={`e.g. What is ${profile.name || "our organization"}?`}
                  />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                      Answer
                    </label>
                    <textarea
                      value={item.answer}
                      onChange={(e) => handleFaqChange(idx, "answer", e.target.value)}
                      placeholder="Enter clear, accurate answer..."
                      className="w-full text-sm rounded-xl border bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 px-3.5 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 shadow-3xs focus:outline-none focus:ring-2 focus:ring-[#156c45] focus:border-transparent transition-all min-h-[72px]"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 pb-12">
          <span className="text-xs text-slate-400 font-mono">
            Public URL: {canonicalUrl}
          </span>
          <Button type="submit" disabled={saving || updateOrgMutation.isPending} loading={saving} className="min-w-[180px]">
            {saving
              ? t("org_profile.saving", "Saving...")
              : t("org_profile.save_changes", "Save Organization Profile")}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default OrganizationProfilePage;
