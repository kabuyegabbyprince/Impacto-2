import React, { useState, useMemo } from "react";
import { 
  Event as ImpactEvent, 
  OrgMember, 
  EventAttendance 
} from "../types";
import { Button, Input, Badge } from "./ui";
import { 
  FileSpreadsheet, 
  Search, 
  Check, 
  X, 
  Calendar, 
  Users, 
  Lock, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Download,
  Info
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DynamicAttendanceGridProps {
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

export const DynamicAttendanceGrid: React.FC<DynamicAttendanceGridProps> = ({
  events,
  members,
  allAttendance,
  isPaidPlan,
  activeOrg,
  canManageAttendance = true,
  onCheckIn,
  onCheckOut,
  addToast,
}) => {
  const navigate = useNavigate();
  const [eventSearch, setEventSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [updatingCell, setUpdatingCell] = useState<string | null>(null);

  // Filter active members
  const activeMembers = useMemo(() => {
    return (members || [])
      .filter((m) => m.status === "active")
      .filter((m) => {
        if (!memberSearch.trim()) return true;
        const q = memberSearch.toLowerCase();
        const name = m.user?.full_name?.toLowerCase() || "";
        const num = m.member_number?.toLowerCase() || "";
        const email = m.user?.email?.toLowerCase() || "";
        return name.includes(q) || num.includes(q) || email.includes(q);
      });
  }, [members, memberSearch]);

  // Filter events
  const filteredEvents = useMemo(() => {
    return (events || []).filter((ev) => {
      if (!eventSearch.trim()) return true;
      const q = eventSearch.toLowerCase();
      return (
        ev.title.toLowerCase().includes(q) ||
        ev.location.toLowerCase().includes(q) ||
        ev.description?.toLowerCase().includes(q)
      );
    });
  }, [events, eventSearch]);

  // Lookup map for fast O(1) attendance checks: `${eventId}_${memberId}` => boolean
  const attendanceSet = useMemo(() => {
    const set = new Set<string>();
    (allAttendance || []).forEach((a) => {
      set.add(`${a.event_id}_${a.member_id}`);
    });
    return set;
  }, [allAttendance]);

  // Toggle cell attendance for Paid plans
  const handleToggleCell = async (eventId: string, memberId: string, memberName: string, eventTitle: string) => {
    if (!isPaidPlan) {
      addToast("Live matrix check-in requires a Paid Plan or Event Package. Use Direct Local Excel Export below.", "error");
      return;
    }

    if (!canManageAttendance) {
      addToast("Only administrators, managers, and accountants can mark attendance.", "error");
      return;
    }

    const cellKey = `${eventId}_${memberId}`;
    const isCurrentlyPresent = attendanceSet.has(cellKey);
    setUpdatingCell(cellKey);

    try {
      if (isCurrentlyPresent) {
        if (onCheckOut) {
          await onCheckOut(eventId, memberId);
          addToast(`Marked ${memberName} as Absent for "${eventTitle}"`, "info");
        }
      } else {
        if (onCheckIn) {
          await onCheckIn(eventId, memberId);
          addToast(`Marked ${memberName} as Present for "${eventTitle}"`, "success");
        }
      }
    } catch (err: any) {
      console.error("Failed to toggle attendance:", err);
      addToast(err?.message || "Failed to update attendance record.", "error");
    } finally {
      setUpdatingCell(null);
    }
  };

  // Direct Local Excel Export function (Formatted with Users in Columns, Events in Rows)
  const handleExportLocalAttendanceExcel = () => {
    if (activeMembers.length === 0) {
      addToast("No active members available to export.", "error");
      return;
    }

    const eventList = filteredEvents.length > 0 ? filteredEvents : events;
    if (eventList.length === 0) {
      addToast("No scheduled events available to export.", "error");
      return;
    }

    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Attendance Matrix</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
        table { border-collapse: collapse; width: 100%; margin-top: 12px; }
        th { background-color: #047857; color: #FFFFFF; border: 1px solid #065F46; padding: 10px 8px; font-weight: bold; font-size: 11px; text-align: center; }
        th.text-left { text-align: left; }
        td { border: 1px solid #E5E7EB; padding: 8px 6px; font-size: 11px; vertical-align: middle; }
        tr:nth-child(even) { background-color: #F9FAFB; }
        .present { background-color: #D1FAE5; color: #065F46; font-weight: bold; text-align: center; }
        .absent { background-color: #FEE2E2; color: #991B1B; text-align: center; font-weight: normal; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .summary-header { background-color: #065F46; color: #FFFFFF; font-weight: bold; text-align: center; }
        .summary-row { background-color: #ECFDF5; font-weight: bold; border-top: 2px solid #047857; }
      </style>
    </head>
    <body>
      <h2 style="color: #047857; margin-bottom: 4px;">${activeOrg?.name || "Organization"} - Master Attendance Matrix</h2>
      <p style="font-size: 11px; color: #4B5563; margin-top: 0;">
        <strong>Generated:</strong> ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} | 
        <strong>Events (Rows):</strong> ${eventList.length} | 
        <strong>Members (Columns):</strong> ${activeMembers.length} | 
        <strong>Export Type:</strong> Direct Local Excel Export
      </p>
      <table>
        <thead>
          <tr>
            <th style="width: 35px;">No.</th>
            <th class="text-left" style="min-width: 180px;">Event Title (Row)</th>
            <th style="min-width: 90px;">Date</th>
            <th style="min-width: 110px;">Venue</th>
            <th style="min-width: 80px;">Status</th>`;

    // Members in Columns
    activeMembers.forEach((m) => {
      const name = (m.user?.full_name || "Member").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const num = m.member_number ? `#${m.member_number}` : "";
      html += `<th style="min-width: 100px;">${name}<br><span style="font-size: 9px; font-weight: normal; opacity: 0.85;">${num}</span></th>`;
    });

    html += `<th class="summary-header" style="min-width: 70px;">Present</th>
            <th class="summary-header" style="min-width: 70px;">Absent</th>
            <th class="summary-header" style="min-width: 80px;">Rate %</th>
          </tr>
        </thead>
        <tbody>`;

    // Member attendance counter across all events
    const memberPresentCounts: Record<string, number> = {};
    activeMembers.forEach((m) => {
      memberPresentCounts[m.id] = 0;
    });

    // Events in Rows
    eventList.forEach((ev, idx) => {
      let eventPresentCount = 0;
      let eventCols = "";

      activeMembers.forEach((m) => {
        const isPresent = attendanceSet.has(`${ev.id}_${m.id}`);
        if (isPresent) {
          eventPresentCount++;
          memberPresentCounts[m.id] = (memberPresentCounts[m.id] || 0) + 1;
          eventCols += `<td class="present">PRESENT</td>`;
        } else {
          eventCols += `<td class="absent">ABSENT</td>`;
        }
      });

      const eventAbsentCount = activeMembers.length - eventPresentCount;
      const eventRate = activeMembers.length > 0 ? Math.round((eventPresentCount / activeMembers.length) * 100) : 0;
      const dateFormatted = ev.date_time ? new Date(ev.date_time).toLocaleDateString() : "-";
      const cleanTitle = (ev.title || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const cleanLocation = (ev.location || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");

      html += `<tr>
        <td class="center bold">${idx + 1}</td>
        <td class="bold">${cleanTitle}</td>
        <td class="center">${dateFormatted}</td>
        <td class="center">${cleanLocation}</td>
        <td class="center font-mono">${(ev.status || "upcoming").toUpperCase()}</td>
        ${eventCols}
        <td class="center bold" style="color: #047857;">${eventPresentCount}</td>
        <td class="center bold" style="color: #B91C1C;">${eventAbsentCount}</td>
        <td class="center bold" style="color: #047857;">${eventRate}%</td>
      </tr>`;
    });

    // Summary Row: Overall totals per Member
    html += `<tr class="summary-row">
      <td colspan="5" style="text-align: right; padding-right: 12px; font-weight: bold; color: #047857;">
        TOTAL ATTENDED PER MEMBER:
      </td>`;

    activeMembers.forEach((m) => {
      const count = memberPresentCounts[m.id] || 0;
      const pct = eventList.length > 0 ? Math.round((count / eventList.length) * 100) : 0;
      html += `<td class="center bold" style="color: #047857;">${count}/${eventList.length}<br><span style="font-size: 9px; color: #4B5563;">(${pct}%)</span></td>`;
    });

    const totalPossibleSlots = eventList.length * activeMembers.length;
    const totalPresentSum = Object.values(memberPresentCounts).reduce((a, b) => a + b, 0);
    const overallOrgRate = totalPossibleSlots > 0 ? Math.round((totalPresentSum / totalPossibleSlots) * 100) : 0;

    html += `<td class="center bold" style="color: #047857;">${totalPresentSum}</td>
      <td class="center bold" style="color: #B91C1C;">${totalPossibleSlots - totalPresentSum}</td>
      <td class="center bold" style="color: #047857; font-size: 12px;">${overallOrgRate}%</td>
    </tr>`;

    html += `</tbody>
      </table>
    </body>
    </html>`;

    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(activeOrg?.name || "Organization").replace(/[^a-zA-Z0-9]/g, "_")}_Attendance_Matrix_${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addToast("Direct local attendance Excel spreadsheet generated and downloaded successfully!", "success");
  };

  // Overall metrics calculation
  const totalSlots = filteredEvents.length * activeMembers.length;
  let totalPresentCount = 0;
  filteredEvents.forEach((ev) => {
    activeMembers.forEach((m) => {
      if (attendanceSet.has(`${ev.id}_${m.id}`)) {
        totalPresentCount++;
      }
    });
  });
  const overallRate = totalSlots > 0 ? Math.round((totalPresentCount / totalSlots) * 100) : 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 md:p-6 shadow-xs space-y-5">
      {/* Top Header & Direct Local Excel Export Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Attendance Matrix
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Two-dimensional matrix with scheduled events in columns (X-Axis) and active members in rows (Y-Axis).
          </p>
        </div>

        {/* Direct Local Excel Export Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            size="sm"
            onClick={handleExportLocalAttendanceExcel}
            icon={<FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
            variant="outline"
            className="text-xs font-medium"
          >
            Export Attendance Spreadsheet
          </Button>

          {!isPaidPlan && (
            <Button
              size="sm"
              onClick={() => navigate("/dashboard/settings")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium"
            >
              Upgrade for Live Matrix Check-in
            </Button>
          )}
        </div>
      </div>


      {/* Filter and Metric Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Member Search */}
        <div className="relative">
          <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Filter members (rows Y-Axis)..."
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-8 pr-3 py-1.5 outline-none focus:ring-1 focus:ring-emerald-600 text-slate-900 dark:text-white"
          />
        </div>

        {/* Event Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search events (columns X-Axis)..."
            value={eventSearch}
            onChange={(e) => setEventSearch(e.target.value)}
            className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-8 pr-3 py-1.5 outline-none focus:ring-1 focus:ring-emerald-600 text-slate-900 dark:text-white"
          />
        </div>

        {/* Total Events & Users Stats */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs">
          <span className="text-slate-500">Dimensions:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
            {activeMembers.length} Members × {filteredEvents.length} Events
          </span>
        </div>

        {/* Overall Attendance Rate */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs">
          <span className="text-slate-500">Overall Presence:</span>
          <span className="font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
            {overallRate}% ({totalPresentCount}/{totalSlots})
          </span>
        </div>
      </div>

      {/* The Dynamic Matrix Table (Events on X-Axis Header, Members on Y-Axis Rows) */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs bg-white dark:bg-slate-900">
        <div className="overflow-x-auto max-h-[580px] scrollbar-thin">
          <table className="w-full border-collapse text-left text-xs">
            {/* Table Header: Columns = Events (X-Axis) */}
            <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 select-none">
              <tr>
                {/* Sticky Left: Member Name & Details (Y-Axis) */}
                <th className="sticky left-0 z-30 bg-slate-50 dark:bg-slate-800 p-3 min-w-[200px] font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-slate-500" />
                    <span>Member Directory (Y-Axis)</span>
                  </div>
                </th>

                {/* Columns for each Scheduled Event (X-Axis) */}
                {filteredEvents.map((ev, idx) => {
                  const isPassed = new Date(ev.date_time) < new Date();
                  return (
                    <th
                      key={ev.id}
                      className="p-2.5 min-w-[130px] max-w-[160px] text-center font-medium text-slate-700 dark:text-slate-300 border-r border-slate-200/60 dark:border-slate-700/60"
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] font-mono text-slate-400">
                          #{idx + 1}
                        </span>
                        <span className="font-semibold text-xs truncate w-full text-slate-900 dark:text-white" title={ev.title}>
                          {ev.title}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(ev.date_time).toLocaleDateString()}
                        </span>
                        <span
                          className={`text-[9px] font-medium px-1.5 py-0.2 rounded capitalize mt-0.5 ${
                            isPassed
                              ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                              : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                          }`}
                        >
                          {isPassed ? "Completed" : ev.status}
                        </span>
                      </div>
                    </th>
                  );
                })}

                {/* Right: Member Attendance Summary Columns */}
                <th className="p-2.5 min-w-[65px] text-center font-semibold text-slate-700 dark:text-slate-300 border-l border-slate-200 dark:border-slate-700">
                  Attended
                </th>
                <th className="p-2.5 min-w-[65px] text-center font-semibold text-slate-700 dark:text-slate-300">
                  Missed
                </th>
                <th className="p-2.5 min-w-[70px] text-center font-semibold text-slate-700 dark:text-slate-300">
                  Rate %
                </th>
              </tr>
            </thead>

            {/* Table Body: Rows = Members (Y-Axis) */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {activeMembers.length > 0 ? (
                activeMembers.map((m, idx) => {
                  let memberAttendedCount = 0;

                  // Precalculate member attendance across all columns
                  filteredEvents.forEach((ev) => {
                    if (attendanceSet.has(`${ev.id}_${m.id}`)) {
                      memberAttendedCount++;
                    }
                  });

                  const memberMissedCount = filteredEvents.length - memberAttendedCount;
                  const memberRate = filteredEvents.length > 0 ? Math.round((memberAttendedCount / filteredEvents.length) * 100) : 0;
                  const initial = (m.user?.full_name || "M").charAt(0).toUpperCase();

                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Sticky Left Member Info Row Header */}
                      <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/80 p-3 border-r border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800">
                            {initial}
                          </div>
                          <div className="space-y-0.5">
                            <span className="font-semibold text-slate-900 dark:text-white text-xs block truncate max-w-[140px]" title={m.user?.full_name}>
                              {m.user?.full_name || "Member"}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              #{m.member_number || `MEM-${idx + 1}`}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Interactive Attendance Cells per Event Column */}
                      {filteredEvents.map((ev) => {
                        const cellKey = `${ev.id}_${m.id}`;
                        const isPresent = attendanceSet.has(cellKey);
                        const isUpdating = updatingCell === cellKey;

                        return (
                          <td
                            key={ev.id}
                            className="p-2 text-center border-r border-slate-100 dark:border-slate-800/60"
                          >
                            <button
                              type="button"
                              disabled={!isPaidPlan || isUpdating}
                              onClick={() => handleToggleCell(ev.id, m.id, m.user?.full_name || "Member", ev.title)}
                              className={`w-full py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                                !isPaidPlan
                                  ? isPresent
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 cursor-not-allowed"
                                    : "bg-slate-100 text-slate-400 dark:bg-slate-800/60 dark:text-slate-500 cursor-not-allowed"
                                  : isPresent
                                  ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950/80 dark:hover:bg-emerald-900 dark:text-emerald-300 cursor-pointer"
                                  : "bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 cursor-pointer"
                              }`}
                              title={
                                !isPaidPlan
                                  ? `${m.user?.full_name} is ${isPresent ? "Present" : "Absent"} for "${ev.title}".`
                                  : `Click to mark ${m.user?.full_name} as ${isPresent ? "Absent" : "Present"} for "${ev.title}"`
                              }
                            >
                              {isUpdating ? (
                                <span className="text-[10px] animate-pulse">Saving...</span>
                              ) : isPresent ? (
                                <>
                                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                  <span className="text-[10px]">Present</span>
                                </>
                              ) : (
                                <>
                                  <X className="h-3 w-3 text-slate-400" />
                                  <span className="text-[10px]">Absent</span>
                                </>
                              )}
                            </button>
                          </td>
                        );
                      })}

                      {/* Member Row Attendance Summary */}
                      <td className="p-2 text-center font-medium text-emerald-700 dark:text-emerald-400 border-l border-slate-100 dark:border-slate-800">
                        {memberAttendedCount}
                      </td>
                      <td className="p-2 text-center font-medium text-rose-600 dark:text-rose-400">
                        {memberMissedCount}
                      </td>
                      <td className="p-2 text-center font-medium text-slate-700 dark:text-slate-300">
                        {memberRate}%
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={filteredEvents.length + 4}
                    className="text-center py-10 text-slate-400 italic"
                  >
                    No matching active members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const AttendanceGrid = DynamicAttendanceGrid;
