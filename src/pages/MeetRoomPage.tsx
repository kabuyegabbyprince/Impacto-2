import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import { Video, Mic, MicOff, VideoOff, Users, Clock, ShieldCheck, ArrowRight, ArrowLeft } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useOrgStore } from "../store/orgStore";
import { useOrganizations, useMembers, useV2Documents } from "../hooks/useImpactoData";
import { ChatVideoMeetModal } from "../components/ChatVideoMeetModal";
import { HostedMeetInfo } from "../types";
import { useToast } from "../components/Toast";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export const MeetRoomPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const params = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { activeOrg, activeMember } = useOrgStore();
  const { data: orgs = [] } = useOrganizations();
  const { addToast } = useToast();

  const orgIdFromParam = params.orgId || searchParams.get("org") || searchParams.get("joinMeet") || searchParams.get("meet") || activeOrg?.id || "default";

  // Target organization
  const targetOrg = orgs.find((o) => o.id === orgIdFromParam) || activeOrg || {
    id: orgIdFromParam,
    name: "Impacto Workspace",
    slug: "workspace"
  };

  const { data: orgMembers = [] } = useMembers(targetOrg.id);
  const { data: dbDocs = [] } = useV2Documents(targetOrg.id);

  const [activeMeet, setActiveMeet] = useState<HostedMeetInfo | null>(null);
  const [loadingMeet, setLoadingMeet] = useState(true);
  const [inCall, setInCall] = useState(false);
  const [waitingForAdmission, setWaitingForAdmission] = useState(false);

  // Guest input state
  const [guestName, setGuestName] = useState("");
  const [guestUser, setGuestUser] = useState<{ id: string; full_name: string; role: string } | null>(null);

  // Pre-join audio/video preview toggles
  const [previewMic, setPreviewMic] = useState(false);
  const [previewVideo, setPreviewVideo] = useState(false);

  // Hardware availability status for visual indicator
  const [hardwareStatus, setHardwareStatus] = useState<{ camera: boolean; microphone: boolean; checked: boolean }>({
    camera: false,
    microphone: false,
    checked: false
  });

  useEffect(() => {
    let isMounted = true;
    const checkDevices = async () => {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) {
          if (isMounted) setHardwareStatus({ camera: false, microphone: false, checked: true });
          return;
        }
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCam = devices.some(d => d.kind === "videoinput");
        const hasMic = devices.some(d => d.kind === "audioinput");
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

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/meet?orgId=${encodeURIComponent(orgIdFromParam)}&peerId=wait-${effectiveUserId}&userId=${encodeURIComponent(effectiveUserId)}&name=${encodeURIComponent(user?.full_name || guestName)}&role=Waiting`;
    
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

    const bc = new BroadcastChannel(`impacto_call_org_${orgIdFromParam}`);
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
  }, [waitingForAdmission, user?.id, guestUser?.id, orgIdFromParam, guestName, addToast]);

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
      // Dispatch admission request to room
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws/meet?orgId=${encodeURIComponent(orgIdFromParam)}&peerId=wait-${effectiveUserId}&userId=${encodeURIComponent(effectiveUserId)}&name=${encodeURIComponent(effectiveName)}&role=Guest`;
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
        const bc = new BroadcastChannel(`impacto_call_org_${orgIdFromParam}`);
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

  const handleCreateNewMeet = async (title: string, isPublic: boolean) => {
    const newMeet: HostedMeetInfo = {
      meetingId: `meet-${Date.now()}`,
      meetingTitle: title.trim() || "Live Meeting",
      channelName: "General",
      orgId: targetOrg.id,
      hostId: user?.id || "host",
      hostName: user?.full_name || "Host",
      startedAt: new Date().toISOString(),
      isPublic
    };

    try {
      await fetch("/api/meet/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: targetOrg.id, meet: newMeet })
      });
    } catch (e) {}

    setActiveMeet(newMeet);
    setInCall(true);
  };

  const isHost = activeMeet?.hostId === user?.id || activeMember?.role === "org_admin";

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

        {user && (
          <div className="flex items-center gap-2 text-xs text-[#9aa0a6]">
            <span>Signed in as <strong className="text-white">{user.full_name}</strong></span>
          </div>
        )}
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
          <div className="max-w-lg w-full bg-[#1a1b1e] border border-[#2d2e31] rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6 animate-in fade-in">
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
                  Hosted by {activeMeet.hostName} • Started {new Date(activeMeet.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>

            {/* If not logged in, ask for guest name */}
            {!user && (
              <form onSubmit={handleJoinClick} className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#e3e3e3]">
                  Your Full Name
                </label>
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
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${hardwareStatus.checked ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/20 text-amber-400"}`}>
                  {hardwareStatus.checked ? "Detected" : "Checking..."}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-[#282a2d] border border-[#3c4043]">
                  <Video className={`h-3.5 w-3.5 ${hardwareStatus.camera ? "text-emerald-400" : "text-amber-400"}`} />
                  <span className="text-[#e3e3e3]">Camera: <strong className={hardwareStatus.camera ? "text-emerald-400" : "text-amber-400"}>{hardwareStatus.camera ? "Available" : "Not Detected"}</strong></span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-[#282a2d] border border-[#3c4043]">
                  <Mic className={`h-3.5 w-3.5 ${hardwareStatus.microphone ? "text-emerald-400" : "text-amber-400"}`} />
                  <span className="text-[#e3e3e3]">Microphone: <strong className={hardwareStatus.microphone ? "text-emerald-400" : "text-amber-400"}>{hardwareStatus.microphone ? "Available" : "Not Detected"}</strong></span>
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
                      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true });
                      stream.getTracks().forEach(t => t.stop());
                      addToast("Camera and microphone permission successfully granted and verified!", "success");
                    } catch (err: any) {
                      addToast("Hardware access was blocked or denied. Please check your browser or mobile device permissions.", "error");
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

            {/* Join Button */}
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleJoinClick()}
                className="w-full py-3 rounded-xl bg-[#81c995] hover:bg-[#a8dab5] text-[#0d2818] font-bold text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Video className="h-4 w-4" />
                <span>Join Meeting Now</span>
              </button>
            </div>
          </div>
        ) : (
          /* No Active Meeting State */
          <div className="max-w-md w-full bg-[#1a1b1e] border border-[#2d2e31] rounded-2xl p-6 sm:p-8 text-center flex flex-col items-center gap-5 shadow-2xl">
            <div className="h-16 w-16 rounded-full bg-[#282a2d] text-[#9aa0a6] flex items-center justify-center">
              <VideoOff className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">No Active Meeting</h2>
              <p className="text-xs text-[#9aa0a6] mt-1.5 leading-relaxed">
                There is currently no ongoing meeting for <strong className="text-white">{targetOrg.name}</strong>.
                When a host initiates a call, you will be able to join right from this link.
              </p>
            </div>

            {user && (
              <button
                type="button"
                onClick={() => handleCreateNewMeet(`${targetOrg.name} Live Sync`, true)}
                className="px-5 py-2.5 rounded-xl bg-[#81c995] hover:bg-[#a8dab5] text-[#0d2818] font-bold text-xs transition cursor-pointer flex items-center gap-2"
              >
                <Video className="h-4 w-4" />
                <span>Start Meeting Now</span>
              </button>
            )}
          </div>
        )}
      </main>

      {/* The Unified Video Room Modal */}
      {inCall && (
        <ChatVideoMeetModal
          open={inCall}
          onClose={() => setInCall(false)}
          channelName={activeMeet?.channelName || "General"}
          meetingTitle={activeMeet?.meetingTitle || "Live Meeting"}
          activeOrg={targetOrg}
          activeMember={activeMember || (guestUser as any) || undefined}
          members={orgMembers as any}
          documents={dbDocs as any}
          hostedMeetInfo={activeMeet}
          guestUser={guestUser || undefined}
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
