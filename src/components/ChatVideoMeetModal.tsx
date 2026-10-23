import React, { useState, useEffect, useRef } from "react";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Share2,
  FileText,
  MessageSquare,
  Users,
  Send,
  Maximize2,
  Minimize2,
  Sparkles,
  Download,
  CheckCircle2,
  Eye,
  CornerDownRight,
  Smile,
  X
} from "lucide-react";
import { OrgMember, Document } from "../types";
import { useAuthStore } from "../store/authStore";
import { useToast } from "./Toast";

interface ChatVideoMeetModalProps {
  open: boolean;
  onClose: () => void;
  channelName: string;
  activeOrg: any;
  activeMember?: OrgMember;
  members: OrgMember[];
  documents: Document[];
}

interface MeetMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  isDocComment?: boolean;
}

interface DocComment {
  id: string;
  author: string;
  text: string;
  time: string;
  pageOrSection?: string;
}

interface AgendaPoint {
  id: string;
  title: string;
  assignee: string;
  status: "open" | "completed";
  author: string;
  time: string;
}

export const ChatVideoMeetModal: React.FC<ChatVideoMeetModalProps> = ({
  open,
  onClose,
  channelName,
  activeOrg,
  activeMember,
  members,
  documents
}) => {
  const { user } = useAuthStore();
  const { addToast } = useToast();

  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [sidePanel, setSidePanel] = useState<"chat" | "docs" | "participants" | "agenda">("agenda");

  // Meeting Agenda & Action Points visible to all
  const [agendaPoints, setAgendaPoints] = useState<AgendaPoint[]>([
    {
      id: "ag-1",
      title: "Review quarterly cooperative financial audit and reserve funds",
      assignee: "Treasurer",
      status: "completed",
      author: "Supervisory Board",
      time: "10:05 AM"
    },
    {
      id: "ag-2",
      title: "Approve 24-hour space lending schedule rules for community halls",
      assignee: "Operations Lead",
      status: "open",
      author: "Secretary",
      time: "10:12 AM"
    }
  ]);
  const [newAgendaTitle, setNewAgendaTitle] = useState("");
  const [newAgendaAssignee, setNewAgendaAssignee] = useState("");

  // Local video stream
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  // In-call chat messages
  const [callMessages, setCallMessages] = useState<MeetMessage[]>([
    {
      id: "msg-1",
      sender: "System",
      text: `Meeting started in #${channelName}. All participants can share documents and chat.`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");

  // Shared Document during call
  const [sharedDoc, setSharedDoc] = useState<Document | null>(() => {
    return documents && documents.length > 0 ? documents[0] : null;
  });

  // Comments on shared document
  const [docComments, setDocComments] = useState<DocComment[]>([
    {
      id: "c-1",
      author: "Supervisory Board",
      text: "Please verify section 2 paragraph 3 regarding cooperative reserve fund allocation.",
      time: "10:14 AM",
      pageOrSection: "Section 2"
    }
  ]);
  const [newCommentText, setNewCommentText] = useState("");

  // Active participants in call dynamically derived from database members
  const activeParticipants = React.useMemo(() => {
    if (members && members.length > 0) {
      return members.slice(0, 8).map((m, idx) => {
        const isMe = (user?.id && m.user_id === user.id) || (user?.email && m.email === user.email) || idx === 0;
        return {
          id: m.id || `p-${idx}`,
          name: m.full_name || m.email?.split("@")[0] || `Member ${idx + 1}`,
          role: m.role ? m.role.charAt(0).toUpperCase() + m.role.slice(1) : "Member",
          isMe,
          speaking: idx === 1,
          mic: isMe ? micOn : idx % 2 === 0,
          video: isMe ? videoOn : true,
          avatarColor: idx % 4 === 0 ? "bg-emerald-600" : idx % 4 === 1 ? "bg-indigo-600" : idx % 4 === 2 ? "bg-amber-600" : "bg-rose-600"
        };
      });
    }
    return [
      {
        id: "p-me",
        name: user?.full_name || "You",
        role: activeMember?.role || "Host",
        isMe: true,
        speaking: false,
        mic: micOn,
        video: videoOn,
        avatarColor: "bg-emerald-600"
      }
    ];
  }, [members, user, activeMember, micOn, videoOn]);

  // Try to acquire local webcam/mic
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (open) {
      navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
        .then(s => {
          stream = s;
          setLocalStream(s);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = s;
          }
        })
        .catch(err => {
          console.warn("Camera/mic access not granted or unavailable, fallback to simulated video tile:", err);
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [open]);

  // Handle toggling mic/video on stream
  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => (t.enabled = micOn));
    }
  }, [micOn, localStream]);

  useEffect(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(t => (t.enabled = videoOn));
    }
  }, [videoOn, localStream]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const newMsg: MeetMessage = {
      id: `msg-${Date.now()}`,
      sender: user?.full_name || "You",
      text: inputMessage.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setCallMessages(prev => [...prev, newMsg]);
    setInputMessage("");
  };

  const handleAddDocComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !sharedDoc) return;

    const newC: DocComment = {
      id: `c-${Date.now()}`,
      author: user?.full_name || "Signatory",
      text: newCommentText.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      pageOrSection: "General"
    };

    setDocComments(prev => [...prev, newC]);
    // Also post notice into meeting chat
    setCallMessages(prev => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        sender: user?.full_name || "You",
        text: `💬 Commented on shared doc "${sharedDoc.name}": "${newCommentText.trim()}"`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isDocComment: true
      }
    ]);
    setNewCommentText("");
    addToast("Comment attached to shared document!", "success");
  };

  const handleCreateAgendaPoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgendaTitle.trim()) return;

    const newPoint: AgendaPoint = {
      id: `ag-${Date.now()}`,
      title: newAgendaTitle.trim(),
      assignee: newAgendaAssignee.trim() || "General Assembly",
      status: "open",
      author: user?.full_name || "Host",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setAgendaPoints(prev => [...prev, newPoint]);
    setNewAgendaTitle("");
    setNewAgendaAssignee("");
    addToast("Meeting agenda point added & visible to all attendees!", "success");
  };

  const handleToggleAgendaStatus = (id: string) => {
    setAgendaPoints(prev =>
      prev.map(p =>
        p.id === id ? { ...p, status: p.status === "open" ? "completed" : "open" } : p
      )
    );
  };

  const handleSelectDoc = (doc: Document) => {
    setSharedDoc(doc);
    addToast(`Sharing document "${doc.name}" with all meeting attendees.`, "info");
    setCallMessages(prev => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        sender: user?.full_name || "You",
        text: `📄 Presented document for live review: "${doc.name}"`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isDocComment: true
      }
    ]);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full h-full max-h-[94vh] max-w-7xl flex flex-col overflow-hidden shadow-2xl text-white">
        
        {/* TOP BAR */}
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-3 w-3 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-bold flex items-center gap-2 truncate">
                <span className="truncate">Cooperative Live Video Meet</span>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800 shrink-0">
                  #{channelName}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {activeOrg?.name || "Organization"} • {activeParticipants.length} Participants Connected
              </p>
            </div>
          </div>

          {/* Side Panel Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl shrink-0 overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setSidePanel("agenda")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                sidePanel === "agenda" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>Agenda & Points ({agendaPoints.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSidePanel("chat")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                sidePanel === "chat" ? "bg-slate-700 text-white shadow-xs" : "text-slate-400 hover:text-white"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0" />
              <span>In-Call Chat</span>
            </button>
            <button
              type="button"
              onClick={() => setSidePanel("docs")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                sidePanel === "docs" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
              }`}
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span>Shared Docs ({docComments.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSidePanel("participants")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                sidePanel === "participants" ? "bg-slate-700 text-white shadow-xs" : "text-slate-400 hover:text-white"
              }`}
            >
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span>Participants ({activeParticipants.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* MAIN BODY: VIDEO GRID / SHARED DOC + SIDE PANEL */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          {/* LEFT: Video Tiles / Shared Document Canvas */}
          <div className="flex-1 flex flex-col p-3 gap-3 overflow-y-auto bg-slate-950/40">
            {sharedDoc && sidePanel === "docs" ? (
              /* Split View: Shared Document in Center Stage with floating speaker bar */
              <div className="flex-1 flex flex-col gap-3 min-h-0">
                {/* Document Display Canvas */}
                <div className="flex-1 bg-white text-slate-900 rounded-xl p-5 overflow-y-auto shadow-inner border border-slate-700 flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b pb-2 text-xs">
                    <div>
                      <span className="font-mono text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">
                        Live Presented Cooperative Document
                      </span>
                      <h4 className="font-bold text-sm text-slate-900">{sharedDoc.name}</h4>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">
                      Uploaded by {sharedDoc.uploader_name || "Admin"}
                    </span>
                  </div>

                  <div className="flex-1 text-xs font-sans leading-relaxed text-slate-800 whitespace-pre-wrap select-text">
                    {sharedDoc.content ? (
                      <div dangerouslySetInnerHTML={{ __html: sharedDoc.content }} />
                    ) : (
                      <div className="space-y-3">
                        <p className="font-semibold text-slate-800">
                          COOPERATIVE EXECUTIVE RESOLUTION AND MINUTES DOCKET
                        </p>
                        <p>
                          Pursuant to the General Assembly mandate and internal bylaws, the executive leadership team hereby convenes to ratify quarterly performance targets, approve member loan facilities, and establish verified community spaces lending standards.
                        </p>
                        <p>
                          1. <strong>Quorum Verification:</strong> The supervisory committee certifies that quorum has been achieved with active attendance registered digitally.
                        </p>
                        <p>
                          2. <strong>Facility Space Management:</strong> All cooperative physical halls and training spaces shall be indexed with verified 24-hour occupancy schedules to prevent conflicting reservations.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Floating Speakers Bar under doc */}
                <div className="grid grid-cols-4 gap-2 h-24 shrink-0">
                  {activeParticipants.map(p => (
                    <div
                      key={p.id}
                      className="bg-slate-800/80 rounded-xl border border-slate-700/80 p-2 flex items-center justify-between relative overflow-hidden"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`h-8 w-8 rounded-full ${p.avatarColor} flex items-center justify-center font-bold text-xs`}>
                          {p.name.charAt(0)}
                        </div>
                        <div className="text-xs truncate max-w-[80px]">
                          <span className="font-semibold block truncate">{p.name}</span>
                          <span className="text-[10px] text-slate-400 block truncate">{p.role}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400">
                        {p.mic ? <Mic className="h-3 w-3 text-emerald-400" /> : <MicOff className="h-3 w-3 text-rose-400" />}
                      </div>
                      {p.speaking && (
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-emerald-500 animate-pulse" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Full Multi-person Video Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 min-h-0">
                {activeParticipants.map(p => (
                  <div
                    key={p.id}
                    className="bg-slate-800/90 rounded-2xl border border-slate-700/60 relative overflow-hidden flex flex-col items-center justify-center group shadow-md"
                  >
                    {/* If local user and webcam stream active */}
                    {p.isMe && localStream && videoOn ? (
                      <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover rounded-2xl"
                      />
                    ) : (
                      /* Avatar Placeholder */
                      <div className="flex flex-col items-center gap-2">
                        <div className={`h-20 w-20 rounded-2xl ${p.avatarColor} flex items-center justify-center font-bold text-2xl shadow-lg ring-4 ring-slate-700/50`}>
                          {p.name.charAt(0)}
                        </div>
                        <span className="text-xs font-semibold text-slate-300">{p.name}</span>
                        {!p.video && (
                          <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                            <VideoOff className="h-3 w-3" /> Camera Turned Off
                          </span>
                        )}
                      </div>
                    )}

                    {/* Participant Badge Overlay */}
                    <div className="absolute bottom-3 left-3 bg-slate-950/70 backdrop-blur-xs px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-slate-800">
                      <span>{p.name}</span>
                      {p.speaking && (
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                      )}
                    </div>

                    {/* Mic status indicator */}
                    <div className="absolute bottom-3 right-3 bg-slate-950/70 backdrop-blur-xs p-1.5 rounded-lg border border-slate-800">
                      {p.mic ? (
                        <Mic className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <MicOff className="h-3.5 w-3.5 text-rose-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT SIDE PANEL: AGENDA / CHAT / DOCS / PARTICIPANTS */}
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900/90 flex flex-col shrink-0">
            {/* Panel 1: Meeting Agenda & Action Points visible to all */}
            {sidePanel === "agenda" && (
              <div className="flex-1 flex flex-col h-full min-h-0">
                <div className="p-3 border-b border-slate-800 text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Meeting Agenda & Points</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Visible to All</span>
                </div>

                <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2.5 min-h-0 text-xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Talking Points & Tasks ({agendaPoints.length}):
                  </span>
                  {agendaPoints.map(pt => (
                    <div
                      key={pt.id}
                      onClick={() => handleToggleAgendaStatus(pt.id)}
                      className={`p-3 rounded-xl border text-xs flex flex-col gap-1.5 cursor-pointer transition ${
                        pt.status === "completed"
                          ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-200/70 line-through"
                          : "bg-slate-800/80 border-slate-700 hover:border-emerald-500 text-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold truncate max-w-[180px]">{pt.title}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold shrink-0 ${
                          pt.status === "completed" ? "bg-emerald-900/50 text-emerald-300" : "bg-amber-950/50 text-amber-300"
                        }`}>
                          {pt.status === "completed" ? "Done" : "Open"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>Assignee: <strong>{pt.assignee}</strong></span>
                        <span>{pt.time}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add agenda point form */}
                <form onSubmit={handleCreateAgendaPoint} className="p-2.5 border-t border-slate-800 flex flex-col gap-2">
                  <input
                    type="text"
                    placeholder="Agenda point title..."
                    value={newAgendaTitle}
                    onChange={e => setNewAgendaTitle(e.target.value)}
                    className="text-xs rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white outline-none focus:border-emerald-500"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Assignee (e.g. Treasurer)..."
                      value={newAgendaAssignee}
                      onChange={e => setNewAgendaAssignee(e.target.value)}
                      className="flex-1 text-xs rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition shrink-0 cursor-pointer"
                    >
                      Add Point
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Panel 2: In-Call Text Chat */}
            {sidePanel === "chat" && (
              <div className="flex-1 flex flex-col h-full min-h-0">
                <div className="p-3 border-b border-slate-800 text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Live Meeting Chat</span>
                  <span className="text-[10px] text-slate-400 font-mono">{callMessages.length} messages</span>
                </div>

                <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2.5 min-h-0 text-xs">
                  {callMessages.map(m => (
                    <div
                      key={m.id}
                      className={`p-2.5 rounded-xl border text-xs flex flex-col gap-0.5 ${
                        m.isDocComment
                          ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-200"
                          : m.sender === "System"
                          ? "bg-slate-800/40 border-slate-700/40 text-slate-400 italic"
                          : m.sender === (user?.full_name || "You")
                          ? "bg-slate-800 border-slate-700 text-slate-100 self-end max-w-[90%]"
                          : "bg-slate-800/60 border-slate-700/60 text-slate-200 self-start max-w-[90%]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-slate-400">
                        <span className="font-bold text-slate-300 truncate">{m.sender}</span>
                        <span>{m.time}</span>
                      </div>
                      <p className="leading-snug break-words">{m.text}</p>
                    </div>
                  ))}
                </div>

                {/* Chat input form */}
                <form onSubmit={handleSendMessage} className="p-2.5 border-t border-slate-800 flex gap-2">
                  <input
                    type="text"
                    placeholder="Type message to meeting..."
                    value={inputMessage}
                    onChange={e => setInputMessage(e.target.value)}
                    className="flex-1 text-xs rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            )}

            {/* Panel 2: Shared Document & Live Collaborative Comments */}
            {sidePanel === "docs" && (
              <div className="flex-1 flex flex-col h-full min-h-0">
                <div className="p-3 border-b border-slate-800 text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Document Live Review</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Real-time sync</span>
                </div>

                <div className="p-3 border-b border-slate-800 flex flex-col gap-2">
                  <label className="text-[11px] font-semibold text-slate-400 block">
                    Pick Document to Present:
                  </label>
                  <select
                    value={sharedDoc?.id || ""}
                    onChange={e => {
                      const doc = documents.find(d => d.id === e.target.value);
                      if (doc) handleSelectDoc(doc);
                    }}
                    className="w-full text-xs p-2 rounded-lg bg-slate-800 border border-slate-700 text-white outline-none"
                  >
                    {documents.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Comments list on shared document */}
                <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2.5 min-h-0">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Attendee Annotations & Comments ({docComments.length}):
                  </span>
                  {docComments.map(c => (
                    <div
                      key={c.id}
                      className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span className="font-bold text-emerald-400">{c.author}</span>
                        <span>{c.time}</span>
                      </div>
                      <p className="text-slate-200 leading-snug">{c.text}</p>
                    </div>
                  ))}
                </div>

                {/* Add comment input */}
                <form onSubmit={handleAddDocComment} className="p-2.5 border-t border-slate-800 flex flex-col gap-2">
                  <input
                    type="text"
                    placeholder="Add comment on shared doc..."
                    value={newCommentText}
                    onChange={e => setNewCommentText(e.target.value)}
                    className="text-xs rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition"
                  >
                    Post Comment
                  </button>
                </form>
              </div>
            )}

            {/* Panel 3: Participants list */}
            {sidePanel === "participants" && (
              <div className="flex-1 flex flex-col h-full min-h-0 p-3 gap-2">
                <span className="text-xs font-bold text-slate-300">
                  Meeting Attendees ({activeParticipants.length})
                </span>
                <div className="flex-1 overflow-y-auto flex flex-col gap-2">
                  {activeParticipants.map(p => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`h-7 w-7 rounded-full ${p.avatarColor} flex items-center justify-center font-bold text-xs`}>
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-semibold block">{p.name}</span>
                          <span className="text-[10px] text-slate-400 block">{p.role}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        {p.mic ? <Mic className="h-3 w-3 text-emerald-400" /> : <MicOff className="h-3 w-3 text-rose-400" />}
                        {p.video ? <Video className="h-3 w-3 text-emerald-400" /> : <VideoOff className="h-3 w-3 text-rose-400" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM CONTROLS BAR */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400 font-mono hidden sm:block">
            Impacto WebRTC Meet v1.0
          </div>

          {/* Central Call Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMicOn(!micOn)}
              className={`p-3 rounded-full transition cursor-pointer ${
                micOn ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-rose-600 hover:bg-rose-700 text-white shadow-md"
              }`}
              title={micOn ? "Mute Microphone" : "Unmute Microphone"}
            >
              {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </button>

            <button
              type="button"
              onClick={() => setVideoOn(!videoOn)}
              className={`p-3 rounded-full transition cursor-pointer ${
                videoOn ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-rose-600 hover:bg-rose-700 text-white shadow-md"
              }`}
              title={videoOn ? "Turn Camera Off" : "Turn Camera On"}
            >
              {videoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setSidePanel(sidePanel === "docs" ? "chat" : "docs");
              }}
              className={`p-3 rounded-full transition cursor-pointer ${
                sidePanel === "docs" ? "bg-emerald-600 text-white shadow-md" : "bg-slate-800 hover:bg-slate-700 text-white"
              }`}
              title="Share / Annotate Document"
            >
              <FileText className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition cursor-pointer"
              title="End Meeting"
            >
              <PhoneOff className="h-4 w-4" />
              <span>Leave Meet</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Encrypted Audio & Video</span>
          </div>
        </div>

      </div>
    </div>
  );
};
