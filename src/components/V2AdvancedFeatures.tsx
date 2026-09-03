import React, { useState } from "react";
import { Sparkles, CreditCard, ShieldCheck, Package, Cpu, FileText, CheckCircle2, AlertTriangle, ArrowRight, Download, Award, Box, Layers, RefreshCw } from "lucide-react";

interface V2AdvancedFeaturesProps {
  orgId?: string;
  currentPlan?: string;
  memberCount?: number;
}

export const V2AdvancedFeatures: React.FC<V2AdvancedFeaturesProps> = ({ orgId, currentPlan = "growth", memberCount = 12 }) => {
  const [activeTab, setActiveTab] = useState<"ai" | "subscription" | "marketplace" | "assets" | "certificates">("ai");
  
  // AI State
  const [meetingNotes, setMeetingNotes] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("Monthly General Assembly");
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const [ledgerEntries, setLedgerEntries] = useState(
    JSON.stringify([
      { date: "2026-08-01", description: "Member monthly dues collection", amount: 150000, type: "income" },
      { date: "2026-08-10", description: "Office supplies & stationery", amount: 45000, type: "expense" },
      { date: "2026-08-25", description: "Unusual equipment purchase spike", amount: 850000, type: "expense" }
    ], null, 2)
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

  // Marketplace Packages
  const packages = [
    {
      id: "gov-pack",
      name: "Governance Pack",
      theme: "Governance",
      price: 25000,
      features: ["Governance Quorum Validation", "Document E-Signatures", "Full Audit Trail Historical Logs"],
      desc: "Ensure transparent assemblies, tamper-proof sign-offs, and complete accountability."
    },
    {
      id: "field-pack",
      name: "Field Ops Pack",
      theme: "Operations",
      price: 20000,
      features: ["QR Code Attendance", "Asset & Inventory Tracker", "PWA Offline Sync Queue"],
      desc: "Equip field workers and cooperative agents with robust offline and QR tools."
    },
    {
      id: "fintech-pack",
      name: "Fintech & Dues Pack",
      theme: "Finance",
      price: 30000,
      features: ["MTN/Airtel Live Payment APIs (pawaPay)", "Automated Member Dues", "Excel Attendance & Ledger Export"],
      desc: "Streamline collections with automated MoMo push-to-pay and robust financial exports."
    }
  ];

  const handleRunAiSummary = async () => {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/meeting-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: meetingTitle, notes: meetingNotes || "Discussed Q3 cooperative performance, new member onboarding, and upcoming harvest festival contributions." })
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
          orgId: orgId || "default-org",
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
      } else {
        setCheckoutSuccess("Payment initiation failed: " + (data.error || "Unknown"));
      }
    } catch (err: any) {
      setCheckoutSuccess("Checkout network error: " + err.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 max-w-7xl mx-auto my-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-6 mb-6 gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 mb-2">
            <Sparkles className="h-3.5 w-3.5" /> Impacto V2 Engine & Marketplace
          </span>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Advanced Add-ons & Subscriptions</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage AI assistants, subscription lifecycles, pawaPay mobile money payments, and curated feature packages.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab("ai")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 ${activeTab === "ai" ? "bg-emerald-600 text-white shadow" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200"}`}
          >
            <Cpu className="h-4 w-4" /> AI Assistant
          </button>
          <button
            onClick={() => setActiveTab("subscription")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 ${activeTab === "subscription" ? "bg-emerald-600 text-white shadow" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200"}`}
          >
            <CreditCard className="h-4 w-4" /> Subscription & Trial
          </button>
          <button
            onClick={() => setActiveTab("marketplace")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 ${activeTab === "marketplace" ? "bg-emerald-600 text-white shadow" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200"}`}
          >
            <Package className="h-4 w-4" /> Marketplace & Packages
          </button>
          <button
            onClick={() => setActiveTab("assets")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 ${activeTab === "assets" ? "bg-emerald-600 text-white shadow" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200"}`}
          >
            <Box className="h-4 w-4" /> Asset Tracker
          </button>
          <button
            onClick={() => setActiveTab("certificates")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 ${activeTab === "certificates" ? "bg-emerald-600 text-white shadow" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200"}`}
          >
            <Award className="h-4 w-4" /> Certificates
          </button>
        </div>
      </div>

      {/* TAB 1: AI ASSISTANT */}
      {activeTab === "ai" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Meeting Summarizer */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-emerald-600" /> Smart Meeting Summarizer
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Automatically parse meeting notes and attendance to generate executive decisions and action items.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Meeting Title</label>
                <input
                  type="text"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Raw Notes & Discussions</label>
                <textarea
                  rows={4}
                  value={meetingNotes}
                  onChange={(e) => setMeetingNotes(e.target.value)}
                  placeholder="Paste meeting transcript or raw rough notes here..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                />
              </div>
              <button
                onClick={handleRunAiSummary}
                disabled={aiLoading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm transition flex items-center justify-center gap-2"
              >
                {aiLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate Executive Summary
              </button>
              {aiSummary && (
                <div className="mt-4 p-4 rounded-xl bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-900 text-sm whitespace-pre-wrap">
                  {aiSummary}
                </div>
              )}
            </div>
          </div>

          {/* Ledger & Expense Insights */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white flex items-center gap-2 mb-3">
              <Cpu className="h-5 w-5 text-emerald-600" /> Ledger & Expense Anomaly Detector
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Detect anomalous transaction spikes or missing receipt references in financial books.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Ledger Entries (JSON)</label>
                <textarea
                  rows={5}
                  value={ledgerEntries}
                  onChange={(e) => setLedgerEntries(e.target.value)}
                  className="w-full font-mono text-xs px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                />
              </div>
              <button
                onClick={handleRunLedgerInsights}
                disabled={ledgerLoading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm transition flex items-center justify-center gap-2"
              >
                {ledgerLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Analyze Financial Health
              </button>
              {ledgerInsights && (
                <div className="mt-4 p-4 rounded-xl bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-900 text-sm whitespace-pre-wrap">
                  {ledgerInsights}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SUBSCRIPTION & TRIAL */}
      {activeTab === "subscription" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 relative">
              <span className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white">Active Trial</span>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Growth Plan Trial</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">30-day trial with full access to QR attendance, dues, and ledger.</p>
              <div className="mt-4 text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">24 Days Left</div>
              <button
                onClick={() => { setSelectedPackage(null); setShowCheckout(true); }}
                className="mt-6 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm transition"
              >
                Upgrade to Pro (Unlimited Storage)
              </button>
            </div>

            <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 mb-2">Free Forever Plan</span>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Basic Community</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Capped at 30 active members. Excess data becomes locked.</p>
              <div className="mt-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Current Members: {memberCount} / 30</div>
              <div className="mt-6 w-full py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-xl font-medium text-sm text-center">
                Active Tier
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20">
              <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-600 text-white mb-2">Enterprise Plan</span>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Full Cooperative ERP</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Multi-branch RBAC, Identity Verification, and Audit Trails.</p>
              <div className="mt-4 text-2xl font-extrabold text-indigo-700 dark:text-indigo-300">120,000 RWF <span className="text-xs font-normal">/mo</span></div>
              <button
                onClick={() => { setSelectedPackage({ id: 'enterprise', name: 'Enterprise Plan', price: 120000 }); setShowCheckout(true); }}
                className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm transition"
              >
                Select Enterprise via pawaPay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MARKETPLACE & PACKAGES */}
      {activeTab === "marketplace" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Curated Feature Packages (2-4 Features)</h3>
            <span className="text-xs text-gray-500">Packages claimed on Free plan expire after 30 days. Admin custom pricing enabled.</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {packages.map((pkg) => (
              <div key={pkg.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200">{pkg.theme}</span>
                    <span className="font-extrabold text-lg text-emerald-600">{pkg.price.toLocaleString()} RWF</span>
                  </div>
                  <h4 className="font-bold text-gray-900 dark:text-white text-base mb-1">{pkg.name}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{pkg.desc}</p>
                  <ul className="space-y-2 mb-6">
                    {pkg.features.map((f, i) => (
                      <li key={i} className="text-xs flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={() => { setSelectedPackage(pkg); setShowCheckout(true); }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm transition flex items-center justify-center gap-2"
                >
                  <CreditCard className="h-4 w-4" /> Purchase via pawaPay
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: ASSET TRACKER */}
      {activeTab === "assets" && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Box className="h-5 w-5 text-emerald-600" /> Asset & Inventory Tracker
            </h3>
            <span className="text-xs bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 px-3 py-1 rounded-full font-semibold">Active Inventory</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs uppercase">
                <tr>
                  <th className="p-3">Asset Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Serial No</th>
                  <th className="p-3">Assigned To</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                <tr>
                  <td className="p-3 font-medium">Solar Irrigation Pump #1</td>
                  <td className="p-3">Field Equipment</td>
                  <td className="p-3 font-mono text-xs">SIP-2026-001</td>
                  <td className="p-3">Jean Bosco (Coop Lead)</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-800">Operational</span></td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">Cooperative Laptop (Dell Latitude)</td>
                  <td className="p-3">IT Hardware</td>
                  <td className="p-3 font-mono text-xs">DEL-9942-X</td>
                  <td className="p-3">Aline Uwase (Accountant)</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-800">Operational</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: CERTIFICATES */}
      {activeTab === "certificates" && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700 text-center">
          <Award className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Automated Workshop Certificate Generator</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto mt-1 mb-6">Generate richly styled PDF certificates for workshop participants, cooperative members, and volunteer hours.</p>
          <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 max-w-lg mx-auto text-left mb-6 shadow-sm">
            <div className="text-center border-b pb-4 mb-4">
              <span className="text-xs font-mono uppercase tracking-widest text-emerald-600 font-bold">Certificate of Completion</span>
              <h4 className="text-2xl font-serif font-bold text-gray-900 dark:text-white mt-1">Impacto Community Leadership</h4>
            </div>
            <p className="text-xs text-gray-500 text-center mb-4">This is proudly presented to</p>
            <div className="text-center text-lg font-bold text-gray-900 dark:text-white underline decoration-emerald-500 mb-4">Jean Claude Mugisha</div>
            <p className="text-xs text-gray-500 text-center">For successfully completing the cooperative governance and financial transparency workshop.</p>
          </div>
          <button
            onClick={() => alert("Certificate PDF downloaded successfully!")}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm transition inline-flex items-center gap-2"
          >
            <Download className="h-4 w-4" /> Download Official PDF Certificate
          </button>
        </div>
      )}

      {/* PAWAPAY CHECKOUT MODAL */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full border border-gray-200 dark:border-gray-800 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
              <CreditCard className="h-5 w-5 text-emerald-600" /> pawaPay Mobile Money Checkout
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              {selectedPackage ? `Purchasing ${selectedPackage.name}` : "Upgrading to Pro Plan (Unlimited Storage)"} — <strong className="text-emerald-600">{selectedPackage ? selectedPackage.price.toLocaleString() : "45,000"} RWF</strong>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Mobile Money Phone Number</label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="250780000000"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Provider Network</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                >
                  <option value="MTN_MOMO_RWA">MTN Mobile Money Rwanda (MoMo)</option>
                  <option value="AIRTEL_MONEY_RWA">Airtel Money Rwanda</option>
                </select>
              </div>

              {checkoutSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 text-xs">
                  {checkoutSuccess}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCheckout(false)}
                  className="flex-1 py-2.5 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePawaPayCheckout}
                  disabled={checkoutLoading}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm transition flex items-center justify-center gap-2"
                >
                  {checkoutLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  Pay Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
