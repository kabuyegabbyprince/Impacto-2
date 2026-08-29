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
  useUpdateOrganization,
  useBroadcastNotification
} from "../hooks/useImpactoData";
import { Card, Input, Button, Badge, ImageUploadInput } from "../components/ui";
import { useToast } from "../components/Toast";
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
  PieChart as PieChartIcon
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

  const roleStr = (activeMember?.role as string) || "";
  const isAccountant = roleStr === "accountant" || !!user?.is_superadmin;
  const isAdmin = roleStr === "org_admin" || !!user?.is_superadmin;

  // Data fetching
  const { data: members, isLoading: loadingMembers } = useMembers(activeOrg?.id);
  const { data: fees, isLoading: loadingFees } = useMemberFees(activeOrg?.id);

  // Mutations
  const createFeeMutation = useCreateMemberFee();
  const updateFeeStatusMutation = useUpdateMemberFeeStatus();
  const updateFeeMutation = useUpdateMemberFee();
  const deleteFeeMutation = useDeleteMemberFee();
  const updateOrgMutation = useUpdateOrganization();
  const broadcastMutation = useBroadcastNotification();

  const [noticeText, setNoticeText] = useState(activeOrg?.fee_notification || "");
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Edit & Delete states for Accountants
  const [editingFee, setEditingFee] = useState<MemberFee | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editPeriod, setEditPeriod] = useState<"weekly" | "monthly" | "flexible">("weekly");
  const [editPeriodDate, setEditPeriodDate] = useState("");
  const [editStatus, setEditStatus] = useState<"paid" | "pending" | "pending_confirmation">("pending");

  const [deletingFee, setDeletingFee] = useState<MemberFee | null>(null);

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
      m.user_id === user?.id || 
      m.id === activeMember?.id || 
      m.user_id === activeMember?.user_id ||
      (user?.email && m.user?.email === user.email)
    );
  }, [members, user, activeMember]);

  const myMemberIds = React.useMemo(() => {
    const ids = new Set<string>();
    if (activeMember?.id) ids.add(activeMember.id);
    if (activeMember?.user_id) ids.add(activeMember.user_id);
    if (user?.id) ids.add(user.id);
    if (myMemberRecord?.id) ids.add(myMemberRecord.id);
    if (myMemberRecord?.user_id) ids.add(myMemberRecord.user_id);
    return ids;
  }, [activeMember, user, myMemberRecord]);

  // Dues assigned specific to current logged-in member or admin
  const myDues = React.useMemo(() => {
    if (!fees) return [];
    return fees.filter((f) => {
      if (!f.member_id) return false;
      if (myMemberIds.has(f.member_id)) return true;
      for (const id of myMemberIds) {
        if (id && (f.member_id.includes(id) || id.includes(f.member_id))) return true;
      }
      return false;
    });
  }, [fees, myMemberIds]);

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
        badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900"
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
        label: "Unsettled dues (Standard)",
        badgeClass: "text-stone-600 bg-stone-100 dark:bg-slate-800"
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
        label: `Due by ${formattedDate} (${daysLeft}d left)`,
        badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-900 font-bold"
      };
    } else if (daysLeft === 0) {
      return {
        isFlexible: false,
        deadlineStr,
        formattedDate,
        daysLeft: 0,
        isOverdue: false,
        label: `Due Today (${formattedDate})`,
        badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse font-bold"
      };
    } else {
      const overdueDays = Math.abs(daysLeft);
      return {
        isFlexible: false,
        deadlineStr,
        formattedDate,
        daysLeft,
        isOverdue: true,
        label: `Overdue by ${overdueDays}d (Due ${formattedDate})`,
        badgeClass: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900 font-bold"
      };
    }
  };

  const handleCreateFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg) return;
    
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
      if (!momoPhoneNumber || momoPhoneNumber.length < 8) {
        addToast("Please provide a valid Mobile Money number (e.g., 078XXXXXXX).", "error");
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
    if (!reviewingFee) return;
    setIsSubmittingReview(true);

    try {
      const finalStatus = approve ? "paid" : "pending";
      const paidAt = approve ? new Date().toISOString() : undefined;
      const noteText = adminNoteInput || (approve ? "Approved by supervisor" : "Rejected: Verification slip invalid");

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

  const handleSaveEditFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFee || !activeOrg?.id) return;
    try {
      await updateFeeMutation.mutateAsync({
        id: editingFee.id,
        org_id: activeOrg.id,
        amount: parseFloat(editAmount) || 0,
        payment_period: editPeriod,
        period_date: editPeriodDate,
        status: editStatus,
      });
      addToast("Fee due updated successfully!", "success");
    } catch (err: any) {
      addToast(sanitizeError(err, "Failed to update fee due."), "error");
    } finally {
      setEditingFee(null);
    }
  };

  const handleConfirmDeleteFee = async () => {
    if (!deletingFee || !activeOrg?.id) return;
    try {
      await deleteFeeMutation.mutateAsync({
        id: deletingFee.id,
        org_id: activeOrg.id,
        user_name: user?.full_name || (activeMember as any)?.user?.full_name || "Accountant",
        user_id: user?.id || activeMember?.id,
        fee_amount: deletingFee.amount,
        fee_ref: deletingFee.transaction_reference,
        member_name: deletingFee.member_name,
      });
      addToast("Fee record deleted and ledger synchronized successfully!", "success");
    } catch (err: any) {
      addToast(sanitizeError(err, "Failed to delete fee due."), "error");
    } finally {
      setDeletingFee(null);
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

  const paidSumRwf = paidDuesList.reduce((acc, current) => acc + current.amount, 0);
  const pendingSumRwf = pendingDuesList.reduce((acc, current) => acc + current.amount, 0);

  const myPaidSumRwf = myDues.filter((f) => f.status === "paid").reduce((acc, curr) => acc + curr.amount, 0);
  const myPendingSumRwf = myDues.filter((f) => f.status === "pending" || f.status === "pending_confirmation").reduce((acc, curr) => acc + curr.amount, 0);
  const myAwaitingCount = myDues.filter((f) => f.status === "pending_confirmation").length;

  // Chart Data preparation for Accountants
  const periodChartData = React.useMemo(() => {
    if (!fees || fees.length === 0) return [];
    const map: Record<string, { period: string; paid: number; awaiting: number; unpaid: number }> = {};
    
    fees.forEach((f) => {
      const key = f.period_date || f.payment_period || "General";
      if (!map[key]) {
        map[key] = { period: key, paid: 0, awaiting: 0, unpaid: 0 };
      }
      if (f.status === "paid") {
        map[key].paid += f.amount;
      } else if (f.status === "pending_confirmation") {
        map[key].awaiting += f.amount;
      } else {
        map[key].unpaid += f.amount;
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
      if (f.status === "paid" || f.status === "pending_confirmation") {
        if (f.paid_by_method?.includes("MoMo") || f.paid_by_method?.includes("Airtel") || f.paid_by_method?.includes("MTN")) {
          momoCount++;
          momoAmount += f.amount;
        } else if (f.paid_by_method?.includes("Cash")) {
          cashCount++;
          cashAmount += f.amount;
        } else {
          momoCount++;
          momoAmount += f.amount;
        }
      } else {
        unpaidCount++;
        unpaidAmount += f.amount;
      }
    });

    return [
      { name: "Mobile Money (MoMo/Airtel)", count: momoCount, amount: momoAmount, color: "#10b981" },
      { name: "Hand Cash", count: cashCount, amount: cashAmount, color: "#3b82f6" },
      { name: "Unpaid / Pending", count: unpaidCount, amount: unpaidAmount, color: "#f43f5e" }
    ];
  }, [fees]);

  // Filters computed across all ledger entries (or user specific ledger)
  const isViewMyDues = activeTab === "my_dues";
  const sourceList = isViewMyDues ? myDues : fees || [];

  const filteredFees = sourceList.filter((f) => {
    // Tab filtering (pending approvals tab shows ONLY payments waiting for accountant confirmation)
    if (activeTab === "pending_approvals" && f.status !== "pending_confirmation") {
      return false;
    }
    const matchesPeriod = periodFilter === "all" || f.payment_period === periodFilter;
    const matchesStatus = 
      activeTab === "pending_approvals" 
        ? (statusFilter === "all" || f.status === statusFilter)
        : (statusFilter === "all" || f.status === statusFilter || (statusFilter === "pending" && (f.status === "pending" || f.status === "pending_confirmation")));
    
    const term = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === "" || 
      f.member_name?.toLowerCase().includes(term) || 
      f.period_date.toLowerCase().includes(term) ||
      f.paid_by_method?.toLowerCase().includes(term) ||
      f.transaction_reference?.toLowerCase().includes(term);

    return matchesPeriod && matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 container mx-auto max-w-7xl px-4 py-6 font-sans" id="fees-management-container">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-5" id="fees-sub-header">
        <div>
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 tracking-wider uppercase">
            {activeOrg?.name} {t("fees_ledger_dues")}
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-stone-900 dark:text-white tracking-tight mt-1">
            {t("fees_title")}
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            {t("fees_sub")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAccountant && (
            <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 font-bold" id="btn-add-fee">
              <Plus className="h-4 w-4" /> {t("fees_charge_new_btn")}
            </Button>
          )}
        </div>
      </div>

      {/* Cooperative Broadcast alert / warning system banner */}
      {activeOrg?.fee_notification && myDues.some(f => f.status === "pending") && (
        <div className="bg-red-50 dark:bg-rose-950/20 border-l-4 border-rose-600 p-4.5 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm shrink-0" id="payment-warning-banner">
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
            className="self-start sm:self-center bg-rose-600 hover:bg-rose-700 text-white shrink-0 font-bold"
            onClick={() => {
              setActiveTab("my_dues");
              document.getElementById("fees-tabs-navigation")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            {t("View Statement & Pay")} <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Accountant notification console */}
      {isAccountant && (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-xs flex flex-col gap-4 shrink-0">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-700 shrink-0">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">{t("Fee & Subscription Payment Announcement Console")}</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">{t("Draft customizable warning notifications to remind members and volunteers to pay outstanding membership and voluntary fees. Active notices will block statement screens as urgent warning banners.")}</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 border-t pt-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-gray-555 dark:text-slate-400">{t("Notice Broadcast Alert Message")}</label>
              <textarea
                className="w-full text-xs rounded-lg border bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 p-3 h-20 focus:ring-1 focus:ring-emerald-600 focus:outline-none font-semibold text-stone-800 dark:text-stone-100"
                value={noticeText}
                onChange={(e) => setNoticeText(e.target.value)}
                placeholder={t("fees_notice_broadcast_placeholder")}
              />
            </div>
            <div className="flex items-center gap-2 self-end select-none">
              {activeOrg?.fee_notification && (
                <Button 
                  size="xs" 
                  variant="outline" 
                  onClick={() => { setNoticeText(""); handleSaveFeeNotification(""); }}
                  loading={isBroadcasting}
                >
                  {t("fees_clear_notice_btn")}
                </Button>
              )}
              <Button 
                size="xs" 
                className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 font-extrabold px-5"
                onClick={() => handleSaveFeeNotification(noticeText)}
                loading={isBroadcasting}
                disabled={!noticeText.trim()}
              >
                {t("fees_publish_dispatch_btn")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Metrics board */}
      {isAccountant ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="fees-metrics-grid">
          <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-990 dark:text-emerald-200 p-5 rounded-xl flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[10px] font-black tracking-widest uppercase text-emerald-800 dark:text-emerald-400">
                {t("fees_paid_contributions")}
              </span>
              <div className="text-2xl font-black mt-1 font-mono text-emerald-900 dark:text-emerald-100">
                {paidSumRwf.toLocaleString()} <span className="text-xs font-bold">RWF</span>
              </div>
              <p className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 mt-1.5 font-medium leading-none">
                {t("fees_paid_desc")}
              </p>
            </div>
            <Landmark className="h-10 w-10 text-emerald-600/30 shrink-0" />
          </div>

          <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-990 dark:text-rose-200 p-5 rounded-xl flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[10px] font-black tracking-widest uppercase text-rose-840 dark:text-rose-450">
                {t("fees_outstanding_dues")}
              </span>
              <div className="text-2xl font-black mt-1 font-mono text-rose-900 dark:text-rose-100">
                {pendingSumRwf.toLocaleString()} <span className="text-xs font-bold">RWF</span>
              </div>
              <p className="text-[10px] text-rose-700/80 dark:text-rose-300/80 mt-1.5 font-medium leading-none">
                {t("fees_outstanding_desc")}
              </p>
            </div>
            <Coins className="h-10 w-10 text-rose-600/30 shrink-0" />
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-990 dark:text-amber-200 p-5 rounded-xl flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[10px] font-black tracking-widest uppercase text-amber-840 dark:text-amber-450">
                {t("fees_awaiting_verification")}
              </span>
              <div className="text-2xl font-black mt-1 font-mono text-amber-900 dark:text-amber-100 flex items-center gap-2">
                {awaitingVerificationList.length} <span className="text-xs font-bold">Slips</span>
                {awaitingVerificationList.length > 0 && (
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-ping inline-block" />
                )}
              </div>
              <p className="text-[10px] text-amber-700/80 dark:text-amber-300/80 mt-1.5 font-medium leading-none">
                {t("fees_awaiting_desc")}
              </p>
            </div>
            <Receipt className="h-10 w-10 text-amber-600/30 shrink-0" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="fees-metrics-grid">
          <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-990 dark:text-emerald-200 p-5 rounded-xl flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[10px] font-black tracking-widest uppercase text-emerald-800 dark:text-emerald-400">
                {t("fees_my_cleared")}
              </span>
              <div className="text-2xl font-black mt-1 font-mono text-emerald-900 dark:text-emerald-100">
                {myPaidSumRwf.toLocaleString()} <span className="text-xs font-bold">RWF</span>
              </div>
              <p className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 mt-1.5 font-medium leading-none">
                {t("fees_my_cleared_desc")}
              </p>
            </div>
            <Landmark className="h-10 w-10 text-emerald-600/30 shrink-0" />
          </div>

          <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-990 dark:text-rose-200 p-5 rounded-xl flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[10px] font-black tracking-widest uppercase text-rose-840 dark:text-rose-450">
                {t("fees_my_outstanding")}
              </span>
              <div className="text-2xl font-black mt-1 font-mono text-rose-900 dark:text-rose-100">
                {myPendingSumRwf.toLocaleString()} <span className="text-xs font-bold">RWF</span>
              </div>
              <p className="text-[10px] text-rose-700/80 dark:text-rose-300/80 mt-1.5 font-medium leading-none">
                {t("fees_my_outstanding_desc")}
              </p>
            </div>
            <Coins className="h-10 w-10 text-rose-600/30 shrink-0" />
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 text-blue-990 dark:text-blue-200 p-5 rounded-xl flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[10px] font-black tracking-widest uppercase text-blue-800 dark:text-blue-400">
                {t("fees_my_cycles")}
              </span>
              <div className="text-2xl font-black mt-1 font-mono text-blue-900 dark:text-blue-100 flex items-center gap-2">
                {myDues.length} <span className="text-xs font-bold">Records</span>
                {myAwaitingCount > 0 && (
                  <span className="text-xs font-bold text-amber-600 bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
                    {myAwaitingCount} In Review
                  </span>
                )}
              </div>
              <p className="text-[10px] text-blue-700/80 dark:text-blue-300/80 mt-1.5 font-medium leading-none">
                {t("fees_my_cycles_desc")}
              </p>
            </div>
            <Receipt className="h-10 w-10 text-blue-600/30 shrink-0" />
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
                style={{ width: `${Math.min(100, (awaitingVerificationList.reduce((a, b) => a + b.amount, 0) / ((paidSumRwf + pendingSumRwf) || 1)) * 100)}%` }}
                title="Awaiting Verification"
              />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[10px] text-gray-500 font-semibold pt-1">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Cleared Paid ({paidSumRwf.toLocaleString()} RWF)</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> Submitted Awaiting Review ({awaitingVerificationList.reduce((a, b) => a + b.amount, 0).toLocaleString()} RWF)</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> Unpaid Outstanding ({(fees?.filter(f => f.status === "pending").reduce((a, b) => a + b.amount, 0) || 0).toLocaleString()} RWF)</span>
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
        <div className="flex border-b border-gray-200 dark:border-slate-800" id="fees-tabs-navigation">
          <button
            id="tab-ledger"
            onClick={() => { setActiveTab("ledger"); setStatusFilter("all"); }}
            className={`py-3 px-5 border-b-2 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === "ledger"
                ? "border-emerald-600 text-stone-900 dark:text-white"
                : "border-transparent text-gray-450 hover:text-stone-750 dark:hover:text-slate-300"
            }`}
          >
            <Coins className="h-4 w-4" /> {t("fees_tab_ledger")}
          </button>
          <button
            id="tab-pending-approvals"
            onClick={() => { setActiveTab("pending_approvals"); setStatusFilter("all"); }}
            className={`py-3 px-5 border-b-2 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 relative ${
              activeTab === "pending_approvals"
                ? "border-emerald-600 text-stone-900 dark:text-white"
                : "border-transparent text-gray-450 hover:text-stone-750 dark:hover:text-slate-300"
            }`}
          >
            <ShieldCheck className="h-4 w-4" /> {t("fees_tab_pending")}
            {awaitingVerificationList.length > 0 && (
              <span className="absolute top-2.5 right-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white animate-pulse">
                {awaitingVerificationList.length}
              </span>
            )}
          </button>
          <button
            id="tab-my-dues"
            onClick={() => { setActiveTab("my_dues"); setStatusFilter("all"); }}
            className={`py-3 px-5 border-b-2 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 relative ${
              activeTab === "my_dues"
                ? "border-emerald-600 text-stone-900 dark:text-white"
                : "border-transparent text-gray-450 hover:text-stone-750 dark:hover:text-slate-300"
            }`}
          >
            <Smartphone className="h-4 w-4" /> {t("fees_tab_personal")}
            {myDues.filter(f => f.status === "pending").length > 0 && (
              <span className="absolute top-2.5 right-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white">
                {myDues.filter(f => f.status === "pending").length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Filters panel (Search card removed as requested) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gray-50 dark:bg-slate-900/60 border p-3.5 rounded-xl select-none" id="fees-filters-bar">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-450 font-bold flex items-center gap-1.5 whitespace-nowrap">
              <Filter className="h-3 w-3" /> Cycle Type:
            </span>
            <div className="inline-flex rounded-md shadow-xs text-[11px]" id="filter-btn-group-period">
              {["all", "weekly", "monthly", "flexible"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriodFilter(p as any)}
                  className={`px-3 py-1.5 border font-bold uppercase transition-all cursor-pointer first:rounded-l-md last:rounded-r-md -ml-px ${
                    periodFilter === p
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-emerald-600 dark:border-emerald-600"
                      : "bg-white text-stone-600 hover:bg-gray-100 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {activeTab !== "pending_approvals" && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-450 font-bold flex items-center gap-1.5 whitespace-nowrap">
                <Filter className="h-3 w-3" /> Status:
              </span>
              <div className="inline-flex rounded-md shadow-xs text-[11px]" id="filter-btn-group-status">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1.5 border rounded-l-md font-bold uppercase transition-all cursor-pointer ${
                    statusFilter === "all"
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-emerald-700 dark:border-emerald-700"
                      : "bg-white text-stone-600 hover:bg-gray-100 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("paid")}
                  className={`px-3 py-1.5 border-t border-b font-bold uppercase transition-all cursor-pointer ${
                    statusFilter === "paid"
                      ? "bg-emerald-700 text-white border-emerald-700 dark:bg-emerald-600 dark:border-emerald-600"
                      : "bg-white text-stone-600 hover:bg-gray-100 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800"
                  }`}
                >
                  Paid
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("pending_confirmation")}
                  className={`px-3 py-1.5 border-t border-b font-bold uppercase transition-all cursor-pointer ${
                    statusFilter === "pending_confirmation"
                      ? "bg-amber-600 text-white border-amber-600"
                      : "bg-white text-stone-600 hover:bg-gray-100 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800"
                  }`}
                >
                  Pending Review
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("pending")}
                  className={`px-3 py-1.5 border rounded-r-md font-bold uppercase transition-all cursor-pointer ${
                    statusFilter === "pending"
                      ? "bg-rose-700 text-white border-rose-700 dark:bg-rose-600 dark:border-rose-600"
                      : "bg-white text-stone-600 hover:bg-gray-100 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800"
                  }`}
                >
                  Unpaid
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Roster Tracking Table view or My account view */}
      {loadingFees ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl" id="div-fees-loading">
          <Clock className="h-8 w-8 text-emerald-600 animate-spin mx-auto mb-3" />
          <p className="text-xs text-gray-400 animate-pulse font-bold tracking-wider">Retrieving cooperative dues and receipts...</p>
        </div>
      ) : filteredFees.length > 0 ? (
        <div className="bg-white dark:bg-slate-900 border rounded-xl overflow-hidden shadow-xs" id="fees-ledger-container-box">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse" id="fees-ledger-rendered-table">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-slate-950/40 border-b text-gray-450 font-bold uppercase leading-normal">
                  <th className="py-3 px-4">{isAccountant ? "Member Name" : "Contribution / Fee"}</th>
                  <th className="py-3 px-4">Allocated period</th>
                  <th className="py-3 px-4">Dues Cycle</th>
                  <th className="py-3 px-4">Amount Invoice</th>
                  <th className="py-3 px-4">Settlement Info</th>
                  <th className="py-3 px-4">Overall Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-stone-800 dark:text-slate-100 font-medium">
                {filteredFees.map((fee) => {
                  const isMyOwn = fee.member_id === activeMember?.id;
                  
                  return (
                    <tr key={fee.id} className={`hover:bg-gray-50/50 dark:hover:bg-slate-850/20 transition-colors ${isMyOwn ? "bg-emerald-50/20 dark:bg-emerald-950/5" : ""}`}>
                      <td className="py-3.5 px-4 font-bold text-stone-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full shrink-0 ${
                            fee.status === "paid" 
                              ? "bg-emerald-505 bg-emerald-500" 
                              : fee.status === "pending_confirmation" 
                                ? "bg-amber-500 animate-ping" 
                                : "bg-rose-500"
                          }`} />
                          <div className="flex flex-col">
                            <span className="font-bold flex items-center gap-1.5">
                              {isAccountant ? fee.member_name : "Membership Dues"}
                              {isMyOwn && <span className="bg-emerald-2 px-1 bg-emerald-200 dark:bg-emerald-900 dark:text-emerald-300 text-emerald-800 rounded text-[9px] font-black uppercase">Me</span>}
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
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 shrink-0" /> Verified: {fee.paid_by_method || "Direct gateway"}
                            </span>
                            {fee.transaction_reference && (
                              <span className="text-[9px] font-mono font-black text-gray-500 bg-gray-100 dark:bg-slate-800 px-1 py-0.5 rounded inline-block w-fit">
                                Ref: {fee.transaction_reference}
                              </span>
                            )}
                          </div>
                        ) : fee.status === "pending_confirmation" ? (
                          <div className="flex flex-col gap-0.5" id={`settlement-info-${fee.id}`}>
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                              <Clock className="h-3 w-3 shrink-0" /> Reported via {fee.paid_by_method}
                            </span>
                            <span className="text-[9px] text-gray-400 font-medium truncate">
                              Wait supervisor validation...
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1" id={`settlement-info-${fee.id}`}>
                            {(() => {
                              const info = getFeeDeadlineInfo(fee);
                              return (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold w-fit inline-flex items-center gap-1 ${info.badgeClass}`}>
                                  <Clock className="h-3 w-3 shrink-0" />
                                  {info.label}
                                </span>
                              );
                            })()}
                            {fee.is_recurring && (
                              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5 select-none">
                                <Repeat className="h-2.5 w-2.5 shrink-0" /> Auto-recurring cycle
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 select-none">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider leading-none ${
                          fee.status === "paid"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : fee.status === "pending_confirmation"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                              : "bg-rose-100 text-rose-850 dark:bg-rose-900/30 dark:text-rose-300"
                        }`}>
                          <span className={`h-1 w-1 rounded-full ${
                            fee.status === "paid" 
                              ? "bg-emerald-600" 
                              : fee.status === "pending_confirmation" 
                                ? "bg-amber-600 animate-pulse" 
                                : "bg-rose-600"
                          }`} />
                          {fee.status === "paid" 
                            ? "CLEARED" 
                            : fee.status === "pending_confirmation" 
                              ? "PENDING REVIEW" 
                              : "UNPAID OUTSTANDING"
                          }
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right selection:none shrink-0 border-l border-dashed dark:border-slate-800/60">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Member side pay button */}
                          {fee.status === "pending" && isMyOwn && (
                            <Button 
                              id={`btn-member-pay-${fee.id}`}
                              size="xs" 
                              className="bg-emerald-700 hover:bg-emerald-850 flex items-center gap-1 text-[11px] font-extrabold"
                              onClick={() => {
                                setSelectedFeeToPay(fee);
                                setPayMethod("MTN MoMo / Airtel");
                              }}
                            >
                              <Smartphone className="h-3 w-3" /> Pay or Report
                            </Button>
                          )}

                          {/* Accountant Review & Verify actions */}
                          {isAccountant && (fee.status === "pending_confirmation" || fee.status === "pending") && (
                            <Button
                              id={`btn-admin-review-${fee.id}`}
                              size="xs"
                              variant="secondary"
                              className={`flex items-center gap-1 font-bold text-[11px] ${
                                fee.status === "pending_confirmation"
                                  ? "bg-amber-600 hover:bg-amber-700 text-stone-900"
                                  : "bg-emerald-700 hover:bg-emerald-800 text-white"
                              }`}
                              onClick={() => {
                                setReviewingFee(fee);
                                setAdminNoteInput("");
                              }}
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              {fee.status === "pending_confirmation" ? "Review Slip" : "Verify Payment"}
                            </Button>
                          )}

                          {/* Edit Due for accountants */}
                          {isAccountant && (
                            <button
                              id={`btn-edit-fee-${fee.id}`}
                              onClick={() => {
                                setEditingFee(fee);
                                setEditAmount(fee.amount.toString());
                                setEditPeriod(fee.payment_period as any);
                                setEditPeriodDate(fee.period_date || "");
                                setEditStatus(fee.status);
                              }}
                              className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 transition flex items-center gap-1 font-bold text-[10px]"
                              title="Edit Due/Charge Details"
                            >
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </button>
                          )}

                          {/* Delete Due for accountants */}
                          {isAccountant && (
                            <button
                              id={`btn-delete-fee-${fee.id}`}
                              onClick={() => setDeletingFee(fee)}
                              className="p-1.5 text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-200 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center gap-1 font-bold text-[10px]"
                              title="Delete Due/Charge"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </button>
                          )}

                          {/* Quick Accountant Toggle status */}
                          {isAccountant && (
                            <button
                              id={`btn-admin-toggle-legacy-${fee.id}`}
                              onClick={() => handleToggleStatusLegacy(fee)}
                              className="p-1.5 text-gray-400 hover:text-stone-900 dark:hover:text-amber-500 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
                              title="Force Toggle/Adjust Balance"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          )}

                          {fee.status === "pending_confirmation" && isMyOwn && (
                            <span className="text-[10px] text-amber-500 font-black flex items-center gap-1.5 animate-pulse select-none">
                              <Clock className="h-3 w-3" /> Submitted
                            </span>
                          )}

                          {fee.status === "paid" && (
                            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 select-none">
                              <Check className="h-3 w-3" /> Settled
                            </span>
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

      {/* Record Contribution modal (Admin workspace) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in" id="add-fee-modal">
          <div className="bg-white dark:bg-slate-900 border rounded-xl shadow-lg w-full max-w-md p-6 relative">
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
                    🕊️ Flexible contribution fees have no strict due date or automated reminders.
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
        <div className="fixed inset-0 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in" id="pay-report-modal">
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="p-5 bg-gradient-to-r from-emerald-800 to-emerald-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black tracking-widest uppercase text-emerald-200">Payment Gateway</span>
                <h3 className="text-lg font-extrabold flex items-center gap-1.5 mt-0.5">
                  <Smartphone className="h-5 w-5" /> Settle Account Contribution
                </h3>
              </div>
              <button 
                onClick={() => setSelectedFeeToPay(null)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition"
                id="btn-close-pay-modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Target summary card */}
              <div className="p-4 bg-emerald-50/50 dark:bg-slate-950/20 border border-emerald-100 dark:border-slate-850 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-extrabold text-[#15803D] uppercase tracking-wider">Assigned invoice dues</span>
                  <p className="text-sm font-black text-stone-900 dark:text-white mt-1 uppercase">
                    Cooperative Solidarity ({selectedFeeToPay.payment_period})
                  </p>
                  <p className="text-xs text-gray-400 font-mono font-bold mt-0.5">
                    For Dues Cycle: {selectedFeeToPay.period_date}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-extrabold text-stone-400 block uppercase">REQUIRED VALUE</span>
                  <span className="text-lg font-black font-mono text-emerald-800 dark:text-emerald-400 mt-1">
                    {selectedFeeToPay.amount.toLocaleString()} RWF
                  </span>
                </div>
              </div>

              {/* Selector for payment reported method */}
              <div className="space-y-2">
                <label className="text-xs font-black text-stone-800 dark:text-slate-300 block uppercase tracking-wider select-none">
                  Choose Settlement Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "MTN MoMo / Airtel", label: "Mobile Money", icon: <Smartphone className="h-4 w-4" /> },
                    { id: "Cash", label: "Hand Cash", icon: <Coins className="h-4 w-4" /> }
                  ].map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      id={`btn-pay-method-${method.id.replace(/\s+/g, '-')}`}
                      onClick={() => setPayMethod(method.id as any)}
                      className={`flex flex-col items-center justify-center p-3 border rounded-xl font-bold text-xs gap-1.5 transition-all text-center cursor-pointer ${
                        payMethod === method.id
                          ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-850 dark:text-emerald-350 shadow-xs scale-102"
                          : "border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-gray-100 text-stone-600 dark:text-slate-400"
                      }`}
                    >
                      {method.icon}
                      <span>{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional forms based on selection */}
              {payMethod === "MTN MoMo / Airtel" ? (
                <form onSubmit={handleSubmitManualReport} className="bg-slate-50 dark:bg-slate-950/40 p-5 rounded-2xl border dark:border-slate-800/80 space-y-4 shadow-sm animate-in slide-in-from-bottom-3">
                  <div className="flex items-center gap-2 select-none border-b pb-3 border-dashed dark:border-slate-800">
                    <span className="h-7 w-7 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 flex items-center justify-center">
                      <Zap className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-400 block leading-none uppercase">Mobile Money Payment Details</span>
                      <span className="text-[10px] text-gray-400">Please enter actual sender details and SMS text.</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Your MoMo/Airtel Registered Phone Number"
                      placeholder="e.g. 078XXXXXXX"
                      required
                      value={momoPhoneNumber}
                      onChange={(e) => setMomoPhoneNumber(e.target.value)}
                      id="input-momo-subscriber-phone"
                    />
                    <Input
                      label="Sender's Registered Full Name"
                      placeholder="e.g. Jean Pierre Nsanzimana"
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
                      className="w-full text-xs rounded-lg border bg-white dark:bg-slate-950 border-gray-300 dark:border-slate-800 p-2.5 outline-none focus:ring-1 focus:ring-emerald-700 text-stone-800 dark:text-stone-100 font-mono"
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
                      className="w-full text-xs rounded-lg border bg-white dark:bg-slate-950 border-gray-300 dark:border-slate-800 p-2.5 outline-none focus:ring-1 focus:ring-emerald-700 text-stone-800 dark:text-stone-100"
                      id="input-manual-momo-note"
                    />
                  </div>

                  <Button type="submit" className="w-full bg-[#15803D] hover:bg-emerald-800 text-white font-extrabold py-2.5 rounded-xl transition" id="btn-submit-momo-manual-report">
                    Submit Mobile Money Payment Report
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleSubmitManualReport} className="bg-slate-50 dark:bg-slate-950/40 p-5 rounded-2xl border dark:border-slate-800/80 space-y-4 shadow-sm animate-in slide-in-from-bottom-3">
                  <div className="flex items-center gap-2 select-none border-b pb-3 border-dashed dark:border-slate-800">
                    <span className="h-7 w-7 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 flex items-center justify-center">
                      <Coins className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <span className="text-[10px] font-black text-amber-800 dark:text-amber-400 block leading-none uppercase">Hand Cash Submission</span>
                      <span className="text-[10px] text-gray-400">Confirm the member payer name and officer cashier recipient.</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Payer Member Name"
                      placeholder="e.g. Jean Pierre Nsanzimana"
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
                      className="w-full text-xs rounded-lg border bg-white dark:bg-slate-950 border-gray-300 dark:border-slate-800 p-2.5 outline-none focus:ring-1 focus:ring-emerald-700 text-stone-800 dark:text-stone-100"
                      id="input-manual-cash-note"
                    />
                  </div>

                  <Button type="submit" className="w-full bg-[#15803D] hover:bg-emerald-800 text-white font-extrabold py-2.5 rounded-xl transition" id="btn-submit-cash-report">
                    Submit Hand Cash Payment Report
                  </Button>
                </form>
              )}
            </div>

            <div className="p-4 bg-gray-50 dark:bg-slate-950 border-t flex justify-end">
              <Button variant="outline" onClick={() => setSelectedFeeToPay(null)} id="btn-cancel-payment-panel">
                Close Panel
              </Button>
            </div>
          </div>
        </div>
      )}



      {/* Admin Review / Resolve Payment Report Modal */}
      {reviewingFee && (
        <div className="fixed inset-0 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in" id="admin-review-modal">
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="px-5 py-4 bg-slate-100 dark:bg-slate-950 border-b dark:border-slate-850 flex items-center justify-between select-none">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-black text-amber-600 tracking-wider">Pending Slip Verification</span>
                <span className="font-extrabold text-sm text-stone-900 dark:text-white mt-0.5">Audit reported member check-in</span>
              </div>
              <button 
                onClick={() => setReviewingFee(null)}
                className="text-gray-400 hover:text-stone-900 dark:hover:text-white"
                id="btn-close-review-modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
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

      {/* Edit Fee Modal */}
      {editingFee && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in" id="edit-fee-modal">
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl shadow-lg w-full max-w-md p-6 relative">
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
      {deletingFee && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in" id="delete-fee-modal">
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl shadow-lg w-full max-w-sm p-6 relative">
            <div className="h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="h-6 w-6" />
            </div>
            <h2 className="text-base font-bold text-stone-900 dark:text-white text-center mb-1">
              Delete Member Due?
            </h2>
            <p className="text-xs text-stone-600 dark:text-slate-300 text-center mb-5">
              Are you sure you want to remove this charge of <span className="font-mono font-bold text-stone-900 dark:text-white">{deletingFee.amount.toLocaleString()} RWF</span> for <span className="font-bold text-stone-900 dark:text-white">{deletingFee.member_name || "Member"}</span>? This action cannot be undone.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeletingFee(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center justify-center gap-1.5"
                onClick={handleConfirmDeleteFee}
                id="btn-confirm-delete-fee"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
