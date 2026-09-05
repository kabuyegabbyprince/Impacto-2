import React, { useState } from "react";
import {
  Sparkles,
  CreditCard,
  ShieldCheck,
  Package,
  Cpu,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Download,
  Award,
  Box,
  Layers,
  RefreshCw,
  QrCode,
  FileSignature,
  History,
  Wifi,
  WifiOff,
  Search,
  Filter,
  Users,
  Calendar,
  Check,
  CheckCircle,
  Clock,
  Eye,
  FileSpreadsheet,
  Trash2,
  Lock,
  Unlock
} from "lucide-react";
import { useOrgStore } from "../store/orgStore";
import { useMembers, useEvents, useAllEventAttendance, useCheckIn, useAuditLogs } from "../hooks/useImpactoData";
import { useToast } from "./Toast";
import { AssetTracker } from "./AssetTracker";
import { CertificateGenerator } from "./CertificateGenerator";
import { DigitalSignaturePad } from "./DigitalSignaturePad";
import { OfflineSyncIndicator } from "./OfflineSyncIndicator";
import { OfflineSyncService } from "../lib/offlineSyncService";
import { MockDB } from "../lib/mockData";
import { DocumentSignature } from "../types";

interface V2AdvancedFeaturesProps {
  orgId?: string;
  currentPlan?: string;
  memberCount?: number;
}

