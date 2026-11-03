import { GoalsPage } from "./goals";
import { WaitRoomView } from "../components/WaitRoomView";
import { DynamicAttendanceGrid } from "../components/DynamicAttendanceGrid";
import { EventScheduleCalendar } from "../components/EventScheduleCalendar";
import { ChatVideoMeetModal } from "../components/ChatVideoMeetModal";

import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useLocalTranslation } from "../locales/additional-translations";
import { PlanGatedView } from "../components/PlanGatedView";
import { PollMessageComponent } from "../components/PollMessageComponent";
import {
  CalendarDays,
  Target,
  Megaphone,
  Briefcase,
  Layers,
  Award,
  Wallet,
  Users,
  MessageSquare,
  MessageCircle,
  Sprout,
  Building,
  Smile,
  Search,
  Plus,
  Send,
  Pin,
  FolderDot,
  CheckSquare,
  FileCheck2,
  Trash2,
  Edit,
  ThumbsUp,
  FileSpreadsheet,
  LayoutGrid,
  FileText,
  PieChart,
  BarChart3,
  HelpCircle,
  Clock,
  History,
  Mic,
  Paperclip,
  Volume2,
  ShieldAlert,
  FileSignature,
  Fingerprint,
  UserCheck,
  Inbox,
  Lock,
  Unlock,
  Globe,
  CheckCircle,
  Download,
  ExternalLink,
  AlertTriangle,
  AlertCircle,
  Info,
  PlusCircle,
  Image,
  QrCode,
  KeyRound,
  Coins,
  ShoppingBag,
  FolderOpen,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Activity,
  Share2,
  UserPlus,
  ArrowLeft,
  Eye,
  Phone,
  Bell,
  Video
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useOrgStore } from "../store/orgStore";
import { useCurrencyStore } from "../store/currencyStore";
import { OrganizationVerificationModal } from "../components/OrganizationVerificationModal";
import { Goal, GoalTask, Event as ImpactEvent, EventTask, NewsPost, Meeting, ChatChannel, Document } from "../types";
import { RealtimeTaskCountdown } from "../components/RealtimeTaskCountdown";
import {
  useEvents,
  useUpdateEvent,
  useDeleteEvent,
  useGoals,
  useNews,
  useMeetings,
  useChatChannels,
  useChatMessages,
  useSendChatMessage,
  useCreateEvent,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  useUpdateGoalProgress,
  useCreateMeeting,
  useUpdateMeeting,
  useCreatePost,
  useUpdatePost,
  useDeletePost,
  useMembers,
  // V2 Addons Hook list
  useCreateChannel,
  usePollMessages,
  useCreatePoll,
  useVoteInPoll,
  usePollResponses,
  useAllPollResponses,
  useDonations,
  useMemberFees,
  useUpdateMemberFeeStatus,
  useActivityLogs,
  useActivityAttendance,
  useSubmitActivityLog,
  useMessageTemplates,
  useSubmitMessageTemplate,
  useDeleteMessageTemplate,
  useBroadcastNotification,
  useEventRSVPs,
  useSubmitRSVP,
  useEventWaitlist,
  useJoinEventWaitlist,
  useIdentityVerifications,
  useSubmitIdentityVerification,
  useReviewIdentityVerification,
  useV2Documents,
  useSubmitDocument,
  useUpdateDocument,
  useDeleteDocument,
  useDocumentAcknowledgements,
  useAcknowledgeDocument,
  useResignations,
  useSubmitResignation,
  useFinalizeResignation,
  useAuditLogs,
  useEventAttendance,
  useAllEventAttendance,
  useCheckIn,
  useCheckOut,
  useMeetingAttendance,
  useSaveMeetingAttendance
} from "../hooks/useImpactoData";
import { Button, Input, Card, Badge, Avatar, ProgressBar, EmptyState, Modal, Table } from "../components/ui";
import { MockDB } from "../lib/mockData";
import { canAccessFeature, getOrgSubscriptionLifecycle, ADDON_PACKAGES } from "../lib/subscriptionMatrix";

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { useToast } from "../components/Toast";
import { DocumentOffice } from "../components/DocumentOffice";
import { CertificateBadgeBuilderModal } from "../components/CertificateBadgeBuilderModal";
import { uploadFileToSupabase, resolveFileUrl } from "../lib/storageService";
import { ResolvedImage, ResolvedAudio, ResolvedDownloadLink } from "../components/ResolvedMedia";

interface PendingFeeCardProps {
  fee: any;
  activeOrgId: string;
  onSuccess: (msg: string, type: "success" | "info" | "error") => void;
  updateFeeStatusMutation: any;
}

