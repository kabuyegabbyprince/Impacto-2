import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGoals, useEvents, useUpdateGoalTask, useUpdateEvent } from "./useImpactoData";
import { Goal, Event, GoalTask, EventTask } from "../types";

export interface SyncTaskParams {
  type: "goal" | "event";
  parentId: string;
  taskId: string;
  newProgress: number;
  member?: { id: string; name: string; role?: string };
  comment?: string;
}

/**
 * Hook: 'useTaskGoalSync'
 * Listens for changes in task completion status and automatically triggers
 * an update to the linked goal or event's progress metric in the database/cache,
 * ensuring real-time visibility across all UI components.
 */
export function useTaskGoalSync(orgId?: string) {
  const queryClient = useQueryClient();
  const { data: goals = [] } = useGoals(orgId);
  const { data: events = [] } = useEvents(orgId);

  const updateGoalTaskMutation = useUpdateGoalTask();
  const updateEventMutation = useUpdateEvent();

  /**
   * Automatically calculates average progress for a task list
   */
  const calculateAverageProgress = (tasks: (GoalTask | EventTask)[]): number => {
    if (!tasks || tasks.length === 0) return 0;
    const total = tasks.reduce((sum, t) => sum + (t.progress || 0), 0);
    return Math.round(total / tasks.length);
  };

  /**
   * Sync a task update directly to DB and trigger live progress metrics update
   */
  const syncTaskCompletion = async ({
    type,
    parentId,
    taskId,
    newProgress,
    member,
    comment,
  }: SyncTaskParams) => {
    const clampedProgress = Math.min(100, Math.max(0, newProgress));
    const isCompleted = clampedProgress >= 100;
    const newStatus = isCompleted ? "completed" : clampedProgress > 0 ? "in_progress" : "todo";

    if (type === "goal") {
      const targetGoal = goals.find((g) => g.id === parentId);
      if (!targetGoal) return;

      const defaultMember = member || { id: "system", name: "Member" };
      await updateGoalTaskMutation.mutateAsync({
        goalId: parentId,
        taskId,
        progress: clampedProgress,
        status: newStatus as any,
        comment: comment || (isCompleted ? "Marked deliverable as completed" : undefined),
        member: defaultMember,
        orgId: orgId || targetGoal.org_id || "default-org",
      });

      queryClient.invalidateQueries({ queryKey: ["goals", orgId] });
    } else if (type === "event") {
      const targetEvent = events.find((e) => e.id === parentId);
      if (!targetEvent) return;

      const currentTasks: EventTask[] = targetEvent.tasks ? [...targetEvent.tasks] : [];
      const updatedTasks = currentTasks.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            progress: clampedProgress,
            status: isCompleted ? ("completed" as const) : clampedProgress > 0 ? ("in_progress" as const) : ("pending" as const),
          };
        }
        return t;
      });

      const avgProgress = calculateAverageProgress(updatedTasks);
      const eventStatus: "active" | "completed" | "cancelled" | "upcoming" =
        avgProgress >= 100 ? "completed" : avgProgress > 0 ? "active" : targetEvent.status || "upcoming";

      await updateEventMutation.mutateAsync({
        id: parentId,
        org_id: orgId || targetEvent.org_id || "default-org",
        tasks: updatedTasks,
        overall_progress: avgProgress,
        status: eventStatus,
      });

      queryClient.invalidateQueries({ queryKey: ["events", orgId] });
    }
  };

  /**
   * Listen for background sync checks across goals & events
   */
  useEffect(() => {
    if (!orgId) return;
    goals.forEach((goal) => {
      if (goal.tasks && goal.tasks.length > 0) {
        const computedAvg = calculateAverageProgress(goal.tasks);
        if (goal.achievement_percentage !== computedAvg) {
          queryClient.invalidateQueries({ queryKey: ["goals", orgId] });
        }
      }
    });
  }, [goals, events, orgId, queryClient]);

  return {
    calculateAverageProgress,
    syncTaskCompletion,
    isSyncing: updateGoalTaskMutation.isPending || updateEventMutation.isPending,
  };
}
