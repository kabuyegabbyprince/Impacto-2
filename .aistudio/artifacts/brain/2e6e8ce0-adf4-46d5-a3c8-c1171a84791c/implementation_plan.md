# Task Assignment & Cascading Progress Implementation Plan

## Overview
Implement a robust task management system where tasks contain interactive subtask checklists (to-do items with checkboxes) and overall deadlines. Completing individual checkboxes automatically calculates task progress proportionally, which cascades upward to update the progress of parent goals and events.

---

## 1. Data Model & Architecture
- **Task Entity**:
  - `id`: Unique identifier
  - `title`: Task title
  - `deadline`: Overall task due date
  - `todos`: Array of subtasks (`{ id: string; text: string; completed: boolean }`)
  - `progress`: Computed percentage (`(completed_todos / total_todos) * 100`)
  - `status`: `'todo' | 'in_progress' | 'completed'`
  - `assigned_to_member_ids`: Array of member IDs
- **Cascading Aggregation**:
  - Parent Goal or Event progress = Average or weighted sum of all child task progress percentages.

---

## 2. User Experience & Workflow
1. **Task Creation Modal**:
   - Define task title, assignee(s), overall deadline, and add multiple checklist to-do items.
2. **My Tasks & Event/Goal Boards**:
   - Interactive checkboxes for each subtask. Checking/unchecking instantly re-calculates task progress and syncs to Supabase and local store.
3. **Cascading Indicators**:
   - Visual progress bars showing progress cascading from subtask checkboxes -> task progress -> goal/event achievement.

---

## 3. Implementation Steps
1. Update TypeScript interfaces in `src/types.ts` to support subtask checklist items (`todos?: Array<{ id: string; text: string; completed: boolean }>`) on `EventTask` and `GoalTask`.
2. Update task management UI components (`MyTasksWorkspaceModal`, `EventScheduleCalendar`, `goals.tsx`) to render interactive subtask checklists and update progress automatically.
3. Verify persistence and notification dispatch upon task assignment.
