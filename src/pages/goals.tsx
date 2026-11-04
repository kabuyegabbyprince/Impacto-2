import React, { useState, useMemo } from "react";
import { useLocalTranslation } from "../locales/additional-translations";
import { useOrgStore } from "../store/orgStore";
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal, useMembers } from "../hooks/useImpactoData";
import { Card, Button, Input, Badge, EmptyState, Modal } from "../components/ui";
import { 
  Plus, 
  CheckCircle2, 
  Circle, 
  Calendar, 
  Target, 
  Trash2, 
  Edit3, 
  TrendingUp, 
  Award, 
  Search,
  Check,
  Clock,
  Filter,
  Eye,
  FileDown,
  BarChart2,
  Lock,
  PieChart as PieIcon,
  Sparkles,
  RefreshCw,
  UserCheck,
  Users,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import jsPDF from "jspdf";
import { Goal, GoalTask } from "../types";
import { getOrgSubscriptionLifecycle } from "../lib/subscriptionMatrix";
import { GoalProgressCharts } from "../components/GoalProgressCharts";
import { RealtimeTaskCountdown } from "../components/RealtimeTaskCountdown";
import { MemberGoalTasksView } from "../components/MemberGoalTasksView";

export const GoalsPage: React.FC = () => {
  const { t } = useLocalTranslation();
  const { activeOrg, activeMember } = useOrgStore();
  const canManageGoals = activeMember?.role && activeMember.role !== "member";

  const lifecycle = getOrgSubscriptionLifecycle(activeOrg);
  const isPaidGrowthOrPro = lifecycle.effectiveTier === "growth" || lifecycle.effectiveTier === "pro" || lifecycle.effectiveTier === "enterprise";

  const { data: goals = [], isLoading, refetch } = useGoals(activeOrg?.id);
  const { data: members = [] } = useMembers(activeOrg?.id);
  const createGoalMutation = useCreateGoal();
  const updateGoalMutation = useUpdateGoal();
  const deleteGoalMutation = useDeleteGoal();

  // Filters & State
  const [activeTab, setActiveTab] = useState<"all" | "yearly" | "monthly" | "tasks">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<string>("all");

  // Modals state
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);
  const [isAddPeriodOpen, setIsAddPeriodOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // New Goal Form State
  const [goalTitle, setGoalTitle] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [periodType, setPeriodType] = useState<"yearly" | "monthly">("yearly");
  const [periodLabel, setPeriodLabel] = useState(`${new Date().getFullYear()}`);
  const [targetVal, setTargetVal] = useState<number>(100);
  const [unitVal, setUnitVal] = useState("percent");
  const [minExpectedVal, setMinExpectedVal] = useState<number>(70);
  const [deadlineVal, setDeadlineVal] = useState(`${new Date().getFullYear()}-12-31`);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceCycle, setRecurrenceCycle] = useState<"weekly" | "monthly" | "quarterly">("monthly");

  // Advanced Tasks state for subtasks assignment (Supports multi-member selection & large description)
  const [advancedTasks, setAdvancedTasks] = useState<GoalTask[]>([]);
  const [showAdvancedTasks, setShowAdvancedTasks] = useState(true);
  const [draftTaskMemberIds, setDraftTaskMemberIds] = useState<string[]>([]);
  const [draftTaskTitle, setDraftTaskTitle] = useState("");
  const [draftTaskDescription, setDraftTaskDescription] = useState("");
  const [draftTaskDeadline, setDraftTaskDeadline] = useState(
    new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split("T")[0]
  );

  // New Period Bucket Form State
  const [newPeriodType, setNewPeriodType] = useState<"yearly" | "monthly">("yearly");
  const [newPeriodLabelInput, setNewPeriodLabelInput] = useState("");

  // Extract unique period labels for dropdown filtering
  const periodOptions = useMemo(() => {
    const list: { type: string; label: string }[] = [];
    const seen = new Set<string>();

    goals.forEach((g) => {
      const type = g.period_type || "yearly";
      const label = g.period_label || (type === "yearly" ? "2026" : "2026-07");
      const key = `${type}:${label}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({ type, label });
      }
    });

    return list;
  }, [goals]);

  // Compute number of tasks assigned to current member
  const myAssignedTasksCount = useMemo(() => {
    if (!activeMember?.id) return 0;
    let count = 0;
    goals.forEach((g) => {
      (g.tasks || []).forEach((t) => {
        if (t.assigned_to_member_id === activeMember.id) count++;
      });
    });
    return count;
  }, [goals, activeMember]);

  // Chart data for Growth/Pro visualization
  const chartBarData = useMemo(() => {
    return goals.slice(0, 8).map(g => ({
      name: g.title.length > 14 ? g.title.substring(0, 12) + "..." : g.title,
      Target: 100,
      Progress: g.achievement_percentage || 0,
    }));
  }, [goals]);

  const pieStatusData = useMemo(() => {
    const completed = goals.filter(g => g.status === "completed" || (g.achievement_percentage || 0) >= 100).length;
    const inProgress = goals.filter(g => (g.achievement_percentage || 0) > 0 && (g.achievement_percentage || 0) < 100).length;
    const pending = goals.filter(g => !g.achievement_percentage || g.achievement_percentage === 0).length;
    return [
      { name: "Completed", value: completed, color: "#10B981" },
      { name: "In Progress", value: inProgress, color: "#F59E0B" },
      { name: "Pending", value: pending, color: "#64748B" }
    ].filter(d => d.value > 0);
  }, [goals]);

  // PDF Export for Growth & Pro
  const exportGoalsPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const primaryColor = [21, 108, 69];
      const slateDark = [15, 23, 42];

      // Header Banner
      doc.setFillColor(245, 248, 246);
      doc.rect(0, 0, 210, 42, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(activeOrg?.name || "Organization", 14, 18);

      doc.setFontSize(11);
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.text("STRATEGIC GOALS & PERFORMANCE REPORT", 14, 26);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 14, 34);
      doc.text(`Plan Tier: ${(activeOrg?.subscription_tier || "Growth").toUpperCase()} | Verified Ledger`, 120, 34);

      // KPI Summary Box
      let y = 48;
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(14, y, 182, 22, 3, 3, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("TOTAL STRATEGIC GOALS", 20, y + 7);
      doc.text("COMPLETED OBJECTIVES", 80, y + 7);
      doc.text("OVERALL PROGRESS", 140, y + 7);

      doc.setFontSize(13);
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.text(`${totalGoals}`, 20, y + 16);
      doc.text(`${completedGoalsCount} / ${totalGoals}`, 80, y + 16);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`${overallAvgAchievement}%`, 140, y + 16);

      y += 30;

      // Table Header
      doc.setFillColor(21, 108, 69);
      doc.rect(14, y, 182, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text("#", 17, y + 5.5);
      doc.text("GOAL TITLE", 26, y + 5.5);
      doc.text("PERIOD", 100, y + 5.5);
      doc.text("DEADLINE", 125, y + 5.5);
      doc.text("STATUS", 152, y + 5.5);
      doc.text("PROGRESS", 176, y + 5.5);

      y += 8;

      goals.forEach((g, idx) => {
        if (y > 265) {
          doc.addPage();
          y = 20;
        }

        const isEven = idx % 2 === 0;
        if (isEven) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, y, 182, 10, "F");
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        doc.text(`${idx + 1}`, 17, y + 6.5);

        const titleText = g.title.length > 36 ? g.title.substring(0, 34) + "..." : g.title;
        doc.setFont("helvetica", "bold");
        doc.text(titleText, 26, y + 6.5);

        doc.setFont("helvetica", "normal");
        const periodText = `${(g.period_type || "yr").toUpperCase()}: ${g.period_label || "-"}`;
        doc.text(periodText, 100, y + 6.5);

        const deadlineText = g.deadline ? new Date(g.deadline).toLocaleDateString() : "-";
        doc.text(deadlineText, 125, y + 6.5);

        const statusLabel = (g.status || "pending").toUpperCase();
        doc.text(statusLabel, 152, y + 6.5);

        const score = `${g.achievement_percentage || 0}%`;
        doc.setFont("helvetica", "bold");
        doc.text(score, 178, y + 6.5);

        y += 10;
      });

      // Certification Signature Lines
      if (y > 240) {
        doc.addPage();
        y = 25;
      } else {
        y += 14;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("EXECUTIVE VERIFICATION & BOARD SIGN-OFF", 14, y);
      
      y += 4;
      doc.setDrawColor(203, 213, 225);
      doc.line(14, y + 14, 85, y + 14);
      doc.line(110, y + 14, 185, y + 14);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text("Executive Chairperson / President Signature", 14, y + 19);
      doc.text("Audit Committee / Secretary Signature", 110, y + 19);

      doc.save(`${activeOrg?.slug || "org"}-strategic-goals-report.pdf`);
    } catch (err) {
      console.error("Failed to generate goals PDF:", err);
    }
  };

  // Group goals into period buckets
  const groupedGoals = useMemo(() => {
    const filtered = goals.filter((g) => {
      const gType = g.period_type || "yearly";
      const gLabel = g.period_label || (gType === "yearly" ? "2026" : "2026-07");

      if (activeTab === "yearly" && gType !== "yearly") return false;
      if (activeTab === "monthly" && gType !== "monthly") return false;

      if (selectedPeriodFilter !== "all" && gLabel !== selectedPeriodFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = g.title.toLowerCase().includes(q);
        const matchesDesc = g.description?.toLowerCase().includes(q);
        const matchesLabel = gLabel.toLowerCase().includes(q);
        return matchesTitle || matchesDesc || matchesLabel;
      }

      return true;
    });

    // Grouping by `${type}_${label}`
    const groups: Record<string, { type: "yearly" | "monthly"; label: string; goals: Goal[] }> = {};

    filtered.forEach((g) => {
      const gType: "yearly" | "monthly" = (g.period_type as "yearly" | "monthly") || "yearly";
      const gLabel = g.period_label || (gType === "yearly" ? `${new Date().getFullYear()}` : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
      const key = `${gType}_${gLabel}`;

      if (!groups[key]) {
        groups[key] = {
          type: gType,
          label: gLabel,
          goals: []
        };
      }
      groups[key].goals.push(g);
    });

    return Object.values(groups).sort((a, b) => b.label.localeCompare(a.label));
  }, [goals, activeTab, selectedPeriodFilter, searchQuery]);

  // Overall organization summary stats
  const totalGoals = goals.length;
  const completedGoalsCount = goals.filter(
    (g) => g.status === "completed" || (g.achievement_percentage || 0) >= 100
  ).length;
  const overallAvgAchievement = totalGoals > 0
    ? Math.round(goals.reduce((sum, g) => sum + (g.achievement_percentage || 0), 0) / totalGoals)
    : 0;

  // Toggle todo status for a goal
  const handleToggleTodo = async (goal: Goal) => {
    if (!canManageGoals) return;
    const isCompleted = goal.status === "completed" || (goal.achievement_percentage || 0) >= 100;
    const newStatus: "pending" | "completed" = isCompleted ? "pending" : "completed";
    const newAchievement = isCompleted ? 0 : 100;
    const newProgress = isCompleted ? 0 : (goal.target || 100);

    try {
      await updateGoalMutation.mutateAsync({
        id: goal.id,
        org_id: activeOrg?.id || "",
        status: newStatus,
        achievement_percentage: newAchievement,
        current_progress: newProgress,
      });
      refetch();
    } catch (err) {
      console.error("Error toggling goal status:", err);
    }
  };

  // Adjust achievement percentage for a goal
  const handleUpdateAchievement = async (goal: Goal, percent: number) => {
    if (!canManageGoals) return;
    const clamped = Math.max(0, Math.min(100, percent));
    const newStatus: "pending" | "in_progress" | "completed" = 
      clamped >= 100 ? "completed" : clamped > 0 ? "in_progress" : "pending";
    const newProgress = Math.round(((goal.target || 100) * clamped) / 100);

    try {
      await updateGoalMutation.mutateAsync({
        id: goal.id,
        org_id: activeOrg?.id || "",
        achievement_percentage: clamped,
        status: newStatus,
        current_progress: newProgress,
      });
      refetch();
    } catch (err) {
      console.error("Error updating achievement:", err);
    }
  };

  // Draft subtask management (Multi-member & Large Description)
  const handleAddDraftTask = () => {
    if (!draftTaskTitle.trim()) return;
    const selectedMembers = members.filter((m) => draftTaskMemberIds.includes(m.id));
    const assignedNames = selectedMembers.map((m) => m.user?.full_name || m.role || "Member");
    const primaryMember = selectedMembers[0] || activeMember;

    const newTask: GoalTask = {
      id: "task_" + Math.random().toString(36).substring(2, 9),
      title: draftTaskTitle.trim(),
      description: draftTaskDescription.trim() || undefined,
      assigned_to_member_id: primaryMember?.id || activeMember?.id || "",
      assigned_to_name: assignedNames.join(", ") || primaryMember?.user?.full_name || "Member",
      assigned_to_member_ids: draftTaskMemberIds.length > 0 ? draftTaskMemberIds : (primaryMember?.id ? [primaryMember.id] : []),
      assigned_to_names: assignedNames.length > 0 ? assignedNames : [primaryMember?.user?.full_name || "Member"],
      assigned_to_role: primaryMember?.role || activeMember?.role,
      deadline: new Date(draftTaskDeadline || Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
      progress: 0,
      status: "todo",
      comments: [],
      created_at: new Date().toISOString(),
    };

    setAdvancedTasks((prev) => [...prev, newTask]);
    setDraftTaskTitle("");
    setDraftTaskDescription("");
    setDraftTaskMemberIds([]);
  };

  const handleToggleMemberForDraftTask = (memberId: string) => {
    setDraftTaskMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const handleRemoveDraftTask = (id: string) => {
    setAdvancedTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // Open Add Goal modal prefilled with specific period
  const openAddGoalModalForPeriod = (type: "yearly" | "monthly", label: string) => {
    if (!canManageGoals) return;
    setPeriodType(type);
    setPeriodLabel(label);
    setGoalTitle("");
    setGoalDescription("");
    setTargetVal(100);
    setUnitVal("percent");
    setMinExpectedVal(70);
    setIsRecurring(false);
    setRecurrenceCycle("monthly");
    setAdvancedTasks([]);
    setShowAdvancedTasks(true);
    setDraftTaskTitle("");
    setDraftTaskDescription("");
    setDraftTaskMemberIds([]);
    setDraftTaskDeadline(new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split("T")[0]);
    setEditingGoal(null);
    setIsAddGoalOpen(true);
  };

  // Open Edit Goal modal
  const openEditGoalModal = (goal: Goal) => {
    setEditingGoal(goal);
    setGoalTitle(goal.title);
    setGoalDescription(goal.description || "");
    setPeriodType((goal.period_type as "yearly" | "monthly") || "yearly");
    setPeriodLabel(goal.period_label || `${new Date().getFullYear()}`);
    setTargetVal(goal.target || 100);
    setUnitVal(goal.unit || "percent");
    setMinExpectedVal(goal.min_expected ?? 70);
    setDeadlineVal(goal.deadline ? goal.deadline.split("T")[0] : `${new Date().getFullYear()}-12-31`);
    setIsRecurring(!!goal.is_recurring);
    setRecurrenceCycle(goal.recurrence_cycle || "monthly");
    setAdvancedTasks(goal.tasks ? [...goal.tasks] : []);
    setShowAdvancedTasks(true);
    setDraftTaskTitle("");
    setDraftTaskDescription("");
    setDraftTaskMemberIds([]);
    setDraftTaskDeadline(new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split("T")[0]);
    setIsAddGoalOpen(true);
  };

  // Save (Create or Edit) Goal
  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim() || !activeOrg?.id) return;

    // Calculate overall average achievement from all members' subtasks!
    let clampedAch = 0;
    if (advancedTasks.length > 0) {
      const avgScore = Math.round(
        advancedTasks.reduce((sum, t) => sum + (t.progress || 0), 0) / advancedTasks.length
      );
      clampedAch = avgScore;
    }

    const statusVal: "pending" | "in_progress" | "completed" = 
      clampedAch >= 100 ? "completed" : clampedAch > 0 ? "in_progress" : "pending";
    const progressVal = Math.round(((targetVal || 100) * clampedAch) / 100);

    try {
      if (editingGoal) {
        await updateGoalMutation.mutateAsync({
          id: editingGoal.id,
          org_id: activeOrg.id,
          title: goalTitle,
          description: goalDescription,
          period_type: periodType,
          period_label: periodLabel,
          target: targetVal,
          unit: unitVal,
          min_expected: minExpectedVal,
          deadline: new Date(deadlineVal).toISOString(),
          achievement_percentage: clampedAch,
          status: statusVal,
          current_progress: progressVal,
          is_recurring: isRecurring,
          recurrence_cycle: isRecurring ? recurrenceCycle : undefined,
          tasks: advancedTasks,
        });
      } else {
        await createGoalMutation.mutateAsync({
          org_id: activeOrg.id,
          title: goalTitle,
          description: goalDescription,
          period_type: periodType,
          period_label: periodLabel,
          target: targetVal,
          unit: unitVal,
          min_expected: minExpectedVal,
          deadline: new Date(deadlineVal).toISOString(),
          achievement_percentage: clampedAch,
          status: statusVal,
          current_progress: progressVal,
          visibility: "public",
          is_pinned: false,
          is_recurring: isRecurring,
          recurrence_cycle: isRecurring ? recurrenceCycle : undefined,
          tasks: advancedTasks,
        });
      }

      setIsAddGoalOpen(false);
      setEditingGoal(null);
      refetch();
    } catch (err) {
      console.error("Failed to save goal:", err);
    }
  };

  // Delete Goal
  const handleDeleteGoal = async (goalId: string) => {
    if (!window.confirm(t("goals_confirm_delete"))) return;
    try {
      await deleteGoalMutation.mutateAsync({ id: goalId, org_id: activeOrg?.id || "" });
      refetch();
    } catch (err) {
      console.error("Failed to delete goal:", err);
    }
  };

  // Create new Period Bucket
  const handleCreatePeriod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPeriodLabelInput.trim()) return;

    const formattedLabel = newPeriodLabelInput.trim();
    setIsAddPeriodOpen(false);
    openAddGoalModalForPeriod(newPeriodType, formattedLabel);
    setNewPeriodLabelInput("");
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 space-y-8 select-none font-sans">
      {/* Top Banner & Title Header - Clean Modern Design */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 md:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 text-xs font-medium">
              <Target className="h-3.5 w-3.5" />
              <span>{t("goals_badge")}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {activeOrg?.name || "Organization"} {t("goals_tracker_title")}
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 max-w-2xl font-normal leading-relaxed">
              {t("goals_tracker_sub")}
            </p>
          </div>

          {/* Org Performance Summary Cards */}
          <div className="flex flex-wrap sm:flex-nowrap md:flex-col gap-3 shrink-0">
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 flex items-center gap-3.5 min-w-[200px]">
              <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center shrink-0">
                <Award className="h-4.5 w-4.5 text-emerald-700 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t("goals_overall_avg")}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">{overallAvgAchievement}%</p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 flex items-center gap-3.5 min-w-[200px]">
              <div className="h-9 w-9 rounded-lg bg-teal-100 dark:bg-teal-950/60 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4.5 w-4.5 text-teal-700 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t("goals_completed_goals")}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">{completedGoalsCount} / {totalGoals}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Tabs, Filter, Search, Create Period */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl shadow-xs">
        {/* Period Type Tabs */}
        <div className="p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1 shrink-0 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "all"
                ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            {t("goals_tab_all_periods")} ({goals.length})
          </button>
          <button
            onClick={() => setActiveTab("yearly")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "yearly"
                ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            {t("goals_tab_yearly")} ({goals.filter((g) => (g.period_type || "yearly") === "yearly").length})
          </button>
          <button
            onClick={() => setActiveTab("monthly")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "monthly"
                ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            {t("goals_tab_monthly")} ({goals.filter((g) => g.period_type === "monthly").length})
          </button>
          <button
            onClick={() => setActiveTab("tasks")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === "tasks"
                ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            <Target className="h-3.5 w-3.5 text-emerald-600" />
            <span>My Assigned Tasks</span>
            {myAssignedTasksCount > 0 && (
              <span className="bg-emerald-600 text-white text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full">
                {myAssignedTasksCount}
              </span>
            )}
          </button>
        </div>

        {/* Search & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 md:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder={t("goals_search_placeholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-8 pr-3 py-1.5 outline-none focus:ring-1 focus:ring-emerald-600 text-slate-900 dark:text-white"
            />
          </div>

          {/* Period Filter Dropdown */}
          {periodOptions.length > 0 && (
            <div className="relative shrink-0">
              <select
                value={selectedPeriodFilter}
                onChange={(e) => setSelectedPeriodFilter(e.target.value)}
                className="text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-3 py-1.5 outline-none focus:ring-1 focus:ring-emerald-600 cursor-pointer"
              >
                <option value="all">{t("goals_filter_all_label")}</option>
                {periodOptions.map((opt, i) => (
                  <option key={i} value={opt.label}>
                    {opt.type.toUpperCase()}: {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {isPaidGrowthOrPro ? (
              <Button
                variant="outline"
                size="sm"
                icon={<FileDown className="h-4 w-4 text-emerald-600" />}
                onClick={exportGoalsPDF}
                className="text-xs font-medium shrink-0 cursor-pointer"
              >
                Download PDF
              </Button>
            ) : (
              <div 
                title="Download PDF is restricted to Growth and Pro plan users"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 text-xs font-medium cursor-not-allowed select-none"
              >
                <Lock className="h-3.5 w-3.5 text-slate-400" />
                <span>PDF (Growth & Pro)</span>
              </div>
            )}

            {canManageGoals && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddPeriodOpen(true)}
                  className="text-xs font-medium shrink-0"
                >
                  {t("goals_btn_create_period")}
                </Button>

                <Button
                  size="sm"
                  icon={<Plus className="h-4 w-4" />}
                  onClick={() => openAddGoalModalForPeriod("yearly", `${new Date().getFullYear()}`)}
                  className="shrink-0"
                >
                  {t("goals_btn_add_goal")}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Growth/Pro Visual Charts or Free Plan Static Mode */}
      <GoalProgressCharts
        goals={goals}
        isPaidGrowthOrPro={isPaidGrowthOrPro}
        activeOrg={activeOrg}
        onExportPDF={exportGoalsPDF}
        canManageGoals={canManageGoals}
      />

      {/* Member Read-Only Banner */}
      {!canManageGoals && (
        <div className="p-3 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
          <Eye className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Member Read-Only Access:</strong> You can view and track organization strategic goals and progress. Only leadership roles (Admins, Managers, Accountants, Auditors) are authorized to create or modify strategic goals.
          </span>
        </div>
      )}

      {/* Main Period Buckets List OR Member Tasks View */}
      {activeTab === "tasks" ? (
        <MemberGoalTasksView
          goals={goals}
          currentMember={activeMember}
          orgId={activeOrg?.id || ""}
          canManageGoals={canManageGoals}
        />
      ) : isLoading ? (
        <div className="p-12 text-center text-slate-400 font-medium">{t("goals_loading_text")}</div>
      ) : groupedGoals.length === 0 ? (
        <Card>
          <EmptyState
            title={t("goals_empty_title")}
            message={t("goals_empty_desc")}
            action={
              canManageGoals ? (
                <div className="flex flex-wrap gap-3 justify-center">
                  <Button
                    size="sm"
                    onClick={() => openAddGoalModalForPeriod("yearly", `${new Date().getFullYear()}`)}
                  >
                    {t("goals_btn_add_goal")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAddPeriodOpen(true)}
                    className="font-bold"
                  >
                    {t("goals_btn_create_period")}
                  </Button>
                </div>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedGoals.map((periodGroup) => {
            const pGoals = periodGroup.goals;
            const pTotal = pGoals.length;
            const pCompleted = pGoals.filter((g) => g.status === "completed" || (g.achievement_percentage || 0) >= 100).length;
            
            // Calculate exact average achievement for this specific duration/period
            const pAvgAchievement = pTotal > 0
              ? Math.round(pGoals.reduce((sum, g) => sum + (g.achievement_percentage || 0), 0) / pTotal)
              : 0;

            const isYearly = periodGroup.type === "yearly";

            return (
              <div
                key={`${periodGroup.type}_${periodGroup.label}`}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-5 transition"
              >
                {/* Period Card Header with Average Stats */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${
                      isYearly 
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" 
                        : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                    }`}>
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white capitalize">
                          {periodGroup.label} {periodGroup.type} Goals
                        </h2>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                          isYearly 
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" 
                            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        }`}>
                          {periodGroup.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                        {pCompleted} of {pTotal} {t("goals_items_completed")}
                      </p>
                    </div>
                  </div>

                  {/* Period Average Score Card & Progress Bar */}
                  <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="text-right">
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Period Average
                      </div>
                      <div className="text-base font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                        {pAvgAchievement}%
                      </div>
                    </div>
                    <div className="w-24 bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden shrink-0">
                      <div
                        className={`h-full transition-all duration-500 ${
                          pAvgAchievement >= 75
                            ? "bg-emerald-500"
                            : pAvgAchievement >= 40
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        }`}
                        style={{ width: `${pAvgAchievement}%` }}
                      />
                    </div>
                    {canManageGoals && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openAddGoalModalForPeriod(periodGroup.type, periodGroup.label)}
                        className="text-xs font-medium ml-1 shrink-0"
                      >
                        {t("goals_btn_add_item")}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Todo List of Goals inside this Period */}
                <div className="space-y-3">
                  {pGoals.map((goal) => {
                    const isCompleted = goal.status === "completed" || (goal.achievement_percentage || 0) >= 100;
                    const achievementScore = goal.achievement_percentage || 0;

                    return (
                      <div
                        key={goal.id}
                        className={`group p-4 rounded-xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          isCompleted
                            ? "bg-slate-50/70 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800/60 opacity-90"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs"
                        }`}
                      >
                        {/* Left: Checkbox & Goal Title/Details */}
                        <div className="flex items-start gap-3.5 flex-1 min-w-0">
                          <button
                            onClick={() => handleToggleTodo(goal)}
                            disabled={!canManageGoals}
                            title={isCompleted ? "Mark as pending" : "Mark as completed"}
                            className={`mt-0.5 shrink-0 text-slate-400 transition ${canManageGoals ? "hover:text-emerald-600 cursor-pointer" : "cursor-default opacity-80"}`}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="h-6 w-6 text-emerald-600 fill-emerald-100 dark:fill-emerald-950/80" />
                            ) : (
                              <Circle className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                            )}
                          </button>

                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3
                                className={`text-base font-bold text-slate-800 dark:text-slate-100 leading-snug break-words ${
                                  isCompleted ? "line-through text-slate-400 dark:text-slate-500" : ""
                                }`}
                              >
                                {goal.title}
                              </h3>
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md">
                                Min Target: {goal.min_expected ?? 70}%
                              </span>
                              {achievementScore < (goal.min_expected ?? 70) && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 px-2 py-0.5 rounded-md">
                                  <AlertTriangle className="h-3 w-3 shrink-0" />
                                  <span>Below Min Target ({goal.min_expected ?? 70}%)</span>
                                </span>
                              )}
                              {achievementScore >= (goal.min_expected ?? 70) && achievementScore > 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-md">
                                  <Check className="h-3 w-3 shrink-0" />
                                  <span>Met Min Target</span>
                                </span>
                              )}
                            </div>

                            {goal.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                {goal.description}
                              </p>
                            )}

                            {goal.tasks && goal.tasks.length > 0 && (
                              <div className="pt-1 flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-md">
                                  {goal.tasks.filter(t => t.status === "completed" || (t.progress || 0) >= 100).length}/{goal.tasks.length} Subtasks Done
                                </span>
                                {goal.tasks.slice(0, 2).map((st) => (
                                  <span key={st.id} className="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded flex items-center gap-1">
                                    <span className="truncate max-w-[120px]">{st.title}</span>
                                    <span className="font-mono font-bold text-emerald-600">({st.progress || 0}%)</span>
                                  </span>
                                ))}
                                {goal.tasks.length > 2 && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    +{goal.tasks.length - 2} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Middle: Goals Planning Clock with Overdue Alert (image_250d7ea7.png) */}
                        {(() => {
                          const now = new Date();
                          const dueDate = goal.deadline ? new Date(goal.deadline) : null;
                          if (!dueDate) return null;
                          const isPastDue = dueDate.getTime() < now.getTime() && !isCompleted;
                          const diffDays = Math.max(1, Math.ceil(Math.abs(now.getTime() - dueDate.getTime()) / (1000 * 3600 * 24)));
                          const formattedDate = dueDate.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });

                          return (
                            <div className="flex flex-col items-center justify-center shrink-0 self-center sm:self-auto py-1">
                              {isPastDue ? (
                                <div className="flex flex-col items-center justify-center p-2 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-center shadow-3xs min-w-[90px] min-h-[90px] animate-in fade-in">
                                  <span className="text-rose-700 dark:text-rose-300 font-extrabold text-[11px] leading-tight block">
                                    Overdue<br />by {diffDays}d
                                  </span>
                                  <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 mt-1">
                                    <Clock className="h-3 w-3 shrink-0" />
                                    <span className="text-[9px] font-bold leading-tight">
                                      (Due {formattedDate})
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                                  <Clock className="h-3.5 w-3.5 text-emerald-600" />
                                  <span>Due {formattedDate}</span>
                                </div>
                              )}

                              {goal.is_recurring && (
                                <div className="flex items-center gap-1 text-teal-600 dark:text-teal-400 text-[10px] font-bold mt-1 text-center">
                                  <RefreshCw className="h-3 w-3 shrink-0" />
                                  <span className="leading-tight">Auto-<br />recurring cycle</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Right: Achievement Slider & Quick Preset Buttons */}
                        <div className="flex flex-wrap items-center gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                          {isPaidGrowthOrPro ? (
                            <>
                              {/* Percentage Preset Quick Buttons (Growth/Pro) */}
                              {canManageGoals && (
                                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
                                  {[0, 25, 50, 75, 100].map((preset) => (
                                    <button
                                      key={preset}
                                      onClick={() => handleUpdateAchievement(goal, preset)}
                                      className={`px-2 py-0.5 text-[10px] font-bold rounded-lg transition cursor-pointer ${
                                        achievementScore === preset
                                          ? "bg-emerald-600 text-white shadow-xs"
                                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                                      }`}
                                    >
                                      {preset}%
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* Numeric Score Tag */}
                              <div className="min-w-[3.5rem] text-right">
                                <span className="text-sm font-black text-slate-900 dark:text-white">
                                  {achievementScore}%
                                </span>
                              </div>
                            </>
                          ) : (
                            /* Static Goal Tracker on Free Plan */
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-semibold">
                                Target: {goal.target || 100} {goal.unit || "%"}
                              </span>
                              <Badge color={isCompleted ? "green" : "gray"}>
                                {isCompleted ? "COMPLETED" : "TARGET SET"}
                              </Badge>
                            </div>
                          )}

                          {/* Edit / Delete Buttons */}
                          {canManageGoals && (
                            <div className="flex items-center gap-1 border-l pl-2 border-slate-200 dark:border-slate-700">
                              <button
                                onClick={() => openEditGoalModal(goal)}
                                title="Edit Goal"
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteGoal(goal.id)}
                                title="Delete Goal"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Add or Edit Goal */}
      {isAddGoalOpen && (
        <Modal
          isOpen={isAddGoalOpen}
          onClose={() => setIsAddGoalOpen(false)}
          title={editingGoal ? t("goals_edit_goal_title") : t("goals_add_goal_title")}
        >
          <form onSubmit={handleSaveGoal} className="space-y-4 font-sans text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                {t("goals_field_title_label")}
              </label>
              <Input
                required
                placeholder={t("goals_field_title_placeholder")}
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                {t("goals_field_desc_label")}
              </label>
              <textarea
                rows={3}
                placeholder={t("goals_field_desc_placeholder")}
                value={goalDescription}
                onChange={(e) => setGoalDescription(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 p-3 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  {t("goals_field_period_type")}
                </label>
                <select
                  value={periodType}
                  onChange={(e) => setPeriodType(e.target.value as "yearly" | "monthly")}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 p-2.5 outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                >
                  <option value="yearly">{t("goals_option_yearly_goal")}</option>
                  <option value="monthly">{t("goals_option_monthly_goal")}</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  {t("goals_field_period_label")}
                </label>
                <Input
                  required
                  placeholder={periodType === "yearly" ? "2026" : "July 2026"}
                  value={periodLabel}
                  onChange={(e) => setPeriodLabel(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  {t("goals_field_deadline")}
                </label>
                <Input
                  type="date"
                  value={deadlineVal}
                  onChange={(e) => setDeadlineVal(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Minimum Expected Goal Target (%)
                </label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={minExpectedVal}
                  onChange={(e) => setMinExpectedVal(Number(e.target.value))}
                  placeholder="e.g. 70"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Threshold percentage required to pass this goal's minimum target.
                </p>
              </div>
            </div>

            {/* Auto-recurring Cycle Timer */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between gap-1.5">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-200 select-none">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={e => setIsRecurring(e.target.checked)}
                  className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="flex items-center gap-1.5 text-xs">
                  <RefreshCw className="h-3.5 w-3.5 text-teal-600" />
                  <span>Auto-recurring cycle timer</span>
                </span>
              </label>
              {isRecurring && (
                <div className="flex items-center gap-2 pt-1 animate-in fade-in">
                  <span className="text-[11px] text-slate-500 font-medium">Frequency:</span>
                  <select
                    value={recurrenceCycle}
                    onChange={e => setRecurrenceCycle(e.target.value as any)}
                    className="text-xs p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold"
                  >
                    <option value="weekly">Weekly cycle</option>
                    <option value="monthly">Monthly cycle</option>
                    <option value="quarterly">Quarterly cycle</option>
                  </select>
                </div>
              )}
            </div>

            {/* Advanced Section: Subtask Delegation (Multi-Member Assignment & Large Description Input) */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdvancedTasks(!showAdvancedTasks)}
                className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                    Advanced: Assign Subtasks to One or More Members
                  </span>
                  {advancedTasks.length > 0 && (
                    <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded font-mono text-[10px] font-bold">
                      {advancedTasks.length} task{advancedTasks.length === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span>{showAdvancedTasks ? "Collapse" : "Expand"}</span>
                  {showAdvancedTasks ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </div>
              </button>

              {showAdvancedTasks && (
                <div className="p-3.5 space-y-3.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 animate-in fade-in">
                  <p className="text-[11px] text-slate-500">
                    Delegate tasks to one or multiple members with large detailed descriptions and independent deadlines (can be set beyond the goal deadline). Each member's task progress directly dictates the goal's overall real-time average!
                  </p>

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <span className="font-bold text-[11px] text-slate-700 dark:text-slate-200 uppercase tracking-wider block">
                      Add New Subtask
                    </span>

                    {/* 1. Multi-member selection checkboxes with real icons */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                        1. Assign to Member(s) — Select One or Multiple:
                      </label>
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                        {members.length === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">No members found in organization.</span>
                        ) : (
                          members.map((m) => {
                            const isSelected = draftTaskMemberIds.includes(m.id);
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => handleToggleMemberForDraftTask(m.id)}
                                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
                                  isSelected
                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                    : "bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-200"
                                }`}
                              >
                                {isSelected ? <Check className="h-3 w-3 shrink-0" /> : <Plus className="h-3 w-3 shrink-0" />}
                                <span>{m.user?.full_name || "Member"}</span>
                                <span className="opacity-75 font-mono text-[9px]">({m.role})</span>
                              </button>
                            );
                          })
                        )}
                      </div>
                      {draftTaskMemberIds.length > 0 && (
                        <p className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>Assigned to {draftTaskMemberIds.length} member{draftTaskMemberIds.length === 1 ? "" : "s"}</span>
                        </p>
                      )}
                    </div>

                    {/* 2. Task Title & Deadline Grid for Maximum Speed */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                      <div className="sm:col-span-8">
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          2. Task Title / Deliverable Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Procure organic fertilizer & audit supplier receipts"
                          value={draftTaskTitle}
                          onChange={(e) => setDraftTaskTitle(e.target.value)}
                          className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 outline-none focus:ring-1 focus:ring-emerald-500 font-semibold h-9"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Task Deadline (Can exceed goal deadline)
                        </label>
                        <input
                          type="date"
                          value={draftTaskDeadline}
                          onChange={(e) => setDraftTaskDeadline(e.target.value)}
                          className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-emerald-500 h-9"
                        />
                      </div>
                    </div>

                    {/* 3. Large Input to Describe Task & Quick Action Button */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        3. Detailed Deliverables & Instructions
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Detailed instructions, milestones, quality criteria, and expected outcome for assigned members..."
                        value={draftTaskDescription}
                        onChange={(e) => setDraftTaskDescription(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 outline-none focus:ring-1 focus:ring-emerald-500 font-sans leading-relaxed"
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleAddDraftTask}
                        disabled={!draftTaskTitle.trim()}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold cursor-pointer shrink-0 shadow-xs flex items-center gap-1.5 transition"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Subtask</span>
                      </button>
                    </div>
                  </div>

                  {/* List of Added Draft Subtasks with Clean Icons */}
                  {advancedTasks.length > 0 ? (
                    <div className="space-y-2 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Assigned Subtasks ({advancedTasks.length})
                      </span>
                      <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                        {advancedTasks.map((t, idx) => (
                          <div
                            key={t.id}
                            className="p-3 flex items-start justify-between gap-3 bg-white dark:bg-slate-900 text-xs"
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <span className="font-mono text-[10px] text-slate-400 font-bold shrink-0 mt-0.5">
                                #{idx + 1}
                              </span>
                              <div className="min-w-0 space-y-1">
                                <span className="font-bold text-slate-900 dark:text-white block leading-snug">
                                  {t.title}
                                </span>
                                {t.description && (
                                  <p className="text-[11px] text-slate-500 line-clamp-2">
                                    {t.description}
                                  </p>
                                )}
                                <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 pt-0.5">
                                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    <span>{t.assigned_to_name}</span>
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1 font-mono">
                                    <Calendar className="h-3 w-3 text-slate-400" />
                                    <span>Due {new Date(t.deadline).toLocaleDateString()}</span>
                                  </span>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveDraftTask(t.id)}
                              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
                              title="Remove Task"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic text-center py-2">
                      No subtasks added yet. Add tasks above to delegate responsibilities to specific members.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setIsAddGoalOpen(false)}>
                {t("goals_btn_cancel")}
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                {editingGoal ? t("goals_btn_save_changes") : t("goals_btn_create_goal_item")}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: Create New Duration Period */}
      {isAddPeriodOpen && (
        <Modal
          isOpen={isAddPeriodOpen}
          onClose={() => setIsAddPeriodOpen(false)}
          title={t("goals_modal_period_title")}
        >
          <form onSubmit={handleCreatePeriod} className="space-y-4 font-sans text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                {t("goals_modal_period_type")}
              </label>
              <select
                value={newPeriodType}
                onChange={(e) => setNewPeriodType(e.target.value as "yearly" | "monthly")}
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 p-2.5 outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
              >
                <option value="yearly">{t("goals_modal_yearly_period_opt")}</option>
                <option value="monthly">{t("goals_modal_monthly_period_opt")}</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                {t("goals_modal_period_name_label")}
              </label>
              <Input
                required
                placeholder={newPeriodType === "yearly" ? "2026" : "August 2026"}
                value={newPeriodLabelInput}
                onChange={(e) => setNewPeriodLabelInput(e.target.value)}
              />
              <p className="text-[11px] text-slate-400 mt-1">
                {t("goals_modal_period_help")}
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setIsAddPeriodOpen(false)}>
                {t("goals_btn_cancel")}
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                {t("goals_btn_proceed_first")}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
