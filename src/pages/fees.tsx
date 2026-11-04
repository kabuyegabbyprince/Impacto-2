import React, { useState, useEffect } from "react";
import { useLocalTranslation } from "../locales/additional-translations";
import { useOrgStore } from "../store/orgStore";
import { useAuthStore } from "../store/authStore";
import {
  useMembers,
  useMemberFees,
  useCreateMemberFee,
  useUpdateMemberFeeStatus,
  useUpdateMemberFee,
  useDeleteMemberFee,
  useUpdateAllMemberDues,
  useUpdateOrganization,
  useBroadcastNotification
} from "../hooks/useImpactoData";
import { Card, Input, Button, Badge, ImageUploadInput } from "../components/ui";
import { useToast } from "../components/Toast";
import { MoMoPushPaymentModal, MoMoPaymentSuccessData } from "../components/MoMoPushPaymentModal";
import { UssdPaymentHelper } from "../components/UssdPaymentHelper";
import { 
  Coins, 
  Filter, 
  Plus, 
  Calendar, 
  Search, 
  Landmark, 
  ShieldCheck, 
  Clock, 
  Check, 
  X, 
  Smartphone, 
  Receipt, 
  Send, 
  HelpCircle, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Zap,
  Eye,
  Repeat,
  Pencil,
  Trash2,
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  ListFilter,
  CheckSquare,
  Square,
  ArrowUpDown,
  SlidersHorizontal,
  Layers,
  FileSpreadsheet,
  CheckCheck,
  AlertTriangle,
  Users
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { MemberFee } from "../types";

const sanitizeError = (err: any, fallbackMessage: string): string => {
  const msg = err?.message || "";
  if (!msg) return fallbackMessage;
  
  const lowerMsg = msg.toLowerCase();
  if (
    lowerMsg.includes("member_fees") || 
    lowerMsg.includes("notification_sends") || 
    lowerMsg.includes("ledger_entries") ||
    lowerMsg.includes("postgres") || 
    lowerMsg.includes("supabase") || 
    lowerMsg.includes("violates row-level security") ||
    lowerMsg.includes("policy") ||
    lowerMsg.includes("relation") ||
    lowerMsg.includes("uuid") ||
    lowerMsg.includes("database") ||
    lowerMsg.includes("table") ||
    lowerMsg.includes("row-level security") ||
    lowerMsg.includes("rls")
  ) {
    return `${fallbackMessage} Please verify your connection or permissions.`;
  }
  return msg;
};

export const OrganizationMemberFees: React.FC = () => {
  const { t } = useLocalTranslation();
  const { activeOrg, activeMember } = useOrgStore();
  const { user } = useAuthStore();
  const { addToast } = useToast();

  const roleStr = (activeMember?.role as string)?.toLowerCase() || "";
  // Strictly enforce that ONLY the accountant (or platform superadmin) has permission to manage and charge dues
  const isAccountant = roleStr === "accountant" || !!user?.is_superadmin;
  const isAdmin =
    roleStr === "org_admin" ||
    roleStr === "admin" ||
    roleStr === "president" ||
    !!user?.is_superadmin;

  // Data fetching
  const { data: members, isLoading: loadingMembers } = useMembers(activeOrg?.id);
  const { data: fees, isLoading: loadingFees } = useMemberFees(activeOrg?.id);

  // Mutations
  const createFeeMutation = useCreateMemberFee();
  const updateFeeStatusMutation = useUpdateMemberFeeStatus();
  const updateFeeMutation = useUpdateMemberFee();
  const deleteFeeMutation = useDeleteMemberFee();
  const updateAllDuesMutation = useUpdateAllMemberDues();
  const updateOrgMutation = useUpdateOrganization();
  const broadcastMutation = useBroadcastNotification();

  const [noticeText, setNoticeText] = useState(activeOrg?.fee_notification || "");
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // View mode for Master Ledger: "schemes" (grouped master dues as created from form) or "invoices" (all individual member lines)
  const [ledgerViewMode, setLedgerViewMode] = useState<"schemes" | "invoices">("schemes");

  // Receipt view state for members & accountants
  const [viewingReceiptFee, setViewingReceiptFee] = useState<MemberFee | null>(null);

  // Edit & Delete states for Accountants
  const [editingFee, setEditingFee] = useState<MemberFee | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editPeriod, setEditPeriod] = useState<"weekly" | "monthly" | "flexible">("weekly");
  const [editPeriodDate, setEditPeriodDate] = useState("");
  const [editStatus, setEditStatus] = useState<"paid" | "pending" | "pending_confirmation">("pending");
  const [editDueDate, setEditDueDate] = useState("");
  const [editAdminNote, setEditAdminNote] = useState("");
  const [editApplyToAllUsers, setEditApplyToAllUsers] = useState(true);

  const [deletingFee, setDeletingFee] = useState<MemberFee | null>(null);
  const [deleteScope, setDeleteScope] = useState<"single" | "cycle">("single");
  const [deletingCycle, setDeletingCycle] = useState<{
    period_date: string;
    payment_period: string;
    count: number;
    total_amount: number;
    ids: string[];
  } | null>(null);

  // Manage All Dues Modal & Bulk Operation States
  const [showAllDuesModal, setShowAllDuesModal] = useState(false);
  const [allDuesSearch, setAllDuesSearch] = useState("");
  const [allDuesStatusFilter, setAllDuesStatusFilter] = useState<"all" | "paid" | "pending" | "pending_confirmation">("all");
  const [allDuesPeriodFilter, setAllDuesPeriodFilter] = useState<"all" | "weekly" | "monthly" | "flexible">("all");
  const [allDuesSortBy, setAllDuesSortBy] = useState<"newest" | "oldest" | "highest" | "lowest" | "member_asc" | "member_desc" | "due_date">("newest");
  const [selectedBulkFeeIds, setSelectedBulkFeeIds] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Basic filters & views
  const [activeTab, setActiveTab] = useState<"ledger" | "pending_approvals" | "my_dues">(() => {
    return isAccountant ? "ledger" : "my_dues";
  });

  React.useEffect(() => {
    if (!isAccountant && activeTab !== "my_dues") {
      setActiveTab("my_dues");
    }
  }, [isAccountant, activeTab]);
  const [searchQuery, setSearchQuery] = useState("");
  const [periodFilter, setPeriodFilter] = useState<"all" | "weekly" | "monthly" | "flexible">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending" | "pending_confirmation">("all");

  // Form states for Admin to record dues manually
  const [showAddModal, setShowAddModal] = useState(false);
  const [formMemberId, setFormMemberId] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formPeriod, setFormPeriod] = useState<"weekly" | "monthly" | "flexible">("weekly");
  const [formPeriodDate, setFormPeriodDate] = useState("");
  const [formStatus, setFormStatus] = useState<"paid" | "pending">("pending");

  // New States for flexible targeting, reminders, deadlines, and recurring charges
  const [chargeTargetType, setChargeTargetType] = useState<"all" | "specific">("all");
  const [selectedMembersToCharge, setSelectedMembersToCharge] = useState<string[]>([]);
  const [formStartDate, setFormStartDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [dueDeadlineDate, setDueDeadlineDate] = useState("");
  const [sendPreDeadlineReminder, setSendPreDeadlineReminder] = useState(false);
  const [formIsRecurring, setFormIsRecurring] = useState(true);

  // Member Action Dialog State: "Pay or Report Payment"
  const [selectedFeeToPay, setSelectedFeeToPay] = useState<MemberFee | null>(null);
  const [openMoMoPushPromptModal, setOpenMoMoPushPromptModal] = useState(false);
  const [payMethod, setPayMethod] = useState<"MTN MoMo / Airtel" | "Cash">("MTN MoMo / Airtel");
  
  // MoMo state variables
  const [momoPhoneNumber, setMomoPhoneNumber] = useState("");

  // manual offline reports fields
  const [manualTxRef, setManualTxRef] = useState("");
  const [manualSenderInfo, setManualSenderInfo] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [manualProofUrl, setManualProofUrl] = useState("");
  const [resendMessageText, setResendMessageText] = useState("");

  // Admin Review / Confirmation state variables
  const [reviewingFee, setReviewingFee] = useState<MemberFee | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Sub-roster boundaries
  const activeMembersOnly = members?.filter((m) => m.status !== "rejected" && m.role !== "superadmin" && !m.user?.is_superadmin) || [];
  
  // Find all possible IDs for the currently logged-in member
  const myMemberRecord = React.useMemo(() => {
    if (!members) return null;
    return members.find(m => 
      (user?.id && (m.user_id === user.id || m.id === user.id)) || 
      (activeMember?.id && m.id === activeMember.id) || 
      (activeMember?.user_id && (m.user_id === activeMember.user_id || m.id === activeMember.user_id)) ||
      (user?.email && (m.user?.email?.toLowerCase() === user.email.toLowerCase() || (m as any).email?.toLowerCase() === user.email.toLowerCase())) ||
      (user?.full_name && (m.user?.full_name?.toLowerCase().trim() === user.full_name.toLowerCase().trim() || (m as any).full_name?.toLowerCase().trim() === user.full_name.toLowerCase().trim()))
    );
  }, [members, user, activeMember]);

  const myMemberIds = React.useMemo(() => {
    const ids = new Set<string>();
    if (activeMember?.id) ids.add(activeMember.id);
    if (activeMember?.user_id) ids.add(activeMember.user_id);
    if (user?.id) ids.add(user.id);
    if ((user as any)?.auth_user_id) ids.add((user as any).auth_user_id);
    if (myMemberRecord?.id) ids.add(myMemberRecord.id);
    if (myMemberRecord?.user_id) ids.add(myMemberRecord.user_id);

    // Also include all member records that match current user's profile
    if (members && Array.isArray(members)) {
      members.forEach((m) => {
        const matchesUser =
          (user?.id && (m.user_id === user.id || m.id === user.id)) ||
          (user?.email && (m.user?.email?.toLowerCase() === user.email.toLowerCase() || (m as any).email?.toLowerCase() === user.email.toLowerCase())) ||
          (user?.full_name && (m.user?.full_name?.toLowerCase().trim() === user.full_name.toLowerCase().trim() || (m as any).full_name?.toLowerCase().trim() === user.full_name.toLowerCase().trim()));
        if (matchesUser) {
          if (m.id) ids.add(m.id);
          if (m.user_id) ids.add(m.user_id);
        }
      });
    }

    return ids;
  }, [activeMember, user, myMemberRecord, members]);

  // Dues assigned specific to current logged-in member or admin
  const myDues = React.useMemo(() => {
    if (!fees) return [];
    return fees.filter((f) => {
      if (!f) return false;
      if (f.member_id && myMemberIds.has(f.member_id)) return true;
      for (const id of myMemberIds) {
        if (id && f.member_id && (f.member_id.includes(id) || id.includes(f.member_id))) return true;
      }
      if (user?.full_name && f.member_name && f.member_name.toLowerCase().trim() === user.full_name.toLowerCase().trim()) {
        return true;
      }
      if (user?.email && f.sender_info && f.sender_info.toLowerCase().includes(user.email.toLowerCase())) {
        return true;
      }
      return false;
    });
  }, [fees, myMemberIds, user]);

  // Autogenerate payment deadline date based on start date and cycle type (+7 days for weekly, +30 days for monthly)
  useEffect(() => {
    if (formPeriod === "flexible") {
      setDueDeadlineDate("");
      if (formPeriodDate !== "Anytime") setFormPeriodDate("Anytime");
      return;
    }
    
    if (formPeriodDate === "Anytime") {
      setFormPeriodDate("");
    }
    
    try {
      let baseDate = new Date();
      if (formStartDate) {
        const parsed = Date.parse(formStartDate);
        if (!isNaN(parsed)) baseDate = new Date(parsed);
      }

      // Calculate deadline: weekly = 7 days count, monthly = 30 days count
      const deadline = new Date(baseDate);
      if (formPeriod === "weekly") {
        deadline.setDate(baseDate.getDate() + 7);
        if (!formPeriodDate) {
          const year = baseDate.getFullYear();
          const firstJan = new Date(year, 0, 1);
          const weekNum = Math.ceil((((baseDate.getTime() - firstJan.getTime()) / 86400000) + firstJan.getDay() + 1) / 7);
          setFormPeriodDate(`${year}-W${String(weekNum).padStart(2, '0')}`);
        }
      } else if (formPeriod === "monthly") {
        deadline.setDate(baseDate.getDate() + 30);
        if (!formPeriodDate) {
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          setFormPeriodDate(`${monthNames[baseDate.getMonth()]} ${baseDate.getFullYear()}`);
        }
      }
      
      const yyyy = deadline.getFullYear();
      const mm = String(deadline.getMonth() + 1).padStart(2, '0');
      const dd = String(deadline.getDate()).padStart(2, '0');
      
      setDueDeadlineDate(`${yyyy}-${mm}-${dd}`);
    } catch (e) {
      console.warn("Failed to autogenerate deadline date:", e);
    }
  }, [formPeriod, formStartDate]);

  // Helper function to extract settlement info & deadline countdown for any fee
  const getFeeDeadlineInfo = (fee: MemberFee) => {
    if (fee.payment_period === "flexible" || fee.period_date === "Anytime") {
      return {
        isFlexible: true,
        label: "Flexible (Settle anytime)",
        daysLeft: 999,
        isOverdue: false,
        overdueDays: 0,
        formattedDate: "Flexible"
      };
    }

    let deadlineStr = fee.due_date;
    if (!deadlineStr && fee.admin_note) {
      const match = fee.admin_note.match(/\[Deadline:\s*(\d{4}-\d{2}-\d{2})\]/);
      if (match) deadlineStr = match[1];
    }

    if (!deadlineStr && fee.created_at) {
      const createdAt = new Date(fee.created_at);
      if (!isNaN(createdAt.getTime())) {
        const derived = new Date(createdAt);
        derived.setDate(createdAt.getDate() + (fee.payment_period === "weekly" ? 7 : 30));
        deadlineStr = derived.toISOString().split("T")[0];
      }
    }

    if (!deadlineStr) {
      return {
        isFlexible: false,
        label: "Standard terms",
        daysLeft: 0,
        isOverdue: false,
        overdueDays: 0,
        formattedDate: "Standard"
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadlineStr);
    deadlineDate.setHours(0, 0, 0, 0);

    const diffTime = deadlineDate.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const formattedDate = deadlineDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

    if (daysLeft > 0) {
      return {
        isFlexible: false,
        deadlineStr,
        formattedDate,
        daysLeft,
        isOverdue: false,
        overdueDays: 0,
        label: `Due ${formattedDate} (${daysLeft}d left)`
      };
    } else if (daysLeft === 0) {
      return {
        isFlexible: false,
        deadlineStr,
        formattedDate,
        daysLeft: 0,
        isOverdue: false,
        overdueDays: 0,
        label: `Due Today (${formattedDate})`
      };
    } else {
      const overdueDays = Math.abs(daysLeft);
      return {
        isFlexible: false,
        deadlineStr,
        formattedDate,
        daysLeft,
        isOverdue: true,
        overdueDays,
        label: `Overdue by ${overdueDays}d (Due ${formattedDate})`
      };
    }
  };

  const handleCreateFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg) return;
    if (!isAccountant) {
      addToast("Permission Denied: Only the cooperative accountant can charge dues.", "error");
      return;
    }
    
    const finalPeriodDate = formPeriod === "flexible" ? "Anytime" : formPeriodDate;
    if (!formAmount || !finalPeriodDate) {
      addToast("Please fill in all core dues logging parameters.", "error");
      return;
    }

    const targetMembers = chargeTargetType === "all" 
      ? activeMembersOnly 
      : activeMembersOnly.filter(m => selectedMembersToCharge.includes(m.id));

    if (targetMembers.length === 0) {
      addToast("Please select at least one cooperative member to apply the charges to.", "error");
      return;
    }

    try {
      // Loop and create dues for each member in target audience
      for (const targetMem of targetMembers) {
        const finalAdminNote = formPeriod !== "flexible" && dueDeadlineDate 
          ? `[Deadline: ${dueDeadlineDate}]${formIsRecurring ? " [Recurring: true]" : ""}${sendPreDeadlineReminder ? " [Weekly Reminder Configured]" : ""}`
          : formPeriod === "flexible" 
            ? "[Flexible Fee - No Strict Deadline]" 
            : undefined;

        await createFeeMutation.mutateAsync({
          org_id: activeOrg.id,
          member_id: targetMem.id,
          amount: parseFloat(formAmount),
          currency: "RWF",
          payment_period: formPeriod,
          period_date: finalPeriodDate,
          status: formStatus,
          paid_at: formStatus === "paid" ? new Date().toISOString() : undefined,
          due_date: dueDeadlineDate || undefined,
          is_recurring: formIsRecurring,
          admin_note: finalAdminNote
        });
      }

      // Safely broadcast notifications without blocking modal auto-close
      try {
        const recipientGroupLabel = chargeTargetType === "all" ? "All Cooperative Members" : "Specific Selected Members";
        await broadcastMutation.mutateAsync({
          org_id: activeOrg.id,
          sent_by: user?.id || "",
          recipient_group: recipientGroupLabel,
          recipient_count: targetMembers.length,
          body_text: `CO-OP ALERT: New ${formPeriod} dues of ${parseFloat(formAmount).toLocaleString()} RWF set for cycle ${finalPeriodDate}.${dueDeadlineDate ? ` Deadline to pay: ${dueDeadlineDate}.` : ""}`
        });

        if (formPeriod === "weekly" && sendPreDeadlineReminder && dueDeadlineDate) {
          await broadcastMutation.mutateAsync({
            org_id: activeOrg.id,
            sent_by: user?.id || "",
            recipient_group: `${recipientGroupLabel} (Scheduled Weekly Reminder)`,
            recipient_count: targetMembers.length,
            body_text: `WEEKLY REMINDER (Due in 2 days): Please settle your outstanding Weekly micro-saving dues of ${parseFloat(formAmount).toLocaleString()} RWF for period ${finalPeriodDate} before ${dueDeadlineDate}.`
          });
        }
      } catch (broadcastErr) {
        console.warn("[Create Fee] Notice broadcast failed silently:", broadcastErr);
      }

      // Check if creator themselves is part of the target members and not paid yet
      const isCreatorCharged = targetMembers.some(m => m.id === activeMember?.id);
      if (isCreatorCharged && formStatus === "pending") {
        addToast("Cooperative dues logged! A pending invoice has also been assigned to your personal statement to remain fair.", "warning");
      } else {
        addToast("Successfully recorded contribution dues for all targeted members!", "success");
      }
    } catch (err: any) {
      addToast(sanitizeError(err, "Failed to log fee records."), "error");
    } finally {
      // Auto-close charge modal
      setShowAddModal(false);

      // Reset form
      setFormMemberId("");
      setFormAmount("");
      setFormPeriodDate("");
      setFormStatus("pending");
      setChargeTargetType("all");
      setSelectedMembersToCharge([]);
      setDueDeadlineDate("");
      setSendPreDeadlineReminder(false);
      setFormIsRecurring(true);
    }
  };

  // Immediate toggle for accountants
  const handleToggleStatusLegacy = async (fee: MemberFee) => {
    if (!isAccountant) return;
    const newStatus = fee.status === "paid" ? "pending" : "paid";
    const paidAt = newStatus === "paid" ? new Date().toISOString() : undefined;

    try {
      await updateFeeStatusMutation.mutateAsync({
        id: fee.id,
        org_id: activeOrg!.id,
        member_id: fee.member_id,
        amount: fee.amount,
        payment_period: fee.payment_period,
        period_date: fee.period_date,
        status: newStatus,
        paid_at: paidAt
      });
      addToast(`Status updated to ${newStatus.toUpperCase()}!`, "success");
    } catch (err: any) {
      addToast(sanitizeError(err, "Failed to edit fee state."), "error");
    }
  };

  // Submit payment report offline/manually (Member side)
  const handleSubmitManualReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeeToPay) return;

    if (payMethod === "MTN MoMo / Airtel") {
      const cleanPhone = momoPhoneNumber.replace(/\D/g, "");
      if (!/^07[89]\d{7}$/.test(cleanPhone)) {
        addToast("Error: MTN phone number required. Must be 10 digits starting with 078 or 079 (e.g. 078XXXXXXX or 079XXXXXXX) to reduce errors.", "error");
        return;
      }
      if (!manualSenderInfo.trim()) {
        addToast("Please provide the registered sender full name.", "error");
        return;
      }
      if (!resendMessageText.trim()) {
        addToast("Please paste the transaction SMS confirmation text.", "error");
        return;
      }

      // Check for duplicate SMS submission in active fees cache
      if (resendMessageText.trim().length > 15) {
        const isDuplicateSms = fees?.some(
          (f) => f.id !== selectedFeeToPay.id && f.report_note && f.report_note.includes(resendMessageText.trim())
        );
        if (isDuplicateSms) {
          addToast("Duplicate receipt error: This SMS confirmation message has already been submitted for another dues cycle.", "error");
          return;
        }
      }
    } else if (payMethod === "Cash") {
      if (!manualSenderInfo.trim()) {
        addToast("Please provide the name of the payer member.", "error");
        return;
      }
      if (!manualTxRef.trim()) {
        addToast("Please provide the name of the officer who received the hand cash.", "error");
        return;
      }
    }

    try {
      const generatedTxRef = payMethod === "MTN MoMo / Airtel"
        ? `MOMO-${Math.floor(100000 + Math.random() * 900000)}`
        : `CASH-${Math.floor(100000 + Math.random() * 900000)}`;

      await updateFeeStatusMutation.mutateAsync({
        id: selectedFeeToPay.id,
        org_id: activeOrg!.id,
        member_id: selectedFeeToPay.member_id,
        amount: selectedFeeToPay.amount,
        payment_period: selectedFeeToPay.payment_period,
        period_date: selectedFeeToPay.period_date,
        status: "pending_confirmation",
        paid_by_method: payMethod === "MTN MoMo / Airtel" ? (momoPhoneNumber.startsWith("072") || momoPhoneNumber.startsWith("073") ? "Airtel Money" : "MTN MoMo") : "Cash",
        transaction_reference: generatedTxRef,
        sender_info: payMethod === "MTN MoMo / Airtel"
          ? `MoMo/Airtel No: ${momoPhoneNumber}, Name: ${manualSenderInfo}`
          : `Payer Member: ${manualSenderInfo}, Received by Officer: ${manualTxRef}`,
        reported_at: new Date().toISOString(),
        report_note: payMethod === "MTN MoMo / Airtel"
          ? `[SMS CONFIRMATION]: ${resendMessageText}\n[REPORTER NOTE]: ${manualNote || "None"}`
          : `Hand cash receipt recorded.\n[REPORTER NOTE]: ${manualNote || "None"}`,
        proof_url: manualProofUrl || undefined
      });

      // Notify accountants and admins about the submitted payment slip
      try {
        await broadcastMutation.mutateAsync({
          org_id: activeOrg!.id,
          sent_by: activeMember?.id || activeOrg!.id,
          recipient_group: "accountants_and_admins",
          recipient_count: 1,
          body_text: `Payment Slip Submitted: Member ${user?.full_name || 'A member'} reported payment of ${selectedFeeToPay.amount.toLocaleString()} RWF for ${selectedFeeToPay.payment_period.toUpperCase()} cycle (${selectedFeeToPay.period_date || 'current'}). Ref: ${generatedTxRef}. Please verify.`
        });
      } catch (notifErr) {
        console.warn("[Payment Report] Broadcast error:", notifErr);
      }

      addToast("Your payment report was submitted! An administrator will verify and confirm shortly.", "success");
    } catch (err: any) {
      addToast(sanitizeError(err, "Failed to log payment report."), "error");
    } finally {
      setSelectedFeeToPay(null);
      // Reset inputs
      setMomoPhoneNumber("");
      setManualTxRef("");
      setManualSenderInfo("");
      setManualNote("");
      setManualProofUrl("");
      setResendMessageText("");
    }
  };

  // Administrator resolves/approves reported payments
  const handleResolvePaymentReport = async (approve: boolean) => {
    if (!isAccountant) {
      addToast("Permission Denied: Only the cooperative accountant can verify payments.", "error");
      return;
    }
    if (!reviewingFee) return;
    setIsSubmittingReview(true);

    try {
      const finalStatus = approve ? "paid" : "pending";
      const paidAt = approve ? new Date().toISOString() : undefined;
      const noteText = adminNoteInput || (approve ? "Approved and cleared by accountant" : "Rejected: Verification slip invalid");

      await updateFeeStatusMutation.mutateAsync({
        id: reviewingFee.id,
        org_id: activeOrg!.id,
        member_id: reviewingFee.member_id,
        amount: reviewingFee.amount,
        payment_period: reviewingFee.payment_period,
        period_date: reviewingFee.period_date,
        status: finalStatus,
        paid_at: paidAt,
        admin_note: noteText,
        // Clear transaction details if rejected, but keep them for transparency
        ...(approve ? {} : { 
          transaction_reference: `REJECTED: ${reviewingFee.transaction_reference}`,
          report_note: `Rejection justification: ${adminNoteInput}`
        })
      });

      // Dispatch real-time communication notification to the member who sent the transaction
      try {
        await broadcastMutation.mutateAsync({
          org_id: activeOrg!.id,
          sent_by: activeMember?.id || activeOrg!.id,
          recipient_group: `member_${reviewingFee.member_id}`,
          recipient_count: 1,
          body_text: approve
            ? `Payment Confirmed: Your payment of ${reviewingFee.amount.toLocaleString()} RWF for ${reviewingFee.payment_period.toUpperCase()} (${reviewingFee.period_date || "cycle"}) has been verified & confirmed by accountant!`
            : `Payment Rejected: Your payment report for ${reviewingFee.payment_period.toUpperCase()} (${reviewingFee.period_date || "cycle"}) was rejected. Reason: ${noteText}.`
        });
      } catch (notifErr) {
        console.warn("[Payment Confirmation] Broadcast error:", notifErr);
      }

      addToast(
        approve 
          ? "Successfully confirmed member's payment. Ledger is updated and member notified!" 
          : "Payment report has been rejected and invoice set back to pending.", 
        approve ? "success" : "info"
      );
    } catch (err: any) {
      addToast(sanitizeError(err, "Failed to update report status."), "error");
    } finally {
      setReviewingFee(null);
      setAdminNoteInput("");
      setIsSubmittingReview(false);
    }
  };

  const openEditModal = (fee: MemberFee, defaultApplyAll = false) => {
    if (!isAccountant) return;
    setEditingFee(fee);
    setEditAmount(fee.amount.toString());
    setEditPeriod((fee.payment_period as any) || "weekly");
    setEditPeriodDate(fee.period_date || "");
    setEditStatus(fee.status || "pending");
    setEditDueDate(fee.due_date || "");
    setEditAdminNote(fee.admin_note || "");
    setEditApplyToAllUsers(defaultApplyAll);
  };

  const handleSaveEditFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAccountant) {
      addToast("Permission Denied: Only the cooperative accountant can edit dues.", "error");
      return;
    }
    if (!editingFee || !activeOrg?.id) return;
    try {
      const parsedAmount = parseFloat(editAmount) || 0;
      if (editApplyToAllUsers) {
        await updateAllDuesMutation.mutateAsync({
          org_id: activeOrg.id,
          period_date: editingFee.period_date,
          payment_period: editPeriod,
          amount: parsedAmount,
          due_date: editDueDate || undefined,
          admin_note: editAdminNote || undefined,
          only_pending: true,
        });
        addToast(
          `Updated due and synchronized changes to all members for cycle "${editPeriodDate || editingFee.period_date}"!`,
          "success"
        );
      } else {
        await updateFeeMutation.mutateAsync({
          id: editingFee.id,
          org_id: activeOrg.id,
          amount: parsedAmount,
          payment_period: editPeriod,
          period_date: editPeriodDate,
          status: editStatus,
          due_date: editDueDate,
          admin_note: editAdminNote,
        });
        addToast("Fee due updated successfully!", "success");
      }
    } catch (err: any) {
      addToast(sanitizeError(err, "Failed to update fee due."), "error");
    } finally {
      setEditingFee(null);
    }
  };

  const handleBulkDeleteFees = async () => {
    if (!isAccountant) {
      addToast("Permission Denied: Only the cooperative accountant can delete dues.", "error");
      return;
    }
    if (selectedBulkFeeIds.length === 0 || !activeOrg?.id) return;
    setIsBulkDeleting(true);
    try {
      await deleteFeeMutation.mutateAsync({
        ids: selectedBulkFeeIds,
        org_id: activeOrg.id,
        user_name: user?.full_name || (activeMember as any)?.user?.full_name || "Accountant",
        user_id: user?.id || activeMember?.id,
        fee_amount: selectedBulkFeeIds.reduce((sum, id) => {
          const feeObj = fees?.find((f) => f.id === id);
          return sum + (feeObj?.amount || 0);
        }, 0),
      });
      addToast(`Successfully removed ${selectedBulkFeeIds.length} dues charge(s)!`, "success");
      setSelectedBulkFeeIds([]);
      setShowBulkDeleteConfirm(false);
    } catch (err: any) {
      addToast(sanitizeError(err, "Failed to delete selected dues."), "error");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkMarkAsPaid = async () => {
    if (!isAccountant) {
      addToast("Permission Denied: Only the cooperative accountant can verify dues.", "error");
      return;
    }
    if (selectedBulkFeeIds.length === 0 || !activeOrg?.id) return;
    try {
      for (const feeId of selectedBulkFeeIds) {
        const feeObj = fees?.find((f) => f.id === feeId);
        if (feeObj && feeObj.status !== "paid") {
          await updateFeeStatusMutation.mutateAsync({
            id: feeId,
            org_id: activeOrg.id,
            status: "paid",
            amount: feeObj.amount,
            paid_by_method: "Bank Transfer",
            paid_at: new Date().toISOString(),
            actor_name: user?.full_name || "Accountant",
            user_id: user?.id,
          });
        }
      }
      addToast(`Marked ${selectedBulkFeeIds.length} dues as Cleared / Paid!`, "success");
      setSelectedBulkFeeIds([]);
    } catch (err: any) {
      addToast(sanitizeError(err, "Failed to update dues."), "error");
    }
  };

  const toggleSelectFee = (feeId: string) => {
    if (!isAccountant) return;
    setSelectedBulkFeeIds((prev) =>
      prev.includes(feeId) ? prev.filter((id) => id !== feeId) : [...prev, feeId]
    );
  };

  const toggleSelectAllDues = (allIds: string[]) => {
    if (!isAccountant) return;
    if (allIds.every((id) => selectedBulkFeeIds.includes(id))) {
      setSelectedBulkFeeIds((prev) => prev.filter((id) => !allIds.includes(id)));
    } else {
      setSelectedBulkFeeIds((prev) => Array.from(new Set([...prev, ...allIds])));
    }
  };

  const handleConfirmDeleteFee = async () => {
    if (!isAccountant) return;
    if (!deletingFee || !activeOrg?.id) return;
    try {
      if (deleteScope === "cycle") {
        const cycleFees = (fees || []).filter(
          (f) => f.org_id === activeOrg.id && f.period_date === deletingFee.period_date
        );
        const idsToDelete = cycleFees.map((f) => f.id);
        await deleteFeeMutation.mutateAsync({
          ids: idsToDelete,
          org_id: activeOrg.id,
          user_name: user?.full_name || (activeMember as any)?.user?.full_name || "Accountant",
          user_id: user?.id || activeMember?.id,
          fee_amount: deletingFee.amount * idsToDelete.length,
        });
        addToast(`Due cycle "${deletingFee.period_date}" removed and all ${idsToDelete.length} member charges deleted!`, "success");
      } else {
        await deleteFeeMutation.mutateAsync({
          id: deletingFee.id,
          ids: [deletingFee.id],
          org_id: activeOrg.id,
          user_name: user?.full_name || (activeMember as any)?.user?.full_name || "Accountant",
          user_id: user?.id || activeMember?.id,
          fee_amount: deletingFee.amount,
          fee_ref: deletingFee.transaction_reference,
          member_name: deletingFee.member_name,
        });
        addToast("Fee record deleted and ledger synchronized successfully!", "success");
      }
    } catch (err: any) {
      addToast(sanitizeError(err, "Failed to delete fee due."), "error");
    } finally {
      setDeletingFee(null);
      setDeleteScope("single");
    }
  };

  const handleDeleteCycleDirect = (scheme: {
    period_date: string;
    payment_period: string;
    member_count: number;
    total_expected: number;
    members: MemberFee[];
  }) => {
    if (!isAccountant) return;
    setDeletingCycle({
      period_date: scheme.period_date,
      payment_period: scheme.payment_period,
      count: scheme.member_count,
      total_amount: scheme.total_expected,
      ids: scheme.members.map((m) => m.id),
    });
  };

  const handleConfirmDeleteCycle = async () => {
    if (!isAccountant) return;
    if (!deletingCycle || !activeOrg?.id) return;
    try {
      await deleteFeeMutation.mutateAsync({
        ids: deletingCycle.ids,
        org_id: activeOrg.id,
        user_name: user?.full_name || (activeMember as any)?.user?.full_name || "Accountant",
        user_id: user?.id || activeMember?.id,
        fee_amount: deletingCycle.total_amount,
      });
      addToast(`Due cycle "${deletingCycle.period_date}" and all ${deletingCycle.count} charges deleted!`, "success");
    } catch (err: any) {
      addToast(sanitizeError(err, "Failed to delete due cycle."), "error");
    } finally {
      setDeletingCycle(null);
    }
  };

  const handleSaveFeeNotification = async (text: string) => {
    if (!activeOrg) return;
    setIsBroadcasting(true);
    try {
      await updateOrgMutation.mutateAsync({
        id: activeOrg.id,
        fee_notification: text || ""
      });

      if (text) {
        await broadcastMutation.mutateAsync({
          org_id: activeOrg.id,
          sent_by: user?.id || "",
          recipient_group: "All Members",
          recipient_count: members?.length || 10,
          body_text: `CO-OP ALERT: ${text}`
        });
      }

      addToast(
        text 
          ? "Broadcast warning saved & payment notifications pushed!" 
          : "Active fee warning notifications cleared successfully.", 
        "success"
      );
    } catch (err: any) {
      addToast(sanitizeError(err, "Failed to update broadcast settings."), "error");
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Global Lists Computations
  const paidDuesList = fees?.filter((f) => f.status === "paid") || [];
  const pendingDuesList = fees?.filter((f) => f.status === "pending" || f.status === "pending_confirmation") || [];
  const awaitingVerificationList = fees?.filter((f) => f.status === "pending_confirmation") || [];

  const paidSumRwf = paidDuesList.reduce((acc, current) => acc + (Number(current.amount) || 0), 0);
  const pendingSumRwf = pendingDuesList.reduce((acc, current) => acc + (Number(current.amount) || 0), 0);

  const myPaidSumRwf = myDues.filter((f) => f.status === "paid").reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const myPendingSumRwf = myDues.filter((f) => f.status === "pending" || f.status === "pending_confirmation").reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const myAwaitingCount = myDues.filter((f) => f.status === "pending_confirmation").length;

  // Chart Data preparation for Accountants
  const periodChartData = React.useMemo(() => {
    if (!fees || fees.length === 0) return [];
    const map: Record<string, { period: string; paid: number; awaiting: number; unpaid: number }> = {};
    
    fees.forEach((f) => {
      const key = f.period_date || f.payment_period || "General";
      const amt = Number(f.amount) || 0;
      if (!map[key]) {
        map[key] = { period: key, paid: 0, awaiting: 0, unpaid: 0 };
      }
      if (f.status === "paid") {
        map[key].paid += amt;
      } else if (f.status === "pending_confirmation") {
        map[key].awaiting += amt;
      } else {
        map[key].unpaid += amt;
      }
    });

    return Object.values(map).slice(-8);
  }, [fees]);

  const paymentMethodData = React.useMemo(() => {
    if (!fees) return [];
    let momoCount = 0, momoAmount = 0;
    let cashCount = 0, cashAmount = 0;
    let unpaidCount = 0, unpaidAmount = 0;

    fees.forEach((f) => {
      const amt = Number(f.amount) || 0;
      if (f.status === "paid" || f.status === "pending_confirmation") {
        if (f.paid_by_method?.includes("MoMo") || f.paid_by_method?.includes("Airtel") || f.paid_by_method?.includes("MTN")) {
          momoCount++;
          momoAmount += amt;
        } else if (f.paid_by_method?.includes("Cash")) {
          cashCount++;
          cashAmount += amt;
        } else {
          momoCount++;
          momoAmount += amt;
        }
      } else {
        unpaidCount++;
        unpaidAmount += amt;
      }
    });

    return [
      { name: "Mobile Money (MoMo/Airtel)", count: momoCount, amount: momoAmount, color: "#10b981" },
      { name: "Hand Cash", count: cashCount, amount: cashAmount, color: "#3b82f6" },
      { name: "Unpaid / Pending", count: unpaidCount, amount: unpaidAmount, color: "#f43f5e" }
    ];
  }, [fees]);

  // Filters computed across all ledger entries (or user specific ledger)
  const isViewMyDues = !isAccountant || activeTab === "my_dues";
  const sourceList = isViewMyDues ? myDues : fees || [];

  const filteredFees = sourceList.filter((f) => {
    // Tab filtering (pending approvals tab shows ONLY payments waiting for accountant confirmation)
    if (activeTab === "pending_approvals") {
      if (f.status !== "pending_confirmation") return false;
    }
    const matchesPeriod = periodFilter === "all" || f.payment_period === periodFilter;
    const matchesStatus = 
      activeTab === "pending_approvals" 
        ? true
        : (statusFilter === "all" || f.status === statusFilter || (statusFilter === "pending" && (f.status === "pending" || f.status === "pending_confirmation")));
    
    const term = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === "" || 
      f.member_name?.toLowerCase().includes(term) || 
      f.period_date?.toLowerCase().includes(term) ||
      f.paid_by_method?.toLowerCase().includes(term) ||
      f.transaction_reference?.toLowerCase().includes(term);

    return matchesPeriod && matchesStatus && matchesSearch;
  });

  // Computed list for the Manage All Dues Modal with multi-filters and sorting
  const allDuesFilteredList = React.useMemo(() => {
    if (!fees) return [];
    let list = [...fees];

    // Status filter
    if (allDuesStatusFilter !== "all") {
      list = list.filter((f) => f.status === allDuesStatusFilter);
    }

    // Period filter
    if (allDuesPeriodFilter !== "all") {
      list = list.filter((f) => f.payment_period === allDuesPeriodFilter);
    }

    // Search query
    if (allDuesSearch.trim()) {
      const term = allDuesSearch.toLowerCase().trim();
      list = list.filter((f) => {
        return (
          f.member_name?.toLowerCase().includes(term) ||
          f.period_date?.toLowerCase().includes(term) ||
          f.transaction_reference?.toLowerCase().includes(term) ||
          f.paid_by_method?.toLowerCase().includes(term) ||
          f.admin_note?.toLowerCase().includes(term) ||
          f.report_note?.toLowerCase().includes(term) ||
          f.amount.toString().includes(term)
        );
      });
    }

    // Sorting
    list.sort((a, b) => {
      if (allDuesSortBy === "newest") {
        return new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime();
      }
      if (allDuesSortBy === "oldest") {
        return new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime();
      }
      if (allDuesSortBy === "highest") {
        return b.amount - a.amount;
      }
      if (allDuesSortBy === "lowest") {
        return a.amount - b.amount;
      }
      if (allDuesSortBy === "member_asc") {
        return (a.member_name || "").localeCompare(b.member_name || "");
      }
      if (allDuesSortBy === "member_desc") {
        return (b.member_name || "").localeCompare(a.member_name || "");
      }
      if (allDuesSortBy === "due_date") {
        const da = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const db = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        return da - db;
      }
      return 0;
    });

    return list;
  }, [fees, allDuesStatusFilter, allDuesPeriodFilter, allDuesSearch, allDuesSortBy]);

  // Master Dues Schemes (Grouped as created from the dues form)
  const duesSchemes = React.useMemo(() => {
    if (!fees || fees.length === 0) return [];
    const map = new Map<string, {
      key: string;
      period_date: string;
      payment_period: string;
      rate_amount: number;
      due_date?: string;
      is_recurring?: boolean;
      admin_note?: string;
      created_at?: string;
      total_expected: number;
      total_cleared: number;
      total_pending: number;
      total_review: number;
      member_count: number;
      cleared_count: number;
      pending_count: number;
      review_count: number;
      members: MemberFee[];
    }>();

    fees.forEach((f) => {
      const pDate = f.period_date || "Flexible";
      const pPeriod = f.payment_period || "monthly";
      const key = `${pDate}:::${pPeriod}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          period_date: pDate,
          payment_period: pPeriod,
          rate_amount: Number(f.amount) || 0,
          due_date: f.due_date,
          is_recurring: f.is_recurring,
          admin_note: f.admin_note,
          created_at: f.created_at,
          total_expected: 0,
          total_cleared: 0,
          total_pending: 0,
          total_review: 0,
          member_count: 0,
          cleared_count: 0,
          pending_count: 0,
          review_count: 0,
          members: [],
        });
      }

      const scheme = map.get(key)!;
      scheme.member_count += 1;
      scheme.total_expected += Number(f.amount) || 0;
      scheme.members.push(f);
      if (!scheme.due_date && f.due_date) scheme.due_date = f.due_date;
      if (!scheme.admin_note && f.admin_note) scheme.admin_note = f.admin_note;

      if (f.status === "paid") {
        scheme.cleared_count += 1;
        scheme.total_cleared += Number(f.amount) || 0;
      } else if (f.status === "pending_confirmation") {
        scheme.review_count += 1;
        scheme.total_review += Number(f.amount) || 0;
      } else {
        scheme.pending_count += 1;
        scheme.total_pending += Number(f.amount) || 0;
      }
    });

    let list = Array.from(map.values());
    if (periodFilter !== "all") {
      list = list.filter((s) => s.payment_period === periodFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.period_date.toLowerCase().includes(q) ||
          s.payment_period.toLowerCase().includes(q) ||
          (s.admin_note && s.admin_note.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => b.period_date.localeCompare(a.period_date));
  }, [fees, periodFilter, searchQuery]);

  return (
    <div className="space-y-6 md:space-y-8 container mx-auto max-w-7xl px-4 py-6 font-sans select-none" id="fees-management-container">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-5" id="fees-sub-header">
        <div>
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 tracking-wider uppercase">
            {activeOrg?.name} {t("fees_ledger_dues")}
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold font-display leading-none tracking-tight text-stone-900 dark:text-white mt-1">
            {t("fees_title")}
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-1 dark:text-slate-400 font-medium">
            {t("fees_sub")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAccountant && (
            <>
              <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 font-bold rounded-xl shadow-xs" id="btn-add-fee">
                <Plus className="h-4 w-4" /> {t("fees_charge_new_btn")}
              </Button>
              <Button 
                onClick={() => {
                  setSelectedBulkFeeIds([]);
                  setShowAllDuesModal(true);
                }} 
                variant="outline" 
                className="flex items-center gap-1.5 py-2.5 font-bold rounded-xl border-emerald-600/30 dark:border-slate-700 text-stone-800 dark:text-slate-100 hover:bg-emerald-50/50 dark:hover:bg-slate-800 shadow-3xs" 
                id="btn-show-all-dues"
              >
                <ListFilter className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Manage All Dues
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  {fees?.length || 0}
                </span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Cooperative Broadcast alert / warning system banner */}
      {activeOrg?.fee_notification && myDues.some(f => f.status === "pending") && (
        <div className="bg-red-50 dark:bg-rose-950/20 border-l-4 border-rose-600 p-4.5 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-3xs shrink-0" id="payment-warning-banner">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="font-extrabold text-[10px] uppercase tracking-wider text-rose-800 dark:text-rose-400">{t("URGENT COOPERATIVE PAYMENT REMINDER")}</span>
              <p className="text-xs text-stone-900 dark:text-slate-100 font-extrabold mt-1">
                {activeOrg.fee_notification}
              </p>
              <p className="text-[10px] text-gray-500 mt-1 leading-normal font-semibold">
                {t("My profile ledger shows")} <span className="font-black text-rose-600">{myDues.filter(f => f.status === "pending").length} {t("unpaid dues cycle(s)")}</span>. {t("Please settle them immediately to maintain compliance.")}
              </p>
            </div>
          </div>
          <Button 
            size="sm" 
            className="self-start sm:self-center bg-rose-600 hover:bg-rose-700 text-white shrink-0 font-bold rounded-xl"
            onClick={() => {
              setActiveTab("my_dues");
              document.getElementById("fees-tabs-navigation")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            {t("View Statement & Pay")} <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Metrics board matching Image 3 design */}
      {isAccountant ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" id="fees-metrics-grid">
          {/* Card 1: Total Expected */}
          <div className="card card-glow bg-white dark:bg-slate-850 p-5 rounded-2xl border border-gray-200/80 dark:border-slate-800 border-t-[3px] border-t-[#156c45] shadow-3xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#4a6357] dark:text-slate-400">
                Total Expected
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#e8f5ee] dark:bg-emerald-950/40 text-[#156c45] dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Coins className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-display font-bold text-[#111c16] dark:text-white">
                RWF {(paidSumRwf + pendingSumRwf).toLocaleString()}
              </span>
              <p className="text-xs text-[#9db8a8] dark:text-slate-400 font-medium mt-1">
                across {members?.length || 48} active members
              </p>
            </div>
          </div>

          {/* Card 2: Total Collected */}
          <div className="card card-glow bg-white dark:bg-slate-850 p-5 rounded-2xl border border-gray-200/80 dark:border-slate-800 border-t-[3px] border-t-[#156c45] shadow-3xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#4a6357] dark:text-slate-400">
                Total Collected
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#e8f5ee] dark:bg-emerald-950/40 text-[#156c45] dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-display font-bold text-[#156c45] dark:text-emerald-400">
                RWF {paidSumRwf.toLocaleString()}
              </span>
              <p className="text-xs text-[#9db8a8] dark:text-slate-400 font-medium mt-1">
                {(paidSumRwf + pendingSumRwf) > 0 ? Math.round((paidSumRwf / (paidSumRwf + pendingSumRwf)) * 100) : 100}% collection rate
              </p>
            </div>
          </div>

          {/* Card 3: Outstanding */}
          <div className="card card-glow bg-white dark:bg-slate-850 p-5 rounded-2xl border border-gray-200/80 dark:border-slate-800 border-t-[3px] border-t-[#e24b4a] shadow-3xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#4a6357] dark:text-slate-400">
                Outstanding
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#fdf0f0] dark:bg-rose-950/40 text-[#e24b4a] dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertCircle className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-display font-bold text-[#e24b4a] dark:text-rose-400">
                RWF {pendingSumRwf.toLocaleString()}
              </span>
              <p className="text-xs text-[#9db8a8] dark:text-slate-400 font-medium mt-1">
                {pendingDuesList.length} payment cycles pending
              </p>
            </div>
          </div>

          {/* Card 4: Pending Verification */}
          <div className="card card-glow bg-white dark:bg-slate-850 p-5 rounded-2xl border border-gray-200/80 dark:border-slate-800 border-t-[3px] border-t-[#c8962a] shadow-3xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#4a6357] dark:text-slate-400">
                Pending Verification
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#fdf3dc] dark:bg-amber-950/40 text-[#c8962a] dark:text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-display font-bold text-[#111c16] dark:text-white flex items-center gap-2">
                {awaitingVerificationList.length}
                {awaitingVerificationList.length > 0 && (
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping inline-block" />
                )}
              </span>
              <p className="text-xs text-[#9db8a8] dark:text-slate-400 font-medium mt-1">
                Slips awaiting review
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" id="fees-metrics-grid">
          {/* Member Card 1: My Total Expected */}
          <div className="card card-glow bg-white dark:bg-slate-850 p-5 rounded-2xl border border-gray-200/80 dark:border-slate-800 border-t-[3px] border-t-[#156c45] shadow-3xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#4a6357] dark:text-slate-400">
                My Total Invoiced
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#e8f5ee] dark:bg-emerald-950/40 text-[#156c45] dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Coins className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-display font-bold text-[#111c16] dark:text-white">
                RWF {(myPaidSumRwf + myPendingSumRwf).toLocaleString()}
              </span>
              <p className="text-xs text-[#9db8a8] dark:text-slate-400 font-medium mt-1">
                all assigned payment cycles
              </p>
            </div>
          </div>

          {/* Member Card 2: My Cleared */}
          <div className="card card-glow bg-white dark:bg-slate-850 p-5 rounded-2xl border border-gray-200/80 dark:border-slate-800 border-t-[3px] border-t-[#156c45] shadow-3xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#4a6357] dark:text-slate-400">
                Cleared Dues
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#e8f5ee] dark:bg-emerald-950/40 text-[#156c45] dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-display font-bold text-[#156c45] dark:text-emerald-400">
                RWF {myPaidSumRwf.toLocaleString()}
              </span>
              <p className="text-xs text-[#9db8a8] dark:text-slate-400 font-medium mt-1">
                verified settlements
              </p>
            </div>
          </div>

          {/* Member Card 3: Outstanding */}
          <div className="card card-glow bg-white dark:bg-slate-850 p-5 rounded-2xl border border-gray-200/80 dark:border-slate-800 border-t-[3px] border-t-[#e24b4a] shadow-3xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#4a6357] dark:text-slate-400">
                Outstanding Balance
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#fdf0f0] dark:bg-rose-950/40 text-[#e24b4a] dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertCircle className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-display font-bold text-[#e24b4a] dark:text-rose-400">
                RWF {myPendingSumRwf.toLocaleString()}
              </span>
              <p className="text-xs text-[#9db8a8] dark:text-slate-400 font-medium mt-1">
                {myDues.filter(f => f.status === "pending").length} invoices to clear
              </p>
            </div>
          </div>

          {/* Member Card 4: Under Review */}
          <div className="card card-glow bg-white dark:bg-slate-850 p-5 rounded-2xl border border-gray-200/80 dark:border-slate-800 border-t-[3px] border-t-[#c8962a] shadow-3xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#4a6357] dark:text-slate-400">
                Slips Under Review
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#fdf3dc] dark:bg-amber-950/40 text-[#c8962a] dark:text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-display font-bold text-[#111c16] dark:text-white">
                {myAwaitingCount}
              </span>
              <p className="text-xs text-[#9db8a8] dark:text-slate-400 font-medium mt-1">
                awaiting officer sign-off
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Accountant Insights & Payment Collection Graphs */}
      {isAccountant && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-xs space-y-4" id="accountant-payment-analytics">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-600" /> Accountant Insights & Payment Collection Analytics
              </h3>
              <p className="text-[11px] text-gray-500">
                Visual breakdown of collected dues, payment channels, and member settlement trends.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-3 py-1 rounded-full">
                Collection Rate: {((paidSumRwf / ((paidSumRwf + pendingSumRwf) || 1)) * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Collection Progress Bar */}
          <div className="space-y-1.5 bg-stone-50 dark:bg-slate-950 p-3.5 rounded-xl border border-stone-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-[11px] font-bold text-stone-700 dark:text-slate-300">
              <span>Collection Target: {(paidSumRwf + pendingSumRwf).toLocaleString()} RWF</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono font-extrabold">{paidSumRwf.toLocaleString()} RWF Cleared</span>
            </div>
            <div className="w-full bg-stone-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden flex">
              <div 
                className="bg-emerald-500 h-full transition-all duration-500" 
                style={{ width: `${Math.min(100, (paidSumRwf / ((paidSumRwf + pendingSumRwf) || 1)) * 100)}%` }}
                title="Paid"
              />
              <div 
                className="bg-amber-400 h-full transition-all duration-500" 
                style={{ width: `${Math.min(100, (awaitingVerificationList.reduce((a, b) => a + (Number(b.amount) || 0), 0) / ((paidSumRwf + pendingSumRwf) || 1)) * 100)}%` }}
                title="Awaiting Verification"
              />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[10px] text-gray-500 font-semibold pt-1">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Cleared Paid ({paidSumRwf.toLocaleString()} RWF)</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> Submitted Awaiting Review ({awaitingVerificationList.reduce((a, b) => a + (Number(b.amount) || 0), 0).toLocaleString()} RWF)</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> Unpaid Outstanding ({(fees?.filter(f => f.status === "pending").reduce((a, b) => a + (Number(b.amount) || 0), 0) || 0).toLocaleString()} RWF)</span>
            </div>
          </div>

          {/* Recharts Graphical Visualizers */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
            {/* Chart 1: Collection by Cycle / Period */}
            <div className="lg:col-span-2 bg-stone-50 dark:bg-slate-950 p-4 rounded-xl border border-gray-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-stone-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-blue-600" /> Payment Collection Trends by Cycle Period
              </h4>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={periodChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <XAxis dataKey="period" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} tickFormatter={(v) => `${v/1000}k`} />
                    <Tooltip 
                      formatter={(value: any) => [`${Number(value).toLocaleString()} RWF`]}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '11px', borderRadius: '8px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="paid" name="Paid (RWF)" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="awaiting" name="Awaiting Review (RWF)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="unpaid" name="Unpaid (RWF)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Payment Method Breakdown */}
            <div className="bg-stone-50 dark:bg-slate-950 p-4 rounded-xl border border-gray-100 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-stone-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
                  <PieChartIcon className="h-3.5 w-3.5 text-purple-600" /> Payment Channel Distribution
                </h4>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentMethodData}
                        cx="50%"
                        cy="50%"
                        innerRadius={38}
                        outerRadius={62}
                        paddingAngle={4}
                        dataKey="amount"
                      >
                        {paymentMethodData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => [`${Number(value).toLocaleString()} RWF`]}
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '11px', borderRadius: '8px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-1.5 text-[11px] pt-2 border-t dark:border-slate-800">
                {paymentMethodData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between font-medium">
                    <span className="flex items-center gap-1.5 text-gray-600 dark:text-slate-300">
                      <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <span className="font-mono font-bold text-stone-900 dark:text-white">
                      {item.amount.toLocaleString()} RWF
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Roster tab selections - Shown ONLY to Accountants */}
      {isAccountant && (
        <div className="p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 inline-flex items-center gap-1 shadow-3xs overflow-x-auto scrollbar-none" id="fees-tabs-navigation">
          <button
            id="tab-ledger"
            onClick={() => { setActiveTab("ledger"); setStatusFilter("all"); }}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "ledger"
                ? "bg-white dark:bg-slate-900 text-[#156c45] dark:text-emerald-400 shadow-3xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
            }`}
          >
            <Coins className="h-4 w-4" /> {t("fees_tab_ledger")}
          </button>
          <button
            id="tab-pending-approvals"
            onClick={() => { setActiveTab("pending_approvals"); setStatusFilter("all"); }}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shrink-0 relative ${
              activeTab === "pending_approvals"
                ? "bg-white dark:bg-slate-900 text-[#156c45] dark:text-emerald-400 shadow-3xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
            }`}
          >
            <ShieldCheck className="h-4 w-4" /> {t("fees_tab_pending")}
            {awaitingVerificationList.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white animate-pulse">
                {awaitingVerificationList.length}
              </span>
            )}
          </button>
          <button
            id="tab-my-dues"
            onClick={() => { setActiveTab("my_dues"); setStatusFilter("all"); }}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shrink-0 relative ${
              activeTab === "my_dues"
                ? "bg-white dark:bg-slate-900 text-[#156c45] dark:text-emerald-400 shadow-3xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
            }`}
          >
            <Smartphone className="h-4 w-4" /> {t("fees_tab_personal")}
            {myDues.filter(f => f.status === "pending").length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white">
                {myDues.filter(f => f.status === "pending").length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Member Portal Banner - Shown to Non-Accountants */}
      {!isAccountant && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 rounded-2xl shadow-3xs" id="member-portal-banner">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold shrink-0">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-stone-900 dark:text-white flex items-center gap-2">
                My Member Statement & Payment Portal
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                  Member Access
                </span>
              </h2>
              <p className="text-xs text-stone-600 dark:text-slate-400 font-medium mt-0.5">
                View your personal cooperative dues, payment history, and submit transaction slips for accountant verification.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {myDues.filter(f => f.status === "pending").length === 0 ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-extrabold bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-xl text-xs shadow-3xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> All Dues Up To Date
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-extrabold bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 px-3 py-1.5 rounded-xl text-xs shadow-3xs">
                <AlertCircle className="h-4 w-4 text-rose-600" /> {myDues.filter(f => f.status === "pending").length} Payment(s) Due
              </span>
            )}
          </div>
        </div>
      )}

      {/* Filters panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5 rounded-2xl shadow-3xs select-none overflow-x-auto max-w-full" id="fees-filters-bar">
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 max-w-full overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0">
              <Filter className="h-3 w-3" /> Cycle Type:
            </span>
            <div className="p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 inline-flex items-center gap-1 text-[11px] shrink-0" id="filter-btn-group-period">
              {["all", "weekly", "monthly", "flexible"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriodFilter(p as any)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg capitalize transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    periodFilter === p
                      ? "bg-white dark:bg-slate-900 text-[#156c45] dark:text-emerald-400 shadow-3xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {activeTab !== "pending_approvals" && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0">
                <Filter className="h-3 w-3" /> Status:
              </span>
              <div className="p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 inline-flex items-center gap-1 text-[11px] shrink-0 max-w-full overflow-x-auto no-scrollbar" id="filter-btn-group-status">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    statusFilter === "all"
                      ? "bg-white dark:bg-slate-900 text-[#156c45] dark:text-emerald-400 shadow-3xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("paid")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    statusFilter === "paid"
                      ? "bg-emerald-600 text-white shadow-3xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
                  }`}
                >
                  Paid
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("pending_confirmation")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    statusFilter === "pending_confirmation"
                      ? "bg-amber-500 text-white shadow-3xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
                  }`}
                >
                  Pending Review
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("pending")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    statusFilter === "pending"
                      ? "bg-rose-600 text-white shadow-3xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
                  }`}
                >
                  Unpaid
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {loadingFees ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl" id="div-fees-loading">
          <Clock className="h-8 w-8 text-emerald-600 animate-spin mx-auto mb-3" />
          <p className="text-xs text-gray-400 animate-pulse font-bold tracking-wider">Retrieving cooperative dues and receipts...</p>
        </div>
      ) : filteredFees.length > 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-3xs" id="fees-ledger-container-box">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse" id="fees-ledger-rendered-table">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] leading-normal">
                  <th className="py-3.5 px-4">{isAccountant ? "Member Name" : "Contribution / Fee"}</th>
                  <th className="py-3.5 px-4">Allocated period</th>
                  <th className="py-3.5 px-4">Dues Cycle</th>
                  <th className="py-3.5 px-4">Amount Invoice</th>
                  <th className="py-3.5 px-4">Settlement Info</th>
                  <th className="py-3.5 px-4">Overall Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/70 dark:divide-slate-800/80 text-stone-800 dark:text-slate-100 font-medium">
                {filteredFees.map((fee) => {
                  const isMyOwn = !isAccountant || myMemberIds.has(fee.member_id) || fee.member_id === activeMember?.id;
                  
                  return (
                    <tr key={fee.id} className={`hover:bg-gray-50/50 dark:hover:bg-slate-850/20 transition-colors ${isMyOwn ? "bg-emerald-50/20 dark:bg-emerald-950/5" : ""}`}>
                      <td className="py-3.5 px-4 font-bold text-stone-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full shrink-0 ${
                            fee.status === "paid" 
                              ? "bg-emerald-500" 
                              : fee.status === "pending_confirmation" 
                                ? "bg-amber-500 animate-ping" 
                                : "bg-rose-500"
                          }`} />
                          <div className="flex flex-col">
                            <span className="font-bold flex items-center gap-1.5">
                              {isAccountant ? fee.member_name : `Cooperative Dues (${fee.period_date})`}
                              {isMyOwn && isAccountant && <span className="bg-emerald-200 dark:bg-emerald-900 dark:text-emerald-300 text-emerald-800 px-1 rounded text-[9px] font-black uppercase">Me</span>}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-gray-600 dark:text-gray-300 uppercase">
                        {fee.payment_period}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-black text-gray-500">
                        {fee.period_date}
                      </td>
                      <td className="py-3.5 px-4 font-extrabold font-mono text-zinc-900 dark:text-zinc-50">
                        {fee.amount.toLocaleString()} <span className="text-[9px] font-bold">RWF</span>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        {fee.status === "paid" ? (
                          <div className="flex flex-col gap-0.5" id={`settlement-info-${fee.id}`}>
                            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Verified: {fee.paid_by_method || "Direct gateway"}
                            </span>
                            {fee.transaction_reference && (
                              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 pl-5">
                                Ref: {fee.transaction_reference}
                              </span>
                            )}
                          </div>
                        ) : fee.status === "pending_confirmation" ? (
                          <div className="flex flex-col gap-0.5" id={`settlement-info-${fee.id}`}>
                            <span className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" /> Reported via {fee.paid_by_method}
                            </span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 pl-5">
                              Awaiting supervisor validation
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-0.5" id={`settlement-info-${fee.id}`}>
                            {(() => {
                              const info = getFeeDeadlineInfo(fee);
                              if (info.isFlexible) {
                                return (
                                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
                                    Flexible (Settle anytime)
                                  </span>
                                );
                              }
                              if (info.isOverdue) {
                                return (
                                  <div className="flex flex-col">
                                    <span className="text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                                      Overdue by {info.overdueDays}d
                                    </span>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 pl-3">
                                      Due {info.formattedDate}
                                    </span>
                                  </div>
                                );
                              }
                              if (info.daysLeft === 0) {
                                return (
                                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                                    Due Today ({info.formattedDate})
                                  </span>
                                );
                              }
                              return (
                                <div className="flex flex-col">
                                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                                    Due {info.formattedDate}
                                  </span>
                                  <span className="text-[11px] text-slate-400 dark:text-slate-500 pl-3">
                                    {info.daysLeft} days left
                                  </span>
                                </div>
                              );
                            })()}
                            {fee.is_recurring && (
                              <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5 select-none pl-3">
                                <Repeat className="h-2.5 w-2.5 text-slate-400 shrink-0" /> Auto-recurring cycle
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 select-none">
                        {fee.status === "paid" ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                            Cleared
                          </span>
                        ) : fee.status === "pending_confirmation" ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                            Under Review
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                            Unpaid
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right selection:none shrink-0 border-l border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Member side pay button */}
                          {fee.status === "pending" && isMyOwn && (
                            <button 
                              id={`btn-member-pay-${fee.id}`}
                              onClick={() => {
                                setSelectedFeeToPay(fee);
                                setPayMethod("MTN MoMo / Airtel");
                              }}
                              className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium inline-flex items-center gap-1.5 shadow-2xs transition"
                            >
                              <Smartphone className="h-3.5 w-3.5" /> Pay
                            </button>
                          )}

                          {/* Member slip under review indicator */}
                          {!isAccountant && fee.status === "pending_confirmation" && (
                            <span className="h-7 px-2.5 text-[11px] text-amber-700 dark:text-amber-400 font-medium inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-900/40">
                              <Clock className="h-3 w-3 animate-spin text-amber-600" /> Slip Under Review
                            </span>
                          )}

                          {/* Accountant Review & Verify actions */}
                          {isAccountant && (fee.status === "pending_confirmation" || fee.status === "pending") && (
                            <button
                              id={`btn-admin-review-${fee.id}`}
                              onClick={() => {
                                setReviewingFee(fee);
                                setAdminNoteInput("");
                              }}
                              className={`h-7 px-2.5 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 transition shadow-2xs text-white ${
                                fee.status === "pending_confirmation"
                                  ? "bg-amber-600 hover:bg-amber-700"
                                  : "bg-emerald-600 hover:bg-emerald-700"
                              }`}
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              {fee.status === "pending_confirmation" ? "Review Slip" : "Verify Payment"}
                            </button>
                          )}

                          {/* View Official Receipt button for paid dues */}
                          {fee.status === "paid" && (
                            <button
                              id={`btn-receipt-${fee.id}`}
                              onClick={() => setViewingReceiptFee(fee)}
                              className="h-7 px-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 transition"
                            >
                              <Receipt className="h-3.5 w-3.5 text-slate-500" /> Receipt
                            </button>
                          )}

                          {/* Edit Due for accountants only */}
                          {isAccountant && (
                            <button
                              id={`btn-edit-fee-${fee.id}`}
                              onClick={() => openEditModal(fee)}
                              className="h-7 px-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium rounded-lg inline-flex items-center gap-1 transition"
                              title="Edit Details"
                            >
                              <Pencil className="h-3 w-3" /> Edit
                            </button>
                          )}

                          {/* Delete Due for accountants only */}
                          {isAccountant && (
                            <button
                              id={`btn-delete-fee-${fee.id}`}
                              onClick={() => setDeletingFee(fee)}
                              className="h-7 px-2 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-900 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 text-xs font-medium rounded-lg inline-flex items-center gap-1 transition"
                              title="Delete"
                            >
                              <Trash2 className="h-3 w-3" /> Delete
                            </button>
                          )}

                          {/* Quick Accountant Toggle status */}
                          {isAccountant && (
                            <button
                              id={`btn-admin-toggle-legacy-${fee.id}`}
                              onClick={() => handleToggleStatusLegacy(fee)}
                              className="h-7 w-7 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg inline-flex items-center justify-center transition"
                              title="Toggle Cleared / Unpaid"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-slate-900 border rounded-xl" id="empty-dues">
          <Coins className="h-12 w-12 text-gray-300 dark:text-slate-720 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-800 dark:text-white">No Dues Logged Matching Selection</h3>
          <p className="text-xs text-gray-450 mt-1 max-w-sm mx-auto">
            {activeTab === "pending_approvals" 
              ? "Wonderful! No cooperative members are waiting for payment slip verifications right now."
              : "There are no contribution fees or membership dues recorded matching the active filters."
            }
          </p>
        </div>
      )}

      {/* Record Contribution modal (Accountant workspace) */}
      {showAddModal && isAccountant && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in" id="add-fee-modal">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-md p-5 sm:p-6 relative max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-stone-900 dark:text-white flex items-center gap-1.5 mb-4">
              <Landmark className="h-5 w-5 text-emerald-700" /> Charge Cooperative Dues Row
            </h2>

            <form onSubmit={handleCreateFee} className="space-y-4">
              <div className="space-y-2 border-b border-dashed pb-3.5 dark:border-slate-800">
                <label className="text-xs font-bold text-gray-751 dark:text-slate-310 block">
                  Cooperative Audience Targeting <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setChargeTargetType("all")}
                    className={`p-2 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      chargeTargetType === "all"
                        ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-350"
                        : "border-gray-200 dark:border-slate-800 text-stone-600 dark:text-slate-400 bg-white dark:bg-slate-950"
                    }`}
                  >
                    All Active Members ({activeMembersOnly.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChargeTargetType("specific");
                      if (selectedMembersToCharge.length === 0 && activeMembersOnly.length > 0) {
                        setSelectedMembersToCharge([activeMembersOnly[0].id]);
                      }
                    }}
                    className={`p-2 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      chargeTargetType === "specific"
                        ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-350"
                        : "border-gray-200 dark:border-slate-800 text-stone-600 dark:text-slate-400 bg-white dark:bg-slate-950"
                    }`}
                  >
                    Specific Members
                  </button>
                </div>

                {chargeTargetType === "specific" && (
                  <div className="mt-2.5 border border-gray-200 dark:border-slate-800 rounded-lg p-2.5 max-h-32 overflow-y-auto space-y-1 bg-gray-50/50 dark:bg-slate-950/20">
                    <span className="text-[10px] font-black tracking-wider uppercase text-gray-400 block mb-1">Select Members to Charge:</span>
                    {activeMembersOnly.map((m) => {
                      const isSelected = selectedMembersToCharge.includes(m.id);
                      return (
                        <label key={m.id} className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-xs select-none">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setSelectedMembersToCharge(prev => prev.filter(id => id !== m.id));
                              } else {
                                setSelectedMembersToCharge(prev => [...prev, m.id]);
                              }
                            }}
                            className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer"
                          />
                          <span className="text-stone-800 dark:text-slate-200 font-medium">
                            {m.user?.full_name} <span className="text-[10px] text-gray-400 font-mono">({m.member_number || "No-ID"})</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-751 dark:text-slate-310">
                    Cycle Period Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formPeriod}
                    onChange={(e) => setFormPeriod(e.target.value as "weekly" | "monthly" | "flexible")}
                    className="w-full text-xs rounded-lg border bg-white dark:bg-slate-950 border-gray-300 dark:border-slate-800 p-2.5 outline-none focus:ring-1 focus:ring-emerald-605 text-stone-800 dark:text-white"
                    id="select-charge-period"
                  >
                    <option value="weekly">Weekly Account</option>
                    <option value="monthly">Monthly Account</option>
                    <option value="flexible">Flexible (Anytime)</option>
                  </select>
                </div>

                {formPeriod === "flexible" ? (
                  <div className="space-y-1 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-lg p-2 flex flex-col justify-center">
                    <span className="text-[10px] uppercase font-black tracking-widest text-emerald-800 dark:text-emerald-400">Not Specific to Cycle</span>
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-350">Member can pay anytime</span>
                  </div>
                ) : (
                  <Input
                    label="Cycle Identifier / Label"
                    placeholder={formPeriod === "weekly" ? "e.g. 2026-W22" : "e.g. May 2026"}
                    required
                    value={formPeriodDate}
                    onChange={(e) => setFormPeriodDate(e.target.value)}
                    id="input-charge-date"
                  />
                )}
              </div>

              {formPeriod !== "flexible" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-751 dark:text-slate-310 block">
                    Cycle Start / Base Date <span className="text-emerald-600 font-normal text-[10px]">(Counts +{formPeriod === "weekly" ? "7" : "30"} days)</span>
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full text-xs rounded-lg border bg-white dark:bg-slate-950 border-gray-300 dark:border-slate-800 p-2.5 outline-none focus:ring-1 focus:ring-emerald-600 text-stone-800 dark:text-white"
                    id="input-charge-start-date"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Contribution Value (RWF)"
                  type="number"
                  placeholder="e.g. 5000"
                  required
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  id="input-charge-amount"
                />

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-751 dark:text-slate-310">
                    Initial Clearing Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as "paid" | "pending")}
                    className="w-full text-xs rounded-lg border bg-white dark:bg-slate-950 border-gray-300 dark:border-slate-800 p-2.5 outline-none focus:ring-1 focus:ring-emerald-600 text-stone-800 dark:text-white"
                    id="select-charge-status"
                  >
                    <option value="pending">Pending Dues (Unpaid)</option>
                    <option value="paid">Pre-cleared (Already paid)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 border-t border-dashed pt-3 dark:border-slate-800">
                {formPeriod !== "flexible" ? (
                  <>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-751 dark:text-slate-310 block">
                          Payment Deadline (Auto-populated Due Date)
                        </label>
                        <span className="text-[10px] text-emerald-600 font-extrabold">
                          Auto: +{formPeriod === "weekly" ? "7 days count" : "30 days count"}
                        </span>
                      </div>
                      <input
                        type="date"
                        value={dueDeadlineDate}
                        onChange={(e) => setDueDeadlineDate(e.target.value)}
                        className="w-full text-xs rounded-lg border bg-white dark:bg-slate-950 border-gray-300 dark:border-slate-800 p-2.5 outline-none focus:ring-1 focus:ring-emerald-600 text-stone-800 dark:text-white font-mono font-bold"
                        id="input-charge-deadline-date"
                      />
                    </div>

                    <div className="flex items-start gap-2 select-none bg-emerald-50/60 dark:bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                      <input
                        type="checkbox"
                        id="checkbox-recurring-charge"
                        checked={formIsRecurring}
                        onChange={(e) => setFormIsRecurring(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer mt-0.5"
                      />
                      <div>
                        <label htmlFor="checkbox-recurring-charge" className="text-xs font-bold text-stone-900 dark:text-slate-200 cursor-pointer block">
                          Auto-recurring charge (Re-apply each time round ends)
                        </label>
                        <span className="text-[10px] text-stone-500 dark:text-slate-400 block mt-0.5">
                          Enables 1-click renewal for future cycles with adjustable amounts and dates.
                        </span>
                      </div>
                    </div>

                    {formPeriod === "weekly" && dueDeadlineDate && (
                      <div className="flex items-center gap-2 select-none">
                        <input
                          type="checkbox"
                          id="checkbox-weekly-reminder"
                          checked={sendPreDeadlineReminder}
                          onChange={(e) => setSendPreDeadlineReminder(e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                        />
                        <label htmlFor="checkbox-weekly-reminder" className="text-[11px] font-bold text-stone-800 dark:text-slate-300 cursor-pointer">
                          Send automated notification reminder to members 2 days before deadline
                        </label>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl text-center select-none text-[11px] text-stone-600 dark:text-slate-400 border font-semibold">
                    Flexible contribution fees have no strict due date or automated reminders.
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-dashed dark:border-slate-800">
                <Button variant="outline" type="button" onClick={() => setShowAddModal(false)} id="btn-cancel-charge">
                  Cancel
                </Button>
                <Button type="submit" disabled={createFeeMutation.isPending} id="btn-commit-charge" className="bg-emerald-700 hover:bg-emerald-800">
                  {createFeeMutation.isPending ? "Configuring..." : "Commit Transaction"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Pay / Report Payment Modal */}
      {selectedFeeToPay && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in" id="pay-report-modal">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
            {/* Header: matched to other cards in the system (clean card surface, not solid green banner) */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Pay cooperative dues
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Record a payment via mobile money or cash
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedFeeToPay(null)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                id="btn-close-pay-modal"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Target summary card */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-medium">Invoice period</span>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                    {selectedFeeToPay.payment_period}
                  </p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    Date: {selectedFeeToPay.period_date}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Amount due</span>
                  <span className="text-base font-semibold font-mono text-slate-900 dark:text-white mt-0.5">
                    {selectedFeeToPay.amount.toLocaleString()} RWF
                  </span>
                </div>
              </div>

              {/* Selector for payment reported method */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Payment method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "MTN MoMo / Airtel", label: "Mobile Money", subtitle: "MTN or Airtel transfer" },
                    { id: "Cash", label: "Cash payment", subtitle: "Direct to cashier" }
                  ].map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      id={`btn-pay-method-${method.id.replace(/\s+/g, '-')}`}
                      onClick={() => setPayMethod(method.id as any)}
                      className={`flex flex-col items-start p-2.5 border rounded-lg text-left transition cursor-pointer ${
                        payMethod === method.id
                          ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 text-slate-900 dark:text-slate-100"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 text-slate-700 dark:text-slate-400"
                      }`}
                    >
                      <span className="text-xs font-semibold">{method.label}</span>
                      <span className="text-[11px] text-slate-500">{method.subtitle}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional forms based on selection */}
              {payMethod === "MTN MoMo / Airtel" ? (
                <form id="form-momo-report" onSubmit={handleSubmitManualReport} className="space-y-4">
                  <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">Payment details & receipt</span>
                    <span className="text-[11px] text-slate-500">Enter the sender phone number and paste the confirmation SMS.</span>
                  </div>

                  {/* Auto-generated USSD Quick Dial Helper for Organization */}
                  <UssdPaymentHelper
                    targetType="organization"
                    mtnNumber={activeOrg?.dues_mtn_number || activeOrg?.donation_mtn_number}
                    merchantCode={activeOrg?.momo_merchant_code}
                    airtelNumber={activeOrg?.dues_airtel_number || activeOrg?.donation_airtel_number}
                    recipientName={activeOrg?.dues_account_name || activeOrg?.name}
                    amountRwf={selectedFeeToPay?.amount}
                    itemName={`Dues: ${selectedFeeToPay?.payment_period || "Cycle"}`}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="flex flex-col gap-1">
                      <Input
                        label="MTN MoMo Phone (078 / 079)"
                        placeholder="078XXXXXXX or 079..."
                        required
                        value={momoPhoneNumber}
                        onChange={(e) => setMomoPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        id="input-momo-subscriber-phone"
                      />
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-stone-400 font-mono">Quick prefix:</span>
                        <button
                          type="button"
                          onClick={() => setMomoPhoneNumber("078")}
                          className="px-1.5 py-0.5 rounded bg-stone-100 hover:bg-amber-100 text-[10px] font-mono font-bold text-stone-700"
                        >
                          078
                        </button>
                        <button
                          type="button"
                          onClick={() => setMomoPhoneNumber("079")}
                          className="px-1.5 py-0.5 rounded bg-stone-100 hover:bg-amber-100 text-[10px] font-mono font-bold text-stone-700"
                        >
                          079
                        </button>
                      </div>
                    </div>
                    <Input
                      label="Sender's Registered Full Name"
                      placeholder="e.g. Jean Pierre N."
                      required
                      value={manualSenderInfo}
                      onChange={(e) => setManualSenderInfo(e.target.value)}
                      id="input-momo-subscriber-name"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-850 dark:text-slate-300 block select-none">
                      Pasted Transaction SMS Copy Text
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. TxId: 93821033. You have transferred 1,000 RWF to Greening Kigali Ltd..."
                      required
                      value={resendMessageText}
                      onChange={(e) => setResendMessageText(e.target.value)}
                      className="w-full text-xs rounded-xl border bg-white dark:bg-slate-950 border-gray-300 dark:border-slate-800 p-2.5 outline-none focus:ring-2 focus:ring-[#156c45] text-stone-800 dark:text-stone-100 font-mono shadow-3xs"
                      id="input-manual-momo-sms-copy"
                    />
                    <p className="text-[10px] text-stone-500">Copy and paste the exact text from the received transaction message.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-850 dark:text-slate-300 block select-none">
                      Optional Verification Note
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Sent via agent, please verify ledger balance."
                      value={manualNote}
                      onChange={(e) => setManualNote(e.target.value)}
                      className="w-full text-xs rounded-xl border bg-white dark:bg-slate-950 border-gray-300 dark:border-slate-800 p-2.5 outline-none focus:ring-2 focus:ring-[#156c45] text-stone-800 dark:text-stone-100 shadow-3xs"
                      id="input-manual-momo-note"
                    />
                  </div>
                </form>
              ) : (
                <form id="form-cash-report" onSubmit={handleSubmitManualReport} className="space-y-4 animate-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2 select-none border-b border-gray-150 dark:border-slate-800 pb-2.5">
                    <span className="h-6 w-6 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 flex items-center justify-center">
                      <Coins className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <span className="text-[11px] font-black text-amber-850 dark:text-amber-400 block leading-tight uppercase">Hand Cash Submission</span>
                      <span className="text-[10px] text-gray-500 dark:text-slate-400">Confirm the member payer name and officer cashier recipient.</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <Input
                      label="Payer Member Name"
                      placeholder="e.g. Jean Pierre N."
                      required
                      value={manualSenderInfo}
                      onChange={(e) => setManualSenderInfo(e.target.value)}
                      id="input-manual-cash-payer"
                    />
                    <Input
                      label="Receiver Officer Name"
                      placeholder="e.g. Divine Uwera (Cashier)"
                      required
                      value={manualTxRef}
                      onChange={(e) => setManualTxRef(e.target.value)}
                      id="input-manual-cash-receiver"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-850 dark:text-slate-300 block select-none">
                      Optional Verification Notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Handed cash directly to supervisor at Kigali forest nurseries sector."
                      value={manualNote}
                      onChange={(e) => setManualNote(e.target.value)}
                      className="w-full text-xs rounded-xl border bg-white dark:bg-slate-950 border-gray-300 dark:border-slate-800 p-2.5 outline-none focus:ring-2 focus:ring-emerald-700 text-stone-800 dark:text-stone-100"
                      id="input-manual-cash-note"
                    />
                  </div>
                </form>
              )}
            </div>

            <div className="p-4 bg-gray-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <Button variant="outline" onClick={() => setSelectedFeeToPay(null)} id="btn-cancel-payment-panel">
                Close
              </Button>
              <Button
                type="submit"
                form={payMethod === "MTN MoMo / Airtel" ? "form-momo-report" : "form-cash-report"}
                className="bg-[#15803D] hover:bg-emerald-800 text-white font-extrabold px-5 py-2.5 rounded-xl transition shadow-xs"
                id="btn-submit-momo-manual-report"
              >
                Submit Payment Report
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MoMo Push Payment Modal for Member Dues */}
      {selectedFeeToPay && (
        <MoMoPushPaymentModal
          isOpen={openMoMoPushPromptModal}
          onClose={() => setOpenMoMoPushPromptModal(false)}
          title={`Pay Dues: ${selectedFeeToPay.payment_period.toUpperCase()} Cycle`}
          description="Enter your phone number to receive an instant USSD PIN authorization prompt on your handset."
          amountRwf={selectedFeeToPay.amount}
          orgId={activeOrg?.id}
          defaultPayerPhone={(user as any)?.phone || user?.phone_number || (activeMember as any)?.phone || (activeMember as any)?.user?.phone_number || momoPhoneNumber}
          defaultPayerName={user?.full_name || (activeMember as any)?.user?.full_name || selectedFeeToPay.member_name}
          itemType="dues"
          itemName={`${activeOrg?.name || "Cooperative"} - Dues ${selectedFeeToPay.payment_period} (${selectedFeeToPay.amount.toLocaleString()} RWF)`}
          recipientName={activeOrg?.dues_account_name || activeOrg?.donation_account_name || activeOrg?.name || "Cooperative Treasury"}
          recipientMtnNumber={activeOrg?.dues_mtn_number || activeOrg?.donation_mtn_number || ""}
          recipientAirtelNumber={activeOrg?.dues_airtel_number || activeOrg?.donation_airtel_number || ""}
          recipientMerchantCode={activeOrg?.momo_merchant_code}
          isPlatformFee={false}
          onSuccess={async (data: MoMoPaymentSuccessData) => {
            try {
              const generatedTxRef = data.providerTransactionId || data.depositId;
              await updateFeeStatusMutation.mutateAsync({
                id: selectedFeeToPay.id,
                org_id: activeOrg!.id,
                member_id: selectedFeeToPay.member_id,
                amount: selectedFeeToPay.amount,
                payment_period: selectedFeeToPay.payment_period,
                period_date: selectedFeeToPay.period_date,
                status: data.method === "pawapay_push" ? "paid" : "pending_confirmation",
                paid_by_method: data.provider || "MTN MoMo",
                transaction_reference: generatedTxRef,
                sender_info: `PawaPay MoMo Phone: ${data.payerPhone}, Name: ${data.payerName}`,
                reported_at: new Date().toISOString(),
                paid_at: data.method === "pawapay_push" ? new Date().toISOString() : undefined,
                report_note: `[PAWAPAY-VERIFIED] Deposit ID: ${data.depositId}\nPayer: ${data.payerName}\nComment: ${data.comment || "Member dues settlement"}\nProvider TxId: ${data.providerTransactionId || "Pending telco broadcast"}`,
                proof_url: data.proofText || `PawaPay Instant Deposit ID: ${data.depositId}`
              });

              // Notify accountants and admins
              try {
                await broadcastMutation.mutateAsync({
                  org_id: activeOrg!.id,
                  sent_by: activeMember?.id || activeOrg!.id,
                  recipient_group: "accountants_and_admins",
                  recipient_count: 1,
                  body_text: `Payment ${data.method === "pawapay_push" ? "Confirmed" : "Reported"}: Member ${data.payerName} paid ${selectedFeeToPay.amount.toLocaleString()} RWF for ${selectedFeeToPay.payment_period.toUpperCase()} cycle via PawaPay. Ref: ${generatedTxRef}.`
                });
              } catch (notifErr) {
                console.warn("[Payment Report] Broadcast error:", notifErr);
              }

              addToast(
                data.method === "pawapay_push" 
                  ? "Payment successfully confirmed on telecom gateway! Dues recorded as paid." 
                  : "Payment report submitted! The accountant will verify shortly.", 
                "success"
              );
              setOpenMoMoPushPromptModal(false);
              setSelectedFeeToPay(null);
            } catch (err: any) {
              console.error("Failed to update fee record:", err);
              addToast(err?.message || "Failed to record payment.", "error");
            }
          }}
        />
      )}



      {/* Accountant Review / Resolve Payment Report Modal */}
      {reviewingFee && isAccountant && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in" id="admin-review-modal">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
            <div className="px-5 py-4 bg-slate-100 dark:bg-slate-950 border-b dark:border-slate-850 flex items-center justify-between select-none shrink-0">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-black text-amber-600 tracking-wider">Pending Slip Verification</span>
                <span className="font-extrabold text-sm text-stone-900 dark:text-white mt-0.5">Audit reported member check-in</span>
              </div>
              <button 
                onClick={() => setReviewingFee(null)}
                className="text-gray-400 hover:text-stone-900 dark:hover:text-white p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-800 transition"
                id="btn-close-review-modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              <div className="bg-amber-50 dark:bg-amber-950/15 border border-amber-100 p-3.5 rounded-xl flex flex-col gap-2 font-semibold">
                <div className="flex items-center gap-1.5 text-xs text-amber-850 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>PAYMENT REPORT SLIP</span>
                </div>
                
                <div className="text-[11px] grid grid-cols-2 gap-y-2 gap-x-4 border-t border-amber-100 pt-2.5 text-stone-750 dark:text-slate-300">
                  <div>
                    <span className="text-[9px] text-gray-400 block uppercase font-extrabold">Reported Member:</span>
                    <span className="font-black text-black dark:text-white">{reviewingFee.member_name}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 block uppercase font-extrabold">Invoiced Amount:</span>
                    <span className="font-black text-black dark:text-white font-mono">{reviewingFee.amount.toLocaleString()} RWF</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 block uppercase font-extrabold">Selected Method:</span>
                    <span className="font-bold underline text-emerald-805">{reviewingFee.paid_by_method || "Cash / Direct Settle"}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 block uppercase font-extrabold">Reference ID Code:</span>
                    <span className="font-mono bg-white dark:bg-slate-950 text-stone-900 px-1 rounded block">{reviewingFee.transaction_reference || "N/A (Direct Verification)"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[9px] text-gray-400 block uppercase font-extrabold">Depositor Sender info:</span>
                    <span className="font-mono">{reviewingFee.sender_info || "Verified directly with member"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[9px] text-gray-400 block uppercase font-extrabold">Member custom reported notes:</span>
                    <p className="bg-white/40 dark:bg-slate-950/30 p-2 rounded italic text-[11.5px] border font-sans text-gray-600 dark:text-slate-200 whitespace-pre-wrap">
                      "{reviewingFee.report_note || "No specific comments filed"}"
                    </p>
                  </div>
                  {reviewingFee.proof_url && (
                    <div className="col-span-2 border-t pt-2 mt-1">
                      <span className="text-[9px] text-gray-400 block uppercase font-extrabold mb-1">Attached Screenshot / Payment Slip:</span>
                      <a 
                        href={reviewingFee.proof_url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="group relative block overflow-hidden rounded-lg border bg-stone-100 dark:bg-stone-950 transition-all hover:border-emerald-500"
                        id="payment-slip-admin-link"
                      >
                        <img 
                          src={reviewingFee.proof_url} 
                          alt="Transaction Proof Screenshot" 
                          referrerPolicy="no-referrer"
                          className="h-32 w-full object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-stone-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                          <Eye className="h-4 w-4" /> Click to View Original
                        </div>
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-751">Supervisor Audit Justification note:</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Transaction matching MoMo portal balance sheet index. Approved and synchronized status live."
                  value={adminNoteInput}
                  onChange={(e) => setAdminNoteInput(e.target.value)}
                  className="w-full text-xs rounded-lg border bg-white dark:bg-slate-950 border-gray-300 dark:border-slate-800 p-2.5 outline-none focus:ring-1 focus:ring-emerald-700 text-stone-800 dark:text-stone-105"
                  id="input-review-admin-comment"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  id="btn-admin-reject"
                  variant="outline"
                  className="border-rose-400 text-rose-700 hover:bg-rose-50 flex items-center justify-center gap-1.5 font-bold"
                  onClick={() => handleResolvePaymentReport(false)}
                  disabled={isSubmittingReview}
                >
                  <X className="h-4 w-4" /> Reject Slip
                </Button>
                <Button
                  id="btn-admin-approve"
                  className="bg-emerald-700 hover:bg-emerald-850 text-white flex items-center justify-center gap-1.5 font-bold"
                  onClick={() => handleResolvePaymentReport(true)}
                  disabled={isSubmittingReview}
                >
                  <Check className="h-4 w-4" /> Confirm & Approve
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage All Dues Modal */}
      {showAllDuesModal && isAccountant && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 z-50 animate-in fade-in" id="manage-all-dues-modal">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden relative">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50 dark:bg-slate-950/40 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                    <ListFilter className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold font-display text-stone-900 dark:text-white">
                    All Member Dues & Charges Registry
                  </h2>
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 font-medium">
                  Review all issued dues, update parameters, or delete individual or bulk charges.
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <Button
                  size="xs"
                  onClick={() => {
                    setShowAllDuesModal(false);
                    setShowAddModal(true);
                  }}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center gap-1 text-xs py-2 px-3 rounded-lg"
                  id="btn-all-dues-charge-new"
                >
                  <Plus className="h-3.5 w-3.5" /> Charge New Due
                </Button>
                <button
                  onClick={() => setShowAllDuesModal(false)}
                  className="h-8 w-8 rounded-lg border border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center justify-center text-gray-500 dark:text-slate-400 transition"
                  id="btn-close-all-dues-modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Quick Stats Strip */}
            <div className="px-4 py-2.5 bg-gray-100/60 dark:bg-slate-950/60 border-b border-gray-200 dark:border-slate-800 flex flex-wrap items-center gap-2 sm:gap-4 text-xs shrink-0">
              <div className="flex items-center gap-1.5 font-medium text-stone-700 dark:text-slate-300">
                <span className="text-gray-400">Total Records:</span>
                <span className="font-bold text-stone-900 dark:text-white font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-gray-200 dark:border-slate-700">
                  {fees?.length || 0}
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
                <span className="text-gray-400">Cleared:</span>
                <span className="font-bold font-mono bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/40">
                  {fees?.filter((f) => f.status === "paid").length || 0}
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-rose-700 dark:text-rose-400">
                <span className="text-gray-400">Unpaid / Pending:</span>
                <span className="font-bold font-mono bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800/40">
                  {fees?.filter((f) => f.status === "pending").length || 0}
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
                <span className="text-gray-400">Under Review:</span>
                <span className="font-bold font-mono bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/40">
                  {fees?.filter((f) => f.status === "pending_confirmation").length || 0}
                </span>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900 shrink-0">
              <div className="relative flex-1">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search member, cycle, payment reference, remarks..."
                  value={allDuesSearch}
                  onChange={(e) => setAllDuesSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 text-stone-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  id="input-all-dues-search"
                />
                {allDuesSearch && (
                  <button
                    onClick={() => setAllDuesSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-stone-700 dark:hover:text-slate-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={allDuesStatusFilter}
                  onChange={(e) => setAllDuesStatusFilter(e.target.value as any)}
                  className="text-xs rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 px-3 py-2 text-stone-800 dark:text-slate-200 font-medium outline-none focus:ring-1 focus:ring-emerald-600"
                  id="select-all-dues-status-filter"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Unpaid (Pending)</option>
                  <option value="paid">Cleared (Paid)</option>
                  <option value="pending_confirmation">Pending Slip Review</option>
                </select>

                <select
                  value={allDuesPeriodFilter}
                  onChange={(e) => setAllDuesPeriodFilter(e.target.value as any)}
                  className="text-xs rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 px-3 py-2 text-stone-800 dark:text-slate-200 font-medium outline-none focus:ring-1 focus:ring-emerald-600"
                  id="select-all-dues-period-filter"
                >
                  <option value="all">All Periods</option>
                  <option value="weekly">Weekly Cycles</option>
                  <option value="monthly">Monthly Cycles</option>
                  <option value="flexible">Flexible / One-off</option>
                </select>

                <select
                  value={allDuesSortBy}
                  onChange={(e) => setAllDuesSortBy(e.target.value as any)}
                  className="text-xs rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 px-3 py-2 text-stone-800 dark:text-slate-200 font-medium outline-none focus:ring-1 focus:ring-emerald-600"
                  id="select-all-dues-sort"
                >
                  <option value="newest">Sort: Newest First</option>
                  <option value="oldest">Sort: Oldest First</option>
                  <option value="highest">Sort: Highest Amount</option>
                  <option value="lowest">Sort: Lowest Amount</option>
                  <option value="member_asc">Member Name: A to Z</option>
                  <option value="member_desc">Member Name: Z to A</option>
                  <option value="due_date">Due Date: Earliest First</option>
                </select>
              </div>
            </div>

            {/* Bulk Action Toolbar */}
            {selectedBulkFeeIds.length > 0 && (
              <div className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800/50 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                  <span className="font-bold text-emerald-900 dark:text-emerald-200">
                    {selectedBulkFeeIds.length} due charge{selectedBulkFeeIds.length > 1 ? "s" : ""} selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={handleBulkMarkAsPaid}
                    className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900"
                    id="btn-bulk-mark-paid"
                  >
                    <CheckCheck className="h-3.5 w-3.5" /> Mark Cleared
                  </Button>
                  <Button
                    size="xs"
                    onClick={() => setShowBulkDeleteConfirm(true)}
                    className="flex items-center gap-1 text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white"
                    id="btn-bulk-delete-dues"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete Selected ({selectedBulkFeeIds.length})
                  </Button>
                  <button
                    onClick={() => setSelectedBulkFeeIds([])}
                    className="text-xs text-gray-500 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white underline ml-1"
                  >
                    Clear selection
                  </button>
                </div>
              </div>
            )}

            {/* Table of All Dues */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {allDuesFilteredList.length === 0 ? (
                <div className="py-16 text-center text-gray-400 dark:text-slate-500 flex flex-col items-center justify-center">
                  <FileText className="h-10 w-10 stroke-1 mb-2 opacity-60" />
                  <p className="text-sm font-semibold text-stone-700 dark:text-slate-300">
                    No dues records match the filter criteria
                  </p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 max-w-sm">
                    Try clearing search query or adjusting status / cycle filters to display all member dues.
                  </p>
                  <Button
                    size="xs"
                    variant="outline"
                    className="mt-4 text-xs font-bold"
                    onClick={() => {
                      setAllDuesSearch("");
                      setAllDuesStatusFilter("all");
                      setAllDuesPeriodFilter("all");
                    }}
                  >
                    Reset Filters
                  </Button>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50/80 dark:bg-slate-950/80 text-gray-500 dark:text-slate-400 uppercase tracking-wider font-extrabold sticky top-0 z-10 border-b border-gray-200 dark:border-slate-800 text-[10px]">
                    <tr>
                      <th className="py-3 px-4 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            allDuesFilteredList.length > 0 &&
                            allDuesFilteredList.every((f) => selectedBulkFeeIds.includes(f.id))
                          }
                          onChange={() =>
                            toggleSelectAllDues(allDuesFilteredList.map((f) => f.id))
                          }
                          className="rounded border-gray-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer"
                          title="Select all"
                        />
                      </th>
                      <th className="py-3 px-4">Member Name</th>
                      <th className="py-3 px-4">Cycle & Period</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60 font-medium">
                    {allDuesFilteredList.map((fee) => {
                      const isSelected = selectedBulkFeeIds.includes(fee.id);
                      const deadlineInfo = getFeeDeadlineInfo(fee);
                      return (
                        <tr
                          key={fee.id}
                          className={`hover:bg-gray-50/70 dark:hover:bg-slate-800/40 transition group ${
                            isSelected ? "bg-emerald-50/40 dark:bg-emerald-950/20" : ""
                          }`}
                        >
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectFee(fee.id)}
                              className="rounded border-gray-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                                {(fee.member_name || "M").charAt(0).toUpperCase()}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-stone-900 dark:text-white">
                                  {fee.member_name || "Unknown Member"}
                                </span>
                                {fee.member_id && (
                                  <span className="text-[10px] text-gray-400 font-mono">
                                    ID: {fee.member_id.slice(0, 8)}...
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-stone-800 dark:text-slate-200">
                                {fee.period_date || "Standard Cycle"}
                              </span>
                              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                                {fee.payment_period || "weekly"}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono font-extrabold text-stone-900 dark:text-white">
                            {fee.amount.toLocaleString()} <span className="text-[9px] font-bold text-gray-500">RWF</span>
                          </td>
                          <td className="py-3 px-4">
                            {fee.status === "paid" ? (
                              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Settled
                              </span>
                            ) : deadlineInfo.isOverdue ? (
                              <span className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                                Overdue · {fee.due_date ? new Date(fee.due_date).toLocaleDateString() : deadlineInfo.formattedDate}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                {fee.due_date ? new Date(fee.due_date).toLocaleDateString() : deadlineInfo.label}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {fee.status === "paid" ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                                Cleared
                              </span>
                            ) : fee.status === "pending_confirmation" ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                                Under Review
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                                Unpaid
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Edit Fee */}
                              <button
                                id={`btn-all-dues-edit-${fee.id}`}
                                onClick={() => openEditModal(fee)}
                                className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 transition flex items-center gap-1 font-bold text-[10px]"
                                title="Edit Due Details"
                              >
                                <Pencil className="h-3.5 w-3.5" /> Edit
                              </button>

                              {/* Delete Fee */}
                              <button
                                id={`btn-all-dues-delete-${fee.id}`}
                                onClick={() => setDeletingFee(fee)}
                                className="p-1.5 text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-200 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center gap-1 font-bold text-[10px]"
                                title="Delete Due"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Delete
                              </button>

                              {/* Quick Toggle Status */}
                              <button
                                id={`btn-all-dues-toggle-${fee.id}`}
                                onClick={() => handleToggleStatusLegacy(fee)}
                                className="p-1.5 text-gray-400 hover:text-emerald-700 dark:hover:text-emerald-400 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                                title="Toggle Cleared / Unpaid"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50 dark:bg-slate-950/40 shrink-0 text-xs">
              <div className="text-gray-500 dark:text-slate-400">
                Showing <span className="font-bold text-stone-900 dark:text-white">{allDuesFilteredList.length}</span> of{" "}
                <span className="font-bold text-stone-900 dark:text-white">{fees?.length || 0}</span> dues charges{" "}
                (Total value:{" "}
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  {allDuesFilteredList.reduce((sum, f) => sum + f.amount, 0).toLocaleString()} RWF
                </span>
                )
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setShowAllDuesModal(false)}
                  className="px-4 py-2 text-xs font-bold"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && isAccountant && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-[80] animate-in fade-in" id="bulk-delete-confirm-modal">
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
            <div className="h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-base font-bold text-stone-900 dark:text-white text-center mb-1">
              Delete {selectedBulkFeeIds.length} Selected Dues?
            </h2>
            <p className="text-xs text-stone-600 dark:text-slate-300 text-center mb-5">
              Are you sure you want to permanently remove all{" "}
              <span className="font-bold text-stone-900 dark:text-white">{selectedBulkFeeIds.length}</span> selected dues records? This action cannot be undone.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowBulkDeleteConfirm(false)}
                disabled={isBulkDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center justify-center gap-1.5"
                onClick={handleBulkDeleteFees}
                disabled={isBulkDeleting}
                id="btn-confirm-bulk-delete"
              >
                {isBulkDeleting ? (
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Deleting...
                  </span>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" /> Confirm Delete
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Fee Modal */}
      {editingFee && isAccountant && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-[70] animate-in fade-in" id="edit-fee-modal">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-md p-5 sm:p-6 relative max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-stone-900 dark:text-white flex items-center gap-1.5 mb-1">
              <Pencil className="h-5 w-5 text-blue-600" /> Edit Member Fee / Charge
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Modify the due parameters for <span className="font-bold text-stone-800 dark:text-slate-200">{editingFee.member_name || "Cooperative Member"}</span>
            </p>

            <form onSubmit={handleSaveEditFee} className="space-y-4">
              <Input
                label="Fee Amount (RWF)"
                type="number"
                required
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                id="input-edit-fee-amount"
              />

              <Input
                label="Period / Cycle Label"
                required
                value={editPeriodDate}
                onChange={(e) => setEditPeriodDate(e.target.value)}
                id="input-edit-fee-period-date"
              />

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block">
                  Payment Period Type
                </label>
                <select
                  value={editPeriod}
                  onChange={(e) => setEditPeriod(e.target.value as any)}
                  className="w-full text-xs rounded-lg border bg-white dark:bg-slate-950 border-gray-300 dark:border-slate-800 p-2.5 outline-none focus:ring-1 focus:ring-blue-600 text-stone-800 dark:text-white font-medium"
                  id="select-edit-fee-period"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="flexible">Flexible / One-off</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full text-xs rounded-lg border bg-white dark:bg-slate-950 border-gray-300 dark:border-slate-800 p-2.5 outline-none focus:ring-1 focus:ring-blue-600 text-stone-800 dark:text-white font-medium"
                  id="select-edit-fee-status"
                >
                  <option value="pending">Unpaid (Pending)</option>
                  <option value="pending_confirmation">Pending Review</option>
                  <option value="paid">Cleared / Paid</option>
                </select>
              </div>

              <Input
                label="Due Date / Deadline (Optional)"
                type="date"
                value={editDueDate ? editDueDate.split("T")[0] : ""}
                onChange={(e) => setEditDueDate(e.target.value)}
                id="input-edit-fee-due-date"
              />

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block">
                  Accountant / Admin Note (Optional)
                </label>
                <textarea
                  value={editAdminNote}
                  onChange={(e) => setEditAdminNote(e.target.value)}
                  placeholder="e.g. Adjusted due for special community project"
                  rows={2}
                  className="w-full text-xs rounded-lg border bg-white dark:bg-slate-950 border-gray-300 dark:border-slate-800 p-2.5 outline-none focus:ring-1 focus:ring-blue-600 text-stone-800 dark:text-white font-medium resize-none"
                  id="textarea-edit-fee-admin-note"
                />
              </div>

              {/* Sync to all members option */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/50 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="checkbox-edit-apply-all"
                  checked={editApplyToAllUsers}
                  onChange={(e) => setEditApplyToAllUsers(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                />
                <label htmlFor="checkbox-edit-apply-all" className="text-xs text-blue-950 dark:text-blue-200 cursor-pointer">
                  <span className="font-bold block">Update & apply to all cooperative members</span>
                  <span className="text-[11px] text-blue-700 dark:text-blue-300 block">
                    Automatically update the dues amount ({editAmount ? `${Number(editAmount).toLocaleString()} RWF` : "—"}) and deadline for all members charged under cycle "{editPeriodDate || editingFee?.period_date}".
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingFee(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-1.5"
                  id="btn-confirm-save-edit-fee"
                >
                  <Check className="h-4 w-4" /> Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Fee Confirmation Modal */}
      {deletingFee && isAccountant && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-[70] animate-in fade-in" id="delete-fee-modal">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-md p-5 sm:p-6 relative max-h-[90vh] overflow-y-auto">
            <div className="h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="h-6 w-6" />
            </div>
            <h2 className="text-base font-bold text-stone-900 dark:text-white text-center mb-1">
              Delete Member Due?
            </h2>
            <p className="text-xs text-stone-600 dark:text-slate-300 text-center mb-4">
              Remove charge of <span className="font-mono font-bold text-stone-900 dark:text-white">{deletingFee.amount.toLocaleString()} RWF</span> for <span className="font-bold text-stone-900 dark:text-white">{deletingFee.member_name || "Member"}</span> (Cycle: <span className="font-mono font-bold">{deletingFee.period_date}</span>)?
            </p>

            <div className="space-y-2 mb-5">
              <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                deleteScope === "single"
                  ? "border-rose-400 bg-rose-50/60 dark:bg-rose-950/40"
                  : "border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950"
              }`}>
                <input
                  type="radio"
                  name="deleteScope"
                  value="single"
                  checked={deleteScope === "single"}
                  onChange={() => setDeleteScope("single")}
                  className="text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-stone-900 dark:text-white block">Delete only this member's charge</span>
                  <span className="text-gray-500 text-[11px]">Remove due for {deletingFee.member_name || "this member"} only.</span>
                </div>
              </label>

              <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                deleteScope === "cycle"
                  ? "border-rose-400 bg-rose-50/60 dark:bg-rose-950/40"
                  : "border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950"
              }`}>
                <input
                  type="radio"
                  name="deleteScope"
                  value="cycle"
                  checked={deleteScope === "cycle"}
                  onChange={() => setDeleteScope("cycle")}
                  className="text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-rose-900 dark:text-rose-200 block">Delete entire Due Cycle for ALL members</span>
                  <span className="text-rose-700 dark:text-rose-300 text-[11px]">
                    Remove cycle "{deletingFee.period_date}" across all cooperative members.
                  </span>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDeletingFee(null);
                  setDeleteScope("single");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center justify-center gap-1.5"
                onClick={handleConfirmDeleteFee}
                id="btn-confirm-delete-fee"
              >
                <Trash2 className="h-4 w-4" /> Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Entire Cycle Direct Modal */}
      {deletingCycle && isAccountant && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-[70] animate-in fade-in" id="delete-cycle-modal">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-sm p-5 sm:p-6 relative max-h-[90vh] overflow-y-auto">
            <div className="h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="h-6 w-6" />
            </div>
            <h2 className="text-base font-bold text-stone-900 dark:text-white text-center mb-1">
              Delete Dues Scheme & Cycle?
            </h2>
            <p className="text-xs text-stone-600 dark:text-slate-300 text-center mb-5">
              Are you sure you want to delete the entire due cycle <span className="font-mono font-bold text-stone-900 dark:text-white">{deletingCycle.period_date}</span>? This will remove all charges for all <span className="font-bold text-rose-600">{deletingCycle.count} members</span> ({deletingCycle.total_amount.toLocaleString()} RWF total).
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeletingCycle(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center justify-center gap-1.5"
                onClick={handleConfirmDeleteCycle}
                id="btn-confirm-delete-cycle"
              >
                <Trash2 className="h-4 w-4" /> Delete All Charges
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Official Payment Receipt Modal */}
      {viewingReceiptFee && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-[85] animate-in fade-in" id="view-receipt-modal">
          <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] relative animate-in zoom-in-95">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 p-5 sm:p-6 text-white text-center relative select-none shrink-0">
              <button 
                onClick={() => setViewingReceiptFee(null)}
                className="absolute top-4 right-4 text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
                id="btn-close-receipt-modal"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="h-12 w-12 rounded-full bg-white/15 backdrop-blur-xs mx-auto flex items-center justify-center text-emerald-300 mb-2 border border-white/20">
                <Receipt className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
                {activeOrg?.name || "COOPERATIVE SOCIETY"}
              </span>
              <h2 className="text-lg sm:text-xl font-black mt-0.5 tracking-tight font-display">
                Official Payment Receipt
              </h2>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-black bg-white/20 text-emerald-100 border border-white/20">
                REC-{viewingReceiptFee.id.slice(0, 8).toUpperCase()}
              </span>
            </div>

            {/* Receipt Body */}
            <div className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="flex items-center justify-between pb-3 border-b border-dashed dark:border-slate-800">
                <span className="text-stone-500 dark:text-slate-400 font-medium">Payment Status:</span>
                <span className="inline-flex items-center gap-1 font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40">
                  <CheckCircle2 className="h-3 w-3" /> SETTLED & VERIFIED
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 py-1">
                <div>
                  <span className="text-[10px] text-stone-400 uppercase font-bold block">Member Name</span>
                  <span className="text-sm font-bold text-stone-900 dark:text-white mt-0.5 block">
                    {viewingReceiptFee.member_name || "Cooperative Member"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 uppercase font-bold block">Dues Cycle</span>
                  <span className="text-sm font-bold font-mono text-stone-900 dark:text-white mt-0.5 block">
                    {viewingReceiptFee.period_date}
                  </span>
                </div>
              </div>

              <div className="bg-stone-50 dark:bg-slate-950/60 p-4 rounded-xl border border-stone-200 dark:border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-stone-600 dark:text-slate-400">
                  <span>Cycle Frequency:</span>
                  <span className="font-bold text-stone-800 dark:text-slate-200 uppercase">{viewingReceiptFee.payment_period}</span>
                </div>
                <div className="flex justify-between items-center text-stone-600 dark:text-slate-400">
                  <span>Settlement Method:</span>
                  <span className="font-bold text-stone-800 dark:text-slate-200">{viewingReceiptFee.paid_by_method || "Mobile Money"}</span>
                </div>
                {viewingReceiptFee.transaction_reference && (
                  <div className="flex justify-between items-center text-stone-600 dark:text-slate-400">
                    <span>Transaction Reference:</span>
                    <span className="font-mono font-bold text-stone-900 dark:text-white">{viewingReceiptFee.transaction_reference}</span>
                  </div>
                )}
                {viewingReceiptFee.paid_at && (
                  <div className="flex justify-between items-center text-stone-600 dark:text-slate-400">
                    <span>Payment Date:</span>
                    <span className="font-medium text-stone-800 dark:text-slate-200">
                      {new Date(viewingReceiptFee.paid_at).toLocaleDateString("en-RW", { year: "numeric", month: "short", day: "numeric" })}
                    </span>
                  </div>
                )}
                <div className="border-t border-dashed dark:border-slate-800 pt-2 flex justify-between items-center font-extrabold">
                  <span className="text-stone-800 dark:text-slate-200">Amount Paid:</span>
                  <span className="text-base text-emerald-700 dark:text-emerald-400 font-mono">
                    {viewingReceiptFee.amount.toLocaleString()} RWF
                  </span>
                </div>
              </div>

              {viewingReceiptFee.admin_note && (
                <div className="text-[11px] p-2.5 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900/40 text-blue-900 dark:text-blue-300">
                  <span className="font-bold block text-[10px] uppercase tracking-wider">Accountant Remarks:</span>
                  <p className="mt-0.5">{viewingReceiptFee.admin_note}</p>
                </div>
              )}

              <p className="text-[10px] text-center text-stone-400 dark:text-slate-500 italic">
                This document serves as formal confirmation of dues payment issued and reconciled by the cooperative accountant office.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-stone-50 dark:bg-slate-950/80 border-t dark:border-slate-800 flex items-center justify-end gap-2 shrink-0">
              <Button
                variant="outline"
                size="xs"
                onClick={() => setViewingReceiptFee(null)}
                className="px-4 py-2 font-bold"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
