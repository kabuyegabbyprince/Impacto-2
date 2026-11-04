import { useQueryClient } from "@tanstack/react-query";
import { useUpdateGoalTask, useUpdateEvent, useEvents, useGoals } from "./useImpactoData";
import { GoalTask, EventTask } from "../types";

export interface TaskDeadlineNotice {
  type: "week_before" | "three_days_before" | "due_today" | "overdue";
  label: string;
  colorClass: string;
}

/**
 * Calculates deadline reminder notices:
 * - 7 days before (1 week before)
 * - 3 days before
 * - 1 day / due today
 * - Overdue daily alert
 */
export function getTaskDeadlineNotice(deadlineStr?: string, isCompleted?: boolean): TaskDeadlineNotice | null {
  if (isCompleted || !deadlineStr) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(deadlineStr);
  due.setHours(0, 0, 0, 0);

  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 3600 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      type: "overdue",
      label: `Daily Overdue Alert: Task is ${overdueDays === 0 ? "due today" : `${overdueDays} day(s) overdue`}! Incomplete task reduces overall progress.`,
      colorClass: "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/60 dark:border-rose-900 dark:text-rose-300",
    };
  } else if (diffDays === 0) {
    return {
      type: "due_today",
      label: "Urgent Alert: Task is due TODAY! Please finalize your deliverables.",
      colorClass: "bg-rose-50 border-rose-300 text-rose-800 dark:bg-rose-950/80 dark:border-rose-800 dark:text-rose-200 animate-pulse",
    };
  } else if (diffDays <= 3) {
    return {
      type: "three_days_before",
      label: `Urgent Reminder: Task is due in ${diffDays} day(s) (3-day deadline alert).`,
      colorClass: "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/60 dark:border-amber-900 dark:text-amber-300",
    };
  } else if (diffDays <= 7) {
    return {
      type: "week_before",
      label: `1-Week Reminder: Task is due in ${diffDays} days.`,
      colorClass: "bg-teal-50 border-teal-200 text-teal-800 dark:bg-teal-950/60 dark:border-teal-900 dark:text-teal-300",
    };
  }

  return null;
}

/**
 * Custom Hook: Synchronizes task completion status with Goal/Event progress metrics.
 * Ensures that when a member completes or updates a task, parent Goal/Event progress bar updates automatically.
 */
export function useTaskProgressSync(orgId?: string) {
  const queryClient = useQueryClient();
  const updateGoalTaskMutation = useUpdateGoalTask();
  const updateEventMutation = useUpdateEvent();
  const { data: events = [] } = useEvents(orgId);
  const { data: goals = [] } = useGoals(orgId);

  /**
   * Helper: Calculate overall progress percentage from an array of tasks
   */
  const computeTasksAverage = (tasks: (GoalTask | EventTask)[]): number => {
    if (!tasks || tasks.length === 0) return 0;
    const sum = tasks.reduce((acc, t) => acc + (t.progress || 0), 0);
    return Math.round(sum / tasks.length);
  };

  /**
   * Sync Goal Task Update
   */
  const syncGoalTaskProgress = async (
    goalId: string,
    taskId: string,
    progress: number,
    member: { id: string; name: string; role?: string },
    comment?: string
  ) => {
    const status = progress >= 100 ? "completed" : progress > 0 ? "in_progress" : "todo";
    const result = await updateGoalTaskMutation.mutateAsync({
      goalId,
      taskId,
      progress,
      status,
      comment,
      member,
      orgId: orgId || "default-org",
    });

    // Invalidate queries to update progress bars across UI
    queryClient.invalidateQueries({ queryKey: ["goals", orgId] });
    return result;
  };

  /**
   * Sync Event Task Update
   */
  const syncEventTaskProgress = async (
    eventId: string,
    updatedTasks: EventTask[]
  ) => {
    const avgProgress = computeTasksAverage(updatedTasks);
    const targetEvent = events.find((e) => e.id === eventId);
    if (!targetEvent) return;

    const eventStatus: "active" | "completed" | "cancelled" | "upcoming" =
      avgProgress >= 100 ? "completed" : avgProgress > 0 ? "active" : targetEvent.status || "upcoming";

    await updateEventMutation.mutateAsync({
      id: eventId,
      org_id: orgId || targetEvent.org_id || "default-org",
      tasks: updatedTasks,
      overall_progress: avgProgress,
      status: eventStatus,
    });

    // Invalidate queries to trigger instant live progress bar update across all views
    queryClient.invalidateQueries({ queryKey: ["events", orgId] });
  };

  return {
    computeTasksAverage,
    syncGoalTaskProgress,
    syncEventTaskProgress,
    getTaskDeadlineNotice,
    isLoading: updateGoalTaskMutation.isPending || updateEventMutation.isPending,
  };
}
