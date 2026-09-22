import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Users,
  Shield,
  Trash2,
  ArrowRight,
  Sparkles,
  Lock,
  RefreshCw,
  Mail
} from "lucide-react";
import { Modal, Button, Badge } from "./ui";
import { useToast } from "./Toast";
import { useCreateMember } from "../hooks/useImpactoData";
import { useOrgStore } from "../store/orgStore";
import { SubscriptionTier } from "../lib/subscriptionMatrix";

export interface BulkMemberInviteModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  activeMembersCount: number;
  currentLimit: number;
  orgTier: string;
  existingEmails: string[];
}

export interface ParsedCandidate {
  id: string;
  fullName: string;
  email: string;
  role: "member" | "org_admin";
  phone?: string;
  memberNumber?: string;
  isValidEmail: boolean;
  isExisting: boolean;
  isDuplicateInBatch: boolean;
  exceedsQuota: boolean;
  errorMessage?: string;
}

export const BulkMemberInviteModal: React.FC<BulkMemberInviteModalProps> = ({
  open,
  onClose,
  onSuccess,
  activeMembersCount,
  currentLimit,
  orgTier,
  existingEmails
}) => {
  const { addToast } = useToast();
  const { activeOrg } = useOrgStore();
  const createMemberMutation = useCreateMember();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [inputTab, setInputTab] = useState<"csv" | "text">("csv");
  const [textInput, setTextInput] = useState("");
  const [defaultRole, setDefaultRole] = useState<"member" | "org_admin">("member");
  const [candidates, setCandidates] = useState<ParsedCandidate[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const isUnlimited = currentLimit === Infinity || currentLimit >= 99999;
  const remainingQuota = isUnlimited ? 999999 : Math.max(0, currentLimit - activeMembersCount);
  const usagePercentage = isUnlimited
    ? 0
    : Math.min(100, Math.round((activeMembersCount / currentLimit) * 100));

  // Email format regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Process raw candidate list against constraints
  const recomputeValidation = (items: Array<{ fullName: string; email: string; role?: "member" | "org_admin"; phone?: string; memberNumber?: string }>) => {
    const seenInBatch = new Set<string>();
    const existingLower = new Set(existingEmails.map(e => e.toLowerCase().trim()));

    let validCountSoFar = 0;

    const parsed: ParsedCandidate[] = items.map((item, idx) => {
      const cleanEmail = item.email.trim().toLowerCase();
      const isValidFormat = emailRegex.test(cleanEmail);
      const isExisting = existingLower.has(cleanEmail);
      const isDuplicateInBatch = seenInBatch.has(cleanEmail);
      if (cleanEmail) seenInBatch.add(cleanEmail);

      const isEligible = isValidFormat && !isExisting && !isDuplicateInBatch;
      let exceedsQuota = false;

      if (isEligible) {
        validCountSoFar++;
        if (!isUnlimited && validCountSoFar > remainingQuota) {
          exceedsQuota = true;
        }
      }

      let errorMsg = "";
      if (!isValidFormat) errorMsg = "Invalid email format";
      else if (isExisting) errorMsg = "Already an active member";
      else if (isDuplicateInBatch) errorMsg = "Duplicate in this batch";
      else if (exceedsQuota) errorMsg = `Exceeds active tier cap (${currentLimit} seats max)`;

      return {
        id: `cand-${idx}-${cleanEmail || Math.random().toString(36).substring(2, 7)}`,
        fullName: item.fullName.trim() || cleanEmail.split("@")[0] || `Member ${idx + 1}`,
        email: cleanEmail,
        role: item.role || defaultRole,
        phone: item.phone,
        memberNumber: item.memberNumber,
        isValidEmail: isValidFormat,
        isExisting,
        isDuplicateInBatch,
        exceedsQuota,
        errorMessage: errorMsg
      };
    });

    setCandidates(parsed);
  };

  // CSV text parsing
  const parseCSVContent = (content: string) => {
    const lines = content.split(/\r\n|\n|\r/).filter(l => l.trim().length > 0);
    if (lines.length === 0) {
      addToast("The uploaded file appears to be empty.", "error");
      return;
    }

    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes("email") || firstLine.includes("name") || firstLine.includes("role");
    const dataRows = hasHeader ? lines.slice(1) : lines;

    // Header index determination
    let nameIdx = -1;
    let emailIdx = -1;
    let roleIdx = -1;
    let phoneIdx = -1;
    let numIdx = -1;

    if (hasHeader) {
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/['"]/g, ""));
      headers.forEach((h, i) => {
        if (h.includes("name") || h.includes("full")) nameIdx = i;
        else if (h.includes("email") || h.includes("mail")) emailIdx = i;
        else if (h.includes("role") || h.includes("type")) roleIdx = i;
        else if (h.includes("phone") || h.includes("tel")) phoneIdx = i;
        else if (h.includes("number") || h.includes("id")) numIdx = i;
      });
    }

    // Default if no header matched
    if (emailIdx === -1) {
      emailIdx = 0;
      nameIdx = 1;
    }

    const items = dataRows.map(line => {
      const parts = line.split(",").map(p => p.trim().replace(/^["']|["']$/g, ""));
      const rawEmail = parts[emailIdx] || "";
      const rawName = nameIdx !== -1 && parts[nameIdx] ? parts[nameIdx] : rawEmail.split("@")[0] || "";
      const rawRole = roleIdx !== -1 && parts[roleIdx]?.toLowerCase().includes("admin") ? "org_admin" : defaultRole;
      const phone = phoneIdx !== -1 ? parts[phoneIdx] : undefined;
      const memberNumber = numIdx !== -1 ? parts[numIdx] : undefined;

      return {
        fullName: rawName,
        email: rawEmail,
        role: rawRole as "member" | "org_admin",
        phone,
        memberNumber
      };
    }).filter(item => item.email.length > 0);

    if (items.length === 0) {
      addToast("No valid email rows detected in CSV.", "error");
      return;
    }

    recomputeValidation(items);
    addToast(`Successfully parsed ${items.length} candidate rows from CSV.`, "info");
  };

  // Plaintext parsing (emails separated by comma, semicolon, space, or newline)
  const parseManualText = () => {
    if (!textInput.trim()) {
      addToast("Please enter or paste at least one email address.", "error");
      return;
    }

    // Matches 'Full Name <email@domain>' or standard 'email@domain' or 'name, email'
    const lines = textInput.split(/[\n;]/).map(l => l.trim()).filter(l => l.length > 0);
    const items: Array<{ fullName: string; email: string; role: "member" | "org_admin" }> = [];

    lines.forEach(line => {
      // Check for comma separated within line
      const subParts = line.includes(",") && !line.includes("<") ? line.split(",") : [line];
      subParts.forEach(entry => {
        const trimmed = entry.trim();
        if (!trimmed) return;

        // Pattern: Name <email@domain.com>
        const angleMatch = trimmed.match(/^([^<]+)<([^>]+)>$/);
        if (angleMatch) {
          items.push({
            fullName: angleMatch[1].trim(),
            email: angleMatch[2].trim(),
            role: defaultRole
          });
          return;
        }

        // Just pure email
        const words = trimmed.split(/\s+/);
        const emailFound = words.find(w => emailRegex.test(w.replace(/[<>,;]/g, "")));
        if (emailFound) {
          const cleanEmail = emailFound.replace(/[<>,;]/g, "");
          const namePart = words.filter(w => w !== emailFound).join(" ");
          items.push({
            fullName: namePart || cleanEmail.split("@")[0],
            email: cleanEmail,
            role: defaultRole
          });
        } else {
          // Put raw entry to be flagged by email validator
          items.push({
            fullName: trimmed.split("@")[0] || trimmed,
            email: trimmed,
            role: defaultRole
          });
        }
      });
    });

    if (items.length === 0) {
      addToast("No email addresses identified in text input.", "error");
      return;
    }

    recomputeValidation(items);
    addToast(`Extracted ${items.length} candidate entries for validation.`, "info");
  };

  // CSV File Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFile(file);
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      parseCSVContent(content);
    };
    reader.readAsText(file);
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      readFile(e.dataTransfer.files[0]);
    }
  };

  // Download Sample CSV template
  const handleDownloadSampleCSV = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "Full Name,Email,Role,Phone,Member Number\n" +
      "Emmanuel Mugisha,emmanuel.m@example.com,member,+250788123456,MEM-001\n" +
      "Aline Mukamana,aline.muk@example.com,member,+250788234567,MEM-002\n" +
      "Jean Paul Habimana,jp.habimana@example.com,org_admin,+250788345678,MEM-003\n" +
      "Claudine Uwase,claudine.u@example.com,member,+250788456789,MEM-004";

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `impacto_bulk_invite_template_${activeOrg?.slug || "org"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Auto-trim list to remaining quota
  const handleAutoTrimToQuota = () => {
    const readyItems = candidates.filter(c => c.isValidEmail && !c.isExisting && !c.isDuplicateInBatch);
    const trimmedReady = readyItems.slice(0, remainingQuota);
    const invalidItems = candidates.filter(c => !c.isValidEmail || c.isExisting || c.isDuplicateInBatch);

    // Recompute with trimmed subset
    recomputeValidation([...trimmedReady, ...invalidItems]);
    addToast(`List adjusted to fit within your remaining tier capacity (${remainingQuota} slots).`, "info");
  };

  // Remove single row
  const handleRemoveRow = (id: string) => {
    const updated = candidates.filter(c => c.id !== id);
    recomputeValidation(updated);
  };

  // Change single row role
  const handleRowRoleChange = (id: string, newRole: "member" | "org_admin") => {
    setCandidates(prev =>
      prev.map(c => (c.id === id ? { ...c, role: newRole } : c))
    );
  };

  // Filter ready to invite
  const readyToInvite = candidates.filter(
    c => c.isValidEmail && !c.isExisting && !c.isDuplicateInBatch && !c.exceedsQuota
  );
  const overQuotaCount = candidates.filter(c => c.exceedsQuota).length;
  const invalidCount = candidates.filter(c => !c.isValidEmail).length;
  const duplicateCount = candidates.filter(c => c.isExisting || c.isDuplicateInBatch).length;

  // Execute bulk dispatch
  const handleDispatchBulkInvites = async () => {
    if (readyToInvite.length === 0) {
      addToast("No eligible candidate invites found to process.", "error");
      return;
    }

    if (!isUnlimited && readyToInvite.length > remainingQuota) {
      addToast(
        `Action Blocked: Inviting ${readyToInvite.length} members exceeds your plan capacity. Please trim to ${remainingQuota} or upgrade your tier.`,
        "error"
      );
      return;
    }

    setIsProcessing(true);
    setProcessedCount(0);
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < readyToInvite.length; i++) {
      const item = readyToInvite[i];
      try {
        await createMemberMutation.mutateAsync({
          orgId: activeOrg?.id || "",
          email: item.email,
          fullName: item.fullName,
          role: item.role
        });
        successCount++;
      } catch (err) {
        console.error("Invite error for:", item.email, err);
        failedCount++;
      }
      setProcessedCount(i + 1);
    }

    setIsProcessing(false);

    if (successCount > 0) {
      addToast(
        `Successfully invited ${successCount} new members to ${activeOrg?.name}!`,
        "success"
      );
      onSuccess?.();
      onClose();
      // Reset state
      setCandidates([]);
      setTextInput("");
    } else {
      addToast(`Failed to dispatch member invites (${failedCount} errors).`, "error");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Bulk Member Invite & Tier Capacity Validator"
      maxWidth="max-w-3xl"
    >
      <div className="flex flex-col gap-5 text-left font-sans select-none">
        {/* Tier Capacity Status Meter */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col gap-3 shadow-3xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono">
                Active Tier Quota
              </span>
              <Badge color={orgTier === "growth" ? "emerald" : orgTier === "starter" ? "blue" : orgTier === "enterprise" || orgTier === "pro" ? "purple" : "amber"}>
                {orgTier.toUpperCase()} PLAN
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Active: <strong className="text-slate-800 dark:text-slate-100">{activeMembersCount}</strong> / {isUnlimited ? "Unlimited" : currentLimit}
              </span>
              <span className={`font-bold ${remainingQuota > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                {isUnlimited ? "Unlimited Slots" : `${remainingQuota} Slots Available`}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          {!isUnlimited && (
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  usagePercentage > 90
                    ? "bg-rose-500"
                    : usagePercentage > 70
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
          )}

          {remainingQuota === 0 && !isUnlimited && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Lock className="h-4 w-4 shrink-0 text-rose-600" />
                <span>Plan Quota Reached. Upgrade tier to invite additional cooperative members.</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Methods Tab Switcher */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setInputTab("csv")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                inputTab === "csv"
                  ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 shadow-3xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              CSV Spreadsheet Upload
            </button>
            <button
              type="button"
              onClick={() => setInputTab("text")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                inputTab === "text"
                  ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 shadow-3xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Mail className="h-3.5 w-3.5" />
              Paste Email List
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownloadSampleCSV}
            className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <Download className="h-3 w-3" />
            Download Sample CSV
          </button>
        </div>

        {/* TAB 1: CSV Upload Interface */}
        {inputTab === "csv" && (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 md:p-8 flex flex-col items-center justify-center text-center transition ${
              dragActive
                ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30"
                : "border-slate-300 dark:border-slate-700 hover:border-emerald-400 bg-white dark:bg-slate-900"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={handleFileUpload}
            />
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
              <UploadCloud className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Drag & drop your CSV file here, or browse
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              Supports standard CSV format with columns for Full Name, Email, Role, Phone, and Member Number.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 rounded-xl text-xs font-bold"
            >
              Select CSV File
            </Button>
          </div>
        )}

        {/* TAB 2: Text / Email List Interface */}
        {inputTab === "text" && (
          <div className="flex flex-col gap-3">
            <textarea
              rows={5}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={"Paste multiple emails or lines, e.g.:\njohn.doe@example.com\nJane Smith <jane@example.com>\nclaudine@coop.rw, emmanuel@coop.rw"}
              className="w-full text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Default Assigned Role:</span>
                <select
                  value={defaultRole}
                  onChange={(e) => setDefaultRole(e.target.value as "member" | "org_admin")}
                  className="text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value="member">Standard Member</option>
                  <option value="org_admin">Organization Administrator</option>
                </select>
              </div>
              <Button
                size="sm"
                onClick={parseManualText}
                icon={<Sparkles className="h-3.5 w-3.5" />}
                className="rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800"
              >
                Validate & Extract List
              </Button>
            </div>
          </div>
        )}

        {/* Validation Review Section */}
        {candidates.length > 0 && (
          <div className="flex flex-col gap-3">
            {/* Summary Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Total Parsed: {candidates.length}
                </span>
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {readyToInvite.length} Ready
                </span>
                {overQuotaCount > 0 && (
                  <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                    <Lock className="h-3.5 w-3.5" /> {overQuotaCount} Exceeds Cap
                  </span>
                )}
                {invalidCount > 0 && (
                  <span className="text-rose-500 font-semibold flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5" /> {invalidCount} Invalid
                  </span>
                )}
                {duplicateCount > 0 && (
                  <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> {duplicateCount} Existing/Dupes
                  </span>
                )}
              </div>

              {overQuotaCount > 0 && (
                <button
                  type="button"
                  onClick={handleAutoTrimToQuota}
                  className="px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-[11px] font-bold hover:bg-rose-200 transition cursor-pointer"
                >
                  Auto-Trim to Available Quota ({remainingQuota})
                </button>
              )}
            </div>

            {/* Warning if over quota */}
            {overQuotaCount > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <strong className="block font-bold">Plan Capacity Boundary Warning</strong>
                  <p>
                    Your organization plan allows {isUnlimited ? "unlimited" : currentLimit} active members. You have {remainingQuota} seats remaining, but {readyToInvite.length + overQuotaCount} eligible entries were found. Excess members cannot be processed until plan upgrade or trimming.
                  </p>
                </div>
              </div>
            )}

            {/* Candidates Table */}
            <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-mono uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Full Name</th>
                    <th className="py-2.5 px-3">Email Address</th>
                    <th className="py-2.5 px-3">Assigned Role</th>
                    <th className="py-2.5 px-3">Validation Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {candidates.map((cand) => {
                    const isOk = cand.isValidEmail && !cand.isExisting && !cand.isDuplicateInBatch && !cand.exceedsQuota;

                    return (
                      <tr key={cand.id} className={!isOk ? "bg-rose-50/20 dark:bg-rose-950/10" : "hover:bg-slate-50/50 dark:hover:bg-slate-800/30"}>
                        <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          {cand.fullName}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {cand.email}
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={cand.role}
                            disabled={!isOk}
                            onChange={(e) => handleRowRoleChange(cand.id, e.target.value as "member" | "org_admin")}
                            className="text-[11px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5 text-slate-700 dark:text-slate-300"
                          >
                            <option value="member">Member</option>
                            <option value="org_admin">Admin</option>
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          {isOk ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold text-[11px]">
                              <CheckCircle2 className="h-3 w-3" /> Valid & Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium text-[11px]">
                              {cand.exceedsQuota ? <Lock className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                              {cand.errorMessage}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(cand.id)}
                            className="text-slate-400 hover:text-rose-500 transition p-1"
                            title="Remove row"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Progress feedback when sending */}
        {isProcessing && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
              <span className="flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                Dispatching Invites ({processedCount} of {readyToInvite.length})...
              </span>
              <span>{Math.round((processedCount / readyToInvite.length) * 100)}%</span>
            </div>
            <div className="w-full bg-emerald-200 dark:bg-emerald-900 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full transition-all duration-150"
                style={{ width: `${(processedCount / readyToInvite.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Modal Actions Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>

          <Button
            onClick={handleDispatchBulkInvites}
            loading={isProcessing}
            disabled={readyToInvite.length === 0 || (!isUnlimited && readyToInvite.length > remainingQuota)}
            icon={<ArrowRight className="h-4 w-4" />}
            className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-xs font-bold"
          >
            Invite {readyToInvite.length} Member{readyToInvite.length === 1 ? "" : "s"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
