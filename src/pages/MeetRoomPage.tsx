import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  Users,
  Clock,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Monitor,
  Copy,
  Check,
  RefreshCw,
  KeyRound,
  MessageSquare,
  Globe,
  Lock,
  Plus,
  ExternalLink,
  X
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useOrgStore } from "../store/orgStore";
import {
  useOrganizations,
  useMembers,
  useV2Documents,
  useChatChannels,
  useSendChatMessage
} from "../hooks/useImpactoData";
import { ChatVideoMeetModal } from "../components/ChatVideoMeetModal";
import { HostedMeetInfo } from "../types";
import { useToast } from "../components/Toast";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export function generateMeetingCode(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let p1 = "";
  let p2 = "";
  for (let i = 0; i < 3; i++) {
    p1 += chars.charAt(Math.floor(Math.random() * chars.length));
    p2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${p1}-${p2}`;
}

export function formatMeetingCodeInput(val: string): string {
  const clean = val.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6);
  if (clean.length > 3) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }
  return clean;
}

export const MeetRoomPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const params = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { activeOrg, activeMember } = useOrgStore();
  const { data: orgs = [] } = useOrganizations();
  const { addToast } = useToast();

  const orgIdFromParam =
    params.orgId ||
    searchParams.get("org") ||
    searchParams.get("joinMeet") ||
    searchParams.get("meet") ||
    activeOrg?.id ||
    "default";

  // Target organization
  const targetOrg = orgs.find((o) => o.id === orgIdFromParam) || activeOrg || {
    id: orgIdFromParam,
    name: "Impacto Workspace",
    slug: "workspace"
  };

  const { data: orgMembers = [] } = useMembers(targetOrg.id);
  const { data: dbDocs = [] } = useV2Documents(targetOrg.id);
  const { data: chatChannels = [] } = useChatChannels(targetOrg.id);
  const sendChatMessage = useSendChatMessage();

  const generalChannel =
    chatChannels.find(
      (c) => c.name.toLowerCase() === "general" || c.channel_type === "general"
    ) || chatChannels[0];

  const [activeMeet, setActiveMeet] = useState<HostedMeetInfo | null>(null);
  const [loadingMeet, setLoadingMeet] = useState(true);
  const [inCall, setInCall] = useState(false);
  const [waitingForAdmission, setWaitingForAdmission] = useState(false);

  // Manual meeting code input for joining
  const [manualCodeInput, setManualCodeInput] = useState("");
  const [isSearchingCode, setIsSearchingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Create new meeting modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newMeetTitle, setNewMeetTitle] = useState(`${targetOrg.name} Live Sync`);
  const [newMeetCode, setNewMeetCode] = useState(() => generateMeetingCode());
  const [newMeetIsPublic, setNewMeetIsPublic] = useState(true);
  const [autoBroadcastToChat, setAutoBroadcastToChat] = useState(true);
  const [isCreatingMeet, setIsCreatingMeet] = useState(false);

  // Guest input state
  const [guestName, setGuestName] = useState("");
  const [guestUser, setGuestUser] = useState<{ id: string; full_name: string; role: string } | null>(null);

  // Pre-join audio/video preview toggles & streams
  const [previewMic, setPreviewMic] = useState(false);
  const [previewVideo, setPreviewVideo] = useState(false);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);

  // Hardware availability status for visual indicator
  const [hardwareStatus, setHardwareStatus] = useState<{ camera: boolean; microphone: boolean; checked: boolean }>({
    camera: false,
    microphone: false,
    checked: false
  });

  // Check hardware devices
  useEffect(() => {
    let isMounted = true;
    const checkDevices = async () => {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) {
          if (isMounted) setHardwareStatus({ camera: false, microphone: false, checked: true });
          return;
        }
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCam = devices.some((d) => d.kind === "videoinput");
        const hasMic = devices.some((d) => d.kind === "audioinput");
        if (isMounted) {
          setHardwareStatus({ camera: hasCam, microphone: hasMic, checked: true });
        }
      } catch (e) {
        if (isMounted) setHardwareStatus({ camera: false, microphone: false, checked: true });
      }
    };
    checkDevices();
    return () => {
      isMounted = false;
    };
  }, []);

  // Check Supabase for active session_token / recent session participation to auto-rejoin dropped session
  useEffect(() => {
    let isMounted = true;
    const checkDroppedSession = async () => {
      const effectiveUserId = user?.id;
      if (!effectiveUserId || !isSupabaseConfigured || !activeMeet) return;
      try {
        const { data, error } = await supabase
          .from("meeting_participants")
          .select("session_id, joined_at")
          .eq("user_id", effectiveUserId)
          .order("joined_at", { ascending: false })
          .limit(1);
        if (!error && data && data.length > 0) {
          const recentSession = data[0];
          const joinedTime = new Date(recentSession.joined_at).getTime();
          // Auto reconnect if session started within last 15 minutes and meet is active
          if (Date.now() - joinedTime < 900000 && activeMeet && isMounted && !inCall) {
            setInCall(true);
            addToast("Automatically reconnected to your dropped meeting session.", "success");
          }
        }
      } catch (err) {}
    };
    if (activeMeet) {
      checkDroppedSession();
    }
    return () => {
      isMounted = false;
    };
  }, [activeMeet, user?.id, inCall, addToast]);

  // Support URL code parameter on load
  useEffect(() => {
    const codeFromQuery = searchParams.get("code");
    if (codeFromQuery) {
      const formatted = formatMeetingCodeInput(codeFromQuery);
      setManualCodeInput(formatted);
      fetch(`/api/meet/active?code=${encodeURIComponent(formatted)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.activeMeet) {
            setActiveMeet(data.activeMeet);
          }
        })
        .catch(() => {});
    }
  }, [searchParams]);

  // Poll for active meet state from backend
  useEffect(() => {
    let isMounted = true;
    const fetchActive = async () => {
      try {
        const res = await fetch(`/api/meet/active?orgId=${encodeURIComponent(orgIdFromParam)}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setActiveMeet(data.activeMeet || null);
            setLoadingMeet(false);
          }
        }
      } catch (e) {
        if (isMounted) setLoadingMeet(false);
      }
    };

    fetchActive();
    const interval = setInterval(fetchActive, 2000);

    // Listen to local BroadcastChannel as well
    const bc = new BroadcastChannel(`impacto_org_meet_bus_${orgIdFromParam}`);
    bc.onmessage = (ev) => {
      if (ev.data?.type === "HOSTED_MEET_ACTIVE" && ev.data.meet) {
        setActiveMeet(ev.data.meet);
      } else if (ev.data?.type === "HOSTED_MEET_ENDED") {
        setActiveMeet(null);
        setInCall(false);
        setWaitingForAdmission(false);
      }
    };

    return () => {
      isMounted = false;
      clearInterval(interval);
      bc.close();
    };
  }, [orgIdFromParam]);

  // Listen for admission response over WebSocket / BroadcastChannel
  useEffect(() => {
    if (!waitingForAdmission) return;
    const effectiveUserId = user?.id || guestUser?.id;
    if (!effectiveUserId) return;

    const targetRoomOrgId = activeMeet?.orgId || orgIdFromParam;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/meet?orgId=${encodeURIComponent(
      targetRoomOrgId
    )}&peerId=wait-${effectiveUserId}&userId=${encodeURIComponent(effectiveUserId)}&name=${encodeURIComponent(
      user?.full_name || guestName
    )}&role=Waiting`;

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === "ADMIT_PEER" && msg.userId === effectiveUserId) {
            setWaitingForAdmission(false);
            setInCall(true);
            addToast("You have been admitted to the meeting!", "success");
          } else if (msg.type === "DECLINE_PEER" && msg.userId === effectiveUserId) {
            setWaitingForAdmission(false);
            addToast("Your request to join this meeting was declined by the host.", "error");
          }
        } catch (e) {}
      };
    } catch (e) {}

    const bc = new BroadcastChannel(`impacto_call_org_${targetRoomOrgId}`);
    bc.onmessage = (ev) => {
      if (ev.data?.type === "ADMIT_PEER" && ev.data.userId === effectiveUserId) {
        setWaitingForAdmission(false);
        setInCall(true);
        addToast("You have been admitted to the meeting!", "success");
      } else if (ev.data?.type === "DECLINE_PEER" && ev.data.userId === effectiveUserId) {
        setWaitingForAdmission(false);
        addToast("Your request to join this meeting was declined by the host.", "error");
      }
    };

    return () => {
      if (ws) ws.close();
      bc.close();
    };
  }, [waitingForAdmission, user?.id, guestUser?.id, orgIdFromParam, activeMeet?.orgId, guestName, addToast]);

  // Sync preview stream to video element
  useEffect(() => {
    if (previewVideoRef.current) {
      if (isScreenSharing && screenStream) {
        previewVideoRef.current.srcObject = screenStream;
      } else if (previewVideo && previewStream) {
        previewVideoRef.current.srcObject = previewStream;
      } else {
        previewVideoRef.current.srcObject = null;
      }
    }
  }, [previewVideo, previewStream, isScreenSharing, screenStream]);

  // Clean up streams on unmount
  useEffect(() => {
    return () => {
      if (previewStream) {
        previewStream.getTracks().forEach((t) => t.stop());
      }
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [previewStream, screenStream]);

  // Toggle Microphone for Local Stream
  const handleTogglePreviewMic = async () => {
    if (previewMic) {
      if (previewStream) {
        previewStream.getAudioTracks().forEach((t) => {
          t.enabled = false;
        });
      }
      setPreviewMic(false);
      addToast("Microphone muted", "info");
    } else {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          addToast("Microphone not supported on this device", "error");
          return;
        }
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioTrack = audioStream.getAudioTracks()[0];
        if (previewStream) {
          previewStream.addTrack(audioTrack);
        } else {
          setPreviewStream(audioStream);
        }
        setPreviewMic(true);
        addToast("Microphone active", "success");
      } catch (e) {
        addToast("Microphone permission denied or unavailable", "error");
      }
    }
  };

  // Toggle Camera for Local Stream
  const handleTogglePreviewVideo = async () => {
    if (previewVideo) {
      if (previewStream) {
        previewStream.getVideoTracks().forEach((t) => {
          t.stop();
          previewStream.removeTrack(t);
        });
      }
      if (previewVideoRef.current && !isScreenSharing) {
        previewVideoRef.current.srcObject = null;
      }
      setPreviewVideo(false);
      addToast("Camera disabled", "info");
    } else {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          addToast("Camera not supported on this device", "error");
          return;
        }
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        const videoTrack = videoStream.getVideoTracks()[0];
        let stream = previewStream;
        if (stream) {
          stream.getVideoTracks().forEach((t) => {
            t.stop();
            stream!.removeTrack(t);
          });
          stream.addTrack(videoTrack);
        } else {
          stream = new MediaStream([videoTrack]);
          setPreviewStream(stream);
        }
        if (previewVideoRef.current && !isScreenSharing) {
          previewVideoRef.current.srcObject = stream;
        }
        setPreviewVideo(true);
        addToast("Camera enabled and streaming", "success");
      } catch (e) {
        addToast("Camera permission denied or camera already in use", "error");
      }
    }
  };

  // Share Screen via browser getDisplayMedia API
  const handleShareScreen = async () => {
    if (isScreenSharing) {
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
      }
      setScreenStream(null);
      setIsScreenSharing(false);
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = previewVideo && previewStream ? previewStream : null;
      }
      addToast("Screen sharing stopped", "info");
    } else {
      try {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          addToast("Screen sharing is not supported by your browser.", "error");
          return;
        }
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        setScreenStream(stream);
        setIsScreenSharing(true);
        if (previewVideoRef.current) {
          previewVideoRef.current.srcObject = stream;
        }
        stream.getVideoTracks()[0].onended = () => {
          setScreenStream(null);
          setIsScreenSharing(false);
          if (previewVideoRef.current) {
            previewVideoRef.current.srcObject = previewVideo && previewStream ? previewStream : null;
          }
          addToast("Screen sharing ended", "info");
        };
        addToast("Screen stream captured via getDisplayMedia! Ready to broadcast to meeting.", "success");
      } catch (err: any) {
        if (err.name !== "NotAllowedError") {
          addToast("Failed to start screen capture", "error");
        }
      }
    }
  };

  // Join Existing Active Meeting
  const handleJoinClick = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const effectiveName = user?.full_name || guestName.trim();
    if (!effectiveName) {
      addToast("Please enter your name to join the meeting", "error");
      return;
    }

    const currentGuest = user
      ? null
      : {
          id: `guest-${Math.random().toString(36).substring(2, 9)}`,
          full_name: effectiveName,
          role: "Guest"
        };

    if (currentGuest) {
      setGuestUser(currentGuest);
    }

    const effectiveUserId = user?.id || currentGuest?.id || "guest";
    const isHostOrAdmin = user?.id === activeMeet?.hostId || activeMember?.role === "org_admin";

    if (activeMeet?.isPublic || isHostOrAdmin) {
      setInCall(true);
    } else {
      setWaitingForAdmission(true);
      const targetRoomOrgId = activeMeet?.orgId || orgIdFromParam;
      // Dispatch admission request to room
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws/meet?orgId=${encodeURIComponent(
          targetRoomOrgId
        )}&peerId=wait-${effectiveUserId}&userId=${encodeURIComponent(effectiveUserId)}&name=${encodeURIComponent(
          effectiveName
        )}&role=Guest`;
        const tempWs = new WebSocket(wsUrl);
        tempWs.onopen = () => {
          tempWs.send(
            JSON.stringify({
              type: "REQUEST_ADMISSION",
              userId: effectiveUserId,
              userName: effectiveName,
              role: user ? activeMember?.role || "Member" : "Guest"
            })
          );
        };
      } catch (err) {}

      try {
        const bc = new BroadcastChannel(`impacto_call_org_${targetRoomOrgId}`);
        bc.postMessage({
          type: "REQUEST_ADMISSION",
          userId: effectiveUserId,
          userName: effectiveName,
          role: user ? activeMember?.role || "Member" : "Guest"
        });
        bc.close();
      } catch (err) {}
    }
  };

  // Handle Join By Code Input
  const handleJoinByCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const formatted = formatMeetingCodeInput(manualCodeInput);
    if (!formatted || formatted.length < 3) {
      addToast("Please enter a valid meeting code (format xxx-xxx)", "error");
      return;
    }

    setIsSearchingCode(true);
    try {
      // First check if current active meeting matches this code
      if (
        activeMeet &&
        (activeMeet.meetingCode?.toLowerCase() === formatted ||
          activeMeet.meetingId.toLowerCase() === formatted)
      ) {
        addToast(`Found active meeting "${activeMeet.meetingTitle}"!`, "success");
        handleJoinClick();
        return;
      }

      // Query active meeting from server by code
      const res = await fetch(`/api/meet/active?code=${encodeURIComponent(formatted)}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.activeMeet) {
          setActiveMeet(data.activeMeet);
          addToast(`Found meeting "${data.activeMeet.meetingTitle}"!`, "success");
          return;
        }
      }

      addToast(`No active meeting found for code "${formatted}". Please verify the code with your host.`, "error");
    } catch (err) {
      addToast("Failed to verify meeting code. Please check your network connection.", "error");
    } finally {
      setIsSearchingCode(false);
    }
  };

  // Open Create Modal with fresh code
  const handleOpenCreateModal = () => {
    setNewMeetTitle(`${targetOrg.name} Live Sync`);
    setNewMeetCode(generateMeetingCode());
    setNewMeetIsPublic(true);
    setAutoBroadcastToChat(true);
    setIsCreateModalOpen(true);
  };

  // Handle Confirmed Meeting Creation
  const handleCreateNewMeet = async () => {
    setIsCreatingMeet(true);
    const code = formatMeetingCodeInput(newMeetCode) || generateMeetingCode();
    const title = newMeetTitle.trim() || `${targetOrg.name} Live Meeting`;

    const newMeet: HostedMeetInfo = {
      meetingId: `meet-${Date.now()}`,
      meetingCode: code,
      meetingTitle: title,
      channelName: "General",
      channelId: generalChannel?.id,
      orgId: targetOrg.id,
      hostId: user?.id || "host",
      hostName: user?.full_name || "Host",
      startedAt: new Date().toISOString(),
      isPublic: newMeetIsPublic
    };

    try {
      await fetch("/api/meet/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: targetOrg.id, meet: newMeet })
      });

      // Automatically broadcast meeting code and link to General Chat channel if toggled
      if (autoBroadcastToChat && user) {
        const directJoinUrl = `${window.location.origin}/meet?org=${targetOrg.id}&code=${code}`;
        const broadcastText = `Live Meeting Started: "${title}"\nMeeting Code: ${code}\nJoin Link: ${directJoinUrl}`;

        if (generalChannel?.id) {
          try {
            await sendChatMessage.mutateAsync({
              channelId: generalChannel.id,
              senderId: user.id,
              senderName: user.full_name,
              text: broadcastText,
              message_type: "text"
            });
            addToast(`Broadcasted meeting code to #${generalChannel.name || "General"} chat`, "success");
          } catch (chatErr) {
            console.warn("[MeetRoomPage] Chat broadcast error:", chatErr);
          }
        }

        // Also post to local BroadcastChannel for live tabs
        try {
          const chatBc = new BroadcastChannel(`impacto_chat_bus_${targetOrg.id}`);
          chatBc.postMessage({
            type: "NEW_MESSAGE",
            channelId: generalChannel?.id || "general",
            message: {
              id: `msg-meet-${Date.now()}`,
              channel_id: generalChannel?.id || "general",
              sender_id: user.id,
              sender_name: user.full_name,
              text: broadcastText,
              created_at: new Date().toISOString()
            }
          });
          chatBc.close();
        } catch (bcErr) {}
      }

      // Persist meeting record in Supabase DB if available
      if (isSupabaseConfigured) {
        try {
          await supabase.from("meetings").insert({
            id: newMeet.meetingId,
            org_id: newMeet.orgId,
            title: newMeet.meetingTitle,
            meeting_code: code,
            channel_name: newMeet.channelName,
            status: "active",
            is_public: newMeetIsPublic,
            started_at: newMeet.startedAt
          });
        } catch (dbErr) {}
      }

      setActiveMeet(newMeet);
      setIsCreateModalOpen(false);
      setInCall(true);
      addToast(`Meeting started with code ${code}`, "success");
    } catch (e) {
      addToast("Failed to initialize meeting room", "error");
    } finally {
      setIsCreatingMeet(false);
    }
  };

  const copyMeetingCode = () => {
    const code = activeMeet?.meetingCode || activeMeet?.meetingId;
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(true);
      addToast(`Meeting code ${code} copied to clipboard`, "success");
      setTimeout(() => setCopiedCode(false), 2000);
    }).catch(() => {
      addToast("Failed to copy meeting code", "error");
    });
  };

  const copyMeetingLink = () => {
    const targetOrgId = activeMeet?.orgId || targetOrg.id;
    const codeParam = activeMeet?.meetingCode ? `&code=${encodeURIComponent(activeMeet.meetingCode)}` : "";
    const url = `${window.location.origin}/meet?org=${targetOrgId}${codeParam}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      addToast("Meeting link copied to clipboard", "success");
      setTimeout(() => setCopiedLink(false), 2000);
    }).catch(() => {
      addToast("Failed to copy meeting link", "error");
    });
  };

  return (
    <div className="min-h-screen bg-[#121316] text-[#e3e3e3] flex flex-col font-sans select-none">
      {/* Top minimal header */}
      <header className="h-14 px-4 sm:px-8 border-b border-[#2d2e31] flex items-center justify-between bg-[#1a1b1e]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 text-xs text-[#9aa0a6] hover:text-white transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Dashboard</span>
          </button>
          <span className="text-[#3c4043]">|</span>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#81c995] animate-pulse" />
            <span className="font-bold text-sm text-white">{targetOrg.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#282a2d] hover:bg-[#3c4043] text-xs font-semibold text-white border border-[#3c4043] transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 text-[#81c995]" />
              <span>New Meeting</span>
            </button>
          )}

          {user && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-[#9aa0a6]">
              <span>
                Signed in as <strong className="text-white">{user.full_name}</strong>
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Main Entrance Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        {waitingForAdmission ? (
          <div className="max-w-md w-full bg-[#1a1b1e] border border-[#2d2e31] rounded-2xl p-6 sm:p-8 text-center flex flex-col items-center gap-5 shadow-2xl animate-in fade-in">
            <div className="h-16 w-16 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center animate-pulse">
              <Clock className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Waiting Room</h2>
              <p className="text-xs text-[#9aa0a6] mt-1.5 leading-relaxed">
                You have asked to join <strong className="text-white">"{activeMeet?.meetingTitle || "Live Meeting"}"</strong>.
                The meeting host has been notified and will admit you shortly.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setWaitingForAdmission(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#282a2d] hover:bg-[#3c4043] text-white transition cursor-pointer"
            >
              Cancel Request
            </button>
          </div>
        ) : activeMeet ? (
          /* Join Card for Active Meeting */
          <div className="max-w-xl w-full bg-[#1a1b1e] border border-[#2d2e31] rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col gap-5 animate-in fade-in">
            <div className="flex items-start justify-between border-b border-[#2d2e31] pb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#81c995] bg-[#133020] px-2.5 py-0.5 rounded-full border border-[#1e4620] mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#81c995] animate-ping" />
                  Meeting in Progress
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">
                  {activeMeet.meetingTitle}
                </h2>
                <p className="text-xs text-[#9aa0a6] mt-1">
                  Hosted by {activeMeet.hostName} • Started{" "}
                  {new Date(activeMeet.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>

            {/* PROMINENT MEETING CODE & DIRECT LINK DISPLAY */}
            <div className="bg-[#1e2023] border border-[#2d2e31] rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-inner">
              {/* Meeting Code Badge */}
              <div className="flex items-center justify-between sm:justify-start gap-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold tracking-wider text-[#9aa0a6] uppercase">Meeting Code</span>
                  <span className="text-lg font-mono font-bold tracking-widest text-[#81c995]">
                    {activeMeet.meetingCode || "xxx-xxx"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={copyMeetingCode}
                  className="px-2.5 py-1.5 rounded-lg bg-[#282a2d] hover:bg-[#3c4043] text-[#e3e3e3] border border-[#3c4043] transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                  title="Copy unique meeting code"
                >
                  {copiedCode ? <Check className="h-3.5 w-3.5 text-[#81c995]" /> : <Copy className="h-3.5 w-3.5 text-[#81c995]" />}
                  <span>{copiedCode ? "Copied" : "Copy Code"}</span>
                </button>
              </div>

              <div className="hidden sm:block h-8 w-px bg-[#2d2e31]" />

              {/* Direct Meeting Link */}
              <div className="flex items-center justify-between sm:justify-end gap-3">
                <div className="flex flex-col truncate max-w-[190px]">
                  <span className="text-[10px] font-bold tracking-wider text-[#9aa0a6] uppercase">Direct Link</span>
                  <span className="text-xs font-mono text-[#9aa0a6] truncate">
                    /meet?code={activeMeet.meetingCode || "..."}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={copyMeetingLink}
                  className="px-2.5 py-1.5 rounded-lg bg-[#282a2d] hover:bg-[#3c4043] text-[#e3e3e3] border border-[#3c4043] transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                  title="Copy full shareable meeting URL"
                >
                  {copiedLink ? <Check className="h-3.5 w-3.5 text-[#81c995]" /> : <Copy className="h-3.5 w-3.5 text-[#81c995]" />}
                  <span>{copiedLink ? "Copied" : "Copy Link"}</span>
                </button>
              </div>
            </div>

            {/* If not logged in, ask for guest name */}
            {!user && (
              <form onSubmit={handleJoinClick} className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#e3e3e3]">Your Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Enter your name (e.g., Jean Dupont)"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full bg-[#282a2d] border border-[#3c4043] text-white text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-[#81c995] transition"
                />
                <p className="text-[11px] text-[#9aa0a6]">
                  This name will identify you in the video room and chat messages.
                </p>
              </form>
            )}

            {/* Real-Time Hardware Availability Visual Indicator */}
            <div className="p-3.5 bg-[#1e2023] border border-[#2d2e31] rounded-xl text-xs space-y-2">
              <div className="flex items-center justify-between font-bold text-white">
                <span>Hardware Availability Status</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                    hardwareStatus.checked
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-400"
                  }`}
                >
                  {hardwareStatus.checked ? "Detected" : "Checking..."}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-[#282a2d] border border-[#3c4043]">
                  <Video
                    className={`h-3.5 w-3.5 ${hardwareStatus.camera ? "text-emerald-400" : "text-amber-400"}`}
                  />
                  <span className="text-[#e3e3e3]">
                    Camera:{" "}
                    <strong className={hardwareStatus.camera ? "text-emerald-400" : "text-amber-400"}>
                      {hardwareStatus.camera ? "Available" : "Not Detected"}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-[#282a2d] border border-[#3c4043]">
                  <Mic
                    className={`h-3.5 w-3.5 ${hardwareStatus.microphone ? "text-emerald-400" : "text-amber-400"}`}
                  />
                  <span className="text-[#e3e3e3]">
                    Microphone:{" "}
                    <strong className={hardwareStatus.microphone ? "text-emerald-400" : "text-amber-400"}>
                      {hardwareStatus.microphone ? "Available" : "Not Detected"}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Audio / Video default notice & Hardware permission request test */}
            <div className="p-3.5 bg-[#282a2d] border border-[#3c4043] rounded-xl text-xs text-[#9aa0a6] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <ShieldCheck className="h-4 w-4 text-[#81c995]" />
                  <span>Camera & Mic Hardware Check</span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      if (!navigator.mediaDevices?.getUserMedia) {
                        addToast("Media devices not supported by your device.", "error");
                        return;
                      }
                      const stream = await navigator.mediaDevices.getUserMedia({
                        video: { facingMode: "user" },
                        audio: true
                      });
                      stream.getTracks().forEach((t) => t.stop());
                      addToast("Camera and microphone permission successfully granted and verified!", "success");
                    } catch (err: any) {
                      addToast(
                        "Hardware access was blocked or denied. Please check your browser or mobile device permissions.",
                        "error"
                      );
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#3c4043] hover:bg-[#4f5358] text-white text-[11px] font-bold transition cursor-pointer"
                >
                  Test Hardware
                </button>
              </div>
              <p className="text-[11px] leading-relaxed">
                By default, your microphone and camera start OFF when you join. You can test your camera and microphone access above at any time.
              </p>
            </div>

            {/* Live Media Preview Viewport */}
            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-[#121316] border border-[#2d2e31] flex items-center justify-center shadow-inner">
              {isScreenSharing || previewVideo ? (
                <video
                  ref={previewVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${
                    isScreenSharing ? "object-contain bg-black" : "-scale-x-100"
                  }`}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-[#9aa0a6] gap-2 p-4 text-center">
                  <div className="h-12 w-12 rounded-full bg-[#282a2d] flex items-center justify-center text-[#5f6368]">
                    <VideoOff className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-medium">Camera and screen share are turned off</span>
                  <span className="text-[11px] text-[#5f6368]">
                    Turn on camera or share screen below to preview before joining
                  </span>
                </div>
              )}

              {/* Status Badges Overlay */}
              <div className="absolute top-2.5 left-2.5 flex flex-wrap items-center gap-1.5">
                {isScreenSharing && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-500/90 text-white flex items-center gap-1 shadow">
                    <Monitor className="h-3 w-3" />
                    <span>Screen Share Active</span>
                  </span>
                )}
                {previewVideo && !isScreenSharing && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#133020]/90 text-[#81c995] border border-[#1e4620] flex items-center gap-1 shadow">
                    <Video className="h-3 w-3" />
                    <span>Camera Live</span>
                  </span>
                )}
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow ${
                    previewMic
                      ? "bg-[#133020]/90 text-[#81c995] border border-[#1e4620]"
                      : "bg-[#ea4335]/90 text-white"
                  }`}
                >
                  {previewMic ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
                  <span>{previewMic ? "Mic Active" : "Mic Muted"}</span>
                </span>
              </div>
            </div>

            {/* Local Stream Controls: Mute Microphone, Disable Camera, and Share Screen */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleTogglePreviewMic}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                  previewMic
                    ? "bg-[#3c4043] text-white hover:bg-[#474a4d] border border-emerald-500/40"
                    : "bg-[#ea4335]/20 text-[#f28b82] border border-[#ea4335]/30 hover:bg-[#ea4335]/30"
                }`}
              >
                {previewMic ? <Mic className="h-4 w-4 text-[#81c995]" /> : <MicOff className="h-4 w-4 text-[#f28b82]" />}
                <span>{previewMic ? "Mute Mic" : "Mic On"}</span>
              </button>

              <button
                type="button"
                onClick={handleTogglePreviewVideo}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                  previewVideo
                    ? "bg-[#3c4043] text-white hover:bg-[#474a4d] border border-emerald-500/40"
                    : "bg-[#ea4335]/20 text-[#f28b82] border border-[#ea4335]/30 hover:bg-[#ea4335]/30"
                }`}
              >
                {previewVideo ? <Video className="h-4 w-4 text-[#81c995]" /> : <VideoOff className="h-4 w-4 text-[#f28b82]" />}
                <span>{previewVideo ? "Disable Cam" : "Camera On"}</span>
              </button>

              <button
                type="button"
                onClick={handleShareScreen}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                  isScreenSharing
                    ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-500/30"
                    : "bg-[#282a2d] hover:bg-[#3c4043] text-[#e3e3e3] border border-[#3c4043]"
                }`}
              >
                <Monitor className={`h-4 w-4 ${isScreenSharing ? "text-sky-400" : "text-[#9aa0a6]"}`} />
                <span>{isScreenSharing ? "Stop Sharing" : "Share Screen"}</span>
              </button>
            </div>

            {/* Join Button */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleJoinClick()}
                className="w-full py-3 rounded-xl bg-[#81c995] hover:bg-[#a8dab5] text-[#0d2818] font-bold text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Video className="h-4 w-4" />
                <span>Join Meeting Now</span>
              </button>
            </div>

            {/* Secondary Option: Join another meeting by code */}
            <div className="pt-2 border-t border-[#2d2e31]">
              <form onSubmit={handleJoinByCode} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9aa0a6]" />
                  <input
                    type="text"
                    placeholder="Enter code (xxx-xxx) to switch room"
                    value={manualCodeInput}
                    onChange={(e) => setManualCodeInput(formatMeetingCodeInput(e.target.value))}
                    className="w-full bg-[#282a2d] border border-[#3c4043] text-white text-xs pl-9 pr-3 py-2 rounded-xl outline-none focus:border-[#81c995] font-mono tracking-wider transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearchingCode || !manualCodeInput.trim()}
                  className="px-3.5 py-2 rounded-xl bg-[#282a2d] hover:bg-[#3c4043] disabled:opacity-50 text-white text-xs font-semibold border border-[#3c4043] transition cursor-pointer"
                >
                  {isSearchingCode ? "Searching..." : "Switch"}
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* No Active Meeting State - Join by Code & Start Meeting Cards */
          <div className="max-w-md w-full bg-[#1a1b1e] border border-[#2d2e31] rounded-2xl p-6 sm:p-8 flex flex-col gap-5 shadow-2xl">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="h-14 w-14 rounded-full bg-[#282a2d] text-[#9aa0a6] flex items-center justify-center">
                <VideoOff className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">No Active Meeting</h2>
                <p className="text-xs text-[#9aa0a6] mt-1 leading-relaxed">
                  There is currently no ongoing meeting for <strong className="text-white">{targetOrg.name}</strong>.
                  Join an existing room using a code, or start a new meeting below.
                </p>
              </div>
            </div>

            {/* JOIN BY MEETING CODE SECTION */}
            <div className="bg-[#1e2023] border border-[#2d2e31] rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <KeyRound className="h-4 w-4 text-[#81c995]" />
                <span>Join with Meeting Code</span>
              </div>
              <p className="text-[11px] text-[#9aa0a6] leading-relaxed">
                Got an invitation code from a teammate? Enter the 6-character code (xxx-xxx) to connect.
              </p>

              <form onSubmit={handleJoinByCode} className="flex flex-col gap-2.5">
                <input
                  type="text"
                  maxLength={7}
                  placeholder="e.g. k8m-42p"
                  value={manualCodeInput}
                  onChange={(e) => setManualCodeInput(formatMeetingCodeInput(e.target.value))}
                  className="w-full bg-[#282a2d] border border-[#3c4043] text-white font-mono text-center text-sm py-2.5 px-3 rounded-xl tracking-widest outline-none focus:border-[#81c995] transition"
                />
                <button
                  type="submit"
                  disabled={isSearchingCode || !manualCodeInput.trim()}
                  className="w-full py-2.5 rounded-xl bg-[#3c4043] hover:bg-[#4a4e53] disabled:opacity-50 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <ArrowRight className="h-3.5 w-3.5 text-[#81c995]" />
                  <span>{isSearchingCode ? "Looking up Room..." : "Join with Code"}</span>
                </button>
              </form>
            </div>

            {/* Hardware Previews and Start Button for Signed-In Users */}
            {user ? (
              <div className="w-full flex flex-col gap-3 pt-1">
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={handleTogglePreviewMic}
                    className={`p-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 border transition cursor-pointer ${
                      previewMic
                        ? "bg-[#133020] text-[#81c995] border-[#1e4620]"
                        : "bg-[#282a2d] text-[#9aa0a6] border-[#3c4043]"
                    }`}
                  >
                    {previewMic ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
                    <span>{previewMic ? "Mic On" : "Muted"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleTogglePreviewVideo}
                    className={`p-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 border transition cursor-pointer ${
                      previewVideo
                        ? "bg-[#133020] text-[#81c995] border-[#1e4620]"
                        : "bg-[#282a2d] text-[#9aa0a6] border-[#3c4043]"
                    }`}
                  >
                    {previewVideo ? <Video className="h-3 w-3" /> : <VideoOff className="h-3 w-3" />}
                    <span>{previewVideo ? "Cam On" : "Cam Off"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleShareScreen}
                    className={`p-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 border transition cursor-pointer ${
                      isScreenSharing
                        ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                        : "bg-[#282a2d] text-[#9aa0a6] border-[#3c4043]"
                    }`}
                  >
                    <Monitor className="h-3 w-3" />
                    <span>{isScreenSharing ? "Screen On" : "Screen"}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="w-full py-3 rounded-xl bg-[#81c995] hover:bg-[#a8dab5] text-[#0d2818] font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-md"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create & Start New Meeting</span>
                </button>
              </div>
            ) : (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="text-xs text-[#81c995] hover:underline"
                >
                  Sign in to host and start a new live meeting
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* CREATE NEW MEETING MODAL WITH AUTO-BROADCAST TOGGLE */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="max-w-md w-full bg-[#1a1b1e] border border-[#2d2e31] rounded-2xl shadow-2xl p-6 flex flex-col gap-5 text-left animate-in zoom-in-95">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#2d2e31] pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Video className="h-4 w-4 text-[#81c995]" />
                  <span>Create New Meeting</span>
                </h3>
                <p className="text-xs text-[#9aa0a6] mt-0.5">
                  Generate room details for {targetOrg.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[#282a2d] text-[#9aa0a6] hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Meeting Title Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#e3e3e3]">Meeting Title</label>
              <input
                type="text"
                value={newMeetTitle}
                onChange={(e) => setNewMeetTitle(e.target.value)}
                placeholder="e.g. Weekly Strategy Sync"
                className="w-full bg-[#282a2d] border border-[#3c4043] text-white text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-[#81c995] transition"
              />
            </div>

            {/* Auto-Generated Unique Meeting Code (xxx-xxx) */}
            <div className="p-3.5 bg-[#1e2023] border border-[#2d2e31] rounded-xl flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold tracking-wider text-[#9aa0a6] uppercase">Unique Meeting Code</span>
                <span className="text-base font-mono font-bold tracking-widest text-[#81c995]">
                  {newMeetCode}
                </span>
                <span className="text-[11px] text-[#9aa0a6]">Auto-generated 6-character identifier</span>
              </div>
              <button
                type="button"
                onClick={() => setNewMeetCode(generateMeetingCode())}
                className="p-2 rounded-xl bg-[#282a2d] hover:bg-[#3c4043] text-[#e3e3e3] border border-[#3c4043] transition cursor-pointer flex items-center gap-1.5 text-xs"
                title="Generate another meeting code"
              >
                <RefreshCw className="h-3.5 w-3.5 text-[#81c995]" />
                <span className="text-[11px] font-medium">Regenerate</span>
              </button>
            </div>

            {/* Room Access Mode */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#e3e3e3]">Access Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewMeetIsPublic(true)}
                  className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition cursor-pointer ${
                    newMeetIsPublic
                      ? "bg-[#133020] border-[#1e4620] text-[#81c995]"
                      : "bg-[#282a2d] border-[#3c4043] text-[#9aa0a6] hover:text-white"
                  }`}
                >
                  <Globe className="h-3.5 w-3.5 shrink-0" />
                  <div className="text-left">
                    <div className="font-bold">Public</div>
                    <div className="text-[10px] opacity-75">Instant join</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setNewMeetIsPublic(false)}
                  className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition cursor-pointer ${
                    !newMeetIsPublic
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                      : "bg-[#282a2d] border-[#3c4043] text-[#9aa0a6] hover:text-white"
                  }`}
                >
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  <div className="text-left">
                    <div className="font-bold">Private</div>
                    <div className="text-[10px] opacity-75">Requires admission</div>
                  </div>
                </button>
              </div>
            </div>

            {/* AUTO BROADCAST TO GENERAL CHAT CHECKBOX */}
            <div className="p-3.5 bg-[#282a2d] border border-[#3c4043] rounded-xl flex items-start gap-3">
              <input
                type="checkbox"
                id="autoBroadcastToggle"
                checked={autoBroadcastToChat}
                onChange={(e) => setAutoBroadcastToChat(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-600 text-[#81c995] focus:ring-[#81c995] accent-[#81c995] cursor-pointer"
              />
              <label htmlFor="autoBroadcastToggle" className="cursor-pointer">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <MessageSquare className="h-3.5 w-3.5 text-[#81c995]" />
                  <span>Auto-send code & link to General Chat</span>
                </div>
                <p className="text-[11px] text-[#9aa0a6] mt-0.5 leading-relaxed">
                  Automatically broadcasts meeting code <strong className="text-white font-mono">{newMeetCode}</strong> and a one-click join link to #{generalChannel?.name || "General"} so members can immediately hop in.
                </p>
              </label>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#2d2e31]">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#282a2d] hover:bg-[#3c4043] text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isCreatingMeet}
                onClick={handleCreateNewMeet}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#81c995] hover:bg-[#a8dab5] text-[#0d2818] transition shadow cursor-pointer flex items-center gap-1.5"
              >
                <Video className="h-3.5 w-3.5" />
                <span>{isCreatingMeet ? "Starting..." : "Start & Join Room"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* The Unified Video Room Modal */}
      {inCall && (
        <ChatVideoMeetModal
          open={inCall}
          onClose={() => setInCall(false)}
          channelName={activeMeet?.channelName || "General"}
          meetingTitle={activeMeet?.meetingTitle || "Live Meeting"}
          activeOrg={activeMeet?.orgId ? { ...targetOrg, id: activeMeet.orgId } : targetOrg}
          activeMember={activeMember || (guestUser as any) || undefined}
          members={orgMembers as any}
          documents={dbDocs as any}
          hostedMeetInfo={activeMeet}
          guestUser={guestUser || undefined}
          initialMic={previewMic}
          initialVideo={previewVideo}
          initialScreenShare={isScreenSharing}
          initialScreenStream={screenStream}
          initialLocalStream={isScreenSharing ? screenStream : previewStream}
          onHostedMeetEnded={() => {
            setActiveMeet(null);
            setInCall(false);
          }}
        />
      )}
    </div>
  );
};

class MeetErrorBoundary extends React.Component<any, any> {
  state = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn("MeetRoomPage media/render error boundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#121316] text-white flex flex-col items-center justify-center p-6 font-sans select-none">
          <div className="max-w-md w-full bg-[#1a1b1e] border border-[#2d2e31] rounded-2xl p-8 text-center flex flex-col items-center gap-5 shadow-2xl">
            <div className="h-16 w-16 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Media Stream Initialization Failed</h2>
              <p className="text-xs text-[#9aa0a6] mt-2 leading-relaxed">
                An error occurred while initializing camera or microphone hardware streams or connecting to the live meeting room.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                window.location.reload();
              }}
              className="w-full py-3 rounded-xl bg-[#81c995] hover:bg-[#a8dab5] text-[#0d2818] font-bold text-sm transition shadow-md cursor-pointer"
            >
              Attempt Reconnect & Request Permissions
            </button>
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

export default function WrappedMeetRoomPage() {
  return (
    <MeetErrorBoundary>
      <MeetRoomPage />
    </MeetErrorBoundary>
  );
}
