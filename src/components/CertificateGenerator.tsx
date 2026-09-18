import React, { useState, useRef } from "react";
import { Award, Download, Printer, Plus, CheckCircle2, ShieldCheck, QrCode, Search, RefreshCw, X, Filter } from "lucide-react";
import { Certificate, OrgMember } from "../types";
import { MockDB } from "../lib/mockData";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { useOrgStore } from "../store/orgStore";
import { useToast } from "./Toast";
import { DigitalSignaturePad } from "./DigitalSignaturePad";
import { CertificateBadgeBuilderModal } from "./CertificateBadgeBuilderModal";

interface CertificateGeneratorProps {
  members?: OrgMember[];
}

export const CertificateGenerator: React.FC<CertificateGeneratorProps> = ({ members = [] }) => {
  const { activeOrg } = useOrgStore();
  const { addToast } = useToast();

  const [certificates, setCertificates] = useState<Certificate[]>(() => {
    return MockDB.getCertificates().filter((c: Certificate) => !activeOrg?.id || c.org_id === activeOrg.id || c.org_id === "org-1");
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBatchDesignerModal, setShowBatchDesignerModal] = useState(false);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(certificates[0] || null);
  const [searchQuery, setSearchQuery] = useState("");
  const [themeFilter, setThemeFilter] = useState<string>("all");

  // Form State for New Certificate
  const [title, setTitle] = useState("Certificate of Completion");
  const [subheading, setSubheading] = useState("Cooperative Leadership & Financial Transparency Workshop");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [description, setDescription] = useState(
    "In recognition of active participation, mastery of democratic cooperative governance, and successful completion of the executive compliance curriculum."
  );
  const [templateTheme, setTemplateTheme] = useState<"emerald" | "gold" | "navy" | "modern">("emerald");
  const [signatoryName, setSignatoryName] = useState("Evariste Ndagijimana");
  const [signatoryTitle, setSignatoryTitle] = useState("President & Board Chairperson");
  const [signatorySignatureUrl, setSignatorySignatureUrl] = useState<string>("");
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const certPreviewRef = useRef<HTMLDivElement | null>(null);

  const handleMemberSelect = (memberId: string) => {
    setSelectedMemberId(memberId);
    const m = members.find((mem) => mem.id === memberId);
    if (m) {
      setRecipientName(m.user?.full_name || "");
      setRecipientEmail(m.user?.email || "");
    }
  };

  const handleCreateCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim()) {
      addToast("Please provide a recipient name", "error");
      return;
    }

    setIsSaving(true);
    const certCode = "CERT-" + new Date().getFullYear() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase() + "-" + Math.floor(1000 + Math.random() * 9000);
    const verificationUrl = window.location.origin + "/verify/" + certCode;

    const newCert: Certificate = {
      id: "cert-" + Date.now(),
      org_id: activeOrg?.id || "default-org",
      recipient_member_id: selectedMemberId || undefined,
      recipient_name: recipientName,
      recipient_email: recipientEmail,
      title: `${title} - ${subheading}`,
      description,
      issue_date: new Date().toISOString().split("T")[0],
      certificate_code: certCode,
      template_theme: templateTheme,
      signatory_name: signatoryName,
      signatory_title: signatoryTitle,
      signatory_signature_url: signatorySignatureUrl,
      qr_verification_url: verificationUrl,
      status: "issued",
      created_at: new Date().toISOString()
    };

    try {
      if (isSupabaseConfigured) {
        await supabase.from("certificates").insert(newCert);
      }
      const allCerts = MockDB.getCertificates();
      allCerts.unshift(newCert);
      MockDB.saveCertificates(allCerts);
      setCertificates((prev) => [newCert, ...prev]);
      setSelectedCert(newCert);
      setShowCreateModal(false);
      addToast("Certificate successfully issued and registered!", "success");
    } catch (err: any) {
      addToast("Failed to issue certificate: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  const filteredCerts = certificates.filter((c) => {
    const matchesSearch =
      c.recipient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.certificate_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTheme = themeFilter === "all" || c.template_theme === themeFilter;
    return matchesSearch && matchesTheme;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
              <Award className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white font-display">
              Certificate Studio & Verification Hub
            </h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Issue cryptographically stamped, verifiable completion and recognition certificates for members and workshop attendees.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowBatchDesignerModal(true)}
            className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs"
          >
            <Award className="h-4 w-4" /> Certificate / Badge Designer
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" /> Issue Single Certificate
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Certificate Registry List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search recipient, title, code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-900 dark:text-white"
                />
              </div>
              <select
                value={themeFilter}
                onChange={(e) => setThemeFilter(e.target.value)}
                className="px-2 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300"
              >
                <option value="all">All Styles</option>
                <option value="emerald">Emerald</option>
                <option value="gold">Gold</option>
                <option value="navy">Navy</option>
              </select>
            </div>

            <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
              {filteredCerts.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Award className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-semibold">No certificates found</p>
                </div>
              ) : (
                filteredCerts.map((cert) => (
                  <div
                    key={cert.id}
                    onClick={() => setSelectedCert(cert)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer text-left ${
                      selectedCert?.id === cert.id
                        ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-sm"
                        : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-gray-900 dark:text-white truncate">
                        {cert.recipient_name}
                      </span>
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                        {cert.certificate_code}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 dark:text-gray-400 line-clamp-1 mb-2 font-medium">
                      {cert.title}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-gray-400">
                      <span>Issued: {cert.issue_date}</span>
                      <span className="capitalize font-semibold text-emerald-600">
                        {cert.template_theme} Style
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: High Resolution Live Preview & Actions */}
        <div className="lg:col-span-8">
          {selectedCert ? (
            <div className="space-y-4">
              {/* Actions Bar */}
              <div className="flex items-center justify-between bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    {selectedCert.certificate_code}
                  </span>
                  <span className="text-xs text-gray-500">Official Registered Verification Token</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrintCertificate}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Printer className="h-3.5 w-3.5" /> Print Certificate
                  </button>
                  <button
                    onClick={() => {
                      addToast("High-resolution Certificate saved to documents repository", "success");
                    }}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                  >
                    <Download className="h-3.5 w-3.5" /> Download PDF/PNG
                  </button>
                </div>
              </div>

              {/* Certificate Canvas / Render Frame */}
              <div
                ref={certPreviewRef}
                className={`p-8 md:p-12 rounded-3xl border-8 shadow-xl text-center relative overflow-hidden transition ${
                  selectedCert.template_theme === "gold"
                    ? "bg-[#fffdfa] text-amber-950 border-amber-600/60"
                    : selectedCert.template_theme === "navy"
                    ? "bg-[#f8fafc] text-slate-900 border-indigo-900/60"
                    : "bg-[#fafdf9] text-emerald-950 border-emerald-700/60"
                }`}
                style={{
                  boxShadow: "0 20px 40px -15px rgba(0,0,0,0.1), inset 0 0 40px rgba(0,0,0,0.02)"
                }}
              >
                {/* Decorative Corner Filigree Borders */}
                <div className="absolute top-3 left-3 w-12 h-12 border-t-2 border-l-2 border-current opacity-40 pointer-events-none" />
                <div className="absolute top-3 right-3 w-12 h-12 border-t-2 border-r-2 border-current opacity-40 pointer-events-none" />
                <div className="absolute bottom-3 left-3 w-12 h-12 border-b-2 border-l-2 border-current opacity-40 pointer-events-none" />
                <div className="absolute bottom-3 right-3 w-12 h-12 border-b-2 border-r-2 border-current opacity-40 pointer-events-none" />

                {/* Organization Header */}
                <div className="mb-6">
                  {activeOrg?.logo_url && (
                    <img src={activeOrg.logo_url} alt="Logo" className="h-14 w-14 object-contain mx-auto mb-2" />
                  )}
                  <p className="text-xs uppercase font-mono tracking-widest font-bold opacity-75">
                    {activeOrg?.name || "Impacto Cooperative Federation"}
                  </p>
                  <p className="text-[10px] opacity-60 uppercase tracking-wider mt-0.5">
                    Official Recognition & Governance Registry
                  </p>
                </div>

                {/* Main Heading */}
                <div className="my-6">
                  <span className="text-xs uppercase font-serif tracking-widest font-bold block mb-1 opacity-80">
                    Certificate of Completion & Excellence
                  </span>
                  <h1 className="text-2xl md:text-3xl font-serif font-extrabold tracking-tight mt-1">
                    {selectedCert.title}
                  </h1>
                </div>

                {/* Recipient Presentation */}
                <div className="my-8">
                  <p className="text-xs font-serif italic opacity-75 mb-3">This is proudly conferred upon</p>
                  <div className="text-2xl md:text-4xl font-serif font-bold underline decoration-2 underline-offset-8">
                    {selectedCert.recipient_name}
                  </div>
                </div>

                {/* Body Description */}
                <p className="max-w-xl mx-auto text-xs md:text-sm font-serif leading-relaxed opacity-85 mb-10">
                  {selectedCert.description}
                </p>

                {/* Signatures & Seal Section */}
                <div className="pt-6 border-t border-current/20 flex flex-col sm:flex-row items-center justify-between gap-6 px-4">
                  {/* Left: Issue Date & Serial Verification */}
                  <div className="text-left space-y-1">
                    <p className="text-[10px] uppercase font-mono opacity-60 font-semibold">Date of Issue</p>
                    <p className="text-xs font-mono font-bold">{selectedCert.issue_date}</p>
                    <p className="text-[9px] font-mono opacity-60">Serial: {selectedCert.certificate_code}</p>
                  </div>

                  {/* Center: Official Seal Badge */}
                  <div className="p-3 rounded-full border-2 border-dashed border-current/40 bg-white/60 dark:bg-black/10 backdrop-blur-sm">
                    <div className="w-16 h-16 rounded-full border border-current flex flex-col items-center justify-center text-center">
                      <Award className="h-5 w-5 mb-0.5" />
                      <span className="text-[7px] font-mono uppercase font-bold tracking-tighter">VERIFIED</span>
                      <span className="text-[6px] font-mono uppercase">SEAL</span>
                    </div>
                  </div>

                  {/* Right: Signatory Name & Signature */}
                  <div className="text-right space-y-1">
                    <div className="h-10 flex items-end justify-end mb-1">
                      {selectedCert.signatory_signature_url ? (
                        <img src={selectedCert.signatory_signature_url} alt="Signature" className="h-9 object-contain" />
                      ) : (
                        <span className="font-serif italic text-lg text-current">{selectedCert.signatory_name}</span>
                      )}
                    </div>
                    <div className="border-t border-current/60 pt-1">
                      <p className="text-xs font-serif font-bold">{selectedCert.signatory_name}</p>
                      <p className="text-[10px] opacity-70 italic">{selectedCert.signatory_title}</p>
                    </div>
                  </div>
                </div>

                {/* Verification QR Footer */}
                <div className="mt-8 pt-4 border-t border-current/10 flex items-center justify-between text-[9px] font-mono opacity-60">
                  <span>Tamper-evident digital token registered on Impacto Cloud</span>
                  <span className="flex items-center gap-1">
                    <QrCode className="h-3 w-3" /> Scan to Verify Authenticity
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-12 text-center text-gray-400">
              <Award className="h-12 w-12 mx-auto mb-3 opacity-40 text-emerald-500" />
              <h3 className="text-base font-bold text-gray-900 dark:text-white">No Certificate Selected</h3>
              <p className="text-xs text-gray-500 mt-1">Select a certificate from the left or create a new one.</p>
            </div>
          )}
        </div>
      </div>

      {/* CREATE CERTIFICATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-2xl w-full border border-gray-200 dark:border-gray-800 shadow-2xl p-6 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-emerald-600 text-white">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900 dark:text-white">Issue Official Certificate</h3>
                  <p className="text-xs text-gray-500">Configure recipient details, workshop title, and signatories.</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCertificate} className="py-4 space-y-4 overflow-y-auto flex-1 pr-1">
              {/* Member Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Select Registered Member (Optional Auto-fill)
                </label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => handleMemberSelect(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white"
                >
                  <option value="">-- Choose member from directory or enter manually --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.user?.full_name} ({m.role}) - {m.user?.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Recipient Full Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="e.g. Jean Bosco Habimana"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Recipient Email Address
                  </label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="member@cooperative.rw"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Certificate Header Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Certificate of Completion"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Workshop / Program Name
                  </label>
                  <input
                    type="text"
                    value={subheading}
                    onChange={(e) => setSubheading(e.target.value)}
                    placeholder="e.g. Organic Agronomy & Dues Compliance"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Commendation & Description Text
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white"
                />
              </div>

              {/* Theme Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Certificate Visual Template Style
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTemplateTheme("emerald")}
                    className={`p-3 rounded-xl border text-center transition ${
                      templateTheme === "emerald"
                        ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-bold"
                        : "border-gray-200 dark:border-gray-700 text-xs"
                    }`}
                  >
                    🌿 Emerald Classic
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemplateTheme("gold")}
                    className={`p-3 rounded-xl border text-center transition ${
                      templateTheme === "gold"
                        ? "border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 font-bold"
                        : "border-gray-200 dark:border-gray-700 text-xs"
                    }`}
                  >
                    🏆 Prestige Gold
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemplateTheme("navy")}
                    className={`p-3 rounded-xl border text-center transition ${
                      templateTheme === "navy"
                        ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200 font-bold"
                        : "border-gray-200 dark:border-gray-700 text-xs"
                    }`}
                  >
                    🏛️ Executive Navy
                  </button>
                </div>
              </div>

              {/* Signatory Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Signatory Full Name
                  </label>
                  <input
                    type="text"
                    value={signatoryName}
                    onChange={(e) => setSignatoryName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Signatory Title
                  </label>
                  <input
                    type="text"
                    value={signatoryTitle}
                    onChange={(e) => setSignatoryTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Signatory Digital Signature */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Signatory Digital Signature Stamp
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSignaturePad(true)}
                    className="text-xs text-emerald-600 hover:underline font-semibold"
                  >
                    {signatorySignatureUrl ? "Change Signature" : "+ Attach Digital E-Sign"}
                  </button>
                </div>
                {signatorySignatureUrl && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <img src={signatorySignatureUrl} alt="Signature" className="h-10 object-contain" />
                    <button
                      type="button"
                      onClick={() => setSignatorySignatureUrl("")}
                      className="text-xs text-rose-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-sm"
                >
                  {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
                  Register & Issue Certificate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Signature Pad Modal for Signatory */}
      <DigitalSignaturePad
        isOpen={showSignaturePad}
        onClose={() => setShowSignaturePad(false)}
        documentTitle="Official Certificate Sign-off"
        signerName={signatoryName}
        signerRole={signatoryTitle}
        onSignComplete={(data) => {
          setSignatorySignatureUrl(data.signatureDataUrl);
          setShowSignaturePad(false);
          addToast("Signatory digital signature attached successfully!", "success");
        }}
      />

      {/* Interactive Certificate & Badge Designer Studio */}
      <CertificateBadgeBuilderModal
        isOpen={showBatchDesignerModal}
        onClose={() => setShowBatchDesignerModal(false)}
        members={members}
      />
    </div>
  );
};
