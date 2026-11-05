import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
  Hand,
  Settings,
  MoreVertical,
  ChevronDown,
  UserX,
  Edit3,
  Trash2,
  Search
} from "lucide-react";
import { OrgMember, Document, LiveMeetHistoryRecord, HostedMeetInfo } from "../types";
import { useAuthStore } from "../store/authStore";
import { useToast } from "./Toast";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

interface ChatVideoMeetModalProps {
  open: boolean;
  onClose: () => void;
  channelName: string;
  meetingTitle?: string;
  activeOrg: any;
  activeMember?: OrgMember;
  members: OrgMember[];
  documents: Document[];
  onMeetingEnded?: (record: LiveMeetHistoryRecord) => void;
  hostedMeetInfo?: HostedMeetInfo | null;
  onHostedMeetEnded?: () => void;
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

interface PeerParticipant {
  peerId: string;
  userId: string;
  name: string;
  role: string;
  isMe: boolean;
  mic: boolean;
  video: boolean;
  speaking: boolean;
  handRaised: boolean;
  stream?: MediaStream;
}

// WebRTC ICE Servers Configuration (Google STUN)
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" }
  ]
};

// Built-in synthetic audio cues
const playMeetingChime = (type: "join" | "mute" | "unmute" | "leave" | "hand") => {
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
    } else if (type === "hand") {
      osc.frequency.setValueAtTime(659, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.07, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch (e) {
    // Non-critical audio
  }
};

export const ChatVideoMeetModal: React.FC<ChatVideoMeetModalProps> = ({
  open,
  onClose,
  channelName,
  meetingTitle,
  activeOrg,
  activeMember,
  members,
  documents,
  onMeetingEnded,
  hostedMeetInfo,
  onHostedMeetEnded
}) => {
  const { user } = useAuthStore();
  const { addToast } = useToast();

  const [meetingName, setMeetingName] = useState<string>(
    hostedMeetInfo?.meetingTitle || meetingTitle || `${channelName} Live Meeting`
  );
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  useEffect(() => {
    if (hostedMeetInfo?.meetingTitle) {
      setMeetingName(hostedMeetInfo.meetingTitle);
    } else if (meetingTitle) {
      setMeetingName(meetingTitle);
    } else if (channelName) {
      setMeetingName(`${channelName} Live Meeting`);
    }
  }, [hostedMeetInfo, meetingTitle, channelName]);

  const myPeerId = useMemo(() => {
    return user?.id || `peer-${Math.random().toString(36).substring(2, 9)}`;
  }, [user]);

  const isAdmin = useMemo(() => {
    const role = (activeMember?.role || "").toLowerCase();
    return role === "admin" || role === "owner" || role === "lead" || user?.id === activeOrg?.owner_id;
  }, [activeMember, user, activeOrg]);

  const isLeavingRef = useRef(false);

  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [sidePanel, setSidePanel] = useState<"chat" | "docs" | "participants" | "agenda" | null>(null);

  // Call duration counter
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Audio level analyzer
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Streams & WebRTC connections
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Remote participants map: key = peerId
  const [remotePeers, setRemotePeers] = useState<Record<string, PeerParticipant>>({});
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // In-call chat messages (starts clean with zero default messages)
  const [callMessages, setCallMessages] = useState<MeetMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  interface PendingAdmission {
    userId: string;
    userName: string;
    role: string;
  }
  const [pendingAdmissions, setPendingAdmissions] = useState<PendingAdmission[]>([]);

  const handleAdmitPeer = (userId: string, userName: string) => {
    setPendingAdmissions(prev => prev.filter(p => p.userId !== userId));
    try {
      broadcastChannelRef.current?.postMessage({
        type: "ADMIT_PEER",
        userId
      });
    } catch (e) {}
    addToast(`Admitted ${userName} to the meeting.`, "success");
  };

  const handleDeclinePeer = (userId: string, userName: string) => {
    setPendingAdmissions(prev => prev.filter(p => p.userId !== userId));
    try {
      broadcastChannelRef.current?.postMessage({
        type: "DECLINE_PEER",
        userId
      });
    } catch (e) {}
    addToast(`Declined admission for ${userName}.`, "info");
  };

  // Shared Document during call
  const [sharedDoc, setSharedDoc] = useState<Document | null>(null);
  const [docsUsedInMeeting, setDocsUsedInMeeting] = useState<Document[]>([]);
  const [docSearchQuery, setDocSearchQuery] = useState("");

  // Standard and organization documents available to select and present
  const availableDocs = useMemo<Document[]>(() => {
    const list: Document[] = [...(documents || [])];

    const standardGovernanceDocs: Document[] = [
      {
        id: "doc-charter-std",
        org_id: activeOrg?.id || "org-1",
        name: "Cooperative Charter & Internal Governance Bylaws.pdf",
        category: "Governance",
        requires_acknowledgement: false,
        content: `COOPERATIVE CHARTER & INTERNAL GOVERNANCE BYLAWS\n\nArticle 1: Organizational Purpose and Democratic Quorum\nThe cooperative operates under shared community authority. All statutory resolutions require verified member attendance and recorded quorum before binding effect.\n\nArticle 2: Financial Prudence & Reserve Allocations\nAt least 15% of annual operating surpluses must be directed toward the statutory contingency reserve fund. Space lending and asset sharing must be logged digitally with time-bound approvals.\n\nArticle 3: Meeting Protocols & Electronic Voting\nVirtual and hybrid meetings conducted via WebRTC comply with official audit requirements provided that the roster of present members and minutes are archived simultaneously.`,
        created_at: new Date().toISOString(),
        uploader_name: "Supervisory Board"
      },
      {
        id: "doc-harvest-std",
        org_id: activeOrg?.id || "org-1",
        name: "Quarterly Agropastoral Quota & Harvest Schedule.docx",
        category: "Operations",
        requires_acknowledgement: false,
        content: `QUARTERLY AGROPASTORAL QUOTA & HARVEST ALLOCATION\n\n1. Production Targets by Sector:\n- Sector North: 450 metric tons grain reserve\n- Sector Central: 320 metric tons cold storage harvest\n- Sector South: 180 metric tons seed multiplication\n\n2. Logistics & Facility Distribution:\nAll cooperative warehouses open 06:06 to 18:00 daily. Incoming shipments require digital receipt reconciliation prior to weight certificate issuance.\n\n3. Reserve Fund Subsidies:\nApproved fuel and transport subsidies will be disbursed following supervisory committee audit on Monday.`,
        created_at: new Date().toISOString(),
        uploader_name: "Operations Lead"
      },
      {
        id: "doc-budget-std",
        org_id: activeOrg?.id || "org-1",
        name: "Annual Reserve Fund Budget & Audit Report.pdf",
        category: "Finance",
        requires_acknowledgement: false,
        content: `ANNUAL RESERVE FUND BUDGET & EXPENDITURE REPORT\n\nExecutive Financial Summary:\nTotal Assets under Administration: 84,500,000 RWF\nStatutory Reserve Balance: 24,100,000 RWF\nEmergency Facility Maintenance Allocation: 6,800,000 RWF\n\nRecommendations for General Assembly:\n1. Reaffirm dividend retention policy of 12% for facility modernization.\n2. Authorize digital payment gateway integration for automated dues tracking.\n3. Approve external audit committee mandate for the upcoming financial cycle.`,
        created_at: new Date().toISOString(),
        uploader_name: "Treasurer"
      }
    ];

    standardGovernanceDocs.forEach(std => {
      if (!list.some(d => d.name === std.name || d.id === std.id)) {
        list.push(std);
      }
    });

    return list;
  }, [documents, activeOrg?.id]);

  // Comments on shared document
  const [docComments, setDocComments] = useState<DocComment[]>([]);
  const [newCommentText, setNewCommentText] = useState("");

  // Agenda points (starts clean with no default static dummy items)
  const [agendaPoints, setAgendaPoints] = useState<AgendaPoint[]>([]);
  const [newAgendaTitle, setNewAgendaTitle] = useState("");
  const [newAgendaAssignee, setNewAgendaAssignee] = useState("");

  // Elapsed timer
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

  const formattedDuration = useMemo(() => {
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, [elapsedSeconds]);

  // Acquire local media stream
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
          console.warn("Camera/mic permission fallback:", err);
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

  // Handle local microphone volume & active speaking detection
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
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      audioCtx = new AudioCtxClass();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.4;

      const audioTracks = localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        source = audioCtx.createMediaStreamSource(localStream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkLevel = () => {
          if (!analyser) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const normalized = Math.min(100, Math.round((avg / 128) * 100));
          setAudioLevel(normalized);
          setIsSpeaking(normalized > 18);
          animationId = requestAnimationFrame(checkLevel);
        };
        checkLevel();
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

  // Hot-swap media tracks on existing RTCPeerConnections when localStream changes
  useEffect(() => {
    if (!localStream) return;
    Object.values(peerConnectionsRef.current).forEach((pc: RTCPeerConnection) => {
      try {
        const senders = pc.getSenders();
        localStream.getTracks().forEach(track => {
          const sender = senders.find(s => s.track?.kind === track.kind);
          if (sender) {
            sender.replaceTrack(track).catch(() => {});
          } else {
            try {
              pc.addTrack(track, localStream);
            } catch (e) {}
          }
        });
      } catch (err) {}
    });
  }, [localStream]);

  // WebRTC Signaling & Real-time multi-peer presence
  useEffect(() => {
    if (!open) return;

    const effectiveChannel = (hostedMeetInfo?.channelName || channelName || "general").toLowerCase().trim();
    const channelIdentifier = `impacto_call_${activeOrg?.id || "org"}_${effectiveChannel}`;
    const broadcast = new BroadcastChannel(channelIdentifier);
    broadcastChannelRef.current = broadcast;

    const broadcastSignalingMessage = (msg: any) => {
      try {
        broadcast.postMessage(msg);
      } catch (e) {}
    };

    // Helper: Create peer connection for a remote peer
    const createPeerConnection = (targetPeerId: string, isInitiator: boolean) => {
      if (peerConnectionsRef.current[targetPeerId]) {
        return peerConnectionsRef.current[targetPeerId];
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionsRef.current[targetPeerId] = pc;

      // Add local tracks to connection
      if (localStream) {
        localStream.getTracks().forEach(track => {
          pc.addTrack(track, localStream);
        });
      }

      // Handle ICE Candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          broadcastSignalingMessage({
            type: "SIGNAL_ICE",
            fromPeerId: myPeerId,
            toPeerId: targetPeerId,
            candidate: event.candidate
          });
        }
      };

      // Handle remote incoming tracks
      pc.ontrack = (event) => {
        const remoteStream = event.streams[0] || new MediaStream([event.track]);
        setRemotePeers(prev => {
          const existing = prev[targetPeerId];
          if (!existing) return prev;
          return {
            ...prev,
            [targetPeerId]: {
              ...existing,
              stream: remoteStream,
              video: event.track.kind === "video" ? !event.track.muted : existing.video,
              mic: event.track.kind === "audio" ? !event.track.muted : existing.mic
            }
          };
        });
      };

      // If initiator, create and send Offer
      if (isInitiator) {
        pc.createOffer()
          .then(offer => pc.setLocalDescription(offer))
          .then(() => {
            broadcastSignalingMessage({
              type: "SIGNAL_OFFER",
              fromPeerId: myPeerId,
              toPeerId: targetPeerId,
              sdp: pc.localDescription
            });
          })
          .catch(err => console.warn("Error creating offer:", err));
      }

      return pc;
    };

    // Handle incoming signaling & presence messages
    broadcast.onmessage = async (event) => {
      const msg = event.data;
      if (!msg || msg.fromPeerId === myPeerId) return;

      if (msg.type === "PEER_JOINED") {
        setRemotePeers(prev => ({
          ...prev,
          [msg.fromPeerId]: {
            peerId: msg.fromPeerId,
            userId: msg.userId,
            name: msg.name,
            role: msg.role,
            isMe: false,
            mic: msg.mic ?? true,
            video: msg.video ?? true,
            speaking: false,
            handRaised: false
          }
        }));

        // Respond with current presence so newcomer knows we are here
        broadcastSignalingMessage({
          type: "PEER_PRESENCE",
          fromPeerId: myPeerId,
          toPeerId: msg.fromPeerId,
          userId: user?.id || "guest",
          name: user?.full_name || "Member",
          role: activeMember?.role || "Member",
          mic: micOn,
          video: videoOn,
          handRaised
        });

        // Initiate WebRTC handshake with newcomer
        createPeerConnection(msg.fromPeerId, true);
      } else if (msg.type === "PEER_PRESENCE" && (msg.toPeerId === myPeerId || !msg.toPeerId)) {
        setRemotePeers(prev => ({
          ...prev,
          [msg.fromPeerId]: {
            peerId: msg.fromPeerId,
            userId: msg.userId,
            name: msg.name,
            role: msg.role,
            isMe: false,
            mic: msg.mic ?? true,
            video: msg.video ?? true,
            speaking: false,
            handRaised: !!msg.handRaised
          }
        }));
        createPeerConnection(msg.fromPeerId, false);
      } else if (msg.type === "PEER_LEFT") {
        const targetId = msg.fromPeerId;
        if (peerConnectionsRef.current[targetId]) {
          peerConnectionsRef.current[targetId].close();
          delete peerConnectionsRef.current[targetId];
        }
        setRemotePeers(prev => {
          const next = { ...prev };
          delete next[targetId];
          return next;
        });
      } else if (msg.type === "PEER_STATE_UPDATE") {
        setRemotePeers(prev => {
          if (!prev[msg.fromPeerId]) return prev;
          return {
            ...prev,
            [msg.fromPeerId]: {
              ...prev[msg.fromPeerId],
              mic: msg.mic !== undefined ? msg.mic : prev[msg.fromPeerId].mic,
              video: msg.video !== undefined ? msg.video : prev[msg.fromPeerId].video,
              handRaised: msg.handRaised !== undefined ? msg.handRaised : prev[msg.fromPeerId].handRaised,
              speaking: msg.speaking !== undefined ? msg.speaking : prev[msg.fromPeerId].speaking
            }
          };
        });
        if (msg.handRaised) {
          playMeetingChime("hand");
          addToast(`${msg.name || "A participant"} raised their hand`, "info");
        }
      } else if (msg.type === "SIGNAL_OFFER" && msg.toPeerId === myPeerId) {
        const pc = createPeerConnection(msg.fromPeerId, false);
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          broadcastSignalingMessage({
            type: "SIGNAL_ANSWER",
            fromPeerId: myPeerId,
            toPeerId: msg.fromPeerId,
            sdp: pc.localDescription
          });
        } catch (err) {
          console.warn("Error handling offer:", err);
        }
      } else if (msg.type === "SIGNAL_ANSWER" && msg.toPeerId === myPeerId) {
        const pc = peerConnectionsRef.current[msg.fromPeerId];
        if (pc) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          } catch (err) {
            console.warn("Error handling answer:", err);
          }
        }
      } else if (msg.type === "SIGNAL_ICE" && msg.toPeerId === myPeerId) {
        const pc = peerConnectionsRef.current[msg.fromPeerId];
        if (pc && msg.candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
          } catch (err) {
            console.warn("Error adding ICE candidate:", err);
          }
        }
      } else if (msg.type === "NEW_CHAT_MESSAGE" && msg.data) {
        setCallMessages(prev => {
          if (prev.some(m => m.id === msg.data.id)) return prev;
          return [...prev, msg.data];
        });
      } else if (msg.type === "NEW_AGENDA" && msg.data) {
        setAgendaPoints(prev => {
          if (prev.some(p => p.id === msg.data.id)) return prev;
          return [...prev, msg.data];
        });
      } else if (msg.type === "KICK_PEER") {
        if (msg.targetPeerId === myPeerId) {
          addToast(`You were removed from this meeting by ${msg.kickedBy || "the host"}.`, "error");
          handleLeaveCall();
        } else {
          const targetId = msg.targetPeerId;
          if (peerConnectionsRef.current[targetId]) {
            try {
              peerConnectionsRef.current[targetId].close();
            } catch (e) {}
            delete peerConnectionsRef.current[targetId];
          }
          setRemotePeers(prev => {
            const next = { ...prev };
            delete next[targetId];
            return next;
          });
          addToast(`${msg.targetName || "A participant"} was removed by ${msg.kickedBy || "the administrator"}`, "info");
        }
      } else if (msg.type === "SYNC_SHARED_DOC" && msg.doc) {
        setSharedDoc(msg.doc);
        setDocsUsedInMeeting(prev => {
          if (prev.some(d => d.id === msg.doc.id)) return prev;
          return [...prev, msg.doc];
        });
        addToast(`${msg.presenterName || "Presenter"} is presenting "${msg.doc.name}" to everyone`, "info");
      } else if (msg.type === "STOP_SHARED_DOC") {
        setSharedDoc(null);
        addToast("Document presentation ended", "info");
      } else if (msg.type === "UPDATE_MEETING_TITLE" && msg.title) {
        setMeetingName(msg.title);
      } else if (msg.type === "REQUEST_ADMISSION" && isAdmin) {
        if (!pendingAdmissions.some(p => p.userId === msg.userId)) {
          setPendingAdmissions(prev => [...prev, { userId: msg.userId, userName: msg.userName, role: msg.role }]);
          addToast(`${msg.userName || "A participant"} is requesting admission to the meeting.`, "info");
        }
      }
    };

    // Announce my arrival into the call room
    broadcastSignalingMessage({
      type: "PEER_JOINED",
      fromPeerId: myPeerId,
      userId: user?.id || "guest",
      name: user?.full_name || "You",
      role: activeMember?.role || "Member",
      mic: micOn,
      video: videoOn,
      handRaised
    });

    return () => {
      // Announce exit and clean connections
      broadcastSignalingMessage({
        type: "PEER_LEFT",
        fromPeerId: myPeerId
      });
      broadcast.close();
      Object.values(peerConnectionsRef.current).forEach((pc: RTCPeerConnection) => pc.close());
      peerConnectionsRef.current = {};
    };
  }, [open, activeOrg?.id, channelName, myPeerId, user, activeMember, micOn, videoOn, handRaised]);

  // Sync state changes (mic, video, hand, speaking) to peers
  useEffect(() => {
    if (!open || !broadcastChannelRef.current) return;
    try {
      broadcastChannelRef.current.postMessage({
        type: "PEER_STATE_UPDATE",
        fromPeerId: myPeerId,
        name: user?.full_name || "You",
        mic: micOn,
        video: videoOn,
        handRaised,
        speaking: isSpeaking
      });
    } catch (e) {}
  }, [open, micOn, videoOn, handRaised, isSpeaking, myPeerId, user]);

  // Callback ref for local video element
  const handleLocalVideoRef = useCallback((el: HTMLVideoElement | null) => {
    localVideoRef.current = el;
    if (el && localStream) {
      el.srcObject = localStream;
    }
  }, [localStream]);

  // Toggle Microphone
  const handleToggleMic = () => {
    const nextState = !micOn;
    setMicOn(nextState);
    playMeetingChime(nextState ? "unmute" : "mute");
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = nextState;
      });
    }
    addToast(nextState ? "Microphone active" : "Microphone muted", "info");
  };

  // Toggle Video Camera
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

  // Toggle Raise Hand
  const handleToggleHand = () => {
    const nextState = !handRaised;
    setHandRaised(nextState);
    if (nextState) {
      playMeetingChime("hand");
      addToast("Hand raised", "info");
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
      broadcastChannelRef.current?.postMessage({
        type: "NEW_CHAT_MESSAGE",
        fromPeerId: myPeerId,
        data: newMsg
      });
    } catch (e) {}
  };

  const handleCreateAgendaPoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgendaTitle.trim()) return;

    const newPoint: AgendaPoint = {
      id: `ag-${Date.now()}`,
      title: newAgendaTitle.trim(),
      assignee: newAgendaAssignee.trim() || "Lead Officer",
      status: "open",
      author: user?.full_name || "Host",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setAgendaPoints(prev => [...prev, newPoint]);
    setNewAgendaTitle("");
    setNewAgendaAssignee("");
    addToast("New action point recorded in meeting minutes", "success");

    try {
      broadcastChannelRef.current?.postMessage({
        type: "NEW_AGENDA",
        fromPeerId: myPeerId,
        data: newPoint
      });
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
    setDocsUsedInMeeting(prev => {
      if (prev.some(d => d.id === doc.id)) return prev;
      return [...prev, doc];
    });

    try {
      broadcastChannelRef.current?.postMessage({
        type: "SYNC_SHARED_DOC",
        fromPeerId: myPeerId,
        doc: doc,
        presenterName: user?.full_name || "Presenter"
      });
    } catch (e) {}

    addToast(`Presenting ${doc.name} to everyone`, "info");
    setCallMessages(prev => [
      ...prev,
      {
        id: `msg-doc-${Date.now()}`,
        sender: "System",
        text: `Shared document set to "${doc.name}" by ${user?.full_name || "Presenter"}`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    ]);
  };

  const handleStopPresentingDoc = () => {
    setSharedDoc(null);
    try {
      broadcastChannelRef.current?.postMessage({
        type: "STOP_SHARED_DOC",
        fromPeerId: myPeerId,
        presenterName: user?.full_name || "Presenter"
      });
    } catch (e) {}
    addToast("Document presentation ended", "info");
  };

  const handleRemoveParticipant = (targetPeerId: string, targetName: string) => {
    if (!isAdmin) {
      addToast("Only meeting administrators can remove participants", "error");
      return;
    }
    const confirmed = window.confirm(`Remove ${targetName} from the meeting?`);
    if (!confirmed) return;

    try {
      broadcastChannelRef.current?.postMessage({
        type: "KICK_PEER",
        fromPeerId: myPeerId,
        targetPeerId,
        targetName,
        kickedBy: user?.full_name || "Administrator"
      });
    } catch (e) {}

    if (peerConnectionsRef.current[targetPeerId]) {
      try {
        peerConnectionsRef.current[targetPeerId].close();
      } catch (e) {}
      delete peerConnectionsRef.current[targetPeerId];
    }

    setRemotePeers(prev => {
      const next = { ...prev };
      delete next[targetPeerId];
      return next;
    });

    addToast(`${targetName} removed from the meeting`, "info");
  };

  const handleLeaveCall = () => {
    if (isLeavingRef.current) return;
    isLeavingRef.current = true;

    playMeetingChime("leave");
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
    }
    setLocalStream(null);

    // Compile meeting history record
    const duration = elapsedSeconds;
    const startedTime = new Date(Date.now() - duration * 1000).toISOString();
    const endedTime = new Date().toISOString();

    const record: LiveMeetHistoryRecord = {
      id: `meet-${Date.now()}`,
      meetingTitle: meetingName || `${channelName} Live Meeting`,
      channelName: channelName || "General",
      orgId: activeOrg?.id || "default",
      startedAt: startedTime,
      endedAt: endedTime,
      durationSeconds: duration,
      durationFormatted: formattedDuration,
      participants: allParticipants.map(p => ({
        peerId: p.peerId,
        userId: p.userId,
        name: p.name,
        role: p.role,
        isMe: p.isMe
      })),
      documentsUsed: docsUsedInMeeting.map(d => ({
        id: d.id,
        name: d.name,
        category: d.category || "General"
      })),
      notes: agendaPoints.map(a => ({
        id: a.id,
        title: a.title,
        assignee: a.assignee,
        status: a.status,
        time: a.time
      })),
      chatMessages: callMessages.map(m => ({
        id: m.id,
        sender: m.sender,
        text: m.text,
        time: m.time
      })),
      recordedBy: user?.full_name || "Admin"
    };

    try {
      const storageKey = `impacto_meeting_history_${activeOrg?.id || "default"}`;
      const existingStr = localStorage.getItem(storageKey);
      const existing: LiveMeetHistoryRecord[] = existingStr ? JSON.parse(existingStr) : [];
      const updated = [record, ...existing.filter(e => e.id !== record.id)];
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to store meeting history", e);
    }

    if (onMeetingEnded) {
      onMeetingEnded(record);
    }

    if (onHostedMeetEnded) {
      onHostedMeetEnded();
    }

    onClose();
  };

  // Compile combined participant list: ONLY Local User + Actively Connected Remote Peers
  // Static placeholder members removed so only actual attendees who clicked Join Meet are shown
  const allParticipants = useMemo(() => {
    const list: PeerParticipant[] = [
      {
        peerId: myPeerId,
        userId: user?.id || "me",
        name: user?.full_name || "You",
        role: activeMember?.role || "Host",
        isMe: true,
        mic: micOn,
        video: videoOn,
        speaking: isSpeaking,
        handRaised,
        stream: localStream || undefined
      }
    ];

    // Add active connected peers
    Object.values(remotePeers).forEach((p: PeerParticipant) => {
      list.push(p);
    });

    return list;
  }, [myPeerId, user, activeMember, micOn, videoOn, isSpeaking, handRaised, localStream, remotePeers]);

  // Compute adaptive Google Meet grid layout class
  const gridLayoutClass = useMemo(() => {
    const count = allParticipants.length;
    if (count <= 1) return "grid-cols-1 max-w-4xl mx-auto";
    if (count === 2) return "grid-cols-1 sm:grid-cols-2 max-w-5xl mx-auto";
    if (count <= 4) return "grid-cols-1 sm:grid-cols-2 max-w-5xl mx-auto";
    if (count <= 6) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
    return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
  }, [allParticipants.length]);

  const toggleSidePanel = (panel: "chat" | "docs" | "participants" | "agenda") => {
    setSidePanel(prev => (prev === panel ? null : panel));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#121316] text-[#e3e3e3] flex flex-col overflow-hidden select-none animate-in fade-in duration-200 font-sans">
      
      {/* Dedicated audio elements for all remote peers to guarantee continuous voice communication */}
      <div className="hidden" aria-hidden="true">
        {(Object.values(remotePeers) as PeerParticipant[]).map((p: PeerParticipant) => {
          if (!p.stream || p.isMe) return null;
          return (
            <audio
              key={`remote-audio-tag-${p.peerId}`}
              autoPlay
              playsInline
              ref={el => {
                if (el && p.stream && el.srcObject !== p.stream) {
                  el.srcObject = p.stream;
                  el.play().catch(() => {});
                }
              }}
            />
          );
        })}
      </div>

      {/* GOOGLE MEET MINIMAL TOP BAR */}
      <div className="h-14 px-4 sm:px-6 flex items-center justify-between border-b border-[#2d2e31] bg-[#1a1b1e] shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#81c995] animate-pulse shrink-0" />
            {isEditingTitle ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setIsEditingTitle(false);
                  try {
                    broadcastChannelRef.current?.postMessage({
                      type: "UPDATE_MEETING_TITLE",
                      fromPeerId: myPeerId,
                      title: meetingName
                    });
                  } catch (err) {}
                }}
                className="flex items-center gap-1.5"
              >
                <input
                  type="text"
                  value={meetingName}
                  onChange={(e) => setMeetingName(e.target.value)}
                  onBlur={() => {
                    setIsEditingTitle(false);
                    try {
                      broadcastChannelRef.current?.postMessage({
                        type: "UPDATE_MEETING_TITLE",
                        fromPeerId: myPeerId,
                        title: meetingName
                      });
                    } catch (err) {}
                  }}
                  autoFocus
                  className="bg-[#282a2d] border border-[#81c995] text-white text-xs font-semibold px-2 py-1 rounded outline-none"
                />
              </form>
            ) : (
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-semibold text-sm text-[#f1f3f4] truncate">
                  {meetingName}
                </span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setIsEditingTitle(true)}
                    className="p-1 rounded hover:bg-[#282a2d] text-[#9aa0a6] hover:text-white transition"
                    title="Edit meeting title"
                  >
                    <Edit3 className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
            <span className="text-xs text-[#9aa0a6] font-mono shrink-0 hidden sm:inline">
              | #{channelName}
            </span>
          </div>
          <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#81c995] bg-[#133020] px-2.5 py-0.5 rounded-full border border-[#1e4620]">
            <Radio className="h-3 w-3 animate-pulse text-[#81c995]" />
            <span>Simultaneous WebRTC</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono text-[#9aa0a6]">
            <Clock className="h-3.5 w-3.5" />
            <span>{formattedDuration}</span>
          </div>

          <button
            type="button"
            onClick={handleLeaveCall}
            className="p-1.5 rounded-full hover:bg-[#2d2e31] text-[#9aa0a6] hover:text-white transition cursor-pointer"
            title="Leave Meeting"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* MAIN VIEWPORT: VIDEO STAGE + OPTIONAL SLIDE-OUT PANEL */}
      <div className="flex-1 flex overflow-hidden min-h-0 bg-[#121316]">
        
        {/* VIDEO GRID STAGE */}
        <div className="flex-1 flex flex-col p-3 sm:p-5 overflow-y-auto min-h-0">
          {sharedDoc ? (
            /* Split View: Shared Document + Participant filmstrip (Simultaneous for all attendees) */
            <div className="flex-1 flex flex-col gap-3 min-h-0">
              <div className="flex-1 bg-[#1e1f20] border border-[#2d2e31] rounded-2xl p-5 overflow-y-auto text-xs text-[#e3e3e3] shadow-md flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-[#2d2e31] pb-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-[#133020] text-[#81c995] border border-[#1e4620]">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-[#81c995] uppercase tracking-wider block flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#81c995] animate-ping" />
                        Simultaneously Presenting to All Participants
                      </span>
                      <h4 className="font-bold text-sm text-white mt-0.5">{sharedDoc.name}</h4>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#9aa0a6] font-mono hidden md:inline">
                      {sharedDoc.category || "General Document"}
                    </span>
                    <select
                      value={sharedDoc.id}
                      onChange={(e) => {
                        const target = availableDocs.find(d => d.id === e.target.value);
                        if (target) handleSelectDoc(target);
                      }}
                      className="bg-[#282a2d] border border-[#3c4043] text-xs text-white rounded-lg px-2 py-1 outline-none focus:border-[#81c995] cursor-pointer max-w-[150px] sm:max-w-[200px] truncate"
                      title="Select document from current documents list"
                    >
                      {availableDocs.map(d => (
                        <option key={d.id} value={d.id} className="bg-[#1e1f20] text-white">
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleStopPresentingDoc}
                      className="px-2.5 py-1 rounded-lg bg-[#282a2d] hover:bg-rose-500/20 hover:text-rose-300 text-xs font-semibold text-[#e3e3e3] border border-[#3c4043] transition cursor-pointer"
                    >
                      Stop Presenting
                    </button>
                  </div>
                </div>

                <div className="flex-1 text-xs leading-relaxed text-[#c4c7c5] whitespace-pre-wrap select-text">
                  {sharedDoc.content ? (
                    <div dangerouslySetInnerHTML={{ __html: sharedDoc.content }} />
                  ) : (
                    <div className="space-y-3 font-normal">
                      <p className="font-bold text-white text-sm">
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 h-32 shrink-0">
                {allParticipants.map(p => (
                  <div
                    key={p.peerId}
                    className={`bg-[#1e1f20] rounded-xl border relative overflow-hidden flex items-center justify-center transition-all ${
                      p.speaking
                        ? "border-[#81c995] ring-2 ring-[#81c995]/50"
                        : "border-[#2d2e31]"
                    }`}
                  >
                    {p.isMe && localStream && videoOn ? (
                      <video
                        ref={handleLocalVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover transform scale-x-[-1]"
                      />
                    ) : p.stream && p.video ? (
                      <video
                        autoPlay
                        playsInline
                        ref={el => {
                          if (el && p.stream) el.srcObject = p.stream;
                        }}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center gap-2 z-10 p-2">
                        <div className="h-9 w-9 rounded-full bg-[#282a2d] border border-[#3c4043] flex items-center justify-center font-bold text-xs text-[#e3e3e3]">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-xs truncate max-w-[90px]">
                          <span className="font-medium block truncate text-[#f1f3f4]">{p.name}</span>
                          <span className="text-[10px] text-[#9aa0a6] block truncate">{p.role}</span>
                        </div>
                      </div>
                    )}

                    <div className="absolute bottom-2 left-2 z-20 bg-[#000000]/70 px-2 py-0.5 rounded text-[10px] text-[#f1f3f4] font-medium flex items-center gap-1">
                      <span>{p.name}</span>
                      {p.isMe && <span>(You)</span>}
                    </div>

                    <div className="absolute top-2 right-2 z-20">
                      {p.mic ? (
                        <div className="p-1 rounded-full bg-[#000000]/60 text-[#81c995]">
                          <Mic className="h-3 w-3" />
                        </div>
                      ) : (
                        <div className="p-1 rounded-full bg-[#000000]/60 text-[#f28b82]">
                          <MicOff className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Google Meet Responsive 16:9 Grid View */
            <div className={`grid gap-3 sm:gap-4 flex-1 items-center justify-center w-full ${gridLayoutClass}`}>
              {allParticipants.map(p => (
                <div
                  key={p.peerId}
                  className={`bg-[#1e1f20] rounded-2xl border relative overflow-hidden flex flex-col items-center justify-center aspect-video w-full transition-all shadow-md group ${
                    p.speaking
                      ? "border-[#81c995] ring-2 ring-[#81c995]"
                      : "border-[#2d2e31]"
                  }`}
                >
                  {/* Local Video Stream */}
                  {p.isMe && videoOn && localStream ? (
                    <video
                      ref={handleLocalVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover transform scale-x-[-1]"
                    />
                  ) : p.stream && p.video ? (
                    /* Remote Peer Live Video Stream */
                    <video
                      autoPlay
                      playsInline
                      ref={el => {
                        if (el && p.stream) el.srcObject = p.stream;
                      }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    /* Avatar Fallback Tile */
                    <div className="flex flex-col items-center justify-center gap-3 p-4">
                      <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-[#282a2d] border-2 border-[#3c4043] flex items-center justify-center text-2xl sm:text-3xl font-bold text-[#e3e3e3] shadow-inner">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-center">
                        <span className="text-sm font-medium text-[#f1f3f4] block">{p.name}</span>
                        {!p.video && (
                          <span className="text-[11px] text-[#9aa0a6] flex items-center justify-center gap-1 mt-0.5">
                            <VideoOff className="h-3 w-3" /> Camera off
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Hand Raised Banner */}
                  {p.handRaised && (
                    <div className="absolute top-3 left-3 bg-[#fbbc04] text-[#202124] px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-md z-20">
                      <Hand className="h-3.5 w-3.5" />
                      <span>Hand raised</span>
                    </div>
                  )}

                  {/* Active Speaker Animated Ring & Badge */}
                  {p.speaking && (
                    <div className="absolute top-3 right-3 bg-[#000000]/70 border border-[#81c995] px-2 py-0.5 rounded-full flex items-center gap-1 text-[10px] text-[#81c995] font-semibold z-20">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#81c995] animate-ping" />
                      <span>Speaking</span>
                    </div>
                  )}

                  {/* Admin Kick Button on Participant Tile */}
                  {isAdmin && !p.isMe && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveParticipant(p.peerId, p.name);
                      }}
                      className="absolute top-3 right-3 z-30 p-1.5 rounded-lg bg-[#000000]/70 hover:bg-rose-600 text-slate-300 hover:text-white transition shadow-sm border border-[#3c4043] cursor-pointer"
                      title={`Remove ${p.name} from meeting`}
                    >
                      <UserX className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {/* Bottom Name Label */}
                  <div className="absolute bottom-3 left-3 bg-[#000000]/75 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-medium text-[#f1f3f4] flex items-center gap-2 border border-[#2d2e31] z-20">
                    <span className="truncate max-w-[140px]">{p.name}</span>
                    {p.isMe && <span className="text-[10px] text-[#81c995] font-bold">(You)</span>}
                  </div>

                  {/* Microphone Status Indicator */}
                  <div className="absolute bottom-3 right-3 bg-[#000000]/75 backdrop-blur-md p-1.5 rounded-lg border border-[#2d2e31] z-20">
                    {p.mic ? (
                      <Mic className="h-3.5 w-3.5 text-[#81c995]" />
                    ) : (
                      <MicOff className="h-3.5 w-3.5 text-[#f28b82]" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* GOOGLE MEET SIDE PANEL (Chat / People / Documents / Agenda) */}
        {sidePanel && (
          <div className="w-full sm:w-80 lg:w-96 shrink-0 border-l border-[#2d2e31] bg-[#1e1f20] flex flex-col min-h-0 text-[#e3e3e3] z-30">
            
            {/* Panel Header */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-[#2d2e31] bg-[#1a1b1e]">
              <span className="font-medium text-sm text-[#f1f3f4] flex items-center gap-2">
                {sidePanel === "chat" && <MessageSquare className="h-4 w-4 text-[#81c995]" />}
                {sidePanel === "participants" && <Users className="h-4 w-4 text-[#81c995]" />}
                {sidePanel === "docs" && <FileText className="h-4 w-4 text-[#81c995]" />}
                {sidePanel === "agenda" && <CheckCircle2 className="h-4 w-4 text-[#81c995]" />}
                <span>
                  {sidePanel === "chat" && "In-Call Messages"}
                  {sidePanel === "participants" && `People (${allParticipants.length})`}
                  {sidePanel === "docs" && "Meeting Documents"}
                  {sidePanel === "agenda" && "Agenda & Minutes"}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setSidePanel(null)}
                className="p-1 rounded-full hover:bg-[#2d2e31] text-[#9aa0a6] hover:text-white transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Panel 1: Participants List */}
            {sidePanel === "participants" && (
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                {isAdmin && pendingAdmissions.length > 0 && (
                  <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-400">
                        Waiting Room Queue ({pendingAdmissions.length})
                      </span>
                      <span className="text-[10px] text-amber-300">Approval Required</span>
                    </div>
                    {pendingAdmissions.map(p => (
                      <div key={p.userId} className="flex items-center justify-between bg-[#282a2d] p-2 rounded-lg border border-[#3c4043] text-xs">
                        <div>
                          <span className="font-bold text-white block">{p.userName}</span>
                          <span className="text-[10px] text-[#9aa0a6]">{p.role}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleAdmitPeer(p.userId, p.userName)}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition cursor-pointer"
                          >
                            Admit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeclinePeer(p.userId, p.userName)}
                            className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 font-bold text-[10px] transition cursor-pointer"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-[#9aa0a6] uppercase tracking-wider">
                    In Call ({allParticipants.length})
                  </span>
                  <span className="text-[10px] text-[#81c995] bg-[#133020] px-2 py-0.5 rounded-full border border-[#1e4620]">
                    Active Joiners Only
                  </span>
                </div>
                {allParticipants.map(p => (
                  <div
                    key={p.peerId}
                    className="p-2.5 rounded-xl bg-[#282a2d] border border-[#3c4043] flex items-center justify-between text-xs gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-[#3c4043] flex items-center justify-center font-bold text-xs text-white shrink-0">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="font-medium block text-white truncate">
                          {p.name} {p.isMe && "(You)"}
                        </span>
                        <span className="text-[10px] text-[#9aa0a6] block truncate">{p.role}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {p.handRaised && <Hand className="h-3.5 w-3.5 text-[#fbbc04]" />}
                      {p.mic ? (
                        <Mic className="h-3.5 w-3.5 text-[#81c995]" />
                      ) : (
                        <MicOff className="h-3.5 w-3.5 text-[#f28b82]" />
                      )}
                      {isAdmin && !p.isMe && (
                        <button
                          type="button"
                          onClick={() => handleRemoveParticipant(p.peerId, p.name)}
                          className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/30 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                          title={`Remove ${p.name} from meeting`}
                        >
                          <UserX className="h-3 w-3" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Panel 2: In-Call Text Chat */}
            {sidePanel === "chat" && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="p-3 bg-[#131314] text-[11px] text-[#9aa0a6] border-b border-[#2d2e31]">
                  Messages can be seen only by people in the call and are deleted when the call ends.
                </div>
                <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 min-h-0 text-xs">
                  {callMessages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#9aa0a6] my-auto">
                      <MessageSquare className="h-8 w-8 text-[#3c4043] mb-2" />
                      <p className="text-xs font-semibold">No in-call messages</p>
                      <p className="text-[11px] text-[#5f6368] mt-0.5">Send a message to everyone in this meeting.</p>
                    </div>
                  ) : (
                    callMessages.map(msg => (
                      <div key={msg.id} className="flex flex-col gap-0.5">
                        <div className="flex items-center justify-between text-[11px] text-[#9aa0a6]">
                          <span className="font-semibold text-[#81c995]">{msg.sender}</span>
                          <span>{msg.time}</span>
                        </div>
                        <p className="bg-[#282a2d] p-2.5 rounded-xl text-[#f1f3f4] break-words border border-[#3c4043]">
                          {msg.text}
                        </p>
                      </div>
                    ))
                  )}
                  <div ref={chatBottomRef} />
                </div>
                <form onSubmit={handleSendMessage} className="p-3 border-t border-[#2d2e31] flex gap-2 bg-[#1a1b1e]">
                  <input
                    type="text"
                    placeholder="Send a message to everyone..."
                    value={inputMessage}
                    onChange={e => setInputMessage(e.target.value)}
                    className="flex-1 text-xs rounded-xl bg-[#282a2d] border border-[#3c4043] px-3 py-2 text-[#f1f3f4] outline-none focus:border-[#81c995]"
                  />
                  <button
                    type="submit"
                    className="p-2 rounded-xl bg-[#81c995] hover:bg-[#68b67f] text-[#121316] transition cursor-pointer"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            )}

            {/* Panel 3: Documents Review */}
            {sidePanel === "docs" && (
              <div className="flex-1 flex flex-col min-h-0 p-4 gap-3 overflow-y-auto">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#9aa0a6] uppercase tracking-wider">
                    Select Document ({availableDocs.length})
                  </span>
                  {sharedDoc && (
                    <span className="text-[10px] text-[#81c995] bg-[#133020] px-2 py-0.5 rounded-full border border-[#1e4620]">
                      1 Active
                    </span>
                  )}
                </div>

                {/* Search input for current documents */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9aa0a6]" />
                  <input
                    type="text"
                    placeholder="Filter documents..."
                    value={docSearchQuery}
                    onChange={e => setDocSearchQuery(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl bg-[#282a2d] border border-[#3c4043] text-white placeholder-[#9aa0a6] outline-none focus:border-[#81c995]"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  {availableDocs
                    .filter(d => {
                      if (!docSearchQuery.trim()) return true;
                      const q = docSearchQuery.toLowerCase();
                      return d.name.toLowerCase().includes(q) || (d.category && d.category.toLowerCase().includes(q));
                    })
                    .map(d => {
                      const isCurrentlyActive = sharedDoc?.id === d.id;
                      return (
                        <div
                          key={d.id}
                          className={`p-3 rounded-xl border text-left text-xs transition flex flex-col gap-2 ${
                            isCurrentlyActive
                              ? "bg-[#133020] border-[#81c995] text-white"
                              : "bg-[#282a2d] border-[#3c4043] hover:border-[#81c995]/70 text-[#e3e3e3]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <span className="font-semibold block truncate text-white">{d.name}</span>
                              <span className="text-[10px] text-[#9aa0a6] block mt-0.5">{d.category || "General Document"}</span>
                            </div>
                            {isCurrentlyActive && (
                              <span className="text-[10px] bg-[#81c995] text-[#121316] font-bold px-2 py-0.5 rounded-full shrink-0">
                                Presenting
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-[#3c4043]/60">
                            <span className="text-[10px] text-[#9aa0a6]">
                              By {d.uploader_name || "Admin"}
                            </span>
                            {isCurrentlyActive ? (
                              <button
                                type="button"
                                onClick={handleStopPresentingDoc}
                                className="px-2.5 py-1 rounded-lg bg-[#282a2d] hover:bg-rose-500/30 text-rose-300 text-[11px] font-semibold transition cursor-pointer"
                              >
                                Stop Presenting
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSelectDoc(d)}
                                className="px-2.5 py-1 rounded-lg bg-[#81c995] hover:bg-[#68b67f] text-[#121316] text-[11px] font-bold transition cursor-pointer"
                              >
                                Present to All
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Panel 4: Agenda & Minutes */}
            {sidePanel === "agenda" && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-2.5 min-h-0 text-xs">
                  {agendaPoints.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#9aa0a6] my-auto">
                      <CheckCircle2 className="h-8 w-8 text-[#3c4043] mb-2" />
                      <p className="text-xs font-semibold">No agenda points</p>
                      <p className="text-[11px] text-[#5f6368] mt-0.5">Add talking points or action items below.</p>
                    </div>
                  ) : (
                    agendaPoints.map(pt => (
                      <div
                        key={pt.id}
                        onClick={() => handleToggleAgendaStatus(pt.id)}
                        className={`p-3 rounded-xl border text-xs flex flex-col gap-1.5 cursor-pointer transition ${
                          pt.status === "completed"
                            ? "bg-[#133020] border-[#81c995] text-[#e3e3e3]"
                            : "bg-[#282a2d] border-[#3c4043] text-[#f1f3f4]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 min-w-0">
                            {pt.status === "completed" ? (
                              <CheckCircle2 className="h-4 w-4 text-[#81c995] shrink-0 mt-0.5" />
                            ) : (
                              <Circle className="h-4 w-4 text-[#9aa0a6] shrink-0 mt-0.5" />
                            )}
                            <span className={`font-medium break-words ${pt.status === "completed" ? "line-through text-[#9aa0a6]" : ""}`}>
                              {pt.title}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAgendaPoints(prev => prev.filter(p => p.id !== pt.id));
                            }}
                            className="text-[#9aa0a6] hover:text-rose-400 p-0.5 rounded transition cursor-pointer"
                            title="Remove agenda point"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-[#9aa0a6] pl-6">
                          <span>Assignee: {pt.assignee}</span>
                          <span>{pt.time}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleCreateAgendaPoint} className="p-3 border-t border-[#2d2e31] flex flex-col gap-2 bg-[#1a1b1e]">
                  <input
                    type="text"
                    placeholder="Add talking point or task..."
                    value={newAgendaTitle}
                    onChange={e => setNewAgendaTitle(e.target.value)}
                    className="text-xs rounded-xl bg-[#282a2d] border border-[#3c4043] px-3 py-2 text-[#f1f3f4] outline-none focus:border-[#81c995]"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Assignee (e.g. Treasurer)..."
                      value={newAgendaAssignee}
                      onChange={e => setNewAgendaAssignee(e.target.value)}
                      className="flex-1 text-xs rounded-xl bg-[#282a2d] border border-[#3c4043] px-3 py-2 text-[#f1f3f4] outline-none focus:border-[#81c995]"
                    />
                    <button
                      type="submit"
                      className="py-1.5 px-3 rounded-xl bg-[#81c995] hover:bg-[#68b67f] text-[#121316] text-xs font-bold transition cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>
        )}

      </div>

      {/* GOOGLE MEET FLOATING BOTTOM CONTROLS DOCK */}
      <div className="h-20 px-4 sm:px-8 border-t border-[#2d2e31] bg-[#1a1b1e] flex items-center justify-between gap-4 shrink-0">
        
        {/* Left Side: Meeting details & Audio Wave Indicator */}
        <div className="hidden sm:flex items-center gap-3 min-w-[200px]">
          <span className="text-xs font-medium text-[#f1f3f4]">
            #{channelName}
          </span>
          {micOn ? (
            <div className="flex items-center gap-1 bg-[#133020] border border-[#1e4620] px-2 py-0.5 rounded-full text-[10px] text-[#81c995]">
              <Volume2 className="h-3 w-3" />
              <span>Mic on</span>
              <div className="flex items-center gap-0.5 ml-1">
                <span
                  className="w-1 bg-[#81c995] rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(4, Math.min(14, (audioLevel / 100) * 14))}px` }}
                />
                <span
                  className="w-1 bg-[#81c995] rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(6, Math.min(16, ((audioLevel * 1.3) / 100) * 16))}px` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-[#371e1d] border border-[#522927] px-2 py-0.5 rounded-full text-[10px] text-[#f28b82]">
              <VolumeX className="h-3 w-3" />
              <span>Mic muted</span>
            </div>
          )}
        </div>

        {/* Center: Google Meet Circular Control Buttons */}
        <div className="flex items-center gap-3 mx-auto">
          {/* Microphone Toggle */}
          <button
            type="button"
            onClick={handleToggleMic}
            className={`h-11 w-11 rounded-full flex items-center justify-center transition cursor-pointer ${
              micOn
                ? "bg-[#3c4043] hover:bg-[#474a4d] text-white"
                : "bg-[#ea4335] hover:bg-[#d93025] text-white"
            }`}
            title={micOn ? "Turn off microphone" : "Turn on microphone"}
          >
            {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </button>

          {/* Camera Toggle */}
          <button
            type="button"
            onClick={handleToggleVideo}
            className={`h-11 w-11 rounded-full flex items-center justify-center transition cursor-pointer ${
              videoOn
                ? "bg-[#3c4043] hover:bg-[#474a4d] text-white"
                : "bg-[#ea4335] hover:bg-[#d93025] text-white"
            }`}
            title={videoOn ? "Turn off camera" : "Turn on camera"}
          >
            {videoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </button>

          {/* Screen Share */}
          <button
            type="button"
            onClick={handleToggleScreenShare}
            className={`h-11 w-11 rounded-full flex items-center justify-center transition cursor-pointer ${
              screenSharing
                ? "bg-[#81c995] text-[#121316]"
                : "bg-[#3c4043] hover:bg-[#474a4d] text-white"
            }`}
            title={screenSharing ? "Stop presenting" : "Present now"}
          >
            <Monitor className="h-5 w-5" />
          </button>

          {/* Raise Hand */}
          <button
            type="button"
            onClick={handleToggleHand}
            className={`h-11 w-11 rounded-full flex items-center justify-center transition cursor-pointer ${
              handRaised
                ? "bg-[#fbbc04] text-[#202124]"
                : "bg-[#3c4043] hover:bg-[#474a4d] text-white"
            }`}
            title={handRaised ? "Lower hand" : "Raise hand"}
          >
            <Hand className="h-5 w-5" />
          </button>

          {/* Leave Call (Google Meet Red Capsule) */}
          <button
            type="button"
            onClick={handleLeaveCall}
            className="h-11 px-6 rounded-full bg-[#ea4335] hover:bg-[#d93025] text-white font-medium text-xs flex items-center gap-2 transition cursor-pointer shadow-md"
            title="Leave call"
          >
            <PhoneOff className="h-5 w-5" />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>

        {/* Right Side: Google Meet Panels Dock */}
        <div className="flex items-center gap-2 min-w-[200px] justify-end">
          {/* People / Participants */}
          <button
            type="button"
            onClick={() => toggleSidePanel("participants")}
            className={`p-2.5 rounded-full transition cursor-pointer ${
              sidePanel === "participants"
                ? "bg-[#81c995] text-[#121316]"
                : "hover:bg-[#2d2e31] text-[#9aa0a6] hover:text-white"
            }`}
            title="People"
          >
            <Users className="h-5 w-5" />
          </button>

          {/* In-Call Chat */}
          <button
            type="button"
            onClick={() => toggleSidePanel("chat")}
            className={`p-2.5 rounded-full transition cursor-pointer ${
              sidePanel === "chat"
                ? "bg-[#81c995] text-[#121316]"
                : "hover:bg-[#2d2e31] text-[#9aa0a6] hover:text-white"
            }`}
            title="Chat with everyone"
          >
            <MessageSquare className="h-5 w-5" />
          </button>

          {/* Meeting Documents */}
          <button
            type="button"
            onClick={() => toggleSidePanel("docs")}
            className={`p-2.5 rounded-full transition cursor-pointer ${
              sidePanel === "docs"
                ? "bg-[#81c995] text-[#121316]"
                : "hover:bg-[#2d2e31] text-[#9aa0a6] hover:text-white"
            }`}
            title="Meeting Documents"
          >
            <FileText className="h-5 w-5" />
          </button>

          {/* Agenda & Tasks */}
          <button
            type="button"
            onClick={() => toggleSidePanel("agenda")}
            className={`p-2.5 rounded-full transition cursor-pointer ${
              sidePanel === "agenda"
                ? "bg-[#81c995] text-[#121316]"
                : "hover:bg-[#2d2e31] text-[#9aa0a6] hover:text-white"
            }`}
            title="Agenda & Action Items"
          >
            <CheckCircle2 className="h-5 w-5" />
          </button>
        </div>

      </div>

    </div>
  );
};
