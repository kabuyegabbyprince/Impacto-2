import React, { useState, useMemo } from "react";
import { useLocalTranslation } from "../locales/additional-translations";
import { useOrgStore } from "../store/orgStore";
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from "../hooks/useImpactoData";
import { Card, Button, Input, Badge, EmptyState, Modal, Tabs } from "../components/ui";
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
  Filter
} from "lucide-react";
import { Goal } from "../types";

export const GoalsPage: React.FC = () => {
  const { t } = useLocalTranslation();
  const { activeOrg, activeMember } = useOrgStore();
  const isAdmin = activeMember?.role === "org_admin";

  const { data: goals = [], isLoading, refetch } = useGoals(activeOrg?.id);
  const createGoalMutation = useCreateGoal();
  const updateGoalMutation = useUpdateGoal();
  const deleteGoalMutation = useDeleteGoal();

  // Filters & State
  const [activeTab, setActiveTab] = useState<"all" | "yearly" | "monthly">("all");
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
  const [deadlineVal, setDeadlineVal] = useState(`${new Date().getFullYear()}-12-31`);
  const [initialAchievement, setInitialAchievement] = useState<number>(0);

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

  // Open Add Goal modal prefilled with specific period
  const openAddGoalModalForPeriod = (type: "yearly" | "monthly", label: string) => {
    setPeriodType(type);
    setPeriodLabel(label);
    setGoalTitle("");
    setGoalDescription("");
    setTargetVal(100);
    setUnitVal("percent");
    setInitialAchievement(0);
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
    setDeadlineVal(goal.deadline ? goal.deadline.split("T")[0] : `${new Date().getFullYear()}-12-31`);
    setInitialAchievement(goal.achievement_percentage || 0);
    setIsAddGoalOpen(true);
  };

  // Save (Create or Edit) Goal
  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim() || !activeOrg?.id) return;

    const clampedAch = Math.max(0, Math.min(100, initialAchievement));
    const statusVal = clampedAch >= 100 ? "completed" : clampedAch > 0 ? "in_progress" : "pending";
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
          deadline: new Date(deadlineVal).toISOString(),
          achievement_percentage: clampedAch,
          status: statusVal,
          current_progress: progressVal,
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
          deadline: new Date(deadlineVal).toISOString(),
          achievement_percentage: clampedAch,
          status: statusVal,
          current_progress: progressVal,
          visibility: "public",
          is_pinned: false,
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-3xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-[#156c45] dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 text-xs font-bold">
              <Target className="h-3.5 w-3.5 text-[#156c45] dark:text-emerald-400" />
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
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 rounded-xl px-5 py-3.5 flex items-center gap-3.5 shadow-3xs min-w-[200px]">
              <div className="h-10 w-10 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/50 flex items-center justify-center shrink-0">
                <Award className="h-5 w-5 text-[#156c45] dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-400">{t("goals_overall_avg")}</p>
                <p className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">{overallAvgAchievement}%</p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 rounded-xl px-5 py-3.5 flex items-center gap-3.5 shadow-3xs min-w-[200px]">
              <div className="h-10 w-10 rounded-xl bg-teal-100/70 dark:bg-teal-950/50 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5 text-teal-700 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-400">{t("goals_completed_goals")}</p>
                <p className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">{completedGoalsCount} / {totalGoals}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Tabs, Filter, Search, Create Period */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-3xs">
        {/* Period Type Tabs - Clean Segmented Pill */}
        <div className="p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-1 shrink-0 overflow-x-auto scrollbar-none shadow-3xs">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "all"
                ? "bg-white dark:bg-slate-900 text-[#156c45] dark:text-emerald-400 shadow-3xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            {t("goals_tab_all_periods")} ({goals.length})
          </button>
          <button
            onClick={() => setActiveTab("yearly")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "yearly"
                ? "bg-white dark:bg-slate-900 text-[#156c45] dark:text-emerald-400 shadow-3xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            {t("goals_tab_yearly")} ({goals.filter((g) => (g.period_type || "yearly") === "yearly").length})
          </button>
          <button
            onClick={() => setActiveTab("monthly")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "monthly"
                ? "bg-white dark:bg-slate-900 text-[#156c45] dark:text-emerald-400 shadow-3xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            {t("goals_tab_monthly")} ({goals.filter((g) => g.period_type === "monthly").length})
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
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-8 pr-3 py-2 outline-none focus:ring-2 focus:ring-[#156c45] text-slate-800 dark:text-slate-100 shadow-3xs"
            />
          </div>

          {/* Period Filter Dropdown */}
          {periodOptions.length > 0 && (
            <div className="relative shrink-0">
              <select
                value={selectedPeriodFilter}
                onChange={(e) => setSelectedPeriodFilter(e.target.value)}
                className="text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-[#156c45] shadow-3xs cursor-pointer"
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddPeriodOpen(true)}
            className="text-xs font-bold shrink-0"
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
        </div>
      </div>

      {/* Main Period Buckets List */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 font-medium">{t("goals_loading_text")}</div>
      ) : groupedGoals.length === 0 ? (
        <Card>
          <EmptyState
            title={t("goals_empty_title")}
            message={t("goals_empty_desc")}
            action={
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
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5 transition"
              >
                {/* Period Card Header with Average Stats */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-2xl ${
                      isYearly 
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300" 
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                    }`}>
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white capitalize">
                          {periodGroup.label} {periodGroup.type} {t("goals_tab_yearly")}
                        </h2>
                        <Badge color={isYearly ? "amber" : "green"}>
                          {periodGroup.type.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        {pCompleted} of {pTotal} {t("goals_items_completed")}
                      </p>
                    </div>
                  </div>

                  {/* Period Average Score Card & Progress Bar */}
                  <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/60">
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                        {t("goals_avg_period_achievement")}
                      </div>
                      <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                        {pAvgAchievement}% {t("goals_score")}
                      </div>
                    </div>
                    <div className="w-24 bg-slate-200 dark:bg-slate-700 h-3.5 rounded-full overflow-hidden shrink-0">
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openAddGoalModalForPeriod(periodGroup.type, periodGroup.label)}
                      className="text-xs font-bold ml-1 shrink-0"
                    >
                      {t("goals_btn_add_item")}
                    </Button>
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
                        className={`group p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          isCompleted
                            ? "bg-slate-50/70 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800/60 opacity-90"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 shadow-xs"
                        }`}
                      >
                        {/* Left: Checkbox & Goal Title/Details */}
                        <div className="flex items-start gap-3.5 flex-1 min-w-0">
                          <button
                            onClick={() => handleToggleTodo(goal)}
                            title={isCompleted ? "Mark as pending" : "Mark as completed"}
                            className="mt-0.5 shrink-0 text-slate-400 hover:text-emerald-600 transition"
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="h-6 w-6 text-emerald-600 fill-emerald-100 dark:fill-emerald-950/80" />
                            ) : (
                              <Circle className="h-6 w-6 text-slate-300 dark:text-slate-600 hover:text-emerald-500" />
                            )}
                          </button>

                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3
                                className={`text-base font-bold text-slate-800 dark:text-slate-100 leading-snug break-words ${
                                  isCompleted ? "line-through text-slate-400 dark:text-slate-500" : ""
                                }`}
                              >
                                {goal.title}
                              </h3>
                              {goal.deadline && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                                  <Clock className="h-3 w-3" />
                                  {new Date(goal.deadline).toLocaleDateString()}
                                </span>
                              )}
                            </div>

                            {goal.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                {goal.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right: Achievement Slider & Quick Preset Buttons */}
                        <div className="flex flex-wrap items-center gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                          {/* Percentage Preset Quick Buttons */}
                          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
                            {[0, 25, 50, 75, 100].map((preset) => (
                              <button
                                key={preset}
                                onClick={() => handleUpdateAchievement(goal, preset)}
                                className={`px-2 py-0.5 text-[10px] font-bold rounded-lg transition ${
                                  achievementScore === preset
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                                }`}
                              >
                                {preset}%
                              </button>
                            ))}
                          </div>

                          {/* Numeric Score Tag */}
                          <div className="min-w-[3.5rem] text-right">
                            <span className="text-sm font-black text-slate-900 dark:text-white">
                              {achievementScore}%
                            </span>
                          </div>

                          {/* Edit / Delete Buttons */}
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
                  {t("goals_field_score_label")}
                </label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={initialAchievement}
                  onChange={(e) => setInitialAchievement(Number(e.target.value))}
                />
              </div>
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
