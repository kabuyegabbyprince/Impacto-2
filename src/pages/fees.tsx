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
import { Card, Input, Button, Badge, ImageUploadInput, Modal } from "../components/ui";
import { useToast } from "../components/Toast";
import { MoMoPushPaymentModal, MoMoPaymentSuccessData } from "../components/MoMoPushPaymentModal";
import { PaymentGatewaySection, PaymentGatewaySuccessState } from "../components/PaymentGatewaySection";
import { PaymentSuccessPulse } from "../components/PaymentSuccessPulse";
import { getOrgMomoDisplayMethods } from "../components/UssdPaymentHelper";
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
  Users,
  Tag as TagIcon,
  ChevronDown,
  History
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
import { MemberFee, MemberFeeInstallment } from "../types";
import { getFeeBalances, getFeeDueName, getEffectiveInstallments } from "../lib/feeUtils";
import { FeeStatusBadge } from "../components/FeeStatusBadge";

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

  // Receipt & Payment History view states
  const [viewingReceiptFee, setViewingReceiptFee] = useState<MemberFee | null>(null);
  const [viewingHistoryFee, setViewingHistoryFee] = useState<MemberFee | null>(null);
  const [expandedFeeIds, setExpandedFeeIds] = useState<Record<string, boolean>>({});
  const toggleExpandFee = (feeId: string) => {
    setExpandedFeeIds((prev) => ({ ...prev, [feeId]: !prev[feeId] }));
  };

  // Edit & Delete states for Accountants
  const [editingFee, setEditingFee] = useState<MemberFee | null>(null);
  const [editDueName, setEditDueName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editPaidAmount, setEditPaidAmount] = useState("");
  const [editPeriod, setEditPeriod] = useState<"weekly" | "monthly" | "flexible">("weekly");
  const [editPeriodDate, setEditPeriodDate] = useState("");
  const [editStatus, setEditStatus] = useState<"paid" | "partially_paid" | "pending" | "pending_confirmation">("pending");
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
  const [allDuesDueNameFilter, setAllDuesDueNameFilter] = useState("");
  const [allDuesStatusFilter, setAllDuesStatusFilter] = useState<"all" | "paid" | "partially_paid" | "overdue" | "pending" | "pending_confirmation">("all");
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
  const [dueNameFilter, setDueNameFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState<"all" | "weekly" | "monthly" | "flexible">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "partially_paid" | "overdue" | "pending" | "pending_confirmation">("all");

  // Form states for Admin to record dues manually
  const [showAddModal, setShowAddModal] = useState(false);
  const [formMemberId, setFormMemberId] = useState("");
  const [formDueName, setFormDueName] = useState("");
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
  const [paymentMode, setPaymentMode] = useState<"full" | "partial">("full");
  const [customPayAmount, setCustomPayAmount] = useState("");
  
  // MoMo state variables
  const [momoPhoneNumber, setMomoPhoneNumber] = useState("");

  // manual offline reports fields
  const [manualTxRef, setManualTxRef] = useState("");
  const [manualSenderInfo, setManualSenderInfo] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [manualProofUrl, setManualProofUrl] = useState("");
  const [resendMessageText, setResendMessageText] = useState("");
  const [feePaymentSuccess, setFeePaymentSuccess] = useState<PaymentGatewaySuccessState | null>(null);
  const [showOrgGatewayModal, setShowOrgGatewayModal] = useState(false);

  // Admin Review / Confirmation state variables
  const [reviewingFee, setReviewingFee] = useState<MemberFee | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState("");
  const [verifiedInstallmentAmount, setVerifiedInstallmentAmount] = useState("");
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
    const parsedAmount = parseFloat(formAmount);
    if (!formAmount || isNaN(parsedAmount) || parsedAmount <= 0 || !finalPeriodDate) {
      addToast("Please fill in all core dues logging parameters.", "error");
      return;
    }

    const resolvedDueName = formDueName.trim() || (finalPeriodDate === "Anytime" ? "Flexible Cooperative Due" : `${finalPeriodDate} Dues`);

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
          due_name: resolvedDueName,
          amount: parsedAmount,
          total_due_amount: parsedAmount,
          paid_amount: formStatus === "paid" ? parsedAmount : 0,
          pending_installment_amount: 0,
          payment_history: formStatus === "paid" ? [{
            id: `inst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            amount: parsedAmount,
            method: "Pre-cleared by Accountant",
            paid_at: new Date().toISOString(),
            verified_by: user?.full_name || "Accountant",
            note: "Initial pre-cleared dues record",
          }] : [],
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
          body_text: `CO-OP ALERT: New ${formPeriod} dues "${resolvedDueName}" of ${parsedAmount.toLocaleString()} RWF set for cycle ${finalPeriodDate}.${dueDeadlineDate ? ` Deadline to pay: ${dueDeadlineDate}.` : ""}`
        });

        if (formPeriod === "weekly" && sendPreDeadlineReminder && dueDeadlineDate) {
          await broadcastMutation.mutateAsync({
            org_id: activeOrg.id,
            sent_by: user?.id || "",
            recipient_group: `${recipientGroupLabel} (Scheduled Weekly Reminder)`,
            recipient_count: targetMembers.length,
            body_text: `WEEKLY REMINDER (Due in 2 days): Please settle your outstanding Weekly dues "${resolvedDueName}" of ${parsedAmount.toLocaleString()} RWF for period ${finalPeriodDate} before ${dueDeadlineDate}.`
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
      setFormDueName("");
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
    const bal = getFeeBalances(fee);
    const newStatus = fee.status === "paid" ? "pending" : "paid";
    const paidAt = newStatus === "paid" ? new Date().toISOString() : undefined;
    const newHistory: MemberFeeInstallment[] = newStatus === "paid"
      ? [
          ...bal.installments,
          ...(bal.remainingBalance > 0
            ? [{
                id: `inst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                amount: bal.remainingBalance,
                method: fee.paid_by_method || "Direct Accountant Clearance",
                reference: fee.transaction_reference || `CLR-${Date.now().toString().slice(-6)}`,
                paid_at: new Date().toISOString(),
                verified_by: user?.full_name || "Accountant",
                note: "Marked as fully paid by accountant",
              }]
            : []),
        ]
      : [];

    try {
      await updateFeeStatusMutation.mutateAsync({
        id: fee.id,
        org_id: activeOrg!.id,
        member_id: fee.member_id,
        due_name: getFeeDueName(fee),
        amount: bal.totalDueAmount,
        total_due_amount: bal.totalDueAmount,
        paid_amount: newStatus === "paid" ? bal.totalDueAmount : 0,
        pending_installment_amount: 0,
        installment_amount: newStatus === "paid" ? bal.remainingBalance : 0,
        payment_history: newHistory,
        payment_period: fee.payment_period,
        period_date: fee.period_date,
        status: newStatus,
        paid_at: paidAt,
        actor_name: user?.full_name || "Accountant",
        user_id: user?.id,
      });
      addToast(`Status updated to ${newStatus.toUpperCase()}!`, "success");
    } catch (err: any) {
      addToast(sanitizeError(err, "Failed to edit fee state."), "error");
    }
  };

  // Compute active payable amount for the currently open pay modal
  const selectedFeeBalances = React.useMemo(() => {
    if (!selectedFeeToPay) return null;
    return getFeeBalances(selectedFeeToPay);
  }, [selectedFeeToPay]);

  const resolvedPayAmount = React.useMemo(() => {
    if (!selectedFeeBalances) return 0;
    if (paymentMode === "full") return selectedFeeBalances.remainingBalance;
    const parsed = Math.round(Number(customPayAmount) || 0);
    return Math.max(0, Math.min(selectedFeeBalances.remainingBalance, parsed));
  }, [selectedFeeBalances, paymentMode, customPayAmount]);

  // Submit payment report offline/manually (Member side)
  const handleSubmitManualReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeeToPay) return;
    const bal = getFeeBalances(selectedFeeToPay);
    const payAmt = paymentMode === "full"
      ? bal.remainingBalance
      : Math.round(Number(customPayAmount) || 0);

    if (payAmt <= 0 || payAmt > bal.remainingBalance) {
      addToast(`Please enter a valid installment amount between 1 RWF and ${bal.remainingBalance.toLocaleString()} RWF.`, "error");
      return;
    }

    if (payMethod === "MTN MoMo / Airtel") {
      const cleanPhone = momoPhoneNumber.replace(/\D/g, "");
      if (!/^07[2389]\d{7}$/.test(cleanPhone)) {
        addToast("Error: Valid Rwandan Mobile Money number required (10 digits starting with 078, 079, 072, or 073).", "error");
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
      const dueName = getFeeDueName(selectedFeeToPay);
      const isPartialSubmission = payAmt < bal.remainingBalance || bal.paidAmount > 0;
      const installmentTag = `[INSTALLMENT: ${payAmt.toLocaleString()} RWF of ${bal.totalDueAmount.toLocaleString()} RWF]`;

      await updateFeeStatusMutation.mutateAsync({
        id: selectedFeeToPay.id,
        org_id: activeOrg!.id,
        member_id: selectedFeeToPay.member_id,
        due_name: dueName,
        amount: bal.totalDueAmount,
        total_due_amount: bal.totalDueAmount,
        paid_amount: bal.paidAmount,
        pending_installment_amount: payAmt,
        payment_history: bal.installments,
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
          ? `${installmentTag}\n[SMS CONFIRMATION]: ${resendMessageText}\n[REPORTER NOTE]: ${manualNote || "None"}`
          : `${installmentTag}\nHand cash receipt recorded.\n[REPORTER NOTE]: ${manualNote || "None"}`,
        proof_url: manualProofUrl || undefined
      });

      // Notify accountants and admins about the submitted payment slip
      try {
        await broadcastMutation.mutateAsync({
          org_id: activeOrg!.id,
          sent_by: activeMember?.id || activeOrg!.id,
          recipient_group: "accountants_and_admins",
          recipient_count: 1,
          body_text: `${isPartialSubmission ? "Partial Installment Slip" : "Payment Slip"} Submitted: Member ${user?.full_name || "A member"} reported payment of ${payAmt.toLocaleString()} RWF (Total Due: ${bal.totalDueAmount.toLocaleString()} RWF) for "${dueName}". Ref: ${generatedTxRef}. Please verify.`
        });
      } catch (notifErr) {
        console.warn("[Payment Report] Broadcast error:", notifErr);
      }

      addToast("Your payment report was submitted! An administrator will verify and confirm shortly.", "success");
      setFeePaymentSuccess({
        title: isPartialSubmission ? "Partial Payment Proof Submitted" : "Payment Proof Submitted",
        message: `Your installment report of ${payAmt.toLocaleString()} RWF for "${dueName}" was sent to the verification queue.`,
        reference: generatedTxRef,
        amountRwf: payAmt
      });
      // Reset inputs
      setMomoPhoneNumber("");
      setManualTxRef("");
      setManualSenderInfo("");
      setManualNote("");
      setManualProofUrl("");
      setResendMessageText("");
      setPaymentMode("full");
      setCustomPayAmount("");
    } catch (err: any) {
      addToast(sanitizeError(err, "Failed to log payment report."), "error");
    }
  };

  // Administrator resolves/approves reported payments (supports partial installments)
  const handleResolvePaymentReport = async (approve: boolean) => {
    if (!isAccountant) {
      addToast("Permission Denied: Only the cooperative accountant can verify payments.", "error");
      return;
    }
    if (!reviewingFee) return;
    const bal = getFeeBalances(reviewingFee);
    const dueName = getFeeDueName(reviewingFee);
    setIsSubmittingReview(true);

    try {
      if (approve) {
        const parsedVerified = Number(verifiedInstallmentAmount);
        const defaultSuggested = bal.pendingInstallmentAmount > 0 ? bal.pendingInstallmentAmount : bal.remainingBalance;
        const verifiedAmt = Math.min(
          bal.remainingBalance > 0 ? bal.remainingBalance : bal.totalDueAmount,
          Math.max(1, isNaN(parsedVerified) || parsedVerified <= 0 ? defaultSuggested : Math.round(parsedVerified))
        );

        const newPaidAmount = Math.min(bal.totalDueAmount, bal.paidAmount + verifiedAmt);
        const remainingAfter = Math.max(0, bal.totalDueAmount - newPaidAmount);
        const finalStatus: "paid" | "partially_paid" = remainingAfter <= 0 ? "paid" : "partially_paid";
        const paidAt = new Date().toISOString();

        const newInstallment: MemberFeeInstallment = {
          id: `inst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          amount: verifiedAmt,
          method: reviewingFee.paid_by_method || "Direct Verification",
          reference: reviewingFee.transaction_reference || `VER-${Date.now().toString().slice(-6)}`,
          paid_at: paidAt,
          verified_by: user?.full_name || "Accountant",
          note: adminNoteInput || (finalStatus === "paid" ? "Final balance verified by accountant" : "Partial installment verified by accountant"),
        };
        const updatedHistory = [...bal.installments, newInstallment];
        const noteText =
          adminNoteInput ||
          (finalStatus === "paid"
            ? "Approved and cleared in full by accountant"
            : `Partial installment of ${verifiedAmt.toLocaleString()} RWF approved. Remaining balance: ${remainingAfter.toLocaleString()} RWF.`);

        await updateFeeStatusMutation.mutateAsync({
          id: reviewingFee.id,
          org_id: activeOrg!.id,
          member_id: reviewingFee.member_id,
          due_name: dueName,
          amount: bal.totalDueAmount,
          total_due_amount: bal.totalDueAmount,
          paid_amount: newPaidAmount,
          pending_installment_amount: 0,
          installment_amount: verifiedAmt,
          payment_history: updatedHistory,
          payment_period: reviewingFee.payment_period,
          period_date: reviewingFee.period_date,
          status: finalStatus,
          paid_at: paidAt,
          paid_by_method: reviewingFee.paid_by_method,
          transaction_reference: reviewingFee.transaction_reference,
          admin_note: noteText,
          actor_name: user?.full_name || "Accountant",
          user_id: user?.id,
        });

        try {
          await broadcastMutation.mutateAsync({
            org_id: activeOrg!.id,
            sent_by: activeMember?.id || activeOrg!.id,
            recipient_group: `member_${reviewingFee.member_id}`,
            recipient_count: 1,
            body_text:
              finalStatus === "paid"
                ? `Payment Confirmed: Your payment of ${verifiedAmt.toLocaleString()} RWF for "${dueName}" has been verified & settled in full (${newPaidAmount.toLocaleString()} / ${bal.totalDueAmount.toLocaleString()} RWF).`
                : `Partial Payment Confirmed: ${verifiedAmt.toLocaleString()} RWF verified for "${dueName}" (Paid: ${newPaidAmount.toLocaleString()} / ${bal.totalDueAmount.toLocaleString()} RWF). Reminder: Remaining balance of ${remainingAfter.toLocaleString()} RWF is still due.`,
          });
        } catch (notifErr) {
          console.warn("[Payment Confirmation] Broadcast error:", notifErr);
        }

        addToast(
          finalStatus === "paid"
            ? "Payment confirmed in full! Ledger updated and member notified."
            : `Partial payment of ${verifiedAmt.toLocaleString()} RWF recorded! Member reminded of ${remainingAfter.toLocaleString()} RWF remaining.`,
          "success"
        );
      } else {
        const restoredStatus: "partially_paid" | "pending" = bal.paidAmount > 0 ? "partially_paid" : "pending";
        const noteText = adminNoteInput || "Rejected: Verification slip invalid";

        await updateFeeStatusMutation.mutateAsync({
          id: reviewingFee.id,
          org_id: activeOrg!.id,
          member_id: reviewingFee.member_id,
          due_name: dueName,
          amount: bal.totalDueAmount,
          total_due_amount: bal.totalDueAmount,
          paid_amount: bal.paidAmount,
          pending_installment_amount: 0,
          payment_history: bal.installments,
          payment_period: reviewingFee.payment_period,
          period_date: reviewingFee.period_date,
          status: restoredStatus,
          admin_note: noteText,
          transaction_reference: `REJECTED: ${reviewingFee.transaction_reference || "SLIP"}`,
          report_note: `Rejection justification: ${noteText}`,
          actor_name: user?.full_name || "Accountant",
          user_id: user?.id,
        });

        try {
          await broadcastMutation.mutateAsync({
            org_id: activeOrg!.id,
            sent_by: activeMember?.id || activeOrg!.id,
            recipient_group: `member_${reviewingFee.member_id}`,
            recipient_count: 1,
            body_text: `Payment Rejected: Your payment report for "${dueName}" was rejected. Reason: ${noteText}.${bal.remainingBalance > 0 ? ` Remaining balance due: ${bal.remainingBalance.toLocaleString()} RWF.` : ""}`,
          });
        } catch (notifErr) {
          console.warn("[Payment Rejection] Broadcast error:", notifErr);
        }

        addToast(
          bal.paidAmount > 0
            ? "Payment report rejected. Previous partial payment balance preserved."
            : "Payment report has been rejected and invoice set back to pending.",
          "info"
        );
      }
    } catch (err: any) {
      addToast(sanitizeError(err, "Failed to update report status."), "error");
    } finally {
      setReviewingFee(null);
      setAdminNoteInput("");
      setVerifiedInstallmentAmount("");
      setIsSubmittingReview(false);
    }
  };

  const openEditModal = (fee: MemberFee, defaultApplyAll = false) => {
    if (!isAccountant) return;
    const bal = getFeeBalances(fee);
    setEditingFee(fee);
    setEditDueName(getFeeDueName(fee));
    setEditAmount(bal.totalDueAmount.toString());
    setEditPaidAmount(bal.paidAmount.toString());
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
      const parsedPaid = Math.max(0, Math.min(parsedAmount, parseFloat(editPaidAmount) || 0));
      const resolvedDueName = editDueName.trim() || editPeriodDate || getFeeDueName(editingFee);
      let computedStatus = editStatus;
      if (parsedPaid >= parsedAmount && parsedAmount > 0) {
        computedStatus = "paid";
      } else if (parsedPaid > 0 && computedStatus === "pending") {
        computedStatus = "partially_paid";
      }

      if (editApplyToAllUsers) {
        await updateAllDuesMutation.mutateAsync({
          org_id: activeOrg.id,
          period_date: editingFee.period_date,
          payment_period: editPeriod,
          due_name: resolvedDueName,
          amount: parsedAmount,
          total_due_amount: parsedAmount,
          due_date: editDueDate || undefined,
          admin_note: editAdminNote || undefined,
          only_pending: true,
        });
        addToast(
          `Updated due "${resolvedDueName}" and synchronized changes to all members for cycle "${editPeriodDate || editingFee.period_date}"!`,
          "success"
        );
      } else {
        await updateFeeMutation.mutateAsync({
          id: editingFee.id,
          org_id: activeOrg.id,
          due_name: resolvedDueName,
          amount: parsedAmount,
          total_due_amount: parsedAmount,
          paid_amount: computedStatus === "paid" ? parsedAmount : parsedPaid,
          payment_period: editPeriod,
          period_date: editPeriodDate,
          status: computedStatus,
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
          const bal = getFeeBalances(feeObj);
          const nowIso = new Date().toISOString();
          await updateFeeStatusMutation.mutateAsync({
            id: feeId,
            org_id: activeOrg.id,
            member_id: feeObj.member_id,
            due_name: getFeeDueName(feeObj),
            status: "paid",
            amount: bal.totalDueAmount,
            total_due_amount: bal.totalDueAmount,
            paid_amount: bal.totalDueAmount,
            pending_installment_amount: 0,
            installment_amount: bal.remainingBalance,
            payment_history: [
              ...bal.installments,
              {
                id: `inst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                amount: bal.remainingBalance,
                method: "Bank Transfer / Bulk Clearance",
                paid_at: nowIso,
                verified_by: user?.full_name || "Accountant",
                note: "Bulk marked as cleared",
              },
            ],
            paid_by_method: "Bank Transfer",
            paid_at: nowIso,
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

  // Global Lists Computations using paid_amount vs total_due_amount
  const paidDuesList = fees?.filter((f) => f.status === "paid") || [];
  const partialPaidDuesList = fees?.filter((f) => f.status === "partially_paid") || [];
  const pendingDuesList = fees?.filter((f) => f.status === "pending" || f.status === "partially_paid" || f.status === "pending_confirmation") || [];
  const awaitingVerificationList = fees?.filter((f) => f.status === "pending_confirmation") || [];

  const paidSumRwf = (fees || []).reduce((acc, current) => acc + getFeeBalances(current).paidAmount, 0);
  const partialPaidSumRwf = partialPaidDuesList.reduce((acc, current) => acc + getFeeBalances(current).paidAmount, 0);
  const fullyPaidSumRwf = Math.max(0, paidSumRwf - partialPaidSumRwf);
  const pendingSumRwf = (fees || []).reduce((acc, current) => acc + getFeeBalances(current).remainingBalance, 0);

  const totalDuesCount = (fees || []).length;
  const partialDuesCount = partialPaidDuesList.length;
  const partialMembersPct = totalDuesCount > 0 ? Number(((partialDuesCount / totalDuesCount) * 100).toFixed(1)) : 0;

  const myPaidSumRwf = myDues.reduce((acc, curr) => acc + getFeeBalances(curr).paidAmount, 0);
  const myPendingSumRwf = myDues.reduce((acc, curr) => acc + getFeeBalances(curr).remainingBalance, 0);
  const myAwaitingCount = myDues.filter((f) => f.status === "pending_confirmation").length;
  const myPartialDuesList = myDues.filter((f) => f.status === "partially_paid");
  const myOutstandingDuesList = myDues.filter((f) => f.status === "pending" || f.status === "partially_paid");

  const uniqueDueNames = React.useMemo(() => {
    const names = new Set<string>();
    (fees || []).forEach((f) => {
      const name = getFeeDueName(f);
      if (name) names.add(name);
    });
    return Array.from(names).sort();
  }, [fees]);

  // Chart Data preparation for Accountants
  const periodChartData = React.useMemo(() => {
    if (!fees || fees.length === 0) return [];
    const map: Record<
      string,
      {
        period: string;
        paid: number;
        awaiting: number;
        unpaid: number;
        partialCount: number;
        totalCount: number;
        partialPaidRwf: number;
        partialPercent: number;
      }
    > = {};

    fees.forEach((f) => {
      const key = getFeeDueName(f) || f.period_date || f.payment_period || "General";
      const bal = getFeeBalances(f);
      if (!map[key]) {
        map[key] = {
          period: key,
          paid: 0,
          awaiting: 0,
          unpaid: 0,
          partialCount: 0,
          totalCount: 0,
          partialPaidRwf: 0,
          partialPercent: 0,
        };
      }
      map[key].totalCount += 1;
      map[key].paid += bal.paidAmount;
      if (f.status === "partially_paid") {
        map[key].partialCount += 1;
        map[key].partialPaidRwf += bal.paidAmount;
      }
      if (f.status === "pending_confirmation") {
        const pendingInstallment = bal.pendingInstallmentAmount > 0 ? bal.pendingInstallmentAmount : bal.remainingBalance;
        map[key].awaiting += pendingInstallment;
        map[key].unpaid += Math.max(0, bal.remainingBalance - pendingInstallment);
      } else {
        map[key].unpaid += bal.remainingBalance;
      }
    });

    return Object.values(map)
      .map((item) => ({
        ...item,
        partialPercent:
          item.totalCount > 0
            ? Number(((item.partialCount / item.totalCount) * 100).toFixed(1))
            : 0,
      }))
      .slice(-8);
  }, [fees]);

  const paymentMethodData = React.useMemo(() => {
    if (!fees) return [];
    let momoCount = 0, momoAmount = 0;
    let cashCount = 0, cashAmount = 0;
    let unpaidCount = 0, unpaidAmount = 0;

    fees.forEach((f) => {
      const bal = getFeeBalances(f);
      if (bal.paidAmount > 0) {
        if (f.paid_by_method?.includes("Cash")) {
          cashCount++;
          cashAmount += bal.paidAmount;
        } else {
          momoCount++;
          momoAmount += bal.paidAmount;
        }
      }
      if (bal.remainingBalance > 0) {
        unpaidCount++;
        unpaidAmount += bal.remainingBalance;
      }
    });

    return [
      { name: "Mobile Money (MoMo/Airtel)", count: momoCount, amount: momoAmount, color: "#10b981" },
      { name: "Hand Cash", count: cashCount, amount: cashAmount, color: "#3b82f6" },
      { name: "Unpaid / Remaining", count: unpaidCount, amount: unpaidAmount, color: "#f43f5e" }
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
    const bal = getFeeBalances(f);
    const isFeeOverdue = !bal.isFullyPaid && getFeeDeadlineInfo(f).isOverdue;
    const matchesStatus = 
      activeTab === "pending_approvals" 
        ? true
        : (
            statusFilter === "all" ||
            (statusFilter === "overdue" ? isFeeOverdue : false) ||
            f.status === statusFilter ||
            (statusFilter === "pending" && (f.status === "pending" || f.status === "partially_paid" || f.status === "pending_confirmation"))
          );

    const dueNameTerm = dueNameFilter.trim().toLowerCase();
    const resolvedDueName = getFeeDueName(f).toLowerCase();
    const matchesDueName =
      dueNameTerm === "" ||
      resolvedDueName.includes(dueNameTerm) ||
      (f.period_date || "").toLowerCase().includes(dueNameTerm);
    
    const term = searchQuery.trim().toLowerCase();
    const matchesSearch = term === "" || 
      f.member_name?.toLowerCase().includes(term) || 
      resolvedDueName.includes(term) ||
      f.period_date?.toLowerCase().includes(term) ||
      f.paid_by_method?.toLowerCase().includes(term) ||
      f.transaction_reference?.toLowerCase().includes(term);

    return matchesPeriod && matchesStatus && matchesDueName && matchesSearch;
  });

  // Computed list for the Manage All Dues Modal with multi-filters and sorting
  const allDuesFilteredList = React.useMemo(() => {
    if (!fees) return [];
    let list = [...fees];

    // Status filter
    if (allDuesStatusFilter === "overdue") {
      list = list.filter((f) => !getFeeBalances(f).isFullyPaid && getFeeDeadlineInfo(f).isOverdue);
    } else if (allDuesStatusFilter !== "all") {
      list = list.filter((f) => f.status === allDuesStatusFilter);
    }

    // Period filter
    if (allDuesPeriodFilter !== "all") {
      list = list.filter((f) => f.payment_period === allDuesPeriodFilter);
    }

    // Dedicated Due Name filter
    if (allDuesDueNameFilter.trim()) {
      const dueTerm = allDuesDueNameFilter.toLowerCase().trim();
      list = list.filter((f) => {
        const dueName = getFeeDueName(f).toLowerCase();
        return dueName.includes(dueTerm) || (f.period_date || "").toLowerCase().includes(dueTerm);
      });
    }

    // Search query
    if (allDuesSearch.trim()) {
      const term = allDuesSearch.toLowerCase().trim();
      list = list.filter((f) => {
        const dueName = getFeeDueName(f).toLowerCase();
        return (
          f.member_name?.toLowerCase().includes(term) ||
          dueName.includes(term) ||
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
        return getFeeBalances(b).totalDueAmount - getFeeBalances(a).totalDueAmount;
      }
      if (allDuesSortBy === "lowest") {
        return getFeeBalances(a).totalDueAmount - getFeeBalances(b).totalDueAmount;
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
  }, [fees, allDuesStatusFilter, allDuesPeriodFilter, allDuesDueNameFilter, allDuesSearch, allDuesSortBy]);

  // Master Dues Schemes (Grouped as created from the dues form)
  const duesSchemes = React.useMemo(() => {
    if (!fees || fees.length === 0) return [];
    const map = new Map<string, {
      key: string;
      due_name: string;
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
      const dueName = getFeeDueName(f);
      const bal = getFeeBalances(f);
      const key = `${pDate}:::${pPeriod}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          due_name: dueName,
          period_date: pDate,
          payment_period: pPeriod,
          rate_amount: bal.totalDueAmount,
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
      scheme.total_expected += bal.totalDueAmount;
      scheme.total_cleared += bal.paidAmount;
      scheme.members.push(f);
      if (!scheme.due_date && f.due_date) scheme.due_date = f.due_date;
      if (!scheme.admin_note && f.admin_note) scheme.admin_note = f.admin_note;

      if (f.status === "paid") {
        scheme.cleared_count += 1;
      } else if (f.status === "pending_confirmation") {
        scheme.review_count += 1;
        scheme.total_review += bal.pendingInstallmentAmount || bal.remainingBalance;
        scheme.total_pending += bal.remainingBalance;
      } else {
        scheme.pending_count += 1;
        scheme.total_pending += bal.remainingBalance;
      }
    });

    let list = Array.from(map.values());
    if (periodFilter !== "all") {
      list = list.filter((s) => s.payment_period === periodFilter);
    }
    if (dueNameFilter.trim()) {
      const dn = dueNameFilter.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.due_name.toLowerCase().includes(dn) ||
          s.period_date.toLowerCase().includes(dn)
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.due_name.toLowerCase().includes(q) ||
          s.period_date.toLowerCase().includes(q) ||
          s.payment_period.toLowerCase().includes(q) ||
          (s.admin_note && s.admin_note.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => b.period_date.localeCompare(a.period_date));
  }, [fees, periodFilter, dueNameFilter, searchQuery]);

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
          {(isAccountant || isAdmin) && (
            <Button
              onClick={() => setShowOrgGatewayModal(true)}
              variant="outline"
              className="flex items-center gap-1.5 py-2.5 font-semibold rounded-xl border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-3xs"
              id="btn-org-payment-gateway"
            >
              <Landmark className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Payment Gateway
            </Button>
          )}
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

      {/* Cooperative Broadcast & Partial-Balance Reminder Banner */}
      {(activeOrg?.fee_notification || myPartialDuesList.length > 0) && myOutstandingDuesList.length > 0 && (
        <div className="bg-red-50 dark:bg-rose-950/20 border-l-4 border-rose-600 p-4.5 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-3xs shrink-0" id="payment-warning-banner">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="font-extrabold text-[10px] uppercase tracking-wider text-rose-800 dark:text-rose-400">
                {myPartialDuesList.length > 0 ? t("REMAINING INSTALLMENT & PAYMENT REMINDER") : t("URGENT COOPERATIVE PAYMENT REMINDER")}
              </span>
              {activeOrg?.fee_notification && (
                <p className="text-xs text-stone-900 dark:text-slate-100 font-extrabold mt-1">
                  {activeOrg.fee_notification}
                </p>
              )}
              <p className="text-[11px] text-gray-600 dark:text-slate-300 mt-1 leading-normal font-semibold">
                {t("My profile ledger shows")}{" "}
                <span className="font-black text-rose-600">
                  {myOutstandingDuesList.length} {t("unpaid dues cycle(s)")}
                </span>{" "}
                ({myPendingSumRwf.toLocaleString()} RWF remaining
                {myPartialDuesList.length > 0
                  ? ` · ${myPartialDuesList.length} partially paid`
                  : ""}). {t("Please settle the remaining balance to complete payment.")}
              </p>
              {myPartialDuesList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {myPartialDuesList.slice(0, 3).map((pf) => {
                    const pBal = getFeeBalances(pf);
                    return (
                      <span
                        key={pf.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100/80 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 text-[10px] font-bold border border-amber-200 dark:border-amber-800"
                      >
                        {getFeeDueName(pf)}: Paid {pBal.paidAmount.toLocaleString()} / {pBal.totalDueAmount.toLocaleString()} RWF (Left: {pBal.remainingBalance.toLocaleString()} RWF)
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <Button 
            size="sm" 
            className="self-start sm:self-center bg-rose-600 hover:bg-rose-700 text-white shrink-0 font-bold rounded-xl"
            onClick={() => {
              const firstOutstanding = myPartialDuesList[0] || myOutstandingDuesList[0];
              if (firstOutstanding) {
                const firstBal = getFeeBalances(firstOutstanding);
                setSelectedFeeToPay(firstOutstanding);
                setPayMethod("MTN MoMo / Airtel");
                setPaymentMode("full");
                setCustomPayAmount(String(Math.max(1, Math.round(firstBal.remainingBalance / 2))));
              } else {
                setActiveTab("my_dues");
                document.getElementById("fees-tabs-navigation")?.scrollIntoView({ behavior: "smooth" });
              }
            }}
          >
            {myPartialDuesList.length > 0 ? "Pay Remaining Balance" : t("View Statement & Pay")} <ArrowRight className="ml-1 h-3.5 w-3.5" />
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
                {myOutstandingDuesList.length} invoices with remaining balance
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
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-3 py-1 rounded-full tabular-nums">
                Collection Rate: {((paidSumRwf / ((paidSumRwf + pendingSumRwf) || 1)) * 100).toFixed(1)}%
              </span>
              <span className="text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full tabular-nums">
                Paid Few (Partial): {partialMembersPct}% ({partialDuesCount}/{totalDuesCount})
              </span>
            </div>
          </div>

          {/* Collection Progress Bar & Paid Few Percentage Bar */}
          <div className="space-y-3 bg-stone-50 dark:bg-slate-950 p-3.5 rounded-xl border border-stone-100 dark:border-slate-800">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-stone-700 dark:text-slate-300">
                <span>Collection Target: {(paidSumRwf + pendingSumRwf).toLocaleString()} RWF</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono font-extrabold tabular-nums">{paidSumRwf.toLocaleString()} RWF Cleared</span>
              </div>
              <div className="w-full bg-stone-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden flex">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, (fullyPaidSumRwf / ((paidSumRwf + pendingSumRwf) || 1)) * 100)}%` }}
                  title="Fully Paid"
                />
                <div 
                  className="bg-blue-500 h-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, (partialPaidSumRwf / ((paidSumRwf + pendingSumRwf) || 1)) * 100)}%` }}
                  title="Paid Few (Partially Paid)"
                />
                <div 
                  className="bg-amber-400 h-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, (awaitingVerificationList.reduce((a, b) => a + (getFeeBalances(b).pendingInstallmentAmount || getFeeBalances(b).remainingBalance), 0) / ((paidSumRwf + pendingSumRwf) || 1)) * 100)}%` }}
                  title="Awaiting Verification"
                />
              </div>
              <div className="flex flex-wrap items-center gap-4 text-[10px] text-gray-500 font-semibold pt-1 tabular-nums">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Fully Paid ({fullyPaidSumRwf.toLocaleString()} RWF)</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Paid Few / Partial ({partialPaidSumRwf.toLocaleString()} RWF)</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> Submitted Awaiting Review ({awaitingVerificationList.reduce((a, b) => a + (getFeeBalances(b).pendingInstallmentAmount || getFeeBalances(b).remainingBalance), 0).toLocaleString()} RWF)</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> Unpaid / Remaining ({pendingSumRwf.toLocaleString()} RWF)</span>
              </div>
            </div>

            {/* Dedicated Bar: % of Members Who Paid Few (Partial Settlement) */}
            <div className="pt-2.5 border-t border-stone-200/80 dark:border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-stone-700 dark:text-slate-300">
                <span>Members Who Paid Few (Partial Settlement Share)</span>
                <span className="text-blue-600 dark:text-blue-400 font-mono font-extrabold tabular-nums">
                  {partialMembersPct}% ({partialDuesCount} of {totalDuesCount} dues)
                </span>
              </div>
              <div className="w-full bg-stone-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, partialMembersPct)}%` }}
                  title={`${partialMembersPct}% of members paid partially`}
                />
              </div>
            </div>
          </div>

          {/* Recharts Graphical Visualizers */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
            {/* Chart 1: Collection by Cycle / Period */}
            <div className="lg:col-span-2 bg-stone-50 dark:bg-slate-950 p-4 rounded-xl border border-gray-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-stone-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-blue-600" /> Payment Collection Trends & Paid Few (%) by Cycle Period
              </h4>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={periodChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <XAxis dataKey="period" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis yAxisId="rwf" stroke="#94a3b8" fontSize={10} tickLine={false} tickFormatter={(v) => `${v/1000}k`} />
                    <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} stroke="#3b82f6" fontSize={10} tickLine={false} tickFormatter={(v) => `${v}%`} />
                    <Tooltip 
                      formatter={(value: any, name: any, props: any) => {
                        if (name === "Paid Few (% Members)" || props?.dataKey === "partialPercent") {
                          const p = props?.payload;
                          return [`${value}% (${p?.partialCount ?? 0}/${p?.totalCount ?? 0} dues · ${(p?.partialPaidRwf ?? 0).toLocaleString()} RWF)`, name];
                        }
                        return [`${Number(value).toLocaleString()} RWF`, name];
                      }}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '11px', borderRadius: '8px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar yAxisId="rwf" dataKey="paid" name="Paid (RWF)" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="pct" dataKey="partialPercent" name="Paid Few (% Members)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="rwf" dataKey="awaiting" name="Awaiting Review (RWF)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="rwf" dataKey="unpaid" name="Unpaid (RWF)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
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
            {myOutstandingDuesList.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white">
                {myOutstandingDuesList.length}
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
                View your personal cooperative dues, track partial installments, and submit transaction slips for verification.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {myOutstandingDuesList.length === 0 ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-extrabold bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-xl text-xs shadow-3xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> All Dues Up To Date
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-extrabold bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 px-3 py-1.5 rounded-xl text-xs shadow-3xs">
                <AlertCircle className="h-4 w-4 text-rose-600" /> {myOutstandingDuesList.length} Payment(s) Due ({myPendingSumRwf.toLocaleString()} RWF left)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Filters panel */}
      <div className="flex flex-col gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5 rounded-2xl shadow-3xs select-none max-w-full" id="fees-filters-bar">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Dedicated Text Filter by Due Name / Payment Purpose */}
          <div className="relative">
            <TagIcon className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400 pointer-events-none" />
            <input
              type="text"
              list="due-names-datalist"
              placeholder="Filter by Due Name / Payment Purpose (e.g. Monthly Share, 2026-W20)..."
              value={dueNameFilter}
              onChange={(e) => setDueNameFilter(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 font-medium"
              id="input-filter-due-name"
            />
            <datalist id="due-names-datalist">
              {uniqueDueNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            {dueNameFilter && (
              <button
                type="button"
                onClick={() => setDueNameFilter("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                title="Clear due name filter"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Search by Member Name / Method / Reference */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by Member Name, Transaction Ref, or Payment Method..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 font-medium"
              id="input-filter-search"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4 max-w-full overflow-x-auto no-scrollbar pb-0.5">
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
                  Fully Paid
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("partially_paid")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    statusFilter === "partially_paid"
                      ? "bg-blue-600 text-white shadow-3xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
                  }`}
                >
                  Partially Paid
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("overdue")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    statusFilter === "overdue"
                      ? "bg-rose-600 text-white shadow-3xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
                  }`}
                >
                  Overdue
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
                      ? "bg-slate-700 text-white shadow-3xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
                  }`}
                >
                  Unpaid
                </button>
              </div>
            </div>
          )}

          {(dueNameFilter || searchQuery || periodFilter !== "all" || statusFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setDueNameFilter("");
                setSearchQuery("");
                setPeriodFilter("all");
                setStatusFilter("all");
              }}
              className="text-[11px] font-bold text-slate-500 hover:text-rose-600 underline ml-auto shrink-0 cursor-pointer"
            >
              Reset Filters
            </button>
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
                  <th className="py-3.5 px-4">{isAccountant ? "Member / Due Name" : "Due Name & Purpose"}</th>
                  <th className="py-3.5 px-4">Allocated period</th>
                  <th className="py-3.5 px-4">Dues Cycle</th>
                  <th className="py-3.5 px-4">Amount & Progress</th>
                  <th className="py-3.5 px-4">Settlement Info</th>
                  <th className="py-3.5 px-4">Overall Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/70 dark:divide-slate-800/80 text-stone-800 dark:text-slate-100 font-medium">
                {filteredFees.map((fee) => {
                  const isMyOwn = !isAccountant || myMemberIds.has(fee.member_id) || fee.member_id === activeMember?.id;
                  const bal = getFeeBalances(fee);
                  const dueName = getFeeDueName(fee);
                  const deadlineInfo = getFeeDeadlineInfo(fee);
                  const isExpanded = !!expandedFeeIds[fee.id];
                  const effectiveInstallments = getEffectiveInstallments(fee);
                  
                  return (
                    <React.Fragment key={fee.id}>
                      <tr className={`hover:bg-gray-50/50 dark:hover:bg-slate-850/20 transition-colors ${isMyOwn ? "bg-emerald-50/20 dark:bg-emerald-950/5" : ""} ${isExpanded ? "bg-slate-50/70 dark:bg-slate-800/30" : ""}`}>
                        <td className="py-3.5 px-4 font-bold text-stone-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              id={`btn-expand-history-${fee.id}`}
                              onClick={() => toggleExpandFee(fee.id)}
                              aria-expanded={isExpanded}
                              title={isExpanded ? "Collapse payment history" : "Expand partial payment history"}
                              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                            >
                              <ChevronDown className={`h-4 w-4 transition-transform duration-150 ${isExpanded ? "rotate-180 text-emerald-600 dark:text-emerald-400" : ""}`} />
                            </button>
                            <div className="flex flex-col">
                              <span className="font-bold flex items-center gap-1.5">
                                {isAccountant ? fee.member_name : dueName}
                                {isMyOwn && isAccountant && <span className="bg-emerald-200 dark:bg-emerald-900 dark:text-emerald-300 text-emerald-800 px-1 rounded text-[9px] font-black uppercase">Me</span>}
                              </span>
                              <div className="flex items-center gap-2 text-[11px]">
                                {isAccountant && (
                                  <span className="font-medium text-emerald-700 dark:text-emerald-400">
                                    {dueName}
                                  </span>
                                )}
                                {effectiveInstallments.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => toggleExpandFee(fee.id)}
                                    className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                  >
                                    {effectiveInstallments.length} installment{effectiveInstallments.length > 1 ? "s" : ""}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-gray-600 dark:text-gray-300 uppercase">
                          {fee.payment_period}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-black text-gray-500">
                          {fee.period_date}
                        </td>
                        <td className="py-3.5 px-4 font-extrabold font-mono tabular-nums text-zinc-900 dark:text-zinc-50 min-w-[155px]">
                          <div className="flex flex-col gap-1">
                            <span>
                              {bal.totalDueAmount.toLocaleString()} <span className="text-[9px] font-bold">RWF</span>
                            </span>
                            {(bal.paidAmount > 0 && bal.remainingBalance > 0) && (
                              <div className="space-y-0.5 font-sans">
                                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-600 rounded-full"
                                    style={{ width: `${bal.percentPaid}%` }}
                                  />
                                </div>
                                <div className="text-[10px] font-semibold flex items-center justify-between gap-2 tabular-nums">
                                  <span className="text-emerald-700 dark:text-emerald-400">Paid: {bal.paidAmount.toLocaleString()}</span>
                                  <span className="text-rose-600 dark:text-rose-400">Left: {bal.remainingBalance.toLocaleString()}</span>
                                </div>
                              </div>
                            )}
                          </div>
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
                                <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" /> Reported {(bal.pendingInstallmentAmount || bal.remainingBalance).toLocaleString()} RWF via {fee.paid_by_method}
                              </span>
                              <span className="text-[11px] text-slate-400 dark:text-slate-500 pl-5">
                                Awaiting supervisor validation
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-0.5" id={`settlement-info-${fee.id}`}>
                              {fee.status === "partially_paid" && (
                                <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400">
                                  {effectiveInstallments.length || 1} installment(s) paid · {bal.remainingBalance.toLocaleString()} RWF left
                                </span>
                              )}
                              {(() => {
                                if (deadlineInfo.isFlexible) {
                                  return (
                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                      Flexible (Settle anytime)
                                    </span>
                                  );
                                }
                                if (deadlineInfo.isOverdue) {
                                  return (
                                    <div className="flex flex-col">
                                      <span className="text-xs font-medium text-rose-600 dark:text-rose-400">
                                        Overdue by {deadlineInfo.overdueDays}d
                                      </span>
                                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Due {deadlineInfo.formattedDate}
                                      </span>
                                    </div>
                                  );
                                }
                                if (deadlineInfo.daysLeft === 0) {
                                  return (
                                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                                      Due Today ({deadlineInfo.formattedDate})
                                    </span>
                                  );
                                }
                                return (
                                  <div className="flex flex-col">
                                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                      Due {deadlineInfo.formattedDate}
                                    </span>
                                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                      {deadlineInfo.daysLeft} days left
                                    </span>
                                  </div>
                                );
                              })()}
                              {fee.is_recurring && (
                                <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5 select-none">
                                  <Repeat className="h-2.5 w-2.5 text-slate-400 shrink-0" /> Auto-recurring cycle
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 select-none">
                          <FeeStatusBadge
                            fee={fee}
                            isOverdue={deadlineInfo.isOverdue}
                            overdueDays={deadlineInfo.overdueDays}
                            formattedDueDate={deadlineInfo.formattedDate}
                          />
                        </td>
                        <td className="py-3.5 px-4 text-right selection:none shrink-0 border-l border-slate-100 dark:border-slate-800/80">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Member side pay button */}
                            {(fee.status === "pending" || fee.status === "partially_paid") && isMyOwn && (
                              <button 
                                id={`btn-member-pay-${fee.id}`}
                                onClick={() => {
                                  setSelectedFeeToPay(fee);
                                  setPayMethod("MTN MoMo / Airtel");
                                  setPaymentMode("full");
                                  setCustomPayAmount(String(Math.max(1, Math.round(bal.remainingBalance / 2))));
                                }}
                                className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium inline-flex items-center gap-1.5 shadow-2xs transition whitespace-nowrap"
                              >
                                <Smartphone className="h-3.5 w-3.5" /> {fee.status === "partially_paid" ? "Pay Balance" : "Pay"}
                              </button>
                            )}

                            {/* Member slip under review indicator */}
                            {!isAccountant && fee.status === "pending_confirmation" && (
                              <span className="h-7 px-2.5 text-[11px] text-amber-700 dark:text-amber-400 font-medium inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-900/40">
                                <Clock className="h-3 w-3 animate-spin text-amber-600" /> Slip Under Review
                              </span>
                            )}

                            {/* Accountant Review & Verify actions */}
                            {isAccountant && (fee.status === "pending_confirmation" || fee.status === "pending" || fee.status === "partially_paid") && (
                              <button
                                id={`btn-admin-review-${fee.id}`}
                                onClick={() => {
                                  setReviewingFee(fee);
                                  setAdminNoteInput("");
                                  setVerifiedInstallmentAmount(String(bal.pendingInstallmentAmount > 0 ? bal.pendingInstallmentAmount : bal.remainingBalance));
                                }}
                                className={`h-7 px-2.5 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 transition shadow-2xs text-white whitespace-nowrap ${
                                  fee.status === "pending_confirmation"
                                    ? "bg-amber-600 hover:bg-amber-700"
                                    : "bg-emerald-600 hover:bg-emerald-700"
                                }`}
                              >
                                <ShieldCheck className="h-3.5 w-3.5" />
                                {fee.status === "pending_confirmation" ? "Review Slip" : fee.status === "partially_paid" ? "Verify Balance" : "Verify Payment"}
                              </button>
                            )}

                            {/* Payment History modal trigger */}
                            <button
                              id={`btn-history-${fee.id}`}
                              type="button"
                              onClick={() => setViewingHistoryFee(fee)}
                              className="h-7 px-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer"
                              title="View installment payment history"
                            >
                              <History className="h-3.5 w-3.5 text-slate-500" />
                              <span>History</span>
                              {effectiveInstallments.length > 0 && (
                                <span className="font-mono text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                  ({effectiveInstallments.length})
                                </span>
                              )}
                            </button>

                            {/* View Official Receipt button for paid or partially paid dues */}
                            {(fee.status === "paid" || bal.paidAmount > 0) && (
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

                      {isExpanded && (
                        <tr key={`${fee.id}-history-row`} className="bg-slate-50/90 dark:bg-slate-950/60" id={`expanded-history-row-${fee.id}`}>
                          <td colSpan={7} className="px-6 py-4 border-t border-slate-200/80 dark:border-slate-800">
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2 text-xs">
                                  <History className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  <span className="font-bold text-slate-900 dark:text-white">
                                    Payment History · {dueName}
                                  </span>
                                  <span className="text-slate-400" aria-hidden="true">·</span>
                                  <span className="text-slate-500 dark:text-slate-400">
                                    {effectiveInstallments.length} recorded installment{effectiveInstallments.length === 1 ? "" : "s"}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono tabular-nums">
                                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                                    Paid: {bal.paidAmount.toLocaleString()} RWF
                                  </span>
                                  <span className="text-slate-400">/</span>
                                  <span className="text-slate-700 dark:text-slate-300 font-semibold">
                                    Total: {bal.totalDueAmount.toLocaleString()} RWF
                                  </span>
                                  <span className="text-slate-400">·</span>
                                  <span className={`font-bold ${bal.remainingBalance > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                                    Remaining: {bal.remainingBalance.toLocaleString()} RWF
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setViewingHistoryFee(fee)}
                                    className="font-sans ml-1 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition cursor-pointer"
                                  >
                                    Open Full History Modal
                                  </button>
                                </div>
                              </div>

                              {effectiveInstallments.length > 0 ? (
                                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
                                  <table className="w-full text-left text-[11px] border-collapse">
                                    <thead>
                                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 font-semibold">
                                        <th className="py-2 px-3">#</th>
                                        <th className="py-2 px-3">Date</th>
                                        <th className="py-2 px-3">Amount</th>
                                        <th className="py-2 px-3">Reference</th>
                                        <th className="py-2 px-3">Method</th>
                                        <th className="py-2 px-3">Verified By / Notes</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                      {effectiveInstallments.map((inst, idx) => (
                                        <tr key={inst.id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                                          <td className="py-2 px-3 font-mono font-bold text-slate-400">#{idx + 1}</td>
                                          <td className="py-2 px-3 text-slate-700 dark:text-slate-200 whitespace-nowrap tabular-nums">
                                            {inst.paid_at
                                              ? new Date(inst.paid_at).toLocaleString("en-GB", {
                                                  day: "2-digit",
                                                  month: "short",
                                                  year: "numeric",
                                                  hour: "2-digit",
                                                  minute: "2-digit",
                                                })
                                              : "—"}
                                          </td>
                                          <td className="py-2 px-3 font-mono font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap tabular-nums">
                                            +{Number(inst.amount || 0).toLocaleString()} RWF
                                          </td>
                                          <td className="py-2 px-3 font-mono text-slate-700 dark:text-slate-300">
                                            {inst.reference || "—"}
                                          </td>
                                          <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                                            {inst.method || "Payment"}
                                          </td>
                                          <td className="py-2 px-3 text-slate-500 dark:text-slate-400">
                                            {inst.verified_by ? `${inst.verified_by}` : "Verified"}
                                            {inst.note ? ` · ${inst.note}` : ""}
                                          </td>
                                        </tr>
                                      ))}
                                      {fee.status === "pending_confirmation" && bal.pendingInstallmentAmount > 0 && (
                                        <tr className="bg-amber-50/60 dark:bg-amber-950/20">
                                          <td className="py-2 px-3 font-mono font-bold text-amber-600">Pending</td>
                                          <td className="py-2 px-3 text-amber-800 dark:text-amber-300 whitespace-nowrap tabular-nums">
                                            {fee.reported_at
                                              ? new Date(fee.reported_at).toLocaleString("en-GB", {
                                                  day: "2-digit",
                                                  month: "short",
                                                  year: "numeric",
                                                  hour: "2-digit",
                                                  minute: "2-digit",
                                                })
                                              : "Awaiting review"}
                                          </td>
                                          <td className="py-2 px-3 font-mono font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap tabular-nums">
                                            {bal.pendingInstallmentAmount.toLocaleString()} RWF
                                          </td>
                                          <td className="py-2 px-3 font-mono text-amber-800 dark:text-amber-300">
                                            {fee.transaction_reference || "—"}
                                          </td>
                                          <td className="py-2 px-3 text-amber-700 dark:text-amber-300">
                                            {fee.paid_by_method || "Reported Slip"}
                                          </td>
                                          <td className="py-2 px-3 text-amber-700 dark:text-amber-300 font-medium">
                                            Submitted · Awaiting accountant confirmation
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                                  <span>
                                    {fee.status === "pending_confirmation"
                                      ? `Installment of ${(bal.pendingInstallmentAmount || bal.remainingBalance).toLocaleString()} RWF (Ref: ${fee.transaction_reference || "Pending"}) is awaiting accountant verification.`
                                      : "No partial or full installments have been recorded for this fee yet."}
                                  </span>
                                  {(fee.status === "pending" || fee.status === "partially_paid") && isMyOwn && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedFeeToPay(fee);
                                        setPayMethod("MTN MoMo / Airtel");
                                        setPaymentMode("full");
                                        setCustomPayAmount(String(Math.max(1, Math.round(bal.remainingBalance / 2))));
                                      }}
                                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer"
                                    >
                                      Record First Payment
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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

              <Input
                label="Due Name / Payment Purpose"
                placeholder="e.g. Monthly Share Savings, Forest Maintenance Fee, May 2026 Dues"
                value={formDueName}
                onChange={(e) => setFormDueName(e.target.value)}
                id="input-charge-due-name"
              />

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
                onClick={() => {
                  setFeePaymentSuccess(null);
                  setSelectedFeeToPay(null);
                }}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                id="btn-close-pay-modal"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {feePaymentSuccess && payMethod === "Cash" ? (
                <PaymentSuccessPulse
                  title={feePaymentSuccess.title}
                  message={feePaymentSuccess.message}
                  reference={feePaymentSuccess.reference}
                  amountRwf={feePaymentSuccess.amountRwf}
                  doneLabel="Done & Close"
                  onDone={() => {
                    setFeePaymentSuccess(null);
                    setSelectedFeeToPay(null);
                  }}
                />
              ) : (
                <>
                  {!feePaymentSuccess && selectedFeeBalances && (
                    <>
                      {/* Target summary card with partial payment breakdown */}
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[11px] text-slate-500 font-medium block">Due name & cycle</span>
                            <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                              {getFeeDueName(selectedFeeToPay)}
                            </p>
                            <p className="text-[11px] text-slate-500 font-mono mt-0.5 uppercase">
                              {selectedFeeToPay.payment_period} · {selectedFeeToPay.period_date}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-[11px] text-slate-500 block">Remaining balance</span>
                            <span className="text-base font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5 tabular-nums">
                              {selectedFeeBalances.remainingBalance.toLocaleString()} RWF
                            </span>
                          </div>
                        </div>

                        {selectedFeeBalances.paidAmount > 0 && (
                          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-semibold">
                              <span className="text-slate-600 dark:text-slate-400">
                                Total Due: <span className="font-mono text-slate-900 dark:text-white">{selectedFeeBalances.totalDueAmount.toLocaleString()} RWF</span>
                              </span>
                              <span className="text-emerald-700 dark:text-emerald-400">
                                Already Paid: <span className="font-mono">{selectedFeeBalances.paidAmount.toLocaleString()} RWF ({selectedFeeBalances.percentPaid}%)</span>
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${selectedFeeBalances.percentPaid}%` }} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Installment / Part Payment Selector */}
                      <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/50 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Payment Amount Option
                          </label>
                          <span className="text-[11px] font-mono font-bold text-blue-700 dark:text-blue-300">
                            Paying: {resolvedPayAmount.toLocaleString()} RWF
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            id="btn-pay-mode-full"
                            onClick={() => setPaymentMode("full")}
                            className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                              paymentMode === "full"
                                ? "border-emerald-600 bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 shadow-2xs"
                                : "border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-950 text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            <span className="text-xs font-bold block">Pay Full Remaining</span>
                            <span className="text-[10px] font-mono">{selectedFeeBalances.remainingBalance.toLocaleString()} RWF</span>
                          </button>
                          <button
                            type="button"
                            id="btn-pay-mode-partial"
                            onClick={() => {
                              setPaymentMode("partial");
                              if (!customPayAmount || Number(customPayAmount) <= 0 || Number(customPayAmount) > selectedFeeBalances.remainingBalance) {
                                setCustomPayAmount(String(Math.max(1, Math.round(selectedFeeBalances.remainingBalance / 2))));
                              }
                            }}
                            className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                              paymentMode === "partial"
                                ? "border-blue-600 bg-white dark:bg-slate-900 text-blue-800 dark:text-blue-300 shadow-2xs"
                                : "border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-950 text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            <span className="text-xs font-bold block">Pay in Parts (Partial)</span>
                            <span className="text-[10px]">Half or custom installment</span>
                          </button>
                        </div>

                        {paymentMode === "partial" && (
                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={1}
                                max={selectedFeeBalances.remainingBalance}
                                value={customPayAmount}
                                onChange={(e) => setCustomPayAmount(e.target.value)}
                                placeholder="Enter installment amount in RWF"
                                className="flex-1 text-xs rounded-lg border border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-950 px-3 py-2 font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-600"
                                id="input-partial-pay-amount"
                              />
                              <button
                                type="button"
                                onClick={() => setCustomPayAmount(String(Math.max(1, Math.round(selectedFeeBalances.remainingBalance / 2))))}
                                className="px-2.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shrink-0 cursor-pointer"
                                id="btn-partial-pay-half"
                              >
                                Half (50%)
                              </button>
                            </div>
                            <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                              Remaining balance after this payment:{" "}
                              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                                {Math.max(0, selectedFeeBalances.remainingBalance - resolvedPayAmount).toLocaleString()} RWF
                              </span>{" "}
                              (you will continue seeing a reminder until fully paid).
                            </p>
                          </div>
                        )}
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
                    </>
                  )}

                  {/* Conditional forms based on selection */}
                  {payMethod === "MTN MoMo / Airtel" ? (
                    <PaymentGatewaySection
                      targetType="organization"
                      itemName={`Dues: ${getFeeDueName(selectedFeeToPay)}`}
                      amountRwf={resolvedPayAmount || selectedFeeBalances?.remainingBalance || selectedFeeToPay.amount}
                      phone={momoPhoneNumber}
                      onPhoneChange={setMomoPhoneNumber}
                      senderName={manualSenderInfo}
                      onSenderNameChange={setManualSenderInfo}
                      showSenderName
                      showReferenceInput={false}
                      smsProof={resendMessageText}
                      onSmsProofChange={setResendMessageText}
                      showNoteInput
                      note={manualNote}
                      onNoteChange={setManualNote}
                      formId="form-momo-report"
                      onSubmit={handleSubmitManualReport}
                      successState={feePaymentSuccess}
                      onDoneSuccess={() => {
                        setFeePaymentSuccess(null);
                        setSelectedFeeToPay(null);
                      }}
                      doneLabel="Done & Close"
                      hideDefaultActions
                    />
                  ) : (
                    <form id="form-cash-report" onSubmit={handleSubmitManualReport} className="space-y-4">
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
                </>
              )}
            </div>

            {!feePaymentSuccess && (
              <div className="p-4 bg-gray-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFeePaymentSuccess(null);
                    setSelectedFeeToPay(null);
                  }}
                  id="btn-cancel-payment-panel"
                >
                  Close
                </Button>
                <Button
                  type="submit"
                  form={payMethod === "MTN MoMo / Airtel" ? "form-momo-report" : "form-cash-report"}
                  disabled={updateFeeStatusMutation.isPending}
                  className="bg-[#15803D] hover:bg-emerald-800 text-white font-extrabold px-5 py-2.5 rounded-xl transition shadow-xs"
                  id="btn-submit-momo-manual-report"
                >
                  {updateFeeStatusMutation.isPending ? "Submitting..." : "Submit Payment Report"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Organization Payment Gateway Reference Modal for Admins & Accountants */}
      <Modal
        open={showOrgGatewayModal}
        onClose={() => setShowOrgGatewayModal(false)}
        title="Organization Dues Collection Gateway"
      >
        <div className="flex flex-col gap-4">
          <PaymentGatewaySection
            targetType="organization"
            itemName={`${activeOrg?.name || "Organization"} Collection Gateway`}
            amountRwf={activeOrg?.default_dues_amount || 1000}
            readOnlyPreview
          />
          <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button variant="outline" onClick={() => setShowOrgGatewayModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* MoMo Push Payment Modal for Member Dues */}
      {selectedFeeToPay && selectedFeeBalances && (
        <MoMoPushPaymentModal
          isOpen={openMoMoPushPromptModal}
          onClose={() => {
            setOpenMoMoPushPromptModal(false);
            setSelectedFeeToPay(null);
          }}
          title={`Pay Dues: ${getFeeDueName(selectedFeeToPay)}`}
          description="Enter your phone number to receive an instant USSD PIN authorization prompt on your handset."
          amountRwf={resolvedPayAmount || selectedFeeBalances.remainingBalance}
          orgId={activeOrg?.id}
          defaultPayerPhone={(user as any)?.phone || user?.phone_number || (activeMember as any)?.phone || (activeMember as any)?.user?.phone_number || momoPhoneNumber}
          defaultPayerName={user?.full_name || (activeMember as any)?.user?.full_name || selectedFeeToPay.member_name}
          itemType="dues"
          itemName={`${activeOrg?.name || "Cooperative"} - ${getFeeDueName(selectedFeeToPay)} (${(resolvedPayAmount || selectedFeeBalances.remainingBalance).toLocaleString()} RWF)`}
          recipientName={activeOrg?.dues_account_name || activeOrg?.donation_account_name || activeOrg?.name || "Cooperative Treasury"}
          recipientMtnNumber={activeOrg?.dues_mtn_number || activeOrg?.donation_mtn_number || ""}
          recipientAirtelNumber={activeOrg?.dues_airtel_number || activeOrg?.donation_airtel_number || ""}
          recipientMerchantCode={activeOrg?.momo_merchant_code}
          allowedDisplayMethods={getOrgMomoDisplayMethods(activeOrg)}
          isPlatformFee={false}
          onSuccess={async (data: MoMoPaymentSuccessData) => {
            try {
              const generatedTxRef = data.providerTransactionId || data.depositId;
              const bal = getFeeBalances(selectedFeeToPay);
              const dueName = getFeeDueName(selectedFeeToPay);
              const paidNow = resolvedPayAmount > 0 ? resolvedPayAmount : bal.remainingBalance;
              const isDirectVerified = data.method === "pawapay_push";
              const nowIso = new Date().toISOString();

              const newPaidAmount = isDirectVerified ? Math.min(bal.totalDueAmount, bal.paidAmount + paidNow) : bal.paidAmount;
              const remainingAfter = Math.max(0, bal.totalDueAmount - newPaidAmount);
              const targetStatus: "paid" | "partially_paid" | "pending_confirmation" = isDirectVerified
                ? (remainingAfter <= 0 ? "paid" : "partially_paid")
                : "pending_confirmation";
              const updatedHistory: MemberFeeInstallment[] = isDirectVerified
                ? [
                    ...bal.installments,
                    {
                      id: `inst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                      amount: paidNow,
                      method: data.provider || "MTN MoMo",
                      reference: generatedTxRef,
                      paid_at: nowIso,
                      verified_by: "PawaPay Gateway",
                      note: data.comment || "Member dues installment",
                    },
                  ]
                : bal.installments;

              await updateFeeStatusMutation.mutateAsync({
                id: selectedFeeToPay.id,
                org_id: activeOrg!.id,
                member_id: selectedFeeToPay.member_id,
                due_name: dueName,
                amount: bal.totalDueAmount,
                total_due_amount: bal.totalDueAmount,
                paid_amount: newPaidAmount,
                pending_installment_amount: isDirectVerified ? 0 : paidNow,
                installment_amount: isDirectVerified ? paidNow : 0,
                payment_history: updatedHistory,
                payment_period: selectedFeeToPay.payment_period,
                period_date: selectedFeeToPay.period_date,
                status: targetStatus,
                paid_by_method: data.provider || "MTN MoMo",
                transaction_reference: generatedTxRef,
                sender_info: `PawaPay MoMo Phone: ${data.payerPhone}, Name: ${data.payerName}`,
                reported_at: nowIso,
                paid_at: isDirectVerified ? nowIso : undefined,
                report_note: `[INSTALLMENT: ${paidNow.toLocaleString()} RWF of ${bal.totalDueAmount.toLocaleString()} RWF]\n[PAWAPAY-VERIFIED] Deposit ID: ${data.depositId}\nPayer: ${data.payerName}\nComment: ${data.comment || "Member dues settlement"}\nProvider TxId: ${data.providerTransactionId || "Pending telco broadcast"}`,
                proof_url: data.proofText || `PawaPay Instant Deposit ID: ${data.depositId}`
              });

              // Notify accountants and admins
              try {
                await broadcastMutation.mutateAsync({
                  org_id: activeOrg!.id,
                  sent_by: activeMember?.id || activeOrg!.id,
                  recipient_group: "accountants_and_admins",
                  recipient_count: 1,
                  body_text: `Payment ${isDirectVerified ? "Confirmed" : "Reported"}: Member ${data.payerName} paid ${paidNow.toLocaleString()} RWF for "${dueName}" via PawaPay.${remainingAfter > 0 && isDirectVerified ? ` Remaining: ${remainingAfter.toLocaleString()} RWF.` : ""} Ref: ${generatedTxRef}.`
                });
              } catch (notifErr) {
                console.warn("[Payment Report] Broadcast error:", notifErr);
              }

              addToast(
                isDirectVerified
                  ? (remainingAfter > 0
                      ? `Installment of ${paidNow.toLocaleString()} RWF confirmed! Remaining balance: ${remainingAfter.toLocaleString()} RWF.`
                      : "Payment successfully confirmed on telecom gateway! Dues recorded as paid.")
                  : "Payment report submitted! The accountant will verify shortly.",
                "success"
              );
            } catch (err: any) {
              console.error("Failed to update fee record:", err);
              addToast(err?.message || "Failed to record payment.", "error");
            }
          }}
        />
      )}



      {/* Accountant Review / Resolve Payment Report Modal */}
      {reviewingFee && isAccountant && (() => {
        const reviewBal = getFeeBalances(reviewingFee);
        const reviewDueName = getFeeDueName(reviewingFee);
        const parsedVerifyAmt = Math.min(
          reviewBal.remainingBalance || reviewBal.totalDueAmount,
          Math.max(0, Math.round(Number(verifiedInstallmentAmount) || 0))
        );
        const projectedRemaining = Math.max(0, reviewBal.remainingBalance - parsedVerifyAmt);
        return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in" id="admin-review-modal">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
            <div className="px-5 py-4 bg-slate-100 dark:bg-slate-950 border-b dark:border-slate-850 flex items-center justify-between select-none shrink-0">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-black text-amber-600 tracking-wider">Pending Slip Verification</span>
                <span className="font-extrabold text-sm text-stone-900 dark:text-white mt-0.5">Verify payment or partial installment</span>
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
              <div className="bg-amber-50 dark:bg-amber-950/15 border border-amber-100 dark:border-amber-900/40 p-3.5 rounded-xl flex flex-col gap-2 font-semibold">
                <div className="flex items-center justify-between gap-1.5 text-xs text-amber-850 dark:text-amber-400">
                  <span className="flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    PAYMENT REPORT SLIP
                  </span>
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{reviewDueName}</span>
                </div>
                
                <div className="text-[11px] grid grid-cols-2 gap-y-2 gap-x-4 border-t border-amber-100 dark:border-amber-900/40 pt-2.5 text-stone-750 dark:text-slate-300">
                  <div>
                    <span className="text-[9px] text-gray-400 block uppercase font-extrabold">Reported Member:</span>
                    <span className="font-black text-black dark:text-white">{reviewingFee.member_name}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 block uppercase font-extrabold">Total Due / Paid So Far:</span>
                    <span className="font-black text-black dark:text-white font-mono">
                      {reviewBal.totalDueAmount.toLocaleString()} RWF
                    </span>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-mono">
                      Paid: {reviewBal.paidAmount.toLocaleString()} · Left: {reviewBal.remainingBalance.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 block uppercase font-extrabold">Selected Method:</span>
                    <span className="font-bold underline text-emerald-805">{reviewingFee.paid_by_method || "Cash / Direct Settle"}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 block uppercase font-extrabold">Reference ID Code:</span>
                    <span className="font-mono bg-white dark:bg-slate-950 text-stone-900 dark:text-slate-100 px-1 rounded block">{reviewingFee.transaction_reference || "N/A (Direct Verification)"}</span>
                  </div>
                  {reviewBal.pendingInstallmentAmount > 0 && (
                    <div className="col-span-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-lg p-2">
                      <span className="text-[9px] text-blue-700 dark:text-blue-300 block uppercase font-extrabold">Member Reported Installment Amount:</span>
                      <span className="font-mono font-black text-xs text-blue-900 dark:text-blue-200">
                        {reviewBal.pendingInstallmentAmount.toLocaleString()} RWF
                      </span>
                    </div>
                  )}
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

              {reviewBal.installments.length > 0 && (
                <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Previous Verified Installments</span>
                  {reviewBal.installments.map((inst) => (
                    <div key={inst.id} className="flex items-center justify-between text-[11px] font-medium text-slate-700 dark:text-slate-300">
                      <span>{new Date(inst.paid_at).toLocaleDateString()} · {inst.method}</span>
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{Number(inst.amount).toLocaleString()} RWF</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Verified Installment Amount Input (allows recording half / partial or full) */}
              <div className="space-y-1.5 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Verified Installment Amount (RWF)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setVerifiedInstallmentAmount(String(Math.max(1, Math.round(reviewBal.remainingBalance / 2))))}
                      className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 cursor-pointer"
                    >
                      Half ({Math.round(reviewBal.remainingBalance / 2).toLocaleString()})
                    </button>
                    <button
                      type="button"
                      onClick={() => setVerifiedInstallmentAmount(String(reviewBal.remainingBalance))}
                      className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 cursor-pointer"
                    >
                      Full ({reviewBal.remainingBalance.toLocaleString()})
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  min={1}
                  max={reviewBal.remainingBalance || reviewBal.totalDueAmount}
                  value={verifiedInstallmentAmount}
                  onChange={(e) => setVerifiedInstallmentAmount(e.target.value)}
                  className="w-full text-xs rounded-lg border bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 p-2.5 font-mono font-bold outline-none focus:ring-1 focus:ring-emerald-700 text-stone-900 dark:text-white"
                  id="input-review-verified-amount"
                />
                <p className="text-[10px] text-slate-500 font-semibold">
                  {projectedRemaining > 0
                    ? `Approving ${parsedVerifyAmt.toLocaleString()} RWF sets status to PARTIALLY PAID with ${projectedRemaining.toLocaleString()} RWF remaining.`
                    : `Approving ${parsedVerifyAmt.toLocaleString()} RWF settles this due in full (PAID).`}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-751 dark:text-slate-300">Supervisor Audit Justification note:</label>
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
                  <Check className="h-4 w-4" /> {projectedRemaining > 0 ? "Approve Partial" : "Confirm & Approve"}
                </Button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

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
                <span className="text-gray-400">Fully Paid:</span>
                <span className="font-bold font-mono bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/40">
                  {fees?.filter((f) => f.status === "paid").length || 0}
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-blue-700 dark:text-blue-400">
                <span className="text-gray-400">Partially Paid:</span>
                <span className="font-bold font-mono bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800/40">
                  {fees?.filter((f) => f.status === "partially_paid").length || 0}
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-rose-700 dark:text-rose-400">
                <span className="text-gray-400">Overdue:</span>
                <span className="font-bold font-mono bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800/40">
                  {fees?.filter((f) => !getFeeBalances(f).isFullyPaid && getFeeDeadlineInfo(f).isOverdue).length || 0}
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                <span className="text-gray-400">Unpaid / Pending:</span>
                <span className="font-bold font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
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
            <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-slate-800 flex flex-col gap-3 bg-white dark:bg-slate-900 shrink-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div className="relative">
                  <TagIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600" />
                  <input
                    type="text"
                    list="due-names-datalist"
                    placeholder="Filter by Due Name / Purpose..."
                    value={allDuesDueNameFilter}
                    onChange={(e) => setAllDuesDueNameFilter(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 text-stone-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    id="input-all-dues-due-name-filter"
                  />
                  {allDuesDueNameFilter && (
                    <button
                      onClick={() => setAllDuesDueNameFilter("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-stone-700 dark:hover:text-slate-200"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="relative">
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
                  <option value="partially_paid">Partially Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="paid">Fully Paid (Cleared)</option>
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
                      setAllDuesDueNameFilter("");
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
                      const bal = getFeeBalances(fee);
                      const dueName = getFeeDueName(fee);
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
                                {dueName}
                              </span>
                              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                                {fee.payment_period || "weekly"} · {fee.period_date || "Standard"}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono tabular-nums font-extrabold text-stone-900 dark:text-white">
                            <div>{bal.totalDueAmount.toLocaleString()} <span className="text-[9px] font-bold text-gray-500">RWF</span></div>
                            {bal.paidAmount > 0 && bal.remainingBalance > 0 && (
                              <div className="text-[10px] font-sans font-semibold text-blue-700 dark:text-blue-400">
                                Paid {bal.paidAmount.toLocaleString()} · Left {bal.remainingBalance.toLocaleString()}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {fee.status === "paid" ? (
                              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Settled
                              </span>
                            ) : deadlineInfo.isOverdue ? (
                              <span className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1.5">
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
                            <FeeStatusBadge
                              fee={fee}
                              isOverdue={deadlineInfo.isOverdue}
                              overdueDays={deadlineInfo.overdueDays}
                              formattedDueDate={deadlineInfo.formattedDate}
                            />
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Payment History */}
                              <button
                                id={`btn-all-dues-history-${fee.id}`}
                                onClick={() => setViewingHistoryFee(fee)}
                                className="p-1.5 text-slate-600 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1 font-bold text-[10px] cursor-pointer"
                                title="View Payment History"
                              >
                                <History className="h-3.5 w-3.5" /> History
                              </button>

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
                label="Due Name / Purpose"
                required
                value={editDueName}
                onChange={(e) => setEditDueName(e.target.value)}
                id="input-edit-fee-due-name"
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Total Due Amount (RWF)"
                  type="number"
                  required
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  id="input-edit-fee-amount"
                />
                {!editApplyToAllUsers && (
                  <Input
                    label="Paid So Far (RWF)"
                    type="number"
                    min={0}
                    value={editPaidAmount}
                    onChange={(e) => setEditPaidAmount(e.target.value)}
                    id="input-edit-fee-paid-amount"
                  />
                )}
              </div>

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
                  <option value="partially_paid">Partially Paid</option>
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
      {viewingReceiptFee && (() => {
        const recBal = getFeeBalances(viewingReceiptFee);
        const recDueName = getFeeDueName(viewingReceiptFee);
        return (
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
                {recBal.isFullyPaid ? (
                  <span className="inline-flex items-center gap-1 font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40">
                    <CheckCircle2 className="h-3 w-3" /> SETTLED & VERIFIED
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-black text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800/40">
                    <Clock className="h-3 w-3" /> PARTIALLY PAID ({recBal.percentPaid}%)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 py-1">
                <div>
                  <span className="text-[10px] text-stone-400 uppercase font-bold block">Member Name</span>
                  <span className="text-sm font-bold text-stone-900 dark:text-white mt-0.5 block">
                    {viewingReceiptFee.member_name || "Cooperative Member"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 uppercase font-bold block">Due Name / Cycle</span>
                  <span className="text-sm font-bold text-stone-900 dark:text-white mt-0.5 block">
                    {recDueName}
                  </span>
                  <span className="text-[10px] font-mono text-stone-500 block">
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
                    <span>Latest Reference:</span>
                    <span className="font-mono font-bold text-stone-900 dark:text-white">{viewingReceiptFee.transaction_reference}</span>
                  </div>
                )}
                {viewingReceiptFee.paid_at && (
                  <div className="flex justify-between items-center text-stone-600 dark:text-slate-400">
                    <span>Latest Payment Date:</span>
                    <span className="font-medium text-stone-800 dark:text-slate-200">
                      {new Date(viewingReceiptFee.paid_at).toLocaleDateString("en-RW", { year: "numeric", month: "short", day: "numeric" })}
                    </span>
                  </div>
                )}
                <div className="border-t border-dashed dark:border-slate-800 pt-2 flex justify-between items-center font-semibold">
                  <span className="text-stone-600 dark:text-slate-400">Total Due Amount:</span>
                  <span className="font-mono text-stone-900 dark:text-white">
                    {recBal.totalDueAmount.toLocaleString()} RWF
                  </span>
                </div>
                <div className="flex justify-between items-center font-extrabold">
                  <span className="text-stone-800 dark:text-slate-200">Total Paid So Far:</span>
                  <span className="text-base text-emerald-700 dark:text-emerald-400 font-mono">
                    {recBal.paidAmount.toLocaleString()} RWF
                  </span>
                </div>
                {recBal.remainingBalance > 0 && (
                  <div className="flex justify-between items-center font-extrabold text-rose-600 dark:text-rose-400">
                    <span>Remaining Balance:</span>
                    <span className="font-mono">{recBal.remainingBalance.toLocaleString()} RWF</span>
                  </div>
                )}
              </div>

              {recBal.installments.length > 0 && (
                <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Installment Breakdown ({recBal.installments.length})
                  </span>
                  {recBal.installments.map((inst, idx) => (
                    <div key={inst.id || idx} className="flex items-center justify-between text-[11px] py-1 border-b last:border-b-0 border-slate-200/70 dark:border-slate-800">
                      <div className="flex flex-col">
                        <span className="font-semibold text-stone-800 dark:text-slate-200">
                          #{idx + 1} · {inst.method}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(inst.paid_at).toLocaleDateString()} {inst.reference ? `· ${inst.reference}` : ""}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {Number(inst.amount).toLocaleString()} RWF
                      </span>
                    </div>
                  ))}
                </div>
              )}

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
                size="sm"
                onClick={() => setViewingReceiptFee(null)}
                className="px-4 py-2 font-bold"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Payment History Modal */}
      {viewingHistoryFee && (() => {
        const histBal = getFeeBalances(viewingHistoryFee);
        const histDueName = getFeeDueName(viewingHistoryFee);
        const histDeadline = getFeeDeadlineInfo(viewingHistoryFee);
        const histInstallments = getEffectiveInstallments(viewingHistoryFee);
        const histIsMyOwn = !isAccountant || myMemberIds.has(viewingHistoryFee.member_id) || viewingHistoryFee.member_id === activeMember?.id;

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-[90] animate-in fade-in" id="payment-history-modal">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] relative animate-in zoom-in-95">
              {/* Header */}
              <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/70 dark:bg-slate-950/70 shrink-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    <History className="h-4 w-4 shrink-0" />
                    <span>Installment Payment History</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {histDueName}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {viewingHistoryFee.member_name || "Cooperative Member"}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="uppercase font-mono">{viewingHistoryFee.payment_period}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{viewingHistoryFee.period_date}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <FeeStatusBadge
                    fee={viewingHistoryFee}
                    isOverdue={histDeadline.isOverdue}
                    overdueDays={histDeadline.overdueDays}
                    formattedDueDate={histDeadline.formattedDate}
                  />
                  <button
                    type="button"
                    id="btn-close-history-modal"
                    onClick={() => setViewingHistoryFee(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
                    aria-label="Close payment history"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
                {/* Summary Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                      Total Due Amount
                    </span>
                    <span className="text-base font-extrabold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5 block">
                      {histBal.totalDueAmount.toLocaleString()} RWF
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/20">
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 block">
                      Total Paid ({histBal.percentPaid}%)
                    </span>
                    <span className="text-base font-extrabold font-mono tabular-nums text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                      {histBal.paidAmount.toLocaleString()} RWF
                    </span>
                  </div>
                  <div className={`p-3.5 rounded-xl border ${histBal.remainingBalance > 0 ? "border-rose-200/80 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/20" : "border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60"}`}>
                    <span className={`text-[11px] font-semibold block ${histBal.remainingBalance > 0 ? "text-rose-700 dark:text-rose-400" : "text-slate-500 dark:text-slate-400"}`}>
                      Remaining Balance
                    </span>
                    <span className={`text-base font-extrabold font-mono tabular-nums mt-0.5 block ${histBal.remainingBalance > 0 ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                      {histBal.remainingBalance.toLocaleString()} RWF
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 font-semibold">
                    <span>Settlement Progress</span>
                    <span className="font-mono tabular-nums">{histBal.percentPaid}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${histBal.isFullyPaid ? "bg-emerald-600" : "bg-blue-600"}`}
                      style={{ width: `${histBal.percentPaid}%` }}
                    />
                  </div>
                </div>

                {/* Pending confirmation callout */}
                {viewingHistoryFee.status === "pending_confirmation" && (
                  <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/30 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-200">
                      <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                      <div>
                        <p className="font-bold">
                          Pending Installment Submitted: {(histBal.pendingInstallmentAmount || histBal.remainingBalance).toLocaleString()} RWF
                        </p>
                        <p className="text-[11px] text-amber-700 dark:text-amber-300">
                          Ref: <span className="font-mono font-semibold">{viewingHistoryFee.transaction_reference || "N/A"}</span> · Method: {viewingHistoryFee.paid_by_method || "Manual Slip"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Installments Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Recorded Partial Payments ({histInstallments.length})
                    </h3>
                  </div>

                  {histInstallments.length > 0 ? (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold text-[11px]">
                            <th className="py-2.5 px-3">#</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Amount</th>
                            <th className="py-2.5 px-3">Reference</th>
                            <th className="py-2.5 px-3">Method & Verified By</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {histInstallments.map((inst, idx) => (
                            <tr key={inst.id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                              <td className="py-3 px-3 font-mono font-bold text-slate-400">#{idx + 1}</td>
                              <td className="py-3 px-3 text-slate-700 dark:text-slate-200 whitespace-nowrap tabular-nums">
                                {inst.paid_at
                                  ? new Date(inst.paid_at).toLocaleString("en-GB", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "—"}
                              </td>
                              <td className="py-3 px-3 font-mono font-extrabold text-emerald-700 dark:text-emerald-400 whitespace-nowrap tabular-nums">
                                +{Number(inst.amount || 0).toLocaleString()} RWF
                              </td>
                              <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">
                                {inst.reference || "—"}
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {inst.method || "Direct Payment"}
                                  </span>
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                    {inst.verified_by ? `Verified by ${inst.verified_by}` : "Verified"}
                                    {inst.note ? ` · ${inst.note}` : ""}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-10 px-4 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                      <History className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        No partial or full payments have been recorded yet
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Each confirmed installment will appear here with its date, amount, and transaction reference.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2 shrink-0">
                {(viewingHistoryFee.status === "pending" || viewingHistoryFee.status === "partially_paid") && histIsMyOwn && (
                  <Button
                    size="sm"
                    onClick={() => {
                      const target = viewingHistoryFee;
                      setViewingHistoryFee(null);
                      setSelectedFeeToPay(target);
                      setPayMethod("MTN MoMo / Airtel");
                      setPaymentMode("full");
                      setCustomPayAmount(String(Math.max(1, Math.round(histBal.remainingBalance / 2))));
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    <Smartphone className="h-3.5 w-3.5" /> Pay Remaining Balance
                  </Button>
                )}

                {isAccountant && !histBal.isFullyPaid && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const target = viewingHistoryFee;
                      setViewingHistoryFee(null);
                      setReviewingFee(target);
                      setAdminNoteInput("");
                      setVerifiedInstallmentAmount(String(histBal.pendingInstallmentAmount > 0 ? histBal.pendingInstallmentAmount : histBal.remainingBalance));
                    }}
                    className="font-bold"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Record / Verify Installment
                  </Button>
                )}

                {(viewingHistoryFee.status === "paid" || histBal.paidAmount > 0) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const target = viewingHistoryFee;
                      setViewingHistoryFee(null);
                      setViewingReceiptFee(target);
                    }}
                    className="font-bold"
                  >
                    <Receipt className="h-3.5 w-3.5" /> View Receipt
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewingHistoryFee(null)}
                  className="font-bold"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
