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
  X,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  RefreshCw
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

// Built-in synthetic audio cues using browser Web Audio API
const playMeetingChime = (type: "join" | "mute" | "unmute" | "leave") => {
  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return;
    const ctx = new AudioCtxClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "join") {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === "mute") {
      osc.frequency.setValueAtTime(540, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === "unmute") {
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(560, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === "leave") {
      osc.frequency.setValueAtTime(580, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {
    // Non-critical audio warning
  }
};

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

  // Real-time microphone audio level (0-100) and speaking detector
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Rotating speaker simulation for remote attendees
  const [activeSpeakerIdx, setActiveSpeakerIdx] = useState<number>(1);

  useEffect(() => {
    if (!open) {
      setElapsedSeconds(0);
      return;
    }
    playMeetingChime("join");
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [open]);

  // Periodic active speaker shift among simulated participants
  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => {
      setActiveSpeakerIdx(prev => (prev + 1) % 4);
    }, 8000);
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
      text: `Meeting session active in #${channelName}. Audio & video channels connected.`,
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
          // Try audio-only if video fails (e.g. no webcam plugged in)
          navigator.mediaDevices?.getUserMedia({ audio: true })
            .then(audioOnlyStream => {
              stream = audioOnlyStream;
              setLocalStream(audioOnlyStream);
              setCameraError("Audio only active (Webcam not detected).");
            })
            .catch(() => {
              setCameraError("Camera & Mic in simulated mode (Permissions not granted).");
            });
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [open]);

  // Real-time audio analyzer using Web Audio API
  useEffect(() => {
    if (!localStream || !micOn) {
      setAudioLevel(0);
      setIsSpeaking(false);
      return;
    }

    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let animationId: number;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.5;

        const audioTracks = localStream.getAudioTracks();
        if (audioTracks.length > 0 && audioTracks[0].enabled) {
          source = audioCtx.createMediaStreamSource(localStream);
          source.connect(analyser);
          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          const checkAudio = () => {
            if (!analyser) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            const normalized = Math.min(100, Math.round((avg / 128) * 100));
            setAudioLevel(normalized);
            setIsSpeaking(normalized > 10);
            animationId = requestAnimationFrame(checkAudio);
          };
          checkAudio();
        }
      }
    } catch (e) {
      console.warn("Web Audio analyzer warning:", e);
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (source) source.disconnect();
      if (audioCtx && audioCtx.state !== "closed") {
        audioCtx.close().catch(() => {});
      }
    };
  }, [localStream, micOn]);

  // Real-time cross-tab sync via BroadcastChannel
  useEffect(() => {
    if (!open) return;
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(`impacto_call_${channelName || "general"}`);
      channel.onmessage = (event) => {
        const { type, data } = event.data || {};
        if (type === "NEW_CHAT_MESSAGE" && data) {
          setCallMessages(prev => {
            if (prev.some(m => m.id === data.id)) return prev;
            return [...prev, data];
          });
        } else if (type === "NEW_AGENDA" && data) {
          setAgendaPoints(prev => {
            if (prev.some(p => p.id === data.id)) return prev;
            return [...prev, data];
          });
        }
      };
    } catch (e) {}

    return () => {
      channel?.close();
    };
  }, [open, channelName]);

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
    if (nextState) {
      playMeetingChime("unmute");
    } else {
      playMeetingChime("mute");
    }

    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = nextState;
      });
    }
    addToast(nextState ? "Microphone active" : "Microphone muted", "info");
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

    if (nextState && (!localStream || localStream.getVideoTracks().length === 0)) {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: micOn });
        setLocalStream(s);
        setCameraError(null);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = s;
        }
      } catch (e: any) {
        setCameraError("Camera unavailable. Using profile avatar.");
      }
    }

    addToast(nextState ? "Camera video active" : "Camera turned off", "info");
  };

  // Toggle Screen Share
  const handleToggleScreenShare = async () => {
    if (screenSharing) {
      setScreenSharing(false);
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: micOn });
        setLocalStream(s);
      } catch (e) {}
      addToast("Screen sharing stopped", "info");
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setLocalStream(screenStream);
        setScreenSharing(true);
        setVideoOn(true);
        addToast("Sharing live screen to call", "success");
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

    try {
      const channel = new BroadcastChannel(`impacto_call_${channelName || "general"}`);
      channel.postMessage({ type: "NEW_CHAT_MESSAGE", data: newMsg });
      channel.close();
    } catch (e) {}
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
    addToast("Note attached to document", "success");
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
    addToast("Meeting agenda item added", "success");

    try {
      const channel = new BroadcastChannel(`impacto_call_${channelName || "general"}`);
      channel.postMessage({ type: "NEW_AGENDA", data: newPoint });
      channel.close();
    } catch (e) {}
  };

  const handleToggleAgendaStatus = (id: string) => {
    setAgendaPoints(prev =>
      prev.map(p => {
        if (p.id === id) {
          const next = p.status === "open" ? ("completed" as const) : ("open" as const);
          return { ...p, status: next };
        }
        return p;
      })
    );
  };

  const handleSelectDoc = (doc: Document) => {
    setSharedDoc(doc);
    addToast(`Presenting ${doc.name}`, "info");
    setCallMessages(prev => [
      ...prev,
      {
        id: `msg-doc-${Date.now()}`,
        sender: "System",
        text: `Shared document switched to "${doc.name}"`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    ]);
  };

  const handleLeaveCall = () => {
    playMeetingChime("leave");
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
    }
    setLocalStream(null);
    onClose();
  };

  // Participants roster
  const activeParticipants = useMemo(() => {
    if (members && members.length > 0) {
      return members.slice(0, 8).map((m, idx) => {
        const isMe = (user?.id && m.user_id === user.id) || (user?.email && m.email === user.email) || idx === 0;
        const isThisSpeaker = isMe ? isSpeaking : idx === activeSpeakerIdx;
        return {
          id: m.id || `p-${idx}`,
          name: m.full_name || m.email?.split("@")[0] || `Member ${idx + 1}`,
          role: m.role ? m.role.charAt(0).toUpperCase() + m.role.slice(1) : "Member",
          isMe,
          speaking: isThisSpeaker,
          mic: isMe ? micOn : idx % 3 !== 2,
          video: isMe ? videoOn : true,
          avatarColor: idx % 4 === 0 ? "bg-[#156c45]" : idx % 4 === 1 ? "bg-indigo-600" : idx % 4 === 2 ? "bg-amber-600" : "bg-teal-600"
        };
      });
    }
    return [
      {
        id: "p-me",
        name: user?.full_name || "You",
        role: activeMember?.role || "Host",
        isMe: true,
        speaking: isSpeaking,
        mic: micOn,
        video: videoOn,
        avatarColor: "bg-[#156c45]"
      }
    ];
  }, [members, user, activeMember, micOn, videoOn, isSpeaking, activeSpeakerIdx]);

  const toggleSidePanel = (panel: "chat" | "docs" | "participants" | "agenda") => {
    setSidePanel(prev => (prev === panel ? null : panel));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 select-none animate-in fade-in duration-200">
      {/* Main modal container matching application card aesthetic */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl w-full h-full max-h-[96vh] max-w-7xl flex flex-col overflow-hidden shadow-2xl text-slate-900 dark:text-slate-100">
        
        {/* HEADER BAR - Styled consistent with Impacto header */}
        <div className="px-4 py-3 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/90 dark:bg-slate-950/90 shrink-0 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center text-[#156c45] dark:text-emerald-400 shrink-0 shadow-3xs">
              <Video className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                  Video Meeting
                </span>
                <span className="text-[11px] font-mono text-[#156c45] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200/80 dark:border-emerald-800/80 font-bold shrink-0">
                  #{channelName}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                  <Radio className="h-3 w-3 animate-pulse" /> LIVE WebRTC
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                <span className="truncate">{activeOrg?.name || "Cooperative Workspace"}</span>
                <span>•</span>
                <span>{activeParticipants.length} Connected</span>
                <span>•</span>
                <span className="font-mono text-[#156c45] dark:text-emerald-400 flex items-center gap-1 font-bold">
                  <Clock className="h-3 w-3" />
                  {formattedDuration}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Panel Toggle Buttons - Matching Modern Segmented Control */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shrink-0 overflow-x-auto max-w-full shadow-3xs">
            <button
              type="button"
              onClick={() => toggleSidePanel("agenda")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                sidePanel === "agenda"
                  ? "bg-white dark:bg-slate-900 text-[#156c45] dark:text-emerald-400 shadow-3xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>Agenda ({agendaPoints.length})</span>
            </button>
            <button
              type="button"
              onClick={() => toggleSidePanel("chat")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                sidePanel === "chat"
                  ? "bg-white dark:bg-slate-900 text-[#156c45] dark:text-emerald-400 shadow-3xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0" />
              <span>Chat ({callMessages.length})</span>
            </button>
            <button
              type="button"
              onClick={() => toggleSidePanel("docs")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                sidePanel === "docs"
                  ? "bg-white dark:bg-slate-900 text-[#156c45] dark:text-emerald-400 shadow-3xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
              }`}
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span>Docs ({documents?.length || 0})</span>
            </button>
            <button
              type="button"
              onClick={() => toggleSidePanel("participants")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                sidePanel === "participants"
                  ? "bg-white dark:bg-slate-900 text-[#156c45] dark:text-emerald-400 shadow-3xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
              }`}
            >
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span>People ({activeParticipants.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleLeaveCall}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition shrink-0 ml-1 cursor-pointer"
            title="Close Window"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* MAIN BODY: VIDEO STAGE + INTERACTIVE SIDE DRAWER */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 bg-slate-100/50 dark:bg-slate-950/50">
          
          {/* VIDEO STAGE */}
          <div className="flex-1 min-w-0 flex flex-col p-3 gap-3 overflow-y-auto">
            {sharedDoc && sidePanel === "docs" ? (
              /* Split View: Shared Document + Attendee Video Bar */
              <div className="flex-1 flex flex-col gap-3 min-h-0">
                <div className="flex-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl p-5 overflow-y-auto shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5 text-xs">
                    <div>
                      <span className="text-[11px] font-bold text-[#156c45] dark:text-emerald-400 uppercase tracking-wider block">
                        Live Document Review
                      </span>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mt-0.5">{sharedDoc.name}</h4>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      By {sharedDoc.uploader_name || "Lead Admin"}
                    </span>
                  </div>

                  <div className="flex-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap select-text">
                    {sharedDoc.content ? (
                      <div dangerouslySetInnerHTML={{ __html: sharedDoc.content }} />
                    ) : (
                      <div className="space-y-3 font-normal">
                        <p className="font-bold text-slate-900 dark:text-white text-sm">
                          COOPERATIVE RESOLUTION & EXECUTIVE MINUTES
                        </p>
                        <p>
                          Executive committee resolution on quarterly performance targets, agropastoral harvest allocations, and facility space schedules.
                        </p>
                        <p>
                          1. <strong>Quorum Verification:</strong> Verified by the supervisory board with live attendance recorded digitally.
                        </p>
                        <p>
                          2. <strong>Facility Usage:</strong> All cooperative community rooms maintain active schedules to prevent overlapping reservations.
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
                      className={`bg-slate-900 dark:bg-slate-950 rounded-2xl border p-2 flex items-center justify-between relative overflow-hidden shadow-xs transition-all ${
                        p.speaking
                          ? "border-[#156c45] ring-2 ring-[#156c45]/50 shadow-md shadow-emerald-500/20"
                          : "border-slate-800"
                      }`}
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
                          <div className={`h-8 w-8 rounded-xl ${p.avatarColor} flex items-center justify-center font-bold text-xs text-white shadow-3xs`}>
                            {p.name.charAt(0)}
                          </div>
                          <div className="text-xs truncate max-w-[90px]">
                            <span className="font-bold block truncate text-white">{p.name}</span>
                            <span className="text-[10px] text-slate-400 block truncate">{p.role}</span>
                          </div>
                        </div>
                      )}

                      {/* Speaking Equalizer */}
                      {p.speaking && (
                        <div className="absolute top-2 right-2 z-20 flex items-center gap-0.5 bg-black/60 px-1.5 py-0.5 rounded-md">
                          <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-2.5" />
                          <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-3.5 delay-75" />
                          <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-2 delay-150" />
                        </div>
                      )}

                      <div className="z-10 flex items-center gap-1 text-slate-400 bg-slate-950/80 p-1 rounded-lg">
                        {p.mic ? <Mic className="h-3 w-3 text-emerald-400" /> : <MicOff className="h-3 w-3 text-rose-400" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Full Multi-person Video Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 flex-1 min-h-[240px]">
                {activeParticipants.map(p => (
                  <div
                    key={p.id}
                    className={`bg-slate-900 dark:bg-slate-950 rounded-2xl border relative overflow-hidden flex flex-col items-center justify-center shadow-md group min-h-[170px] transition-all ${
                      p.speaking
                        ? "border-[#156c45] ring-2 ring-[#156c45] shadow-lg shadow-emerald-600/20"
                        : "border-slate-800"
                    }`}
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
                        <div className={`h-16 w-16 sm:h-20 sm:w-20 rounded-2xl ${p.avatarColor} flex items-center justify-center font-black text-2xl text-white shadow-md ring-4 ring-slate-800`}>
                          {p.name.charAt(0)}
                        </div>
                        <span className="text-xs font-bold text-slate-100">{p.name}</span>
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

                    {/* Participant Name Badge + Real-time Audio wave indicator */}
                    <div className="absolute bottom-3 left-3 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-800 text-white shadow-3xs">
                      <span>{p.name}</span>
                      {p.isMe && <span className="text-[10px] text-emerald-400 font-bold">(You)</span>}
                      {p.speaking && (
                        <div className="flex items-center gap-0.5 ml-1">
                          <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-2.5" />
                          <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-3.5 delay-75" />
                          <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-2 delay-150" />
                        </div>
                      )}
                    </div>

                    {/* Mic indicator */}
                    <div className="absolute bottom-3 right-3 bg-slate-950/85 backdrop-blur-md p-1.5 rounded-xl border border-slate-800">
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

          {/* RIGHT SIDE DRAWER - Styled matching application cards */}
          {sidePanel && (
            <div className="w-full md:w-80 lg:w-96 shrink-0 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col min-h-0">
              
              {/* Panel 1: Agenda & Tasks */}
              {sidePanel === "agenda" && (
                <div className="flex-1 flex flex-col h-full min-h-0">
                  <div className="p-3 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-[#156c45] dark:text-emerald-400" /> Meeting Agenda & Action Points
                    </span>
                    <button
                      type="button"
                      onClick={() => setSidePanel(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
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
                            ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200"
                            : "bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 hover:border-[#156c45] text-slate-900 dark:text-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            {pt.status === "completed" ? (
                              <CheckCircle2 className="h-4 w-4 text-[#156c45] dark:text-emerald-400 shrink-0 mt-0.5" />
                            ) : (
                              <Circle className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                            )}
                            <span className={`font-bold leading-snug break-words ${pt.status === "completed" ? "line-through text-slate-400 dark:text-slate-500" : ""}`}>
                              {pt.title}
                            </span>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                            pt.status === "completed" 
                              ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300" 
                              : "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
                          }`}>
                            {pt.status === "completed" ? "Done" : "Pending"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pl-6">
                          <span>Assignee: <strong className="text-slate-700 dark:text-slate-300">{pt.assignee}</strong></span>
                          <span>{pt.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Task Form */}
                  <form onSubmit={handleCreateAgendaPoint} className="p-3 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2 bg-slate-50/50 dark:bg-slate-950/50">
                    <input
                      type="text"
                      placeholder="Add talking point or task..."
                      value={newAgendaTitle}
                      onChange={e => setNewAgendaTitle(e.target.value)}
                      className="text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#156c45] focus:border-transparent transition"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Assignee (e.g. Treasurer)..."
                        value={newAgendaAssignee}
                        onChange={e => setNewAgendaAssignee(e.target.value)}
                        className="flex-1 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#156c45] focus:border-transparent transition"
                      />
                      <button
                        type="submit"
                        className="py-1.5 px-3 rounded-xl bg-[#156c45] hover:opacity-90 text-white text-xs font-bold transition shrink-0 cursor-pointer shadow-3xs"
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
                  <div className="p-3 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="h-4 w-4 text-[#156c45] dark:text-emerald-400" /> In-Call Realtime Chat
                    </span>
                    <button
                      type="button"
                      onClick={() => setSidePanel(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
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
                            ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200"
                            : m.sender === "System"
                            ? "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/40 text-slate-500 dark:text-slate-400 italic"
                            : m.sender === (user?.full_name || "You")
                            ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50 text-slate-900 dark:text-slate-100 self-end max-w-[85%]"
                            : "bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 self-start max-w-[85%]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          <span className="font-bold text-slate-700 dark:text-slate-300 truncate">{m.sender}</span>
                          <span>{m.time}</span>
                        </div>
                        <p className="leading-snug break-words font-medium">{m.text}</p>
                      </div>
                    ))}
                    <div ref={chatBottomRef} />
                  </div>

                  <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 dark:border-slate-800 flex gap-2 bg-slate-50/50 dark:bg-slate-950/50">
                    <input
                      type="text"
                      placeholder="Send message to meeting..."
                      value={inputMessage}
                      onChange={e => setInputMessage(e.target.value)}
                      className="flex-1 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#156c45] focus:border-transparent transition"
                    />
                    <button
                      type="submit"
                      className="p-2.5 rounded-xl bg-[#156c45] hover:opacity-90 text-white transition cursor-pointer shrink-0 shadow-3xs"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </div>
              )}

              {/* Panel 3: Shared Document Review */}
              {sidePanel === "docs" && (
                <div className="flex-1 flex flex-col h-full min-h-0">
                  <div className="p-3 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
                    <span className="flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-[#156c45] dark:text-emerald-400" /> Collaborative Document Review
                    </span>
                    <button
                      type="button"
                      onClick={() => setSidePanel(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                      title="Hide Panel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">
                      Select Organization Document:
                    </label>
                    <select
                      value={sharedDoc?.id || ""}
                      onChange={e => {
                        const doc = documents.find(d => d.id === e.target.value);
                        if (doc) handleSelectDoc(doc);
                      }}
                      className="w-full text-xs p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#156c45]"
                    >
                      {documents.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2 min-h-0 text-xs">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Meeting Notes ({docComments.length}):
                    </span>
                    {docComments.map(c => (
                      <div
                        key={c.id}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className="font-bold text-[#156c45] dark:text-emerald-400">{c.author}</span>
                          <span>{c.time}</span>
                        </div>
                        <p className="text-slate-800 dark:text-slate-200 leading-snug font-medium">{c.text}</p>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleAddDocComment} className="p-3 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2 bg-slate-50/50 dark:bg-slate-950/50">
                    <input
                      type="text"
                      placeholder="Add note on active document..."
                      value={newCommentText}
                      onChange={e => setNewCommentText(e.target.value)}
                      className="text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#156c45]"
                    />
                    <button
                      type="submit"
                      className="py-1.5 px-3 rounded-xl bg-[#156c45] hover:opacity-90 text-white text-xs font-bold transition shadow-3xs"
                    >
                      Post Note
                    </button>
                  </form>
                </div>
              )}

              {/* Panel 4: Participants */}
              {sidePanel === "participants" && (
                <div className="flex-1 flex flex-col h-full min-h-0 p-3 gap-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-[#156c45] dark:text-emerald-400" /> Active Call Roster ({activeParticipants.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setSidePanel(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                      title="Hide Panel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto flex flex-col gap-2">
                    {activeParticipants.map(p => (
                      <div
                        key={p.id}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`h-8 w-8 rounded-xl ${p.avatarColor} flex items-center justify-center font-bold text-xs text-white shadow-3xs`}>
                            {p.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold block text-slate-900 dark:text-white">{p.name} {p.isMe && "(You)"}</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{p.role}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {p.mic ? <Mic className="h-3.5 w-3.5 text-[#156c45] dark:text-emerald-400" /> : <MicOff className="h-3.5 w-3.5 text-rose-500" />}
                          {p.video ? <Video className="h-3.5 w-3.5 text-[#156c45] dark:text-emerald-400" /> : <VideoOff className="h-3.5 w-3.5 text-rose-500" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* BOTTOM CONTROLS DOCK - Consistent Theme & Audio/Video Toggles */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-950/95 flex flex-wrap items-center justify-between gap-3 shrink-0">
          
          {/* Audio Status & Security indicator */}
          <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 font-medium">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#156c45] dark:text-emerald-400" />
              <span className="hidden sm:inline">Encrypted Meeting</span>
            </div>

            {/* Live Audio Visualizer Pill */}
            {micOn ? (
              <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 px-2.5 py-1 rounded-full text-[10px] font-bold text-[#156c45] dark:text-emerald-400">
                <Volume2 className="h-3 w-3 shrink-0" />
                <span>Audio Live</span>
                <div className="flex items-center gap-0.5 ml-1">
                  <span
                    className="w-1 bg-[#156c45] dark:bg-emerald-400 rounded-full transition-all duration-75"
                    style={{ height: `${Math.max(4, Math.min(16, (audioLevel / 100) * 16))}px` }}
                  />
                  <span
                    className="w-1 bg-[#156c45] dark:bg-emerald-400 rounded-full transition-all duration-75"
                    style={{ height: `${Math.max(6, Math.min(18, ((audioLevel * 1.3) / 100) * 18))}px` }}
                  />
                  <span
                    className="w-1 bg-[#156c45] dark:bg-emerald-400 rounded-full transition-all duration-75"
                    style={{ height: `${Math.max(3, Math.min(14, ((audioLevel * 0.8) / 100) * 14))}px` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 px-2.5 py-1 rounded-full text-[10px] font-bold text-rose-600 dark:text-rose-400">
                <VolumeX className="h-3 w-3 shrink-0" />
                <span>Muted</span>
              </div>
            )}
          </div>

          {/* Central Action Buttons */}
          <div className="flex items-center gap-2.5 mx-auto sm:mx-0">
            {/* Mic Toggle */}
            <button
              type="button"
              onClick={handleToggleMic}
              className={`p-3 rounded-full transition cursor-pointer shadow-3xs flex items-center justify-center ${
                micOn
                  ? "bg-[#156c45] hover:opacity-90 text-white ring-4 ring-emerald-500/20"
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
              className={`p-3 rounded-full transition cursor-pointer shadow-3xs flex items-center justify-center ${
                videoOn
                  ? "bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white"
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
              className={`p-3 rounded-full transition cursor-pointer shadow-3xs flex items-center justify-center ${
                screenSharing
                  ? "bg-[#156c45] text-white ring-4 ring-emerald-500/20"
                  : "bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white"
              }`}
              title="Share Screen"
            >
              <Monitor className="h-5 w-5" />
            </button>

            {/* Document Review Toggle */}
            <button
              type="button"
              onClick={() => toggleSidePanel("docs")}
              className={`p-3 rounded-full transition cursor-pointer shadow-3xs flex items-center justify-center ${
                sidePanel === "docs"
                  ? "bg-[#156c45] text-white ring-4 ring-emerald-500/20"
                  : "bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white"
              }`}
              title="Review Document"
            >
              <FileText className="h-5 w-5" />
            </button>

            {/* Leave Call */}
            <button
              type="button"
              onClick={handleLeaveCall}
              className="px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-md transition cursor-pointer ml-1"
              title="End Meeting"
            >
              <PhoneOff className="h-4 w-4" />
              <span>Leave</span>
            </button>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono hidden md:block font-bold">
            Impacto Meet
          </div>
        </div>

      </div>
    </div>
  );
};
