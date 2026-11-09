import { useMemo } from "react";
import { EventTask, GoalTask } from "../types";

/**
 * Custom React Hook: Calculates completion percentage of a task based on the ratio of completed sub-items in its checklist.
 */
export function useTaskChecklistCompletion(task: GoalTask | EventTask | null | undefined): number {
  return useMemo(() => {
    if (!task) return 0;
    const todos = task.todos || [];
    if (todos.length === 0) {
      return task.progress || 0;
    }
    const completedCount = todos.filter((t) => t.completed).length;
    return Math.round((completedCount / todos.length) * 100);
  }, [task]);
}

/**
 * Custom React Hook: Aggregates task completion progress to calculate the overall progress of parent events or goals.
 */
export function useParentAggregateProgress(tasks: (GoalTask | EventTask)[] | null | undefined): number {
  return useMemo(() => {
    if (!tasks || tasks.length === 0) return 0;
    const totalProgress = tasks.reduce((sum, task) => {
      const todos = task.todos || [];
      if (todos.length > 0) {
        const completed = todos.filter((t) => t.completed).length;
        return sum + Math.round((completed / todos.length) * 100);
      }
      return sum + (task.progress || 0);
    }, 0);
    return Math.round(totalProgress / tasks.length);
  }, [tasks]);
}
