import React, { useState } from "react";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  MessageSquare, 
  Send, 
  User, 
  Target, 
  Calendar, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  Users,
  AlertTriangle
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Goal, GoalTask, OrgMember } from "../types";
import { RealtimeTaskCountdown } from "./RealtimeTaskCountdown";
import { Button, Badge, Modal } from "./ui";
import { useUpdateGoalTask } from "../hooks/useImpactoData";

interface MemberGoalTasksViewProps {
  goals: Goal[];
  currentMember?: OrgMember | null;
  orgId: string;
  canManageGoals?: boolean;
}

export const MemberGoalTasksView: React.FC<MemberGoalTasksViewProps> = ({
  goals,
  currentMember,
  orgId,
  canManageGoals = false
}) => {
  const { t, i18n } = useTranslation();
  const updateTaskMutation = useUpdateGoalTask();

  // Modal / Drawer state for updating task with comment
  const [activeTaskModal, setActiveTaskModal] = useState<{
    goal: Goal;
    task: GoalTask;
  } | null>(null);

  const [modalProgress, setModalProgress] = useState<number>(0);
  const [modalStatus, setModalStatus] = useState<"todo" | "in_progress" | "completed">("todo");
  const [modalComment, setModalComment] = useState("");
  const [expandedCommentTaskId, setExpandedCommentTaskId] = useState<string | null>(null);

  // Filter tasks: default to current member's tasks, with toggle for all
  const [filterMode, setFilterMode] = useState<"my_tasks" | "all_tasks">("my_tasks");

  // Multi-member assignment check
  const isTaskAssignedToMember = (task: GoalTask, memberId?: string) => {
    if (!memberId) return false;
    if (task.assigned_to_member_id === memberId) return true;
    if (task.assigned_to_member_ids?.includes(memberId)) return true;
    return false;
  };

  // Deadline reminder message calculation
  const getTaskDeadlineReminder = (deadlineStr: string, isCompleted: boolean) => {
    if (isCompleted || !deadlineStr) return null;
    const now = new Date();
    const due = new Date(deadlineStr);
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 3600 * 24));

    if (diffDays <= 0) {
      const overdueDays = Math.abs(diffDays);
      return {
        type: "overdue",
        label: overdueDays === 0
          ? t("member_goal_tasks.overdue_today", { defaultValue: "Daily Overdue Alert: Task is due today! Incomplete task reduces overall goal average." })
          : t("member_goal_tasks.overdue_days", { count: overdueDays, defaultValue: "Daily Overdue Alert: Task is {{count}} day(s) past deadline! Incomplete task reduces overall goal average." }),
        color: "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/60 dark:border-rose-900 dark:text-rose-300",
      };
    } else if (diffDays === 1) {
      return {
        type: "urgent",
        label: t("member_goal_tasks.urgent_tomorrow", { defaultValue: "Urgent: Task is due tomorrow! Complete your portion now." }),
        color: "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/60 dark:border-amber-900 dark:text-amber-300",
      };
    } else if (diffDays <= 7) {
      return {
        type: "reminder",
        label: t("member_goal_tasks.reminder_days", { count: diffDays, defaultValue: "Reminder: Task is due in {{count}} day(s) (1-week deadline window)." }),
        color: "bg-teal-50 border-teal-200 text-teal-800 dark:bg-teal-950/60 dark:border-teal-900 dark:text-teal-300",
      };
    }
    return null;
  };

  // Flatten all tasks from all goals
  const allGoalTasks: { goal: Goal; task: GoalTask }[] = [];
  goals.forEach((goal) => {
    (goal.tasks || []).forEach((task) => {
      allGoalTasks.push({ goal, task });
    });
  });

  const displayedTasks = allGoalTasks.filter(({ task }) => {
    if (filterMode === "my_tasks" && currentMember?.id) {
      return isTaskAssignedToMember(task, currentMember.id);
    }
    return true;
  });

  const myTasksCount = allGoalTasks.filter(
    ({ task }) => currentMember?.id && isTaskAssignedToMember(task, currentMember.id)
  ).length;

  // Active reminders for current member
  const myActiveReminders = allGoalTasks
    .filter(({ task }) => currentMember?.id && isTaskAssignedToMember(task, currentMember.id))
    .map(({ goal, task }) => ({
      goal,
      task,
      reminder: getTaskDeadlineReminder(task.deadline, task.status === "completed" || (task.progress || 0) >= 100),
    }))
    .filter((item) => item.reminder !== null);

  const openUpdateModal = (goal: Goal, task: GoalTask) => {
    setActiveTaskModal({ goal, task });
    setModalProgress(task.progress || 0);
    setModalStatus(task.status || "todo");
    setModalComment("");
  };

  const handleQuickProgressUpdate = async (
    goal: Goal,
    task: GoalTask,
    newProgress: number
  ) => {
    const newStatus: "todo" | "in_progress" | "completed" = 
      newProgress >= 100 ? "completed" : newProgress > 0 ? "in_progress" : "todo";

    await updateTaskMutation.mutateAsync({
      goalId: goal.id,
      taskId: task.id,
      progress: newProgress,
      status: newStatus,
      comment: t("member_goal_tasks.quick_progress_comment", { progress: newProgress, defaultValue: `Updated progress to ${newProgress}%` }),
      member: {
        id: currentMember?.id || "member",
        name: currentMember?.user?.full_name || currentMember?.role || t("common.member", { defaultValue: "Member" }),
        role: currentMember?.role,
      },
      orgId,
    });
  };

  const handleToggleTodo = async (goal: Goal, task: GoalTask, todoId: string) => {
    const currentTodos = task.todos || [];
    const updatedTodos = currentTodos.map(td =>
      td.id === todoId ? { ...td, completed: !td.completed } : td
    );
    const completedCount = updatedTodos.filter(td => td.completed).length;
    const newProgress = updatedTodos.length > 0 ? Math.round((completedCount / updatedTodos.length) * 100) : task.progress;
    const newStatus: "todo" | "in_progress" | "completed" =
      newProgress >= 100 ? "completed" : newProgress > 0 ? "in_progress" : "todo";

    await updateTaskMutation.mutateAsync({
      goalId: goal.id,
      taskId: task.id,
      progress: newProgress,
      status: newStatus,
      todos: updatedTodos,
      comment: t("member_goal_tasks.toggled_subtask_comment", { defaultValue: "Toggled subtask checklist item" }),
      member: {
        id: currentMember?.id || "member",
        name: currentMember?.user?.full_name || currentMember?.role || t("common.member", { defaultValue: "Member" }),
        role: currentMember?.role,
      },
      orgId,
    });
  };

  const handleSaveModalUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTaskModal) return;

    const { goal, task } = activeTaskModal;
    const finalStatus: "todo" | "in_progress" | "completed" =
      modalProgress >= 100 ? "completed" : modalProgress > 0 ? "in_progress" : "todo";

    await updateTaskMutation.mutateAsync({
      goalId: goal.id,
      taskId: task.id,
      progress: modalProgress,
      status: finalStatus,
      comment: modalComment.trim() || undefined,
      member: {
        id: currentMember?.id || "member",
        name: currentMember?.user?.full_name || currentMember?.role || t("common.member", { defaultValue: "Member" }),
        role: currentMember?.role,
      },
      orgId,
    });

    setActiveTaskModal(null);
  };

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Header controls & filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 break-words">
            <Target className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{t("member_goal_tasks.header_title", { defaultValue: "Assigned Goal Tasks & Deliverables" })}</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 break-words">
            {t("member_goal_tasks.header_subtitle", { defaultValue: "Members add their task progress here. The system averages all members' task completion levels to derive the overall goal score in real time." })}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-1">
            <button
              onClick={() => setFilterMode("my_tasks")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer whitespace-nowrap ${
                filterMode === "my_tasks"
                  ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {t("member_goal_tasks.my_tasks_tab", { count: myTasksCount, defaultValue: `My Tasks (${myTasksCount})` })}
            </button>
            <button
              onClick={() => setFilterMode("all_tasks")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer whitespace-nowrap ${
                filterMode === "all_tasks"
                  ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {t("member_goal_tasks.all_tasks_tab", { count: allGoalTasks.length, defaultValue: `All Assigned Tasks (${allGoalTasks.length})` })}
            </button>
          </div>
        </div>
      </div>

      {/* Task Deadline Reminders Notification Banner */}
      {myActiveReminders.length > 0 && (
        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 space-y-2">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs break-words">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>{t("member_goal_tasks.deadline_notifications_title", { count: myActiveReminders.length, defaultValue: `Task Deadline Notifications (${myActiveReminders.length} Active Reminders)` })}</span>
          </div>
          <div className="space-y-1.5 pt-1">
            {myActiveReminders.map(({ goal, task, reminder }) => (
              <div
                key={task.id}
                className={`p-2.5 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-medium ${reminder?.color}`}
              >
                <div className="min-w-0">
                  <span className="font-bold uppercase font-mono text-[10px] block opacity-80 break-words">
                    {t("member_goal_tasks.goal_label", { title: goal.title, defaultValue: `Goal: ${goal.title}` })}
                  </span>
                  <span className="font-bold break-words">{task.title}</span>
                  <p className="text-[11px] mt-0.5 break-words">{reminder?.label}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => openUpdateModal(goal, task)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-7 text-[11px] shrink-0 self-start sm:self-auto"
                >
                  {t("member_goal_tasks.update_progress_btn", { defaultValue: "Update Progress" })}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {displayedTasks.length === 0 ? (
        <div className="p-8 sm:p-12 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center gap-2">
          <Target className="h-8 w-8 text-slate-300 dark:text-slate-600" />
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {filterMode === "my_tasks"
              ? t("member_goal_tasks.empty_my_title", { defaultValue: "No Tasks Assigned to You" })
              : t("member_goal_tasks.empty_all_title", { defaultValue: "No Subtasks Created Yet" })}
          </h4>
          <p className="text-[11px] text-slate-500 max-w-sm break-words">
            {filterMode === "my_tasks"
              ? t("member_goal_tasks.empty_my_desc", { defaultValue: "When leadership assigns specific deliverables to you under strategic goals, they will appear here with live countdowns." })
              : t("member_goal_tasks.empty_all_desc", { defaultValue: "When creating strategic goals, use the 'Advanced: Assign Subtasks' section to delegate responsibilities to members." })}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedTasks.map(({ goal, task }) => {
            const isCompleted = task.status === "completed" || (task.progress || 0) >= 100;
            const isMine = isTaskAssignedToMember(task, currentMember?.id);
            const comments = task.comments || [];
            const isCommentsExpanded = expandedCommentTaskId === task.id;
            const reminder = getTaskDeadlineReminder(task.deadline, isCompleted);

            return (
              <div
                key={task.id}
                className={`bg-white dark:bg-slate-900 border rounded-xl p-5 shadow-xs transition flex flex-col justify-between gap-4 min-w-0 ${
                  isCompleted
                    ? "border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/10"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="min-w-0">
                  {/* Top Bar: Parent Goal Reference & Live Countdown */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <span className="text-[10px] font-bold tracking-wider uppercase font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-md break-words min-w-0">
                      {t("member_goal_tasks.goal_label", { title: goal.title, defaultValue: `Goal: ${goal.title}` })}
                    </span>
                    <RealtimeTaskCountdown
                      deadline={task.deadline}
                      isCompleted={isCompleted}
                    />
                  </div>

                  {/* Task Title */}
                  <h4 className={`text-sm font-bold text-slate-900 dark:text-white leading-snug break-words ${
                    isCompleted ? "line-through text-slate-400 dark:text-slate-500" : ""
                  }`}>
                    {task.title}
                  </h4>

                  {/* Large Task Description */}
                  {task.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 mt-2 leading-relaxed whitespace-pre-wrap break-words">
                      {task.description}
                    </p>
                  )}

                  {/* Subtask To-Do Checklist with Checkboxes */}
                  {task.todos && task.todos.length > 0 && (
                    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase font-mono text-slate-500 dark:text-slate-400">
                          {t("member_goal_tasks.checklist_label", {
                            done: task.todos.filter(td => td.completed).length,
                            total: task.todos.length,
                            defaultValue: `Task Checklist (${task.todos.filter(td => td.completed).length}/${task.todos.length} Done)`
                          })}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-600 font-bold">
                          {Math.round((task.todos.filter(td => td.completed).length / task.todos.length) * 100)}%
                        </span>
                      </div>
                      <div className="space-y-1.5 pt-0.5">
                        {task.todos.map((todo) => (
                          <label key={todo.id} className="flex items-start gap-2 cursor-pointer text-xs group">
                            <input
                              type="checkbox"
                              checked={todo.completed}
                              onChange={() => handleToggleTodo(goal, task, todo.id)}
                              disabled={updateTaskMutation.isPending}
                              className="rounded accent-emerald-600 h-3.5 w-3.5 cursor-pointer shrink-0 mt-0.5"
                            />
                            <span className={`transition break-words min-w-0 ${todo.completed ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-300"}`}>
                              {todo.text}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Deadline Reminder Alert Badge */}
                  {reminder && (
                    <div className={`mt-2.5 p-2 rounded-lg border text-[11px] font-semibold break-words ${reminder.color}`}>
                      {reminder.label}
                    </div>
                  )}

                  {/* Assignees & Deadline Info */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-2.5">
                    <span className="flex flex-wrap items-center gap-1 font-medium min-w-0">
                      <Users className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="break-words">{task.assigned_to_name || t("member_goal_tasks.unassigned", { defaultValue: "Unassigned" })}</span>
                      {isMine && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded whitespace-nowrap">
                          {t("member_goal_tasks.assigned_to_you", { defaultValue: "(Assigned to You)" })}
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>
                        {t("member_goal_tasks.due_label", {
                          date: task.deadline ? new Date(task.deadline).toLocaleDateString(i18n.language) : t("member_goal_tasks.no_date", { defaultValue: "No date" }),
                          defaultValue: `Due: ${task.deadline ? new Date(task.deadline).toLocaleDateString(i18n.language) : "No date"}`
                        })}
                      </span>
                    </span>
                  </div>

                  {/* Progress Bar & Percentage */}
                  <div className="mt-3.5 space-y-1.5">
                    <div className="flex justify-between items-center text-xs gap-2">
                      <span className="text-slate-500 font-medium">{t("member_goal_tasks.deliverable_progress", { defaultValue: "Deliverable Progress" })}</span>
                      <span className="font-bold font-mono text-slate-900 dark:text-white shrink-0">
                        {task.progress || 0}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          (task.progress || 0) >= 100
                            ? "bg-emerald-500"
                            : (task.progress || 0) >= 50
                            ? "bg-teal-500"
                            : "bg-amber-500"
                        }`}
                        style={{ width: `${task.progress || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Latest Comment / Explanation preview */}
                  {task.last_comment && (
                    <div className="mt-3 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-200 mb-0.5">
                        <MessageSquare className="h-3 w-3 text-emerald-600 shrink-0" />
                        <span>{t("member_goal_tasks.latest_update_note", { defaultValue: "Latest Update Note:" })}</span>
                      </div>
                      <p className="italic line-clamp-2 break-words">"{task.last_comment}"</p>
                    </div>
                  )}
                </div>

                {/* Bottom Action Area */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {/* Quick percentage buttons for assigned member or leadership */}
                    {(isMine || canManageGoals) ? (
                      <div className="flex flex-wrap items-center gap-1">
                        {[0, 25, 50, 75, 100].map((pct) => (
                          <button
                            key={pct}
                            onClick={() => handleQuickProgressUpdate(goal, task, pct)}
                            disabled={updateTaskMutation.isPending}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded transition cursor-pointer ${
                              (task.progress || 0) === pct
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    ) : (
                      <Badge color={isCompleted ? "green" : "gray"}>
                        {isCompleted
                          ? t("member_goal_tasks.status_completed_badge", { defaultValue: "COMPLETED" })
                          : t("member_goal_tasks.status_in_progress_badge", { defaultValue: "IN PROGRESS" })}
                      </Badge>
                    )}

                    {/* Update With Comment Button */}
                    {(isMine || canManageGoals) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openUpdateModal(goal, task)}
                        className="text-xs h-7 px-2.5 rounded-lg flex items-center gap-1 font-bold cursor-pointer shrink-0"
                      >
                        <MessageSquare className="h-3 w-3 text-emerald-600 shrink-0" />
                        <span>{t("member_goal_tasks.add_comment_btn", { defaultValue: "Add Comment" })}</span>
                      </Button>
                    )}
                  </div>

                  {/* Comment history toggle */}
                  {comments.length > 0 && (
                    <div className="pt-1">
                      <button
                        onClick={() =>
                          setExpandedCommentTaskId(isCommentsExpanded ? null : task.id)
                        }
                        className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <span>
                          {comments.length === 1
                            ? t("member_goal_tasks.progress_notes_singular", { count: comments.length, defaultValue: `${comments.length} progress note logged` })
                            : t("member_goal_tasks.progress_notes_plural", { count: comments.length, defaultValue: `${comments.length} progress notes logged` })}
                        </span>
                        {isCommentsExpanded ? <ChevronUp className="h-3 w-3 shrink-0" /> : <ChevronDown className="h-3 w-3 shrink-0" />}
                      </button>

                      {isCommentsExpanded && (
                        <div className="mt-2 space-y-2 border-t border-slate-100 dark:border-slate-800 pt-2 animate-in fade-in">
                          {comments.map((cmt) => (
                            <div
                              key={cmt.id}
                              className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-[11px] space-y-1"
                            >
                              <div className="flex justify-between items-center text-slate-500 font-mono text-[10px] gap-2">
                                <span className="font-bold text-slate-700 dark:text-slate-200 break-words min-w-0">
                                  {cmt.author_name}
                                </span>
                                <span className="shrink-0">
                                  {cmt.created_at ? new Date(cmt.created_at).toLocaleDateString(i18n.language, { month: "short", day: "numeric" }) : ""}
                                </span>
                              </div>
                              <p className="text-slate-700 dark:text-slate-300 break-words">{cmt.comment}</p>
                              {cmt.progress_at_time !== undefined && (
                                <span className="inline-block text-[9px] font-bold font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
                                  {t("member_goal_tasks.logged_at", { progress: cmt.progress_at_time, defaultValue: `Logged at ${cmt.progress_at_time}%` })}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Update Task Progress & Submit Explanation Comment */}
      {activeTaskModal && (
        <Modal
          isOpen={!!activeTaskModal}
          onClose={() => setActiveTaskModal(null)}
          title={t("member_goal_tasks.modal_title", { defaultValue: "Update Deliverable Progress & Log Details" })}
        >
          <form onSubmit={handleSaveModalUpdate} className="space-y-4 text-xs font-sans">
            <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60 space-y-1">
              <span className="text-[10px] font-bold uppercase font-mono text-emerald-700 dark:text-emerald-400 break-words block">
                {t("member_goal_tasks.parent_goal_label", { title: activeTaskModal.goal.title, defaultValue: `Parent Goal: ${activeTaskModal.goal.title}` })}
              </span>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white break-words">
                {activeTaskModal.task.title}
              </h4>
              <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-500 text-[11px] break-words">
                  {t("member_goal_tasks.assigned_to_label", { name: activeTaskModal.task.assigned_to_name, defaultValue: `Assigned to: ${activeTaskModal.task.assigned_to_name}` })}
                </span>
                <RealtimeTaskCountdown deadline={activeTaskModal.task.deadline} compact />
              </div>
            </div>

            <div>
              <div className="flex flex-wrap justify-between items-center gap-2 mb-1">
                <label className="font-bold text-slate-700 dark:text-slate-200">
                  {t("member_goal_tasks.new_progress_label", { progress: modalProgress, defaultValue: `New Progress Level (${modalProgress}%)` })}
                </label>
                <span className="text-[11px] text-slate-500 font-mono">
                  {modalProgress === 100
                    ? t("member_goal_tasks.status_completed_check", { defaultValue: "✓ Completed" })
                    : modalProgress > 0
                    ? t("member_goal_tasks.status_in_progress", { defaultValue: "In Progress" })
                    : t("member_goal_tasks.status_pending", { defaultValue: "Pending" })}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={modalProgress}
                onChange={(e) => setModalProgress(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                <span>{t("member_goal_tasks.range_start", { defaultValue: "0% (Not Started)" })}</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>{t("member_goal_tasks.range_end", { defaultValue: "100% (Done)" })}</span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                {t("member_goal_tasks.explanation_label", { defaultValue: "Explanation & Delivery Notes (Optional)" })}
              </label>
              <textarea
                rows={4}
                placeholder={t("member_goal_tasks.explanation_placeholder", { defaultValue: "Optional: Explain the actions taken, milestones completed, receipts obtained, or blockers faced..." })}
                value={modalComment}
                onChange={(e) => setModalComment(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-3 outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-400 mt-1 break-words">
                {t("member_goal_tasks.explanation_hint", { defaultValue: "Your notes and updated progress will automatically recalculate the parent goal's progress and be recorded in the audit trail." })}
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTaskModal(null)}
              >
                {t("common.cancel", { defaultValue: "Cancel" })}
              </Button>
              <Button
                type="submit"
                loading={updateTaskMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {t("member_goal_tasks.save_btn", { defaultValue: "Save Progress & Post Notes" })}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
