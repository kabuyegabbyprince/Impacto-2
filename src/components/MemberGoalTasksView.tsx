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
  ArrowRight
} from "lucide-react";
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
        label: `🚨 Daily Overdue Alert: Task is ${overdueDays === 0 ? "due today" : `${overdueDays} day(s) past deadline`}! Incomplete task reduces overall goal average.`,
        color: "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/60 dark:border-rose-900 dark:text-rose-300",
      };
    } else if (diffDays === 1) {
      return {
        type: "urgent",
        label: "⚠️ Urgent: Task is due tomorrow! Complete your portion now.",
        color: "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/60 dark:border-amber-900 dark:text-amber-300",
      };
    } else if (diffDays <= 7) {
      return {
        type: "reminder",
        label: `📅 Reminder: Task is due in ${diffDays} day(s) (1-week deadline window).`,
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
      comment: `Updated progress to ${newProgress}%`,
      member: {
        id: currentMember?.id || "member",
        name: currentMember?.user?.full_name || currentMember?.role || "Member",
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
        name: currentMember?.user?.full_name || currentMember?.role || "Member",
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
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Target className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Assigned Goal Tasks & Deliverables</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Members add their task progress here. The system averages all members' task completion levels to derive the overall goal score in real time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1">
            <button
              onClick={() => setFilterMode("my_tasks")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                filterMode === "my_tasks"
                  ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              My Tasks ({myTasksCount})
            </button>
            <button
              onClick={() => setFilterMode("all_tasks")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                filterMode === "all_tasks"
                  ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              All Assigned Tasks ({allGoalTasks.length})
            </button>
          </div>
        </div>
      </div>

      {/* Task Deadline Reminders Notification Banner */}
      {myActiveReminders.length > 0 && (
        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 space-y-2">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>Task Deadline Notifications ({myActiveReminders.length} Active Reminders)</span>
          </div>
          <div className="space-y-1.5 pt-1">
            {myActiveReminders.map(({ goal, task, reminder }) => (
              <div
                key={task.id}
                className={`p-2.5 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-medium ${reminder?.color}`}
              >
                <div>
                  <span className="font-bold uppercase font-mono text-[10px] block opacity-80">
                    Goal: {goal.title}
                  </span>
                  <span className="font-bold">{task.title}</span>
                  <p className="text-[11px] mt-0.5">{reminder?.label}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => openUpdateModal(goal, task)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-7 text-[11px] shrink-0 self-start sm:self-auto"
                >
                  Update Progress
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {displayedTasks.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center gap-2">
          <Target className="h-8 w-8 text-slate-300 dark:text-slate-600" />
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {filterMode === "my_tasks" ? "No Tasks Assigned to You" : "No Subtasks Created Yet"}
          </h4>
          <p className="text-[11px] text-slate-500 max-w-sm">
            {filterMode === "my_tasks"
              ? "When leadership assigns specific deliverables to you under strategic goals, they will appear here with live countdowns."
              : "When creating strategic goals, use the 'Advanced: Assign Subtasks' section to delegate responsibilities to members."}
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
                className={`bg-white dark:bg-slate-900 border rounded-xl p-5 shadow-xs transition flex flex-col justify-between gap-4 ${
                  isCompleted
                    ? "border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/10"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div>
                  {/* Top Bar: Parent Goal Reference & Live Countdown */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-[10px] font-bold tracking-wider uppercase font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-md truncate max-w-[190px]">
                      Goal: {goal.title}
                    </span>
                    <RealtimeTaskCountdown
                      deadline={task.deadline}
                      isCompleted={isCompleted}
                    />
                  </div>

                  {/* Task Title */}
                  <h4 className={`text-sm font-bold text-slate-900 dark:text-white leading-snug ${
                    isCompleted ? "line-through text-slate-400 dark:text-slate-500" : ""
                  }`}>
                    {task.title}
                  </h4>

                  {/* Large Task Description */}
                  {task.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 mt-2 leading-relaxed whitespace-pre-wrap">
                      {task.description}
                    </p>
                  )}

                  {/* Deadline Reminder Alert Badge */}
                  {reminder && (
                    <div className={`mt-2.5 p-2 rounded-lg border text-[11px] font-semibold ${reminder.color}`}>
                      {reminder.label}
                    </div>
                  )}

                  {/* Assignees & Deadline Info */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-2.5">
                    <span className="flex items-center gap-1 font-medium">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span>👥 {task.assigned_to_name || "Unassigned"}</span>
                      {isMine && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded">
                          (Assigned to You)
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>Due: {task.deadline ? new Date(task.deadline).toLocaleDateString() : "No date"}</span>
                    </span>
                  </div>

                  {/* Progress Bar & Percentage */}
                  <div className="mt-3.5 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Deliverable Progress</span>
                      <span className="font-bold font-mono text-slate-900 dark:text-white">
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
                        <MessageSquare className="h-3 w-3 text-emerald-600" />
                        <span>Latest Update Note:</span>
                      </div>
                      <p className="italic line-clamp-2">"{task.last_comment}"</p>
                    </div>
                  )}
                </div>

                {/* Bottom Action Area */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    {/* Quick percentage buttons for assigned member or leadership */}
                    {(isMine || canManageGoals) ? (
                      <div className="flex items-center gap-1">
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
                        {isCompleted ? "COMPLETED" : "IN PROGRESS"}
                      </Badge>
                    )}

                    {/* Update With Comment Button */}
                    {(isMine || canManageGoals) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openUpdateModal(goal, task)}
                        className="text-xs h-7 px-2.5 rounded-lg flex items-center gap-1 font-bold cursor-pointer"
                      >
                        <MessageSquare className="h-3 w-3 text-emerald-600" />
                        <span>Add Comment</span>
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
                        <span>{comments.length} progress note{comments.length === 1 ? "" : "s"} logged</span>
                        {isCommentsExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>

                      {isCommentsExpanded && (
                        <div className="mt-2 space-y-2 border-t border-slate-100 dark:border-slate-800 pt-2 animate-in fade-in">
                          {comments.map((cmt) => (
                            <div
                              key={cmt.id}
                              className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-[11px] space-y-1"
                            >
                              <div className="flex justify-between items-center text-slate-500 font-mono text-[10px]">
                                <span className="font-bold text-slate-700 dark:text-slate-200">
                                  {cmt.author_name}
                                </span>
                                <span>
                                  {cmt.created_at ? new Date(cmt.created_at).toLocaleDateString([], { month: "short", day: "numeric" }) : ""}
                                </span>
                              </div>
                              <p className="text-slate-700 dark:text-slate-300">{cmt.comment}</p>
                              {cmt.progress_at_time !== undefined && (
                                <span className="inline-block text-[9px] font-bold font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.2 rounded">
                                  Logged at {cmt.progress_at_time}%
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
          title="Update Deliverable Progress & Log Details"
        >
          <form onSubmit={handleSaveModalUpdate} className="space-y-4 text-xs font-sans">
            <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60 space-y-1">
              <span className="text-[10px] font-bold uppercase font-mono text-emerald-700 dark:text-emerald-400">
                Parent Goal: {activeTaskModal.goal.title}
              </span>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {activeTaskModal.task.title}
              </h4>
              <div className="pt-1 flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">Assigned to: {activeTaskModal.task.assigned_to_name}</span>
                <RealtimeTaskCountdown deadline={activeTaskModal.task.deadline} compact />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold text-slate-700 dark:text-slate-200">
                  New Progress Level ({modalProgress}%)
                </label>
                <span className="text-[11px] text-slate-500 font-mono">
                  {modalProgress === 100 ? "✓ Completed" : modalProgress > 0 ? "In Progress" : "Pending"}
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
                <span>0% (Not Started)</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100% (Done)</span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                Explanation & Delivery Notes (How did you do this?)
              </label>
              <textarea
                required
                rows={4}
                placeholder="Explain the actions taken, milestones completed, receipts obtained, or blockers faced..."
                value={modalComment}
                onChange={(e) => setModalComment(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-3 outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Your notes and updated progress will automatically recalculate the parent goal's progress and be recorded in the audit trail.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTaskModal(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={updateTaskMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Save Progress & Post Notes
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
