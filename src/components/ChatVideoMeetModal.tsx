import React, { useState, useEffect, useRef, useMemo } from "react";
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
  CheckCircle2,
  Circle,
  Clock,
  ShieldCheck,
  Monitor,
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
  const [sidePanel, setSidePanel] = useState<"chat" | "docs" | "participants" | "agenda" | null>("agenda");

  // Call duration counter
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!open) {
      setElapsedSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [open]);

  const formattedDuration = useMemo(() => {
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [elapsedSeconds]);

  // Meeting Agenda & Action Points
  const [agendaPoints, setAgendaPoints] = useState<AgendaPoint[]>([
    {
      id: "ag-1",
      title: "Review Q3 financial audit & reserves",
      assignee: "Treasurer",
      status: "completed",
      author: "Supervisory Board",
      time: "10:05 AM"
    },
    {
      id: "ag-2",
      title: "Approve 24h space lending policy",
      assignee: "Operations Lead",
      status: "open",
      author: "Secretary",
      time: "10:12 AM"
    }
  ]);
  const [newAgendaTitle, setNewAgendaTitle] = useState("");
  const [newAgendaAssignee, setNewAgendaAssignee] = useState("");

  // Local video stream & camera connection
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // In-call chat messages
  const [callMessages, setCallMessages] = useState<MeetMessage[]>([
    {
      id: "msg-1",
      sender: "System",
      text: `Meeting started in #${channelName}. Welcome!`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Shared Document during call
  const [sharedDoc, setSharedDoc] = useState<Document | null>(() => {
    return documents && documents.length > 0 ? documents[0] : null;
  });

  // Comments on shared document
  const [docComments, setDocComments] = useState<DocComment[]>([
    {
      id: "c-1",
      author: "Supervisory Board",
      text: "Verify reserve fund allocation.",
      time: "10:14 AM",
      pageOrSection: "Section 2"
    }
  ]);
  const [newCommentText, setNewCommentText] = useState("");

  // Participants roster
  const activeParticipants = useMemo(() => {
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

  // Acquire local webcam & microphone
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (open) {
      setCameraError(null);
      navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
        .then(s => {
          stream = s;
          setLocalStream(s);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = s;
          }
        })
        .catch(err => {
          console.warn("Camera/mic permission:", err);
          setCameraError("Camera unavailable. Using profile avatar.");
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [open]);

  // Ensure video element receives stream when mounted or stream updates
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, videoOn, screenSharing]);

  // Callback ref for video element to guarantee stream attachment upon DOM insertion
  const handleVideoRef = (el: HTMLVideoElement | null) => {
    localVideoRef.current = el;
    if (el && localStream) {
      el.srcObject = localStream;
    }
  };

  // Toggle Microphone
  const handleToggleMic = () => {
    const nextState = !micOn;
    setMicOn(nextState);
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = nextState;
      });
    }
    addToast(nextState ? "Microphone on" : "Microphone muted", "info");
  };

  // Toggle Camera
  const handleToggleVideo = async () => {
    const nextState = !videoOn;
    setVideoOn(nextState);

    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = nextState;
      });
    }

    // If stream did not have video tracks, try to request now
    if (nextState && (!localStream || localStream.getVideoTracks().length === 0)) {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: micOn });
        setLocalStream(s);
        setCameraError(null);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = s;
        }
      } catch (e: any) {
        setCameraError("Camera permission denied.");
      }
    }

    addToast(nextState ? "Camera on" : "Camera off", "info");
  };

  // Toggle Screen Share
  const handleToggleScreenShare = async () => {
    if (screenSharing) {
      setScreenSharing(false);
      // Revert to camera
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: micOn });
        setLocalStream(s);
      } catch (e) {}
      addToast("Screen share stopped", "info");
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setLocalStream(screenStream);
        setScreenSharing(true);
        setVideoOn(true);
        addToast("Presenting screen", "success");
        screenStream.getVideoTracks()[0].onended = () => {
          setScreenSharing(false);
        };
      } catch (e) {
        console.warn("Screen share cancelled", e);
      }
    }
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (sidePanel === "chat") {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [callMessages, sidePanel]);

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
      author: user?.full_name || "Member",
      text: newCommentText.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      pageOrSection: "General"
    };

    setDocComments(prev => [...prev, newC]);
    setCallMessages(prev => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        sender: user?.full_name || "You",
        text: `Note on "${sharedDoc.name}": "${newCommentText.trim()}"`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isDocComment: true
      }
    ]);
    setNewCommentText("");
    addToast("Note added to document", "success");
  };

  const handleCreateAgendaPoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgendaTitle.trim()) return;

    const newPoint: AgendaPoint = {
      id: `ag-${Date.now()}`,
      title: newAgendaTitle.trim(),
      assignee: newAgendaAssignee.trim() || "Team",
      status: "open",
      author: user?.full_name || "Host",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setAgendaPoints(prev => [...prev, newPoint]);
    setNewAgendaTitle("");
    setNewAgendaAssignee("");
    addToast("Task added to meeting agenda", "success");
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
    addToast(`Sharing "${doc.name}" with attendees`, "info");
    setCallMessages(prev => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        sender: user?.full_name || "You",
        text: `Sharing document: "${doc.name}"`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isDocComment: true
      }
    ]);
  };

  const toggleSidePanel = (panel: "chat" | "docs" | "participants" | "agenda") => {
    setSidePanel(prev => (prev === panel ? null : panel));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full h-full max-h-[95vh] max-w-7xl flex flex-col overflow-hidden shadow-2xl text-slate-100">
        
        {/* HEADER BAR */}
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/90 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Video className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white truncate">Video Meeting</span>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/80 shrink-0">
                  #{channelName}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 truncate mt-0.5">
                <span className="truncate">{activeOrg?.name || "Organization"}</span>
                <span>·</span>
                <span>{activeParticipants.length} Connected</span>
                <span>·</span>
                <span className="font-mono text-emerald-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formattedDuration}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Panel Toggle Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 p-1 rounded-2xl shrink-0 overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => toggleSidePanel("agenda")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                sidePanel === "agenda"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>Agenda ({agendaPoints.length})</span>
            </button>
            <button
              type="button"
              onClick={() => toggleSidePanel("chat")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                sidePanel === "chat"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0" />
              <span>Chat ({callMessages.length})</span>
            </button>
            <button
              type="button"
              onClick={() => toggleSidePanel("docs")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                sidePanel === "docs"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span>Docs ({documents?.length || 0})</span>
            </button>
            <button
              type="button"
              onClick={() => toggleSidePanel("participants")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                sidePanel === "participants"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span>People ({activeParticipants.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition shrink-0 ml-1"
            title="Close Window"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* MAIN BODY: VIDEO STAGE (ALWAYS VISIBLE!) + SIDE DRAWER */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          
          {/* LEFT/CENTER: VIDEO STAGE */}
          <div className="flex-1 min-w-0 flex flex-col p-3 gap-3 overflow-y-auto bg-slate-950/40">
            {sharedDoc && sidePanel === "docs" ? (
              /* Split View: Shared Document + Attendee Video Bar */
              <div className="flex-1 flex flex-col gap-3 min-h-0">
                <div className="flex-1 bg-white text-slate-900 rounded-2xl p-5 overflow-y-auto shadow-inner border border-slate-700 flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b pb-2 text-xs">
                    <div>
                      <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                        Live Document Review
                      </span>
                      <h4 className="font-bold text-sm text-slate-900">{sharedDoc.name}</h4>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">
                      By {sharedDoc.uploader_name || "Admin"}
                    </span>
                  </div>

                  <div className="flex-1 text-xs leading-relaxed text-slate-800 whitespace-pre-wrap select-text">
                    {sharedDoc.content ? (
                      <div dangerouslySetInnerHTML={{ __html: sharedDoc.content }} />
                    ) : (
                      <div className="space-y-3">
                        <p className="font-semibold text-slate-800">
                          COOPERATIVE RESOLUTION & MINUTES
                        </p>
                        <p>
                          Executive committee resolution on quarterly performance targets and facility spaces schedule.
                        </p>
                        <p>
                          1. <strong>Quorum:</strong> Verified by the supervisory board with attendance recorded digitally.
                        </p>
                        <p>
                          2. <strong>Facility Spaces:</strong> All community rooms will maintain active 24-hour schedules to prevent overlapping bookings.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Attendee Video Strip under doc */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 h-28 shrink-0">
                  {activeParticipants.map(p => (
                    <div
                      key={p.id}
                      className="bg-slate-800/90 rounded-2xl border border-slate-700/80 p-2 flex items-center justify-between relative overflow-hidden shadow-xs"
                    >
                      {p.isMe && localStream && videoOn ? (
                        <video
                          ref={handleVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
                        />
                      ) : (
                        <div className="flex items-center gap-2 z-10">
                          <div className={`h-8 w-8 rounded-xl ${p.avatarColor} flex items-center justify-center font-bold text-xs text-white`}>
                            {p.name.charAt(0)}
                          </div>
                          <div className="text-xs truncate max-w-[90px]">
                            <span className="font-semibold block truncate text-white">{p.name}</span>
                            <span className="text-[10px] text-slate-400 block truncate">{p.role}</span>
                          </div>
                        </div>
                      )}
                      <div className="z-10 flex items-center gap-1 text-slate-400 bg-slate-950/70 p-1 rounded-lg">
                        {p.mic ? <Mic className="h-3 w-3 text-emerald-400" /> : <MicOff className="h-3 w-3 text-rose-400" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Full Multi-person Video Grid (ALWAYS VISIBLE!) */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 flex-1 min-h-[220px]">
                {activeParticipants.map(p => (
                  <div
                    key={p.id}
                    className="bg-slate-850 rounded-2xl border border-slate-700/70 relative overflow-hidden flex flex-col items-center justify-center shadow-md group min-h-[160px]"
                  >
                    {/* If local user and webcam active */}
                    {p.isMe && videoOn && localStream ? (
                      <video
                        ref={handleVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover rounded-2xl transform scale-x-[-1]"
                      />
                    ) : (
                      /* Avatar Tile */
                      <div className="flex flex-col items-center gap-2 p-4 text-center">
                        <div className={`h-16 w-16 sm:h-20 sm:w-20 rounded-2xl ${p.avatarColor} flex items-center justify-center font-bold text-2xl text-white shadow-md ring-4 ring-slate-800`}>
                          {p.name.charAt(0)}
                        </div>
                        <span className="text-xs font-semibold text-slate-200">{p.name}</span>
                        {!p.video && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                            <VideoOff className="h-3 w-3" /> Camera off
                          </span>
                        )}
                        {p.isMe && cameraError && (
                          <span className="text-[10px] text-amber-400 font-medium">
                            {cameraError}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Participant Name Badge */}
                    <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-xs px-2.5 py-1 rounded-xl text-xs font-medium flex items-center gap-1.5 border border-slate-800 text-white">
                      <span>{p.name}</span>
                      {p.isMe && <span className="text-[10px] text-emerald-400 font-bold">(You)</span>}
                      {p.speaking && (
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                    </div>

                    {/* Mic indicator */}
                    <div className="absolute bottom-3 right-3 bg-slate-950/80 backdrop-blur-xs p-1.5 rounded-xl border border-slate-800">
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

          {/* RIGHT SIDE PANEL: (Only shows when opened, never hides video!) */}
          {sidePanel && (
            <div className="w-full md:w-80 lg:w-96 shrink-0 border-t md:border-t-0 md:border-l border-slate-800 bg-slate-900/95 flex flex-col min-h-0">
              
              {/* Panel 1: Agenda & Tasks */}
              {sidePanel === "agenda" && (
                <div className="flex-1 flex flex-col h-full min-h-0">
                  <div className="p-3 border-b border-slate-800 text-xs font-bold text-slate-200 flex items-center justify-between">
                    <span>Meeting Agenda & Tasks</span>
                    <button
                      type="button"
                      onClick={() => setSidePanel(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      title="Hide Panel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2.5 min-h-0 text-xs">
                    {agendaPoints.map(pt => (
                      <div
                        key={pt.id}
                        onClick={() => handleToggleAgendaStatus(pt.id)}
                        className={`p-3 rounded-2xl border text-xs flex flex-col gap-2 cursor-pointer transition ${
                          pt.status === "completed"
                            ? "bg-emerald-950/30 border-emerald-800/40 text-emerald-200/80"
                            : "bg-slate-800/80 border-slate-700 hover:border-emerald-500 text-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            {pt.status === "completed" ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                            ) : (
                              <Circle className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                            )}
                            <span className={`font-semibold leading-snug break-words ${pt.status === "completed" ? "line-through text-slate-400" : "text-white"}`}>
                              {pt.title}
                            </span>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                            pt.status === "completed" ? "bg-emerald-900/60 text-emerald-300" : "bg-amber-950/60 text-amber-300"
                          }`}>
                            {pt.status === "completed" ? "Done" : "Open"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pl-6">
                          <span>Assignee: <strong className="text-slate-300">{pt.assignee}</strong></span>
                          <span>{pt.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Task Form */}
                  <form onSubmit={handleCreateAgendaPoint} className="p-3 border-t border-slate-800 flex flex-col gap-2">
                    <input
                      type="text"
                      placeholder="Add talking point or task..."
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
                        Add Task
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Panel 2: In-Call Text Chat */}
              {sidePanel === "chat" && (
                <div className="flex-1 flex flex-col h-full min-h-0">
                  <div className="p-3 border-b border-slate-800 text-xs font-bold text-slate-200 flex items-center justify-between">
                    <span>Meeting Chat</span>
                    <button
                      type="button"
                      onClick={() => setSidePanel(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      title="Hide Panel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2.5 min-h-0 text-xs">
                    {callMessages.map(m => (
                      <div
                        key={m.id}
                        className={`p-2.5 rounded-2xl border text-xs flex flex-col gap-1 ${
                          m.isDocComment
                            ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-200"
                            : m.sender === "System"
                            ? "bg-slate-800/40 border-slate-700/40 text-slate-400 italic"
                            : m.sender === (user?.full_name || "You")
                            ? "bg-emerald-950/40 border-emerald-800/50 text-slate-100 self-end max-w-[85%]"
                            : "bg-slate-800/80 border-slate-700 text-slate-200 self-start max-w-[85%]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400 font-mono">
                          <span className="font-semibold text-slate-300 truncate">{m.sender}</span>
                          <span>{m.time}</span>
                        </div>
                        <p className="leading-snug break-words">{m.text}</p>
                      </div>
                    ))}
                    <div ref={chatBottomRef} />
                  </div>

                  <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 flex gap-2">
                    <input
                      type="text"
                      placeholder="Send message to meeting..."
                      value={inputMessage}
                      onChange={e => setInputMessage(e.target.value)}
                      className="flex-1 text-xs rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer shrink-0"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </div>
              )}

              {/* Panel 3: Shared Document Review */}
              {sidePanel === "docs" && (
                <div className="flex-1 flex flex-col h-full min-h-0">
                  <div className="p-3 border-b border-slate-800 text-xs font-bold text-slate-200 flex items-center justify-between">
                    <span>Document Review</span>
                    <button
                      type="button"
                      onClick={() => setSidePanel(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      title="Hide Panel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="p-3 border-b border-slate-800 flex flex-col gap-2">
                    <label className="text-xs font-medium text-slate-400 block">
                      Select Document:
                    </label>
                    <select
                      value={sharedDoc?.id || ""}
                      onChange={e => {
                        const doc = documents.find(d => d.id === e.target.value);
                        if (doc) handleSelectDoc(doc);
                      }}
                      className="w-full text-xs p-2 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none"
                    >
                      {documents.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2 min-h-0 text-xs">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Notes & Comments ({docComments.length}):
                    </span>
                    {docComments.map(c => (
                      <div
                        key={c.id}
                        className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className="font-bold text-emerald-400">{c.author}</span>
                          <span>{c.time}</span>
                        </div>
                        <p className="text-slate-200 leading-snug">{c.text}</p>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleAddDocComment} className="p-3 border-t border-slate-800 flex flex-col gap-2">
                    <input
                      type="text"
                      placeholder="Add note on document..."
                      value={newCommentText}
                      onChange={e => setNewCommentText(e.target.value)}
                      className="text-xs rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition"
                    >
                      Post Note
                    </button>
                  </form>
                </div>
              )}

              {/* Panel 4: Participants */}
              {sidePanel === "participants" && (
                <div className="flex-1 flex flex-col h-full min-h-0 p-3 gap-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-bold text-slate-200">
                      Attendees ({activeParticipants.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setSidePanel(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      title="Hide Panel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto flex flex-col gap-2">
                    {activeParticipants.map(p => (
                      <div
                        key={p.id}
                        className="p-2.5 rounded-xl bg-slate-850 border border-slate-750 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`h-8 w-8 rounded-xl ${p.avatarColor} flex items-center justify-center font-bold text-xs text-white`}>
                            {p.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-semibold block text-white">{p.name} {p.isMe && "(You)"}</span>
                            <span className="text-[10px] text-slate-400 block">{p.role}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400">
                          {p.mic ? <Mic className="h-3.5 w-3.5 text-emerald-400" /> : <MicOff className="h-3.5 w-3.5 text-rose-400" />}
                          {p.video ? <Video className="h-3.5 w-3.5 text-emerald-400" /> : <VideoOff className="h-3.5 w-3.5 text-rose-400" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* BOTTOM CONTROLS DOCK */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium hidden sm:flex">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>Encrypted Session</span>
          </div>

          {/* Central Action Buttons */}
          <div className="flex items-center gap-2.5 mx-auto sm:mx-0">
            {/* Mic Toggle */}
            <button
              type="button"
              onClick={handleToggleMic}
              className={`p-3 rounded-full transition cursor-pointer shadow-sm ${
                micOn
                  ? "bg-slate-800 hover:bg-slate-700 text-white"
                  : "bg-rose-600 hover:bg-rose-700 text-white"
              }`}
              title={micOn ? "Mute Microphone" : "Unmute Microphone"}
            >
              {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </button>

            {/* Camera Toggle */}
            <button
              type="button"
              onClick={handleToggleVideo}
              className={`p-3 rounded-full transition cursor-pointer shadow-sm ${
                videoOn
                  ? "bg-slate-800 hover:bg-slate-700 text-white"
                  : "bg-rose-600 hover:bg-rose-700 text-white"
              }`}
              title={videoOn ? "Turn Camera Off" : "Turn Camera On"}
            >
              {videoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </button>

            {/* Screen Share Toggle */}
            <button
              type="button"
              onClick={handleToggleScreenShare}
              className={`p-3 rounded-full transition cursor-pointer shadow-sm ${
                screenSharing
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-800 hover:bg-slate-700 text-white"
              }`}
              title="Share Screen"
            >
              <Monitor className="h-5 w-5" />
            </button>

            {/* Document Review Toggle */}
            <button
              type="button"
              onClick={() => toggleSidePanel("docs")}
              className={`p-3 rounded-full transition cursor-pointer shadow-sm ${
                sidePanel === "docs"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-800 hover:bg-slate-700 text-white"
              }`}
              title="Review Document"
            >
              <FileText className="h-5 w-5" />
            </button>

            {/* Leave Call */}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition cursor-pointer ml-1"
              title="End Meeting"
            >
              <PhoneOff className="h-4 w-4" />
              <span>Leave</span>
            </button>
          </div>

          <div className="text-xs text-slate-400 font-mono hidden md:block">
            Impacto Meet
          </div>
        </div>

      </div>
    </div>
  );
};
