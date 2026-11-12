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
  Search,
  Download,
  Table,
  BookOpen,
  Copy,
  Eye,
  Minus
} from "lucide-react";
import { OrgMember, Document, LiveMeetHistoryRecord, HostedMeetInfo } from "../types";
import { useAuthStore } from "../store/authStore";
import { useToast } from "./Toast";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { MockDB } from "../lib/mockData";

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
  guestUser?: { id: string; full_name: string; role: string } | null;
  initialMic?: boolean;
  initialVideo?: boolean;
  initialScreenShare?: boolean;
  initialScreenStream?: MediaStream | null;
  initialLocalStream?: MediaStream | null;
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
  deafened?: boolean;
  stream?: MediaStream;
}

// WebRTC ICE Servers Configuration (Multi-region STUN + Public TURN fallback)
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
    { urls: "stun:global.stun.twilio.com:3478" },
    {
      urls: [
        "turn:openrelay.metered.ca:80",
        "turn:openrelay.metered.ca:443",
        "turn:openrelay.metered.ca:443?transport=tcp"
      ],
      username: "openrelayproject",
      credential: "openrelayproject"
    }
  ],
  iceCandidatePoolSize: 10
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
  onHostedMeetEnded,
  guestUser,
  initialMic,
  initialVideo,
  initialScreenShare,
  initialScreenStream,
  initialLocalStream
}) => {
  const { user } = useAuthStore();
  const { addToast } = useToast();

  const effectiveUser = useMemo(() => {
    if (user) return user;
    if (guestUser) {
      return {
        id: guestUser.id,
        full_name: guestUser.full_name,
        email: `${guestUser.id}@guest.local`,
        role: guestUser.role
      } as any;
    }
    return null;
  }, [user, guestUser]);

  const [meetingName, setMeetingName] = useState<string>(
    hostedMeetInfo?.meetingTitle || meetingTitle || `${channelName} Live Meeting`
  );
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (hostedMeetInfo?.meetingTitle) {
      setMeetingName(hostedMeetInfo.meetingTitle);
    } else if (meetingTitle) {
      setMeetingName(meetingTitle);
    } else if (channelName) {
      setMeetingName(`${channelName} Live Meeting`);
    }
  }, [hostedMeetInfo, meetingTitle, channelName]);

  // Instance-unique peer ID ensuring multiple devices of the same user never collide
  const myPeerId = useMemo(() => {
    const userTag = effectiveUser?.id ? effectiveUser.id.substring(0, 8) : "peer";
    return `${userTag}_${Math.random().toString(36).substring(2, 9)}`;
  }, [effectiveUser]);

  const isAdmin = useMemo(() => {
    const role = (activeMember?.role || guestUser?.role || "").toLowerCase();
    return role === "admin" || role === "owner" || role === "lead" || effectiveUser?.id === activeOrg?.owner_id;
  }, [activeMember, guestUser, effectiveUser, activeOrg]);

  const isLeavingRef = useRef(false);

  const [micOn, setMicOn] = useState(initialMic !== undefined ? initialMic : false);
  const [videoOn, setVideoOn] = useState(initialVideo !== undefined ? initialVideo : false);
  const [screenSharing, setScreenSharing] = useState(initialScreenShare || false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [sidePanel, setSidePanel] = useState<"chat" | "docs" | "participants" | "agenda" | null>(null);

  // Call duration counter
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Audio level analyzer
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Streams & WebRTC connections
  const [localStream, setLocalStream] = useState<MediaStream | null>(initialScreenStream || initialLocalStream || null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  // Connection status indicator state: "connecting" | "connected" | "disconnected"
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connected");

  // Remote participants map: key = peerId
  const [remotePeers, setRemotePeers] = useState<Record<string, PeerParticipant>>({});
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  const pendingIceCandidatesRef = useRef<Record<string, RTCIceCandidateInit[]>>({});
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Room identifier: uniquely groups participants by meeting code (e.g. "meet_9d588v")
  const roomIdentifier = useMemo(() => {
    if (hostedMeetInfo?.meetingCode) {
      return `meet_${hostedMeetInfo.meetingCode.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    }
    if (hostedMeetInfo?.meetingId) {
      return `meet_${hostedMeetInfo.meetingId.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    }
    return hostedMeetInfo?.orgId || activeOrg?.id || "default";
  }, [hostedMeetInfo?.meetingCode, hostedMeetInfo?.meetingId, hostedMeetInfo?.orgId, activeOrg?.id]);

  // Unified broadcast function across BroadcastChannel, WebSocket, and HTTP fallback
  const broadcastSignalingMessage = useCallback((msg: any) => {
    try {
      broadcastChannelRef.current?.postMessage(msg);
    } catch (e) {}
    let sentWs = false;
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(msg));
        sentWs = true;
      }
    } catch (e) {}
    if (!sentWs && (msg.type?.startsWith("SIGNAL_") || msg.type === "PEER_JOINED" || msg.type === "PEER_LEFT")) {
      fetch("/api/meet/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: roomIdentifier, message: msg })
      }).catch(() => {});
    }
  }, [roomIdentifier]);

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
    broadcastSignalingMessage({
      type: "ADMIT_PEER",
      userId
    });
    addToast(`Admitted ${userName} to the meeting.`, "success");
  };

  const handleDeclinePeer = (userId: string, userName: string) => {
    setPendingAdmissions(prev => prev.filter(p => p.userId !== userId));
    broadcastSignalingMessage({
      type: "DECLINE_PEER",
      userId
    });
    addToast(`Declined admission for ${userName}.`, "info");
  };

  // Shared Document during call
  const [sharedDoc, setSharedDoc] = useState<Document | null>(null);
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  const activeDisplayDoc = sharedDoc || viewingDoc;
  const [docsUsedInMeeting, setDocsUsedInMeeting] = useState<Document[]>([]);
  const [docSearchQuery, setDocSearchQuery] = useState("");

  // Restore persisted in-call chat messages
  useEffect(() => {
    if (!open) return;
    try {
      const stored = localStorage.getItem(`impacto_meet_chat_${activeOrg?.id || "default"}`);
      if (stored) {
        setCallMessages(JSON.parse(stored));
      } else {
        setCallMessages([]);
      }
    } catch (e) {
      setCallMessages([]);
    }
  }, [open, activeOrg?.id]);

  // Organization documents stored for this organization (no static mock documents)
  const availableDocs = useMemo<Document[]>(() => {
    const list: Document[] = (documents || []).filter(d => !d.org_id || d.org_id === activeOrg?.id);
    if (list.length === 0 && activeOrg?.id) {
      const stored = MockDB.getDocuments().filter((d: any) => d.org_id === activeOrg.id) as Document[];
      return stored;
    }
    return list;
  }, [documents, activeOrg?.id]);

  // Comments on shared document
  const [docComments, setDocComments] = useState<DocComment[]>([]);
  const [newCommentText, setNewCommentText] = useState("");

  // Agenda points (starts clean with no default static dummy items)
  const [agendaPoints, setAgendaPoints] = useState<AgendaPoint[]>([]);
  const [newAgendaTitle, setNewAgendaTitle] = useState("");
  const [newAgendaAssignee, setNewAgendaAssignee] = useState("");

  // Elapsed timer on join (camera and microphone default OFF)
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

  // Clean up any hardware tracks on leave/unmount
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [localStream]);

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

  const micOnRef = useRef(micOn);
  micOnRef.current = micOn;
  const videoOnRef = useRef(videoOn);
  videoOnRef.current = videoOn;
  const handRaisedRef = useRef(handRaised);
  handRaisedRef.current = handRaised;
  const callMessagesRef = useRef(callMessages);
  callMessagesRef.current = callMessages;
  const sharedDocRef = useRef(sharedDoc);
  sharedDocRef.current = sharedDoc;

  // WebRTC Signaling & Real-time multi-peer presence
  useEffect(() => {
    if (!open) return;

    // Use roomIdentifier to ensure all clients with the same code or meeting join the exact same signaling channel
    const channelIdentifier = `impacto_call_room_${roomIdentifier}`;
    const broadcast = new BroadcastChannel(channelIdentifier);
    broadcastChannelRef.current = broadcast;

    // Drain queued ICE candidates once remoteDescription is set
    const drainQueuedCandidates = (peerId: string, pc: RTCPeerConnection) => {
      const queued = pendingIceCandidatesRef.current[peerId] || [];
      if (queued.length > 0) {
        queued.forEach(candidate => {
          try {
            pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
          } catch (e) {}
        });
        pendingIceCandidatesRef.current[peerId] = [];
      }
    };

    // Helper: Create peer connection for a remote peer
    const createPeerConnection = (targetPeerId: string, isInitiator: boolean) => {
      if (peerConnectionsRef.current[targetPeerId]) {
        return peerConnectionsRef.current[targetPeerId];
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionsRef.current[targetPeerId] = pc;

      // Track WebRTC peer connection states
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setConnectionStatus("connected");
        } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          // If no other peer is connected, set status
          const anyConnected = Object.values(peerConnectionsRef.current).some(
            (c) => (c as RTCPeerConnection).connectionState === "connected"
          );
          if (!anyConnected) {
            setConnectionStatus("disconnected");
          }
        }
      };

      // Automatic ICE restart if connection fails across mobile/NAT networks
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          setConnectionStatus("connected");
        } else if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
          try {
            (pc as any).restartIce?.();
          } catch (e) {}
        }
      };

      // Add local tracks to connection, or add transceivers if mic/camera are OFF
      if (localStream && localStream.getTracks().length > 0) {
        localStream.getTracks().forEach(track => {
          pc.addTrack(track, localStream);
        });
      } else {
        try {
          pc.addTransceiver("audio", { direction: "sendrecv" });
          pc.addTransceiver("video", { direction: "sendrecv" });
        } catch (e) {}
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

      // If initiator, create and send Offer with ICE gathering validation & retry fallback
      if (isInitiator) {
        const attemptOffer = async (retryCount = 0) => {
          try {
            if (pc.signalingState === "closed") return;
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            // Wait for ICE candidate gathering or timeout after 1.5s
            await new Promise<void>((resolve) => {
              if (pc.iceGatheringState === "complete") {
                resolve();
                return;
              }
              const checkState = () => {
                if (pc.iceGatheringState === "complete" || pc.iceGatheringState === "gathering") {
                  pc.removeEventListener("icegatheringstatechange", checkState);
                  resolve();
                }
              };
              pc.addEventListener("icegatheringstatechange", checkState);
              setTimeout(resolve, 1500);
            });

            broadcastSignalingMessage({
              type: "SIGNAL_OFFER",
              fromPeerId: myPeerId,
              toPeerId: targetPeerId,
              sdp: pc.localDescription
            });
          } catch (err) {
            console.warn(`[WebRTC] Offer generation attempt ${retryCount + 1} failed:`, err);
            if (retryCount < 2 && pc.signalingState !== "closed") {
              setTimeout(() => attemptOffer(retryCount + 1), 800 * (retryCount + 1));
            }
          }
        };
        attemptOffer();
      }

      return pc;
    };

    // Shared handler for incoming signaling & presence messages
    const handleIncomingSignaling = async (msg: any) => {
      if (!msg || msg.fromPeerId === myPeerId) return;

      if (msg.type === "ROOM_SNAPSHOT") {
        if (Array.isArray(msg.peers)) {
          msg.peers.forEach((peer: any) => {
            if (peer.peerId !== myPeerId) {
              setRemotePeers(prev => ({
                ...prev,
                [peer.peerId]: {
                  peerId: peer.peerId,
                  userId: peer.userId,
                  name: peer.name,
                  role: peer.role,
                  isMe: false,
                  mic: peer.mic ?? false,
                  video: peer.video ?? false,
                  speaking: peer.speaking ?? false,
                  handRaised: !!peer.handRaised
                }
              }));
              // Deterministic initiator: only peer with lexicographically greater peerId initiates offer
              const shouldInitiate = myPeerId > peer.peerId;
              createPeerConnection(peer.peerId, shouldInitiate);
            }
          });
        }
        if (Array.isArray(msg.chatMessages) && msg.chatMessages.length > 0) {
          setCallMessages(prev => {
            const merged = [...prev];
            msg.chatMessages.forEach((m: MeetMessage) => {
              if (!merged.some(e => e.id === m.id)) {
                merged.push(m);
              }
            });
            return merged;
          });
        }
        if (msg.sharedDoc) {
          setSharedDoc(msg.sharedDoc);
          setDocsUsedInMeeting(prev => {
            if (prev.some(d => d.id === msg.sharedDoc.id)) return prev;
            return [...prev, msg.sharedDoc];
          });
        }
        if (Array.isArray(msg.agendaPoints) && msg.agendaPoints.length > 0) {
          setAgendaPoints(prev => {
            const merged = [...prev];
            msg.agendaPoints.forEach((p: AgendaPoint) => {
              if (!merged.some(e => e.id === p.id)) {
                merged.push(p);
              }
            });
            return merged;
          });
        }
        return;
      }

      if (msg.type === "PEER_JOINED") {
        setRemotePeers(prev => ({
          ...prev,
          [msg.fromPeerId]: {
            peerId: msg.fromPeerId,
            userId: msg.userId,
            name: msg.name,
            role: msg.role,
            isMe: false,
            mic: msg.mic ?? false,
            video: msg.video ?? false,
            speaking: false,
            handRaised: false
          }
        }));

        // Respond with current presence so newcomer knows we are here
        broadcastSignalingMessage({
          type: "PEER_PRESENCE",
          fromPeerId: myPeerId,
          toPeerId: msg.fromPeerId,
          userId: effectiveUser?.id || "guest",
          name: effectiveUser?.full_name || "Member",
          role: activeMember?.role || guestUser?.role || "Member",
          mic: micOnRef.current,
          video: videoOnRef.current,
          handRaised: handRaisedRef.current
        });

        // Send full chat history to newcomer
        if (callMessagesRef.current.length > 0) {
          broadcastSignalingMessage({
            type: "SYNC_CHAT_HISTORY",
            fromPeerId: myPeerId,
            toPeerId: msg.fromPeerId,
            messages: callMessagesRef.current
          });
        }

        // Send active document presentation to newcomer if any
        if (sharedDocRef.current) {
          broadcastSignalingMessage({
            type: "SYNC_SHARED_DOC",
            fromPeerId: myPeerId,
            toPeerId: msg.fromPeerId,
            doc: sharedDocRef.current,
            presenterName: effectiveUser?.full_name || "Presenter"
          });
        }

        // Deterministic initiator: only peer with lexicographically greater peerId initiates offer
        const shouldInitiate = myPeerId > msg.fromPeerId;
        createPeerConnection(msg.fromPeerId, shouldInitiate);
      } else if (msg.type === "PEER_PRESENCE" && (msg.toPeerId === myPeerId || !msg.toPeerId)) {
        setRemotePeers(prev => ({
          ...prev,
          [msg.fromPeerId]: {
            peerId: msg.fromPeerId,
            userId: msg.userId,
            name: msg.name,
            role: msg.role,
            isMe: false,
            mic: msg.mic ?? false,
            video: msg.video ?? false,
            speaking: false,
            handRaised: !!msg.handRaised
          }
        }));
        const shouldInitiate = myPeerId > msg.fromPeerId;
        createPeerConnection(msg.fromPeerId, shouldInitiate);
      } else if (msg.type === "SYNC_CHAT_HISTORY" && (msg.toPeerId === myPeerId || !msg.toPeerId)) {
        if (Array.isArray(msg.messages) && msg.messages.length > 0) {
          setCallMessages(prev => {
            const merged = [...prev];
            msg.messages.forEach((m: MeetMessage) => {
              if (!merged.some(e => e.id === m.id)) {
                merged.push(m);
              }
            });
            try {
              localStorage.setItem(`impacto_meet_chat_${roomIdentifier}`, JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });
        }
      } else if (msg.type === "PEER_LEFT") {
        const targetId = msg.fromPeerId;
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
              speaking: msg.speaking !== undefined ? msg.speaking : prev[msg.fromPeerId].speaking,
              deafened: msg.deafened !== undefined ? msg.deafened : prev[msg.fromPeerId].deafened
            }
          };
        });
        if (msg.handRaised) {
          playMeetingChime("hand");
          addToast(`${msg.name || "A participant"} raised their hand`, "info");
        }
      } else if (msg.type === "REMOTE_MUTE_PEER" && msg.targetPeerId === myPeerId) {
        if (micOn) {
          setMicOn(false);
          if (localStream) {
            localStream.getAudioTracks().forEach(t => { t.enabled = false; });
          }
          playMeetingChime("mute");
          addToast("You were muted by the meeting host", "info");
        }
      } else if (msg.type === "SIGNAL_OFFER" && msg.toPeerId === myPeerId) {
        let pc = peerConnectionsRef.current[msg.fromPeerId];
        if (!pc) {
          pc = createPeerConnection(msg.fromPeerId, false);
        }
        try {
          const isCollision = pc.signalingState !== "stable";
          const isPolite = myPeerId < msg.fromPeerId;
          if (isCollision) {
            if (!isPolite) {
              console.warn("WebRTC glare collision: impolite peer ignoring offer from", msg.fromPeerId);
              return;
            }
            console.log("WebRTC glare collision: polite peer rolling back offer for", msg.fromPeerId);
            await pc.setLocalDescription({ type: "rollback" } as RTCSessionDescriptionInit);
          }
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          drainQueuedCandidates(msg.fromPeerId, pc);
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
            if (pc.signalingState === "have-local-offer") {
              await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
              drainQueuedCandidates(msg.fromPeerId, pc);
            }
          } catch (err) {
            console.warn("Error handling answer:", err);
          }
        }
      } else if (msg.type === "SIGNAL_ICE" && msg.toPeerId === myPeerId) {
        const pc = peerConnectionsRef.current[msg.fromPeerId];
        if (msg.candidate) {
          if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
            } catch (err) {
              console.warn("Error adding ICE candidate:", err);
            }
          } else {
            if (!pendingIceCandidatesRef.current[msg.fromPeerId]) {
              pendingIceCandidatesRef.current[msg.fromPeerId] = [];
            }
            pendingIceCandidatesRef.current[msg.fromPeerId].push(msg.candidate);
          }
        }
      } else if (msg.type === "NEW_CHAT_MESSAGE" && msg.data) {
        setCallMessages(prev => {
          if (prev.some(m => m.id === msg.data.id)) return prev;
          const updated = [...prev, msg.data];
          try {
            localStorage.setItem(`impacto_meet_chat_${activeOrg?.id || "default"}`, JSON.stringify(updated));
          } catch (e) {}
          return updated;
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

    broadcast.onmessage = (event) => {
      handleIncomingSignaling(event.data);
    };

    // WebSocket connection for real cross-device network communication
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const cleanMeetCode = hostedMeetInfo?.meetingCode?.toLowerCase().replace(/[^a-z0-9]/g, "") || "";
    const wsUrl = `${protocol}//${window.location.host}/ws/meet?roomId=${encodeURIComponent(
      roomIdentifier
    )}&orgId=${encodeURIComponent(hostedMeetInfo?.orgId || activeOrg?.id || "default")}&meetingCode=${encodeURIComponent(
      cleanMeetCode
    )}&peerId=${encodeURIComponent(myPeerId)}&userId=${encodeURIComponent(
      effectiveUser?.id || "guest"
    )}&name=${encodeURIComponent(effectiveUser?.full_name || "Member")}&role=${encodeURIComponent(
      activeMember?.role || guestUser?.role || "Member"
    )}`;

    let isUnmounted = false;
    let reconnectTimeout: any = null;

    const connectNetworkSocket = () => {
      if (isUnmounted) return;
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setConnectionStatus("connected");
          broadcastSignalingMessage({
            type: "PEER_JOINED",
            fromPeerId: myPeerId,
            userId: effectiveUser?.id || "guest",
            name: effectiveUser?.full_name || "You",
            role: activeMember?.role || guestUser?.role || "Member",
            mic: micOnRef.current,
            video: videoOnRef.current,
            handRaised: handRaisedRef.current
          });
        };

        ws.onmessage = async (event) => {
          try {
            const msg = JSON.parse(event.data);
            await handleIncomingSignaling(msg);
          } catch (e) {}
        };

        ws.onclose = () => {
          wsRef.current = null;
          setConnectionStatus("disconnected");
          if (!isUnmounted) {
            reconnectTimeout = setTimeout(connectNetworkSocket, 2000);
          }
        };

        ws.onerror = () => {
          setConnectionStatus("disconnected");
          try {
            ws.close();
          } catch (e) {}
        };
      } catch (e) {
        if (!isUnmounted) {
          reconnectTimeout = setTimeout(connectNetworkSocket, 2000);
        }
      }
    };

    connectNetworkSocket();

    // Announce arrival across broadcast channel
    broadcastSignalingMessage({
      type: "PEER_JOINED",
      fromPeerId: myPeerId,
      userId: effectiveUser?.id || "guest",
      name: effectiveUser?.full_name || "You",
      role: activeMember?.role || guestUser?.role || "Member",
      mic: micOnRef.current,
      video: videoOnRef.current,
      handRaised: handRaisedRef.current
    });

    return () => {
      isUnmounted = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      broadcastSignalingMessage({
        type: "PEER_LEFT",
        fromPeerId: myPeerId
      });
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch (e) {}
        wsRef.current = null;
      }
      broadcast.close();
      Object.values(peerConnectionsRef.current).forEach((pc: RTCPeerConnection) => {
        try {
          pc.close();
        } catch (e) {}
      });
      peerConnectionsRef.current = {};
    };
  }, [open, roomIdentifier, myPeerId, effectiveUser, activeMember, guestUser, isAdmin, broadcastSignalingMessage, hostedMeetInfo]);

  // Sync state changes (mic, video, hand, speaking, deafened) to peers
  useEffect(() => {
    if (!open) return;
    broadcastSignalingMessage({
      type: "PEER_STATE_UPDATE",
      fromPeerId: myPeerId,
      name: effectiveUser?.full_name || "You",
      mic: micOn,
      video: videoOn,
      handRaised,
      speaking: isSpeaking,
      deafened: isDeafened
    });
  }, [open, micOn, videoOn, handRaised, isSpeaking, isDeafened, myPeerId, effectiveUser, broadcastSignalingMessage]);

  // Callback ref for local video element
  const handleLocalVideoRef = useCallback((el: HTMLVideoElement | null) => {
    localVideoRef.current = el;
    if (el && localStream) {
      el.srcObject = localStream;
    }
  }, [localStream]);

  // Toggle Microphone
  const handleToggleMic = async () => {
    if (micOn) {
      setMicOn(false);
      playMeetingChime("mute");
      if (localStream) {
        localStream.getAudioTracks().forEach(track => {
          track.enabled = false;
        });
      }
      addToast("Microphone muted", "info");
    } else {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          addToast("Your browser does not support microphone access.", "error");
          return;
        }
        let stream = localStream;
        const existingAudio = stream?.getAudioTracks() || [];
        if (existingAudio.length > 0) {
          existingAudio.forEach(t => {
            t.enabled = true;
          });
        } else {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const newAudioTrack = audioStream.getAudioTracks()[0];
          if (stream) {
            stream.addTrack(newAudioTrack);
          } else {
            stream = new MediaStream([newAudioTrack]);
            setLocalStream(stream);
          }
          Object.values(peerConnectionsRef.current).forEach((pc: RTCPeerConnection) => {
            try {
              pc.addTrack(newAudioTrack, stream!);
            } catch (e) {}
          });
        }
        setMicOn(true);
        playMeetingChime("unmute");
        addToast("Microphone active", "success");
      } catch (err: any) {
        setMicOn(false);
        console.warn("Microphone permission error:", err);
        addToast("Microphone permission was blocked or denied by browser. Please click the camera/mic icon in your address bar to allow permissions.", "error");
      }
    }
  };

  // Toggle Video Camera
  const handleToggleVideo = async () => {
    if (videoOn) {
      setVideoOn(false);
      if (localStream) {
        localStream.getVideoTracks().forEach(track => {
          track.enabled = false;
          track.stop();
          localStream.removeTrack(track);
        });
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      addToast("Camera turned off", "info");
    } else {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          addToast("Your browser or device does not support camera access.", "error");
          return;
        }
        let videoStream: MediaStream | null = null;
        try {
          videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } });
        } catch (e1) {
          try {
            videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
          } catch (e2) {
            throw e2;
          }
        }
        if (!videoStream || videoStream.getVideoTracks().length === 0) {
          throw new Error("No video tracks found");
        }
        const newVideoTrack = videoStream.getVideoTracks()[0];
        let stream = localStream;
        if (stream) {
          stream.addTrack(newVideoTrack);
        } else {
          stream = new MediaStream([newVideoTrack]);
          setLocalStream(stream);
        }
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        Object.values(peerConnectionsRef.current).forEach((pc: RTCPeerConnection) => {
          try {
            const senders = pc.getSenders();
            const sender = senders.find(s => s.track?.kind === "video");
            if (sender) {
              sender.replaceTrack(newVideoTrack).catch(() => {});
            } else {
              pc.addTrack(newVideoTrack, stream!);
            }
          } catch (e) {}
        });
        setVideoOn(true);
        addToast("Camera video active", "success");
      } catch (err: any) {
        setVideoOn(false);
        console.warn("Camera permission/device error:", err);
        addToast("Camera access was denied or unavailable on this device. Please check browser permissions and ensure no other app is using the camera.", "error");
      }
    }
  };

  // Toggle Screen Share
  const handleToggleScreenShare = async () => {
    if (screenSharing) {
      if (localStream) {
        localStream.getVideoTracks().forEach(t => t.stop());
      }
      setScreenSharing(false);
      setLocalStream(null);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      addToast("Screen sharing stopped", "info");
    } else {
      try {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          addToast("Screen sharing is not supported by your device/browser.", "error");
          return;
        }
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        setLocalStream(screenStream);
        setScreenSharing(true);
        setVideoOn(true);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        Object.values(peerConnectionsRef.current).forEach((pc: RTCPeerConnection) => {
          try {
            const senders = pc.getSenders();
            const sender = senders.find(s => s.track?.kind === "video");
            if (sender) {
              sender.replaceTrack(screenTrack).catch(() => {});
            } else {
              pc.addTrack(screenTrack, screenStream);
            }
          } catch (e) {}
        });
        addToast("Sharing live screen to call", "success");
        screenStream.getVideoTracks()[0].onended = () => {
          setScreenSharing(false);
          addToast("Screen sharing ended", "info");
        };
      } catch (e) {
        console.warn("Screen share cancelled", e);
      }
    }
  };

  // Toggle Deafen (mute/unmute incoming call audio)
  const handleToggleDeafen = () => {
    const nextDeafened = !isDeafened;
    setIsDeafened(nextDeafened);
    const audioVideos = document.querySelectorAll("video, audio");
    audioVideos.forEach((el: any) => {
      if (el !== localVideoRef.current) {
        el.muted = nextDeafened;
      }
    });
    addToast(nextDeafened ? "Deafened: all incoming meeting audio is muted" : "Undeafened: meeting audio restored", "info");
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
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sender: effectiveUser?.full_name || "You",
      text: inputMessage.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setCallMessages(prev => {
      const updated = [...prev, newMsg];
      try {
        localStorage.setItem(`impacto_meet_chat_${activeOrg?.id || "default"}`, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    setInputMessage("");

    broadcastSignalingMessage({
      type: "NEW_CHAT_MESSAGE",
      fromPeerId: myPeerId,
      data: newMsg
    });
  };

  const handleOpenDocReadMode = (doc: Document) => {
    setViewingDoc(doc);
    addToast(`Opened "${doc.name}" in Read Mode`, "info");
  };

  const handleCloseReadMode = () => {
    setViewingDoc(null);
  };

  const handleCreateAgendaPoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgendaTitle.trim()) return;

    const newPoint: AgendaPoint = {
      id: `ag-${Date.now()}`,
      title: newAgendaTitle.trim(),
      assignee: newAgendaAssignee.trim() || "Lead Officer",
      status: "open",
      author: effectiveUser?.full_name || "Host",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setAgendaPoints(prev => [...prev, newPoint]);
    setNewAgendaTitle("");
    setNewAgendaAssignee("");
    addToast("New action point recorded in meeting minutes", "success");

    broadcastSignalingMessage({
      type: "NEW_AGENDA",
      fromPeerId: myPeerId,
      data: newPoint
    });
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

    broadcastSignalingMessage({
      type: "SYNC_SHARED_DOC",
      fromPeerId: myPeerId,
      doc: doc,
      presenterName: effectiveUser?.full_name || "Presenter"
    });

    addToast(`Presenting ${doc.name} to everyone`, "info");
    setCallMessages(prev => [
      ...prev,
      {
        id: `msg-doc-${Date.now()}`,
        sender: "System",
        text: `Shared document set to "${doc.name}" by ${effectiveUser?.full_name || "Presenter"}`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    ]);
  };

  const handleStopPresentingDoc = () => {
    setSharedDoc(null);
    broadcastSignalingMessage({
      type: "STOP_SHARED_DOC",
      fromPeerId: myPeerId,
      presenterName: effectiveUser?.full_name || "Presenter"
    });
    addToast("Document presentation ended", "info");
  };

  const handleRemoveParticipant = (targetPeerId: string, targetName: string) => {
    if (!isAdmin) {
      addToast("Only meeting administrators can remove participants", "error");
      return;
    }
    const confirmed = window.confirm(`Remove ${targetName} from the meeting?`);
    if (!confirmed) return;

    broadcastSignalingMessage({
      type: "KICK_PEER",
      fromPeerId: myPeerId,
      targetPeerId,
      targetName,
      kickedBy: effectiveUser?.full_name || "Administrator"
    });

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

    // Compile meeting history record with deterministic session ID to prevent duplicates when multiple members leave
    const duration = elapsedSeconds;
    const startedTime = hostedMeetInfo?.startedAt || new Date(Date.now() - duration * 1000).toISOString();
    const endedTime = new Date().toISOString();
    const sanitizedTitle = (meetingName || `${channelName} Live Meeting`).toLowerCase().replace(/[^a-z0-9]/g, "_");
    const stableSessionId = hostedMeetInfo?.meetingId || (hostedMeetInfo as any)?.id || `meet_session_${activeOrg?.id || "default"}_${sanitizedTitle}`;

    const record: LiveMeetHistoryRecord = {
      id: stableSessionId,
      meetingTitle: meetingName || `${channelName} Live Meeting`,
      channelName: channelName || "General",
      channelId: hostedMeetInfo?.channelId,
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
      recordedBy: effectiveUser?.full_name || "Admin"
    };

    try {
      const storageKey = `impacto_meeting_history_${activeOrg?.id || "default"}`;
      const existingStr = localStorage.getItem(storageKey);
      const existing: LiveMeetHistoryRecord[] = existingStr ? JSON.parse(existingStr) : [];
      const isSameSession = (e: LiveMeetHistoryRecord) =>
        e.id === record.id ||
        (hostedMeetInfo?.meetingId && e.id === hostedMeetInfo.meetingId) ||
        (e.meetingTitle === record.meetingTitle &&
          Math.abs(new Date(e.startedAt).getTime() - new Date(startedTime).getTime()) < 1800000);

      const updated = [record, ...existing.filter(e => !isSameSession(e))];
      localStorage.setItem(storageKey, JSON.stringify(updated));

      // Asynchronously persist to Supabase meetings and meeting_sessions database
      if (isSupabaseConfigured) {
        // 1. Direct persistence to public.meetings table (native JSONB columns)
        Promise.resolve(
          supabase
            .from("meetings")
            .upsert(
              {
                id: record.id,
                org_id: record.orgId,
                title: record.meetingTitle,
                meeting_title: record.meetingTitle,
                channel_name: record.channelName,
                date_time: record.startedAt,
                started_at: record.startedAt,
                ended_at: record.endedAt,
                duration: Math.round(record.durationSeconds / 60) || 1,
                duration_seconds: record.durationSeconds,
                duration_formatted: record.durationFormatted,
                location: "online",
                location_type: "online",
                status: "completed",
                recorded_by: record.recordedBy,
                is_public: true,
                participants: record.participants,
                documents_used: record.documentsUsed,
                notes: record.notes,
                chat_messages: record.chatMessages
              },
              { onConflict: "id" }
            )
        ).catch(err => console.warn("Supabase meetings table upsert error:", err));

        // 2. Also persist to meeting_sessions if configured
        Promise.resolve(
          supabase
            .from("meeting_sessions")
            .upsert(
              {
                id: record.id,
                org_id: record.orgId,
                meeting_title: record.meetingTitle,
                channel_name: record.channelName,
                started_at: record.startedAt,
                ended_at: record.endedAt,
                duration_seconds: record.durationSeconds,
                duration_formatted: record.durationFormatted,
                recorded_by: record.recordedBy
              },
              { onConflict: "id" }
            )
        )
          .then(async (res: any) => {
            if (res?.error) {
              return;
            }
            if (record.participants.length > 0) {
              await supabase.from("meeting_participants").insert(
                record.participants.map(p => ({
                  session_id: record.id,
                  peer_id: p.peerId,
                  user_id: p.userId,
                  name: p.name,
                  role: p.role,
                  is_me: p.isMe
                }))
              );
            }
            if (record.documentsUsed.length > 0) {
              await supabase.from("meeting_documents").insert(
                record.documentsUsed.map(d => ({
                  session_id: record.id,
                  doc_id: d.id,
                  name: d.name,
                  category: d.category
                }))
              );
            }
            if (record.notes.length > 0) {
              await supabase.from("meeting_notes").insert(
                record.notes.map(n => ({
                  session_id: record.id,
                  title: n.title,
                  assignee: n.assignee,
                  status: n.status
                }))
              );
            }
            if (record.chatMessages.length > 0) {
              await supabase.from("meeting_chat_messages").insert(
                record.chatMessages.map(m => ({
                  session_id: record.id,
                  sender: m.sender,
                  text: m.text
                }))
              );
            }
          })
          .catch(err => console.warn("Supabase meeting session sync failed:", err));
      }
    } catch (e) {
      console.error("Failed to store meeting history", e);
    }

    if (onMeetingEnded) {
      onMeetingEnded(record);
    }

    const isMeetingHost = hostedMeetInfo?.hostId === user?.id || isAdmin;
    if (isMeetingHost) {
      try {
        localStorage.removeItem(`impacto_meet_chat_${activeOrg?.id || "default"}`);
      } catch (e) {}
      if (onHostedMeetEnded) {
        onHostedMeetEnded();
      }
    }

    onClose();
  };

  // Compile combined participant list: ONLY Local User + Actively Connected Remote Peers
  // Static placeholder members removed so only actual attendees who clicked Join Meet are shown
  const allParticipants = useMemo(() => {
    const list: PeerParticipant[] = [
      {
        peerId: myPeerId,
        userId: effectiveUser?.id || "me",
        name: effectiveUser?.full_name || "You",
        role: activeMember?.role || guestUser?.role || "Host",
        isMe: true,
        mic: micOn,
        video: videoOn,
        speaking: isSpeaking,
        handRaised,
        deafened: isDeafened,
        stream: localStream || undefined
      }
    ];

    const seen = new Set<string>([myPeerId]);

    // Add active connected peers (prevent duplicate peerIds or echo of local user)
    Object.values(remotePeers).forEach((p: PeerParticipant) => {
      if (p && p.peerId && !seen.has(p.peerId) && !p.isMe && p.peerId !== myPeerId) {
        seen.add(p.peerId);
        list.push(p);
      }
    });

    return list;
  }, [myPeerId, effectiveUser, activeMember, guestUser, micOn, videoOn, isSpeaking, handRaised, isDeafened, localStream, remotePeers]);

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

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 bg-[#1a1b1e]/95 backdrop-blur-md border border-[#3c4043] rounded-2xl shadow-2xl p-3.5 flex items-center gap-3 animate-in slide-in-from-bottom-4 text-white font-sans">
        {/* Dedicated audio elements for all remote peers to guarantee continuous voice communication */}
        <div className="hidden" aria-hidden="true">
          {(Object.values(remotePeers) as PeerParticipant[]).map((p: PeerParticipant, idx: number) => {
            if (!p.stream || p.isMe || p.peerId === myPeerId) return null;
            return (
              <audio
                key={`remote-audio-min-${p.peerId}-${idx}`}
                autoPlay
                playsInline
                ref={(el) => {
                  if (el && p.stream && el.srcObject !== p.stream) {
                    el.srcObject = p.stream;
                    const playPromise = el.play();
                    if (playPromise && typeof (playPromise as any).catch === "function") {
                      (playPromise as any).catch(() => {});
                    }
                  }
                }}
              />
            );
          })}
        </div>

        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#81c995] animate-pulse shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-xs text-white truncate max-w-[150px]">
              {meetingName}
            </span>
            <span className="text-[10px] text-[#9aa0a6] font-mono">
              Code: <strong className="text-[#81c995]">{hostedMeetInfo?.meetingCode || "Active"}</strong> • {allParticipants.length} in call
            </span>
          </div>
        </div>

        <div className="h-6 w-px bg-[#3c4043]" />

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleToggleMic}
            className={`p-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              micOn
                ? "bg-[#3c4043] text-white hover:bg-[#4a4d52]"
                : "bg-[#ea4335]/20 text-[#f28b82] border border-[#ea4335]/30"
            }`}
            title={micOn ? "Mute Microphone" : "Unmute Microphone"}
          >
            {micOn ? <Mic className="h-4 w-4 text-[#81c995]" /> : <MicOff className="h-4 w-4 text-[#f28b82]" />}
          </button>

          <button
            type="button"
            onClick={handleToggleVideo}
            className={`p-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              videoOn
                ? "bg-[#3c4043] text-white hover:bg-[#4a4d52]"
                : "bg-[#ea4335]/20 text-[#f28b82] border border-[#ea4335]/30"
            }`}
            title={videoOn ? "Turn Camera Off" : "Turn Camera On"}
          >
            {videoOn ? <Video className="h-4 w-4 text-[#81c995]" /> : <VideoOff className="h-4 w-4 text-[#f28b82]" />}
          </button>

          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="p-2 rounded-xl bg-[#81c995] hover:bg-[#a8dab5] text-[#0d2818] font-bold transition cursor-pointer flex items-center gap-1 text-xs shadow-sm"
            title="Maximize meeting back to full screen"
          >
            <Maximize2 className="h-4 w-4" />
            <span className="hidden sm:inline font-bold">Expand</span>
          </button>

          <button
            type="button"
            onClick={handleLeaveCall}
            className="p-2 rounded-xl bg-[#ea4335] hover:bg-[#f28b82] text-white font-bold transition cursor-pointer"
            title="Leave Meeting"
          >
            <PhoneOff className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#121316] text-[#e3e3e3] flex flex-col overflow-hidden select-none animate-in fade-in duration-200 font-sans">
      
      {/* Dedicated audio elements for all remote peers to guarantee continuous voice communication */}
      <div className="hidden" aria-hidden="true">
        {(Object.values(remotePeers) as PeerParticipant[]).map((p: PeerParticipant, idx: number) => {
          if (!p.stream || p.isMe || p.peerId === myPeerId) return null;
          return (
            <audio
              key={`remote-audio-tag-${p.peerId}-${idx}`}
              autoPlay
              playsInline
              ref={el => {
                if (el && p.stream && el.srcObject !== p.stream) {
                  el.srcObject = p.stream;
                  const playPromise = el.play();
                  if (playPromise && typeof (playPromise as any).catch === "function") {
                    (playPromise as any).catch(() => {});
                  }
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

          {/* Real-time Connection Status Indicator Badge */}
          {connectionStatus === "connected" ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#81c995] bg-[#133020] px-2.5 py-0.5 rounded-full border border-[#1e4620]">
              <span className="w-2 h-2 rounded-full bg-[#81c995] animate-pulse" />
              <span>Connected</span>
            </span>
          ) : connectionStatus === "connecting" ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Connecting...</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/30">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span>Disconnected</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {hostedMeetInfo?.meetingCode && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#282a2d] border border-[#3c4043] text-xs font-mono">
              <span className="text-[#9aa0a6] text-[10px] uppercase font-sans font-semibold">Code:</span>
              <span className="text-white font-bold tracking-wider">{hostedMeetInfo.meetingCode}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(hostedMeetInfo.meetingCode!);
                  addToast(`Meeting code ${hostedMeetInfo.meetingCode} copied to clipboard`, "success");
                }}
                className="p-1 rounded hover:bg-[#3c4043] text-[#9aa0a6] hover:text-white transition cursor-pointer"
                title="Copy meeting code"
              >
                <Copy className="h-3 w-3 text-[#81c995]" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              const targetOrgId = hostedMeetInfo?.orgId || activeOrg?.id || "default";
              const codeParam = hostedMeetInfo?.meetingCode ? `&code=${encodeURIComponent(hostedMeetInfo.meetingCode)}` : "";
              const meetingUrl = `${window.location.origin}/meet?org=${targetOrgId}${codeParam}`;
              navigator.clipboard.writeText(meetingUrl).then(() => {
                addToast("Meeting link copied to clipboard", "success");
              }).catch(() => {
                addToast("Failed to copy link", "error");
              });
            }}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#282a2d] hover:bg-[#3c4043] text-xs font-medium text-[#e3e3e3] border border-[#3c4043] transition cursor-pointer"
            title="Copy meeting link to share with organization members"
          >
            <Copy className="h-3.5 w-3.5 text-[#81c995]" />
            <span>Copy Link</span>
          </button>

          <div className="flex items-center gap-1.5 text-xs font-mono text-[#9aa0a6]">
            <Clock className="h-3.5 w-3.5" />
            <span>{formattedDuration}</span>
          </div>

          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="p-1.5 rounded-full hover:bg-[#2d2e31] text-[#9aa0a6] hover:text-white transition cursor-pointer"
            title="Minimize meeting to access system and read docs"
          >
            <Minus className="h-5 w-5" />
          </button>

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
          {activeDisplayDoc ? (
            /* Split View: Active Document (Read Mode / Presentation) + Participant filmstrip */
            <div className="flex-1 flex flex-col gap-3 min-h-0">
              <div className="flex-1 bg-[#1e1f20] border border-[#2d2e31] rounded-2xl p-5 overflow-y-auto text-xs text-[#e3e3e3] shadow-md flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-[#2d2e31] pb-3 text-xs flex-wrap gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl ${sharedDoc ? "bg-[#133020] text-[#81c995] border border-[#1e4620]" : "bg-[#1e293b] text-sky-400 border border-sky-800"}`}>
                          {sharedDoc ? <FileText className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                            {sharedDoc ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-[#81c995] animate-ping" />
                                <span className="text-[#81c995]">Simultaneously Presenting to All Participants</span>
                              </>
                            ) : (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                                <span className="text-sky-400">Read Mode (Viewing in Meeting)</span>
                              </>
                            )}
                          </span>
                          <h4 className="font-bold text-sm text-white mt-0.5">{activeDisplayDoc.name}</h4>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#9aa0a6] font-mono hidden md:inline">
                          {activeDisplayDoc.category || "General Document"}
                        </span>
                        <select
                          value={activeDisplayDoc.id}
                          onChange={(e) => {
                            const target = availableDocs.find(d => d.id === e.target.value);
                            if (target) {
                              if (sharedDoc) {
                                handleSelectDoc(target);
                              } else {
                                setViewingDoc(target);
                              }
                            }
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

                        {!sharedDoc && viewingDoc && (
                          <button
                            type="button"
                            onClick={() => handleSelectDoc(viewingDoc)}
                            className="px-2.5 py-1 rounded-lg bg-[#81c995] hover:bg-[#68b67f] text-xs font-bold text-[#121316] transition flex items-center gap-1 cursor-pointer"
                            title="Broadcast this document to all meeting participants"
                          >
                            <Share2 className="h-3 w-3" />
                            <span>Present to All</span>
                          </button>
                        )}

                        {sharedDoc ? (
                          <button
                            type="button"
                            onClick={handleStopPresentingDoc}
                            className="px-2.5 py-1 rounded-lg bg-[#282a2d] hover:bg-rose-500/20 hover:text-rose-300 text-xs font-semibold text-[#e3e3e3] border border-[#3c4043] transition cursor-pointer"
                          >
                            Stop Presenting
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleCloseReadMode}
                            className="px-2.5 py-1 rounded-lg bg-[#282a2d] hover:bg-slate-700 text-xs font-semibold text-[#e3e3e3] border border-[#3c4043] transition cursor-pointer flex items-center gap-1"
                          >
                            <X className="h-3 w-3" />
                            <span>Exit Reader</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 text-xs leading-relaxed text-[#c4c7c5] whitespace-pre-wrap select-text overflow-y-auto max-h-[500px]">
                      {(() => {
                        if (!activeDisplayDoc.content && !activeDisplayDoc.file_url) {
                          return (
                            <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
                              <FileText className="h-10 w-10 text-emerald-500 opacity-60" />
                              <h4 className="font-bold text-white text-sm">{activeDisplayDoc.name}</h4>
                              <p className="text-xs text-slate-400">Official document stored in organization registry.</p>
                            </div>
                          );
                        }

                        // 1. Spreadsheet JSON array
                        if (activeDisplayDoc.file_type === "excel" || (activeDisplayDoc.content && activeDisplayDoc.content.trim().startsWith("["))) {
                          try {
                            const grid: string[][] = JSON.parse(activeDisplayDoc.content);
                            if (Array.isArray(grid) && grid.length > 0) {
                              return (
                                <div className="overflow-x-auto border border-[#3c4043] rounded-xl bg-[#121316]">
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                      <tr className="bg-[#282a2d] border-b border-[#3c4043] text-white">
                                        <th className="p-2 border-r border-[#3c4043] text-center w-8 text-[10px] font-mono">#</th>
                                        {grid[0]?.map((col, idx) => (
                                          <th key={idx} className="p-2 border-r border-[#3c4043] font-bold text-[11px] uppercase tracking-wider">
                                            {col || `Col ${idx + 1}`}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {grid.slice(1).map((row, rIdx) => (
                                        <tr key={rIdx} className="border-b border-[#2d2e31] hover:bg-[#1e1f20]">
                                          <td className="p-2 border-r border-[#3c4043] text-center font-mono text-[10px] text-[#9aa0a6]">
                                            {rIdx + 1}
                                          </td>
                                          {row.map((cell, cIdx) => (
                                            <td key={cIdx} className="p-2 border-r border-[#3c4043] text-[#e3e3e3]">
                                              {cell}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              );
                            }
                          } catch (e) {}
                        }

                        // 2. HTML formatted document
                        if (activeDisplayDoc.content && /<[a-z][\s\S]*>/i.test(activeDisplayDoc.content)) {
                          return (
                            <div
                              className="prose prose-invert max-w-none text-xs leading-relaxed text-[#e3e3e3]"
                              dangerouslySetInnerHTML={{ __html: activeDisplayDoc.content }}
                            />
                          );
                        }

                        // 3. Plain text document
                        if (activeDisplayDoc.content && activeDisplayDoc.content.trim()) {
                          return (
                            <div className="whitespace-pre-wrap leading-relaxed text-xs text-[#e3e3e3] font-sans">
                              {activeDisplayDoc.content}
                            </div>
                          );
                        }

                        // 4. File URL with download button
                        return (
                          <div className="p-6 bg-[#282a2d] rounded-2xl border border-[#3c4043] flex flex-col items-center justify-center text-center gap-3">
                            <FileText className="h-10 w-10 text-[#81c995]" />
                            <div>
                              <h4 className="font-bold text-sm text-white">{activeDisplayDoc.name}</h4>
                              <p className="text-xs text-[#9aa0a6] mt-0.5">
                                {activeDisplayDoc.category || "Official Document"} • Uploaded by {activeDisplayDoc.uploader_name || "Admin"}
                              </p>
                            </div>
                            {activeDisplayDoc.file_url && (
                              <a
                                href={activeDisplayDoc.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 rounded-xl bg-[#81c995] text-[#121316] font-bold text-xs hover:bg-[#68b67f] transition flex items-center gap-1.5"
                              >
                                <Download className="h-3.5 w-3.5" />
                                <span>Download & Review File</span>
                              </a>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Attendee Video Strip under doc */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 h-32 shrink-0">
                {allParticipants.map((p, idx) => (
                  <div
                    key={`doc-strip-${p.peerId}-${idx}`}
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
              {allParticipants.map((p, idx) => (
                <div
                  key={`meet-grid-${p.peerId}-${idx}`}
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
                 {allParticipants.map((p, idx) => (
                  <div
                    key={`in-call-peer-${p.peerId}-${idx}`}
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

                      {/* Microphone Status Indicator */}
                      <span
                        className={`p-1 rounded-md flex items-center justify-center ${
                          p.mic ? "text-[#81c995] bg-[#133020]" : "text-[#f28b82] bg-[#371e1d]"
                        }`}
                        title={p.mic ? `${p.name}'s microphone is ON` : `${p.name} is MUTED`}
                      >
                        {p.mic ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
                      </span>

                      {/* Deafened / Audio Output Indicator */}
                      <span
                        className={`p-1 rounded-md flex items-center justify-center ${
                          p.deafened ? "text-[#f28b82] bg-[#371e1d]" : "text-[#81c995] bg-[#133020]"
                        }`}
                        title={p.deafened ? `${p.name} is DEAFENED (speakers muted)` : `${p.name} is LISTENING (sound on)`}
                      >
                        {p.deafened ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                      </span>

                      {/* Camera Status Indicator */}
                      <span
                        className={`p-1 rounded-md flex items-center justify-center ${
                          p.video ? "text-[#81c995] bg-[#133020]" : "text-[#f28b82] bg-[#371e1d]"
                        }`}
                        title={p.video ? `${p.name}'s camera is ON` : `${p.name}'s camera is DISABLED`}
                      >
                        {p.video ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
                      </span>

                      {/* Host Actions for Remote Peer */}
                      {isAdmin && !p.isMe && (
                        <div className="flex items-center gap-1 ml-1">
                          <button
                            type="button"
                            onClick={() => {
                              broadcastSignalingMessage({
                                type: "REMOTE_MUTE_PEER",
                                targetPeerId: p.peerId
                              });
                              addToast(`Mute command sent to ${p.name}`, "info");
                            }}
                            className="p-1 rounded bg-[#3c4043] hover:bg-[#4a4d52] text-[#f28b82] transition cursor-pointer"
                            title={`Remotely mute ${p.name}`}
                          >
                            <MicOff className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveParticipant(p.peerId, p.name)}
                            className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/30 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                            title={`Remove ${p.name} from meeting`}
                          >
                            <UserX className="h-3 w-3" />
                            <span>Remove</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isAdmin && members && members.filter(m => !allParticipants.some(p => p.userId === m.user_id)).length > 0 && (
                  <div className="mt-4 pt-3 border-t border-[#3c4043] flex flex-col gap-2">
                    <span className="text-[11px] font-bold text-[#9aa0a6] uppercase tracking-wider">
                      Invite / Allow Members to Join
                    </span>
                    {members
                      .filter(m => !allParticipants.some(p => p.userId === m.user_id))
                      .slice(0, 5)
                      .map((mem, idx) => (
                        <div key={`invite-mem-${mem.id}-${idx}`} className="flex items-center justify-between bg-[#282a2d] p-2 rounded-lg border border-[#3c4043] text-xs">
                          <div className="min-w-0">
                            <span className="font-bold text-white block truncate">{mem.user?.full_name || "Member"}</span>
                            <span className="text-[10px] text-[#9aa0a6] capitalize">{mem.role}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              addToast(`Invitation sent to ${mem.user?.full_name || "Member"} to join the meet.`, "success");
                            }}
                            className="px-2.5 py-1 rounded bg-[#81c995] hover:bg-[#a8dab5] text-[#0d2818] font-bold text-[10px] transition cursor-pointer shrink-0"
                          >
                            Allow / Invite
                          </button>
                        </div>
                      ))}
                  </div>
                )}
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
                    callMessages.map((msg, idx) => (
                      <div key={`meet-msg-${msg.id}-${idx}`} className="flex flex-col gap-0.5">
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
                  {availableDocs.length === 0 ? (
                    <div className="p-6 text-center text-[#9aa0a6] rounded-xl bg-[#282a2d]/50 border border-[#3c4043] flex flex-col items-center justify-center">
                      <FileText className="h-8 w-8 text-[#5f6368] mb-2" />
                      <p className="text-xs font-semibold text-white">No documents stored</p>
                      <p className="text-[11px] text-[#9aa0a6] mt-1">
                        Create or upload documents in the Document Office to share them live during meetings.
                      </p>
                    </div>
                  ) : availableDocs.filter(d => {
                      if (!docSearchQuery.trim()) return true;
                      const q = docSearchQuery.toLowerCase();
                      return d.name.toLowerCase().includes(q) || (d.category && d.category.toLowerCase().includes(q));
                    }).length === 0 ? (
                    <div className="p-6 text-center text-[#9aa0a6] rounded-xl bg-[#282a2d]/30 border border-[#3c4043]">
                      <p className="text-xs font-medium">No matching documents found</p>
                    </div>
                  ) : (
                    availableDocs
                      .filter(d => {
                        if (!docSearchQuery.trim()) return true;
                        const q = docSearchQuery.toLowerCase();
                        return d.name.toLowerCase().includes(q) || (d.category && d.category.toLowerCase().includes(q));
                      })
                      .map((d, idx) => {
                        const isCurrentlyActive = sharedDoc?.id === d.id;
                        return (
                        <div
                          key={`meet-doc-${d.id}-${idx}`}
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

                          <div className="flex items-center justify-between pt-1 border-t border-[#3c4043]/60 gap-1.5 flex-wrap">
                            <span className="text-[10px] text-[#9aa0a6]">
                              By {d.uploader_name || "Admin"}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {/* Open in Read Mode for all attendees */}
                              <button
                                type="button"
                                onClick={() => handleOpenDocReadMode(d)}
                                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer ${
                                  viewingDoc?.id === d.id && !isCurrentlyActive
                                    ? "bg-[#1e293b] text-sky-400 border border-sky-600"
                                    : "bg-[#282a2d] hover:bg-[#3c4043] text-[#e3e3e3]"
                                }`}
                                title="Open this document in reader mode"
                              >
                                <BookOpen className="h-3 w-3" />
                                <span>{viewingDoc?.id === d.id && !isCurrentlyActive ? "Reading" : "Read Mode"}</span>
                              </button>

                              {/* Present to Everyone */}
                              {isCurrentlyActive ? (
                                <button
                                  type="button"
                                  onClick={handleStopPresentingDoc}
                                  className="px-2 py-1 rounded-lg bg-[#282a2d] hover:bg-rose-500/30 text-rose-300 text-[11px] font-semibold transition cursor-pointer"
                                >
                                  Stop
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleSelectDoc(d)}
                                  className="px-2 py-1 rounded-lg bg-[#81c995] hover:bg-[#68b67f] text-[#121316] text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                                  title="Broadcast this document to everyone in the meeting"
                                >
                                  <Share2 className="h-3 w-3" />
                                  <span>Present</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
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
                    agendaPoints.map((pt, idx) => (
                      <div
                        key={`agenda-${pt.id}-${idx}`}
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
      <div className="h-20 px-2 sm:px-8 border-t border-[#2d2e31] bg-[#1a1b1e] flex items-center justify-between gap-2 sm:gap-4 shrink-0 overflow-x-auto scrollbar-none">
        
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
        <div className="flex items-center gap-2 sm:gap-3 mx-auto flex-wrap justify-center">
          {/* Microphone Toggle */}
          <button
            type="button"
            onClick={handleToggleMic}
            className={`h-11 w-11 sm:h-12 sm:w-12 rounded-full flex items-center justify-center transition cursor-pointer shrink-0 ${
              micOn
                ? "bg-[#3c4043] hover:bg-[#474a4d] text-white"
                : "bg-[#ea4335] hover:bg-[#d93025] text-white shadow-lg"
            }`}
            title={micOn ? "Turn off microphone" : "Turn on microphone"}
          >
            {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </button>

          {/* Camera Toggle */}
          <button
            type="button"
            onClick={handleToggleVideo}
            className={`h-11 w-11 sm:h-12 sm:w-12 rounded-full flex items-center justify-center transition cursor-pointer shrink-0 ${
              videoOn
                ? "bg-[#3c4043] hover:bg-[#474a4d] text-white"
                : "bg-[#ea4335] hover:bg-[#d93025] text-white shadow-lg"
            }`}
            title={videoOn ? "Turn off camera" : "Turn on camera"}
          >
            {videoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </button>

          {/* Deafen / Mute Sound Toggle */}
          <button
            type="button"
            onClick={handleToggleDeafen}
            className={`h-11 w-11 sm:h-12 sm:w-12 rounded-full flex items-center justify-center transition cursor-pointer shrink-0 ${
              isDeafened
                ? "bg-[#ea4335] hover:bg-[#d93025] text-white shadow-lg"
                : "bg-[#3c4043] hover:bg-[#474a4d] text-white"
            }`}
            title={isDeafened ? "Undeafen (unmute incoming audio)" : "Deafen (mute incoming audio)"}
          >
            {isDeafened ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>

          {/* Screen Share */}
          <button
            type="button"
            onClick={handleToggleScreenShare}
            className={`h-11 w-11 sm:h-12 sm:w-12 rounded-full flex items-center justify-center transition cursor-pointer shrink-0 ${
              screenSharing
                ? "bg-[#81c995] text-[#121316] shadow-lg"
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
            className={`h-11 w-11 sm:h-12 sm:w-12 rounded-full flex items-center justify-center transition cursor-pointer shrink-0 ${
              handRaised
                ? "bg-[#fbbc04] text-[#202124] shadow-lg"
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
            className="h-11 px-5 sm:h-12 sm:px-6 rounded-full bg-[#ea4335] hover:bg-[#d93025] text-white font-medium text-xs flex items-center gap-2 transition cursor-pointer shadow-md shrink-0"
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
