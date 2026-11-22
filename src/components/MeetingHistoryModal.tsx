import React, { useState } from "react";
import {
  History,
  Calendar,
  Clock,
  Users,
  FileText,
  CheckCircle2,
  Circle,
  MessageSquare,
  Search,
  Download,
  Copy,
  Trash2,
  X,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Check
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { LiveMeetHistoryRecord } from "../types";
import { useToast } from "./Toast";

interface MeetingHistoryModalProps {
  open: boolean;
  onClose: () => void;
  meetings: LiveMeetHistoryRecord[];
  onDeleteMeeting?: (id: string) => void;
  onClearAllMeetings?: () => void;
  channelName?: string;
}

export const MeetingHistoryModal: React.FC<MeetingHistoryModalProps> = ({
  open,
  onClose,
  meetings,
  onDeleteMeeting,
  onClearAllMeetings,
  channelName
}) => {
  const { t, i18n } = useTranslation();
  const { addToast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: "clear_all" } | { type: "delete_one"; id: string; title: string } | null>(null);

  if (!open) return null;

  const filteredMeetings = meetings.filter(m => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const matchTitle = m.meetingTitle.toLowerCase().includes(query);
    const matchChannel = m.channelName.toLowerCase().includes(query);
    const matchDocs = m.documentsUsed.some(d => d.name.toLowerCase().includes(query));
    const matchAttendees = m.participants.some(p => p.name.toLowerCase().includes(query));
    return matchTitle || matchChannel || matchDocs || matchAttendees;
  });

  const selectedMeeting = meetings.find(m => m.id === selectedMeetingId) || (filteredMeetings.length > 0 ? filteredMeetings[0] : null);

  const handleCopySummary = (meeting: LiveMeetHistoryRecord) => {
    const lines = [
      t("meeting_history.summary_meeting", { title: meeting.meetingTitle, defaultValue: "Meeting: {{title}}" }),
      t("meeting_history.summary_channel", { channel: meeting.channelName, defaultValue: "Channel: #{{channel}}" }),
      t("meeting_history.summary_date", { date: new Date(meeting.startedAt).toLocaleString(i18n.language), defaultValue: "Date: {{date}}" }),
      t("meeting_history.summary_duration", { duration: meeting.durationFormatted, defaultValue: "Duration: {{duration}}" }),
      t("meeting_history.summary_recorded_by", { name: meeting.recordedBy, defaultValue: "Recorded by: {{name}}" }),
      "",
      t("meeting_history.summary_attendees", { count: meeting.participants.length, defaultValue: "Attendees ({{count}}):" }),
      ...meeting.participants.map(p => ` - ${p.name} (${p.role})`),
      "",
      t("meeting_history.summary_docs", { count: meeting.documentsUsed.length, defaultValue: "Documents Used ({{count}}):" }),
      ...meeting.documentsUsed.map(d => ` - ${d.name} [${d.category || t("common.general", { defaultValue: "General" })}]`),
      "",
      t("meeting_history.summary_notes", { count: meeting.notes.length, defaultValue: "Notes & Action Items ({{count}}):" }),
      ...meeting.notes.map(n => ` - [${n.status === "completed" ? "X" : " "}] ${n.title} (${t("meeting_history.assignee_label", { defaultValue: "Assignee" })}: ${n.assignee})`),
      "",
      t("meeting_history.summary_chat_count", { count: meeting.chatMessages.length, defaultValue: "Chat Messages Exchanged: {{count}}" })
    ];

    navigator.clipboard.writeText(lines.join("\n"));
    setCopiedId(meeting.id);
    addToast(t("meeting_history.toast_copied", { defaultValue: "Meeting summary copied to clipboard" }), "success");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadSummary = (meeting: LiveMeetHistoryRecord) => {
    const textContent = [
      `=======================================================`,
      t("meeting_history.txt_header", { defaultValue: "MEETING MINUTES & SESSION RECORD" }),
      `=======================================================`,
      t("meeting_history.txt_title", { title: meeting.meetingTitle, defaultValue: "Title: {{title}}" }),
      t("meeting_history.txt_channel", { channel: meeting.channelName, defaultValue: "Channel: #{{channel}}" }),
      t("meeting_history.txt_started", { date: new Date(meeting.startedAt).toLocaleString(i18n.language), defaultValue: "Started: {{date}}" }),
      t("meeting_history.txt_ended", { date: new Date(meeting.endedAt).toLocaleString(i18n.language), defaultValue: "Ended: {{date}}" }),
      t("meeting_history.txt_duration", { duration: meeting.durationFormatted, defaultValue: "Total Duration: {{duration}}" }),
      t("meeting_history.txt_host", { name: meeting.recordedBy, defaultValue: "Host / Organizer: {{name}}" }),
      `=======================================================`,
      ``,
      t("meeting_history.txt_sec1", { count: meeting.participants.length, defaultValue: "1. ATTENDEES ROSTER ({{count}}):" }),
      ...meeting.participants.map(p => `  * ${p.name} - ${p.role}`),
      ``,
      t("meeting_history.txt_sec2", { count: meeting.documentsUsed.length, defaultValue: "2. DOCUMENTS & RESOURCES REFERENCED ({{count}}):" }),
      ...meeting.documentsUsed.map(d => `  * ${d.name} (${d.category || t("common.general", { defaultValue: "General" })})`),
      ``,
      t("meeting_history.txt_sec3", { count: meeting.notes.length, defaultValue: "3. ACTION ITEMS & AGENDA MINUTES ({{count}}):" }),
      ...meeting.notes.map(n => `  * [${n.status.toUpperCase()}] ${n.title} (${t("meeting_history.assigned_to", { defaultValue: "Assigned to" })}: ${n.assignee}) - ${n.time}`),
      ``,
      t("meeting_history.txt_sec4", { count: meeting.chatMessages.length, defaultValue: "4. IN-CALL CHAT TRANSCRIPT ({{count}} messages):" }),
      ...meeting.chatMessages.map(m => `  [${m.time}] ${m.sender}: ${m.text}`),
      ``,
      `=======================================================`,
      t("meeting_history.txt_footer", { defaultValue: "Generated by Impacto Governance Live Meet" })
    ].join("\n");

    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${meeting.meetingTitle.replace(/[^a-zA-Z0-9_-]/g, "_")}_minutes.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast(t("meeting_history.toast_downloaded", { defaultValue: "Meeting minutes downloaded" }), "info");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl h-[90vh] max-h-[820px] flex flex-col shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 shrink-0">
              <History className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white break-words">
                  {t("meeting_history.title", { defaultValue: "Meeting History & Resources" })}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  {t("meeting_history.recorded_count", { count: meetings.length, defaultValue: "{{count}} Recorded" })}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 break-words">
                {t("meeting_history.subtitle", { defaultValue: "Archived sessions with documents presented, attendee rosters, and recorded minutes" })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {meetings.length > 0 && onClearAllMeetings && (
              <button
                type="button"
                onClick={() => setConfirmAction({ type: "clear_all" })}
                className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
              >
                {t("meeting_history.clear_history", { defaultValue: "Clear History" })}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={t("common.close", { defaultValue: "Close" })}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 shrink-0">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={t("meeting_history.search_placeholder", { defaultValue: "Search meetings by title, channel, document, or attendee..." })}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-blue-500 dark:focus:border-blue-400 transition"
            />
          </div>
          {channelName && (
            <span className="hidden sm:inline-flex items-center text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
              {t("meeting_history.current_channel", { channel: channelName, defaultValue: "Current: #{{channel}}" })}
            </span>
          )}
        </div>

        {/* Content Body: Split Left (List) & Right (Details) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          
          {/* Left: Meeting Cards List */}
          <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 overflow-y-auto p-4 flex flex-col gap-2.5 shrink-0 bg-slate-50/30 dark:bg-slate-950/20 max-h-60 md:max-h-none">
            {filteredMeetings.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <History className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-2 stroke-[1.5]" />
                <p className="text-xs font-semibold">{t("meeting_history.empty_title", { defaultValue: "No recorded meetings found" })}</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {t("meeting_history.empty_desc", { defaultValue: "Start a live video call and leave or conclude it to automatically store session records." })}
                </p>
              </div>
            ) : (
              filteredMeetings.map(m => {
                const isSelected = selectedMeeting?.id === m.id;
                const formattedDate = new Date(m.startedAt).toLocaleDateString(i18n.language, {
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                });
                const formattedTime = new Date(m.startedAt).toLocaleTimeString(i18n.language, {
                  hour: "2-digit",
                  minute: "2-digit"
                });

                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMeetingId(m.id)}
                    className={`p-3.5 rounded-xl border text-left text-xs transition cursor-pointer flex flex-col gap-2 ${
                      isSelected
                        ? "bg-blue-50/70 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 ring-1 ring-blue-400/30"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-3xs"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-slate-900 dark:text-white block break-words">
                          {m.meetingTitle}
                        </span>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="font-mono text-blue-600 dark:text-blue-400">#{m.channelName}</span>
                          <span>•</span>
                          <span>{formattedDate} {formattedTime}</span>
                        </div>
                      </div>
                      <span className="shrink-0 font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        {m.durationFormatted}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-slate-400" />
                        {m.participants.length}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3 text-slate-400" />
                        {t("meeting_history.docs_count_short", { count: m.documentsUsed.length, defaultValue: "{{count}} docs" })}
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-slate-400" />
                        {t("meeting_history.notes_count_short", { count: m.notes.length, defaultValue: "{{count}} notes" })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Detailed Meeting View */}
          <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-900 min-w-0">
            {selectedMeeting ? (
              <div className="flex flex-col gap-6 max-w-3xl">
                
                {/* Meeting Title & Summary Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white break-words">
                        {selectedMeeting.meetingTitle}
                      </h4>
                      <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        #{selectedMeeting.channelName}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-2">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {new Date(selectedMeeting.startedAt).toLocaleString(i18n.language)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {t("meeting_history.duration_label", { duration: selectedMeeting.durationFormatted, defaultValue: "Duration: {{duration}}" })}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        {t("meeting_history.recorded_by_label", { name: selectedMeeting.recordedBy, defaultValue: "Recorded by {{name}}" })}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopySummary(selectedMeeting)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                    >
                      {copiedId === selectedMeeting.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          <span>{t("meeting_history.copied", { defaultValue: "Copied" })}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-slate-500" />
                          <span>{t("meeting_history.copy_notes", { defaultValue: "Copy Notes" })}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadSummary(selectedMeeting)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white text-xs font-semibold transition cursor-pointer shadow-3xs"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>{t("meeting_history.download_minutes", { defaultValue: "Download Minutes" })}</span>
                    </button>

                    {onDeleteMeeting && (
                      <button
                        type="button"
                        onClick={() => setConfirmAction({ type: "delete_one", id: selectedMeeting.id, title: selectedMeeting.meetingTitle })}
                        className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-800 transition cursor-pointer"
                        title={t("meeting_history.delete_record", { defaultValue: "Delete record" })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Section 1: Attendees Roster */}
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-blue-500 shrink-0" />
                      <span>{t("meeting_history.attendees_roster", { count: selectedMeeting.participants.length, defaultValue: "Attendees Roster ({{count}})" })}</span>
                    </h5>
                    <span className="text-[11px] text-slate-400 break-words">
                      {t("meeting_history.attendees_hint", { defaultValue: "Only members who actively clicked and joined" })}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {selectedMeeting.participants.map((p, idx) => (
                      <div
                        key={`${p.peerId || p.userId || "peer"}-${idx}`}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center gap-3 text-xs min-w-0"
                      >
                        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-900 dark:text-white block break-words">
                            {p.name}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block break-words">
                            {p.role}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 2: Resources & Documents Used */}
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>{t("meeting_history.docs_section", { count: selectedMeeting.documentsUsed.length, defaultValue: "Documents & Resources Used ({{count}})" })}</span>
                    </h5>
                    <span className="text-[11px] text-slate-400 break-words">
                      {t("meeting_history.docs_hint", { defaultValue: "Referenced from Organization Documents" })}
                    </span>
                  </div>

                  {selectedMeeting.documentsUsed.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {selectedMeeting.documentsUsed.map((doc, idx) => (
                        <div
                          key={`${doc.id || "doc"}-${idx}`}
                          className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-emerald-50/30 dark:bg-emerald-950/20 flex flex-wrap items-center justify-between gap-3 text-xs min-w-0"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 shrink-0">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 dark:text-white block break-words">
                                {doc.name}
                              </span>
                              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium break-words">
                                {doc.category || t("common.general", { defaultValue: "General" })}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 shrink-0">
                            {t("meeting_history.presented_badge", { defaultValue: "Presented" })}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 italic">
                      {t("meeting_history.no_docs", { defaultValue: "No documents were presented during this session." })}
                    </div>
                  )}
                </div>

                {/* Section 3: Notes & Action Items Recorded */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
                      <span>{t("meeting_history.notes_section", { count: selectedMeeting.notes.length, defaultValue: "Meeting Notes & Action Points ({{count}})" })}</span>
                    </h5>
                  </div>

                  {selectedMeeting.notes.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {selectedMeeting.notes.map((note, idx) => (
                        <div
                          key={`${note.id || "note"}-${idx}`}
                          className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col gap-1 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 min-w-0">
                              {note.status === "completed" ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                              ) : (
                                <Circle className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                              )}
                              <span className={`font-semibold break-words ${note.status === "completed" ? "line-through text-slate-400" : "text-slate-900 dark:text-white"}`}>
                                {note.title}
                              </span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              note.status === "completed"
                                ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                                : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                            }`}>
                              {note.status === "completed" ? t("meeting_history.status_resolved", { defaultValue: "Resolved" }) : t("meeting_history.status_open", { defaultValue: "Open Task" })}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 pl-6">
                            <span>{t("meeting_history.assignee_label", { defaultValue: "Assignee" })}: <strong className="text-slate-700 dark:text-slate-300">{note.assignee}</strong></span>
                            <span>{note.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 italic">
                      {t("meeting_history.no_notes", { defaultValue: "No specific action points recorded in minutes." })}
                    </div>
                  )}
                </div>

                {/* Section 4: Chat Transcript Summary */}
                {selectedMeeting.chatMessages.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <MessageSquare className="h-4 w-4 text-purple-500 shrink-0" />
                      <span>{t("meeting_history.chat_section", { count: selectedMeeting.chatMessages.length, defaultValue: "In-Call Chat Log ({{count}})" })}</span>
                    </h5>

                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 max-h-48 overflow-y-auto flex flex-col gap-2.5 text-xs">
                      {selectedMeeting.chatMessages.map((m, idx) => (
                        <div key={`${m.id || "msg"}-${idx}`} className="flex flex-col gap-0.5">
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span className="font-bold text-slate-700 dark:text-slate-300">{m.sender}</span>
                            <span>{m.time}</span>
                          </div>
                          <p className="text-slate-800 dark:text-slate-200 text-xs pl-2 border-l-2 border-slate-300 dark:border-slate-700 break-words">
                            {m.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center">
                <History className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-2 stroke-[1.5]" />
                <p className="text-sm font-semibold">{t("meeting_history.select_prompt_title", { defaultValue: "Select a meeting to view details" })}</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  {t("meeting_history.select_prompt_desc", { defaultValue: "Review attendee rosters, documents presented to participants, and official session notes." })}
                </p>
              </div>
            )}
          </div>

        </div>

        {/* In-App Confirmation Modal replacing native window.confirm */}
        {confirmAction && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {confirmAction.type === "clear_all"
                    ? t("meeting_history.confirm_clear_title", { defaultValue: "Clear Meeting History?" })
                    : t("meeting_history.confirm_delete_title", { defaultValue: "Delete Meeting Record?" })}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 break-words">
                  {confirmAction.type === "clear_all"
                    ? t("meeting_history.confirm_clear_desc", { defaultValue: "Are you sure you want to clear all meeting records?" })
                    : t("meeting_history.confirm_delete_desc", { title: confirmAction.title, defaultValue: "Delete \"{{title}}\" from meeting history?" })}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {t("common.cancel", { defaultValue: "Cancel" })}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirmAction.type === "clear_all" && onClearAllMeetings) {
                      onClearAllMeetings();
                    } else if (confirmAction.type === "delete_one" && onDeleteMeeting) {
                      onDeleteMeeting(confirmAction.id);
                    }
                    setConfirmAction(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
                >
                  {confirmAction.type === "clear_all"
                    ? t("meeting_history.clear_history", { defaultValue: "Clear History" })
                    : t("common.delete", { defaultValue: "Delete" })}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
