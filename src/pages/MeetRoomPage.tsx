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
  X,
  Wifi
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
import {
  ChatVideoMeetModal,
  getCanonicalMeetRoomId,
  isMeetHostOrAdmin
} from "../components/ChatVideoMeetModal";
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

export function isSameMeetMeta(a: HostedMeetInfo | null, b: HostedMeetInfo | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.meetingId === b.meetingId &&
    a.meetingCode === b.meetingCode &&
    a.meetingTitle === b.meetingTitle &&
    a.orgId === b.orgId &&
    a.hostId === b.hostId &&
    a.isPublic === b.isPublic &&
    a.startedAt === b.startedAt
  );
}

const MEET_SELECT_COLUMNS =
  "id, org_id, title, meeting_title, meeting_code, channel_name, channel_id, host_id, host_name, recorded_by, started_at, is_public";

function mapDbRowToHostedMeet(dbMeet: any, fallbackOrgId: string, fallbackCode?: string): HostedMeetInfo {
  return {
    meetingId: dbMeet.id,
    meetingCode: dbMeet.meeting_code || fallbackCode || undefined,
    meetingTitle: dbMeet.title || dbMeet.meeting_title || "Live Meeting",
    channelName: dbMeet.channel_name || "General",
    channelId: dbMeet.channel_id || undefined,
    orgId: dbMeet.org_id || fallbackOrgId,
    hostId: dbMeet.host_id || dbMeet.recorded_by || "host",
    hostName: dbMeet.host_name || "Host",
    startedAt: dbMeet.started_at || new Date().toISOString(),
    isPublic: dbMeet.is_public ?? true
  };
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

  // Only treat user as an internal member if authenticated AND belongs to this target organization
  const isAuthenticatedOrgMember = Boolean(
    user &&
      activeMember &&
      (!targetOrg.id || targetOrg.id === "default" || !activeMember.org_id || activeMember.org_id === targetOrg.id)
  );

  // Never query internal member rosters, documents, or chat channels for external link joiners
  const { data: orgMembers = [] } = useMembers(isAuthenticatedOrgMember ? targetOrg.id : undefined);
  const { data: dbDocs = [] } = useV2Documents(isAuthenticatedOrgMember ? targetOrg.id : undefined);
  const { data: chatChannels = [] } = useChatChannels(isAuthenticatedOrgMember ? targetOrg.id : undefined);
  const sendChatMessage = useSendChatMessage();

  const generalChannel =
    chatChannels.find(
      (c) => c.name.toLowerCase() === "general" || c.channel_type === "general"
    ) || chatChannels[0];

  const [activeMeet, setActiveMeet] = useState<HostedMeetInfo | null>(null);
  const [loadingMeet, setLoadingMeet] = useState(true);
  const [inCall, setInCall] = useState(false);
  const [waitingForAdmission, setWaitingForAdmission] = useState(false);
  const [waitingChannelStatus, setWaitingChannelStatus] = useState<"connecting" | "connected" | "retrying">("connecting");

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

  // Display name state (required for external link/code joiners, prefilled when available)
  const [guestName, setGuestName] = useState<string>(() => {
    try {
      return user?.full_name || localStorage.getItem("impacto_meet_guest_name") || "";
    } catch (e) {
      return user?.full_name || "";
    }
  });
  const [guestUser, setGuestUser] = useState<{ id: string; full_name: string; role: string } | null>(null);

  useEffect(() => {
    if (user?.full_name && !guestName.trim()) {
      setGuestName(user.full_name);
    }
  }, [user?.full_name]);

  const inCallRef = useRef(inCall);
  inCallRef.current = inCall;
  const waitingRef = useRef(waitingForAdmission);
  waitingRef.current = waitingForAdmission;
  const checkedDroppedRef = useRef(false);
  const hasExplicitlyLeftRef = useRef(false);

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

  // Check Supabase once for recent active session participation to auto-rejoin dropped session
  useEffect(() => {
    let isMounted = true;
    const checkDroppedSession = async () => {
      const effectiveUserId = user?.id;
      if (
        !effectiveUserId ||
        !isSupabaseConfigured ||
        !activeMeet ||
        inCall ||
        checkedDroppedRef.current ||
        hasExplicitlyLeftRef.current
      ) {
        return;
      }
      checkedDroppedRef.current = true;
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
          if (Date.now() - joinedTime < 900000 && activeMeet && isMounted && !inCallRef.current && !hasExplicitlyLeftRef.current) {
            setInCall(true);
            addToast("Reconnected to your active meeting session.", "success");
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
  }, [activeMeet?.meetingId, user?.id, inCall, addToast]);

  // Support URL code parameter on load
  const codeFromQuery = searchParams.get("code");
  useEffect(() => {
    if (!codeFromQuery) return;
    const formatted = formatMeetingCodeInput(codeFromQuery);
    setManualCodeInput(formatted);

    const resolveInitialByCode = async () => {
      try {
        const res = await fetch(`/api/meet/active?code=${encodeURIComponent(formatted)}`);
        const contentType = res.headers.get("content-type") || "";
        if (res.ok && contentType.includes("application/json")) {
          const data = await res.json();
          if (data?.activeMeet) {
            setActiveMeet((prev) => (isSameMeetMeta(prev, data.activeMeet) ? prev : data.activeMeet));
            setLoadingMeet(false);
            return;
          }
        }
      } catch (e) {}

      if (isSupabaseConfigured) {
        try {
          const { data: rows } = await supabase
            .from("meetings")
            .select(MEET_SELECT_COLUMNS)
            .ilike("meeting_code", formatted)
            .eq("status", "active")
            .order("started_at", { ascending: false })
            .limit(1);
          if (rows && rows.length > 0) {
            const mapped = mapDbRowToHostedMeet(rows[0], orgIdFromParam, formatted);
            setActiveMeet((prev) => (isSameMeetMeta(prev, mapped) ? prev : mapped));
            setLoadingMeet(false);
          }
        } catch (err) {}
      }
    };
    resolveInitialByCode();
  }, [codeFromQuery, orgIdFromParam]);

  // Poll for active meet state from backend + Supabase Realtime bus + Supabase DB fallback
  // Pauses HTTP/DB polling while inCall or waitingForAdmission to avoid object churn and save Supabase egress
  useEffect(() => {
    let isMounted = true;
    const fetchActive = async () => {
      if (inCallRef.current || waitingRef.current) return;

      try {
        const query = codeFromQuery
          ? `orgId=${encodeURIComponent(orgIdFromParam)}&code=${encodeURIComponent(formatMeetingCodeInput(codeFromQuery))}`
          : `orgId=${encodeURIComponent(orgIdFromParam)}`;
        const res = await fetch(`/api/meet/active?${query}`);
        const contentType = res.headers.get("content-type") || "";
        if (res.ok && contentType.includes("application/json")) {
          const data = await res.json();
          if (data.activeMeet) {
            if (isMounted) {
              setActiveMeet((prev) => (isSameMeetMeta(prev, data.activeMeet) ? prev : data.activeMeet));
              setLoadingMeet(false);
            }
            return;
          }
        }
      } catch (e) {}

      // Supabase DB fallback: match by meeting code when present, otherwise by org_id + active status
      if (isSupabaseConfigured) {
        try {
          let dbMeet: any = null;
          if (codeFromQuery) {
            const formatted = formatMeetingCodeInput(codeFromQuery);
            const { data: codeRows } = await supabase
              .from("meetings")
              .select(MEET_SELECT_COLUMNS)
              .ilike("meeting_code", formatted)
              .eq("status", "active")
              .order("started_at", { ascending: false })
              .limit(1);
            if (codeRows && codeRows.length > 0) dbMeet = codeRows[0];
          } else if (orgIdFromParam && orgIdFromParam !== "default") {
            const { data: rows } = await supabase
              .from("meetings")
              .select(MEET_SELECT_COLUMNS)
              .eq("org_id", orgIdFromParam)
              .eq("status", "active")
              .order("started_at", { ascending: false })
              .limit(1);
            if (rows && rows.length > 0) dbMeet = rows[0];
          }

          if (dbMeet) {
            const mapped = mapDbRowToHostedMeet(
              dbMeet,
              orgIdFromParam,
              codeFromQuery ? formatMeetingCodeInput(codeFromQuery) : undefined
            );
            if (isMounted) {
              setActiveMeet((prev) => (isSameMeetMeta(prev, mapped) ? prev : mapped));
              setLoadingMeet(false);
            }
            return;
          }
        } catch (err) {}
      }

      if (isMounted) {
        setLoadingMeet(false);
      }
    };

    fetchActive();
    const interval = setInterval(fetchActive, 15000);

    // Listen to local BroadcastChannel as well
    const bc = new BroadcastChannel(`impacto_org_meet_bus_${orgIdFromParam}`);
    bc.onmessage = (ev) => {
      if (ev.data?.type === "HOSTED_MEET_ACTIVE" && ev.data.meet) {
        setActiveMeet((prev) => (isSameMeetMeta(prev, ev.data.meet) ? prev : ev.data.meet));
      } else if (ev.data?.type === "HOSTED_MEET_ENDED") {
        setActiveMeet(null);
        setInCall(false);
        setWaitingForAdmission(false);
      }
    };

    // Listen to Supabase Realtime org meet bus for cross-device meeting lifecycle
    let orgBusChannel: any = null;
    if (isSupabaseConfigured && orgIdFromParam && orgIdFromParam !== "default") {
      try {
        orgBusChannel = supabase.channel(`impacto_org_meet_bus_${orgIdFromParam}`, {
          config: { broadcast: { self: false } }
        });
        orgBusChannel
          .on("broadcast", { event: "meet_bus" }, ({ payload }: { payload: any }) => {
            if (payload?.type === "HOSTED_MEET_ACTIVE" && payload.meet) {
              setActiveMeet((prev) => (isSameMeetMeta(prev, payload.meet) ? prev : payload.meet));
            } else if (payload?.type === "HOSTED_MEET_ENDED") {
              setActiveMeet(null);
              setInCall(false);
              setWaitingForAdmission(false);
            }
          })
          .subscribe();
      } catch (e) {}
    }

    return () => {
      isMounted = false;
      clearInterval(interval);
      bc.close();
      if (orgBusChannel) {
        try {
          supabase.removeChannel(orgBusChannel);
        } catch (e) {}
      }
    };
  }, [orgIdFromParam, codeFromQuery]);

  // Listen for admission response over Supabase Realtime + WebSocket + BroadcastChannel
  useEffect(() => {
    if (!waitingForAdmission || !activeMeet) return;
    const effectiveUserId = user?.id || guestUser?.id;
    if (!effectiveUserId) return;

    const effectiveName = user?.full_name || guestUser?.full_name || guestName.trim() || "Guest";
    const effectiveRole = user ? activeMember?.role || "Member" : "Guest";
    const targetRoomOrgId = activeMeet.orgId || orgIdFromParam;
    const canonicalRoomId = getCanonicalMeetRoomId(activeMeet, targetRoomOrgId);
    const admissionPayload = {
      type: "REQUEST_ADMISSION",
      roomId: canonicalRoomId,
      meetingCode: activeMeet.meetingCode,
      userId: effectiveUserId,
      userName: effectiveName,
      role: effectiveRole
    };

    setWaitingChannelStatus("connecting");
    let settled = false;
    let supaConnected = false;

    const handleAdmissionEvent = (msg: any) => {
      if (!msg || settled) return;
      if (msg.type === "ADMIT_PEER" && msg.userId === effectiveUserId) {
        settled = true;
        setWaitingForAdmission(false);
        setInCall(true);
        addToast("You have been admitted to the meeting!", "success");
      } else if (msg.type === "DECLINE_PEER" && msg.userId === effectiveUserId) {
        settled = true;
        setWaitingForAdmission(false);
        addToast("Your request to join this meeting was declined by the host.", "error");
      } else if (msg.type === "HOSTED_MEET_ENDED") {
        settled = true;
        setWaitingForAdmission(false);
        setActiveMeet(null);
      }
    };

    // 1. Supabase Realtime channel (canonical room key shared with ChatVideoMeetModal)
    let supaChannel: any = null;
    if (isSupabaseConfigured) {
      try {
        supaChannel = supabase.channel(`impacto_meet_rt_${canonicalRoomId}`, {
          config: { broadcast: { self: false } }
        });
        supaChannel
          .on("broadcast", { event: "signal" }, ({ payload }: { payload: any }) => {
            handleAdmissionEvent(payload);
          })
          .subscribe((status: string) => {
            if (status === "SUBSCRIBED") {
              supaConnected = true;
              setWaitingChannelStatus("connected");
              supaChannel.send({
                type: "broadcast",
                event: "signal",
                payload: admissionPayload
              });
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              supaConnected = false;
              setWaitingChannelStatus("retrying");
            }
          });
      } catch (e) {}
    }

    // 2. Keep WebSocket open on canonical roomId while in waiting room (optional when Express WS is mounted)
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/meet?roomId=${encodeURIComponent(
      canonicalRoomId
    )}&orgId=${encodeURIComponent(targetRoomOrgId)}${
      activeMeet.meetingCode ? `&meetingCode=${encodeURIComponent(activeMeet.meetingCode)}` : ""
    }&peerId=wait-${effectiveUserId}&userId=${encodeURIComponent(effectiveUserId)}&name=${encodeURIComponent(
      effectiveName
    )}&role=Waiting`;

    let ws: WebSocket | null = null;
    let wsOpened = false;
    try {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        wsOpened = true;
        setWaitingChannelStatus("connected");
        try {
          ws?.send(JSON.stringify(admissionPayload));
        } catch (e) {}
      };
      ws.onmessage = (ev) => {
        try {
          handleAdmissionEvent(JSON.parse(ev.data));
        } catch (e) {}
      };
      ws.onclose = () => {
        if (!settled && !supaConnected && !isSupabaseConfigured && wsOpened) {
          setWaitingChannelStatus("retrying");
        }
      };
    } catch (e) {}

    // 3. Same-origin BroadcastChannel on canonical room key
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(`impacto_call_room_${canonicalRoomId}`);
      bc.onmessage = (ev) => handleAdmissionEvent(ev.data);
      bc.postMessage(admissionPayload);
    } catch (e) {}

    // 4. Periodically re-announce admission request every 4s in case host joins slightly after waiting user
    const retryInterval = setInterval(() => {
      if (settled) return;
      if (supaChannel) {
        try {
          supaChannel.send({ type: "broadcast", event: "signal", payload: admissionPayload });
        } catch (e) {}
      }
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(admissionPayload));
        } catch (e) {}
      }
      fetch("/api/meet/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: targetRoomOrgId,
          roomId: canonicalRoomId,
          meetingCode: activeMeet.meetingCode,
          message: admissionPayload
        })
      }).catch(() => {});
    }, 4000);

    return () => {
      settled = true;
      clearInterval(retryInterval);
      if (supaChannel) {
        try {
          supabase.removeChannel(supaChannel);
        } catch (e) {}
      }
      if (ws) {
        try {
          ws.close();
        } catch (e) {}
      }
      if (bc) {
        try {
          bc.close();
        } catch (e) {}
      }
    };
  }, [waitingForAdmission, user?.id, user?.full_name, guestUser?.id, guestUser?.full_name, orgIdFromParam, activeMeet, activeMember?.role, guestName, addToast]);

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

  // Helper to send admission request to canonical room across HTTP + BroadcastChannel
  const dispatchAdmissionRequest = (
    meetObj: HostedMeetInfo | null,
    effectiveUserId: string,
    effectiveName: string,
    effectiveRole: string
  ) => {
    const targetRoomOrgId = meetObj?.orgId || orgIdFromParam;
    const canonicalRoomId = getCanonicalMeetRoomId(meetObj, targetRoomOrgId);
    const payload = {
      type: "REQUEST_ADMISSION",
      roomId: canonicalRoomId,
      meetingCode: meetObj?.meetingCode,
      userId: effectiveUserId,
      userName: effectiveName,
      role: effectiveRole
    };

    try {
      const bc = new BroadcastChannel(`impacto_call_room_${canonicalRoomId}`);
      bc.postMessage(payload);
      bc.close();
    } catch (err) {}

    fetch("/api/meet/signal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId: targetRoomOrgId,
        roomId: canonicalRoomId,
        meetingCode: meetObj?.meetingCode,
        message: payload
      })
    }).catch(() => {});
  };

  // Resolve validated display name so nobody joins as "You" or "Member"
  const getValidatedDisplayName = (): string | null => {
    const candidate = (guestName.trim() || user?.full_name?.trim() || "").trim();
    if (!candidate || candidate.toLowerCase() === "you") {
      addToast("Please enter your name before joining the meeting.", "error");
      return null;
    }
    try {
      localStorage.setItem("impacto_meet_guest_name", candidate);
    } catch (e) {}
    return candidate;
  };

  // Join Existing Active Meeting
  const handleJoinClick = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const effectiveName = getValidatedDisplayName();
    if (!effectiveName) return;

    hasExplicitlyLeftRef.current = false;

    let currentGuest = guestUser;
    if (!isAuthenticatedOrgMember) {
      currentGuest = {
        id: guestUser?.id || `guest-${Math.random().toString(36).substring(2, 9)}`,
        full_name: effectiveName,
        role: "Guest"
      };
      setGuestUser(currentGuest);
    }

    const effectiveUserId = (isAuthenticatedOrgMember ? user?.id : currentGuest?.id) || "guest";
    const isHostOrAdmin = isMeetHostOrAdmin(
      isAuthenticatedOrgMember ? activeMember?.role : "Guest",
      isAuthenticatedOrgMember ? user?.id : currentGuest?.id,
      activeMeet,
      (targetOrg as any)?.owner_id,
      Boolean(isAuthenticatedOrgMember && user?.is_superadmin),
      !isAuthenticatedOrgMember
    );

    if (activeMeet?.isPublic || isHostOrAdmin) {
      setInCall(true);
    } else {
      setWaitingForAdmission(true);
      dispatchAdmissionRequest(
        activeMeet,
        effectiveUserId,
        effectiveName,
        isAuthenticatedOrgMember ? activeMember?.role || "Member" : "Guest"
      );
    }
  };

  // Handle Join By Code Input with Guaranteed Room Connection
  const handleJoinByCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const formatted = formatMeetingCodeInput(manualCodeInput);
    if (!formatted || formatted.length < 3) {
      addToast("Please enter a valid meeting code (format xxx-xxx)", "error");
      return;
    }

    const effectiveName = getValidatedDisplayName();
    if (!effectiveName) return;

    hasExplicitlyLeftRef.current = false;
    setIsSearchingCode(true);
    const cleanInputCode = formatted.replace(/[^a-z0-9]/g, "").toLowerCase();

    let effectiveUserId = isAuthenticatedOrgMember ? user?.id : guestUser?.id;
    if (!isAuthenticatedOrgMember) {
      const g = {
        id: guestUser?.id || `guest-${Math.random().toString(36).substring(2, 9)}`,
        full_name: effectiveName,
        role: "Guest"
      };
      setGuestUser(g);
      effectiveUserId = g.id;
    }
    const effectiveRole = isAuthenticatedOrgMember ? activeMember?.role || "Member" : "Guest";

    const routeIntoMeet = (targetMeet: HostedMeetInfo) => {
      const isHostOrAdmin = isMeetHostOrAdmin(
        isAuthenticatedOrgMember ? activeMember?.role : "Guest",
        effectiveUserId,
        targetMeet,
        (targetOrg as any)?.owner_id,
        Boolean(isAuthenticatedOrgMember && user?.is_superadmin),
        !isAuthenticatedOrgMember
      );
      if (targetMeet.isPublic || isHostOrAdmin) {
        setInCall(true);
      } else {
        setWaitingForAdmission(true);
        dispatchAdmissionRequest(targetMeet, effectiveUserId!, effectiveName, effectiveRole);
      }
    };

    // 1. Check if local activeMeet matches this code
    if (
      activeMeet &&
      ((activeMeet.meetingCode && activeMeet.meetingCode.replace(/[^a-z0-9]/g, "").toLowerCase() === cleanInputCode) ||
        (activeMeet.meetingId && activeMeet.meetingId.replace(/[^a-z0-9]/g, "").toLowerCase() === cleanInputCode))
    ) {
      addToast(`Connecting to meeting "${activeMeet.meetingTitle}" (${formatted})...`, "success");
      routeIntoMeet(activeMeet);
      setIsSearchingCode(false);
      return;
    }

    // 2. Query active meeting from server API by code (content-type guarded for static hosting)
    try {
      const res = await fetch(`/api/meet/active?code=${encodeURIComponent(formatted)}`);
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("application/json")) {
        const data = await res.json();
        if (data?.activeMeet) {
          const targetMeet: HostedMeetInfo = data.activeMeet;
          setActiveMeet((prev) => (isSameMeetMeta(prev, targetMeet) ? prev : targetMeet));
          addToast(`Connecting to active meeting "${targetMeet.meetingTitle}" (${formatted})...`, "success");
          routeIntoMeet(targetMeet);
          setIsSearchingCode(false);
          return;
        }
      }
    } catch (apiErr) {
      console.warn("[MeetRoomPage] Active meet API lookup warning:", apiErr);
    }

    // 3. Fallback: Query Supabase database directly using narrow columns + composite index
    if (isSupabaseConfigured) {
      try {
        let dbMeet = null;
        const formattedCode = formatted.trim();

        const { data: d1 } = await supabase
          .from("meetings")
          .select(MEET_SELECT_COLUMNS)
          .ilike("meeting_code", formattedCode)
          .eq("status", "active")
          .limit(1);

        if (d1 && d1.length > 0) {
          dbMeet = d1[0];
        } else {
          const { data: d2 } = await supabase
            .from("meetings")
            .select(MEET_SELECT_COLUMNS)
            .ilike("meeting_code", cleanInputCode)
            .eq("status", "active")
            .limit(1);

          if (d2 && d2.length > 0) {
            dbMeet = d2[0];
          } else {
            const wildcardPattern =
              cleanInputCode.length >= 6 ? `%${cleanInputCode.slice(0, 3)}%${cleanInputCode.slice(3)}%` : `%${cleanInputCode}%`;
            const { data: d3 } = await supabase
              .from("meetings")
              .select(MEET_SELECT_COLUMNS)
              .ilike("meeting_code", wildcardPattern)
              .eq("status", "active")
              .limit(1);

            if (d3 && d3.length > 0) {
              dbMeet = d3[0];
            }
          }
        }

        if (dbMeet) {
          const fetchedMeet = mapDbRowToHostedMeet(dbMeet, targetOrg.id, formatted);
          setActiveMeet((prev) => (isSameMeetMeta(prev, fetchedMeet) ? prev : fetchedMeet));
          fetch("/api/meet/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orgId: fetchedMeet.orgId, meet: fetchedMeet })
          }).catch(() => {});

          addToast(`Connecting to meeting "${fetchedMeet.meetingTitle}" (${formatted})...`, "success");
          routeIntoMeet(fetchedMeet);
          setIsSearchingCode(false);
          return;
        }
      } catch (dbErr) {
        console.warn("[MeetRoomPage] Supabase meeting lookup warning:", dbErr);
      }
    }

    // 4. Guaranteed Room Connection: Reserve/create room for this code so participants connect together
    const startedIso = new Date().toISOString();
    const roomMeet: HostedMeetInfo = {
      meetingId: `meet-${cleanInputCode}-${Date.now()}`,
      meetingCode: formatted,
      meetingTitle: `${targetOrg.name} Meeting (${formatted})`,
      channelName: "General",
      channelId: generalChannel?.id,
      orgId: targetOrg.id,
      hostId: isAuthenticatedOrgMember && user?.id ? user.id : effectiveUserId || "host",
      hostName: effectiveName,
      startedAt: startedIso,
      isPublic: true
    };

    try {
      await fetch("/api/meet/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: targetOrg.id, meet: roomMeet })
      });
    } catch (e) {}

    if (isSupabaseConfigured && targetOrg.id && targetOrg.id !== "default") {
      try {
        await supabase.from("meetings").insert({
          id: roomMeet.meetingId,
          org_id: roomMeet.orgId,
          title: roomMeet.meetingTitle,
          meeting_code: formatted,
          channel_name: roomMeet.channelName,
          channel_id: roomMeet.channelId || null,
          status: "active",
          is_public: true,
          date_time: startedIso,
          duration: 60,
          location: "Online Meet",
          location_type: "online",
          host_id: roomMeet.hostId,
          host_name: roomMeet.hostName,
          recorded_by: roomMeet.hostId,
          started_at: startedIso
        });
      } catch (e) {}
    }

    setActiveMeet(roomMeet);
    setInCall(true);
    addToast(`Connected to meeting room for code "${formatted}"!`, "success");
    setIsSearchingCode(false);
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
    hasExplicitlyLeftRef.current = false;
    const code = formatMeetingCodeInput(newMeetCode) || generateMeetingCode();
    const title = newMeetTitle.trim() || `${targetOrg.name} Live Meeting`;
    const startedIso = new Date().toISOString();

    const newMeet: HostedMeetInfo = {
      meetingId: `meet-${Date.now()}`,
      meetingCode: code,
      meetingTitle: title,
      channelName: "General",
      channelId: generalChannel?.id,
      orgId: targetOrg.id,
      hostId: user?.id || "host",
      hostName: guestName.trim() || user?.full_name || "Host",
      startedAt: startedIso,
      isPublic: newMeetIsPublic
    };

    try {
      await fetch("/api/meet/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: targetOrg.id, meet: newMeet })
      });

      // Automatically broadcast meeting code and link to General Chat channel if toggled
      if (autoBroadcastToChat && user && isAuthenticatedOrgMember) {
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

      // Persist meeting record in Supabase DB with full required fields from schema/update.sql
      if (isSupabaseConfigured) {
        try {
          await supabase.from("meetings").insert({
            id: newMeet.meetingId,
            org_id: newMeet.orgId,
            title: newMeet.meetingTitle,
            meeting_code: code,
            channel_name: newMeet.channelName,
            channel_id: newMeet.channelId || null,
            status: "active",
            is_public: newMeetIsPublic,
            date_time: startedIso,
            duration: 60,
            location: "Online Meet",
            location_type: "online",
            host_id: user?.id || "host",
            host_name: newMeet.hostName,
            recorded_by: user?.id || "host",
            started_at: startedIso
          });
        } catch (dbErr) {}

        // Broadcast active meeting across devices via Supabase Realtime bus
        try {
          const orgBus = supabase.channel(`impacto_org_meet_bus_${targetOrg.id}`);
          orgBus.subscribe((status: string) => {
            if (status === "SUBSCRIBED") {
              orgBus.send({
                type: "broadcast",
                event: "meet_bus",
                payload: { type: "HOSTED_MEET_ACTIVE", meet: newMeet }
              });
              setTimeout(() => supabase.removeChannel(orgBus), 1000);
            }
          });
        } catch (e) {}
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
            <span className="w-2.5 h-2.5 rounded-full bg-[#81c995]" />
            <span className="font-bold text-sm text-white">{targetOrg.name}</span>
          </div>
          {/* Real-time Connection Status Indicator in MeetRoomPage */}
          <div className="hidden sm:flex items-center gap-1.5 ml-2">
            {inCall ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#81c995] bg-[#133020] px-2.5 py-0.5 rounded-full border border-[#1e4620]">
                <Wifi className="h-3 w-3 text-[#81c995]" />
                <span>In Call</span>
              </span>
            ) : waitingForAdmission ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                <RefreshCw className={`h-3 w-3 ${waitingChannelStatus === "connected" ? "" : "animate-spin"}`} />
                <span>
                  {waitingChannelStatus === "connected"
                    ? "Waiting for Host"
                    : waitingChannelStatus === "retrying"
                    ? "Retrying Channel..."
                    : "Connecting Room..."}
                </span>
              </span>
            ) : isSearchingCode ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Connecting...</span>
              </span>
            ) : activeMeet ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                <Wifi className="h-3 w-3 text-emerald-400" />
                <span>Ready to Join</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#9aa0a6] bg-[#282a2d] px-2.5 py-0.5 rounded-full border border-[#3c4043]">
                <span className="w-2 h-2 rounded-full bg-[#5f6368]" />
                <span>Idle</span>
              </span>
            )}
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
            <div className="h-16 w-16 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Clock className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Waiting Room</h2>
              <p className="text-xs text-[#9aa0a6] mt-1.5 leading-relaxed">
                You have asked to join <strong className="text-white">"{activeMeet?.meetingTitle || "Live Meeting"}"</strong>.
                The meeting host has been notified and will admit you shortly.
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#282a2d] border border-[#3c4043] text-[#9aa0a6]">
                <span
                  className={`w-2 h-2 rounded-full ${
                    waitingChannelStatus === "connected"
                      ? "bg-[#81c995]"
                      : waitingChannelStatus === "retrying"
                      ? "bg-amber-400"
                      : "bg-sky-400"
                  }`}
                />
                <span>
                  {waitingChannelStatus === "connected"
                    ? "Admission channel connected — awaiting host"
                    : waitingChannelStatus === "retrying"
                    ? "Signaling channel reconnecting..."
                    : "Connecting to admission channel..."}
                </span>
              </div>
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
                  <Video className="h-3 w-3 text-[#81c995]" />
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

            {/* Required Display Name right below the Meeting Code & Direct Link */}
            <form onSubmit={handleJoinClick} className="flex flex-col gap-1.5">
              <label htmlFor="meet-join-display-name" className="text-xs font-bold text-[#e3e3e3]">
                Your Name <span className="text-[#f28b82]">*</span>
              </label>
              <input
                id="meet-join-display-name"
                type="text"
                required
                placeholder="Enter your name to join with (e.g., Jean Dupont)"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full bg-[#282a2d] border border-[#3c4043] text-white text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-[#81c995] transition"
              />
              <p className="text-[11px] text-[#9aa0a6]">
                Other participants will see this name on your tile, in chat, and in the people list.
              </p>
            </form>

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
                  placeholder="Meeting code (e.g. k8m-42p)"
                  value={manualCodeInput}
                  onChange={(e) => setManualCodeInput(formatMeetingCodeInput(e.target.value))}
                  className="w-full bg-[#282a2d] border border-[#3c4043] text-white font-mono text-center text-sm py-2.5 px-3 rounded-xl tracking-widest outline-none focus:border-[#81c995] transition"
                />
                <input
                  type="text"
                  required
                  placeholder="Your Name (required to join)"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full bg-[#282a2d] border border-[#3c4043] text-white text-xs py-2.5 px-3.5 rounded-xl outline-none focus:border-[#81c995] transition"
                />
                <button
                  type="submit"
                  disabled={isSearchingCode || !manualCodeInput.trim() || !guestName.trim()}
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
          onClose={() => {
            hasExplicitlyLeftRef.current = true;
            if (previewStream) {
              previewStream.getTracks().forEach((t) => t.stop());
              setPreviewStream(null);
            }
            if (screenStream) {
              screenStream.getTracks().forEach((t) => t.stop());
              setScreenStream(null);
            }
            setPreviewMic(false);
            setPreviewVideo(false);
            setIsScreenSharing(false);
            setInCall(false);
          }}
          channelName={activeMeet?.channelName || "General"}
          meetingTitle={activeMeet?.meetingTitle || "Live Meeting"}
          activeOrg={activeMeet?.orgId ? { ...targetOrg, id: activeMeet.orgId } : targetOrg}
          activeMember={isAuthenticatedOrgMember ? activeMember : undefined}
          members={isAuthenticatedOrgMember ? (orgMembers as any) : []}
          documents={isAuthenticatedOrgMember ? (dbDocs as any) : []}
          hostedMeetInfo={activeMeet}
          displayName={guestName.trim() || user?.full_name || "Participant"}
          guestUser={
            !isAuthenticatedOrgMember
              ? guestUser || {
                  id: `guest-${Math.random().toString(36).substring(2, 9)}`,
                  full_name: guestName.trim() || "Participant",
                  role: "Guest"
                }
              : undefined
          }
          initialMic={previewMic}
          initialVideo={previewVideo}
          initialScreenShare={isScreenSharing}
          initialScreenStream={screenStream}
          initialLocalStream={isScreenSharing ? screenStream : previewStream}
          onHostedMeetEnded={() => {
            hasExplicitlyLeftRef.current = true;
            if (previewStream) {
              previewStream.getTracks().forEach((t) => t.stop());
              setPreviewStream(null);
            }
            if (screenStream) {
              screenStream.getTracks().forEach((t) => t.stop());
              setScreenStream(null);
            }
            setPreviewMic(false);
            setPreviewVideo(false);
            setIsScreenSharing(false);
            const endedOrgId = activeMeet?.orgId || targetOrg.id;
            const endedMeetId = activeMeet?.meetingId;
            if (isSupabaseConfigured && endedMeetId) {
              (async () => {
                try {
                  await supabase
                    .from("meetings")
                    .update({ status: "completed", ended_at: new Date().toISOString() })
                    .eq("id", endedMeetId);
                } catch (e) {}
              })();
            }
            fetch("/api/meet/end", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orgId: endedOrgId })
            }).catch(() => {});
            try {
              const bc = new BroadcastChannel(`impacto_org_meet_bus_${endedOrgId}`);
              bc.postMessage({ type: "HOSTED_MEET_ENDED" });
              bc.close();
            } catch (e) {}
            if (isSupabaseConfigured) {
              try {
                const orgBus = supabase.channel(`impacto_org_meet_bus_${endedOrgId}`);
                orgBus.subscribe((status: string) => {
                  if (status === "SUBSCRIBED") {
                    orgBus.send({
                      type: "broadcast",
                      event: "meet_bus",
                      payload: { type: "HOSTED_MEET_ENDED" }
                    });
                    setTimeout(() => supabase.removeChannel(orgBus), 1000);
                  }
                });
              } catch (e) {}
            }
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
