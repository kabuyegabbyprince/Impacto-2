import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  Upload,
  FileText,
  Camera,
  X,
  Clock,
  Sparkles,
  Info,
  Phone,
  Send,
  Users,
  XCircle,
  Eye,
  Loader2,
} from "lucide-react";
import { Modal, Button, Input } from "./ui";
import { Organization, OrgMember } from "../types";
import {
  useSubmitOrgVerification,
  useSubmitOfficerVerification,
  useBroadcastNotification,
} from "../hooks/useImpactoData";
import { useToast } from "./Toast";
import { useAuthStore } from "../store/authStore";
import { useOrgStore } from "../store/orgStore";
import { isSupabaseConfigured } from "../lib/supabase";
import { uploadFileToSupabase } from "../lib/storageService";
import { ResolvedImage } from "./ResolvedMedia";

interface OrganizationVerificationModalProps {
  open: boolean;
  onClose: () => void;
  org: Organization;
  members: OrgMember[];
}

export const OrganizationVerificationModal: React.FC<OrganizationVerificationModalProps> = ({
  open,
  onClose,
  org,
  members,
}) => {
  const { addToast } = useToast();
  const { user } = useAuthStore();
  const { activeMember } = useOrgStore();
  const submitOrgVerificationMutation = useSubmitOrgVerification();
  const submitOfficerMutation = useSubmitOfficerVerification();
  const broadcastNotificationMutation = useBroadcastNotification();

  // Active officers in the organization (non-members)
  const officerMembers = members.filter(
    (m) => m.role !== "member" && m.status !== "rejected" && m.status !== "suspended"
  );
  const mandatoryOfficers = officerMembers.filter(
    (m) => m.role === "org_admin" || m.role === "superadmin" || m.role === "accountant"
  );

  // Resilient multi-key lookup for current logged-in user's membership
  const userEmailLower = user?.email?.trim().toLowerCase();
  const authUid = (user as any)?.auth_user_id;
  const matchedMemberFromList = members.find(
    (m) =>
      (user?.id && (m.user_id === user.id || m.user?.id === user.id)) ||
      (authUid && (m.user_id === authUid || (m.user as any)?.auth_user_id === authUid)) ||
      (userEmailLower && m.user?.email?.trim().toLowerCase() === userEmailLower)
  );
  const currentMember =
    matchedMemberFromList ||
    (activeMember && activeMember.org_id === org.id ? activeMember : undefined);

  const isOfficer = Boolean(currentMember && currentMember.role !== "member");
  const isOrgAdmin = Boolean(
    currentMember?.role === "org_admin" ||
      currentMember?.role === "superadmin" ||
      user?.is_superadmin
  );

  const adminMember =
    officerMembers.find((m) => m.role === "org_admin" || m.role === "superadmin") ||
    officerMembers[0];
  const accountantMember = officerMembers.find((m) => m.role === "accountant");

  const [activeTab, setActiveTab] = useState<"my_submission" | "all_officers" | "member_view">(
    () => (isOfficer ? "my_submission" : "member_view")
  );

  useEffect(() => {
    if (isOfficer) {
      setActiveTab("my_submission");
    } else {
      setActiveTab("member_view");
    }
  }, [isOfficer, open, org.id]);

  // Individual officer form state
  const [myPhone, setMyPhone] = useState("");
  const [myPassportPhoto, setMyPassportPhoto] = useState("");
  const [myIdDoc, setMyIdDoc] = useState("");
  const [myDocType, setMyDocType] = useState<"national_id" | "passport">("national_id");
  const [myDocNumber, setMyDocNumber] = useState("");

  // Admin bulk submission state
  const [adminPhone, setAdminPhone] = useState("");
  const [adminPassportPhoto, setAdminPassportPhoto] = useState("");
  const [adminIdDoc, setAdminIdDoc] = useState("");
  const [adminDocType, setAdminDocType] = useState<"national_id" | "passport">("national_id");
  const [adminDocNumber, setAdminDocNumber] = useState("");

  const [accountantPhone, setAccountantPhone] = useState("");
  const [accountantPassportPhoto, setAccountantPassportPhoto] = useState("");
  const [accountantIdDoc, setAccountantIdDoc] = useState("");
  const [accountantDocType, setAccountantDocType] = useState<"national_id" | "passport">("national_id");
  const [accountantDocNumber, setAccountantDocNumber] = useState("");

  const [submittingRoleTab, setSubmittingRoleTab] = useState<"admin" | "accountant">("admin");
  const [nudgeSent, setNudgeSent] = useState(false);
  const [remindedIds, setRemindedIds] = useState<Record<string, boolean>>({});
  const [zoomDocUrl, setZoomDocUrl] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  useEffect(() => {
    setMyPhone(currentMember?.phone_number || currentMember?.user?.phone_number || user?.phone_number || "");
    setMyPassportPhoto(currentMember?.passport_photo_url || "");
    setMyIdDoc(currentMember?.id_document_url || "");
    setMyDocType(currentMember?.id_document_type || "national_id");
    setMyDocNumber(currentMember?.id_document_number || "");

    setAdminPhone(adminMember?.phone_number || adminMember?.user?.phone_number || "");
    setAdminPassportPhoto(adminMember?.passport_photo_url || "");
    setAdminIdDoc(adminMember?.id_document_url || "");
    setAdminDocType(adminMember?.id_document_type || "national_id");
    setAdminDocNumber(adminMember?.id_document_number || "");

    setAccountantPhone(accountantMember?.phone_number || accountantMember?.user?.phone_number || "");
    setAccountantPassportPhoto(accountantMember?.passport_photo_url || "");
    setAccountantIdDoc(accountantMember?.id_document_url || "");
    setAccountantDocType(accountantMember?.id_document_type || "national_id");
    setAccountantDocNumber(accountantMember?.id_document_number || "");
  }, [org.id, currentMember, adminMember, accountantMember, user?.phone_number, open]);

  // Upload document image to Supabase Storage (or DataURL in offline mode)
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void,
    fieldKey: string
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      addToast("File size too large. Please upload an image under 5MB.", "error");
      return;
    }

    if (isSupabaseConfigured) {
      setUploadingField(fieldKey);
      try {
        const storagePath = await uploadFileToSupabase(
          file,
          "impacto-files",
          `verifications/${org.id}`
        );
        setter(storagePath);
        addToast("Document uploaded securely.", "success");
      } catch (err: any) {
        addToast(
          err?.message ||
            "Failed to upload document to storage. Ensure storage policies in update.sql are applied.",
          "error"
        );
      } finally {
        setUploadingField(null);
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setter(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Sample test helper strictly for local demo/offline mode
  const fillSampleDocuments = () => {
    setMyPhone("+250 788 123 456");
    setMyPassportPhoto("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80");
    setMyIdDoc("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80");
    setMyDocType("national_id");
    setMyDocNumber("1199080084592011");

    setAdminPhone("+250 788 123 456");
    setAdminPassportPhoto("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80");
    setAdminIdDoc("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80");
    setAdminDocType("national_id");
    setAdminDocNumber("1199080084592011");

    setAccountantPhone("+250 788 654 321");
    setAccountantPassportPhoto("https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80");
    setAccountantIdDoc("https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80");
    setAccountantDocType("passport");
    setAccountantDocNumber("PC992810");

    addToast("Sample identity documents & telephone numbers loaded.", "success");
  };

  const handleIndividualSubmit = async () => {
    if (!currentMember) {
      addToast("Active officer membership record not found for this organization.", "error");
      return;
    }
    if (!myPhone.trim()) {
      addToast("Please provide your telephone number for verification contact.", "error");
      return;
    }
    if (!myPassportPhoto || !myIdDoc || !myDocNumber.trim()) {
      addToast("Please provide your passport photo, National ID/Passport scan, and document number.", "error");
      return;
    }

    try {
      const res = await submitOfficerMutation.mutateAsync({
        member_id: currentMember.id,
        org_id: org.id,
        user_id: user?.id || currentMember.user_id,
        phone_number: myPhone.trim(),
        passport_photo_url: myPassportPhoto,
        id_document_url: myIdDoc,
        id_document_type: myDocType,
        id_document_number: myDocNumber.trim(),
      });

      if (res.allOfficersSubmitted) {
        addToast(
          "All mandatory officer documents submitted! Organization is now awaiting verification by Super Admin.",
          "success"
        );
      } else {
        addToast(
          "Your officer verification documents were saved! Both Admin and Accountant must submit theirs to queue the organization for Super Admin audit.",
          "success"
        );
      }
      onClose();
    } catch (err: any) {
      addToast(err?.message || "Failed to submit verification credentials.", "error");
    }
  };

  const handleBulkSubmit = async () => {
    if (!adminMember) {
      addToast("No organization administrator found.", "error");
      return;
    }
    if (!accountantMember) {
      addToast(
        "Accountant Required: An organization must appoint an Accountant to satisfy authenticity verification.",
        "error"
      );
      return;
    }

    if (!adminPhone.trim() || !adminPassportPhoto || !adminIdDoc || !adminDocNumber.trim()) {
      addToast("Please provide administrator telephone number, passport photo, and National ID/Passport.", "error");
      setSubmittingRoleTab("admin");
      return;
    }

    if (!accountantPhone.trim() || !accountantPassportPhoto || !accountantIdDoc || !accountantDocNumber.trim()) {
      addToast("Please provide accountant telephone number, passport photo, and National ID/Passport.", "error");
      setSubmittingRoleTab("accountant");
      return;
    }

    try {
      await submitOrgVerificationMutation.mutateAsync({
        org_id: org.id,
        admin_member_id: adminMember.id,
        admin_phone_number: adminPhone.trim(),
        admin_passport_photo_url: adminPassportPhoto,
        admin_id_document_url: adminIdDoc,
        admin_id_document_type: adminDocType,
        admin_id_document_number: adminDocNumber.trim(),
        accountant_member_id: accountantMember.id,
        accountant_phone_number: accountantPhone.trim(),
        accountant_passport_photo_url: accountantPassportPhoto,
        accountant_id_document_url: accountantIdDoc,
        accountant_id_document_type: accountantDocType,
        accountant_id_document_number: accountantDocNumber.trim(),
        submitted_by_user_id: user?.id || adminMember.user_id,
      });

      addToast(
        "Verification dossier submitted! Organization is now awaiting system verification by Super Admin.",
        "success"
      );
      onClose();
    } catch (err: any) {
      addToast(err?.message || "Failed to submit verification dossier.", "error");
    }
  };

  const handleNudgeLeadership = async () => {
    try {
      await broadcastNotificationMutation.mutateAsync({
        org_id: org.id,
        recipient_group: "officers",
        body_text: `Member verification reminder: Please submit Admin & Accountant authenticity documents for ${org.name}.`,
        recipient_count: Math.max(officerMembers.length, 1),
        sent_by: user?.id || "member",
      });
    } catch (err) {
      console.warn("[Verification] Notification broadcast fallback notice:", err);
    }
    setNudgeSent(true);
    addToast("Reminder sent to organization leadership to submit authenticity documents!", "success");
  };

  const handleRemindOfficer = async (officer: OrgMember) => {
    const officerName = officer.user?.full_name || officer.role.toUpperCase();
    try {
      await broadcastNotificationMutation.mutateAsync({
        org_id: org.id,
        recipient_group: officer.role || "officers",
        body_text: `Verification document reminder for ${officerName} (${officer.role}): Please upload your passport photo and government ID in Organization Verification.`,
        recipient_count: 1,
        sent_by: user?.id || "admin",
      });
    } catch (err) {
      console.warn("[Verification] Officer reminder notice:", err);
    }
    setRemindedIds((prev) => ({ ...prev, [officer.id]: true }));
    addToast(
      `Reminder sent to ${officerName} (${officer.phone_number || "on file"}) to submit verification documents!`,
      "success"
    );
  };

  const isVerified = org.verification_status === "verified";
  const isPending = org.verification_status === "pending_review";
  const isRejected = org.verification_status === "rejected";

  // Unified rule: Admin + Accountant mandatory officers
  const submittedMandatory = mandatoryOfficers.filter(
    (m) => !!m.passport_photo_url && !!m.id_document_url
  );
  const requiredCount = Math.max(mandatoryOfficers.length, 2);
  const progressPercent = Math.min(
    100,
    Math.round((submittedMandatory.length / requiredCount) * 100)
  );

  return (
    <>
      <Modal open={open} onClose={onClose} title="" maxWidth="max-w-2xl">
        <div className="flex flex-col gap-5 pt-1 min-w-0">
          {/* Header Hero */}
          <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4 dark:border-slate-800 min-w-0">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div
                className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  isVerified
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                    : isPending
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                    : isRejected
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                    : "bg-emerald-50 text-emerald-600 dark:bg-slate-800 dark:text-emerald-400"
                }`}
              >
                {isVerified ? (
                  <CheckCircle2 className="h-6 w-6 fill-emerald-500 text-white dark:fill-emerald-400 dark:text-slate-900" />
                ) : isPending ? (
                  <Clock className="h-6 w-6 animate-pulse" />
                ) : isRejected ? (
                  <XCircle className="h-6 w-6" />
                ) : (
                  <ShieldCheck className="h-6 w-6" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white break-words">
                    Organization Authenticity Verification
                  </h2>
                  {isVerified ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="h-3 w-3" /> VERIFIED GREEN TICK
                    </span>
                  ) : isPending ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 flex items-center gap-1 shrink-0">
                      <Clock className="h-3 w-3" /> AWAITING AUDIT
                    </span>
                  ) : isRejected ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 flex items-center gap-1 shrink-0">
                      <XCircle className="h-3 w-3" /> REJECTED - ACTION NEEDED
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 flex items-center gap-1 shrink-0">
                      UNVERIFIED
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 break-words">
                  Authenticity status for <strong className="text-gray-900 dark:text-white">{org.name}</strong> (@{org.slug})
                </p>
              </div>
            </div>

            {!isSupabaseConfigured && (
              <button
                type="button"
                onClick={fillSampleDocuments}
                className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 transition cursor-pointer shrink-0"
              >
                <Sparkles className="h-3 w-3" /> Auto-Fill Demo IDs
              </button>
            )}
          </div>

          {/* Status Callout */}
          {isVerified ? (
            <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3 min-w-0">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div className="text-xs text-emerald-900 dark:text-emerald-200 min-w-0">
                <p className="font-bold">Official Green Authenticity Tick Active</p>
                <p className="text-emerald-700 dark:text-emerald-300 text-[11px] mt-0.5 break-words">
                  This organization is verified by platform auditors. Verified by {org.verified_by || "Platform Auditor"}. Green tick is visible on all member portals and public directories.
                </p>
              </div>
            </div>
          ) : isPending ? (
            <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center gap-3 min-w-0">
              <Clock className="h-5 w-5 text-amber-600 shrink-0 animate-pulse" />
              <div className="text-xs text-amber-900 dark:text-amber-200 min-w-0">
                <p className="font-bold">All Required Documents Submitted — Awaiting System Verification</p>
                <p className="text-amber-700 dark:text-amber-300 text-[11px] mt-0.5 break-words">
                  Admin & Accountant credentials have been received. Super Admin is reviewing the dossier to grant the official Green Tick.
                </p>
              </div>
            </div>
          ) : isRejected ? (
            <div className="p-3.5 bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-start gap-3 min-w-0">
              <XCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-900 dark:text-rose-200 min-w-0">
                <p className="font-bold">Verification Dossier Rejected — Corrections Required</p>
                <p className="text-rose-700 dark:text-rose-300 text-[11px] mt-0.5 break-words">
                  <strong className="font-semibold">Reviewer Feedback:</strong>{" "}
                  {org.verification_rejection_reason || "Please review uploaded ID scans and resubmit clear documents."}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5 min-w-0">
              <Info className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed min-w-0">
                <span className="font-bold text-gray-900 dark:text-white">Authenticity Rule:</span>{" "}
                All organizations start <span className="font-bold">Unverified</span>. Verification requires both your <span className="font-bold">Administrator</span> and <span className="font-bold">Accountant</span> to submit their passport photo, National ID/Passport, and telephone number. <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Normal members do not need to verify</span>.
              </div>
            </div>
          )}

          {/* Progress Tracker Bar */}
          <div className="p-3.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 flex flex-col gap-2 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Mandatory Officer Progress (Admin & Accountant):
              </span>
              <span className="font-mono font-bold text-emerald-600">
                {submittedMandatory.length} / {requiredCount} Submitted ({progressPercent}%)
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Tab Selection */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            {isOfficer && (
              <button
                type="button"
                onClick={() => setActiveTab("my_submission")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  activeTab === "my_submission"
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                }`}
              >
                My Officer Verification ({currentMember?.role?.toUpperCase()})
              </button>
            )}

            {isOrgAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab("all_officers")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  activeTab === "all_officers"
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                }`}
              >
                Admin Full Team Dossier
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab("member_view")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                activeTab === "member_view"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              Officer Roster & Status
            </button>
          </div>

          {/* TAB 1: INDIVIDUAL OFFICER SUBMISSION */}
          {activeTab === "my_submission" && isOfficer && (
            <div className="flex flex-col gap-4 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 min-w-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {currentMember?.role?.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                      {currentMember?.user?.full_name || user?.full_name} ({currentMember?.role?.toUpperCase()})
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Submit your individual identity credentials below
                    </span>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    currentMember?.verification_status === "verified"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : currentMember?.verification_status === "rejected"
                      ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                      : currentMember?.passport_photo_url && currentMember?.id_document_url
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {currentMember?.verification_status === "verified"
                    ? "Verified"
                    : currentMember?.verification_status === "rejected"
                    ? "Rejected — Resubmit"
                    : currentMember?.passport_photo_url && currentMember?.id_document_url
                    ? "Submitted"
                    : "Documents Needed"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Input
                  label="Telephone / Mobile Number (Required)"
                  value={myPhone}
                  onChange={(e) => setMyPhone(e.target.value)}
                  placeholder="+250 788 000 000"
                  prefixIcon={<Phone className="h-4 w-4 text-emerald-600" />}
                  required
                />

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                    Government ID Document Type
                  </label>
                  <select
                    value={myDocType}
                    onChange={(e) => setMyDocType(e.target.value as any)}
                    className="w-full text-xs rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-white"
                  >
                    <option value="national_id">National ID Card (16-Digit)</option>
                    <option value="passport">Passport</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <Input
                    label="Document / ID Number"
                    value={myDocNumber}
                    onChange={(e) => setMyDocNumber(e.target.value)}
                    placeholder="e.g. 1199080084592011 or PC123456"
                    required
                  />
                </div>
              </div>

              {/* Document Uploads */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Camera className="h-4 w-4 text-emerald-600" /> 1. Passport Photo (Headshot)
                  </span>
                  {myPassportPhoto ? (
                    <div className="h-32 rounded-lg overflow-hidden relative group border bg-slate-100 dark:bg-slate-800">
                      <ResolvedImage
                        src={myPassportPhoto}
                        alt="Passport Photo"
                        bucketName="impacto-files"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setZoomDocUrl(myPassportPhoto)}
                          className="bg-black/60 text-white rounded-full p-1 cursor-pointer"
                          title="Preview"
                        >
                          <Eye className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setMyPassportPhoto("")}
                          className="bg-black/60 text-white rounded-full p-1 cursor-pointer"
                          title="Remove"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="h-32 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 text-xs text-slate-500 gap-1">
                      {uploadingField === "my_passport" ? (
                        <Loader2 className="h-5 w-5 text-emerald-600 animate-spin" />
                      ) : (
                        <Upload className="h-5 w-5 text-slate-400" />
                      )}
                      <span>{uploadingField === "my_passport" ? "Uploading..." : "Upload Passport Photo"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingField !== null}
                        onChange={(e) => handleFileUpload(e, setMyPassportPhoto, "my_passport")}
                      />
                    </label>
                  )}
                </div>

                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-emerald-600" /> 2. National ID / Passport Scan
                  </span>
                  {myIdDoc ? (
                    <div className="h-32 rounded-lg overflow-hidden relative group border bg-slate-100 dark:bg-slate-800">
                      <ResolvedImage
                        src={myIdDoc}
                        alt="ID Scan"
                        bucketName="impacto-files"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setZoomDocUrl(myIdDoc)}
                          className="bg-black/60 text-white rounded-full p-1 cursor-pointer"
                          title="Preview"
                        >
                          <Eye className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setMyIdDoc("")}
                          className="bg-black/60 text-white rounded-full p-1 cursor-pointer"
                          title="Remove"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="h-32 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 text-xs text-slate-500 gap-1">
                      {uploadingField === "my_id" ? (
                        <Loader2 className="h-5 w-5 text-emerald-600 animate-spin" />
                      ) : (
                        <Upload className="h-5 w-5 text-slate-400" />
                      )}
                      <span>{uploadingField === "my_id" ? "Uploading..." : "Upload ID Scan"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingField !== null}
                        onChange={(e) => handleFileUpload(e, setMyIdDoc, "my_id")}
                      />
                    </label>
                  )}
                </div>
              </div>

              <Button
                onClick={handleIndividualSubmit}
                loading={submitOfficerMutation.isPending}
                disabled={uploadingField !== null}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 mt-2"
              >
                Submit My Identity Documents
              </Button>
            </div>
          )}

          {/* TAB 2: ADMIN BULK / FULL TEAM SUBMISSION */}
          {activeTab === "all_officers" && isOrgAdmin && (
            <div className="flex flex-col gap-4 min-w-0">
              <div className="flex flex-wrap items-center gap-2 border-b pb-2 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSubmittingRoleTab("admin")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer ${
                    submittingRoleTab === "admin"
                      ? "bg-slate-900 dark:bg-emerald-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  1. Administrator Documents
                </button>
                <button
                  type="button"
                  onClick={() => setSubmittingRoleTab("accountant")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer ${
                    submittingRoleTab === "accountant"
                      ? "bg-slate-900 dark:bg-emerald-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  2. Accountant Documents
                </button>
              </div>

              {submittingRoleTab === "admin" ? (
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 break-words">
                    Administrator: {adminMember?.user?.full_name || "Admin"}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Administrator Phone Number"
                      value={adminPhone}
                      onChange={(e) => setAdminPhone(e.target.value)}
                      placeholder="+250 788 111 222"
                      prefixIcon={<Phone className="h-4 w-4" />}
                    />
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                        Admin ID Document Type
                      </label>
                      <select
                        value={adminDocType}
                        onChange={(e) => setAdminDocType(e.target.value as any)}
                        className="w-full text-xs rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-white"
                      >
                        <option value="national_id">National ID Card (16-Digit)</option>
                        <option value="passport">Passport</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <Input
                        label="Admin ID Number"
                        value={adminDocNumber}
                        onChange={(e) => setAdminDocNumber(e.target.value)}
                        placeholder="1199080084592011"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {adminPassportPhoto ? (
                      <div className="h-28 rounded-lg overflow-hidden relative border bg-slate-100 dark:bg-slate-800">
                        <ResolvedImage
                          src={adminPassportPhoto}
                          alt="Admin Passport"
                          bucketName="impacto-files"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setAdminPassportPhoto("")}
                          className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1 cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="h-28 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg flex flex-col items-center justify-center cursor-pointer text-xs text-slate-500">
                        {uploadingField === "admin_passport" ? (
                          <Loader2 className="h-4 w-4 mb-1 animate-spin text-emerald-600" />
                        ) : (
                          <Upload className="h-4 w-4 mb-1" />
                        )}
                        <span>{uploadingField === "admin_passport" ? "Uploading..." : "Upload Passport Photo"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingField !== null}
                          onChange={(e) => handleFileUpload(e, setAdminPassportPhoto, "admin_passport")}
                        />
                      </label>
                    )}

                    {adminIdDoc ? (
                      <div className="h-28 rounded-lg overflow-hidden relative border bg-slate-100 dark:bg-slate-800">
                        <ResolvedImage
                          src={adminIdDoc}
                          alt="Admin ID"
                          bucketName="impacto-files"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setAdminIdDoc("")}
                          className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1 cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="h-28 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg flex flex-col items-center justify-center cursor-pointer text-xs text-slate-500">
                        {uploadingField === "admin_id" ? (
                          <Loader2 className="h-4 w-4 mb-1 animate-spin text-emerald-600" />
                        ) : (
                          <Upload className="h-4 w-4 mb-1" />
                        )}
                        <span>{uploadingField === "admin_id" ? "Uploading..." : "Upload National ID / Passport"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingField !== null}
                          onChange={(e) => handleFileUpload(e, setAdminIdDoc, "admin_id")}
                        />
                      </label>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 break-words">
                    Accountant: {accountantMember?.user?.full_name || "No Accountant Appointed Yet"}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Accountant Phone Number"
                      value={accountantPhone}
                      onChange={(e) => setAccountantPhone(e.target.value)}
                      placeholder="+250 788 333 444"
                      prefixIcon={<Phone className="h-4 w-4" />}
                    />
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                        Accountant ID Document Type
                      </label>
                      <select
                        value={accountantDocType}
                        onChange={(e) => setAccountantDocType(e.target.value as any)}
                        className="w-full text-xs rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-white"
                      >
                        <option value="national_id">National ID Card (16-Digit)</option>
                        <option value="passport">Passport</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <Input
                        label="Accountant ID Number"
                        value={accountantDocNumber}
                        onChange={(e) => setAccountantDocNumber(e.target.value)}
                        placeholder="PC992810"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {accountantPassportPhoto ? (
                      <div className="h-28 rounded-lg overflow-hidden relative border bg-slate-100 dark:bg-slate-800">
                        <ResolvedImage
                          src={accountantPassportPhoto}
                          alt="Accountant Passport"
                          bucketName="impacto-files"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setAccountantPassportPhoto("")}
                          className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1 cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="h-28 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg flex flex-col items-center justify-center cursor-pointer text-xs text-slate-500">
                        {uploadingField === "acc_passport" ? (
                          <Loader2 className="h-4 w-4 mb-1 animate-spin text-emerald-600" />
                        ) : (
                          <Upload className="h-4 w-4 mb-1" />
                        )}
                        <span>{uploadingField === "acc_passport" ? "Uploading..." : "Upload Passport Photo"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingField !== null}
                          onChange={(e) => handleFileUpload(e, setAccountantPassportPhoto, "acc_passport")}
                        />
                      </label>
                    )}

                    {accountantIdDoc ? (
                      <div className="h-28 rounded-lg overflow-hidden relative border bg-slate-100 dark:bg-slate-800">
                        <ResolvedImage
                          src={accountantIdDoc}
                          alt="Accountant ID"
                          bucketName="impacto-files"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setAccountantIdDoc("")}
                          className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1 cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="h-28 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg flex flex-col items-center justify-center cursor-pointer text-xs text-slate-500">
                        {uploadingField === "acc_id" ? (
                          <Loader2 className="h-4 w-4 mb-1 animate-spin text-emerald-600" />
                        ) : (
                          <Upload className="h-4 w-4 mb-1" />
                        )}
                        <span>{uploadingField === "acc_id" ? "Uploading..." : "Upload National ID / Passport"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingField !== null}
                          onChange={(e) => handleFileUpload(e, setAccountantIdDoc, "acc_id")}
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}

              <Button
                onClick={handleBulkSubmit}
                loading={submitOrgVerificationMutation.isPending}
                disabled={uploadingField !== null}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 mt-2"
              >
                Submit Complete Leadership Dossier (Admin & Accountant)
              </Button>
            </div>
          )}

          {/* TAB 3: MEMBER VIEW & OFFICER ROSTER */}
          {activeTab === "member_view" && (
            <div className="flex flex-col gap-4 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Leadership Roles Verification Roster ({officerMembers.length} Officers)
                </span>
                {!isVerified && !isOfficer && (
                  <Button
                    size="sm"
                    onClick={handleNudgeLeadership}
                    disabled={nudgeSent || broadcastNotificationMutation.isPending}
                    className="text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center gap-1.5 shrink-0"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {nudgeSent ? "Reminder Sent!" : "Ask Leadership to Verify"}
                  </Button>
                )}
              </div>

              <div className="flex flex-col gap-2.5">
                {officerMembers.map((officer) => {
                  const hasDocs = !!officer.passport_photo_url && !!officer.id_document_url;
                  const wasReminded = Boolean(remindedIds[officer.id]);
                  return (
                    <div
                      key={officer.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-3 min-w-0"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-9 w-9 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {officer.role.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white break-words">
                              {officer.user?.full_name || "Governance Officer"}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 uppercase shrink-0">
                              {officer.role}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5 break-all">
                            <Phone className="h-3 w-3 text-emerald-600 shrink-0" />
                            {officer.phone_number || officer.user?.phone_number ? (
                              <span>{officer.phone_number || officer.user?.phone_number}</span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400">Phone not set</span>
                            )}
                            <span>•</span>
                            <span>{officer.id_document_number ? `ID: ${officer.id_document_number}` : "No ID number"}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {officer.verification_status === "verified" ? (
                          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                          </span>
                        ) : hasDocs ? (
                          <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" /> Docs Uploaded
                          </span>
                        ) : isOrgAdmin ? (
                          <Button
                            size="xs"
                            onClick={() => handleRemindOfficer(officer)}
                            className="text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 py-1 px-2.5 flex items-center gap-1 shadow-xs"
                          >
                            <Send className="h-3 w-3" /> {wasReminded ? "Reminded" : "Remind"}
                          </Button>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-400">
                            Documents Missing
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer close */}
          <div className="flex justify-end border-t pt-3 dark:border-slate-800">
            <Button variant="outline" onClick={onClose} className="text-xs font-bold">
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Document Enlarge Preview Modal */}
      {zoomDocUrl && (
        <Modal
          open={!!zoomDocUrl}
          onClose={() => setZoomDocUrl(null)}
          title="Identity Document Preview"
          maxWidth="max-w-2xl"
        >
          <div className="flex flex-col gap-4 items-center">
            <div className="max-h-[70vh] w-full overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 p-2 flex justify-center">
              <ResolvedImage
                src={zoomDocUrl}
                alt="Document Preview"
                bucketName="impacto-files"
                className="max-h-[65vh] w-auto object-contain rounded-lg"
              />
            </div>
            <Button onClick={() => setZoomDocUrl(null)} className="w-full text-xs font-bold">
              Close Preview
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
};

