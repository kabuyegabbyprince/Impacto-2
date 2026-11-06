import React, { useState, useMemo } from "react";
import {
  CheckCircle2,
  Clock,
  MessageSquare,
  Target,
  Calendar,
  AlertCircle,
  Users,
  Briefcase,
  Layers,
  Filter
} from "lucide-react";
import { Event as ImpactEvent, EventTask, Goal, GoalTask, OrgMember } from "../types";
import { RealtimeTaskCountdown } from "./RealtimeTaskCountdown";
import { Button, Badge, Modal } from "./ui";
import { useTaskProgressSync } from "../hooks/useTaskProgressSync";
import { useToast } from "./Toast";

interface MyTasksWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: ImpactEvent[];
  goals: Goal[];
  currentMember?: OrgMember | null;
  activeOrg?: any;
}

export const MyTasksWorkspaceModal: React.FC<MyTasksWorkspaceModalProps> = ({
  isOpen,
  onClose,
  events = [],
  goals = [],
  currentMember,
  activeOrg
}) => {
  const { addToast } = useToast();
  const { syncGoalTaskProgress, syncEventTaskProgress, getTaskDeadlineNotice, isLoading } = useTaskProgressSync(activeOrg?.id);

  const [activeTab, setActiveTab] = useState<"all" | "events" | "goals">("all");
  const [selectedTaskModal, setSelectedTaskModal] = useState<{
    type: "event" | "goal";
    parentTitle: string;
    parentId: string;
    task: EventTask | GoalTask;
  } | null>(null);

  const [updateProgress, setUpdateProgress] = useState<number>(0);
  const [updateNote, setUpdateNote] = useState<string>("");

  const memberId = currentMember?.id || "";
  const memberName = currentMember?.user?.full_name || currentMember?.role || "Member";

  // Helper to check if task is assigned to member
  const isAssigned = (assignedMemberId?: string, assignedMemberIds?: string[], assignedName?: string) => {
    if (!memberId) return true;
    if (assignedMemberId === memberId) return true;
    if (assignedMemberIds && assignedMemberIds.includes(memberId)) return true;
    if (assignedName && memberName && assignedName.toLowerCase().includes(memberName.toLowerCase())) return true;
    return false;
  };

  // Compile Event tasks assigned to member
  const myEventTasks = useMemo(() => {
    const list: { event: ImpactEvent; task: EventTask }[] = [];
    (events || []).forEach(ev => {
      (ev.tasks || []).forEach(t => {
        if (isAssigned(t.assigned_to_member_id, t.assigned_to_member_ids, t.assigned_to_name)) {
          list.push({ event: ev, task: t });
        }
      });
    });
    return list;
  }, [events, memberId, memberName]);

  // Compile Goal tasks assigned to member
  const myGoalTasks = useMemo(() => {
    const list: { goal: Goal; task: GoalTask }[] = [];
    (goals || []).forEach(g => {
      (g.tasks || []).forEach(t => {
        if (isAssigned(t.assigned_to_member_id, t.assigned_to_member_ids, t.assigned_to_name)) {
          list.push({ goal: g, task: t });
        }
      });
    });
    return list;
  }, [goals, memberId, memberName]);

  // Combined & Filtered task list
  const combinedTasks = useMemo(() => {
    const all: Array<{
      type: "event" | "goal";
      parentId: string;
      parentTitle: string;
      task: EventTask | GoalTask;
      deadline: string;
      progress: number;
      status: string;
      description?: string;
    }> = [];

    if (activeTab === "all" || activeTab === "events") {
      myEventTasks.forEach(({ event, task }) => {
        all.push({
          type: "event",
          parentId: event.id,
          parentTitle: event.title,
          task,
          deadline: task.due_date || event.date_time,
          progress: task.progress || 0,
          status: task.status || "pending",
          description: task.performance_report
        });
      });
    }

    if (activeTab === "all" || activeTab === "goals") {
      myGoalTasks.forEach(({ goal, task }) => {
        all.push({
          type: "goal",
          parentId: goal.id,
          parentTitle: goal.title,
          task,
          deadline: task.deadline,
          progress: task.progress || 0,
          status: task.status || "todo",
          description: task.description
        });
      });
    }

    return all.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  }, [myEventTasks, myGoalTasks, activeTab]);

  const openUpdateModal = (item: {
    type: "event" | "goal";
    parentTitle: string;
    parentId: string;
    task: EventTask | GoalTask;
  }) => {
    setSelectedTaskModal(item);
    setUpdateProgress(item.task.progress || 0);
    setUpdateNote("");
  };

  const handleQuickProgress = async (
    item: { type: "event" | "goal"; parentId: string; parentTitle: string; task: EventTask | GoalTask },
    pct: number
  ) => {
    try {
      if (item.type === "goal") {
        await syncGoalTaskProgress(
          item.parentId,
          item.task.id,
          pct,
          { id: memberId, name: memberName, role: currentMember?.role },
          `Quick update progress to ${pct}%`
        );
      } else {
        const targetEvent = events.find(e => e.id === item.parentId);
        if (targetEvent) {
          const updatedTasks = (targetEvent.tasks || []).map(t => {
            if (t.id === item.task.id) {
              return {
                ...t,
                progress: pct,
                status: (pct >= 100 ? "completed" : pct > 0 ? "in_progress" : "pending") as any,
                reported_at: new Date().toISOString()
              };
            }
            return t;
          });
          await syncEventTaskProgress(targetEvent.id, updatedTasks);
        }
      }
      addToast(`Updated task progress to ${pct}%`, "success");
    } catch (e: any) {
      addToast(e?.message || "Failed to update task progress", "error");
    }
  };

  const handleSaveTaskUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskModal) return;

    try {
      if (selectedTaskModal.type === "goal") {
        await syncGoalTaskProgress(
          selectedTaskModal.parentId,
          selectedTaskModal.task.id,
          updateProgress,
          { id: memberId, name: memberName, role: currentMember?.role },
          updateNote.trim() || undefined
        );
      } else {
        const targetEvent = events.find(e => e.id === selectedTaskModal.parentId);
        if (targetEvent) {
          const updatedTasks = (targetEvent.tasks || []).map(t => {
            if (t.id === selectedTaskModal.task.id) {
              return {
                ...t,
                progress: updateProgress,
                status: (updateProgress >= 100 ? "completed" : updateProgress > 0 ? "in_progress" : "pending") as any,
                performance_report: updateNote.trim() || t.performance_report,
                reported_at: new Date().toISOString()
              };
            }
            return t;
          });
          await syncEventTaskProgress(targetEvent.id, updatedTasks);
        }
      }
      addToast("Task progress and notes saved successfully", "success");
      setSelectedTaskModal(null);
    } catch (e: any) {
      addToast(e?.message || "Failed to save task update", "error");
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="My Assigned Tasks & Deliverables Workspace"
    >
      <div className="space-y-4 text-xs font-sans">
        {/* Navigation Tabs & Overview */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold text-slate-900 dark:text-white block text-xs">My Task Desk</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Track assigned deliverables across events and goals.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-2.5 py-1 text-xs font-bold rounded transition cursor-pointer ${
                activeTab === "all"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              All ({myEventTasks.length + myGoalTasks.length})
            </button>
            <button
              onClick={() => setActiveTab("events")}
              className={`px-2.5 py-1 text-xs font-bold rounded transition cursor-pointer ${
                activeTab === "events"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Events ({myEventTasks.length})
            </button>
            <button
              onClick={() => setActiveTab("goals")}
              className={`px-2.5 py-1 text-xs font-bold rounded transition cursor-pointer ${
                activeTab === "goals"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Goals ({myGoalTasks.length})
            </button>
          </div>
        </div>

        {/* Task Cards List */}
        {combinedTasks.length === 0 ? (
          <div className="p-10 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">No Pending Assigned Tasks</h4>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              You currently have no tasks assigned in this filter. Any event deliverables or goal tasks assigned to you will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {combinedTasks.map((item, idx) => {
              const isCompleted = item.progress >= 100 || item.status === "completed";
              const deadlineNotice = getTaskDeadlineNotice(item.deadline, isCompleted);

              return (
                <div
                  key={`${item.type}-${item.task.id}-${idx}`}
                  className={`p-4 rounded-xl border transition space-y-3 ${
                    isCompleted
                      ? "bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded-md border ${
                        item.type === "event"
                          ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900"
                      }`}>
                        {item.type === "event" ? "Event Deliverable" : "Goal Task"}
                      </span>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 truncate max-w-[200px]">
                        {item.parentTitle}
                      </span>
                    </div>

                    <RealtimeTaskCountdown deadline={item.deadline} isCompleted={isCompleted} compact />
                  </div>

                  <div>
                    <h4 className={`text-sm font-bold text-slate-900 dark:text-white ${isCompleted ? "line-through text-slate-400" : ""}`}>
                      {item.task.title}
                    </h4>
                    {item.description && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 line-clamp-2 italic bg-slate-50 dark:bg-slate-800/50 p-2 rounded border border-slate-100 dark:border-slate-800">
                        "{item.description}"
                      </p>
                    )}
                  </div>

                  {deadlineNotice && (
                    <div className={`p-2 rounded-lg text-[11px] font-semibold border ${deadlineNotice.colorClass}`}>
                      {deadlineNotice.label}
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500 font-medium">Completion Progress</span>
                      <span className="font-bold font-mono text-slate-900 dark:text-white">{item.progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          item.progress >= 100
                            ? "bg-emerald-500"
                            : item.progress >= 50
                            ? "bg-teal-500"
                            : "bg-amber-500"
                        }`}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions & Quick Progress Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1">
                      {[0, 25, 50, 75, 100].map(pct => (
                        <button
                          key={pct}
                          disabled={isLoading}
                          onClick={() => handleQuickProgress(item, pct)}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded transition cursor-pointer ${
                            item.progress === pct
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openUpdateModal(item)}
                      className="text-xs h-7 px-2.5 rounded-lg flex items-center gap-1 font-bold cursor-pointer"
                    >
                      <MessageSquare className="h-3 w-3 text-emerald-600" />
                      <span>Update & Add Notes</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Nested Modal for Detailed Update & Optional Notes */}
        {selectedTaskModal && (
          <Modal
            isOpen={!!selectedTaskModal}
            onClose={() => setSelectedTaskModal(null)}
            title="Update Task Progress & Optional Notes"
          >
            <form onSubmit={handleSaveTaskUpdate} className="space-y-4 text-xs font-sans">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/60 space-y-1">
                <span className="text-[10px] font-bold uppercase font-mono text-emerald-700 dark:text-emerald-400">
                  {selectedTaskModal.type === "event" ? "Event Deliverable" : "Goal Subtask"}: {selectedTaskModal.parentTitle}
                </span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {selectedTaskModal.task.title}
                </h4>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-slate-700 dark:text-slate-200">
                    Set Progress Level ({updateProgress}%)
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {updateProgress === 100 ? "✓ Completed" : updateProgress > 0 ? "In Progress" : "Pending"}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={updateProgress}
                  onChange={(e) => setUpdateProgress(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Work Notes / Progress Remarks (Optional)
                </label>
                <textarea
                  rows={4}
                  placeholder="Optional: Enter work notes, achievements, deliverables completed, or blockers faced..."
                  value={updateNote}
                  onChange={(e) => setUpdateNote(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-3 outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Notes are optional and will be logged into your activity report and shared with leadership.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedTaskModal(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={isLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Save Progress & Notes
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </Modal>
  );
};
