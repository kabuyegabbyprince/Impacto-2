import { useEffect, useMemo } from "react";
import { useGoals, useEvents, useBroadcastNotification } from "./useImpactoData";
import { GoalTask, EventTask } from "../types";

export interface ScheduledTaskNotification {
  taskId: string;
  taskTitle: string;
  parentTitle: string;
  type: "goal" | "event";
  dueDate: string;
  interval: "week_before" | "three_days_before" | "final_day" | "overdue";
  message: string;
  assignedMemberIds: string[];
}

/**
 * Hook: 'useTaskNotifications'
 * Scans for pending tasks across Goals and Events, and automatically dispatches
 * and schedules local/system-level notifications for members at specified intervals:
 * - 1 week before
 * - 3 days before
 * - Final day / Due today / Overdue
 */
export function useTaskNotifications(orgId?: string, currentMemberId?: string) {
  const { data: goals = [] } = useGoals(orgId);
  const { data: events = [] } = useEvents(orgId);
  const broadcastNotificationMutation = useBroadcastNotification();

  const activeReminders = useMemo(() => {
    if (!orgId) return [];

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const todayStr = now.toISOString().split("T")[0];

    const reminders: ScheduledTaskNotification[] = [];

    // 1. Scan Goal Subtasks
    goals.forEach((goal) => {
      (goal.tasks || []).forEach((task: GoalTask) => {
        if (task.status === "completed" || (task.progress || 0) >= 100 || !task.deadline) return;

        const due = new Date(task.deadline);
        due.setHours(0, 0, 0, 0);
        const diffMs = due.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 3600 * 24));

        let interval: ScheduledTaskNotification["interval"] | null = null;
        let message = "";

        if (diffDays < 0) {
          interval = "overdue";
          message = `Daily Overdue Alert: Subtask "${task.title}" on Goal "${goal.title}" is ${Math.abs(diffDays)} day(s) overdue!`;
        } else if (diffDays === 0) {
          interval = "final_day";
          message = `Final Day Alert: Subtask "${task.title}" on Goal "${goal.title}" is due TODAY!`;
        } else if (diffDays === 3) {
          interval = "three_days_before";
          message = `Urgent Reminder: Subtask "${task.title}" on Goal "${goal.title}" is due in 3 days.`;
        } else if (diffDays === 7) {
          interval = "week_before";
          message = `1-Week Reminder: Subtask "${task.title}" on Goal "${goal.title}" is due in 7 days.`;
        }

        if (interval) {
          const assignedMemberIds = task.assigned_to_member_ids || (task.assigned_to_member_id ? [task.assigned_to_member_id] : []);
          reminders.push({
            taskId: task.id,
            taskTitle: task.title,
            parentTitle: goal.title,
            type: "goal",
            dueDate: task.deadline,
            interval,
            message,
            assignedMemberIds,
          });
        }
      });
    });

    // 2. Scan Event Deliverables
    events.forEach((event) => {
      (event.tasks || []).forEach((task: EventTask) => {
        if (task.status === "completed" || (task.progress || 0) >= 100 || !task.due_date) return;

        const due = new Date(task.due_date);
        due.setHours(0, 0, 0, 0);
        const diffMs = due.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 3600 * 24));

        let interval: ScheduledTaskNotification["interval"] | null = null;
        let message = "";

        if (diffDays < 0) {
          interval = "overdue";
          message = `Daily Overdue Alert: Deliverable "${task.title}" for Event "${event.title}" is ${Math.abs(diffDays)} day(s) overdue!`;
        } else if (diffDays === 0) {
          interval = "final_day";
          message = `Final Day Alert: Deliverable "${task.title}" for Event "${event.title}" is due TODAY!`;
        } else if (diffDays === 3) {
          interval = "three_days_before";
          message = `Urgent Reminder: Deliverable "${task.title}" for Event "${event.title}" is due in 3 days.`;
        } else if (diffDays === 7) {
          interval = "week_before";
          message = `1-Week Reminder: Deliverable "${task.title}" for Event "${event.title}" is due in 7 days.`;
        }

        if (interval) {
          const assignedMemberIds = task.assigned_to_member_ids || (task.assigned_to_member_id ? [task.assigned_to_member_id] : []);
          reminders.push({
            taskId: task.id,
            taskTitle: task.title,
            parentTitle: event.title,
            type: "event",
            dueDate: task.due_date,
            interval,
            message,
            assignedMemberIds,
          });
        }
      });
    });

    return reminders;
  }, [goals, events, orgId]);

  /**
   * Filter reminders relevant to current logged-in member
   */
  const myTaskReminders = useMemo(() => {
    if (!currentMemberId) return activeReminders;
    return activeReminders.filter((r) => r.assignedMemberIds.length === 0 || r.assignedMemberIds.includes(currentMemberId));
  }, [activeReminders, currentMemberId]);

  /**
   * Automatically dispatch notifications once per day per task interval
   */
  useEffect(() => {
    if (!orgId || activeReminders.length === 0) return;

    const todayStr = new Date().toISOString().split("T")[0];

    activeReminders.forEach((r) => {
      const lockKey = `task_notif_sent_${r.taskId}_${r.interval}_${todayStr}`;
      if (!localStorage.getItem(lockKey)) {
        localStorage.setItem(lockKey, "sent");

        // Broadcast to system notifications
        broadcastNotificationMutation.mutate({
          org_id: orgId,
          sent_by: currentMemberId || "00000000-0000-0000-0000-000000000000",
          recipient_group: "All Active Members",
          recipient_count: r.assignedMemberIds.length || 1,
          body_text: r.message,
        });

        // Trigger browser native system notification if permitted
        if ("Notification" in window && Notification.permission === "granted") {
          try {
            new Notification(`Task Deadline Notice`, {
              body: r.message,
              icon: "/favicon.ico",
            });
          } catch {}
        }
      }
    });
  }, [activeReminders, orgId, broadcastNotificationMutation]);

  return {
    activeReminders,
    myTaskReminders,
    pendingRemindersCount: myTaskReminders.length,
  };
}