const AdminPendingFeeCard: React.FC<PendingFeeCardProps> = ({
  fee,
  activeOrgId,
  onSuccess,
  updateFeeStatusMutation,
}) => {
  const [rejectionNote, setRejectionNote] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  return (
    <div className="bg-white dark:bg-slate-900 border dark:border-slate-800/60 p-4 rounded-xl flex flex-col justify-between gap-3 shadow-3xs" id={`admin-pending-fee-card-${fee.id}`}>
      <div>
        <div className="flex justify-between items-start gap-2">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-stone-900 dark:text-white">
              {fee.member_name}
            </span>
            <span className="text-[10px] text-gray-400 font-medium">
              Period: {fee.payment_period} ({fee.period_date})
            </span>
          </div>
          <span className="font-extrabold text-xs text-stone-900 dark:text-white font-mono">
            {fee.amount.toLocaleString()} RWF
          </span>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border dark:border-slate-850 text-[11px] space-y-1.5 mt-2.5 font-sans leading-normal">
          <div className="flex justify-between font-bold text-gray-600 dark:text-gray-300">
            <span>{fee.status === "pending_confirmation" ? `Reported via ${fee.paid_by_method || "Payment Slip"}` : `Unpaid Dues (${fee.paid_by_method || "Direct Settle"})`}</span>
            {fee.transaction_reference && (
              <span className="font-mono">Ref: {fee.transaction_reference}</span>
            )}
          </div>
          {fee.sender_info && (
            <p className="text-[10px] text-stone-600 dark:text-slate-350">
              <strong className="text-gray-700 dark:text-slate-350">Sender Details:</strong> {fee.sender_info}
            </p>
          )}
          {fee.report_note && (
            <div className="text-[10px] text-stone-600 dark:text-slate-350 whitespace-pre-wrap font-mono max-h-24 overflow-y-auto bg-white dark:bg-slate-900/40 p-2 rounded border dark:border-slate-850">
              {fee.report_note}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {showRejectForm ? (
          <div className="space-y-1.5 animate-in slide-in-from-top-2">
            <textarea
              placeholder="Provide a brief reason for rejection..."
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              className="w-full text-xs rounded border bg-white dark:bg-slate-950 border-gray-300 dark:border-slate-800 p-2 outline-none focus:ring-1 focus:ring-rose-500 text-stone-800 dark:text-stone-100"
              rows={2}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowRejectForm(false)}
                className="px-2.5 py-1 text-[10px] font-bold text-gray-500 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!rejectionNote.trim()) {
                    onSuccess("Please provide a rejection note.", "error");
                    return;
                  }
                  try {
                    await updateFeeStatusMutation.mutateAsync({
                      id: fee.id,
                      org_id: activeOrgId,
                      member_id: fee.member_id,
                      amount: fee.amount,
                      payment_period: fee.payment_period,
                      period_date: fee.period_date,
                      status: "pending",
                      admin_note: rejectionNote,
                      transaction_reference: `REJECTED: ${fee.transaction_reference || "No Ref"}`,
                      report_note: `Rejection justification: ${rejectionNote}`
                    });
                    onSuccess("Payment report has been rejected and invoice reset back to unpaid pending status.", "info");
                  } catch (err) {
                    onSuccess("Failed to reject payment.", "error");
                  }
                }}
                className="px-3 py-1 text-[10px] font-black bg-rose-600 text-white hover:bg-rose-700 rounded"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setShowRejectForm(true)}
              className="flex-1 py-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 hover:bg-rose-100 text-[11px] font-bold rounded-lg transition"
            >
              Decline / Reject
            </button>
            <button
              onClick={async () => {
                try {
                  await updateFeeStatusMutation.mutateAsync({
                    id: fee.id,
                    org_id: activeOrgId,
                    member_id: fee.member_id,
                    amount: fee.amount,
                    payment_period: fee.payment_period,
                    period_date: fee.period_date,
                    status: "paid",
                    paid_at: new Date().toISOString(),
                    admin_note: "Approved by supervisor on dashboard"
                  });
                  onSuccess("Payment reported verified successfully!", "success");
                } catch (err) {
                  onSuccess("Failed to verify payment.", "error");
                }
              }}
              className="flex-1 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-black rounded-lg transition"
            >
              Verify & Approve
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 1. CORE ACCREDITED DASHBOARD HOME
// ==========================================
export const DashboardHome: React.FC = () => {
  const { t } = useLocalTranslation();
  const { user } = useAuthStore();
  const { activeOrg, activeMember } = useOrgStore();

  // If non-admin user is in pending or rejected status, display the Wait Room
  if (!user?.is_superadmin && (activeMember?.role as string) !== "org_admin") {
    if (
      activeMember?.status === "pending" ||
      (activeMember?.status as string) === "awaiting_approval" ||
      activeMember?.status === "rejected"
    ) {
      return <WaitRoomView />;
    }
  }

  const typedMember = activeMember as any;
  const isAdmin = activeMember?.role === "org_admin" || activeMember?.role === "manager" || activeMember?.role === "accountant";
  const isAccountant = activeMember?.role === "accountant";
  const { formatAmount } = useCurrencyStore();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [pendingPwResetCount, setPendingPwResetCount] = useState(0);

  useEffect(() => {
    if (!activeOrg?.id || !isAdmin) return;
    async function checkResets() {
      try {
        const res = await fetch(`/api/auth/password-reset-requests?orgId=${activeOrg.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.requests) {
            const pending = data.requests.filter((r: any) => r.status === "pending");
            setPendingPwResetCount(pending.length);
          }
        } else if (isSupabaseConfigured) {
          const { data, error } = await supabase
            .from("password_reset_requests")
            .select("id")
            .eq("org_id", activeOrg.id)
            .eq("status", "pending");
          if (!error && data) {
            setPendingPwResetCount(data.length);
          }
        }
      } catch (e) {
        console.warn("Failed to check pending password resets:", e);
      }
    }
    checkResets();
  }, [activeOrg?.id, isAdmin]);

  const { data: events, refetch: refetchEvents } = useEvents(activeOrg?.id);
  const updateEventMutation = useUpdateEvent();
  const { data: goals } = useGoals(activeOrg?.id);
  const { data: news } = useNews(activeOrg?.id);
  const { data: members } = useMembers(activeOrg?.id);
  const [openOrgVerifyModal, setOpenOrgVerifyModal] = useState(false);
  const [remindedOfficers, setRemindedOfficers] = useState<Record<string, boolean>>({});
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskProgressVal, setTaskProgressVal] = useState<number>(0);
  const [taskReportText, setTaskReportText] = useState<string>("");

  const isRegularMember = activeMember?.role === "member";
  const isOrgAdmin = activeMember?.role === "org_admin" || activeMember?.role === "superadmin" || user?.is_superadmin;

  const handleRemindOfficer = (officer: any) => {
    const name = officer.user?.full_name || (officer as any).name || "Officer";
    const phone = officer.phone_number || officer.user?.phone_number || "on record";
    setRemindedOfficers((prev) => ({ ...prev, [officer.id]: true }));
    addToast(`Verification document reminder alert dispatched to ${name} (${phone})!`, "success");
  };

  const handleRemindAllOfficers = (pendingOfficers: any[]) => {
    const newMap = { ...remindedOfficers };
    pendingOfficers.forEach((o) => {
      newMap[o.id] = true;
    });
    setRemindedOfficers(newMap);
    addToast(`Dispatched batch verification reminders to ${pendingOfficers.length} pending officers!`, "success");
  };

  const { data: fees } = useMemberFees(activeOrg?.id);
  const { data: meetings, refetch: refetchMeetings } = useMeetings(activeOrg?.id);
  const checkInMutation = useCheckIn();
  const saveMeetingAttendance = useSaveMeetingAttendance();

  // Compute pending broadcasted online confirmations
  const pendingOnlineConfirmations = React.useMemo(() => {
    if (!activeMember) return [];
    const list: Array<{
      id: string;
      title: string;
      type: "meeting" | "event";
      date_time: string;
    }> = [];

    // Check meetings
    if (meetings) {
      meetings.forEach((m) => {
        const isPassed = new Date(m.date_time) < new Date();
        if (m.location_type === "online" && m.is_broadcasted && !isPassed) {
          const checkedInIds = JSON.parse(localStorage.getItem(`meet_attn_${m.id}`) || "[]");
          if (!checkedInIds.includes(activeMember.id)) {
            list.push({
              id: m.id,
              title: m.title,
              type: "meeting",
              date_time: m.date_time
            });
          }
        }
      });
    }

    // Check events
    if (events) {
      events.forEach((e) => {
        const isPassed = new Date(e.date_time) < new Date();
        if (e.location_type === "online" && e.is_broadcasted && !isPassed) {
          const checkedIn = localStorage.getItem(`event_att_detail_${e.id}_${activeMember.id}`);
          if (!checkedIn) {
            list.push({
              id: e.id,
              title: e.title,
              type: "event",
              date_time: e.date_time
            });
          }
        }
      });
    }

    return list;
  }, [meetings, events, activeMember]);

  const handleConfirmOnlineAttendance = async (item: { id: string; title: string; type: "meeting" | "event" }) => {
    if (!activeMember) return;
    try {
      if (item.type === "event") {
        await checkInMutation.mutateAsync({
          event_id: item.id,
          member_id: activeMember.id,
          method: "online_confirm",
          status: "present"
        });
      } else {
        const key = `meet_attn_${item.id}`;
        const currentList = JSON.parse(localStorage.getItem(key) || "[]");
        if (!currentList.includes(activeMember.id)) {
          currentList.push(activeMember.id);
        }
        localStorage.setItem(key, JSON.stringify(currentList));

        // Save detailed local logs
        localStorage.setItem(`meet_att_detail_${item.id}_${activeMember.id}`, JSON.stringify({
          status: "present",
          check_in_method: "online_confirm",
          check_in_time: new Date().toISOString()
        }));

        await saveMeetingAttendance.mutateAsync({
          meetingId: item.id,
          memberIds: currentList
        });
      }
      addToast("Your online attendance has been successfully confirmed and logged!", "success");
      if (refetchMeetings) refetchMeetings();
    } catch (err) {
      addToast("Failed to record online attendance.", "error");
    }
  };

  const updateFeeStatusMutation = useUpdateMemberFeeStatus();

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

  // Comprehensive helper to match fee to current user across multiple identifiers
  const isFeeForMe = React.useCallback((f: any) => {
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
  }, [myMemberIds, user]);

  const myPendingDues = React.useMemo(() => {
    if (!fees) return [];
    return fees.filter((f) => f.status === "pending" && isFeeForMe(f));
  }, [fees, isFeeForMe]);

  const myAwaitingConfirmationDues = React.useMemo(() => {
    if (!fees) return [];
    return fees.filter((f) => f.status === "pending_confirmation" && isFeeForMe(f));
  }, [fees, isFeeForMe]);

  const adminPendingConfirmationDues = React.useMemo(() => {
    const roleStr = (activeMember?.role as string) || "";
    const isAccountant = roleStr === "accountant" || roleStr === "org_admin" || roleStr === "admin" || roleStr === "president" || roleStr === "treasurer" || roleStr === "manager" || !!user?.is_superadmin;
    if (!fees || !isAccountant) return [];
    return fees.filter((f) => f.status === "pending_confirmation" || f.status === "pending");
  }, [fees, activeMember, user]);

  // Tasks assigned to the logged-in member across all events
  const myAssignedTasks = React.useMemo(() => {
    if (!events) return [];
    const list: Array<{
      task: EventTask;
      event: ImpactEvent;
    }> = [];

    events.forEach((ev) => {
      let evTasks: EventTask[] = ev.tasks || [];
      if (!evTasks || evTasks.length === 0) {
        try {
          const local = localStorage.getItem(`event_tasks_${ev.id}`);
          if (local) evTasks = JSON.parse(local);
        } catch (e) {}
      }

      if (evTasks && Array.isArray(evTasks)) {
        evTasks.forEach((t) => {
          const isAssigned =
            (activeMember?.id && t.assigned_to_member_id === activeMember.id) ||
            (user?.id && t.assigned_to_member_id === user.id) ||
            myMemberIds.has(t.assigned_to_member_id) ||
            (user?.full_name && t.assigned_to_name && t.assigned_to_name.toLowerCase().trim() === user.full_name.toLowerCase().trim());

          if (isAssigned) {
            list.push({ task: t, event: ev });
          }
        });
      }
    });

    return list;
  }, [events, activeMember, user, myMemberIds]);

  const handleSaveMemberTaskProgress = async (ev: ImpactEvent, targetTask: EventTask) => {
    let evTasks: EventTask[] = ev.tasks ? [...ev.tasks] : [];
    if (evTasks.length === 0) {
      try {
        const local = localStorage.getItem(`event_tasks_${ev.id}`);
        if (local) evTasks = JSON.parse(local);
      } catch (e) {}
    }

    const updatedTasks = evTasks.map((t) => {
      if (t.id === targetTask.id) {
        return {
          ...t,
          progress: taskProgressVal,
          status: (taskProgressVal >= 100 ? "completed" : taskProgressVal > 0 ? "in_progress" : "pending") as "pending" | "in_progress" | "completed",
          performance_report: taskReportText.trim() || t.performance_report,
          reported_at: new Date().toISOString()
        };
      }
      return t;
    });

    const overall_progress = updatedTasks.length > 0
      ? Math.round(updatedTasks.reduce((sum, item) => sum + (item.progress || 0), 0) / updatedTasks.length)
      : 0;

    localStorage.setItem(`event_tasks_${ev.id}`, JSON.stringify(updatedTasks));
    try {
      const allOrgTasks = JSON.parse(localStorage.getItem(`all_event_tasks_${activeOrg?.id}`) || "{}");
      allOrgTasks[ev.id] = updatedTasks;
      localStorage.setItem(`all_event_tasks_${activeOrg?.id}`, JSON.stringify(allOrgTasks));
    } catch (e) {}

    try {
      await updateEventMutation.mutateAsync({
        id: ev.id,
        org_id: activeOrg?.id || "",
        title: ev.title,
        date_time: ev.date_time,
        location: ev.location,
        tasks: updatedTasks,
        overall_progress
      });
      addToast(`Task progress saved at ${taskProgressVal}%. Event overall progress is now ${overall_progress}%!`, "success");
      setEditingTaskId(null);
      if (refetchEvents) refetchEvents();
    } catch (err: any) {
      addToast(`Progress recorded at ${taskProgressVal}%.`, "success");
      setEditingTaskId(null);
      if (refetchEvents) refetchEvents();
    }
  };

  // V2 Trust & Offboarding Mutations
  const submitIdentity = useSubmitIdentityVerification();
  const submitResign = useSubmitResignation();

  const [openVerifyModal, setOpenVerifyModal] = useState(false);
  const [docType, setDocType] = useState("National Identification Card");
  const [docUrl, setDocUrl] = useState("https://impacto.rw/uploads/doc_identity_verified.pdf");

  const [openResignModal, setOpenResignModal] = useState(false);
  const [resignCategory, setResignCategory] = useState("Relocation or Resettlement");
  const [resignDetail, setResignDetail] = useState("");

  // B2 S3 Real voice recording references and state
  const chunksRef = useRef<Blob[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handlePlayVoice = async (fileUrl: string | undefined) => {
    if (!fileUrl) return;
    try {
      const url = await resolveFileUrl(fileUrl);
      if (url) {
        const audio = new Audio(url);
        audio.play();
        addToast({
          title: "Audio Playback",
          message: "Playing recorded voice report from Supabase Storage...",
          type: "info"
        } as any);
      }
    } catch (err) {
      console.error("Playback failed:", err);
    }
  };


  const { data: v2Documents } = useV2Documents(activeOrg?.id);

  // Filter documents strictly according to cooperative accessibility:
  // - Admins/managers/accountants have full visibility across all files
  // - The creator/author always has access to their own files
  // - Members explicitly specified in recipient_member_ids can access the shared private file/letter
  // - Public non-letter documents are visible to all members
  const accessibleDocs = React.useMemo(() => {
    if (!v2Documents) return [];
    return v2Documents.filter((doc) => {
      if (isAdmin) return true;
      const isCreator =
        doc.uploaded_by === user?.id ||
        doc.uploaded_by === activeMember?.id ||
        (user?.email && doc.uploaded_by === user.email) ||
        (activeMember?.user_id && doc.uploaded_by === activeMember.user_id) ||
        (user?.full_name && doc.uploader_name === user.full_name);
      if (isCreator) return true;

      const isRecipient =
        (activeMember?.id && doc.recipient_member_ids?.includes(activeMember.id)) ||
        (activeMember?.user_id && doc.recipient_member_ids?.includes(activeMember.user_id));
      if (isRecipient) return true;

      if (doc.is_private || doc.is_letter) {
        return false;
      }
      return true;
    });
  }, [v2Documents, isAdmin, user?.id, user?.email, user?.full_name, activeMember?.id, activeMember?.user_id]);

  const pinnedGoals = goals?.filter((g) => g.is_pinned) || [];
  const displayGoals = pinnedGoals.length > 0 ? pinnedGoals : (goals?.slice(0, 3) || []);

  const myAssignedGoalTasks = React.useMemo(() => {
    if (!goals || !activeMember?.id) return [];
    const list: { goal: Goal; task: GoalTask }[] = [];
    goals.forEach((g) => {
      (g.tasks || []).forEach((t) => {
        if (t.assigned_to_member_id === activeMember.id) {
          list.push({ goal: g, task: t });
        }
      });
    });
    return list;
  }, [goals, activeMember?.id]);
  const activeEvents = events?.slice(0, 3) || [];
  const activeNews = news?.slice(0, 3) || [];
  const recentDocs = accessibleDocs.slice(0, 4);

  // 1. Unified 7-Day Workspace Schedule Radar (Events + Meetings)
  const upcomingSchedule = React.useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      type: "meeting" | "event";
      date_time: string;
      location_type?: string;
      venue?: string;
      status?: string;
      isPassed: boolean;
    }> = [];

    if (meetings) {
      meetings.forEach((m) => {
        const isPassed = new Date(m.date_time) < new Date();
        list.push({
          id: m.id,
          title: m.title,
          type: "meeting",
          date_time: m.date_time,
          location_type: m.location_type || "in_person",
          venue: m.location_type === "online" ? "Virtual Meeting" : ((m as any).venue || (m as any).location || "Main Cooperative Hall"),
          status: m.status || (isPassed ? "completed" : "scheduled"),
          isPassed
        });
      });
    }

    if (events) {
      events.forEach((e) => {
        const isPassed = new Date(e.date_time) < new Date();
        list.push({
          id: e.id,
          title: e.title,
          type: "event",
          date_time: e.date_time,
          location_type: e.location_type || "in_person",
          venue: e.location || (e.location_type === "online" ? "Virtual Stream" : "Field Location"),
          status: e.status || (isPassed ? "completed" : "scheduled"),
          isPassed
        });
      });
    }

    return list.sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime());
  }, [meetings, events]);

  const nextUpcomingItems = upcomingSchedule.filter(item => !item.isPassed).slice(0, 4);

  // 2. Financial Health & Dues Standing
  const financialStats = React.useMemo(() => {
    if (!fees) return { totalInvoiced: 0, totalPaid: 0, collectionRate: 100, pendingCount: 0, pendingReviewCount: 0 };
    const totalInvoiced = fees.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
    const totalPaid = fees.filter(f => f.status === "paid").reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
    const pendingCount = fees.filter(f => f.status === "pending").length;
    const pendingReviewCount = fees.filter(f => f.status === "pending_confirmation").length;
    const collectionRate = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 100;
    return { totalInvoiced, totalPaid, collectionRate, pendingCount, pendingReviewCount };
  }, [fees]);

  const myFeeStats = React.useMemo(() => {
    const myPaidList = (fees || []).filter(f => f.status === "paid" && isFeeForMe(f));
    const myPaidTotal = myPaidList.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
    const myPendingTotal = myPendingDues.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
    const isGoodStanding = myPendingDues.length === 0;
    return { myPaidTotal, myPendingTotal, isGoodStanding, paidCount: myPaidList.length };
  }, [fees, isFeeForMe, myPendingDues]);

  // 3. Organization Goal Metrics
  const goalsOverview = React.useMemo(() => {
    if (!goals || goals.length === 0) return { count: 0, averageProgress: 0 };
    const totalPct = goals.reduce((acc, g) => acc + Math.min(100, Math.round((g.current_progress / (g.target || 1)) * 100)), 0);
    const averageProgress = Math.round(totalPct / goals.length);
    return { count: goals.length, averageProgress };
  }, [goals]);

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMember || !activeOrg) return;

    try {
      await submitIdentity.mutateAsync({
        member_id: activeMember.id,
        org_id: activeOrg.id,
        document_type: docType,
        document_url: docUrl,
        userId: user?.id || ""
      });
      setOpenVerifyModal(false);
      addToast("Verification document uploaded successfully! Admins have been notified.", "success");
    } catch (err) {
      console.error(err);
    }
  };

  const handleResignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMember || !activeOrg) return;

    try {
      await submitResign.mutateAsync({
        member_id: activeMember.id,
        org_id: activeOrg.id,
        reason_category: resignCategory,
        reason_detail: resignDetail,
        userId: user?.id || ""
      });
      setOpenResignModal(false);
      addToast("Exit Survey recorded. Your cooperative resignation log is finalized.", "success");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-8 select-none font-sans">
      {/* Dynamic Welcome Heading */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-display leading-none tracking-tight text-gray-905 dark:text-white flex items-center">
            {t("dashboard_labels.welcome_title")} {user?.full_name?.split(" ")[0] || "User"}!
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-1 dark:text-slate-400 font-medium">
            {t("dashboard_labels.welcome_subtitle", { orgName: activeOrg?.name || "your" })}
          </p>
        </div>
        {activeOrg?.subscription_status === "trial" && (
          <div className="px-4 py-2.5 bg-amber-550/10 border border-amber-500/20 text-amber-800 dark:text-amber-400 rounded-xl text-xs font-semibold leading-normal flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
            {t("dashboard_labels.active_trial")} {activeOrg?.subscription_ends_at ? new Date(activeOrg.subscription_ends_at).toLocaleDateString() : ""}
          </div>
        )}
      </div>



      {/* High priority fee warning barrier */}
      {myPendingDues.length > 0 && (
        <div className="bg-red-50 dark:bg-rose-950/20 border-l-4 border-rose-600 p-4.5 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm shrink-0" id="dashboard-due-fees-reminder">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="font-extrabold text-[10px] uppercase tracking-wider text-rose-800 dark:text-rose-450">{t("URGENT REMINDER")}: {t("OUTSTANDING BALANCE DETECTED")}</span>
              <p className="text-xs text-stone-900 dark:text-slate-100 font-extrabold mt-1">
                {activeOrg?.fee_notification || "Cooperative dues have been invoiced for your membership account."}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5 leading-normal font-semibold">
                {t("You have")} <span className="font-black text-rose-600">{myPendingDues.length} {t("pending micro-payment invoices")}</span> ({formatAmount(myFeeStats.myPendingTotal)}) {t("awaiting settlement. Keep your active status in green compliance by clearing them.")}
              </p>
            </div>
          </div>
          <button 
            type="button"
            className="self-start md:self-center bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 shrink-0 transition cursor-pointer"
            onClick={() => navigate("/dashboard/fees")}
          >
            {t("btn_pay_now_direct", "Pay My Dues")} →
          </button>
        </div>
      )}

      {/* Active Online Attendance Broadcast Alerts for Members */}
      {pendingOnlineConfirmations.length > 0 && (
        <div className="flex flex-col gap-3 shrink-0" id="online-attendance-broadcasts">
          {pendingOnlineConfirmations.map((item) => (
            <div 
              key={item.id} 
              className="bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-600 p-4.5 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm animate-pulse"
            >
              <div className="flex items-start gap-3">
                <Megaphone className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="font-extrabold text-[10px] uppercase tracking-wider text-blue-800 dark:text-blue-450">
                    📢 ACTIVE VIRTUAL ATTENDANCE BROADCAST
                  </span>
                  <p className="text-xs text-stone-900 dark:text-slate-100 font-extrabold mt-1">
                    Please confirm your attendance presence for the scheduled online session:{" "}
                    <span className="text-blue-700 dark:text-blue-400 font-black">"{item.title}"</span>
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-normal font-semibold">
                    The session admin has broadcasted an active attendance alert. Confirming your presence logs you on the register.
                  </p>
                </div>
              </div>
              <button 
                type="button"
                className="self-start sm:self-center bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shrink-0 transition cursor-pointer font-sans"
                onClick={() => handleConfirmOnlineAttendance(item)}
              >
                Confirm My Attendance ✔
              </button>
            </div>
          ))}
        </div>
      )}



      {/* Administrator Pending Password Reset Override Banner */}
      {isAdmin && pendingPwResetCount > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 p-4.5 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm shrink-0">
          <div className="flex items-start gap-3">
            <KeyRound className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="font-extrabold text-[10px] uppercase tracking-wider text-amber-800 dark:text-amber-400">
                🔑 WORKSPACE ADMINISTRATOR ALERT: PASSWORD RESET REQUEST
              </span>
              <p className="text-xs text-stone-900 dark:text-slate-100 font-extrabold mt-1">
                You have {pendingPwResetCount} pending password reset override request{pendingPwResetCount > 1 ? "s" : ""} awaiting your administrator approval.
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5 leading-normal font-semibold">
                Members can request password resets directly from the sign-in screen without relying on external email reset links.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="self-start md:self-center bg-amber-500 hover:bg-amber-600 text-stone-950 font-black px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shrink-0 transition cursor-pointer"
            onClick={() => navigate("/dashboard/members?tab=pw_resets")}
          >
            Review & Approve Password Resets →
          </button>
        </div>
      )}

      {/* Member Reported Payment Confirmation Status Block */}
      {!isAccountant && myAwaitingConfirmationDues.length > 0 && (
        <div className="bg-amber-50/50 dark:bg-amber-950/20 border-l-4 border-amber-500 p-4.5 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm shrink-0" id="member-momo-confirmation-status">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
            <div className="flex flex-col">
              <span className="font-extrabold text-[10px] uppercase tracking-wider text-amber-800 dark:text-amber-400">
                ⌛ {t("PAYMENT UNDER REVIEW")}
              </span>
              <p className="text-xs text-stone-900 dark:text-slate-100 font-extrabold mt-1">
                You have {myAwaitingConfirmationDues.length} payment {myAwaitingConfirmationDues.length === 1 ? 'report' : 'reports'} awaiting supervisor verification.
              </p>
              <div className="text-[10px] text-gray-500 mt-1.5 space-y-1 bg-white dark:bg-slate-900 p-3 rounded-xl border dark:border-slate-800">
                {myAwaitingConfirmationDues.map((f) => (
                  <div key={f.id} className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-gray-700 dark:text-slate-300">{f.payment_period} - {f.period_date} ({f.amount.toLocaleString()} RWF)</span>
                    <span className="bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 text-amber-800 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">
                      Reported via {f.paid_by_method}
                    </span>
                    {f.transaction_reference && (
                      <span className="font-mono text-gray-400">Ref: {f.transaction_reference}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button 
            type="button"
            className="self-start sm:self-center bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 shrink-0 transition cursor-pointer"
            onClick={() => navigate("/dashboard/fees")}
          >
            Check Account Statement →
          </button>
        </div>
      )}

      {/* Organization Authenticity Status & Verification Card */}
      {activeOrg && (
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs transition ${
            activeOrg.verification_status === "verified"
              ? "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60"
              : activeOrg.verification_status === "pending_review"
              ? "bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60"
              : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                activeOrg.verification_status === "verified"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                  : activeOrg.verification_status === "pending_review"
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                  : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {activeOrg.verification_status === "verified" ? (
                <CheckCircle2 className="h-5 w-5 fill-emerald-500 text-white dark:fill-emerald-400 dark:text-slate-900" />
              ) : activeOrg.verification_status === "pending_review" ? (
                <Clock className="h-5 w-5 animate-pulse text-amber-600 dark:text-amber-400" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Organization Status:
                </span>
                {activeOrg.verification_status === "verified" ? (
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Verified Organization
                  </span>
                ) : activeOrg.verification_status === "pending_review" ? (
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-500 animate-pulse shrink-0" /> Pending Audit
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" /> Unverified
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 max-w-2xl">
                {activeOrg.verification_status === "verified"
                  ? `Official Green Tick active and published. Authenticity verified by platform audit (${activeOrg.verified_by || "Platform Auditor"}).`
                  : activeOrg.verification_status === "pending_review"
                  ? "All required leadership documents submitted. Awaiting system verification by Super Admin."
                  : isRegularMember
                  ? "This organization is currently unverified. Only organization administrators and governance officers are required to submit verification documents."
                  : "Action Required: As a leadership officer, please independently submit your passport photo, National ID/Passport, and telephone number to obtain the Green Tick."}
              </p>
            </div>
          </div>

          {/* Regular members only see the status card with no pop-up button. Officers & Admins get the modal action */}
          {!isRegularMember && (
            <Button
              size="sm"
              onClick={() => setOpenOrgVerifyModal(true)}
              className={`text-xs font-bold py-2 px-3.5 shrink-0 self-start sm:self-center ${
                activeOrg.verification_status === "verified"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : activeOrg.verification_status === "pending_review"
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white"
              }`}
            >
              {activeOrg.verification_status === "verified"
                ? "View Verification Dossier"
                : activeOrg.verification_status === "pending_review"
                ? "Check Audit Status"
                : isOrgAdmin
                ? "Manage Verification & Dossier →"
                : "Submit My Verification Documents →"}
            </Button>
          )}
        </div>
      )}

      {/* Admin Exclusive: Leadership Officers Verification Progress & Reminders Checklist */}
      {isOrgAdmin && activeOrg && activeOrg.verification_status !== "verified" && (() => {
        const officerMembers = (members || []).filter((m) => m.role !== "member");
        const missingOfficers = officerMembers.filter((m) => !m.passport_photo_url || !m.id_document_url);
        const submittedOfficers = officerMembers.filter((m) => !!m.passport_photo_url && !!m.id_document_url);
        const requiredTotal = Math.max(officerMembers.length, 2);
        const progressPercent = Math.min(100, Math.round((submittedOfficers.length / requiredTotal) * 100));

        return (
          <div className="p-4 sm:p-5 rounded-2xl border bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-800/60 shadow-xs flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3.5 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Leadership Verification Roster & Reminders
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40">
                      Admin Exclusive View
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Missing documents from any leadership officer prevent the organization from getting verified. Remind pending officers below.
                  </p>
                </div>
              </div>

              {missingOfficers.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => handleRemindAllOfficers(missingOfficers)}
                  className="text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center gap-1.5 shrink-0 self-start sm:self-center"
                >
                  <Send className="h-3.5 w-3.5" />
                  Remind All ({missingOfficers.length} Pending)
                </Button>
              )}
            </div>

            {/* Progress Bar */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-emerald-600" /> Required Officers Submission Progress:
                </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {submittedOfficers.length} / {requiredTotal} Officers Completed ({progressPercent}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* List of Officers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {officerMembers.map((officer) => {
                const hasDocs = !!officer.passport_photo_url && !!officer.id_document_url;
                const isReminded = remindedOfficers[officer.id];
                return (
                  <div
                    key={officer.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                      hasDocs
                        ? "bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200/60 dark:border-emerald-800/40"
                        : "bg-amber-50/40 dark:bg-amber-950/10 border-amber-200/70 dark:border-amber-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          hasDocs
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                        }`}
                      >
                        {officer.role.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {officer.user?.full_name || (officer as any).name || "Leadership Officer"}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 uppercase">
                            {officer.role}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3 text-emerald-600 shrink-0" />
                          {officer.phone_number || officer.user?.phone_number || "No telephone number"}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {hasDocs ? (
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-100/70 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" /> Submitted
                        </span>
                      ) : (
                        <Button
                          size="xs"
                          onClick={() => handleRemindOfficer(officer)}
                          className="text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center gap-1 py-1 px-2.5 shadow-xs cursor-pointer"
                        >
                          <Send className="h-3 w-3" />
                          {isReminded ? "Reminded ✓" : "Remind"}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ========================================== */}
      {/* MY ASSIGNED TASKS & DELIVERABLES (ANY ROLE) */}
      {/* ========================================== */}
      {myAssignedTasks.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckSquare className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm md:text-base font-bold text-slate-900 dark:text-white">
                    My Assigned Tasks & Action Deliverables
                  </h3>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {myAssignedTasks.filter(item => item.task.progress >= 100).length}/{myAssignedTasks.length} Completed
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Action items assigned to you. Update your task progress and submit performance reports to advance the event milestone.
                </p>
              </div>
            </div>

            <Link
              to="/dashboard/events"
              className="self-start sm:self-center text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 shrink-0"
            >
              <span>View All Events</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myAssignedTasks.map(({ task, event }) => {
              const dueDateObj = task.due_date ? new Date(task.due_date) : new Date(event.date_time);
              const isOverdue = dueDateObj < new Date() && (task.progress || 0) < 100;
              const daysDiff = Math.ceil((dueDateObj.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const isEditing = editingTaskId === task.id;

              return (
                <div
                  key={task.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition ${
                    task.progress >= 100
                      ? "bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800"
                      : isOverdue
                      ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800"
                  }`}
                >
                  <div className="space-y-2">
                    {/* Event name & due date planning clock */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md truncate max-w-[200px]">
                        Event: {event.title}
                      </span>

                      {/* Planning Clock Badge */}
                      {isOverdue ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-[10px] font-bold">
                          <Clock className="h-3 w-3 shrink-0 text-rose-600 animate-pulse" />
                          <span>Overdue by {Math.abs(daysDiff)}d (Due {dueDateObj.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })})</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-[10px] font-medium">
                          <Clock className="h-3 w-3 shrink-0 text-slate-400" />
                          <span>Due {daysDiff === 0 ? "today" : `in ${daysDiff}d`} ({dueDateObj.toLocaleDateString([], { day: "numeric", month: "short" })})</span>
                        </div>
                      )}
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      {task.title}
                    </h4>

                    {/* Progress Bar & Status */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-slate-500">
                          Progress Contribution:
                        </span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {task.progress || 0}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            task.progress >= 100
                              ? "bg-emerald-500"
                              : task.progress > 0
                              ? "bg-emerald-500"
                              : "bg-slate-300 dark:bg-slate-700"
                          }`}
                          style={{ width: `${task.progress || 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Performance Report Quote if already submitted */}
                    {task.performance_report && !isEditing && (
                      <div className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-[11px]">
                        <span className="font-bold text-emerald-800 dark:text-emerald-300 block text-[10px] uppercase tracking-wider mb-0.5">
                          My Performance Report ({task.reported_at ? new Date(task.reported_at).toLocaleDateString([], { month: "short", day: "numeric" }) : "Recent"}):
                        </span>
                        <p className="text-emerald-900 dark:text-emerald-200 italic">"{task.performance_report}"</p>
                      </div>
                    )}
                  </div>

                  {/* Action or Editing Form */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    {!isEditing ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          task.progress >= 100
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : task.progress > 0
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}>
                          {task.progress >= 100 ? "Completed" : task.progress > 0 ? "In Progress" : "Pending"}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTaskId(task.id);
                            setTaskProgressVal(task.progress || 0);
                            setTaskReportText(task.performance_report || "");
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                        >
                          <Edit className="h-3 w-3" />
                          <span>Update Progress & Report</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3 pt-1 animate-in">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                            Set Progress Percentage:
                          </label>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {[0, 25, 50, 75, 100].map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setTaskProgressVal(val)}
                                className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                                  taskProgressVal === val
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                                }`}
                              >
                                {val}% {val === 100 && "✓"}
                              </button>
                            ))}
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={taskProgressVal}
                            onChange={(e) => setTaskProgressVal(Number(e.target.value))}
                            className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                            Performance Report / Work Description:
                          </label>
                          <textarea
                            rows={2}
                            placeholder="Report on what was accomplished, milestones completed, or any challenges encountered..."
                            value={taskReportText}
                            onChange={(e) => setTaskReportText(e.target.value)}
                            className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 outline-none focus:ring-1 focus:ring-emerald-600 text-slate-900 dark:text-white"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingTaskId(null)}
                            className="px-3 py-1 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveMemberTaskProgress(event, task)}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                          >
                            Save & Update Event
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 0. PRIMARY WORKSPACE METRICS ROW */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1: Active Members */}
        <div
          onClick={() => navigate("/dashboard/members")}
          className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Active Members</span>
            <Users className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold font-display text-slate-900 dark:text-white tabular-nums">
              {members?.length || 0}
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-1">
              of {(activeOrg as any)?.member_limit || 100} member capacity
            </p>
          </div>
        </div>

        {/* Metric 2: Strategic Goals */}
        <div
          onClick={() => navigate("/dashboard/goals")}
          className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Strategic Goals</span>
            <Target className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold font-display text-slate-900 dark:text-white tabular-nums">
              {goals?.length || 0}
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-1">
              {goals?.filter(g => g.status !== 'completed').length || 0} active this cycle
            </p>
          </div>
        </div>

        {/* Metric 3: MoMo Collected */}
        <div
          onClick={() => navigate("/dashboard/fees")}
          className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>MoMo Contributions</span>
            <Coins className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold font-display text-slate-900 dark:text-white tabular-nums">
              {(financialStats.totalPaid || myFeeStats.myPaidTotal || 0).toLocaleString()} <span className="text-xs font-mono font-normal text-slate-500">RWF</span>
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-1">
              recorded collections
            </p>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 1. FINANCIAL STANDING & DUES HEALTH */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
              <Wallet className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {isAccountant || isAdmin ? "Cooperative Dues Health and Collection" : "Personal Dues Standing and Compliance"}
                </h3>
                {isAccountant || isAdmin ? (
                  <Badge color={financialStats.collectionRate >= 80 ? "green" : "amber"}>
                    {financialStats.collectionRate}% Collection Rate
                  </Badge>
                ) : myFeeStats.isGoodStanding ? (
                  <Badge color="green">Good Standing</Badge>
                ) : (
                  <Badge color="amber">Action Needed</Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAccountant || isAdmin
                  ? "Real-time aggregation of invoiced periodic contributions across all registered accounts."
                  : "Account balance and settlement status for your membership account."}
              </p>
            </div>
          </div>

          <Link
            to="/dashboard/fees"
            className="self-start md:self-auto inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            {isAccountant || isAdmin ? "Manage Fee Ledger" : "View Statement"} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isAccountant || isAdmin ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-gray-100 dark:border-slate-750">
                <span className="text-[10px] font-mono uppercase text-gray-400 block font-bold">Total Invoiced</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white font-display mt-0.5 block">
                  {formatAmount(financialStats.totalInvoiced)}
                </span>
                <span className="text-[10px] text-gray-450 mt-0.5 block">Across all members</span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-gray-100 dark:border-slate-750">
                <span className="text-[10px] font-mono uppercase text-emerald-600 block font-bold">Collected & Settled</span>
                <span className="text-lg font-bold text-emerald-600 font-display mt-0.5 block">
                  {formatAmount(financialStats.totalPaid)}
                </span>
                <span className="text-[10px] text-gray-450 mt-0.5 block">{financialStats.collectionRate}% of total invoiced</span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-gray-100 dark:border-slate-750">
                <span className="text-[10px] font-mono uppercase text-amber-600 block font-bold">Pending Collection</span>
                <span className="text-lg font-bold text-amber-600 font-display mt-0.5 block">
                  {formatAmount(Math.max(0, financialStats.totalInvoiced - financialStats.totalPaid))}
                </span>
                <span className="text-[10px] text-gray-450 mt-0.5 block">{financialStats.pendingCount} unpaid fees</span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-gray-100 dark:border-slate-750">
                <span className="text-[10px] font-mono uppercase text-blue-600 block font-bold">Awaiting Verification</span>
                <span className="text-lg font-bold text-blue-600 font-display mt-0.5 block">
                  {financialStats.pendingReviewCount}
                </span>
                <span className="text-[10px] text-gray-450 mt-0.5 block">MoMo / Bank slips submitted</span>
              </div>
            </div>

            {/* If admin also has personal pending dues */}
            {myPendingDues.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 p-3 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Coins className="h-4 w-4 text-amber-600 shrink-0" />
                  <span className="text-xs text-amber-850 dark:text-amber-300 font-medium">
                    You have <strong>{myPendingDues.length} personal dues invoice(s)</strong> pending ({formatAmount(myFeeStats.myPendingTotal)}).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/dashboard/fees")}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shrink-0 transition"
                >
                  Pay My Dues
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-gray-100 dark:border-slate-750">
              <span className="text-[10px] font-mono uppercase text-gray-400 block font-bold">Total Settled Contributions</span>
              <span className="text-lg font-bold text-emerald-600 font-display mt-0.5 block">
                {formatAmount(myFeeStats.myPaidTotal)}
              </span>
              <span className="text-[10px] text-gray-450 mt-0.5 block">{myFeeStats.paidCount} verified payment cycles</span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-gray-100 dark:border-slate-750">
              <span className="text-[10px] font-mono uppercase text-gray-400 block font-bold">Outstanding Balance</span>
              <span className={`text-lg font-bold font-display mt-0.5 block ${myFeeStats.myPendingTotal > 0 ? "text-rose-600" : "text-gray-900 dark:text-white"}`}>
                {formatAmount(myFeeStats.myPendingTotal)}
              </span>
              <span className="text-[10px] text-gray-450 mt-0.5 block">
                {myFeeStats.isGoodStanding ? "No dues currently pending" : `${myPendingDues.length} invoices to clear`}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => navigate("/dashboard/fees")}
                className="w-full bg-[var(--org-primary)] text-white font-bold py-2.5 px-4 rounded-xl text-xs hover:opacity-90 transition flex items-center justify-center gap-2 cursor-pointer shadow-3xs"
              >
                <Coins className="h-4 w-4" />
                {myFeeStats.myPendingTotal > 0 ? "Pay Outstanding Dues" : "View Payment History"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* 3. MAIN DASHBOARD CONTENT GRID */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-8">
          {/* Identity Trust Compliance Status Block for Volunteers (Only when on Enterprise plan AND initiated by admin) */}
          {!isAdmin && (activeOrg?.subscription_tier === "enterprise" || activeOrg?.subscription_status === "trial") && (typedMember?.verification_requested || typedMember?.verification_status === "pending" || typedMember?.verification_status === "verified" || typedMember?.verification_status === "rejected") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 select-none leading-none">
              {/* verification card */}
              <div className="bg-white dark:bg-slate-850 p-5 rounded-2xl flex flex-col gap-4 shadow-3xs">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-gray-400 font-bold block leading-none">{t("dashboard_labels.identity_trust_level")}</span>
                    <span className="text-sm font-bold text-gray-910 leading-none">{t("dashboard_labels.verification_documents")}</span>
                  </div>
                  {typedMember?.verification_status === "verified" ? (
                    <Badge color="green">{t("dashboard_labels.verified_badge")}</Badge>
                  ) : typedMember?.verification_status === "pending" ? (
                    <Badge color="amber">{t("dashboard_labels.pending_badge")}</Badge>
                  ) : typedMember?.verification_status === "rejected" ? (
                    <Badge color="red">{t("dashboard_labels.rejected_badge")}</Badge>
                  ) : (
                    <Badge color="blue">{t("dashboard_labels.not_uploaded_badge")}</Badge>
                  )}
                </div>

                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  {t("dashboard_labels.verification_desc_vol")}
                </p>

                {(!typedMember?.verification_status || typedMember.verification_status === "rejected" || typedMember.verification_status === "unverified") && (
                  <Button size="sm" icon={<Fingerprint className="h-4 w-4" />} onClick={() => setOpenVerifyModal(true)} className="self-start">
                    {t("dashboard_labels.verify_id_passport_btn")}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* 4. Strategic Goals Card (Image 5) */}
          <div className="card card-glow bg-white dark:bg-slate-850 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-3xs p-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800">
              <div>
                <h3 className="font-display font-bold text-base text-gray-900 dark:text-white">
                  Strategic Goals
                </h3>
                <p className="text-xs text-[#4a6357] dark:text-slate-400 mt-0.5">
                  Pinned integrity goals this quarter
                </p>
              </div>
              <Link to="/dashboard/goals" className="text-xs font-bold text-[#156c45] dark:text-emerald-400 hover:underline flex items-center gap-1">
                View all →
              </Link>
            </div>

            <div className="pt-4 flex flex-col gap-4">
              {/* Member Personal Action Tasks with Live Countdown */}
              {myAssignedGoalTasks.length > 0 && (
                <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/80 dark:border-emerald-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5 text-emerald-600" />
                      <span>My Assigned Goal Tasks ({myAssignedGoalTasks.length})</span>
                    </span>
                    <Link
                      to="/dashboard/goals"
                      className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                    >
                      Log Notes →
                    </Link>
                  </div>

                  <div className="space-y-2.5">
                    {myAssignedGoalTasks.slice(0, 2).map(({ goal, task }) => (
                      <div
                        key={task.id}
                        onClick={() => navigate("/dashboard/goals")}
                        className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-emerald-100 dark:border-emerald-950/80 hover:border-emerald-300 transition cursor-pointer shadow-3xs"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                            {task.title}
                          </span>
                          <RealtimeTaskCountdown
                            deadline={task.deadline}
                            isCompleted={task.status === "completed" || (task.progress || 0) >= 100}
                            compact
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                          <span>Goal: {goal.title}</span>
                          <span className="font-mono font-bold text-emerald-600">{task.progress || 0}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                            style={{ width: `${task.progress || 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {displayGoals.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {displayGoals.map((g) => {
                    const pct = Math.min(100, Math.round((g.current_progress / (g.target || 1)) * 100));
                    return (
                      <div key={g.id} className="flex flex-col gap-2 p-3.5 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-gray-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-900/50 transition">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-[#156c45] dark:bg-emerald-400 shrink-0" />
                            {g.title}
                          </span>
                          <span className="text-xs font-bold text-[#156c45] dark:text-emerald-400 font-mono">
                            {pct}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#156c45] dark:bg-emerald-500 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[#4a6357] dark:text-slate-400 font-medium">
                          <span>{g.current_progress.toLocaleString()} / {g.target.toLocaleString()} {g.unit || "milestones"}</span>
                          <span className="font-mono text-[10px] text-gray-400">Quarterly Target</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 px-4 flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-[#e8f5ee] dark:bg-emerald-950/40 text-[#156c45] dark:text-emerald-400 flex items-center justify-center mb-2.5">
                    <Target className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                    No strategic goals pinned
                  </h4>
                  <p className="text-xs text-[#4a6357] dark:text-slate-400 max-w-xs leading-relaxed mb-3">
                    Track your cooperative milestones and mission targets here.
                  </p>
                  <Button size="sm" variant="outline" onClick={() => navigate("/dashboard/goals")}>
                    Set Goals
                  </Button>
                </div>
              )}
            </div>
          </div>


        </div>

        {/* Sidebar Widgets - Weekly Schedule & Attendance Radar (Image 5) */}
        <div className="flex flex-col gap-8">
          <div className="card card-glow bg-white dark:bg-slate-850 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-3xs p-5">
            <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 dark:border-slate-800">
              <div>
                <h3 className="font-display font-bold text-sm text-gray-900 dark:text-white">
                  This Week
                </h3>
                <p className="text-[11px] text-[#4a6357] dark:text-slate-400 mt-0.5">
                  Upcoming sessions & deadlines
                </p>
              </div>
              <Link to="/dashboard/events" className="text-xs font-bold text-[#156c45] dark:text-emerald-400 hover:underline flex items-center gap-1">
                Calendar →
              </Link>
            </div>

            <div className="pt-3.5">
              {nextUpcomingItems.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {nextUpcomingItems.map((item) => {
                    const eventDate = new Date(item.date_time);
                    const isToday = new Date().toDateString() === eventDate.toDateString();
                    return (
                      <div
                        key={item.id}
                        className="p-3 bg-slate-50/70 dark:bg-slate-800/60 rounded-xl border border-gray-100 dark:border-slate-800 flex flex-col gap-1.5 hover:border-emerald-200 transition"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-bold text-xs text-gray-900 dark:text-white line-clamp-1">
                            {item.title}
                          </span>
                          <Badge color={item.type === "meeting" ? "purple" : "blue"}>
                            {item.type === "meeting" ? "Meeting" : "Event"}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-gray-500 font-medium">
                          <div className="flex items-center gap-1 font-mono">
                            <Clock className="h-3 w-3 text-gray-400" />
                            {isToday ? "Today at " : `${eventDate.toLocaleDateString([], { month: "short", day: "numeric" })} at `}
                            {eventDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                          <span className="text-[10px] truncate max-w-[120px] text-gray-400 font-mono">
                            {item.venue}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 px-4 flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-[#e8f5ee] dark:bg-emerald-950/40 text-[#156c45] dark:text-emerald-400 flex items-center justify-center mb-2.5">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-bold text-[#111c16] dark:text-white mb-1 font-display">
                    Nothing scheduled yet
                  </h4>
                  <p className="text-xs text-[#4a6357] dark:text-slate-400 leading-relaxed max-w-xs">
                    Events and meetings will appear here once added to your calendar.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Cooperative Documents */}
          <Card
            title="Official Documents"
            action={
              <Link to="/dashboard/documents" className="text-xs text-[var(--org-primary)] font-bold hover:underline flex items-center gap-1">
                Vault <ArrowRight className="h-3 w-3" />
              </Link>
            }
          >
            {recentDocs.length > 0 ? (
              <div className="flex flex-col divide-y divide-gray-100 dark:divide-slate-800 text-xs">
                {recentDocs.map((doc) => {
                  const docTitle = doc.name || (doc as any).title || "Untitled Document";
                  const isExcel = doc.file_type === "excel";
                  const isLetter = !!doc.is_letter;
                  const isPrivate = !!doc.is_private;
                  const isSharedPrivate = isPrivate && (doc.recipient_member_ids && doc.recipient_member_ids.length > 0);

                  return (
                    <div 
                      key={doc.id} 
                      onClick={() => {
                        if (doc.file_url) {
                          navigate("/dashboard/documents", {
                            state: { previewUrl: doc.file_url, previewName: docTitle }
                          });
                        } else {
                          navigate("/dashboard/documents");
                        }
                      }}
                      className="py-2.5 px-2 -mx-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition flex items-center justify-between gap-3 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 truncate min-w-0">
                        <div className={`p-1.5 rounded-lg shrink-0 ${isExcel ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600" : isLetter ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600" : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600"}`}>
                          {isExcel ? <FileSpreadsheet className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                        </div>
                        <div className="flex flex-col truncate">
                          <span className="font-bold text-gray-900 dark:text-slate-100 truncate group-hover:text-[var(--org-primary)] transition">
                            {docTitle}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono truncate">
                            {doc.file_size || "Document"} {doc.created_at ? `• ${new Date(doc.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}` : ""}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isPrivate && (
                          <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded flex items-center gap-0.5 ${isSharedPrivate ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300" : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"}`}>
                            <Lock className="h-2.5 w-2.5" />
                            {isSharedPrivate ? `Shared (${doc.recipient_member_ids?.length})` : "Private"}
                          </span>
                        )}
                        <Badge color={isExcel ? "green" : isLetter ? "amber" : "blue"}>
                          {isLetter ? "Letter" : isExcel ? "Sheet" : "Doc"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-gray-400 font-mono flex flex-col items-center gap-1">
                <FileText className="h-6 w-6 text-gray-300 mb-1" />
                <span>No accessible documents found</span>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Doc Verification Modal */}
      <Modal open={openVerifyModal} onClose={() => setOpenVerifyModal(false)} title={t("dashboard_labels.upload_verify_doc_title")}>
        <form onSubmit={handleVerifySubmit} className="flex flex-col gap-4 font-bold text-xs select-none">
          <div className="flex flex-col gap-1.5 w-full whitespace-nowrap">
            <label className="text-xs font-semibold text-gray-700">{t("dashboard_labels.select_doc_category")}</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full text-xs rounded-lg border bg-white border-gray-300 px-3 py-2 text-stone-880 focus:ring-2 focus:ring-[var(--org-primary)] outline-none"
            >
              <option value="National Identification Card">National Identification Card (NIDA)</option>
              <option value="Valid Passport document">International Passport</option>
              <option value="Cooperative Organizational Certificate">Cooperative Organizational Certificate</option>
            </select>
          </div>

          <Input label={t("dashboard_labels.simulated_photo_link")} value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder={t("dashboard_labels.file_url_path_name")} />

          {/* Drag drop mock */}
          <div className="border border-dashed border-gray-300 rounded-xl p-6 bg-slate-50/50 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 select-none">
            <Fingerprint className="h-10 w-10 text-gray-400" />
            <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">{t("dashboard_labels.drag_drop_passport_pdf")}</span>
            <span className="text-[9px] text-gray-400">{t("dashboard_labels.pdf_jpg_png_limit")}</span>
          </div>

          <Button type="submit" className="w-full mt-4 font-extrabold uppercase py-2.5">
            {t("dashboard_labels.submit_trust_verification")}
          </Button>
        </form>
      </Modal>

      {/* Exit surveys Modal */}
      <Modal open={openResignModal} onClose={() => setOpenResignModal(false)} title={t("dashboard_labels.volunteer_exit_survey")}>
        <form onSubmit={handleResignSubmit} className="flex flex-col gap-4 font-bold text-xs select-none">
          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-xs font-semibold text-gray-700">{t("dashboard_labels.primary_reason_offboarding")}</label>
            <select
              value={resignCategory}
              onChange={(e) => setResignCategory(e.target.value)}
              className="w-full text-xs rounded-lg border bg-white border-gray-300 px-3 py-2 text-stone-880 focus:ring-2 focus:ring-[var(--org-primary)] outline-none"
            >
              <option value="Relocation or Resettlement">{t("dashboard_labels.relocation_outside_sector")}</option>
              <option value="Mismatch with agropastoral targets">{t("dashboard_labels.mismatch_cooperative_goals")}</option>
              <option value="Scheduling Conflicts / Lack of time">{t("dashboard_labels.scheduling_conflicts")}</option>
              <option value="Health/Personal Circumstances">{t("dashboard_labels.health_personal_reasons")}</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-xs font-semibold text-gray-770">{t("dashboard_labels.provide_constructive_feedback")}</label>
            <textarea
              value={resignDetail}
              onChange={(e) => setResignDetail(e.target.value)}
              placeholder={t("dashboard_labels.support_volunteers_better")}
              className="w-full text-xs rounded-lg border bg-white border-gray-300 p-3 min-h-24 font-semibold text-stone-900 focus:ring-2 focus:ring-[var(--org-primary)] outline-none"
              required
            />
          </div>

          <Button type="submit" className="w-full mt-3 uppercase py-2.5 font-extrabold">
            {t("dashboard_labels.confirm_cooperative_resignation")}
          </Button>
        </form>
      </Modal>

      {/* Organization Authenticity Verification Modal */}
      {activeOrg && (
        <OrganizationVerificationModal
          open={openOrgVerifyModal}
          onClose={() => setOpenOrgVerifyModal(false)}
          org={activeOrg}
          members={members || []}
        />
      )}
    </div>
  );
};

// ==========================================
// 2. NEWS & BLOG POSTS ADMIN FEED MODULE
// ==========================================
export const NewsFeed: React.FC = () => {
  const { activeOrg, activeMember } = useOrgStore();
  const { addToast } = useToast();
  const { t } = useLocalTranslation();
  const { data: news, refetch } = useNews(activeOrg?.id);
  const createMutation = useCreatePost();
  const updateMutation = useUpdatePost();
  const deleteMutation = useDeletePost();

  const [openAddModal, setOpenAddModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<NewsPost | null>(null);

  const [activeTab, setActiveTab] = useState<"active" | "history">("active");

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState("Operational");
  const [isPinned, setIsPinned] = useState(false);
  const [loading, setLoading] = useState(false);

  const isAdmin = activeMember?.role === "org_admin";

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !excerpt || !body) return;

    setLoading(true);
    try {
      await createMutation.mutateAsync({
        org_id: activeOrg?.id || "",
        title,
        body,
        excerpt,
        category,
        visibility: "public",
        is_pinned: isPinned,
        author_id: activeMember?.user_id || "",
        published_at: new Date().toISOString()
      });
      setOpenAddModal(false);
      setTitle("");
      setBody("");
      setExcerpt("");
      setIsPinned(false);
      refetch();
      addToast(`Announcement Broadcast Dispatched!\n\n"${title}" has been published. All board members and volunteers have been notified of this announcement.`, "success");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditInit = (post: NewsPost) => {
    setSelectedPost(post);
    setTitle(post.title);
    setBody(post.body);
    setExcerpt(post.excerpt);
    setCategory(post.category);
    setIsPinned(post.is_pinned);
    setOpenEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost || !title || !excerpt || !body) return;

    setLoading(true);
    try {
      await updateMutation.mutateAsync({
        id: selectedPost.id,
        org_id: activeOrg?.id || "",
        title,
        body,
        excerpt,
        category,
        is_pinned: isPinned
      });
      setOpenEditModal(false);
      setSelectedPost(null);
      setTitle("");
      setBody("");
      setExcerpt("");
      setIsPinned(false);
      refetch();
      addToast("Announcement updated successfully. Historic values conserved in database record.", "success");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (post: NewsPost) => {
    if (confirm("Soft-delete this post? It will remain stored as a historical log in the primary database schema.")) {
      try {
        await deleteMutation.mutateAsync({ id: post.id, org_id: activeOrg?.id || "" });
        refetch();
        addToast("Post transitioned into database persistent history logs.", "success");
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleRestore = async (post: NewsPost) => {
    try {
      await updateMutation.mutateAsync({
        id: post.id,
        org_id: activeOrg?.id || "",
        is_deleted: false
      });
      refetch();
      addToast("Announcement successfully restored from database archives.", "success");
    } catch (err) {
      console.error(err);
    }
  };

  const displayedNews = (news || []).filter((n) => {
    if (activeTab === "history") {
      return n.is_deleted === true;
    } else {
      return !n.is_deleted;
    }
  });

  return (
    <div className="flex flex-col gap-6 select-none font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-display text-gray-911">{t("dashboard_labels.branded_news_feed")}</h2>
          <p className="text-xs text-gray-500">{t("dashboard_labels.news_feed_subtitle")}</p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-1 shadow-3xs">
            <button
              onClick={() => setActiveTab("active")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === "active"
                  ? "bg-white dark:bg-slate-900 text-[#156c45] dark:text-emerald-400 shadow-3xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
              }`}
            >
              Active
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab("history")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === "history"
                    ? "bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-3xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
                }`}
                title="Database history archive"
              >
                <History className="h-3.5 w-3.5" /> History Log
              </button>
            )}
          </div>

          {isAdmin && activeTab === "active" && (
            <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setOpenAddModal(true)}>
              {t("dashboard_labels.add_post")}
            </Button>
          )}
        </div>
      </div>

      {activeTab === "history" && (
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-850 text-xs font-semibold leading-relaxed animate-in fade-in duration-200 flex items-start gap-2">
          <Info className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
          <span>
            <strong>Audited Historical Records:</strong> These posts are soft-deleted and preserved in the primary database table to manage complete database chronological history. Admins can view edits, audits or restore them to active status at will.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {displayedNews.length > 0 ? (
          displayedNews.map((n) => (
            <Card key={n.id} title={n.title} action={
              <div className="flex items-center gap-2 select-none">
                {n.is_pinned && <Pin className="h-3.5 w-3.5 text-amber-500 rotate-45" />}
                <Badge color={n.is_deleted ? "amber" : "blue"}>{n.category}</Badge>
                {isAdmin && (
                  <div className="flex items-center gap-1.5 ml-2 border-l pl-2">
                    {n.is_deleted ? (
                      <button
                        onClick={() => handleRestore(n)}
                        className="px-2 py-0.5 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded font-bold transition"
                      >
                        Restore
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEditInit(n)}
                          className="p-1 text-gray-400 hover:text-[var(--org-primary)] transition"
                          title="Edit announcement"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(n)}
                          className="p-1 text-gray-400 hover:text-red-600 transition"
                          title="Soft delete from board"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            }>
              <p className="text-xs font-semibold text-gray-700 leading-normal">{n.excerpt}</p>
              <div className="p-3 bg-gray-50 dark:bg-slate-750 rounded-lg text-[11px] text-gray-500 mt-4 leading-relaxed font-semibold">
                {n.body}
              </div>
              <div className="flex justify-between items-center text-[10px] text-gray-400 mt-4 font-mono leading-none">
                <span>
                  {t("dashboard_labels.published_on")} {new Date(n.published_at || "").toLocaleDateString()}
                </span>
                {n.last_edited_at && (
                  <span className="text-amber-600">
                    Edited: {new Date(n.last_edited_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-2">
            <EmptyState
              title={activeTab === "history" ? "No Archive Log Found" : t("dashboard_labels.no_news_posted")}
              message={activeTab === "history" ? "No soft-deleted announcements inside this Organization database directory yet." : t("dashboard_labels.no_news_message")}
            />
          </div>
        )}
      </div>

      {/* Add News Modal */}
      <Modal open={openAddModal} onClose={() => setOpenAddModal(false)} title={t("dashboard_labels.compose_announcement")}>
        <form onSubmit={handlePost} className="flex flex-col gap-4">
          <Input label={t("dashboard_labels.headline_title")} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("dashboard_labels.headline_placeholder")} />
          <Input label={t("dashboard_labels.brief_excerpt")} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder={t("dashboard_labels.excerpt_placeholder")} />
          
          <div className="flex flex-col gap-1.5 self-start w-full">
            <label className="text-xs font-semibold text-gray-700">{t("dashboard_labels.detailed_content")}</label>
            <textarea
              className="w-full text-sm rounded-lg border bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 p-3 text-gray-900 dark:text-slate-100 min-h-32 focus:ring-2 focus:ring-[var(--org-primary)] focus:outline-none focus:border-transparent"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("dashboard_labels.detailed_content_placeholder")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-700">{t("dashboard_labels.section_category")}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-sm rounded-lg border bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 px-3 py-2 text-gray-805 select-none outline-none focus:ring-2 focus:ring-[var(--org-primary)] transition"
              >
                <option value="Operational">{t("dashboard_labels.category_operational")}</option>
                <option value="Finance">{t("dashboard_labels.category_finance")}</option>
                <option value="Staff Update">{t("dashboard_labels.category_staff_update")}</option>
                <option value="Outreach">{t("dashboard_labels.category_outreach")}</option>
              </select>
            </div>

            <div className="flex items-center gap-3.5 mt-6 self-start select-none">
              <input
                type="checkbox"
                id="pin_tick"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="h-4.5 w-4.5 text-[var(--org-primary)] border-gray-300 rounded focus:ring-[var(--org-primary)] cursor-pointer"
              />
              <label htmlFor="pin_tick" className="text-xs font-bold text-gray-700 cursor-pointer flex items-center gap-1.5">
                <Pin className="h-3.5 w-3.5 rotate-45" /> {t("dashboard_labels.pin_dashboard_home")}
              </label>
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <Button type="submit" loading={loading} className="w-full py-2.5">
              {t("dashboard_labels.publish_post")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit News Modal */}
      <Modal open={openEditModal} onClose={() => { setOpenEditModal(false); setSelectedPost(null); }} title="Edit Announcement">
        {selectedPost && (
          <form onSubmit={handleUpdate} className="flex flex-col gap-4">
            <Input label={t("dashboard_labels.headline_title")} value={title} onChange={(e) => setTitle(e.target.value)} required />
            <Input label={t("dashboard_labels.brief_excerpt")} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} required />
            
            <div className="flex flex-col gap-1.5 self-start w-full">
              <label className="text-xs font-semibold text-gray-700">{t("dashboard_labels.detailed_content")}</label>
              <textarea
                className="w-full text-sm rounded-lg border bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 p-3 text-gray-900 dark:text-slate-100 min-h-32 focus:ring-2 focus:ring-[var(--org-primary)] focus:outline-none focus:border-transparent"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700">{t("dashboard_labels.section_category")}</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-sm rounded-lg border bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 px-3 py-2 text-gray-805 select-none outline-none focus:ring-2 focus:ring-[var(--org-primary)] transition"
                >
                  <option value="Operational">{t("dashboard_labels.category_operational")}</option>
                  <option value="Finance">{t("dashboard_labels.category_finance")}</option>
                  <option value="Staff Update">{t("dashboard_labels.category_staff_update")}</option>
                  <option value="Outreach">{t("dashboard_labels.category_outreach")}</option>
                </select>
              </div>

              <div className="flex items-center gap-3.5 mt-6 self-start select-none">
                <input
                  type="checkbox"
                  id="pin_tick_edit"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="h-4.5 w-4.5 text-[var(--org-primary)] border-gray-300 rounded focus:ring-[var(--org-primary)] cursor-pointer"
                />
                <label htmlFor="pin_tick_edit" className="text-xs font-bold text-gray-700 cursor-pointer flex items-center gap-1.5">
                  <Pin className="h-3.5 w-3.5 rotate-45" /> {t("dashboard_labels.pin_dashboard_home")}
                </label>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <Button type="submit" loading={loading} className="w-full py-2.5">
                Save Announcement Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

// ==========================================
// 3. CHAT CHANNELS MESSAGING SYSTEM
// ==========================================
export const ChatRoom: React.FC = () => {
  const { t } = useLocalTranslation();
  const { activeOrg, activeMember } = useOrgStore();
  const { addToast } = useToast();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { data: channels, refetch: refetchChans } = useChatChannels(activeOrg?.id);

  const [activeChannelId, setActiveChannelId] = useState("");
  const { data: messages, refetch } = useChatMessages(activeChannelId);
  const sendMutation = useSendChatMessage();
  const createChannelMutation = useCreateChannel();
  const createPollMutation = useCreatePoll();

  const [openMeetModal, setOpenMeetModal] = useState(false);
  const { data: dbDocs } = useV2Documents(activeOrg?.id);
  const documents = (dbDocs || []) as Document[];

  const messagesEndRef = useRef<HTMLDivElement>(null);


  const [typedMessage, setTypedMessage] = useState("");

  // V2 UI States
  const { data: orgMembers } = useMembers(activeOrg?.id);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const [openChanModal, setOpenChanModal] = useState(false);
  const [newChanName, setNewChanName] = useState("");
  const [newChanCategory, setNewChanCategory] = useState("general");
  const [newChanPrivate, setNewChanPrivate] = useState(false);

  const lifecycle = getOrgSubscriptionLifecycle(activeOrg);
  const videoAccess = canAccessFeature(activeOrg, "video_call");
  const pollAccess = canAccessFeature(activeOrg, "chat_polls");
  const isVideoAllowed = videoAccess.allowed;
  const isPollAllowed = pollAccess.allowed;
  const isFreePlan = !isPollAllowed;

  const [openPollModal, setOpenPollModal] = useState(false);
  const [showPollUpgradeModal, setShowPollUpgradeModal] = useState(false);
  const [upgradeModalFeature, setUpgradeModalFeature] = useState<"video" | "polls">("polls");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOpts, setPollOpts] = useState(["", "", ""]);
  const [pollError, setPollError] = useState("");


  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showNewDocModal, setShowNewDocModal] = useState(false);
  const [newDocContent, setNewDocContent] = useState("");
  const [newDocTitle, setNewDocTitle] = useState("untitled_doc.md");
  const [isRecording, setIsRecording] = useState(false);
  const [recCountdown, setRecCountdown] = useState(3);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activePreviewDoc, setActivePreviewDoc] = useState<{ url: string; name: string; isImage?: boolean } | null>(null);
  const [resolvedPreviewUrl, setResolvedPreviewUrl] = useState<string>("");

  const commonEmojis = ["😊", "😂", "👍", "❤️", "🔥", "✨", "🙌", "✅", "🚀", "💡", "🤔", "👏", "🎉", "🙏", "💪"];

  const handleCreateAndAttachDoc = async () => {
    if (!newDocContent.trim()) return;
    const blob = new Blob([newDocContent], { type: "text/markdown" });
    const file = new File([blob], newDocTitle.endsWith(".md") ? newDocTitle : `${newDocTitle}.md`, { type: "text/markdown" });
    
    try {
      addToast({
        title: "Creating document",
        message: `Saving and uploading "${file.name}"...`,
        type: "info"
      } as any);

      const storageKey = await uploadFileToSupabase(file, "chat-attachments");

      await sendMutation.mutateAsync({
        channelId: activeChannelId,
        senderId: activeMember?.user_id || "",
        text: `Shared document: ${file.name}`,
        senderName: user?.full_name || "User",
        message_type: "file",
        file_url: storageKey,
        file_name: file.name,
        file_size: file.size,
        file_mime_type: file.type
      });

      setShowNewDocModal(false);
      setNewDocContent("");
      setNewDocTitle("untitled_doc.md");
      addToast("Document created and sent", "success");
      refetch();
    } catch (err: any) {
      console.error(err);
      addToast("Failed to create document", "error");
    }
  };

  useEffect(() => {
    if (activePreviewDoc?.url) {
      let active = true;
      resolveFileUrl(activePreviewDoc.url).then((url) => {
        if (active) setResolvedPreviewUrl(url);
      });
      return () => {
        active = false;
      };
    } else {
      setResolvedPreviewUrl("");
    }
  }, [activePreviewDoc]);

  // B2 S3 Real voice recording references and state
  const chunksRef = useRef<Blob[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<any>(null);
  const recDurationRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handlePlayVoice = async (fileUrl: string | undefined) => {
    if (!fileUrl) return;
    try {
      const url = await resolveFileUrl(fileUrl);
      if (url) {
        const audio = new Audio(url);
        audio.play();
        addToast({
          title: "Audio Playback",
          message: "Playing recorded voice report from Supabase Storage...",
          type: "info"
        } as any);
      }
    } catch (err) {
      console.error("Playback failed:", err);
    }
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);


  // Poll responses and detail lookups mapping

  const activeChannel = channels?.find((c) => c.id === activeChannelId);

  // Select first channel automatically when loaded
  useEffect(() => {
    if (channels && channels.length > 0 && !activeChannelId) {
      setActiveChannelId(channels[0].id);
    }
  }, [channels, activeChannelId]);

  // Real-time synchronization subscription
  useEffect(() => {
    if (!isSupabaseConfigured || !activeChannelId) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      const channelName = `chat_msgs_rt_${activeChannelId}_${Math.random().toString(36).substring(2, 9)}`;
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `channel_id=eq.${activeChannelId}`
          },
          () => {
            refetch();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn("[Realtime] Chat messages subscription notice:", err);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [activeChannelId, refetch]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim() || !activeChannelId) return;

    try {
      await sendMutation.mutateAsync({
        channelId: activeChannelId,
        senderId: activeMember?.user_id || "",
        text: typedMessage,
        senderName: user?.full_name || "Divine Uwera",
        message_type: "text"
      });
      setTypedMessage("");
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateVoiceRec = async () => {
    if (isRecording) {
      // STOP recording
      setIsRecording(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      } else {
        try {
          await sendMutation.mutateAsync({
            channelId: activeChannelId,
            senderId: activeMember?.user_id || "",
            text: "🎙️ Organization Field report voice notes memo",
            senderName: user?.full_name || "Divine Uwera",
            message_type: "voice",
            voice_duration_seconds: recCountdown
          });
          refetch();
        } catch (err) {
          console.error(err);
        }
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      return;
    }

    // START recording
    try {
      chunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([audioBlob], `voice_note_${Date.now()}.webm`, { type: "audio/webm" });

        try {
          addToast({
            title: "Uploading voice note",
            message: "Saving your high-quality recording to Supabase Storage...",
            type: "info"
          } as any);

          // Upload to Supabase Storage via chat-attachments bucket
          const key = await uploadFileToSupabase(file, "chat-attachments", "voice-notes");

          // Use the ref value to avoid state closures!
          const duration = recDurationRef.current > 0 ? recDurationRef.current : 5;

          await sendMutation.mutateAsync({
            channelId: activeChannelId,
            senderId: activeMember?.user_id || "",
            text: "Recorded Voice Report",
            senderName: user?.full_name || "Divine Uwera",
            message_type: "voice",
            file_url: key, // Save unique B2 key in DB
            voice_duration_seconds: duration
          });

          addToast({
            title: "Voice note sent",
            message: "Your recording was successfully uploaded and sent.",
            type: "success"
          } as any);

          refetch();
        } catch (err: any) {
          console.error("Failed to upload voice note:", err);
          addToast({
            title: "Failed to upload",
            message: err.message || "Microphone audio upload failed.",
            type: "error"
          } as any);
        }
      };

      setIsRecording(true);
      setRecCountdown(0);
      recDurationRef.current = 0;
      recorder.start();

      intervalRef.current = setInterval(() => {
        setRecCountdown((prev) => {
          const nextVal = prev + 1;
          recDurationRef.current = nextVal;
          if (nextVal >= 300) {
            // Stop recording as it reached 5 minutes limit!
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            setIsRecording(false);
            if (recorderRef.current && recorderRef.current.state !== "inactive") {
              recorderRef.current.stop();
            }
            if (streamRef.current) {
              streamRef.current.getTracks().forEach((track) => track.stop());
              streamRef.current = null;
            }
            addToast({
              title: "Time Limit Reached",
              message: "Voice notes are limited to 5 minutes.",
              type: "warning"
            } as any);
          }
          return nextVal;
        });
      }, 1000);

    } catch (err) {
      console.warn("Microphone access unavailable, recording memo via audio note:", err);
      // Fallback audio memo
      setIsRecording(true);
      setRecCountdown(3);
      recDurationRef.current = 3;
      
      intervalRef.current = setInterval(() => {
        setRecCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            setIsRecording(false);
            
            sendMutation.mutateAsync({
              channelId: activeChannelId,
              senderId: activeMember?.user_id || "",
              text: "🎙️ Organization Field report voice notes memo",
              senderName: user?.full_name || "Divine Uwera",
              message_type: "voice",
              voice_duration_seconds: 42
            }).then(() => refetch());
            
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const handleAttachMock = async (type: "pdf" | "image" | "excel") => {
    setShowAttachMenu(false);
    let name = "Outreach_Proposal_Kayonza.pdf";
    let url = "https://pdfobject.com/pdf/sample.pdf";
    let mime = "application/pdf";
    let size = 1250000;
    let msgType: "file" | "image" = "file";

    if (type === "image") {
      name = "Field_Activity_Photo.png";
      url = "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=500";
      mime = "image/png";
      size = 2400000;
      msgType = "image";
    } else if (type === "excel") {
      name = "Dues_Ledger_FirstHalf_2026.xlsx";
      url = "#";
      mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      size = 450000;
    }

    try {
      await sendMutation.mutateAsync({
        channelId: activeChannelId,
        senderId: activeMember?.user_id || "",
        text: `Shared attachment: ${name}`,
        senderName: user?.full_name || "Divine Uwera",
        message_type: msgType,
        file_url: url,
        file_name: name,
        file_size: size,
        file_mime_type: mime
      });
      refetch();
    } catch (e) {
      console.error(e);
    }
  };

  const handleChatFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setShowAttachMenu(false);
    
    try {
      addToast({
        title: "Uploading file",
        message: `Saving "${file.name}" to Supabase Storage...`,
        type: "info"
      } as any);

      // Upload file to Supabase Storage via proxy API
      const storageKey = await uploadFileToSupabase(file, "chat-attachments");

      const isImg = file.type.startsWith("image/");
      await sendMutation.mutateAsync({
        channelId: activeChannelId,
        senderId: activeMember?.user_id || "",
        text: `Shared file: ${file.name}`,
        senderName: user?.full_name || "Divine Uwera",
        message_type: isImg ? "image" : "file",
        file_url: storageKey,
        file_name: file.name,
        file_size: file.size,
        file_mime_type: file.type || "application/octet-stream"
      });

      addToast({
        title: "Upload Successful",
        message: `Successfully sent file: ${file.name}`,
        type: "success"
      } as any);
      refetch();
    } catch (err: any) {
      console.error(err);
      addToast({
        title: "Upload Failed",
        message: `Failed to upload to B2: ${err.message}`,
        type: "error"
      } as any);
    }
  };

  const handleCreateChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChanName.trim()) return;
    try {
      await createChannelMutation.mutateAsync({
        orgId: activeOrg?.id || "",
        name: newChanName.replace(/\s+/g, "-").toLowerCase(),
        type: "group",
        channel_type: newChanCategory,
        is_private: newChanPrivate,
        createdBy: activeMember?.user_id || "",
        member_ids: newChanCategory === "general" ? [] : selectedMemberIds
      });
      setNewChanName("");
      setSelectedMemberIds([]);
      setOpenChanModal(false);
      refetchChans();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreatePollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPollError("");

    if (isFreePlan) {
      setPollError("Live community polls require Starter, Growth, or Pro. Please upgrade your organization plan.");
      setShowPollUpgradeModal(true);
      addToast("Community polls are locked on the Free plan. Please upgrade to unlock.", "error");
      return;
    }
    const filteredOptions = pollOpts.map(o => o.trim()).filter(o => o !== "");
    if (!pollQuestion.trim()) {
      setPollError("Please specify a poll question.");
      return;
    }
    if (filteredOptions.length < 2) {
      setPollError("Please provide at least 2 non-empty options.");
      return;
    }
    if (!activeChannelId) {
      setPollError("No active chat channel found.");
      return;
    }

    try {
      const pollId = "poll-" + Math.random().toString(36).substring(2, 9);
      
      // 1. Send the chat message of type 'poll'
      const msg = await sendMutation.mutateAsync({
        channelId: activeChannelId,
        senderId: activeMember?.user_id || "",
        text: `LIVE COMMUNITY POLL: ${pollQuestion}`,
        senderName: user?.full_name || "Divine Uwera",
        message_type: "poll",
        file_url: pollId,
        file_name: JSON.stringify(filteredOptions),
      });

      // 2. Insert into the polls table for live results tracking (non-blocking fallback)
      try {
        await createPollMutation.mutateAsync({
          poll_id: pollId,
          message_id: msg?.id || "poll-msg-" + Math.random().toString(36).substring(2, 9),
          channel_id: activeChannelId,
          question: pollQuestion,
          options: filteredOptions,
        });
      } catch (pollDbErr) {
        console.warn("Poll metadata table insertion failed/skipped, rendering via chat message fallback:", pollDbErr);
      }

      // Reset form states
      setPollQuestion("");
      setPollOpts(["", "", ""]);
      setPollError("");
      setOpenPollModal(false);
      refetch();
    } catch (err: any) {
      console.error(err);
      setPollError(err.message || "Failed to create poll. Please try again.");
    }
  };


  const isUserChannelAllowed = (c: ChatChannel) => {
    if (!c.channel_type || c.channel_type === "general") return true;
    if (activeMember?.role === "org_admin") return true;
    if (!c.member_ids || c.member_ids.length === 0) return true;
    return c.member_ids.includes(activeMember?.id || "");
  };

  const categoryBuckets = {
    general: channels?.filter(c => (!c.channel_type || c.channel_type === "general") && isUserChannelAllowed(c)) || [],
    projects: channels?.filter(c => c.channel_type === "project" && isUserChannelAllowed(c)) || [],
    committees: channels?.filter(c => c.channel_type === "committee" && isUserChannelAllowed(c)) || [],
    private: channels?.filter(c => (c.is_private || c.channel_type === "private") && isUserChannelAllowed(c)) || []
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl flex h-[calc(100vh-130px)] sm:h-[76vh] overflow-hidden select-none font-sans shadow-sm shrink-0 w-full animate-in fade-in duration-200 relative">
      {/* Sidebar Categorized Channels */}
      <aside className={`absolute inset-0 z-50 md:relative w-full md:w-56 border-r border-gray-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 flex flex-col justify-between shrink-0 transition-transform duration-200 ${activeChannelId ? "-translate-x-full md:translate-x-0" : "translate-x-0"}`}>
        <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-5">
          <div className="flex justify-between items-center leading-none">
            <span className="text-[10px] font-mono tracking-widest text-gray-400 uppercase font-bold">Workspace Topics</span>
            <Button size="xs" variant="outline" onClick={() => setOpenChanModal(true)} className="px-1.5 py-1">
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          {/* 1. General Channels */}
          {categoryBuckets.general.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-2 flex items-center gap-1.5"><MessageCircle className="h-3 w-3 inline-block" /> Conversations</span>
              {categoryBuckets.general.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveChannelId(c.id)}
                  className={`w-full text-left px-3.5 py-1.5 text-xs font-semibold rounded-lg truncate transition flex items-center gap-1.5 cursor-pointer ${
                    activeChannelId === c.id
                      ? "bg-[var(--org-primary-l)] text-[var(--org-primary)] dark:bg-[var(--org-primary)]/20 dark:text-white"
                      : "text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="text-gray-400 font-mono">#</span> {c.name}
                </button>
              ))}
            </div>
          )}

          {/* 2. Organization Projects Channels */}
          {categoryBuckets.projects.length > 0 && (
            <div className="flex flex-col gap-1.5 border-t dark:border-slate-800 pt-3.5">
              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest pl-2 flex items-center gap-1.5"><Sprout className="h-3 w-3 inline-block" /> Active Projects</span>
              {categoryBuckets.projects.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveChannelId(c.id)}
                  className={`w-full text-left px-3.5 py-1.5 text-xs font-semibold rounded-lg truncate transition flex items-center gap-1.5 cursor-pointer ${
                    activeChannelId === c.id
                      ? "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                      : "text-gray-600 hover:bg-gray-100 dark:text-slate-400"
                  }`}
                >
                  <Briefcase className="h-3 w-3 text-emerald-500 shrink-0" /> {c.name}
                </button>
              ))}
            </div>
          )}

          {/* 3. Standing Committees */}
          {categoryBuckets.committees.length > 0 && (
            <div className="flex flex-col gap-1.5 border-t dark:border-slate-800 pt-3.5">
              <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest pl-2 flex items-center gap-1.5"><Building className="h-3 w-3 inline-block" /> Committees</span>
              {categoryBuckets.committees.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveChannelId(c.id)}
                  className={`w-full text-left px-3.5 py-1.5 text-xs font-semibold rounded-lg truncate transition flex items-center gap-1.5 cursor-pointer ${
                    activeChannelId === c.id
                      ? "bg-purple-500/10 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400"
                      : "text-gray-600 hover:bg-gray-100 dark:text-slate-400"
                  }`}
                >
                  <Layers className="h-3 w-3 text-purple-500 shrink-0" /> {c.name}
                </button>
              ))}
            </div>
          )}

          {/* 4. Private / Executive Channels */}
          {categoryBuckets.private.length > 0 && (
            <div className="flex flex-col gap-1.5 border-t dark:border-slate-800 pt-3.5">
              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-450 uppercase tracking-widest pl-2 flex items-center gap-1.5"><Lock className="h-3 w-3 inline-block" /> Private Audits</span>
              {categoryBuckets.private.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveChannelId(c.id)}
                  className={`w-full text-left px-3.5 py-1.5 text-xs font-semibold rounded-lg truncate transition flex items-center gap-1.5 cursor-pointer ${
                    activeChannelId === c.id
                      ? "bg-amber-500/10 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400"
                      : "text-gray-600 hover:bg-gray-100 dark:text-slate-400"
                  }`}
                >
                  <Lock className="h-3 w-3 text-amber-500 shrink-0" /> {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t bg-slate-100/50 dark:bg-slate-900/60 border-gray-200 dark:border-slate-800 flex items-center gap-3">
          <Avatar name={user?.full_name || "M"} size="xs" src={user?.avatar_url} />
          <div className="flex flex-col leading-tight select-none truncate">
            <span className="font-semibold text-xs text-gray-900 dark:text-white">{user?.full_name}</span>
            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-mono font-bold capitalize">@{activeMember?.role}</span>
          </div>
        </div>
      </aside>

      {/* Main chat stream */}
      <section className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 justify-between">
        {activeChannel ? (
          <>
            <div className="px-3.5 sm:px-5 py-2.5 sm:py-3 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/40 dark:bg-slate-900/40 shrink-0 min-h-[56px]">
              {/* Left Channel Name & Info */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <button 
                  onClick={() => setActiveChannelId("")}
                  className="md:hidden p-1 -ml-1 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 focus:outline-none shrink-0 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Back to channels"
                >
                  <ArrowLeft className="h-4.5 w-4.5" />
                </button>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-display font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate">
                    #{activeChannel?.name || "General"}
                  </span>
                  {activeChannel.is_private && <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                </div>
                <span className="hidden sm:inline text-slate-300 dark:text-slate-700 shrink-0">•</span>
                <span className="hidden sm:inline-block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
                  {activeChannel.channel_type || "General Room"}
                </span>
              </div>

              {/* Right Action Buttons */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 max-w-full overflow-x-auto no-scrollbar whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => {
                    if (!isVideoAllowed) {
                      setUpgradeModalFeature("video");
                      setShowPollUpgradeModal(true);
                      addToast("Live Video Meetings require Growth or Pro tier", "info");
                      return;
                    }
                    setOpenMeetModal(true);
                  }}
                  className={`inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 h-8 sm:h-8.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all shadow-3xs cursor-pointer ${
                    !isVideoAllowed
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                      : "bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white"
                  }`}
                  title={!isVideoAllowed ? "Upgrade to Growth or Pro to start live video meetings" : "Launch live multi-person video meeting with collaborative doc sharing and in-call chat"}
                >
                  {!isVideoAllowed ? <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" /> : <Video className="h-3.5 w-3.5 shrink-0" />}
                  <span className="hidden md:inline">Start Live Meet</span>
                  <span className="md:hidden">Meet</span>
                  {!isVideoAllowed && (
                    <span className="hidden lg:inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400">
                      Growth
                    </span>
                  )}
                </button>

                <div className="relative group shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isPollAllowed) {
                        setUpgradeModalFeature("polls");
                        setShowPollUpgradeModal(true);
                        addToast("Upgrade to Growth to enable polls", "info");
                        return;
                      }
                      setOpenPollModal(true);
                    }}
                    title={!isPollAllowed ? "Upgrade to Growth to enable polls" : "Launch Poll"}
                    className={`inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 h-8 sm:h-8.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all shadow-3xs cursor-pointer ${
                      !isPollAllowed
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                        : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800"
                    }`}
                  >
                    {!isPollAllowed ? <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" /> : <BarChart3 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                    <span>Launch Poll</span>
                    {!isPollAllowed && (
                      <span className="hidden lg:inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400">
                        Growth
                      </span>
                    )}
                  </button>

                  {/* Clean hover tooltip explaining plan upgrade without deforming button */}
                  {isFreePlan && (
                    <div className="absolute right-0 top-full mt-1.5 hidden group-hover:flex flex-col items-end z-50 pointer-events-none">
                      <div className="bg-slate-900 text-white text-[11px] font-medium py-1 px-2.5 rounded-lg shadow-lg whitespace-nowrap flex items-center gap-1.5 border border-slate-700">
                        <Lock className="h-3 w-3 text-amber-400 shrink-0" />
                        <span>Upgrade to Growth to enable polls</span>
                      </div>
                    </div>
                  )}
                </div>

                <Badge color={activeChannel.is_private ? "amber" : "blue"} className="shrink-0 hidden xs:inline-flex">
                  {activeChannel.is_private ? "Staff Only" : "Active Feed"}
                </Badge>
              </div>
            </div>

            {/* Message Stream */}
            <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-5 bg-slate-50/10">
              {messages && messages.length > 0 ? (
                messages.map((m) => {
                  const isMe = m.sender_id === activeMember?.user_id;
                  const isVoice = m.message_type === "voice";
                  const isFile = m.message_type === "file";
                  const isImage = m.message_type === "image";
                  const isPoll = m.message_type === "poll";


                  return (
                    <div key={m.id} className={`flex gap-3.5 max-w-[85%] ${isMe ? "self-end flex-row-reverse" : "self-start"} animate-in slide-in-from-bottom-2`}>
                      <Avatar name={m.sender_name || "M"} size="xs" src={m.sender_avatar} />
                      <div className="flex flex-col gap-1">
                        <span className={`text-xs text-gray-500 dark:text-slate-400 font-medium leading-none ${isMe ? "text-right" : "text-left"}`}>
                          {m.sender_name} <span className="text-[10px] font-mono text-gray-400 font-normal ml-1">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>

                        {/* Rendering logic based on message types */}
                        {isVoice ? (
                          /* Interactive Voice Note bubble */
                          <div className="bg-slate-900 text-white rounded-2xl rounded-tr-none p-3.5 flex items-center gap-3 shadow-md border border-slate-700 min-w-[240px]">
                            <div 
                              onClick={() => handlePlayVoice(m.file_url)}
                              className="h-9 w-9 bg-emerald-500 hover:bg-emerald-600 cursor-pointer rounded-full flex items-center justify-center text-white font-black hover:scale-105 transition"
                            >
                              <Volume2 className="h-4.5 w-4.5 animate-pulse" />
                            </div>
                            <div className="flex flex-col flex-1 leading-none select-none">
                              <span className="text-[11px] font-bold text-emerald-400">Recorded Audio Note</span>
                              {/* Simple wave animation line */}
                              <div className="flex gap-0.5 mt-2 h-4 items-center">
                                <span className="h-1.5 w-1 bg-slate-400 rounded-full animate-pulse" />
                                <span className="h-3.5 w-1 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
                                <span className="h-2 w-1 bg-slate-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                                <span className="h-4 w-1 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                                <span className="h-3 w-1 bg-emerald-300 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                                <span className="h-1 w-1 bg-slate-400 rounded-full animate-pulse" />
                              </div>
                            </div>
                            <span className="text-[10px] font-mono text-gray-400 font-medium">{m.voice_duration_seconds || 42}s</span>
                          </div>
                        ) : isFile ? (
                          /* Document attachment */
                          <div 
                            onClick={() => {
                              if (m.file_url) {
                                setActivePreviewDoc({
                                  url: m.file_url,
                                  name: m.file_name || "Document File",
                                  isImage: false
                                });
                              }
                            }}
                            className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-gray-200 dark:border-slate-700 rounded-2xl p-3.5 w-64 shadow-xs flex items-center justify-between cursor-pointer hover:border-indigo-550 dark:hover:border-indigo-600 transition group"
                            title="Click to preview file inside chat"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <FileText className="h-8 w-8 text-rose-500 group-hover:text-rose-600 shrink-0 transition" />
                              <div className="flex flex-col min-w-0 leading-none">
                                <span className="text-xs font-semibold text-gray-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">{m.file_name}</span>
                                <span className="text-[10px] text-gray-400 font-mono mt-1 font-medium">
                                  {m.file_size ? (typeof m.file_size === 'number' ? `${(m.file_size / (1024 * 1024)).toFixed(2)} MB` : m.file_size) : "0.50 MB"}
                                </span>
                              </div>
                            </div>
                            <ResolvedDownloadLink fileUrl={m.file_url} fileName={m.file_name}>
                              <div 
                                onClick={(e) => e.stopPropagation()} 
                                className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition pl-2.5 shrink-0"
                                title="Download attachment"
                              >
                                <Download className="h-4.5 w-4.5" />
                              </div>
                            </ResolvedDownloadLink>
                          </div>
                        ) : isImage ? (
                          /* Land Outreach Image attachment */
                          <div 
                            onClick={() => {
                              if (m.file_url) {
                                setActivePreviewDoc({
                                  url: m.file_url,
                                  name: m.file_name || "Image Attachment",
                                  isImage: true
                                });
                              }
                            }}
                            className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden p-1.5 max-w-[250px] shadow-xs flex flex-col gap-1 cursor-pointer hover:border-indigo-550 dark:hover:border-indigo-600 transition"
                            title="Click to zoom / preview image inside chat"
                          >
                            <ResolvedImage src={m.file_url} alt="Outreach photo upload" className="rounded-xl w-full h-32 object-cover" referrerPolicy="no-referrer" bucketName="chat-attachments" />
                            <span className="text-[10px] text-gray-400 dark:text-slate-400 px-1 truncate font-mono font-medium">{m.file_name}</span>
                          </div>
                        ) : isPoll ? (
                          <PollMessageComponent message={m} currentUserId={activeMember?.user_id || ""} />
                        ) : (
                          /* Regular message bubble */
                          <div className={`p-3 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                            isMe ? "bg-[var(--org-primary)] text-white rounded-tr-none" : "bg-gray-100 border border-gray-200 text-gray-900 rounded-tl-none dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                          }`}>
                            {m.text}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <EmptyState title="Silence in the Room" message="Be the first to post a community update in #channel." />
              )}

              {/* simulated countdown banner when recording */}
              {isRecording && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between text-xs animate-pulse text-red-600 font-bold self-center w-64 select-none leading-none mb-4">
                  <span className="flex items-center gap-2"><Mic className="h-4 w-4 text-red-500 shrink-0" /> Recording audio memo...</span>
                  <span className="font-mono">
                    {Math.max(0, Math.floor((300 - recCountdown) / 60))}:
                    {Math.max(0, (300 - recCountdown) % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}
              
              {/* Dummy scroll state target anchor */}
              <div ref={messagesEndRef} />
            </div>

            {/* Input typing panel */}
            <form onSubmit={handleSend} className="p-4 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 flex items-center gap-2.5 relative">
              {/* Media menu */}
              <div className="relative">
                <input
                  type="file"
                  id="chat-image-picker"
                  className="hidden"
                  accept="image/*"
                  onChange={handleChatFileChange}
                />
                <input
                  type="file"
                  id="chat-document-picker"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.md,.rtf"
                  onChange={handleChatFileChange}
                />
                <input
                  type="file"
                  id="chat-any-picker"
                  className="hidden"
                  onChange={handleChatFileChange}
                />

                <Button size="md" variant="outline" type="button" onClick={() => setShowAttachMenu(!showAttachMenu)} className="px-2 sm:px-3 border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-300 h-10 sm:h-12 w-10 sm:w-12 flex items-center justify-center transition-all hover:bg-sky-100 dark:hover:bg-sky-900/30 rounded-xl cursor-pointer shadow-sm shrink-0" title="Attach Files">
                  <Paperclip className="h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
                {showAttachMenu && (
                  <div className="absolute bottom-14 sm:bottom-16 left-0 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl p-2.5 shadow-2xl w-60 max-w-[calc(100vw-2rem)] flex flex-col gap-1 z-50 select-none animate-in slide-in-from-bottom-3 duration-100">
                    <button type="button" onClick={() => { setShowNewDocModal(true); setShowAttachMenu(false); }} className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-bold cursor-pointer flex items-center gap-3 text-emerald-700 dark:text-emerald-400 text-[12px] transition">
                      <PlusCircle className="h-5 w-5" /> Create & Attach New Doc
                    </button>
                    <div className="h-px bg-gray-100 dark:border-slate-800 my-1" />
                    <button type="button" onClick={() => document.getElementById("chat-document-picker")?.click()} className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer flex items-center gap-3 text-gray-700 dark:text-gray-200 text-[12px] transition">
                      <FileText className="h-5 w-5 text-rose-500" /> Upload Any Document
                    </button>
                    <button type="button" onClick={() => document.getElementById("chat-image-picker")?.click()} className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer flex items-center gap-3 text-gray-700 dark:text-gray-200 text-[12px] transition">
                      <Image className="h-5 w-5 text-blue-500" /> Upload Any Image
                    </button>
                    <button type="button" onClick={() => document.getElementById("chat-any-picker")?.click()} className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer flex items-center gap-3 text-gray-700 dark:text-gray-200 text-[12px] transition">
                      <Paperclip className="h-5 w-5 text-indigo-500" /> Any Other Local File
                    </button>
                    <div className="h-px bg-gray-100 dark:border-slate-800 my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        if (isFreePlan) {
                          setShowPollUpgradeModal(true);
                          addToast("Upgrade to Growth to enable polls", "info");
                          return;
                        }
                        setOpenPollModal(true);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg font-bold cursor-pointer flex items-center justify-between text-[12px] transition ${
                        isFreePlan
                          ? "text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                          : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                      }`}
                      title={isFreePlan ? "Upgrade to Growth to enable polls" : "Launch Poll"}
                    >
                      <div className="flex items-center gap-3">
                        <PieChart className={`h-5 w-5 ${isFreePlan ? "text-slate-400" : "text-emerald-500"}`} />
                        <span>Launch Poll</span>
                      </div>
                      {isFreePlan && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">
                          <Lock className="h-3 w-3" /> Upgrade to Growth
                        </span>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Dedicated Live Poll Trigger Icon next to the file/attachment wrapper with Tooltip and Lock for Free Plan */}
              <div className="relative group shrink-0">
                <Button
                  size="md"
                  variant="outline"
                  type="button"
                  onClick={() => {
                    if (isFreePlan) {
                      setShowPollUpgradeModal(true);
                      addToast("Upgrade to Growth to enable polls", "info");
                      return;
                    }
                    setOpenPollModal(true);
                  }}
                  className={`px-2 sm:px-3 h-10 sm:h-12 w-10 sm:w-12 flex items-center justify-center transition-all rounded-xl cursor-pointer shadow-xs shrink-0 relative ${
                    isFreePlan
                      ? "border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      : "border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                  }`}
                  title={isFreePlan ? "Upgrade to Growth to enable polls" : "Launch Poll"}
                >
                  <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" />
                  {isFreePlan && (
                    <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white rounded-full p-0.5 shadow-xs">
                      <Lock className="h-3 w-3" />
                    </span>
                  )}
                </Button>

                {/* Free plan hover tooltip */}
                {isFreePlan && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-50 pointer-events-none">
                    <div className="bg-slate-900 text-white text-[11px] font-medium py-1.5 px-3 rounded-lg shadow-lg whitespace-nowrap flex items-center gap-1.5 border border-slate-700">
                      <Lock className="h-3 w-3 text-amber-400" />
                      <span>Upgrade to Growth to enable polls</span>
                    </div>
                    <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1 border-r border-b border-slate-700"></div>
                  </div>
                )}
              </div>

              <div className="flex-1 relative min-w-0">
                <Input
                  type="text"
                  placeholder="Send message to room..."
                  value={typedMessage}
                  onChange={(e) => setTypedMessage(e.target.value)}
                  className="w-full border-gray-200 dark:border-slate-700 dark:bg-slate-800 text-gray-900 dark:text-white rounded-xl h-10 sm:h-12 pl-3 sm:pl-4 pr-10 sm:pr-12 text-xs sm:text-sm focus:ring-1 focus:ring-[var(--org-primary)] font-semibold"
                />
                <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button 
                    type="button" 
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="text-gray-400 hover:text-amber-500 transition cursor-pointer p-1"
                  >
                    <Smile className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute bottom-14 sm:bottom-16 right-0 w-[280px] sm:w-[310px] max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl p-3 shadow-2xl grid grid-cols-5 gap-2 z-50 animate-in fade-in zoom-in duration-100">
                      {commonEmojis.map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            setTypedMessage(prev => prev + emoji);
                            setShowEmojiPicker(false);
                          }}
                          className="h-10 w-10 sm:h-11 sm:w-11 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl text-xl sm:text-2xl cursor-pointer transition shadow-xs hover:scale-110 active:scale-95"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Button type="submit" size="md" className="h-10 sm:h-12 px-3.5 sm:px-5 bg-[var(--org-primary)] text-white hover:opacity-95 shadow-sm rounded-xl transition-all cursor-pointer shrink-0">
                <Send className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
            </form>

            {/* New Doc Modal */}
            <Modal isOpen={showNewDocModal} onClose={() => setShowNewDocModal(false)} title="Create New Document Attachment">
              <div className="flex flex-col gap-4 p-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-none">Document Title</label>
                  <Input 
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                    placeholder="report.md"
                    className="font-mono text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-none">Content (Markdown supported)</label>
                  <textarea
                    value={newDocContent}
                    onChange={(e) => setNewDocContent(e.target.value)}
                    className="w-full h-64 p-4 bg-gray-50 dark:bg-slate-850 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:ring-1 focus:ring-emerald-500 outline-none transition"
                    placeholder="# Project Update\n\nEnter details here..."
                  />
                </div>
                <div className="flex justify-end gap-3 mt-2">
                  <Button variant="outline" onClick={() => setShowNewDocModal(false)}>Cancel</Button>
                  <Button onClick={handleCreateAndAttachDoc} className="bg-emerald-600 hover:bg-emerald-700 text-white">Create & Send</Button>
                </div>
              </div>
            </Modal>
          </>
        ) : (
          <EmptyState title="No active channels" message="Select a chat channel on left pane to engage." />
        )}
      </section>

      {/* 1. Add channel Modal */}
      <Modal open={openChanModal} onClose={() => setOpenChanModal(false)} title="Launch Dynamic Topic Sub-Group">
        <form onSubmit={handleCreateChannelSubmit} className="flex flex-col gap-4.5">
          <Input label="Sub-group Topic Name" value={newChanName} onChange={(e) => setNewChanName(e.target.value)} placeholder="e.g. kirehe-reforestation-ops" />
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-700">Topic Categorization Link</label>
            <select
              value={newChanCategory}
              onChange={(e) => setNewChanCategory(e.target.value)}
              className="w-full text-sm rounded-lg border bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 px-3 py-2 text-gray-805 select-none focus:ring-1 focus:ring-[var(--org-primary)] font-semibold"
            >
              <option value="general">Conversations</option>
              <option value="project">Organization Project Core Team</option>
              <option value="committee">Standing Sub-Committee</option>
              <option value="private">Executive Auditing Module</option>
            </select>
          </div>

          <div className="flex items-center gap-2.5 mt-2 self-start select-none">
            <input
              type="checkbox"
              id="is_private_topic"
              checked={newChanPrivate}
              onChange={(e) => setNewChanPrivate(e.target.checked)}
              className="h-4.5 w-4.5 rounded cursor-pointer"
            />
            <label htmlFor="is_private_topic" className="text-xs font-bold text-gray-700 cursor-pointer select-none">
              Require explicit approval list (Private Channel)
            </label>
          </div>

          {newChanCategory === "general" ? (
            <div className="bg-emerald-500/5 text-emerald-800 p-3 rounded-lg text-xs leading-relaxed font-semibold flex items-start gap-2">
              <span className="mt-0.5"><AlertTriangle className="h-4 w-4" /></span> By default, all member accounts join the <strong>#general</strong> group conversation channel automatically.
            </div>
          ) : (
            <div className="flex flex-col gap-2 border-t pt-3 mt-1">
              <label className="text-xs font-semibold text-gray-700">Select which members must join this group</label>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2.5 flex flex-col gap-2 bg-slate-50/50 dark:bg-slate-900">
                {orgMembers && orgMembers.length > 0 ? (
                  orgMembers.map((m) => {
                    const isChecked = selectedMemberIds.includes(m.id);
                    return (
                      <label key={m.id} className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-gray-800 dark:text-gray-200">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMemberIds([...selectedMemberIds, m.id]);
                            } else {
                              setSelectedMemberIds(selectedMemberIds.filter(id => id !== m.id));
                            }
                          }}
                          className="h-4 w-4 rounded cursor-pointer"
                        />
                        <span>{m.user?.full_name || "Unknown Member"} ({m.role === "org_admin" ? "Admin" : "Member"})</span>
                      </label>
                    );
                  })
                ) : (
                  <span className="text-xs text-gray-400 p-1">No other organization members found.</span>
                )}
              </div>
            </div>
          )}

          <Button type="submit" className="w-full mt-4 py-2.5 font-bold text-xs uppercase tracking-wider">
            Confirm Topic Channel
          </Button>
        </form>
      </Modal>

      {/* Real-Time Polling Modal */}
      <Modal open={openPollModal} onClose={() => setOpenPollModal(false)} title="Create Real-Time Community Poll">
        <form onSubmit={handleCreatePollSubmit} className="flex flex-col gap-5 p-1">
          {/* Elegant header description inside the modal */}
          <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/80 dark:border-emerald-900/30 rounded-2xl p-4 flex gap-3 items-start">
            <div className="h-9 w-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/20">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-gray-900 dark:text-slate-100">Community Consensus Poll</span>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-normal">
                Publish a live interactive choice inside the chat channel. Normal members can immediately see results and cast single-choice votes in real time.
              </p>
            </div>
          </div>

          {/* Question section */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider font-mono">
                Poll Question
              </label>
              <span className="text-[10px] text-gray-400 font-medium">Keep it concise</span>
            </div>
            <Input
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              placeholder="e.g. Which native species should we prioritize for Mount Kigali?"
              className="font-semibold text-sm border-gray-200 dark:border-slate-800 focus:border-emerald-500 focus:ring-emerald-500/10 py-3 rounded-xl shadow-sm"
              maxLength={150}
              autoFocus
            />
          </div>

          {/* Options list section */}
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider font-mono">
                Response Choices
              </label>
              <span className="text-[10px] text-gray-400 font-medium font-mono">
                {pollOpts.length} options
              </span>
            </div>

            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
              {pollOpts.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2 group">
                  {/* Beautiful option numbering/prefix badge */}
                  <span className="h-7 w-7 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-[10px] font-mono font-bold text-gray-500 dark:text-slate-400 flex items-center justify-center shrink-0">
                    {(idx + 1).toString().padStart(2, "0")}
                  </span>

                  <Input
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...pollOpts];
                      newOpts[idx] = e.target.value;
                      setPollOpts(newOpts);
                    }}
                    placeholder={`e.g. Option ${idx + 1}`}
                    className="font-semibold text-xs flex-1 border-gray-200 dark:border-slate-800 focus:border-emerald-500 focus:ring-emerald-500/10 rounded-xl"
                  />

                  {pollOpts.length > 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newOpts = pollOpts.filter((_, i) => i !== idx);
                        setPollOpts(newOpts);
                      }}
                      className="text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 p-2 rounded-xl transition cursor-pointer shrink-0 border border-transparent hover:border-rose-100 dark:hover:border-rose-950"
                      title="Remove Option"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Elegant Dashed "Add Option" button */}
            <button
              type="button"
              onClick={() => setPollOpts([...pollOpts, ""])}
              className="w-full py-2.5 rounded-xl border border-dashed border-gray-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-700 text-xs font-bold text-gray-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 bg-transparent hover:bg-emerald-50/10 dark:hover:bg-emerald-950/5"
            >
              <Plus className="h-4 w-4 text-emerald-500" /> Add Another Option Choice
            </button>
          </div>

          {pollError && (
            <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 p-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 mt-1 border border-rose-100 dark:border-rose-950/40 animate-pulse">
              <AlertCircle className="h-4.5 w-4.5" />
              <span>{pollError}</span>
            </div>
          )}

          {/* Footer controls */}
          <div className="flex justify-end gap-3 mt-4 border-t pt-4 border-gray-150 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpenPollModal(false)}
              className="rounded-xl px-4 py-2 text-xs font-bold font-mono"
            >
              Discard
            </Button>
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/10 transition-all duration-200"
            >
              Launch Community Poll
            </Button>
          </div>
        </form>
      </Modal>

      {/* Feature Upgrade Restriction Modal for Free Plan Users */}
      <Modal
        open={showPollUpgradeModal}
        onClose={() => setShowPollUpgradeModal(false)}
        title={upgradeModalFeature === "video" ? "Upgrade to Growth to Enable Live Video Meetings" : "Upgrade to Growth to Enable Polls"}
      >
        <div className="flex flex-col gap-4 p-2 text-center items-center">
          <div className="h-14 w-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
            <Lock className="h-7 w-7" />
          </div>
          <div className="space-y-1.5 max-w-sm">
            <div className="inline-block px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wider font-mono">
              Growth & Pro Feature
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              {upgradeModalFeature === "video"
                ? "Live Video Meetings with Multi-Peer Video"
                : "Real-Time Interactive Decision Polls"}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {upgradeModalFeature === "video"
                ? "Live camera streaming, collaborative in-meeting document co-authoring, and crystal audio channels are available on Growth and Pro plans."
                : "Interactive multi-choice decision polls, anonymous quorum audits, and exportable tallies are available on Growth and Pro plans."}
            </p>
          </div>

          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-left w-full text-xs space-y-1.5">
            <span className="font-bold text-emerald-800 dark:text-emerald-300 block">With Growth and Pro Plans you get:</span>
            <ul className="text-emerald-700 dark:text-emerald-400 text-[11px] space-y-1">
              {upgradeModalFeature === "video" ? (
                <>
                  <li>• High-definition multi-peer video & audio meetings</li>
                  <li>• Built-in real-time markdown document scratchpad</li>
                  <li>• Native in-call channel chat and attendance verification</li>
                </>
              ) : (
                <>
                  <li>• Unlimited interactive multi-choice decision polls</li>
                  <li>• Real-time anonymous or attributed vote auditing</li>
                  <li>• Automatic consensus calculation & exportable tallies</li>
                </>
              )}
            </ul>
          </div>

          <div className="flex gap-3 w-full mt-2">
            <Button
              variant="outline"
              onClick={() => setShowPollUpgradeModal(false)}
              className="flex-1 text-xs font-bold"
            >
              Maybe Later
            </Button>
            <Button
              onClick={() => {
                setShowPollUpgradeModal(false);
                navigate("/dashboard/settings");
              }}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
            >
              View Upgrade Plans
            </Button>
          </div>
        </div>
      </Modal>

      {/* 3. Media / Document Inline Preview Modal */}
      {activePreviewDoc && (
        <Modal 
          open={true} 
          onClose={() => setActivePreviewDoc(null)} 
          title={`Preview: ${activePreviewDoc.name}`}
          size="full"
        >
          <div className="flex flex-col gap-4 select-none h-full w-full flex-1">
            <div className="bg-slate-100 dark:bg-slate-950 p-4 rounded-xl border border-gray-200 dark:border-slate-800 flex justify-center items-center w-full flex-1 min-h-0">
              {!resolvedPreviewUrl ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
                  <span className="text-xs text-gray-500">Resolving secure file link...</span>
                </div>
              ) : (() => {
                const url = resolvedPreviewUrl;
                const lowerUrl = activePreviewDoc.url.toLowerCase();
                const lowerName = activePreviewDoc.name.toLowerCase();
                
                const isImg = activePreviewDoc.isImage || lowerUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)/) || lowerName.match(/\.(jpeg|jpg|gif|png|webp|svg)/);
                const isPdf = lowerUrl.endsWith('.pdf') || lowerName.endsWith('.pdf');
                const isExcel = lowerUrl.match(/\.(xls|xlsx|csv)/) || lowerName.match(/\.(xls|xlsx|csv)/);
                const isDoc = lowerUrl.match(/\.(doc|docx)/) || lowerName.match(/\.(doc|docx)/);
                
                if (isImg) {
                  return (
                    <img 
                      src={url} 
                      alt={activePreviewDoc.name} 
                      className="max-h-[68vh] md:max-h-[72vh] w-auto object-contain rounded-lg shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                  );
                } else if (isPdf) {
                  return (
                    <iframe 
                      src={`${url}#toolbar=0`} 
                      title={activePreviewDoc.name} 
                      className="w-full h-full min-h-[64vh] rounded-lg border border-gray-350 bg-white shadow-inner flex-1" 
                    />
                  );
                } else if (isExcel) {
                  return (
                    <div className="text-center p-8 flex flex-col items-center gap-3">
                      <FileSpreadsheet className="h-16 w-16 text-emerald-500 animate-bounce" />
                      <h4 className="font-bold text-sm text-gray-900 dark:text-white">{activePreviewDoc.name}</h4>
                      <p className="text-xs text-gray-500 max-w-sm">Spreadsheet file stored securely on Supabase Storage. You can download this file locally to edit in Microsoft Excel or Google Sheets.</p>
                    </div>
                  );
                } else if (isDoc) {
                  return (
                    <div className="text-center p-8 flex flex-col items-center gap-3">
                      <FileText className="h-16 w-16 text-rose-500 animate-pulse" />
                      <h4 className="font-bold text-sm text-gray-900 dark:text-white">{activePreviewDoc.name}</h4>
                      <p className="text-xs text-gray-500 max-w-sm">Word document stored securely on Supabase Storage. Click download below to view and edit locally.</p>
                    </div>
                  );
                } else {
                  return (
                    <div className="text-center p-8 flex flex-col items-center gap-3">
                      <Paperclip className="h-16 w-16 text-indigo-500" />
                      <h4 className="font-bold text-sm text-gray-900 dark:text-white">{activePreviewDoc.name}</h4>
                      <p className="text-xs text-gray-500 max-w-sm">Binary file stored securely on Supabase Storage. Download file to view locally on your device.</p>
                    </div>
                  );
                }
              })()}
            </div>

            <div className="flex gap-3 justify-end items-center border-t pt-4 border-gray-100 dark:border-slate-800">
              <Button 
                variant="outline" 
                onClick={() => setActivePreviewDoc(null)}
                className="font-bold border-gray-300 text-gray-700 hover:bg-gray-50 px-5"
              >
                Close Preview
              </Button>
              <ResolvedDownloadLink fileUrl={activePreviewDoc.url} fileName={activePreviewDoc.name} bucketName="chat-attachments" className="no-underline">
                <Button className="font-bold bg-[var(--org-primary)] text-white hover:opacity-90 flex items-center gap-2 px-5">
                  <Download className="h-4 w-4" /> Download File
                </Button>
              </ResolvedDownloadLink>
            </div>
          </div>
        </Modal>
      )}

      {/* 4. Live Multi-Person Video Meet Modal with Shared Docs & Live Chat */}
      <ChatVideoMeetModal
        open={openMeetModal}
        onClose={() => setOpenMeetModal(false)}
        channelName={activeChannel?.name || "General"}
        activeOrg={activeOrg}
        activeMember={activeMember}
        members={orgMembers || []}
        documents={documents}
      />
    </div>
  );
};

// ==========================================
// 4. GOALS METRIC SLIDERS
// ==========================================
export const GoalsTracker: React.FC = () => {
  return <GoalsPage />;
};

const OldGoalsTracker: React.FC = () => {
  const { t } = useLocalTranslation();
  const { activeOrg, activeMember } = useOrgStore();
  const { data: goals, refetch } = useGoals(activeOrg?.id);
  const createMutation = useCreateGoal();
  const updateMutation = useUpdateGoalProgress();
  const updateGoalMutation = useUpdateGoal();
  const deleteGoalMutation = useDeleteGoal();

  const [searchQuery, setSearchQuery] = useState("");
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openUpdateModal, setOpenUpdateModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  // New/Edit Goal Fields
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [target, setTarget] = useState<number>(100);
  const [unit, setUnit] = useState("");
  const [deadline, setDeadline] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [startProgress, setStartProgress] = useState<number>(0);

  // Progress update value
  const [sliderVal, setSliderVal] = useState<number>(0);
  const [progressNote, setProgressNote] = useState("");
  const [showAdvancedOpts, setShowAdvancedOpts] = useState(true);

  // Only roles different from "member" are allowed to set and manage goals; members have read-only access
  const canSetGoals = !!activeMember && activeMember.role !== "member";

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !deadline) return;

    try {
      await createMutation.mutateAsync({
        org_id: activeOrg?.id || "",
        title: title,
        description: desc,
        target: target || null,
        unit: unit || null,
        deadline: new Date(deadline).toISOString(),
        visibility: "public",
        is_pinned: isPinned,
        current_progress: startProgress
      });
      setOpenAddModal(false);
      setTitle("");
      setDesc("");
      setTarget(100);
      setUnit("");
      setDeadline("");
      setIsPinned(false);
      setStartProgress(0);
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal || !title || !deadline) return;

    try {
      await updateGoalMutation.mutateAsync({
        id: selectedGoal.id,
        org_id: activeOrg?.id || "",
        title,
        description: desc,
        target: target || 100,
        unit: unit || "",
        deadline: new Date(deadline).toISOString(),
        is_pinned: isPinned,
      });
      setOpenEditModal(false);
      setTitle("");
      setDesc("");
      setTarget(100);
      setUnit("");
      setDeadline("");
      setIsPinned(false);
      setSelectedGoal(null);
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;

    try {
      await updateMutation.mutateAsync({
        goalId: selectedGoal.id,
        value: sliderVal,
        orgId: activeOrg?.id || "",
        note: progressNote || "Updated progress dynamically"
      });
      setOpenUpdateModal(false);
      setProgressNote("");
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredGoals = goals?.filter((goal) => {
    const matchesSearch = searchQuery === "" ||
      goal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      goal.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  }) || [];

  return (
    <PlanGatedView requiredTier="growth" featureName="Bento Goals & Strategic Analytics">
      <div className="flex flex-col gap-6 select-none font-sans w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 shrink-0">
          <div className="min-w-0">
            <h2 className="text-xl md:text-2xl font-bold font-display text-gray-901 truncate">{t("goals_tab_title", "Strategic Goals Tracker")}</h2>
            <p className="text-xs text-gray-500 font-medium">{t("goals_tab_sub", "Verify team metrics, deadlines, and agricultural achievements.")}</p>
          </div>
          {canSetGoals ? (
            <Button icon={<Plus className="h-4 w-4 shrink-0" />} onClick={() => setOpenAddModal(true)} className="whitespace-nowrap shrink-0">
              {t("btn_add_goal", "Add Goal")}
            </Button>
          ) : (
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 whitespace-nowrap shrink-0">
              <Eye className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Member Read-Only
            </span>
          )}
        </div>

      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder={t("search_goals_placeholder", "Search goals by title or description...")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-xs rounded-lg border bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 pl-9 pr-4 py-2.5 outline-none focus:ring-1 focus:ring-emerald-600 text-stone-850 dark:text-white transition"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {filteredGoals.length > 0 ? (
          filteredGoals.map((goal) => {
            const progressNum = Number(goal.current_progress) || 0;
            const targetNum = Number(goal.target) > 0 ? Number(goal.target) : 100;
            const percentage = Math.min(100, Math.round((progressNum / targetNum) * 100));
            const daysToDeadline = Math.max(0, Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 3600 * 24)));
            const isNearDeadline = daysToDeadline <= 7;

            return (
              <div
                key={goal.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-3xs flex flex-col justify-between transition relative hover:shadow-xs hover:border-slate-300 dark:hover:border-slate-700 animate-in fade-in"
              >
                {goal.is_pinned && (
                  <span className="absolute -top-2.5 left-4 bg-[#156c45] dark:bg-emerald-600 text-[9px] px-2.5 py-0.5 text-white font-bold rounded-full font-mono uppercase tracking-wider shadow-3xs">
                    {t("Pinned")}
                  </span>
                )}

                <div>
                  <div className="flex justify-between items-start mb-3 gap-4">
                    <div className="flex flex-col">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display tracking-tight leading-tight flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-[#156c45] dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <Target className="h-4 w-4" />
                        </div>
                        <span>{goal.title}</span>
                      </h3>
                      {goal.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                          {goal.description}
                        </p>
                      )}
                    </div>

                    {canSetGoals && (
                      <div className="flex items-center gap-1 shrink-0 select-none">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[10px] font-bold px-2 py-1 leading-none h-fit"
                          onClick={() => {
                            setSelectedGoal(goal);
                            setSliderVal(goal.current_progress);
                            setProgressNote(goal.last_note || "");
                            setOpenUpdateModal(true);
                          }}
                        >
                          {t("btn_update_progress", "Update")}
                        </Button>
                        <button
                          onClick={() => {
                            setSelectedGoal(goal);
                            setTitle(goal.title);
                            setDesc(goal.description);
                            setTarget(goal.target || 100);
                            setUnit(goal.unit || "");
                            const formattedDate = goal.deadline ? new Date(goal.deadline).toISOString().split('T')[0] : "";
                            setDeadline(formattedDate);
                            setIsPinned(goal.is_pinned);
                            setStartProgress(goal.starting_progress || 0);
                            setOpenEditModal(true);
                          }}
                          className="p-1 px-1.5 text-slate-400 hover:text-[#156c45] hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition shrink-0"
                          title="Edit Goal details"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm("Are you sure you want to delete this goal?")) {
                              await deleteGoalMutation.mutateAsync({ id: goal.id, org_id: activeOrg?.id || "" });
                              refetch();
                            }
                          }}
                          className="p-1 px-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition shrink-0"
                          title="Delete Goal"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Clean progress visualization reach bar */}
                  <div className="mt-4 w-full bg-slate-50/80 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                    <div className="flex items-center justify-between mb-2 text-[10px] font-bold text-slate-600 dark:text-slate-400 font-mono tracking-wider">
                      <span>{t("STRATEGIC MILESTONE REACH")}</span>
                      <span className="text-[#156c45] dark:text-emerald-400 font-bold">{percentage}%</span>
                    </div>

                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
                      <div
                        className="bg-[#156c45] dark:bg-emerald-500 h-full transition-all duration-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-mono">
                      <span>
                        Current: <span className="font-bold text-slate-900 dark:text-white">{progressNum.toLocaleString()}</span>
                      </span>
                      <span>
                        Target: <span className="font-bold text-slate-900 dark:text-slate-200">{targetNum.toLocaleString()} {goal.unit || "%"}</span>
                      </span>
                    </div>

                    {goal.last_note && (
                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 leading-normal font-sans italic flex items-start gap-1.5">
                        <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 px-1.5 py-0.5 bg-slate-200/70 dark:bg-slate-800 rounded font-normal shrink-0">{t("Note")}</span>
                        <span className="mt-0.5">"{goal.last_note}"</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px] font-medium text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3 mt-4 leading-none font-sans select-none shrink-0">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                    {t("Deadline:")} <span className="text-slate-800 dark:text-slate-200 font-semibold">{new Date(goal.deadline).toLocaleDateString()}</span>
                  </span>

                  {isNearDeadline ? (
                    <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded">
                      {daysToDeadline} {t("days left")}
                    </span>
                  ) : (
                    <span className="text-[#156c45] dark:text-emerald-400 font-bold flex items-center gap-1">
                      {daysToDeadline} {t("days left")}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-2">
            <EmptyState title={t("empty_goals_title", "No Goals Created")} message={t("empty_goals_msg", "Let's formulate some greening and administrative milestones.")} />
          </div>
        )}
      </div>

      {/* Add goal Modal */}
      <Modal open={openAddModal} onClose={() => setOpenAddModal(false)} title={t("modal_create_goal_title", "Formulate Goal Plan")}>
        <form onSubmit={handleCreate} className="flex flex-col gap-4 text-sm font-semibold text-slate-800 dark:text-slate-200">
          <Input label={t("lbl_goal_title", "Goal Title")} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Conduct market research" required />
          <Input label={t("lbl_goal_desc", "Short Description / Focus Area")} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What metrics are we resolving?" />
          
          <Input label={t("lbl_goal_deadline", "Target Deadline Date")} type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />

          <div className="flex justify-between items-center text-sm mt-2 border-t border-gray-150 dark:border-slate-800 pt-4">
             <span className="font-bold text-slate-700 dark:text-slate-300">{t("lbl_additional_options", "Additional Options")}</span>
             <button type="button" onClick={() => setShowAdvancedOpts(!showAdvancedOpts)} className="text-emerald-600 dark:text-emerald-450 font-bold hover:underline text-xs">
               {showAdvancedOpts ? t("lbl_hide_advanced", "Hide Advanced Content") : t("lbl_show_advanced", "Show Advanced Options")}
             </button>
          </div>
          
          {showAdvancedOpts && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="flex flex-col gap-4 overflow-hidden">
              <div className="grid grid-cols-2 gap-4">
                <Input label={t("lbl_goal_target", "Target Value (Optional)")} type="number" value={target || ""} onChange={(e) => setTarget(parseInt(e.target.value) || 0)} placeholder="100" />
                <Input label={t("lbl_goal_unit", "Metrics Unit")} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. Units / Percentage" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input label={t("lbl_goal_start", "Starting Progress Value (Optional)")} type="number" value={startProgress || ""} onChange={(e) => setStartProgress(parseInt(e.target.value) || 0)} placeholder="e.g. 1000" />
              </div>

              <div className="flex items-center gap-3 mt-2 self-start select-none">
                <input
                  type="checkbox"
                  id="pin_tick_goal"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-gray-300"
                />
                <label htmlFor="pin_tick_goal" className="text-xs font-bold text-gray-700 dark:text-slate-300 cursor-pointer">
                  {t("lbl_pin_grid", "Pin on main dashboard metrics grid")}
                </label>
              </div>
            </motion.div>
          )}

          <Button type="submit" className="w-full mt-4 py-3 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 active:scale-98 transition text-white">
            {t("btn_save_goal", "Save Goal Draft")}
          </Button>
        </form>
      </Modal>

      {/* Edit goal details Modal */}
      <Modal open={openEditModal} onClose={() => setOpenEditModal(false)} title={t("modal_edit_goal_details", "Edit Goal Details")}>
        <form onSubmit={handleEditDetails} className="flex flex-col gap-4 text-xs font-semibold">
          <Input label={t("lbl_goal_title", "Goal Title")} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Conduct market research" required />
          <Input label={t("lbl_goal_desc", "Short Description")} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What metrics are we resolving?" />
          
          <Input label={t("lbl_goal_deadline", "Target Deadline Date")} type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />

          <div className="grid grid-cols-2 gap-4">
            <Input label={t("lbl_goal_target", "Target Value")} type="number" value={target || ""} onChange={(e) => setTarget(parseInt(e.target.value) || 0)} required />
            <Input label={t("lbl_goal_unit", "Metrics Unit")} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. Units" />
          </div>

          <div className="flex items-center gap-3 mt-2 self-start select-none">
            <input
              type="checkbox"
              id="pin_tick_goal_edit"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="h-4.5 w-4.5 rounded border-gray-300"
            />
            <label htmlFor="pin_tick_goal_edit" className="text-xs font-bold text-gray-750 cursor-pointer">
              {t("lbl_pin_grid", "Pin on main dashboard metrics grid")}
            </label>
          </div>

          <Button type="submit" className="w-full mt-4 py-2.5">
            {t("btn_update_goal", "Save Changes")}
          </Button>
        </form>
      </Modal>

      {/* Update Progress Slider Modal */}
      <Modal open={openUpdateModal} onClose={() => setOpenUpdateModal(false)} title={t("modal_edit_goal_title", "Update Progress")}>
        {selectedGoal && (() => {
          const targetNum = Number(selectedGoal.target) > 0 ? Number(selectedGoal.target) : 100;
          const currentValNum = Number(sliderVal) || 0;
          const livePercentage = Math.min(100, Math.round((currentValNum / targetNum) * 100));

          return (
            <form onSubmit={handleUpdate} className="flex flex-col gap-6 text-sm">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-750 font-display">{selectedGoal.title}</span>
                <Badge color="blue">{sliderVal.toLocaleString()} {selectedGoal.unit || "%"}</Badge>
              </div>
              
              <div className="flex flex-col gap-2.5 w-full mt-2">
                <input
                  type="range"
                  min="0"
                  max={targetNum}
                  value={sliderVal}
                  onChange={(e) => setSliderVal(parseInt(e.target.value) || 0)}
                  className="w-full accent-[var(--org-primary)] cursor-pointer h-2 bg-gray-200 rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[11px] text-gray-400 font-mono">
                  <span>0</span>
                  <span>{targetNum.toLocaleString()} ({selectedGoal.unit || "%"})</span>
                </div>

                {/* Dynamic live-updating progress bar fill - matching actual percentage exactly */}
                <div className="mt-4.5 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-gray-150 dark:border-slate-800 flex flex-col gap-2.5 shadow-3xs select-none">
                  <div className="flex justify-between items-center text-xs font-bold text-stone-700 dark:text-stone-300">
                    <span className="flex items-center gap-1">
                      <Target className="h-4 w-4 text-blue-600 animate-pulse" /> Live Percentage Fill:
                    </span>
                    <span className="text-blue-600 dark:text-blue-450 font-black font-mono text-sm leading-none bg-blue-50 dark:bg-slate-800 px-2.5 py-1 rounded-sm">
                      {livePercentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-slate-800 h-3.5 rounded-full overflow-hidden shadow-inner border border-gray-100 dark:border-slate-800">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-150 ease-out border-r border-white/40 shadow-[inset_-3px_0_4px_rgba(0,0,0,0.1)]"
                      style={{ width: `${livePercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 border-t pt-4">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-350">
                  Or enter precise progress numeric value:
                </label>
                <Input
                  type="number"
                  min="0"
                  value={sliderVal}
                  onChange={(e) => setSliderVal(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full"
                  placeholder="e.g. 25000"
                />
              </div>

              <div className="flex flex-col gap-1.5 border-t pt-4">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-350">
                  Add progress update status comment / note:
                </label>
                <textarea
                  value={progressNote}
                  onChange={(e) => setProgressNote(e.target.value)}
                  className="w-full text-xs font-semibold text-stone-850 dark:text-slate-100 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans leading-relaxed"
                  placeholder="e.g. Completed initial phase of the project or updated records"
                  rows={2}
                />
              </div>

              <Button type="submit" className="w-full mt-2 py-2.5">
                {t("btn_confirm_progress", "Confirm New Progress")}
              </Button>
            </form>
          );
        })()}
      </Modal>
    </div>
    </PlanGatedView>
  );
};

// ==========================================
// 5. MEETINGS COMPACT MINUTES COMPILER
// ==========================================
export const MeetingsMinutes: React.FC = () => {
  const { t } = useLocalTranslation();
  const { activeOrg, activeMember } = useOrgStore();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { data: meets, refetch } = useMeetings(activeOrg?.id);
  const createMutation = useCreateMeeting();
  const updateMutation = useUpdateMeeting();

  const getAttendanceCountForMeeting = (meetId: string) => {
    try {
      const stored = localStorage.getItem(`meet_attn_${meetId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed.length;
      }
    } catch (_) {}
    return 0;
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openRescheduleModal, setOpenRescheduleModal] = useState(false);
  const [selectedMeet, setSelectedMeet] = useState<Meeting | null>(null);

  // Create fields
  const [title, setTitle] = useState("");
  const [dateVal, setDateVal] = useState("");
  const [dur, setDur] = useState<number>(60);
  const [loc, setLoc] = useState("");
  const [link, setLink] = useState("");
  const [agenda, setAgenda] = useState<string>("");

  // Edit fields (Minutes)
  const [minutes, setMinutes] = useState("");

  // Attendance fields
  const [attendanceMeeting, setAttendanceMeeting] = useState<Meeting | null>(null);
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const { data: orgMembersList } = useMembers(activeOrg?.id);
  const { data: checkedInMemberIds } = useMeetingAttendance(attendanceMeeting?.id);
  const saveAttendanceMutation = useSaveMeetingAttendance();
  const [tempCheckedInIds, setTempCheckedInIds] = useState<string[]>([]);

  // Advanced Attendance Fields
  const [locationType, setLocationType] = useState<"on-site" | "online">("on-site");
  const [latitude, setLatitude] = useState<string>("-1.9441"); // Kigali default
  const [longitude, setLongitude] = useState<string>("30.0619");
  const [radiusMeters, setRadiusMeters] = useState<number>(100);
  const [qrModalMeet, setQrModalMeet] = useState<Meeting | null>(null);

  const handleGetMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude.toFixed(6));
          setLongitude(pos.coords.longitude.toFixed(6));
          addToast("Coordinates captured successfully from your active device GPS!", "success");
        },
        (err) => {
          addToast("Could not locate device coordinates. Check GPS status or permissions.", "error");
        }
      );
    } else {
      addToast("Your browser does not support geolocation.", "error");
    }
  };

  useEffect(() => {
    if (checkedInMemberIds) {
      setTempCheckedInIds(checkedInMemberIds);
    } else {
      setTempCheckedInIds([]);
    }
  }, [checkedInMemberIds]);

  const isAdmin = activeMember?.role === "org_admin";

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeet || !dateVal || !loc) return;

    if (new Date(dateVal) < new Date()) {
      addToast("Error: Rescheduled meeting date and time must be set in the future!", "error");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: selectedMeet.id,
        org_id: activeOrg?.id || "",
        date_time: new Date(dateVal).toISOString(),
        location: loc,
        link,
        status: "scheduled",
        location_type: locationType,
        latitude: parseFloat(latitude) || 0,
        longitude: parseFloat(longitude) || 0,
        radius_meters: radiusMeters,
      });
      setOpenRescheduleModal(false);
      setSelectedMeet(null);
      refetch();
      addToast("Meeting rescheduled successfully!", "success");
    } catch (err: any) {
      addToast(err?.message || "Failed to reschedule meeting", "error");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dateVal || !loc) return;

    if (new Date(dateVal) < new Date()) {
      addToast("Error: The meeting date and time must be set from the current moment forward!", "error");
      return;
    }

    const agendaItems = agenda
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => ({ title: line.trim(), duration: 20 }));

    try {
      await createMutation.mutateAsync({
        org_id: activeOrg?.id || "",
        title,
        date_time: new Date(dateVal).toISOString(),
        duration: dur,
        location: loc,
        link,
        agenda: agendaItems,
        location_type: locationType,
        latitude: parseFloat(latitude) || 0,
        longitude: parseFloat(longitude) || 0,
        radius_meters: radiusMeters,
      });
      setOpenAddModal(false);
      setTitle("");
      setDateVal("");
      setLoc("");
      setLink("");
      setAgenda("");
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveMinutes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeet) return;

    try {
      await updateMutation.mutateAsync({
        id: selectedMeet.id,
        org_id: activeOrg?.id || "",
        minutes,
        status: "completed"
      });
      setOpenEditModal(false);
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredMeets = meets?.filter((m) => {
    const matchesSearch = searchQuery === "" ||
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.agenda && m.agenda.some((ag: any) => ag.title.toLowerCase().includes(searchQuery.toLowerCase()))) ||
      (m.minutes && m.minutes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  }) || [];

  return (
    <PlanGatedView requiredTier="pro" featureName="Governance Quorum Meetings Validation & Audit Tracker">
      <div className="flex flex-col gap-6 select-none font-sans w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 shrink-0">
          <div className="min-w-0">
            <h2 className="text-xl md:text-2xl font-bold font-display text-gray-901 truncate">{t("meet_tab_title", "Meetings & Minutes Console")}</h2>
            <p className="text-xs text-gray-500">{t("meet_tab_sub", "Coordinate boards, generate agendas, and log auditable transcripts.")}</p>
          </div>
          {isAdmin && (
            <Button icon={<Plus className="h-4 w-4 shrink-0" />} onClick={() => setOpenAddModal(true)} className="whitespace-nowrap shrink-0">
              {t("btn_schedule_meet", "Schedule Meeting")}
            </Button>
          )}
        </div>

      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder={t("search_meetings_placeholder", "Search meetings by title, location or agenda...")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-xs rounded-lg border bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 pl-9 pr-4 py-2.5 outline-none focus:ring-1 focus:ring-emerald-600 text-stone-850 dark:text-white transition"
        />
      </div>

      <div className="flex flex-col gap-6 w-full">
        {filteredMeets.length > 0 ? (
          filteredMeets.map((m) => {
            const isPassed = new Date(m.date_time) < new Date();
            const displayStatus = isPassed ? "completed" : m.status;
            return (
              <Card key={m.id} title={m.title} action={
                <div className="flex flex-wrap items-center gap-2">
                  <Badge color={displayStatus === "completed" ? "green" : (m.location_type === "online" ? "blue" : "emerald")}>
                    {m.location_type === "online" ? "💻 ONLINE" : "📍 PHYSICAL"}
                  </Badge>
                  <Badge color={displayStatus === "completed" ? "green" : "blue"}>{t(displayStatus)}</Badge>
                  
                  {isAdmin && m.location_type === "online" && displayStatus !== "completed" && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={async () => {
                        try {
                          await updateMutation.mutateAsync({
                            id: m.id,
                            org_id: activeOrg?.id || "",
                            is_broadcasted: true
                          });
                          addToast("Online attendance confirmation notification broadcasted!", "success");
                          refetch();
                        } catch {
                          addToast("Failed to send broadcast notice.", "error");
                        }
                      }}
                    >
                      <Megaphone className="h-3.5 w-3.5 mr-1" />
                      <span>{m.is_broadcasted ? "Re-Broadcast" : "Broadcast Alert"}</span>
                    </Button>
                  )}

                  {isAdmin && m.location_type !== "online" && displayStatus !== "completed" && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                      onClick={() => setQrModalMeet(m)}
                    >
                      <QrCode className="h-3.5 w-3.5 mr-1" />
                      <span>QR Code Ticket</span>
                    </Button>
                  )}

                  <Button size="sm" variant="outline" icon={<Users className="h-4 w-4" />} className="flex items-center gap-1 cursor-pointer" onClick={() => setAttendanceMeeting(m)}>
                    <span>{t("Attendance")}</span>
                  </Button>
                  
                  {isAdmin && (
                    <Button size="sm" variant="outline" onClick={() => {
                      setSelectedMeet(m);
                      setDateVal(m.date_time.slice(0, 16));
                      setLoc(m.location);
                      setLink(m.link || "");
                      setMinutes(m.minutes || "");
                      setLocationType(m.location_type || "on-site");
                      setLatitude((m.latitude || -1.9441).toString());
                      setLongitude((m.longitude || 30.0619).toString());
                      setRadiusMeters(m.radius_meters || 100);
                      setOpenRescheduleModal(true);
                    }}>
                      {t("Update Time")}
                    </Button>
                  )}
                  {isAdmin && displayStatus !== "completed" && (
                    <Button size="sm" onClick={() => {
                      setSelectedMeet(m);
                      setMinutes(m.minutes || "");
                      setOpenEditModal(true);
                    }}>
                      {t("btn_log_minutes", "Log Minutes")}
                    </Button>
                  )}
                </div>
              }>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-xs font-semibold text-gray-550 border-b pb-4">
                <div className="flex flex-col gap-1">
                  <span>{t("Schedule:")} <span className="text-gray-900 font-mono">{new Date(m.date_time).toLocaleDateString()} at {new Date(m.date_time).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span></span>
                  <span>{t("Duration:")} <span className="text-gray-900 font-mono">{m.duration} {t("mins", "mins")}</span></span>
                </div>
                <div className="flex flex-col gap-1">
                  <span>{t("Location:")} <span className="text-gray-901">{m.location}</span></span>
                  {m.link && <span>{t("Conference Link:")} <a href={m.link} target="_blank" className="text-[var(--org-primary)] hover:underline truncate handle-link">{m.link}</a></span>}
                  <span className="flex items-center gap-1 mt-0.5">{t("Attendance:")} <span className="px-2 py-0.5 rounded-lg bg-emerald-55 text-emerald-800 font-mono font-bold text-[10px] border border-emerald-200">{getAttendanceCountForMeeting(m.id) || m.attendance_count || 0} {t("Present")}</span></span>
                </div>
              </div>

              {m.agenda && m.agenda.length > 0 && (
                <div className="mb-4 text-xs">
                  <span className="font-bold text-gray-400 uppercase tracking-widest block mb-2 leading-none">{t("Structured Agendas")}</span>
                  <ul className="list-decimal pl-4 flex flex-col gap-1.5 leading-normal font-semibold">
                    {m.agenda.map((ag: any, idx: number) => (
                      <li key={idx} className="text-gray-700">
                        {ag.title} <span className="text-[10px] text-gray-400 font-normal">({ag.duration} {t("mins")})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {m.minutes && (
                <div className="p-4 bg-gray-50 rounded-xl mt-4 border text-xs">
                  <span className="font-bold text-emerald-800 uppercase tracking-wider block mb-2 leading-none">{t("lbl_minutes_transcript", "Audited Minutes Transcript")}</span>
                  <p className="text-gray-750 font-medium leading-relaxed font-mono whitespace-pre-wrap">{m.minutes}</p>
                </div>
              )}
            </Card>
          );
         })
        ) : (
          <EmptyState title={t("empty_meets_title", "No Meetings Drafted")} message={t("empty_meets_msg", "Coordinate operational syncing or committee agenda meetings.")} />
        )}
      </div>

      {/* Schedule meeting modal */}
      <Modal open={openAddModal} onClose={() => setOpenAddModal(false)} title={t("modal_schedule_meet_title", "Log Organization Meeting Invite")}>
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input label={t("lbl_meet_title", "Meeting Title / Subject")} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Strategic Planning Q2 Audit" />
          <div className="grid grid-cols-2 gap-4 animate-in">
            <Input label={t("Schedule Date & Time")} type="datetime-local" value={dateVal} onChange={(e) => setDateVal(e.target.value)} min={new Date().toISOString().slice(0, 16)} />
            <Input label={t("lbl_meet_hours", "Duration Minutes")} type="number" value={dur || ""} onChange={(e) => setDur(parseInt(e.target.value) || 0)} placeholder="60" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label={t("lbl_meet_venue", "Location Venue")} value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="e.g. Rwanda Nursery Hub Kayonza" />
            <Input label={t("lbl_meet_link", "Virtual Link")} value={link} onChange={(e) => setLink(e.target.value)} placeholder="e.g. meet.google.com/abc-def" />
          </div>

          {/* Location Type selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-700">Location Type / Attendance Mode</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
              <button
                type="button"
                onClick={() => setLocationType("on-site")}
                className={`py-1.5 text-xs font-bold rounded-md transition ${locationType === "on-site" ? "bg-white text-stone-900 shadow-sm" : "text-gray-500"}`}
              >
                📍 Physical (On-Site)
              </button>
              <button
                type="button"
                onClick={() => setLocationType("online")}
                className={`py-1.5 text-xs font-bold rounded-md transition ${locationType === "online" ? "bg-white text-stone-900 shadow-sm" : "text-gray-500"}`}
              >
                💻 Virtual (Online Broadcast)
              </button>
            </div>
          </div>

          {locationType === "on-site" && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex flex-col gap-3 animate-in">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800">
                📍 PHYSICAL GEOLOCATION FENCING SECURITY
              </span>
              <div className="grid grid-cols-2 gap-3">
                <Input 
                  label="Venue Latitude" 
                  value={latitude} 
                  onChange={(e) => setLatitude(e.target.value)} 
                  placeholder="e.g. -1.9441" 
                />
                <Input 
                  label="Venue Longitude" 
                  value={longitude} 
                  onChange={(e) => setLongitude(e.target.value)} 
                  placeholder="e.g. 30.0619" 
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Input 
                  label="Fence Radius (meters)" 
                  type="number" 
                  value={radiusMeters} 
                  onChange={(e) => setRadiusMeters(parseInt(e.target.value) || 100)} 
                  placeholder="100" 
                />
                <button
                  type="button"
                  onClick={handleGetMyLocation}
                  className="px-3.5 py-2.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-extrabold transition shrink-0 mt-5 flex items-center gap-1 cursor-pointer"
                >
                  📍 Use Current Location
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-xs font-semibold text-gray-700">{t("lbl_meet_agenda", "Agenda Bullet points (One per Line)")}</label>
            <textarea
              className="w-full text-sm rounded-lg border bg-white border-gray-300 p-3 min-h-24 outline-none focus:ring-2 focus:ring-[var(--org-primary)] focus:border-transparent transition"
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="e.g. Financial checkmarks&#10;Volunteering timeline logs&#10;Project resource distribution"
            />
          </div>

          <Button type="submit" className="w-full mt-4 py-2.5">
            {t("btn_confirm_schedule", "Schedule Invitation")}
          </Button>
        </form>
      </Modal>

      {/* Log Minutes Modal */}
      <Modal open={openEditModal} onClose={() => setOpenEditModal(false)} title={t("modal_log_minutes_title", "Log Auditable Minutes Draft")}>
        {selectedMeet && (
          <form onSubmit={handleSaveMinutes} className="flex flex-col gap-4">
            <p className="text-xs text-gray-500 mb-2">
              {t("Generate audited minutes transcript for **{title}**. This will mark meeting as **Completed** and publish details.", { title: selectedMeet.title })}
            </p>

            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-xs font-semibold text-gray-750">{t("lbl_minutes_memo", "Audited Transcripts & Resolution Notes")}</label>
              <textarea
                className="w-full text-sm rounded-lg border bg-white border-gray-300 p-3.5 min-h-48 font-mono outline-none focus:ring-2 focus:ring-[var(--org-primary)]"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="### Q2 Operations Overview&#10;&#10;Key points:&#10;1. Sourcing confirmed..."
              />
            </div>

            <Button type="submit" className="w-full py-2.5">
              {t("btn_publish_lock", "Publish & Lock Transcripts")}
            </Button>
          </form>
        )}
      </Modal>

      {/* Reschedule Meeting Modal */}
      <Modal open={openRescheduleModal} onClose={() => setOpenRescheduleModal(false)} title={t("Reschedule Meeting Invite", "Reschedule Meeting Invite")}>
        {selectedMeet && (
          <form onSubmit={handleReschedule} className="flex flex-col gap-4">
            <Input label={t("lbl_meet_title", "Meeting Title / Subject")} value={selectedMeet.title} disabled />
            <div className="grid grid-cols-2 gap-4">
              <Input label={t("Schedule Date & Time")} type="datetime-local" value={dateVal} onChange={(e) => setDateVal(e.target.value)} min={new Date().toISOString().slice(0, 16)} required />
              <Input label={t("lbl_meet_venue", "Location Venue")} value={loc} onChange={(e) => setLoc(e.target.value)} required />
            </div>
            <Input label={t("lbl_meet_link", "Virtual Link")} value={link} onChange={(e) => setLink(e.target.value)} placeholder="e.g. meet.google.com/abc-def" />

            {/* Location Type selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-700">Location Type / Attendance Mode</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setLocationType("on-site")}
                  className={`py-1.5 text-xs font-bold rounded-md transition ${locationType === "on-site" ? "bg-white text-stone-900 shadow-sm" : "text-gray-500"}`}
                >
                  📍 Physical (On-Site)
                </button>
                <button
                  type="button"
                  onClick={() => setLocationType("online")}
                  className={`py-1.5 text-xs font-bold rounded-md transition ${locationType === "online" ? "bg-white text-stone-900 shadow-sm" : "text-gray-500"}`}
                >
                  💻 Virtual (Online Broadcast)
                </button>
              </div>
            </div>

            {locationType === "on-site" && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex flex-col gap-3 animate-in">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800">
                  📍 PHYSICAL GEOLOCATION FENCING SECURITY
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <Input 
                    label="Venue Latitude" 
                    value={latitude} 
                    onChange={(e) => setLatitude(e.target.value)} 
                    placeholder="e.g. -1.9441" 
                  />
                  <Input 
                    label="Venue Longitude" 
                    value={longitude} 
                    onChange={(e) => setLongitude(e.target.value)} 
                    placeholder="e.g. 30.0619" 
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <Input 
                    label="Fence Radius (meters)" 
                    type="number" 
                    value={radiusMeters} 
                    onChange={(e) => setRadiusMeters(parseInt(e.target.value) || 100)} 
                    placeholder="100" 
                  />
                  <button
                    type="button"
                    onClick={handleGetMyLocation}
                    className="px-3.5 py-2.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-extrabold transition shrink-0 mt-5 flex items-center gap-1 cursor-pointer"
                  >
                    📍 Use Current Location
                  </button>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full mt-4 py-2.5">
              {t("Save Rescheduled Time", "Save Rescheduled Time")}
            </Button>
          </form>
        )}
      </Modal>

      {/* Meeting Attendance Modal */}
      <Modal open={!!attendanceMeeting} onClose={() => setAttendanceMeeting(null)} title={t("Meeting Attendance Checklist", "Meeting Attendance Checklist")}>
        {attendanceMeeting && (() => {
          const attendanceAccess = canAccessFeature(activeOrg, "qr_attendance");
          const isAllowed = attendanceAccess.allowed;

          return (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-gray-500">
                {t("Log which cooperative members checked-in and attended the physical or virtual session for **{title}**.", { title: attendanceMeeting.title })}
              </p>

              {!isAllowed && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
                  <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <p className="font-bold text-amber-900 dark:text-amber-200">Attendance Marking Locked on Free Forever Plan</p>
                    <p className="text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
                      Marking live member attendance is disabled on the Free tier. Unlock attendance marking across all events and meetings with the <strong>Event & Attendance Package ($4/mo / 5,000 RWF)</strong> or by upgrading to <strong>Starter, Growth, or Pro</strong>.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-1.5 px-3 rounded-xl cursor-pointer"
                        onClick={() => {
                          setAttendanceMeeting(null);
                          navigate("/dashboard/settings?tab=subscription");
                        }}
                      >
                        Activate Event Package ($4/mo) / Upgrade
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Attendance Fast Controls */}
              <div className="flex flex-wrap items-center gap-2.5 justify-end border-b pb-3 mb-1">
                <button
                  type="button"
                  disabled={!isAllowed}
                  onClick={() => {
                    if (!isAllowed) {
                      addToast("Marking attendance requires the Event Package or a Paid Plan.", "error");
                      return;
                    }
                    const allActive = orgMembersList?.filter(m => m.status === "active").map((m) => m.id) || [];
                    setTempCheckedInIds(allActive);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 border whitespace-nowrap shrink-0 ${
                    !isAllowed
                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                      : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 cursor-pointer border-emerald-200"
                  }`}
                >
                  {t("Mark All Present")}
                </button>
                <button
                  type="button"
                  disabled={!isAllowed}
                  onClick={() => {
                    if (!isAllowed) return;
                    setTempCheckedInIds([]);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 border ${
                    !isAllowed
                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                      : "bg-rose-50 text-rose-800 hover:bg-rose-100 cursor-pointer border-rose-200"
                  }`}
                >
                  {t("Clear Attendance")}
                </button>
              </div>

              {/* Filter Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t("Filter members by name...")}
                  value={attendanceSearch}
                  onChange={(e) => setAttendanceSearch(e.target.value)}
                  className="w-full text-xs rounded-lg border bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 pl-9 pr-4 py-2 outline-none focus:ring-1 focus:ring-emerald-600 text-stone-850 dark:text-white transition"
                />
              </div>

              {/* Attendees list */}
              <div className="max-h-72 overflow-y-auto flex flex-col gap-1.5 pr-1 py-1">
                {orgMembersList && orgMembersList.filter(m => m.status === "active").length > 0 ? (
                  orgMembersList
                    .filter(m => m.status === "active")
                    .filter(m => !attendanceSearch || m.user?.full_name?.toLowerCase().includes(attendanceSearch.toLowerCase()))
                    .map((m) => {
                      const isChecked = tempCheckedInIds.includes(m.id);
                      // Load any attendance mismatch details
                      const detailKey = `meet_att_detail_${attendanceMeeting.id}_${m.id}`;
                      const detail = (() => {
                        try {
                          const stored = localStorage.getItem(detailKey);
                          return stored ? JSON.parse(stored) : null;
                        } catch (_) {
                          return null;
                        }
                      })();

                      return (
                        <div
                          key={m.id}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all select-none ${
                            isChecked
                              ? "bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/20"
                              : "bg-white border-gray-150 hover:bg-gray-50/55 dark:bg-slate-900 dark:border-slate-800"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shadow-xs border border-emerald-200">
                              {m.user?.full_name?.charAt(0).toUpperCase() || "?"}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-gray-800 dark:text-slate-200">
                                {m.user?.full_name || "Anonymous Member"}
                              </span>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-gray-400 font-mono">
                                  Role: {m.role}
                                </span>
                                {detail && (
                                  <>
                                    <span className="text-gray-300">•</span>
                                    {detail.status === "mismatch" && (
                                      <span className="px-1.5 py-0.5 rounded-lg bg-amber-50 text-amber-800 font-mono text-[9px] border border-amber-200 flex items-center gap-1">
                                        ⚠️ Tried to Attend (Geofence Mismatch: {detail.distance_meters?.toFixed(0)}m away)
                                      </span>
                                    )}
                                    {detail.status === "attempted" && (
                                      <span className="px-1.5 py-0.5 rounded-lg bg-orange-50 text-orange-800 font-mono text-[9px] border border-orange-200 flex items-center gap-1">
                                        ⚠️ Tried to Attend (GPS Blocked)
                                      </span>
                                    )}
                                    {detail.status === "present" && (
                                      <span className="px-1.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 font-mono text-[9px] border border-emerald-200 flex items-center gap-1">
                                        ✅ Verified GPS ({detail.check_in_method === "online_confirm" ? "Online Confirm" : "On-Site"})
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {!isChecked && detail && (detail.status === "mismatch" || detail.status === "attempted") && isAllowed && (
                              <button
                                type="button"
                                onClick={() => setTempCheckedInIds([...tempCheckedInIds, m.id])}
                                className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[10px] tracking-wide transition cursor-pointer"
                              >
                                Approve Presence
                              </button>
                            )}
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={!isAllowed}
                              onChange={(e) => {
                                if (!isAllowed) {
                                  addToast("Marking attendance requires the Event Package or a Paid Plan.", "error");
                                  return;
                                }
                                if (e.target.checked) {
                                  setTempCheckedInIds([...tempCheckedInIds, m.id]);
                                } else {
                                  setTempCheckedInIds(tempCheckedInIds.filter(id => id !== m.id));
                                }
                              }}
                              className={`h-4.5 w-4.5 text-emerald-600 rounded bg-white border-gray-300 focus:ring-[var(--org-primary)] ${
                                !isAllowed ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <p className="text-center py-6 text-xs text-stone-400 font-medium font-sans">
                    {t("No members registered in this cooperative organization workspace yet.")}
                  </p>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between border-t pt-4 mt-2">
                <span className="text-xs font-bold text-stone-500 font-mono font-sans">
                  {tempCheckedInIds.length} {t("Present")} / {(orgMembersList?.filter(m => m.status === "active") || []).length} {t("Active")}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setAttendanceMeeting(null)}>
                    {t("Cancel")}
                  </Button>
                  <Button
                    size="sm"
                    disabled={!isAllowed}
                    loading={saveAttendanceMutation.isPending}
                    className={`font-bold transition flex items-center gap-1.5 ${
                      !isAllowed
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white cursor-pointer"
                    }`}
                    onClick={async () => {
                      if (!isAllowed) {
                        addToast("Marking attendance requires the Event Package or a Paid Plan.", "error");
                        return;
                      }
                      try {
                        await saveAttendanceMutation.mutateAsync({
                          meetingId: attendanceMeeting.id,
                          memberIds: tempCheckedInIds
                        });
                        addToast(t("Meeting attendance log updated successfully."), "success");
                        setAttendanceMeeting(null);
                        refetch();
                      } catch (err: any) {
                        addToast(err?.message || t("Failed to save meeting attendance"), "error");
                      }
                    }}
                  >
                    {t("Submit Attendance")}
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* QR Code Ticket Modal */}
      <Modal open={!!qrModalMeet} onClose={() => setQrModalMeet(null)} title="On-Site Attendance QR Code Ticket">
        {qrModalMeet && (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-md mb-4 border border-emerald-200 dark:border-emerald-800">
              Physical Sign-In Active
            </span>
            <p className="text-sm font-bold text-slate-900 dark:text-white mb-2 font-display">
              "{qrModalMeet.title}"
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-normal font-sans">
              Scan this dynamic ticket with any mobile smartphone or tablet camera to access the Geo-Fenced attendance verification portal.
            </p>
            
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs mb-6 flex justify-center items-center">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.origin + "/@" + activeOrg?.slug + "/checkin?meetId=" + qrModalMeet.id)}`}
                alt="Attendance Check-In QR Code"
                className="h-48 w-48 rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-lg w-full text-left font-mono text-xs text-slate-600 dark:text-slate-300 mb-3 select-all cursor-pointer">
              <p className="font-semibold text-slate-500 dark:text-slate-400 text-xs mb-1 font-sans">Access Route Link:</p>
              {window.location.origin + "/@" + activeOrg?.slug + "/checkin?meetId=" + qrModalMeet.id}
            </div>

            <Button type="button" className="w-full" onClick={() => setQrModalMeet(null)}>
              Done
            </Button>
          </div>
        )}
      </Modal>
    </div>
    </PlanGatedView>
  );
};

// ==========================================
// 6. DOCUMENTS CENTER MODULE
// ==========================================
export const DocumentsCenter: React.FC = () => {
  const { t } = useLocalTranslation();
  const { activeOrg, activeMember } = useOrgStore();
  const { user } = useAuthStore();
  const { addToast } = useToast();
  const location = useLocation();
  const { data: dbDocs, refetch } = useV2Documents(activeOrg?.id);
  const { data: members = [] } = useMembers(activeOrg?.id);
  const uploadMutation = useSubmitDocument();
  const updateDocMutation = useUpdateDocument();
  const deleteDocMutation = useDeleteDocument();

  const [searchQuery, setSearchQuery] = useState("");
  // drag and drop states
  const [isDragging, setIsDragging] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docName, setDocName] = useState("");
  const [uploaderName, setUploaderName] = useState("");
  const [isPrivateDoc, setIsPrivateDoc] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [duplicateFound, setDuplicateFound] = useState<any | null>(null);

  // Sharing & Access Management Modal States
  const [sharingModalDoc, setSharingModalDoc] = useState<Document | null>(null);
  const [manageRecipientIds, setManageRecipientIds] = useState<string[]>([]);
  const [manageIsPrivate, setManageIsPrivate] = useState<boolean>(false);
  const [manageMemberSearch, setManageMemberSearch] = useState("");

  // Document Office States
  const [isOfficeOpen, setIsOfficeOpen] = useState(false);
  const [isCertBadgeModalOpen, setIsCertBadgeModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  const [activePreviewDoc, setActivePreviewDoc] = useState<{ url: string; name: string } | null>(null);
  const [resolvedPreviewUrl, setResolvedPreviewUrl] = useState<string>("");

  useEffect(() => {
    if (activePreviewDoc?.url) {
      let active = true;
      resolveFileUrl(activePreviewDoc.url).then((url) => {
        if (active) setResolvedPreviewUrl(url);
      });
      return () => {
        active = false;
      };
    } else {
      setResolvedPreviewUrl("");
    }
  }, [activePreviewDoc]);

  useEffect(() => {
    if (location.state?.previewUrl) {
      setActivePreviewDoc({
        url: location.state.previewUrl,
        name: location.state.previewName || "Preview Document"
      });
      // clear the state after displaying it to avoid re-triggering on reload
      try {
        window.history.replaceState({}, document.title);
      } catch (e) {
        console.warn("Could not replace history state:", e);
      }
    }
  }, [location]);

  useEffect(() => {
    if (user?.full_name) {
      setUploaderName(user.full_name);
    }
  }, [user]);

  const triggerFileInput = () => {
    document.getElementById("doc-file-picker")?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setDocName(file.name);
      setSelectedRecipients([]);
      setMemberSearchQuery("");
      setOpenModal(true);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setDocName(file.name);
      setSelectedRecipients([]);
      setMemberSearchQuery("");
      setOpenModal(true);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim() || !selectedFile) return;

    // Detect duplicate
    const existingDup = dbDocs?.find(
      (d) => d.name.toLowerCase().trim() === docName.toLowerCase().trim()
    );

    if (existingDup && !duplicateFound) {
      setDuplicateFound(existingDup);
      addToast({
        title: "Duplicate Document Detected",
        message: `A document named "${docName}" already exists. Select an option below.`,
        type: "warning"
      } as any);
      return;
    }

    try {
      addToast({
        title: "Uploading File",
        message: `Sending "${selectedFile.name}" to Supabase Storage...`,
        type: "info"
      } as any);

      // Upload actual file to Supabase Storage via proxy API
      const storageKey = await uploadFileToSupabase(selectedFile, "documents");
      
      if (duplicateFound) {
        // Overwrite existing doc
        await updateDocMutation.mutateAsync({
          id: duplicateFound.id,
          org_id: activeOrg?.id || "",
          name: docName,
          file_url: storageKey,
          file_size: `${(selectedFile.size / 1024).toFixed(1)} KB`,
          is_private: isPrivateDoc,
          recipient_member_ids: isPrivateDoc ? selectedRecipients : []
        } as any);

        addToast({
          title: "Document Updated",
          message: `Successfully overwrote existing "${docName}" in Supabase Storage bucket.`,
          type: "success"
        } as any);
      } else {
        // Create a new document
        await uploadMutation.mutateAsync({
          org_id: activeOrg?.id || "",
          name: docName,
          file_url: storageKey, // Save the unique storage key!
          file_size: `${(selectedFile.size / 1024).toFixed(1)} KB`,
          uploaded_by: user?.id || "anonymous",
          uploader_name: uploaderName || "Anonymous Representative",
          requires_acknowledgement: false,
          is_private: isPrivateDoc,
          recipient_member_ids: isPrivateDoc ? selectedRecipients : []
        });

        addToast({
          title: "Upload Successful",
          message: `Successfully stored file in Supabase Storage bucket: ${storageKey}`,
          type: "success"
        } as any);
      }

      setSelectedFile(null);
      setDocName("");
      setIsPrivateDoc(false);
      setSelectedRecipients([]);
      setMemberSearchQuery("");
      setDuplicateFound(null);
      setOpenModal(false);
      refetch();
    } catch (err: any) {
      console.error(err);
      addToast({
        title: "Upload Failed",
        message: `Failed to upload to B2 S3: ${err.message}`,
        type: "error"
      } as any);
    }
  };

  const handleResolveAsCopy = () => {
    if (!duplicateFound) return;
    const baseName = docName.trim();
    const extIndex = baseName.lastIndexOf(".");
    let newName = baseName;
    if (extIndex !== -1) {
      newName = `${baseName.slice(0, extIndex)} (Copy)${baseName.slice(extIndex)}`;
    } else {
      newName = `${baseName} (Copy)`;
    }
    setDocName(newName);
    setDuplicateFound(null);
    addToast({
      title: "File Renamed",
      message: `Updated name to "${newName}". Click upload again to confirm copy.`,
      type: "info"
    } as any);
  };

  const canManageDocs = activeMember?.role === "org_admin" || activeMember?.role === "manager" || activeMember?.role === "accountant";

  // Check if current user is the document creator or has admin permissions
  const canManageThisDoc = (doc: Document) => {
    if (canManageDocs) return true;
    return (
      doc.uploaded_by === user?.id ||
      doc.uploaded_by === activeMember?.id ||
      (user?.email && doc.uploaded_by === user.email) ||
      (activeMember?.user_id && doc.uploaded_by === activeMember.user_id) ||
      (user?.full_name && doc.uploader_name === user.full_name)
    );
  };

  // Filter letters and documents based on roles, ownership and recipient list
  const visibleDocs = dbDocs?.filter((doc) => {
    // Admins, managers, and accountants can see all documents
    if (canManageDocs) return true;

    // The creator/uploader can always see their document
    const isCreator =
      doc.uploaded_by === user?.id ||
      doc.uploaded_by === activeMember?.id ||
      (user?.email && doc.uploaded_by === user.email) ||
      (activeMember?.user_id && doc.uploaded_by === activeMember.user_id) ||
      (user?.full_name && doc.uploader_name === user.full_name);
    if (isCreator) return true;

    // Normal members can see if explicitly selected in recipient_member_ids
    const isRecipient =
      (activeMember?.id && doc.recipient_member_ids?.includes(activeMember.id)) ||
      (activeMember?.user_id && doc.recipient_member_ids?.includes(activeMember.user_id));
    if (isRecipient) return true;

    // If private or a targeted letter, hide it from non-creators & non-recipients
    if (doc.is_private || doc.is_letter) {
      return false;
    }

    return true; // standard public guidelines
  }) || [];

  const filteredDocs = visibleDocs.filter((doc) => {
    const matchesSearch = searchQuery === "" ||
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.uploaded_by && doc.uploaded_by.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.uploader_name && doc.uploader_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const handleSaveInAppDoc = async (payload: any) => {
    await uploadMutation.mutateAsync(payload);
    refetch();
  };

  const handleUpdateInAppDoc = async (payload: any) => {
    await updateDocMutation.mutateAsync(payload);
    refetch();
  };

  const handleDeleteDoc = async (id: string) => {
    if (confirm("Are you sure you want to delete this document permanently?")) {
      await deleteDocMutation.mutateAsync({ id, orgId: activeOrg?.id || "" });
      refetch();
    }
  };

  return (
    <PlanGatedView requiredTier="growth" featureKey="document_office" featureName="DocumentOffice Suite & Resource Center">
      <div className="flex flex-col gap-6 select-none font-sans w-full">
        <div className="border-b pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold font-display text-gray-910">{t("docs_tab_title", "Documents Resource Center")}</h2>
            <p className="text-xs text-gray-500">{t("docs_tab_sub", "Secure audits, Excel templates, and operational plans repository.")}</p>
          </div>

          {canManageDocs && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => setIsCertBadgeModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer whitespace-nowrap shrink-0"
                title="Design & export certificates and member badges"
              >
                <Award className="h-4 w-4 shrink-0" />
                <span>Certificate / Badge</span>
              </button>
              <button
                onClick={() => {
                  setEditingDoc(null);
                  setViewingDoc(null);
                  setIsOfficeOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>Draft Document or Letter</span>
              </button>
            </div>
          )}
        </div>

      <input
        type="file"
        id="doc-file-picker"
        className="hidden"
        onChange={handleFileChange}
        accept=".pdf,.xlsx,.xls,.docx,.doc,.png,.jpg,.jpeg"
      />

      {canManageDocs && (
        <Card title={t("lbl_upload_guidelines", "Upload New Guidelines")} padding={false} className="mb-4">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={triggerFileInput}
            className={`border-2 border-dashed m-6 rounded-xl p-10 text-center flex flex-col items-center justify-center cursor-pointer transition select-none ${
              isDragging
                ? "border-[var(--org-primary)] bg-[var(--org-primary-l)]"
                : "border-gray-200 dark:border-slate-705 hover:bg-gray-50 dark:hover:bg-slate-800"
            }`}
          >
            <FolderDot className={`h-10 w-10 mb-3 transition-colors ${isDragging ? "text-[var(--org-primary)]" : "text-gray-400"}`} />
            <span className="text-sm font-bold text-gray-700 dark:text-slate-200">{t("Drag & Drop files here, or Click to Browse")}</span>
            <span className="text-[10px] text-gray-400 mt-1.5 font-semibold">{t("Supports PDF, XLSX, DOCX, Images up to 15MB")}</span>
          </div>
        </Card>
      )}

      <Card title={t("lbl_library_files", "Library Files")} padding={false}>
        <div className="relative border-b p-3 bg-gray-50/50 dark:bg-slate-950/10 flex items-center">
          <Search className="absolute left-6 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={t("search_documents_placeholder", "Filter documents by file name...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs rounded-lg border bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 pl-9 pr-4 py-2 outline-none focus:ring-1 focus:ring-emerald-600 text-stone-850 dark:text-white transition"
          />
        </div>

        <div className="divide-y divide-gray-100 dark:divide-slate-755 text-xs md:text-sm">
          {filteredDocs.length > 0 ? (
            filteredDocs.map((doc) => {
              const isInAppFile = doc.file_type === "word" || doc.file_type === "excel";
              const canManageDoc = canManageThisDoc(doc);
              const isPrivate = !!doc.is_private;
              const hasRecipients = isPrivate && (doc.recipient_member_ids && doc.recipient_member_ids.length > 0);

              return (
                <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800 transition select-none gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${doc.file_type === "excel" ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600" : "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600"}`}>
                      {doc.file_type === "excel" ? <FileSpreadsheet className="h-5.5 w-5.5 shrink-0" /> : <FileText className="h-5.5 w-5.5 shrink-0" />}
                    </div>
                    <div className="flex flex-col truncate leading-normal">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-gray-901 dark:text-gray-100 truncate max-w-[180px] sm:max-w-xs">{doc.name}</span>
                        {doc.is_letter && (
                          <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 text-[9px] font-black uppercase rounded">
                            Co-op Letter
                          </span>
                        )}
                        {doc.file_type === "excel" && (
                          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 text-[9px] font-black uppercase rounded">
                            In-App Spreadsheet
                          </span>
                        )}
                        {doc.file_type === "word" && !doc.is_letter && (
                          <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-400 text-[9px] font-black uppercase rounded">
                            In-App Document
                          </span>
                        )}

                        {/* Privacy & Accessibility Badge */}
                        {isPrivate ? (
                          <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded flex items-center gap-1 shrink-0 ${
                            hasRecipients 
                              ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/45 dark:text-indigo-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950/45 dark:text-rose-400"
                          }`}>
                            <Lock className="h-2.5 w-2.5" />
                            {hasRecipients ? `Shared Private (${doc.recipient_member_ids?.length})` : "Private (Creator Only)"}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/45 dark:text-emerald-400 text-[9px] font-black uppercase rounded flex items-center gap-1 shrink-0">
                            <Globe className="h-2.5 w-2.5" />
                            Public
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-455 mt-1 font-semibold">
                        {t("Uploaded by:")} <strong className="text-gray-700 dark:text-slate-200">{doc.uploader_name || doc.uploaded_by}</strong> • {doc.file_size}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0 font-mono">
                    <span className="text-gray-455 text-[10px] hidden md:inline font-semibold">
                      {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ""}
                    </span>

                    {/* Manage Sharing / Accessibility Button */}
                    {canManageDoc && (
                      <button
                        onClick={() => {
                          setSharingModalDoc(doc);
                          setManageRecipientIds(doc.recipient_member_ids || []);
                          setManageIsPrivate(!!doc.is_private);
                          setManageMemberSearch("");
                        }}
                        className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 rounded-lg border border-indigo-200 dark:border-indigo-900/40 transition flex items-center gap-1.5 cursor-pointer"
                        title="Manage access permissions and recipient sharing"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Access</span>
                      </button>
                    )}

                    {isInAppFile ? (
                      <div className="flex items-center gap-1.5">
                        {canManageDocs ? (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="font-bold border-indigo-200 text-indigo-600 hover:bg-indigo-50/40 dark:border-indigo-900/40"
                            onClick={() => {
                              setViewingDoc(null);
                              setEditingDoc(doc);
                              setIsOfficeOpen(true);
                            }}
                          >
                            Open Office
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="font-bold border-gray-200"
                            onClick={() => {
                              setEditingDoc(null);
                              setViewingDoc(doc);
                              setIsOfficeOpen(true);
                            }}
                          >
                            Read File
                          </Button>
                        )}

                        {canManageDoc && (
                          <button
                            onClick={() => handleDeleteDoc(doc.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition cursor-pointer"
                            title="Delete document"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {doc.file_url ? (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="font-bold"
                            onClick={() => {
                              setActivePreviewDoc({
                                url: doc.file_url,
                                name: doc.name
                              });
                            }}
                          >
                            {t("btn_read_file", "Read File")}
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled className="font-bold">
                            {t("btn_read_file", "Read File")}
                          </Button>
                        )}

                        {canManageDoc && (
                          <button
                            onClick={() => handleDeleteDoc(doc.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition cursor-pointer"
                            title="Delete document"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center text-gray-500 font-semibold select-none flex flex-col items-center">
              <FolderDot className="h-10 w-10 text-gray-300 mb-2" />
              <span>{t("empty_docs_title", "No custom files uploaded yet")}</span>
              <p className="text-xs font-normal text-gray-400 mt-1">{t("empty_docs_msg", "Drag and drop resource guidelines to persist documents for all members.")}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Upload confirmation detail modal */}
      <Modal 
        open={openModal} 
        onClose={() => {
          setOpenModal(false);
          setDuplicateFound(null);
        }} 
        title={t("modal_upload_doc_title", "Upload Guideline Library File")}
      >
        <form onSubmit={handleUploadSubmit} className="flex flex-col gap-4">
          <Input
            label={t("lbl_doc_title", "Library Document Name")}
            value={docName}
            onChange={(e) => {
              setDocName(e.target.value);
              setDuplicateFound(null); // Reset duplicate detection if they manually edit the name
            }}
            placeholder="e.g. Cooperative Guidelines 2026.pdf"
            required
            disabled={!!duplicateFound}
          />

          <Input
            label={t("lbl_uploader_name", "Uploader Representative Name")}
            value={uploaderName}
            onChange={(e) => setUploaderName(e.target.value)}
            placeholder="e.g. Divine Uwera (Cooperative Chairperson)"
            required
            disabled={!!duplicateFound}
          />

          {/* Document privacy option checkbox */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/70 border border-gray-200 dark:border-slate-800 rounded-xl flex flex-col gap-2.5">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                id="upload_is_private"
                checked={isPrivateDoc}
                onChange={(e) => setIsPrivateDoc(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
              />
              <div>
                <span className="text-xs font-bold text-gray-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                  Make this document Private
                </span>
                <span className="text-[11px] text-gray-500 block leading-tight mt-0.5">
                  By default, only you and organization leadership can access it. You can also select specific members below.
                </span>
              </div>
            </label>

            {/* Recipient Selection if Private */}
            {isPrivateDoc && (
              <div className="mt-2 pt-2.5 border-t border-gray-200 dark:border-slate-800 flex flex-col gap-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1">
                    <UserPlus className="h-3 w-3 text-indigo-600" />
                    Share with specific members (optional):
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {selectedRecipients.length} selected
                  </span>
                </div>

                <input
                  type="text"
                  placeholder="Filter members by name..."
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  className="w-full text-xs rounded-lg border bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 px-2.5 py-1.5 outline-none focus:border-indigo-500"
                />

                <div className="max-h-36 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800 border rounded-lg bg-white dark:bg-slate-900">
                  {members
                    .filter((m) => {
                      const name = m.user?.full_name || "Member";
                      const email = m.user?.email || "";
                      return name.toLowerCase().includes(memberSearchQuery.toLowerCase()) || email.toLowerCase().includes(memberSearchQuery.toLowerCase());
                    })
                    .map((m) => {
                      const isChecked = selectedRecipients.includes(m.id);
                      return (
                        <label
                          key={m.id}
                          className="p-1.5 px-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer text-xs select-none transition"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setSelectedRecipients((prev) =>
                                  prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                                );
                              }}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                            />
                            <span className="font-semibold text-gray-800 dark:text-slate-200 truncate">
                              {m.user?.full_name || "Co-op Member"}
                            </span>
                          </div>
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-gray-500 font-bold shrink-0">
                            {m.role || "Member"}
                          </span>
                        </label>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {selectedFile && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-mono font-bold text-gray-550 flex justify-between border">
              <span>{t("Selected local file:")} {selectedFile.name}</span>
              <span>{t("Size:")} {(selectedFile.size / 1024).toFixed(1)} KB</span>
            </div>
          )}

          {duplicateFound ? (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl flex flex-col gap-3.5 animate-in fade-in zoom-in-95">
              <div className="flex gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-black text-amber-800 dark:text-amber-300">Duplicate File Detected</span>
                  <p className="text-[11px] text-amber-700/90 dark:text-amber-400/90">
                    A document with the exact name <strong>"{docName}"</strong> already exists in this organization. Please choose how you want to handle this duplicate:
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col gap-2 pt-1">
                <Button 
                  type="submit" 
                  loading={uploadMutation.isPending || updateDocMutation.isPending}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  Overwrite Existing File
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={handleResolveAsCopy}
                  className="w-full border-amber-300 text-amber-800 hover:bg-amber-100/50 dark:border-amber-850 dark:text-amber-300"
                >
                  Keep Both (Auto-Rename to "{docName.substring(0, docName.lastIndexOf(".") === -1 ? docName.length : docName.lastIndexOf("."))} (Copy){docName.substring(docName.lastIndexOf(".") === -1 ? docName.length : docName.lastIndexOf("."))}")
                </Button>
                <button 
                  type="button" 
                  onClick={() => setDuplicateFound(null)}
                  className="text-center text-[11px] text-gray-500 hover:text-gray-700 dark:hover:text-slate-350 underline pt-1 font-bold transition"
                >
                  Go Back / Choose Different Name
                </button>
              </div>
            </div>
          ) : (
            <Button type="submit" loading={uploadMutation.isPending} className="w-full mt-4 py-2.5 font-bold uppercase text-xs">
              {t("btn_confirm_upload", "Confirm Upload")}
            </Button>
          )}
        </form>
      </Modal>

      {/* Manage Access / Member Permissions Modal */}
      <Modal 
        open={!!sharingModalDoc} 
        onClose={() => setSharingModalDoc(null)} 
        title="Document Access & Member Sharing"
      >
        {sharingModalDoc && (
          <div className="flex flex-col gap-4 font-sans text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
                <span className="font-bold text-gray-900 dark:text-slate-100 truncate">
                  {sharingModalDoc.name}
                </span>
              </div>
              <span className="text-[10px] text-gray-400 font-mono shrink-0">
                {sharingModalDoc.file_size || "Doc"}
              </span>
            </div>

            {/* Privacy Toggle */}
            <div className="p-3.5 bg-white dark:bg-slate-850 rounded-xl border border-gray-200 dark:border-slate-800 flex flex-col gap-3">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={manageIsPrivate}
                  onChange={(e) => setManageIsPrivate(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 shrink-0 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-gray-800 dark:text-slate-200 block text-xs flex items-center gap-1">
                    <Lock className="h-3.5 w-3.5 text-rose-500" />
                    Private Document Restriction
                  </span>
                  <span className="text-[11px] text-gray-500 block leading-tight mt-0.5">
                    When enabled, only you (the author), organization leaders, and explicitly selected members can access this file.
                  </span>
                </div>
              </label>
            </div>

            {/* Specific Members Selection */}
            {manageIsPrivate ? (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2.5 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-gray-800 dark:text-slate-200">
                    <Users className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Shared Member Recipients</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {manageRecipientIds.length === 0 ? "Only you & leadership" : `${manageRecipientIds.length} member(s) selected`}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Search members by name or email..."
                    value={manageMemberSearch}
                    onChange={(e) => setManageMemberSearch(e.target.value)}
                    className="w-full text-xs rounded-lg border bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 px-2.5 py-1.5 outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (manageRecipientIds.length === members.length) {
                        setManageRecipientIds([]);
                      } else {
                        setManageRecipientIds(members.map((m) => m.id));
                      }
                    }}
                    className="text-[10px] font-bold text-indigo-600 hover:underline shrink-0 whitespace-nowrap cursor-pointer"
                  >
                    {manageRecipientIds.length === members.length ? "Clear All" : "Select All"}
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800 border rounded-lg bg-white dark:bg-slate-900">
                  {members
                    .filter((m) => {
                      const name = m.user?.full_name || "Member";
                      const email = m.user?.email || "";
                      return name.toLowerCase().includes(manageMemberSearch.toLowerCase()) || email.toLowerCase().includes(manageMemberSearch.toLowerCase());
                    })
                    .map((m) => {
                      const isSelected = manageRecipientIds.includes(m.id);
                      return (
                        <label
                          key={m.id}
                          className="p-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer text-xs select-none transition"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setManageRecipientIds((prev) =>
                                  prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                                );
                              }}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                            />
                            <span className="font-semibold text-gray-800 dark:text-slate-200 truncate">
                              {m.user?.full_name || "Co-op Member"}
                            </span>
                            {m.user?.email && (
                              <span className="text-[10px] text-gray-400 truncate hidden sm:inline">
                                ({m.user.email})
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-gray-500 font-bold shrink-0">
                            {m.role || "Member"}
                          </span>
                        </label>
                      );
                    })}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                <Globe className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>This file is currently <strong>Public</strong> and accessible to all registered cooperative members.</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSharingModalDoc(null)}
                className="w-1/2"
              >
                Cancel
              </Button>
              <Button
                type="button"
                loading={updateDocMutation.isPending}
                onClick={async () => {
                  try {
                    await updateDocMutation.mutateAsync({
                      id: sharingModalDoc.id,
                      org_id: activeOrg?.id || "",
                      is_private: manageIsPrivate,
                      recipient_member_ids: manageIsPrivate ? manageRecipientIds : []
                    });
                    addToast({
                      title: "Access Permissions Updated",
                      message: `Successfully updated accessibility for "${sharingModalDoc.name}".`,
                      type: "success"
                    } as any);
                    setSharingModalDoc(null);
                    refetch();
                  } catch (err: any) {
                    addToast({
                      title: "Update Failed",
                      message: err.message,
                      type: "error"
                    } as any);
                  }
                }}
                className="w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                Save Permissions
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* COMPREHENSIVE OFFICE AND VIEWING COMPONENT */}
      {isCertBadgeModalOpen && (
        <CertificateBadgeBuilderModal
          isOpen={isCertBadgeModalOpen}
          onClose={() => setIsCertBadgeModalOpen(false)}
          members={members}
        />
      )}

      {isOfficeOpen && (
        <DocumentOffice
          activeOrg={activeOrg}
          activeMember={activeMember}
          members={members}
          documents={dbDocs || []}
          onSaveDocument={handleSaveInAppDoc}
          onUpdateDocument={handleUpdateInAppDoc}
          onDeleteDocument={async (id) => {
            await deleteDocMutation.mutateAsync({ id, orgId: activeOrg?.id || "" });
            refetch();
          }}
          editingDoc={null}
          viewingDoc={null}
          onClose={() => setIsOfficeOpen(false)}
        />
      )}

      {editingDoc && (
        <DocumentOffice
          activeOrg={activeOrg}
          activeMember={activeMember}
          members={members}
          documents={dbDocs || []}
          onSaveDocument={handleSaveInAppDoc}
          onUpdateDocument={handleUpdateInAppDoc}
          onDeleteDocument={async (id) => {
            await deleteDocMutation.mutateAsync({ id, orgId: activeOrg?.id || "" });
            refetch();
          }}
          editingDoc={editingDoc}
          viewingDoc={null}
          onClose={() => setEditingDoc(null)}
        />
      )}

      {viewingDoc && (
        <DocumentOffice
          activeOrg={activeOrg}
          activeMember={activeMember}
          members={members}
          documents={dbDocs || []}
          onSaveDocument={handleSaveInAppDoc}
          onUpdateDocument={handleUpdateInAppDoc}
          onDeleteDocument={async (id) => {
            await deleteDocMutation.mutateAsync({ id, orgId: activeOrg?.id || "" });
            refetch();
          }}
          editingDoc={null}
          viewingDoc={viewingDoc}
          onClose={() => setViewingDoc(null)}
          readOnly={true}
        />
      )}

      {activePreviewDoc && (
        <Modal
          open={true}
          onClose={() => setActivePreviewDoc(null)}
          title={`Preview: ${activePreviewDoc.name}`}
          size="full"
        >
          <div className="flex flex-col gap-4 select-none h-full w-full flex-1">
            <div className="bg-slate-100 dark:bg-slate-950 p-4 rounded-xl border border-gray-200 dark:border-slate-800 flex justify-center items-center w-full flex-1 min-h-0">
              {!resolvedPreviewUrl ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
                  <span className="text-xs text-gray-500">Resolving secure file link...</span>
                </div>
              ) : (() => {
                const url = resolvedPreviewUrl;
                const lowerUrl = activePreviewDoc.url.toLowerCase();
                const lowerName = activePreviewDoc.name.toLowerCase();
                
                const isImg = lowerUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)/) || lowerName.match(/\.(jpeg|jpg|gif|png|webp|svg)/);
                const isPdf = lowerUrl.endsWith('.pdf') || lowerName.endsWith('.pdf');
                const isExcel = lowerUrl.match(/\.(xls|xlsx|csv)/) || lowerName.match(/\.(xls|xlsx|csv)/);
                const isDoc = lowerUrl.match(/\.(doc|docx)/) || lowerName.match(/\.(doc|docx)/);
                
                if (isImg) {
                  return (
                    <img 
                      src={url} 
                      alt={activePreviewDoc.name} 
                      className="max-h-[68vh] md:max-h-[72vh] w-auto object-contain rounded-lg shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                  );
                } else if (isPdf) {
                  return (
                    <iframe 
                      src={`${url}#toolbar=0`} 
                      title={activePreviewDoc.name} 
                      className="w-full h-full min-h-[64vh] rounded-lg border border-gray-350 bg-white shadow-inner flex-1" 
                    />
                  );
                } else if (isExcel) {
                  return (
                    <div className="text-center p-8 flex flex-col items-center gap-3">
                      <FileSpreadsheet className="h-16 w-16 text-emerald-500 animate-bounce" />
                      <h4 className="font-bold text-sm text-gray-900 dark:text-white">{activePreviewDoc.name}</h4>
                      <p className="text-xs text-gray-500 max-w-sm">Spreadsheet file stored securely on Supabase Storage. You can download this file locally to edit in Microsoft Excel or Google Sheets.</p>
                    </div>
                  );
                } else if (isDoc) {
                  return (
                    <div className="text-center p-8 flex flex-col items-center gap-3">
                      <FileText className="h-16 w-16 text-rose-500 animate-pulse" />
                      <h4 className="font-bold text-sm text-gray-900 dark:text-white">{activePreviewDoc.name}</h4>
                      <p className="text-xs text-gray-500 max-w-sm">Word document stored securely on Supabase Storage. Click download below to view and edit locally.</p>
                    </div>
                  );
                } else {
                  return (
                    <div className="text-center p-8 flex flex-col items-center gap-3">
                      <Paperclip className="h-16 w-16 text-indigo-500" />
                      <h4 className="font-bold text-sm text-gray-900 dark:text-white">{activePreviewDoc.name}</h4>
                      <p className="text-xs text-gray-500 max-w-sm">Binary file stored securely on Supabase Storage. Download file to view locally on your device.</p>
                    </div>
                  );
                }
              })()}
            </div>
            
            <div className="flex gap-3 justify-end items-center">
              <Button 
                variant="outline" 
                onClick={() => setActivePreviewDoc(null)}
                className="font-bold px-5"
              >
                Close
              </Button>
              
              <ResolvedDownloadLink fileUrl={activePreviewDoc.url} fileName={activePreviewDoc.name} bucketName="documents" className="no-underline">
                <Button className="font-bold bg-[var(--org-primary)] text-white hover:opacity-90 flex items-center gap-2 px-5">
                  <Download className="h-4 w-4" /> Download Local File
                </Button>
              </ResolvedDownloadLink>
            </div>
          </div>
        </Modal>
      )}
    </div>
    </PlanGatedView>
  );
};

// ==========================================
// 7. DASHBOARD REDIRECTOR
// ==========================================
export const ImpactTracker: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/dashboard", { replace: true });
  }, [navigate]);
  return null;
};

const _unusedOldImpactTracker = () => {
  const { t } = useLocalTranslation();
  const { activeOrg, activeMember } = useOrgStore();
  const { formatAmount } = useCurrencyStore();
  const { addToast } = useToast();

  const { data: activities, refetch: refetchActs } = useActivityLogs(activeOrg?.id);
  const { data: donations } = useDonations(activeOrg?.id);
  const { data: members } = useMembers(activeOrg?.id);
  const { data: feeLedger } = useMemberFees(activeOrg?.id);
  const { data: allEventAttData } = useAllEventAttendance(activeOrg?.id);
  const submitActMutation = useSubmitActivityLog();

  const [searchQuery, setSearchQuery] = useState("");
  // Form states
  const [openLogModal, setOpenLogModal] = useState(false);
  const [actTitle, setActTitle] = useState("");
  const [actDesc, setActDesc] = useState("");
  const [actType, setActType] = useState("Community Engagement");
  const [actLocation, setActLocation] = useState("");
  const [actMetric, setActMetric] = useState("100 Participants");
  const [presenceMap, setPresenceMap] = useState<Record<string, boolean>>({});

  const isAdmin = activeMember?.role === "org_admin" || activeMember?.role === "manager" || activeMember?.role === "accountant";

  // 1. Community Impact KPI: activities table (title, activity_type, target_metric, description)
  const totalCoreMetric = React.useMemo(() => {
    if (!activities || activities.length === 0) return 0;
    return activities.reduce((acc, a) => {
      const text = ((a.target_metric || "") + " " + (a.description || "") + " " + (a.title || "")).toLowerCase();
      const numbers = text.match(/\d+/g);
      if (numbers && numbers.length > 0) {
        return acc + Number(numbers[0]);
      }
      return acc + 100;
    }, 0);
  }, [activities]);

  // 2. Training & Attendance KPI: activities + event_attendance (present_member_ids, attendees, activity_date)
  const totalTrainingsCount = React.useMemo(() => {
    const actAttendanceCount = (activities || []).reduce((acc, a) => {
      const presentCount = a.present_member_ids?.length || a.attendees?.length || 0;
      return acc + presentCount;
    }, 0);
    const eventAttCount = allEventAttData?.length || 0;
    return actAttendanceCount + eventAttCount;
  }, [activities, allEventAttData]);

  // 3. Financial Leverage KPI: donations & member_fees (amount, status ("confirmed" donations & "paid" fees))
  const totalLeverageDonations = React.useMemo(() => {
    const confirmedDons = donations?.filter((d) => d.status === "confirmed") || [];
    const donationsSum = confirmedDons.reduce((acc, d) => acc + Number(d.amount || 0), 0);
    const paidFeesSum = feeLedger?.filter(f => f.status === "paid")?.reduce((acc, f) => acc + Number(f.amount || 0), 0) || 0;
    return donationsSum + paidFeesSum;
  }, [donations, feeLedger]);

  // 4. Absence & Flag Log: activities linked to members (absent_member_ids, full_name)
  const absentMembersList = React.useMemo(() => {
    const absentMap: Record<string, { id: string; name: string; desc: string }> = {};

    (activities || []).forEach((a) => {
      if (a.absent_member_ids && a.absent_member_ids.length > 0) {
        (members || []).forEach((m) => {
          if (a.absent_member_ids?.includes(m.id)) {
            absentMap[m.id] = {
              id: m.id,
              name: m.user?.full_name || "Volunteer Member",
              desc: `${t("Absent from")} ${a.title}`
            };
          }
        });
      }
    });

    return Object.values(absentMap);
  }, [activities, members, t]);

  // 5. Activity Trends Chart: activities (activity_date, created_at)
  const monthlyCounts = React.useMemo(() => {
    const counts = [0, 0, 0, 0, 0]; // Jan, Mar, May, Jul, Sep
    if (!activities || activities.length === 0) return [180, 140, 110, 70, 40];
    activities.forEach((a) => {
      const dateVal = a.activity_date || a.created_at;
      if (!dateVal) return;
      const month = new Date(dateVal).getMonth();
      if (month <= 1) counts[0]++;
      else if (month <= 3) counts[1]++;
      else if (month <= 5) counts[2]++;
      else if (month <= 7) counts[3]++;
      else counts[4]++;
    });
    // Convert count metrics into line canvas heights
    return counts.map((c, i) => {
      const baseVal = [180, 140, 110, 70, 40][i];
      return Math.max(20, baseVal - c * 25);
    });
  }, [activities]);

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actTitle.trim()) return;

    // Build lists of present / absent users
    const presentList: string[] = [];
    const absentList: string[] = [];
    members?.forEach((m) => {
      if (presenceMap[m.id]) {
        presentList.push(m.id);
      } else {
        absentList.push(m.id);
      }
    });

    try {
      await submitActMutation.mutateAsync({
        org_id: activeOrg?.id || "",
        title: actTitle,
        description: `${actType} - ${actDesc}. Metric target: ${actMetric}`,
        location: actLocation,
        activity_type: actType,
        target_metric: actMetric,
        present_member_ids: presentList,
        absent_member_ids: absentList,
        activity_date: new Date().toISOString(),
        created_by: activeMember?.user_id || "",
        attendees: presentList
      });

      setActTitle("");
      setActDesc("");
      setActLocation("");
      setActMetric("");
      setPresenceMap({});
      setOpenLogModal(false);
      refetchActs();
      addToast("Activity log submitted to database successfully!", "success");
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerWarning = (mName: string) => {
    addToast(`Automated notification template SMS dispatched to ${mName}: "Hello, we missed you at the project activity session yesterday. Please check project updates."`, "info");
  };

  const filteredActivities = activities?.filter((act) => {
    const matchesSearch = searchQuery === "" ||
      act.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.location?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  }) || [];

  return (
    <div className="flex flex-col gap-6 select-none font-sans w-full animate-in fade-in duration-200">
      <div className="border-b pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-display text-gray-910">{t("Impact KPI Analytics")}</h2>
          <p className="text-xs text-gray-500">{t("Strategic community achievements, sustainability metrics, and operational logs.")}</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setOpenLogModal(true)} icon={<Plus className="h-4.5 w-4.5" />} size="sm">
            {t("Log Field Campaign")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl flex flex-col justify-between shadow-xs">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-600 font-extrabold">{t("Community Impact")}</span>
            <span className="text-3xl font-extrabold font-display block text-emerald-600 mt-2">{Number(totalCoreMetric).toLocaleString()}</span>
            <p className="text-xs text-gray-500 mt-1">{t("Core initiatives successfully completed across operating regions.")}</p>
          </div>
          <div className="w-full bg-emerald-100 dark:bg-emerald-950/20 rounded h-1.5 overflow-hidden mt-6">
            <div className="bg-emerald-555 h-full" style={{ width: `${Math.min(100, (totalCoreMetric / 15000) * 100)}%` }} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl flex flex-col justify-between shadow-xs">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-blue-600 font-extrabold">{t("Community Training KPI")}</span>
            <span className="text-3xl font-extrabold font-display block text-blue-600 mt-2">{totalTrainingsCount}</span>
            <p className="text-xs text-gray-500 mt-1">{t("Progressive cooperative leaders certified in operational excellence.")}</p>
          </div>
          <div className="w-full bg-blue-100 dark:bg-blue-950/20 rounded h-1.5 overflow-hidden mt-6">
            <div className="bg-blue-555 h-full" style={{ width: `${Math.min(100, (totalTrainingsCount / 1000) * 100)}%` }} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl flex flex-col justify-between shadow-xs">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-amber-600 font-extrabold">{t("Financial Leverages")}</span>
            <span className="text-3xl font-extrabold font-display block text-amber-600 mt-2">{formatAmount(totalLeverageDonations)}</span>
            <p className="text-xs text-gray-500 mt-1">{t("Secured, auditable donations bedded to ledgers under operations tags.")}</p>
          </div>
          <div className="w-full bg-amber-100 dark:bg-amber-950/20 rounded h-1.5 overflow-hidden mt-6">
            <div className="bg-amber-555 h-full" style={{ width: `${Math.min(100, (totalLeverageDonations / 2000000) * 100)}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full shrink-0">
        {/* outreach achievements list */}
        <Card title={t("Organization Activities & Projects Registry")}>
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t("search_activities_placeholder", "Filter campaigns by keyword...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs rounded-lg border bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 pl-9 pr-4 py-2 outline-none focus:ring-1 focus:ring-emerald-600 text-stone-850 dark:text-white transition"
              />
            </div>

            {filteredActivities.length > 0 ? (
              filteredActivities.map((a) => (
                <div key={a.id} className="p-4 rounded-xl border border-gray-150 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-900 flex flex-col gap-3">
                  <div className="flex justify-between items-start leading-none">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-stone-900 dark:text-gray-150">{a.title}</span>
                      <span className="text-[9px] font-mono uppercase text-emerald-750 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-md inline-block self-start">{t(a.activity_type)}</span>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400 font-bold">{new Date(a.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed font-semibold">{a.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4 text-[10px] font-bold text-gray-455 pt-2 border-t">
                    <span>{t("Venue:")} <span className="text-stone-900 dark:text-gray-250 font-extrabold">{a.location}</span></span>
                    <span>{t("Target Target:")} <span className="text-stone-900 dark:text-gray-250 font-extrabold">{a.target_metric}</span></span>
                  </div>

                  {/* Attendance Stats summary */}
                  <div className="flex gap-4 items-center mt-1 font-mono text-[9px] text-gray-455 leading-none select-none">
                    <span className="bg-emerald-500/10 text-emerald-800 px-2 py-1 rounded font-extrabold">{t("Present:")} {a.present_member_ids?.length || 0} {t("volunteers")}</span>
                    <span className="bg-red-500/10 text-red-800 px-2 py-1 rounded font-extrabold">{t("Absent:")} {a.absent_member_ids?.length || 0}</span>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title={t("No field activities logged yet")} message={t("When you complete community trainings or operational campaigns, log them here to verify presence logs.")} />
            )}
          </div>
        </Card>

        {/* absent follow-ups */}
        <Card title={t("Absence Support & Attendance Recovery Dashboard")}>
          <div className="flex flex-col gap-4">
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              {t("The platform automatically tracks members missing registered operations. Dispatch custom variable-driven SMS alerts to check workspace statuses.")}
            </p>

            <div className="flex flex-col gap-3 w-full border-t pt-4">
              <span className="text-[10px] font-mono uppercase tracking-wider text-gray-455 font-bold block mb-1">{t("Volunteers Flagged Last Activity")}</span>
              
              <div className="divide-y text-xs font-semibold">
                {absentMembersList.length > 0 ? (
                  absentMembersList.map((m) => (
                    <div key={m.id} className="flex justify-between items-center py-3">
                      <div className="flex flex-col">
                        <span className="text-stone-900 dark:text-stone-100">{m.name}</span>
                        <span className="text-[10px] text-gray-400">{m.desc}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-red-605 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded-md font-mono font-bold leading-none">{t("Absent")}</span>
                        <Button size="xs" variant="outline" onClick={() => handleTriggerWarning(m.name)}>{t("Follow Up")}</Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-3">{t("No recorded absences. All volunteers attended operations.")}</p>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* SVG Beautiful Dynamic Chart (Impact Activity trends) */}
      <Card title={t("Operational Activity & Performance Trends (2026)")}>
        <div className="p-4 w-full h-[260px] relative select-none">
          <svg className="w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="none">
            {/* Grid indicators */}
            <line x1="0" y1="50" x2="600" y2="50" stroke="#f1f5f9" strokeWidth="1" />
            <line x1="0" y1="100" x2="600" y2="100" stroke="#f1f5f9" strokeWidth="1" />
            <line x1="0" y1="150" x2="600" y2="150" stroke="#f1f5f9" strokeWidth="1" />

            {/* Line Trend Vector */}
            <path
              d={`M 50 ${monthlyCounts[0]} Q 150 ${monthlyCounts[1]} 250 ${monthlyCounts[2]} T 440 ${monthlyCounts[3]} T 550 ${monthlyCounts[4]}`}
              fill="none"
              stroke="var(--org-primary)"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* SVG dots */}
            <circle cx="50" cy={monthlyCounts[0]} r="6" fill="var(--org-primary)" stroke="white" strokeWidth="2" />
            <circle cx="180" cy={monthlyCounts[1]} r="6" fill="var(--org-primary)" stroke="white" strokeWidth="2" />
            <circle cx="310" cy={monthlyCounts[2]} r="6" fill="var(--org-primary)" stroke="white" strokeWidth="2" />
            <circle cx="440" cy={monthlyCounts[3]} r="6" fill="var(--org-primary)" stroke="white" strokeWidth="2" />
            <circle cx="550" cy={monthlyCounts[4]} r="6" fill="var(--org-primary)" stroke="white" strokeWidth="2" />

            {/* Month ticks */}
            <text x="45" y="195" fill="#94a3b8" fontSize="9" fontWeight="bold">{t("Jan")}</text>
            <text x="175" y="195" fill="#94a3b8" fontSize="9" fontWeight="bold">{t("Mar")}</text>
            <text x="305" y="195" fill="#94a3b8" fontSize="9" fontWeight="bold">{t("May")}</text>
            <text x="435" y="195" fill="#94a3b8" fontSize="9" fontWeight="bold">{t("Jul")}</text>
            <text x="545" y="195" fill="#94a3b8" fontSize="9" fontWeight="bold">{t("Sep")}</text>
          </svg>
        </div>
      </Card>

      {/* Admin log modal */}
      <Modal open={openLogModal} onClose={() => setOpenLogModal(false)} title={t("Record Operational Activity / Project Campaign")}>
        <form onSubmit={handleCreateActivity} className="flex flex-col gap-4 font-bold text-xs select-none">
          <Input label={t("Campaign/Training Name")} value={actTitle} onChange={(e) => setActTitle(e.target.value)} placeholder="e.g. Bugesera Dryland Pruning Workshop" />
          <Input label={t("Description KPI achieved")} value={actDesc} onChange={(e) => setActDesc(e.target.value)} placeholder="What was achieved?" />
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-700">{t("Campaign Type")}</label>
              <select
                value={actType}
                onChange={(e) => setActType(e.target.value)}
                className="w-full text-xs rounded-lg border bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-705 px-3 py-2 text-stone-800"
              >
                <option value="Community Engagement">{t("Community Engagement")}</option>
                <option value="Operational Training">{t("Operational Training")}</option>
                <option value="Strategic Review Meeting">{t("Strategic Review Meeting")}</option>
              </select>
            </div>
            <Input label={t("Target Metric Achieved")} value={actMetric} onChange={(e) => setActMetric(e.target.value)} placeholder="e.g. 500 members engaged" />
          </div>

          <Input label={t("Campaign Venue / Sector")} value={actLocation} onChange={(e) => setActLocation(e.target.value)} placeholder="e.g. Regional community center" />

          {/* Member Presence Attendance list ticking */}
          <div className="flex flex-col gap-2 mt-2 max-h-48 overflow-y-auto border rounded-xl p-3 bg-stone-50/20">
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-455 font-bold block mb-1">{t("Volunteers Attendance Sheets")}</span>
            {members && members.length > 0 ? (
              members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 py-1 text-xs">
                  <input
                    type="checkbox"
                    id={`pres_${m.id}`}
                    checked={!!presenceMap[m.id]}
                    onChange={(e) => setPresenceMap({ ...presenceMap, [m.id]: e.target.checked })}
                    className="h-4.5 w-4.5 rounded cursor-pointer"
                  />
                  <label htmlFor={`pres_${m.id}`} className="text-gray-700 cursor-pointer">{m.user?.full_name || "Volunteer"}</label>
                </div>
              ))
            ) : (
              <span className="text-[10px] text-gray-400">{t("No active members registered in your database directory.")}</span>
            )}
          </div>

          <Button type="submit" className="w-full mt-4 py-2.5 uppercase tracking-wider font-extrabold text-xs">
            {t("Commit Operational Field Campaign Log")}
          </Button>
        </form>
      </Modal>
    </div>
  );
};


// ==========================================
// 9. SCHEDULED EVENTS & MANUAL CHECK-IN MODULE
// ==========================================
export const EventsCalendar: React.FC = () => {
  const { activeOrg, activeMember } = useOrgStore();
  const { addToast } = useToast();
  const { t } = useLocalTranslation();
  const navigate = useNavigate();
  const { data, refetch } = useEvents(activeOrg?.id);
  const events = (data || []) as ImpactEvent[];
  const createMutation = useCreateEvent();

  const [openAddModal, setOpenAddModal] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [location, setLocation] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<ImpactEvent | null>(null);

  const { data: orgMembers, isLoading: loadingMembers } = useMembers(activeOrg?.id);
  const { data: attendanceList, refetch: refetchAttendance } = useEventAttendance(selectedEvent?.id);
  const { data: allAttendanceData } = useAllEventAttendance(activeOrg?.id);
  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();
  const [openEditModal, setOpenEditModal] = useState(false);
  const updateEventMutation = useUpdateEvent();
  const deleteEventMutation = useDeleteEvent();

  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [eventSearch, setEventSearch] = useState("");

  const canManageEvents = Boolean(activeMember?.role && activeMember?.role !== "member");
  const isAdmin = canManageEvents;

  const lifecycle = getOrgSubscriptionLifecycle(activeOrg);
  const eventAccess = canAccessFeature(activeOrg, "event_listings");
  const taskAccess = canAccessFeature(activeOrg, "task_assignment");
  const attAccess = canAccessFeature(activeOrg, "qr_attendance");
  const isPaidPlan = lifecycle.effectiveTier !== "free" || attAccess.allowed;
  const [viewMode, setViewMode] = useState<"schedule" | "grid">("schedule");
  const [eventSubTab, setEventSubTab] = useState<"calendar" | "spaces" | "agenda">("calendar");

  const [assignTasksOpen, setAssignTasksOpen] = useState(false);
  const [eventTasks, setEventTasks] = useState<EventTask[]>([]);
  const [todoTitle, setTodoTitle] = useState("");
  const [todoMemberId, setTodoMemberId] = useState("");
  const [todoDueDate, setTodoDueDate] = useState("");
  const [showTasksForEventId, setShowTasksForEventId] = useState<Record<string, boolean>>({});

  const handleAddTodoItem = () => {
    if (!todoTitle.trim()) {
      addToast("Please provide a deliverable description.", "error");
      return;
    }
    const defaultMemberId = todoMemberId || (orgMembers && orgMembers[0]?.id) || "";
    const assignedMember = orgMembers?.find((m) => m.id === defaultMemberId);
    const newTask: EventTask = {
      id: "task-" + Math.random().toString(36).substr(2, 9),
      event_id: selectedEvent?.id || "temp",
      title: todoTitle.trim(),
      assigned_to_member_id: defaultMemberId,
      assigned_to_name: assignedMember?.user?.full_name || "Unassigned",
      assigned_to_role: assignedMember?.role || "member",
      due_date: todoDueDate || dateTime || new Date().toISOString(),
      progress: 0,
      status: "pending"
    };

    setEventTasks((prev) => [...prev, newTask]);
    setTodoTitle("");
    setTodoDueDate("");
  };

  const handleRemoveTodoItem = (taskId: string) => {
    setEventTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleUpdateTaskAssignee = (taskId: string, memberId: string) => {
    const member = orgMembers?.find((m) => m.id === memberId);
    setEventTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            assigned_to_member_id: memberId,
            assigned_to_name: member?.user?.full_name || "Unassigned",
            assigned_to_role: member?.role || "member"
          };
        }
        return t;
      })
    );
  };

  const exportAttendanceMatrixExcel = () => {
    const activeMembers = orgMembers?.filter((m) => m.status === "active") || [];
    if (activeMembers.length === 0) {
      addToast("No active members found to export.", "error");
      return;
    }
    const eventList = events || [];
    const allAtt = allAttendanceData || [];

    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Attendance Matrix</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        body { font-family: Arial, sans-serif; }
        table { border-collapse: collapse; width: 100%; }
        th { background-color: #047857; color: #FFFFFF; border: 1px solid #065F46; padding: 10px; font-weight: bold; font-size: 12px; text-align: left; }
        td { border: 1px solid #E5E7EB; padding: 8px; font-size: 11px; vertical-align: middle; }
        tr:nth-child(even) { background-color: #F9FAFB; }
        .present { background-color: #D1FAE5; color: #065F46; font-weight: bold; text-align: center; }
        .absent { background-color: #FEE2E2; color: #991B1B; text-align: center; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
      </style>
    </head>
    <body>
      <h2 style="color: #047857; font-family: sans-serif;">${activeOrg?.name || "Organization"} - Master Attendance Matrix</h2>
      <p style="font-size: 11px; color: #4B5563;"><strong>Export Date:</strong> ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} | <strong>Total Members:</strong> ${activeMembers.length} | <strong>Total Events Recorded:</strong> ${eventList.length}</p>
      <table>
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">No.</th>
            <th>Member Name</th>
            <th>Member ID</th>`;

    eventList.forEach((ev) => {
      const dStr = ev.date_time ? new Date(ev.date_time).toLocaleDateString() : "";
      html += `<th>${ev.title.replace(/</g, "&lt;").replace(/>/g, "&gt;")} (${dStr})</th>`;
    });

    html += `<th style="text-align: center;">Total Present</th>
            <th style="text-align: center;">Total Absent</th>
            <th style="text-align: center;">Attendance %</th>
          </tr>
        </thead>
        <tbody>`;

    activeMembers.forEach((m, idx) => {
      let presentCount = 0;
      let absentCount = 0;
      let eventColsHtml = "";

      eventList.forEach((ev) => {
        const isPresentInAll = allAtt.some(a => a.event_id === ev.id && a.member_id === m.id);
        const isPresentInSelected = selectedEvent?.id === ev.id && attendanceList?.some(a => a.member_id === m.id);
        const isPresentInLocal = localStorage.getItem(`event_att_detail_${ev.id}_${m.id}`);
        const isPresent = isPresentInAll || Boolean(isPresentInSelected) || Boolean(isPresentInLocal);

        if (isPresent) {
          presentCount++;
          eventColsHtml += `<td class="present">Present</td>`;
        } else {
          absentCount++;
          eventColsHtml += `<td class="absent">Absent</td>`;
        }
      });

      const totalEventsCount = eventList.length || 1;
      const rate = Math.round((presentCount / totalEventsCount) * 100);

      html += `<tr>
        <td class="center bold">${idx + 1}</td>
        <td class="bold">${(m.user?.full_name || "Member").replace(/</g, "&lt;")}</td>
        <td class="center font-mono">${(m.member_number || m.user?.email || "-").replace(/</g, "&lt;")}</td>
        ${eventColsHtml}
        <td class="center bold" style="color: #047857;">${presentCount}</td>
        <td class="center bold" style="color: #B91C1C;">${absentCount}</td>
        <td class="center bold">${rate}%</td>
      </tr>`;
    });

    html += `</tbody>
      </table>
    </body>
    </html>`;

    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Attendance_Master_Matrix_${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addToast("Master attendance Excel file generated and downloaded successfully!", "success");
  };

  const filteredEvents = events?.filter((ev) => {
    const matchesSearch = eventSearch === "" ||
      ev.title.toLowerCase().includes(eventSearch.toLowerCase()) ||
      ev.description?.toLowerCase().includes(eventSearch.toLowerCase()) ||
      ev.location?.toLowerCase().includes(eventSearch.toLowerCase());
    return matchesSearch;
  }) || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dateTime || !location) return;

    if (new Date(dateTime) < new Date()) {
      addToast("Error: The event date and time must be set from the current moment forward!", "error");
      return;
    }

    const overall_progress = eventTasks.length > 0
      ? Math.round(eventTasks.reduce((sum, t) => sum + (t.progress || 0), 0) / eventTasks.length)
      : 0;

    try {
      const res = await createMutation.mutateAsync({
        org_id: activeOrg?.id || "",
        title,
        description: desc,
        date_time: new Date(dateTime).toISOString(),
        location,
        status: "upcoming",
        is_public: isPublic,
        tasks: eventTasks,
        overall_progress
      });

      if (res && res.id) {
        localStorage.setItem(`event_tasks_${res.id}`, JSON.stringify(eventTasks));
        try {
          const allOrgTasks = JSON.parse(localStorage.getItem(`all_event_tasks_${activeOrg?.id}`) || "{}");
          allOrgTasks[res.id] = eventTasks;
          localStorage.setItem(`all_event_tasks_${activeOrg?.id}`, JSON.stringify(allOrgTasks));
        } catch (e) {}
      }

      setOpenAddModal(false);
      setTitle("");
      setDesc("");
      setDateTime("");
      setLocation("");
      setEventTasks([]);
      setAssignTasksOpen(false);
      refetch();
      addToast("Event and assigned deliverables scheduled successfully!", "success");
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditInit = (event: ImpactEvent) => {
    setSelectedEvent(event);
    setTitle(event.title);
    setDesc(event.description);
    setDateTime(event.date_time.slice(0, 16));
    setLocation(event.location);
    setIsPublic(event.is_public);

    let existingTasks = event.tasks || [];
    if (!existingTasks || existingTasks.length === 0) {
      try {
        const local = localStorage.getItem(`event_tasks_${event.id}`);
        if (local) existingTasks = JSON.parse(local);
      } catch (e) {}
    }
    setEventTasks(existingTasks);
    setAssignTasksOpen(existingTasks.length > 0);
    setTodoTitle("");
    setTodoMemberId("");
    setTodoDueDate("");
    setOpenEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !title || !dateTime || !location) return;

    if (new Date(dateTime) < new Date()) {
      addToast("Error: The date and time must be set from the current moment forward!", "error");
      return;
    }

    const overall_progress = eventTasks.length > 0
      ? Math.round(eventTasks.reduce((sum, t) => sum + (t.progress || 0), 0) / eventTasks.length)
      : 0;

    try {
      await updateEventMutation.mutateAsync({
        id: selectedEvent.id,
        org_id: activeOrg?.id || "",
        title,
        description: desc,
        date_time: new Date(dateTime).toISOString(),
        location,
        is_public: isPublic,
        tasks: eventTasks,
        overall_progress
      });

      localStorage.setItem(`event_tasks_${selectedEvent.id}`, JSON.stringify(eventTasks));
      try {
        const allOrgTasks = JSON.parse(localStorage.getItem(`all_event_tasks_${activeOrg?.id}`) || "{}");
        allOrgTasks[selectedEvent.id] = eventTasks;
        localStorage.setItem(`all_event_tasks_${activeOrg?.id}`, JSON.stringify(allOrgTasks));
      } catch (e) {}

      setOpenEditModal(false);
      setSelectedEvent(null);
      setEventTasks([]);
      refetch();
      addToast("Event and assigned tasks updated successfully!", "success");
    } catch (err: any) {
      console.error(err);
      addToast(err?.message || "Failed to update event", "error");
    }
  };

  const handleDelete = async (event: ImpactEvent) => {
    if (confirm("Delete this event? It will be archived.")) {
      try {
        await deleteEventMutation.mutateAsync({ id: event.id, org_id: activeOrg?.id || "" });
        refetch();
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (!eventAccess.allowed) {
    return (
      <PlanGatedView
        featureKey="event_listings"
        requiredTier="growth"
        featureName="Event Management & Facility Space Scheduling"
        customMessage="Community events, task delegation, and facility space bookings require a Growth or Pro plan (or Event Package)."
      >
        <div />
      </PlanGatedView>
    );
  }

  const renderTaskAssignmentSection = () => (
    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden mt-3 bg-slate-50/60 dark:bg-slate-900/50">
      <button
        type="button"
        onClick={() => setAssignTasksOpen(!assignTasksOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left transition hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            Assign Tasks (Pro & Growth)
          </span>
          {eventTasks.length > 0 && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
              {eventTasks.length} {eventTasks.length === 1 ? "task" : "tasks"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          {!taskAccess.allowed ? (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-[11px] font-semibold">
              <Lock className="h-3 w-3" /> Growth & Pro
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              {assignTasksOpen ? "Collapse −" : "Expand +"}
            </span>
          )}
        </div>
      </button>

      {assignTasksOpen && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
          {!taskAccess.allowed ? (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
              <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-amber-900 dark:text-amber-200">
                  Task Assignment is Locked on Free Plan
                </p>
                <p className="text-amber-700 dark:text-amber-300 mt-1 leading-relaxed text-[11px]">
                  Task delegation with member tracking, automated planning clocks, and overall event progress rollup is available on Growth and Pro plans.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/dashboard/settings?tab=subscription")}
                  className="mt-2.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] cursor-pointer inline-flex items-center gap-1"
                >
                  Upgrade to Growth / Pro →
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                List action items and assign them to members. Each member will see their assigned tasks on their dashboard, record progress, and submit performance reports contributing to the event's overall progress.
              </p>

              {/* Extended Form: Add Todo Row */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row gap-2 items-end">
                <div className="flex-1 w-full">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Deliverable / Action Item
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Coordinate venue stage & sound equipment"
                    value={todoTitle}
                    onChange={(e) => setTodoTitle(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-emerald-600 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="w-full sm:w-44">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Assign Member
                  </label>
                  <select
                    value={todoMemberId}
                    onChange={(e) => setTodoMemberId(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 px-2 py-1.5 outline-none focus:ring-1 focus:ring-emerald-600 text-slate-900 dark:text-white"
                  >
                    <option value="">Select Member...</option>
                    {orgMembers?.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.user?.full_name || "Member"} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-full sm:w-36">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={todoDueDate}
                    onChange={(e) => setTodoDueDate(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 px-2 py-1.5 outline-none focus:ring-1 focus:ring-emerald-600 text-slate-900 dark:text-white"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddTodoItem}
                  className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 cursor-pointer flex items-center justify-center gap-1 h-[33px]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Task</span>
                </button>
              </div>

              {/* List of Todos with Member Select Dropdown in Front */}
              {eventTasks.length > 0 ? (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400">
                    <span>Assigned Deliverables ({eventTasks.length})</span>
                    <span>Average Progress: {Math.round(eventTasks.reduce((s, t) => s + (t.progress || 0), 0) / eventTasks.length)}%</span>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                    {eventTasks.map((task) => (
                      <div key={task.id} className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {/* Member Select Dropdown in front of each item */}
                          <div className="w-40 shrink-0">
                            <select
                              value={task.assigned_to_member_id}
                              onChange={(e) => handleUpdateTaskAssignee(task.id, e.target.value)}
                              className="w-full text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 px-2 py-1 outline-none text-slate-900 dark:text-white cursor-pointer"
                            >
                              {orgMembers?.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.user?.full_name || "Member"}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                              {task.title}
                            </p>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Due: {task.due_date ? new Date(task.due_date).toLocaleDateString([], { month: "short", day: "numeric" }) : "Event day"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            (task.progress || 0) >= 100
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : (task.progress || 0) > 0
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}>
                            {task.progress || 0}%
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTodoItem(task.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            title="Remove task"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-center text-xs text-slate-400 italic py-2">
                  No deliverables added yet. Use the inputs above to add tasks.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-6 select-none font-sans w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{t("dashboard_labels.events_board_title")}</h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">{t("dashboard_labels.events_board_subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setOpenAddModal(true)}>
              {t("dashboard_labels.schedule_session")}
            </Button>
          )}
        </div>
      </div>

      {/* View Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              viewMode === "grid"
                ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Attendance Grid Matrix</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("schedule")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              viewMode === "schedule"
                ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            <span>Event Schedule and Roster</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium px-2">
          <span>Events: <strong className="text-slate-700 dark:text-slate-300">{events.length}</strong></span>
          <span>•</span>
          <span>Active Members: <strong className="text-slate-700 dark:text-slate-300">{orgMembers?.filter(m => m.status === 'active').length || 0}</strong></span>
        </div>
      </div>

      {viewMode === "grid" ? (
        <DynamicAttendanceGrid
          events={events}
          members={orgMembers || []}
          allAttendance={allAttendanceData || []}
          isPaidPlan={isPaidPlan}
          activeOrg={activeOrg}
          canManageAttendance={canManageEvents}
          onCheckIn={async (eventId, memberId) => {
            await checkInMutation.mutateAsync({
              event_id: eventId,
              member_id: memberId,
              method: "manual",
            });
            refetchAttendance();
          }}
          onCheckOut={async (eventId, memberId) => {
            await checkOutMutation.mutateAsync({
              event_id: eventId,
              member_id: memberId,
            });
            refetchAttendance();
          }}
          addToast={addToast}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {/* Real Interactive Calendar with Rwandan National Holidays and 24h Space Lending */}
          <EventScheduleCalendar
            events={events}
            activeOrg={activeOrg}
            isAdmin={isAdmin}
            onEditEvent={handleEditInit}
            onDeleteEvent={handleDelete}
            onSelectEvent={(ev) => setSelectedEvent(ev)}
            selectedEventId={selectedEvent?.id}
            onAddEventClick={() => setOpenAddModal(true)}
            activeSubTab={eventSubTab}
            onSubTabChange={(tab) => setEventSubTab(tab)}
          />

          {eventSubTab === "agenda" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Events Schedule list */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder={t("Filter events by title or location...")}
                    value={eventSearch}
                    onChange={(e) => setEventSearch(e.target.value)}
                    className="w-full text-xs rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 pl-9 pr-4 py-2 outline-none focus:ring-1 focus:ring-emerald-600 text-slate-900 dark:text-white transition"
                  />
                </div>

            {filteredEvents.length > 0 ? (
              filteredEvents.map((ev: ImpactEvent) => {
                const isEventPassed = new Date(ev.date_time) < new Date();
                const displayEventStatus = isEventPassed ? "completed" : ev.status;
                return (
                  <Card key={ev.id} title={ev.title} action={
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                        displayEventStatus === "completed" 
                          ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      }`}>
                        {displayEventStatus}
                      </span>
                      {isAdmin && (
                        <>
                          <button onClick={() => handleEditInit(ev)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDelete(ev)} className="p-1 text-slate-400 hover:text-rose-600">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  }>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-normal">{ev.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs font-medium text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <span>Date: <span className="text-slate-900 dark:text-white font-mono">{new Date(ev.date_time).toLocaleDateString()}</span></span>
                    <span>Venue: <span className="text-slate-900 dark:text-white">{ev.location}</span></span>
                  </div>

                  {(() => {
                    let cardTasks: EventTask[] = ev.tasks || [];
                    if (!cardTasks || cardTasks.length === 0) {
                      try {
                        const local = localStorage.getItem(`event_tasks_${ev.id}`);
                        if (local) cardTasks = JSON.parse(local);
                      } catch (e) {}
                    }

                    if (!cardTasks || cardTasks.length === 0) return null;

                    const overallProgress = ev.overall_progress !== undefined
                      ? ev.overall_progress
                      : Math.round(cardTasks.reduce((s, t) => s + (t.progress || 0), 0) / cardTasks.length);
                    const isExpanded = !!showTasksForEventId[ev.id];

                    return (
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <CheckSquare className="h-3.5 w-3.5 text-emerald-600" />
                            Deliverables Overall Progress:
                          </span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {overallProgress}% ({cardTasks.filter((t) => (t.progress || 0) >= 100).length}/{cardTasks.length} Completed)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${overallProgress}%` }}
                          />
                        </div>

                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => setShowTasksForEventId((prev) => ({ ...prev, [ev.id]: !prev[ev.id] }))}
                            className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>{isExpanded ? "Hide Deliverables & Reports" : `View Deliverables & Reports (${cardTasks.length})`}</span>
                            <span>{isExpanded ? "▲" : "▼"}</span>
                          </button>

                          {isExpanded && (
                            <div className="mt-2 space-y-2 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs animate-in">
                              {cardTasks.map((task) => (
                                <div key={task.id} className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[200px]">{task.title}</span>
                                    <span className="font-mono font-bold text-[11px] text-emerald-600 dark:text-emerald-400">{task.progress || 0}%</span>
                                  </div>
                                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                                    <span>Assigned: <strong className="text-slate-700 dark:text-slate-300">{task.assigned_to_name}</strong></span>
                                    <span className="font-mono">Due: {task.due_date ? new Date(task.due_date).toLocaleDateString([], { month: "short", day: "numeric" }) : "-"}</span>
                                  </div>
                                  {task.performance_report && (
                                    <div className="p-2 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-lg border border-emerald-200/60 dark:border-emerald-800/40 text-[11px]">
                                      <span className="font-bold text-emerald-800 dark:text-emerald-300 block text-[10px] uppercase tracking-wider mb-0.5">
                                        Member Performance Report ({task.reported_at ? new Date(task.reported_at).toLocaleDateString([], { month: "short", day: "numeric" }) : "Recent"}):
                                      </span>
                                      <p className="text-emerald-900 dark:text-emerald-200 italic">"{task.performance_report}"</p>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {isAdmin && (() => {
                    const attAccess = canAccessFeature(activeOrg, "qr_attendance");
                    return (
                      <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 select-none">
                        <span className="text-xs text-slate-400">Manage roster</span>
                        <Button size="sm" variant={selectedEvent?.id === ev.id ? "default" : "outline"} onClick={() => setSelectedEvent(ev)} className="flex items-center gap-1.5 text-xs font-medium">
                          {!attAccess.allowed && <Lock className="h-3 w-3 text-amber-500" />}
                          {attAccess.allowed ? "Mark Attendance" : "View Attendance"}
                        </Button>
                      </div>
                    );
                  })()}
                </Card>
              );
            })
            ) : (
              <EmptyState title={t("No Scheduled Events")} message={t("No active events currently match your search parameter filters.")} />
            )}
          </div>

          {/* Attendance Tracker Roster Widget with Checkboxes */}
          <div className="flex flex-col gap-6">
            <Card title="Event Attendance Checklist">
              {selectedEvent ? (() => {
                const attAccess = canAccessFeature(activeOrg, "qr_attendance");
                const isAllowed = attAccess.allowed;

                return (
                <div className="space-y-4">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3 space-y-1 text-xs">
                    <span className="text-xs font-medium text-slate-500">Selected Event</span>
                    <p className="font-semibold text-slate-900 dark:text-white leading-tight">{selectedEvent.title}</p>
                    <div className="flex justify-between items-center pt-2 font-mono text-xs text-slate-400">
                      <span>Present: {attendanceList?.length || 0}</span>
                      <span>Total: {orgMembers?.filter((m) => m.status === "active").length || 0} active</span>
                    </div>
                  </div>

                  {!isAllowed && (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-2.5">
                      <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <p className="font-medium text-amber-900 dark:text-amber-200">Attendance Marking Restricted</p>
                        <p className="text-amber-700 dark:text-amber-300 mt-1 leading-relaxed text-xs">
                          Marking attendance requires the Event Package or an active subscription tier.
                        </p>
                        <div className="mt-2.5">
                          <Button
                            size="sm"
                            className="bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs py-1 px-2.5 rounded-lg cursor-pointer"
                            onClick={() => navigate("/dashboard/settings?tab=subscription")}
                          >
                            Upgrade Plan
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Live Filter */}
                  <Input
                    placeholder="Filter members by name..."
                    value={attendanceSearch}
                    onChange={(e) => setAttendanceSearch(e.target.value)}
                    className="text-xs"
                  />

                  {/* Members checklist roster */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-1 select-none space-y-0.5 bg-slate-50/50 dark:bg-slate-950/20">
                    {orgMembers && orgMembers.filter((m) => m.status === "active").length > 0 ? (
                      orgMembers
                        .filter((m) => m.status === "active")
                        .filter((m) => m.user?.full_name?.toLowerCase().includes(attendanceSearch.toLowerCase()))
                        .map((m) => {
                          const isPresent = attendanceList?.some((a) => a.member_id === m.id);
                          return (
                            <label
                              key={m.id}
                              className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                                !isAllowed
                                  ? "cursor-not-allowed opacity-75"
                                  : isPresent
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 cursor-pointer"
                                  : "hover:bg-white dark:hover:bg-slate-900 cursor-pointer"
                              }`}
                            >
                              <div className="flex flex-col leading-snug">
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{m.user?.full_name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">#{m.member_number || "A-Z"}</span>
                              </div>

                              <input
                                type="checkbox"
                                checked={!!isPresent}
                                disabled={!isAllowed}
                                onChange={async (e) => {
                                  if (!isAllowed) {
                                    addToast("Marking attendance requires the Event Package or a Paid Plan.", "error");
                                    return;
                                  }
                                  const checked = e.target.checked;
                                  try {
                                    if (checked) {
                                      await checkInMutation.mutateAsync({
                                        event_id: selectedEvent.id,
                                        member_id: m.id,
                                        method: "manual"
                                      });
                                      addToast(`Marked ${m.user?.full_name} as Present`, "success");
                                    } else {
                                      await checkOutMutation.mutateAsync({
                                        event_id: selectedEvent.id,
                                        member_id: m.id
                                      });
                                      addToast(`Marked ${m.user?.full_name} as Absent`, "success");
                                    }
                                  } catch (err: any) {
                                    addToast(err.message || "Attendance modification failed", "error");
                                  }
                                }}
                                className={`h-4 w-4 text-emerald-600 focus:ring-emerald-500 rounded border-slate-300 transition ${
                                  !isAllowed ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                                }`}
                              />
                            </label>
                          );
                        })
                    ) : (
                      <p className="text-xs text-center text-slate-400 py-4 italic">No active members found.</p>
                    )}
                  </div>

                  <Button
                    className="w-full mt-2 py-2 text-xs flex items-center justify-center gap-2 font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
                    icon={<FileSpreadsheet className="h-4 w-4" />}
                    onClick={() => {
                      addToast(`Attendance finalized for "${selectedEvent.title}". Downloading Excel Matrix...`, "success");
                      exportAttendanceMatrixExcel();
                    }}
                  >
                    Export Attendance Matrix (Excel)
                  </Button>
                </div>
                );
              })() : (
                <div className="text-center py-10">
                  <CalendarDays className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 max-w-xs mx-auto">
                    Click the &quot;Mark Attendance&quot; trigger button on any scheduled event session card to view and manage its member attendance checklist.
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
        )}
    </div>
    )}

      {/* Edit event Modal */}
      <Modal open={openEditModal} onClose={() => setOpenEditModal(false)} title="Edit Scheduled Session">
        <form onSubmit={handleUpdate} className="flex flex-col gap-4 animate-in">
          <Input label="Event Name" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Input label="Short Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
          
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date & Time" type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} required />
            <Input label="Venue / Location" value={location} onChange={(e) => setLocation(e.target.value)} required />
          </div>

          {/* Extended Task Delegation Form (Pro & Growth) */}
          {renderTaskAssignmentSection()}

          <div className="flex items-center gap-3 mt-4 self-start select-none">
            <input
              type="checkbox"
              id="event_visibility_edit"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4.5 w-4.5 rounded"
            />
            <label htmlFor="event_visibility_edit" className="text-xs font-bold text-gray-700 cursor-pointer">
              Publish to public portal
            </label>
          </div>

          <Button type="submit" className="w-full mt-4 py-2.5">
            Save Changes
          </Button>
        </form>
      </Modal>

      {/* Add event Modal */}
      <Modal open={openAddModal} onClose={() => setOpenAddModal(false)} title={t("dashboard_labels.schedule_community_session")}>
        <form onSubmit={handleCreate} className="flex flex-col gap-4 animate-in">
          <Input label={t("dashboard_labels.event_name_title")} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("dashboard_labels.event_name_placeholder")} />
          <Input label={t("dashboard_labels.brief_description")} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t("dashboard_labels.brief_description_placeholder")} />
          
          <div className="grid grid-cols-2 gap-4">
            <Input label={t("dashboard_labels.schedule_date_time")} type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} min={new Date().toISOString().slice(0, 16)} />
            <Input label={t("dashboard_labels.venue_location")} value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("dashboard_labels.venue_placeholder")} />
          </div>

          {/* Extended Task Delegation Form (Pro & Growth) */}
          {renderTaskAssignmentSection()}

          <div className="flex items-center gap-3 mt-4 self-start select-none">
            <input
              type="checkbox"
              id="event_visibility"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4.5 w-4.5 rounded"
            />
            <label htmlFor="event_visibility" className="text-xs font-bold text-gray-700 cursor-pointer">
              {t("dashboard_labels.publish_public_portal")}
            </label>
          </div>

          <Button type="submit" className="w-full mt-4 py-2.5">
            {t("dashboard_labels.confirm_schedule_session")}
          </Button>
        </form>
      </Modal>
    </div>
  );
};

