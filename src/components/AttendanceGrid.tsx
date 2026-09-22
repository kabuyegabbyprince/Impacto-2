import React from "react";
import { DynamicAttendanceGrid } from "./DynamicAttendanceGrid";
import { Event as ImpactEvent, OrgMember, EventAttendance } from "../types";

export interface AttendanceGridProps {
  events: ImpactEvent[];
  members: OrgMember[];
  allAttendance: EventAttendance[];
  isPaidPlan: boolean;
  activeOrg: any;
  canManageAttendance?: boolean;
  onCheckIn?: (eventId: string, memberId: string) => Promise<void>;
  onCheckOut?: (eventId: string, memberId: string) => Promise<void>;
  addToast: (msg: string, type?: "success" | "error" | "info") => void;
}

/**
 * AttendanceGrid Component
 * Pivots attendance data to display events in rows and users (organization members) in columns.
 * Provides comprehensive impact tracking, attendance rate tallies, interactive cell toggles for paid tiers,
 * and direct spreadsheet exports.
 */
export const AttendanceGrid: React.FC<AttendanceGridProps> = (props) => {
  return <DynamicAttendanceGrid {...props} />;
};

export default AttendanceGrid;
export { DynamicAttendanceGrid };