export const V2AdvancedFeatures: React.FC<V2AdvancedFeaturesProps> = ({
  orgId,
  currentPlan = "growth",
  memberCount = 12
}) => {
  const { activeOrg } = useOrgStore();
  const { addToast } = useToast();
  const { data: members = [] } = useMembers(activeOrg?.id);
  const { data: events = [] } = useEvents(activeOrg?.id);
  const { data: allAttendance = [] } = useAllEventAttendance(activeOrg?.id);
  const { data: auditLogs = [] } = useAuditLogs(activeOrg?.id);
  const checkInMutation = useCheckIn();

  const [activeTab, setActiveTab] = useState<
    "qr_attendance" | "certificates" | "assets" | "audit_trail" | "offline_sync" | "subscription" | "marketplace" | "ai"
  >("qr_attendance");

  // QR Attendance State
  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id || "");
  const [qrScanInput, setQrScanInput] = useState<string>("");
  const [qrScanning, setQrScanning] = useState(false);

  // Document Signing State
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signingDocTitle, setSigningDocTitle] = useState("2026 Cooperative Bylaws & Dividend Agreement");
  const [signingDocVersion, setSigningDocVersion] = useState(1);
  const [signedDocs, setSignedDocs] = useState<DocumentSignature[]>(() => MockDB.getDocumentSignatures());

  // Audit Logs State
  const [auditSearch, setAuditSearch] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("all");

  // AI Assistant State
  const [meetingNotes, setMeetingNotes] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("Monthly General Assembly");
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [ledgerEntries, setLedgerEntries] = useState(
    JSON.stringify(
      [
        { date: "2026-08-01", description: "Member monthly dues collection", amount: 150000, type: "income" },
        { date: "2026-08-10", description: "Office supplies & stationery", amount: 45000, type: "expense" },
        { date: "2026-08-25", description: "Unusual equipment purchase spike", amount: 850000, type: "expense" }
      ],
      null,
      2
    )
  );
  const [ledgerInsights, setLedgerInsights] = useState("");
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // pawaPay Modal State
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [phoneNumber, setPhoneNumber] = useState("250780000000");
  const [provider, setProvider] = useState("MTN_MOMO_RWA");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState<string | null>(null);

  // Curated Packages
  const packages = [
    {
      id: "gov-pack",
      name: "Governance & Compliance Pack",
      theme: "Governance",
      price: 25000,
      features: [
        "Cryptographic Document E-Signatures",
        "Full Audit Trail Historical Logs",
        "Official Certificate Studio"
      ],
      desc: "Ensure tamper-proof sign-offs, democratic assembly compliance, and full administrative auditability."
    },
    {
      id: "field-pack",
      name: "Field Operations & Asset Pack",
      theme: "Operations",
      price: 20000,
      features: [
        "QR Code Attendance Check-in",
        "Asset & Machinery Inventory Tracker",
        "PWA Offline Mode & Sync Queue"
      ],
      desc: "Equip agronomists and field extension officers with offline capability and instant QR verification."
    },
    {
      id: "fintech-pack",
      name: "Fintech & Financial Inclusion Pack",
      theme: "Finance",
      price: 30000,
      features: [
        "MTN / Airtel Mobile Money (pawaPay)",
        "Automated Dues Push Requests",
        "Excel Attendance & Ledger Export"
      ],
      desc: "Accelerate revenue collections with automated MoMo push-to-pay and standard Excel balance sheets."
    }
  ];

  // QR Attendance Handler
  const handleQrCheckIn = async (memberId: string) => {
    if (!selectedEventId) {
      addToast("Please select a scheduled event first", "error");
      return;
    }
    setQrScanning(true);
    try {
      if (OfflineSyncService.isOnline()) {
        await checkInMutation.mutateAsync({
          event_id: selectedEventId,
          member_id: memberId,
          method: "qr"
        });
      } else {
        OfflineSyncService.enqueue("CREATE", "event_attendance", {
          id: "att-" + Date.now(),
          event_id: selectedEventId,
          member_id: memberId,
          status: "present",
          check_in_time: new Date().toISOString()
        });
      }
      const member = members.find((m) => m.id === memberId);
      addToast(`QR Check-in confirmed for ${member?.user?.full_name || "Member"}!`, "success");
    } catch (err: any) {
      addToast(err.message || "QR Check-in failed", "error");
    } finally {
      setQrScanning(false);
      setQrScanInput("");
    }
  };

  const handleExportAttendanceExcel = () => {
    const currentEvent = events.find((e) => e.id === selectedEventId) || events[0];
    const headers = ["Member Name", "Member Email", "Role", "Event Title", "Check-in Status", "Timestamp"];
    const rows = members.map((m) => {
      const isPresent = allAttendance?.some((a) => a.member_id === m.id && (!currentEvent || a.event_id === currentEvent.id));
      return [
        `"${m.user?.full_name || ""}"`,
        `"${m.user?.email || ""}"`,
        m.role,
        `"${currentEvent?.title || "All Events"}"`,
        isPresent ? "PRESENT" : "ABSENT",
        new Date().toISOString()
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Attendance_${currentEvent?.title.replace(/\s+/g, "_") || "Session"}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("Attendance matrix exported to Excel successfully!", "success");
  };

  const handleExportAuditLogsCSV = () => {
    const headers = ["Timestamp", "Staff Name", "Role", "Action Type", "Target", "Details / Reference"];
    const rows = filteredAuditLogs.map((log: any) => [
      log.created_at || log.timestamp || "",
      `"${log.staff_name || log.performed_by || "System Admin"}"`,
      log.staff_role || "Administrator",
      log.action_type || log.action || "UPDATE",
      `"${log.target_org_name || log.target || ""}"`,
      `"${(log.notes || log.reference || log.details || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Audit_Logs_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("Historical audit trail exported to CSV/Excel!", "success");
  };

  const handleRunAiSummary = async () => {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/meeting-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: meetingTitle,
          notes: meetingNotes || "Discussed Q3 cooperative performance, new member onboarding, and upcoming harvest festival contributions."
        })
      });
      const data = await res.json();
      if (data.success) {
        setAiSummary(data.summary);
      } else {
        setAiSummary("Failed to generate summary: " + (data.error || "Unknown error"));
      }
    } catch (e: any) {
      setAiSummary("Error connecting to AI service: " + e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleRunLedgerInsights = async () => {
    setLedgerLoading(true);
    try {
      const parsed = JSON.parse(ledgerEntries);
      const res = await fetch("/api/ai/ledger-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: parsed })
      });
      const data = await res.json();
      if (data.success) {
        setLedgerInsights(data.insights);
      } else {
        setLedgerInsights("Failed to analyze ledger: " + (data.error || "Unknown"));
      }
    } catch (e: any) {
      setLedgerInsights("Invalid JSON or network error: " + e.message);
    } finally {
      setLedgerLoading(false);
    }
  };

  const handlePawaPayCheckout = async () => {
    setCheckoutLoading(true);
    setCheckoutSuccess(null);
    try {
      const res = await fetch("/api/payments/pawapay/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: orgId || activeOrg?.id || "default-org",
          amount: selectedPackage ? selectedPackage.price : 45000,
          currency: "RWF",
          phoneNumber,
          provider,
          clientReferenceId: selectedPackage ? `PKG-${selectedPackage.id}` : "UPGRADE-PRO"
        })
      });
      const data = await res.json();
      if (data.success) {
        setCheckoutSuccess(`Deposit initiated successfully! Deposit ID: ${data.depositId}. Please approve the MoMo PIN prompt on ${phoneNumber}.`);
        addToast("Mobile money payment request sent to your handset!", "success");
      } else {
        setCheckoutSuccess("Payment initiation failed: " + (data.error || "Unknown"));
      }
    } catch (err: any) {
      setCheckoutSuccess("Checkout network error: " + err.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const allLogs = (auditLogs.length > 0 ? auditLogs : MockDB.getPlatformAuditLogs()) || [];
  const filteredAuditLogs = allLogs.filter((log: any) => {
    const text = `${log.staff_name || ""} ${log.action_type || ""} ${log.notes || ""} ${log.reference || ""}`.toLowerCase();
    const matchesSearch = text.includes(auditSearch.toLowerCase());
    const matchesAction = auditActionFilter === "all" || log.action_type === auditActionFilter;
    return matchesSearch && matchesAction;
  });

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 max-w-7xl mx-auto my-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-6 mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" /> Impacto V2 Enterprise Engine
            </span>
            <OfflineSyncIndicator />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-display">
            V2 Advanced Features & Enterprise Extensions
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            QR attendance, digital certificates, equipment tracking, cryptographically sealed signatures, full audit logs, and PWA offline queue.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 bg-gray-100 dark:bg-gray-800/80 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab("qr_attendance")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === "qr_attendance"
                ? "bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            <QrCode className="h-3.5 w-3.5" /> QR Attendance
          </button>
          <button
            onClick={() => setActiveTab("certificates")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === "certificates"
                ? "bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            <Award className="h-3.5 w-3.5" /> Certificates
          </button>
          <button
            onClick={() => setActiveTab("assets")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === "assets"
                ? "bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            <Box className="h-3.5 w-3.5" /> Asset Tracker
          </button>
          <button
            onClick={() => setActiveTab("audit_trail")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === "audit_trail"
                ? "bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            <History className="h-3.5 w-3.5" /> Audit Trail
          </button>
          <button
            onClick={() => setActiveTab("subscription")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === "subscription"
                ? "bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" /> Plan & Trial
          </button>
          <button
            onClick={() => setActiveTab("marketplace")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === "marketplace"
                ? "bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            <Package className="h-3.5 w-3.5" /> Marketplace
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === "ai"
                ? "bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            <Cpu className="h-3.5 w-3.5" /> AI Assistant
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: QR ATTENDANCE & EXCEL EXPORT */}
      {/* ========================================================================= */}
      {activeTab === "qr_attendance" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Event Selection & QR Scanner Simulation */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800/40 p-5 rounded-2xl border border-gray-200 dark:border-gray-700/60 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-600 text-white">
                    <QrCode className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">QR Code Session Check-in</h3>
                    <p className="text-[11px] text-gray-500">Scan member physical badges or select for rapid check-in.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Select Scheduled Event</label>
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white"
                  >
                    {events.length === 0 && <option value="">Default General Assembly 2026</option>}
                    {events.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.title} ({e.date_time ? new Date(e.date_time).toLocaleDateString() : "Scheduled"})
                      </option>
                    ))}
                  </select>
                </div>

                {/* QR Code Graphic for Selected Event */}
                <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 text-center shadow-inner">
                  <span className="text-[10px] font-mono uppercase text-gray-400 block mb-2 font-bold">Official Event Station QR</span>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      `IMPACTO:EVENT:${selectedEventId || "general"}:${activeOrg?.id || "org"}`
                    )}`}
                    alt="Event QR"
                    className="h-36 w-36 mx-auto rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                  <p className="text-[10px] text-gray-500 mt-2">Display this QR at event venue entrance for self check-in.</p>
                </div>

                {/* Manual / Barcode Scanner Input */}
                <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Rapid QR / ID Scanner Input</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Scan badge or enter member ID..."
                      value={qrScanInput}
                      onChange={(e) => setQrScanInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && qrScanInput) {
                          const m = members.find((mem) => mem.id === qrScanInput || mem.member_number === qrScanInput || mem.user?.email === qrScanInput);
                          if (m) handleQrCheckIn(m.id);
                          else addToast("Member ID not found in directory", "error");
                        }
                      }}
                      className="flex-1 px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs"
                    />
                    <button
                      onClick={() => {
                        const m = members.find((mem) => mem.id === qrScanInput || mem.member_number === qrScanInput || mem.user?.email === qrScanInput) || members[0];
                        if (m) handleQrCheckIn(m.id);
                      }}
                      disabled={qrScanning}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                    >
                      {qrScanning ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Check-in
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Real-time Member Attendance Roster & Excel Export */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">Live Attendance Roll Call</h4>
                  <p className="text-xs text-gray-500">
                    {members.filter((m) => allAttendance?.some((a) => a.member_id === m.id)).length} of {members.length} members checked in
                  </p>
                </div>
                <button
                  onClick={handleExportAttendanceExcel}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm"
                >
                  <FileSpreadsheet className="h-4 w-4" /> Export Matrix to Excel (.xlsx/.csv)
                </button>
              </div>

              {/* Members Attendance List */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                  {members.map((m) => {
                    const isPresent = allAttendance?.some((a) => a.member_id === m.id);
                    return (
                      <div key={m.id} className="p-3.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/40 transition">
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full ${isPresent ? "bg-emerald-500 animate-pulse" : "bg-gray-300 dark:bg-gray-700"}`} />
                          <div>
                            <span className="font-bold text-xs text-gray-900 dark:text-white block">{m.user?.full_name || "Member"}</span>
                            <span className="text-[11px] text-gray-400 font-mono">
                              #{m.member_number || m.id.substring(0, 8)} • {m.role}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isPresent ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            }`}
                          >
                            {isPresent ? "PRESENT (QR Stamped)" : "ABSENT"}
                          </span>

                          <button
                            onClick={() => handleQrCheckIn(m.id)}
                            className="px-3 py-1 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/40 transition flex items-center gap-1"
                          >
                            <QrCode className="h-3 w-3" /> Quick Scan
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CERTIFICATE GENERATOR */}
      {/* ========================================================================= */}
      {activeTab === "certificates" && <CertificateGenerator members={members} />}

      {/* ========================================================================= */}
      {/* TAB 3: ASSET TRACKER */}
      {/* ========================================================================= */}
      {activeTab === "assets" && <AssetTracker members={members} />}

      {/* ========================================================================= */}
      {/* TAB 4: SECURE DOCUMENT SIGNATURES */}
      {/* ========================================================================= */}
      {activeTab === "signatures" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  <FileSignature className="h-5 w-5" />
                </span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white font-display">
                  Cryptographic Document Signing & Version Acknowledgement
                </h3>
              </div>
              <p className="text-xs text-gray-500">
                Collect legally binding digital signatures via touch, cursor, or uploaded image with tamper-evident cryptographic hashes.
              </p>
            </div>

            <button
              onClick={() => setShowSignaturePad(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
            >
              <FileSignature className="h-4 w-4" /> Open E-Signature Pad
            </button>
          </div>

          {/* Active Documents to Sign */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 dark:bg-gray-800/40 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-4">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                Pending Board Sign-off
              </span>
              <h4 className="text-base font-bold text-gray-900 dark:text-white">
                Cooperative Dividend Distribution & Reserve Policy 2026
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Requires mandatory signature acknowledgement of Version 2.0 regarding Article 44 statutory reserve allocations.
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700 text-xs">
                <span className="text-gray-400">Version 2.0 • 4 pages</span>
                <button
                  onClick={() => {
                    setSigningDocTitle("Cooperative Dividend Distribution & Reserve Policy 2026");
                    setSigningDocVersion(2);
                    setShowSignaturePad(true);
                  }}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
                >
                  Sign Document
                </button>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/40 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-4">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                General Assembly Resolution
              </span>
              <h4 className="text-base font-bold text-gray-900 dark:text-white">
                Solar Irrigation Capital Equipment Loan Resolution
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Quorum verified resolution authorizing purchase of solar pump units with member equity contributions.
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700 text-xs">
                <span className="text-gray-400">Version 1.0 • 2 pages</span>
                <button
                  onClick={() => {
                    setSigningDocTitle("Solar Irrigation Capital Equipment Loan Resolution");
                    setSigningDocVersion(1);
                    setShowSignaturePad(true);
                  }}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
                >
                  Sign Document
                </button>
              </div>
            </div>
          </div>

          {/* Signed Registry */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
            <h4 className="font-bold text-sm text-gray-900 dark:text-white">Tamper-evident Digital Signature Registry</h4>
            {signedDocs.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No signatures registered yet. Sign a document above.</p>
            ) : (
              <div className="space-y-3">
                {signedDocs.map((sig) => (
                  <div key={sig.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {sig.signature_data_url && (
                        <img src={sig.signature_data_url} alt="Signature" className="h-10 max-w-[120px] object-contain bg-white dark:bg-black rounded-lg p-1 border" />
                      )}
                      <div>
                        <span className="font-bold text-xs text-gray-900 dark:text-white block">{sig.signer_name}</span>
                        <span className="text-[11px] text-gray-500 font-mono">
                          Role: {sig.signer_role} • Hash: {sig.verification_hash || "SIG-VERIFIED"}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-emerald-600 font-bold">{new Date(sig.signed_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Digital Signature Pad Modal */}
          <DigitalSignaturePad
            isOpen={showSignaturePad}
            onClose={() => setShowSignaturePad(false)}
            documentTitle={signingDocTitle}
            documentVersion={signingDocVersion}
            signerName={members[0]?.user?.full_name || "Authorized Signatory"}
            signerRole={members[0]?.role || "Executive Board Member"}
            onSignComplete={(data) => {
              const newSig: DocumentSignature = {
                id: "sig-" + Date.now(),
                document_id: "doc-sample",
                member_id: members[0]?.id || "mem-1",
                org_id: activeOrg?.id || "default-org",
                signer_name: data.signerName,
                signer_role: data.signerRole,
                signature_type: data.signatureType,
                signature_data_url: data.signatureDataUrl,
                document_version: data.documentVersion,
                verification_hash: data.verificationHash,
                signed_at: data.signedAt
              };
              const updated = [newSig, ...signedDocs];
              setSignedDocs(updated);
              MockDB.saveDocumentSignatures(updated);
              addToast("Document legally signed and registered with hash " + data.verificationHash, "success");
            }}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: FULL AUDIT TRAIL HISTORICAL LOGS */}
      {/* ========================================================================= */}
      {activeTab === "audit_trail" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  <History className="h-5 w-5" />
                </span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white font-display">
                  Full Administrative Audit Trail & Event Logs
                </h3>
              </div>
              <p className="text-xs text-gray-500">
                Immutable, timestamped audit log of all financial approvals, membership changes, subscription events, and data modifications.
              </p>
            </div>

            <button
              onClick={handleExportAuditLogsCSV}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
            >
              <Download className="h-4 w-4" /> Export Audit Log (CSV)
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by actor, action type, reference code, or target..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-900 dark:text-white"
              />
            </div>
            <select
              value={auditActionFilter}
              onChange={(e) => setAuditActionFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300"
            >
              <option value="all">All Actions</option>
              <option value="verify_payment">Payment Verifications</option>
              <option value="approve_subscription">Subscription Approvals</option>
              <option value="member_status_change">Member Status Changes</option>
              <option value="ledger_entry">Ledger Updates</option>
            </select>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Actor (Staff / User)</th>
                    <th className="p-4">Action Type</th>
                    <th className="p-4">Target Organization</th>
                    <th className="p-4">Details / Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-gray-400">
                        <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-xs font-semibold">No audit logs matching query</p>
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log: any, index: number) => (
                      <tr key={log.id || index} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition">
                        <td className="p-4 font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {log.created_at ? new Date(log.created_at).toLocaleString() : new Date().toLocaleString()}
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-gray-900 dark:text-white block">{log.staff_name || "System Executive"}</span>
                          <span className="text-[10px] text-gray-400 capitalize">{log.staff_role || "Administrator"}</span>
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 uppercase">
                            {log.action_type || "ACTION"}
                          </span>
                        </td>
                        <td className="p-4 text-gray-700 dark:text-gray-300 font-medium">{log.target_org_name || activeOrg?.name || "Active Org"}</td>
                        <td className="p-4 text-gray-600 dark:text-gray-400 max-w-xs truncate">
                          {log.notes || log.reference || log.details || "Verified successfully"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: SUBSCRIPTION & TRIAL LIFECYCLE */}
      {/* ========================================================================= */}
      {activeTab === "subscription" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl border-2 border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 relative shadow-sm">
              <span className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                Active 30-Day Trial
              </span>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Growth Plan Trial</h3>
              <p className="text-xs text-gray-500 mt-1">Default 30-day trial with full access to QR attendance, asset tracker, certificates, and dues.</p>
              <div className="mt-4 text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">24 Days Remaining</div>
              <p className="text-[11px] text-emerald-600 mt-1 font-medium">+ 3-Day Grace Period Upon Expiry</p>
              <button
                onClick={() => {
                  setSelectedPackage(null);
                  setShowCheckout(true);
                }}
                className="mt-6 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition shadow-sm"
              >
                Upgrade to Pro (Unlimited Storage)
              </button>
            </div>

            <div className="p-6 rounded-3xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40">
              <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 mb-2">
                Free Forever Tier
              </span>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Free Community Plan</h3>
              <p className="text-xs text-gray-500 mt-1">Capped at 30 members. Excess records locked until upgraded.</p>
              <div className="mt-4 text-xs font-semibold text-gray-700 dark:text-gray-300">
                Roster Cap: {memberCount} / 30 Members
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full mt-2 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, (memberCount / 30) * 100)}%` }} />
              </div>
              <div className="mt-6 w-full py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-xl font-bold text-xs text-center">
                Fallback Tier
              </div>
            </div>

            <div className="p-6 rounded-3xl border-2 border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-sm">
              <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-600 text-white mb-2">
                Enterprise Co-op Tier
              </span>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Full Cooperative ERP</h3>
              <p className="text-xs text-gray-500 mt-1">Unlimited branches, multi-officer sign-offs, and dedicated SLA.</p>
              <div className="mt-4 text-2xl font-extrabold text-indigo-700 dark:text-indigo-300">
                120,000 RWF <span className="text-xs font-normal">/mo</span>
              </div>
              <button
                onClick={() => {
                  setSelectedPackage({ id: "enterprise", name: "Enterprise Plan", price: 120000 });
                  setShowCheckout(true);
                }}
                className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition shadow-sm"
              >
                Subscribe via pawaPay MoMo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: MARKETPLACE PACKAGES */}
      {/* ========================================================================= */}
      {activeTab === "marketplace" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Curated Impacto Feature Packs (2-4 Add-ons)</h3>
              <p className="text-xs text-gray-500">Packs claimed on Free plan automatically expire after 30 days. Instant resumption on paid renewal.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {packages.map((pkg) => (
              <div key={pkg.id} className="bg-gray-50 dark:bg-gray-800/40 rounded-3xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200">
                      {pkg.theme}
                    </span>
                    <span className="font-extrabold text-lg text-emerald-600">{pkg.price.toLocaleString()} RWF</span>
                  </div>
                  <h4 className="font-bold text-gray-900 dark:text-white text-base mb-1">{pkg.name}</h4>
                  <p className="text-xs text-gray-500 mb-4 leading-relaxed">{pkg.desc}</p>
                  <ul className="space-y-2 mb-6">
                    {pkg.features.map((f, i) => (
                      <li key={i} className="text-xs flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={() => {
                    setSelectedPackage(pkg);
                    setShowCheckout(true);
                  }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <CreditCard className="h-4 w-4" /> Activate via pawaPay MoMo
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: SMART AI ASSISTANT & LEDGER INSIGHTS */}
      {/* ========================================================================= */}
      {activeTab === "ai" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-50 dark:bg-gray-800/40 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 space-y-4">
            <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-600" /> Smart Meeting Summarizer
            </h3>
            <p className="text-xs text-gray-500">Automatically summarize democratic assembly discussions into key resolutions and tasks.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Meeting Title</label>
                <input
                  type="text"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Raw Discussion Notes</label>
                <textarea
                  rows={4}
                  value={meetingNotes}
                  onChange={(e) => setMeetingNotes(e.target.value)}
                  placeholder="Paste rough notes, member motions, and voting outcomes here..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white"
                />
              </div>
              <button
                onClick={handleRunAiSummary}
                disabled={aiLoading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm"
              >
                {aiLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate Executive Resolutions
              </button>
              {aiSummary && (
                <div className="mt-4 p-4 rounded-xl bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800 text-xs whitespace-pre-wrap leading-relaxed text-gray-800 dark:text-gray-200">
                  {aiSummary}
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/40 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 space-y-4">
            <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
              <Cpu className="h-5 w-5 text-emerald-600" /> Ledger & Anomaly Detector
            </h3>
            <p className="text-xs text-gray-500">Detect anomalous spending spikes or missing receipt attachments in cooperative books.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Ledger Entries (JSON Format)</label>
                <textarea
                  rows={5}
                  value={ledgerEntries}
                  onChange={(e) => setLedgerEntries(e.target.value)}
                  className="w-full font-mono text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
              <button
                onClick={handleRunLedgerInsights}
                disabled={ledgerLoading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm"
              >
                {ledgerLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Analyze Financial Books
              </button>
              {ledgerInsights && (
                <div className="mt-4 p-4 rounded-xl bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800 text-xs whitespace-pre-wrap leading-relaxed text-gray-800 dark:text-gray-200">
                  {ledgerInsights}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAWAPAY CHECKOUT MODAL */}
      {/* ========================================================================= */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 max-w-md w-full border border-gray-200 dark:border-gray-800 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
              <CreditCard className="h-5 w-5 text-emerald-600" /> pawaPay Mobile Money Checkout
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              {selectedPackage ? `Purchasing ${selectedPackage.name}` : "Upgrading to Pro Tier (Unlimited Capacity)"} —{" "}
              <strong className="text-emerald-600 font-bold">{selectedPackage ? selectedPackage.price.toLocaleString() : "45,000"} RWF</strong>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Mobile Money Number</label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="250780000000"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs font-mono text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Telecom Network</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white"
                >
                  <option value="MTN_MOMO_RWA">MTN Mobile Money Rwanda (*182#)</option>
                  <option value="AIRTEL_MONEY_RWA">Airtel Money Rwanda (*182#)</option>
                </select>
              </div>

              {checkoutSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs leading-relaxed">
                  {checkoutSuccess}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCheckout(false)}
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs transition hover:bg-gray-200"
                >
                  Close
                </button>
                <button
                  onClick={handlePawaPayCheckout}
                  disabled={checkoutLoading}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm"
                >
                  {checkoutLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  Confirm MoMo Deposit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
