import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

export interface HostedMeetInfo {
  meetingId: string;
  meetingCode?: string;
  meetingTitle: string;
  channelName: string;
  channelId?: string;
  orgId: string;
  hostId: string;
  hostName: string;
  startedAt: string;
  isPublic: boolean;
}

interface ConnectedPeer {
  ws: WebSocket;
  peerId: string;
  userId: string;
  name: string;
  role: string;
  orgId: string;
  isHost: boolean;
  mic: boolean;
  video: boolean;
  handRaised: boolean;
  speaking: boolean;
}

// In-memory server-authoritative state
const activeMeets = new Map<string, HostedMeetInfo>();
const activeMeetsByCode = new Map<string, HostedMeetInfo>();
const roomPeers = new Map<string, Map<string, ConnectedPeer>>();
const roomChat = new Map<string, any[]>();
const roomSharedDocs = new Map<string, any>();
const roomAgenda = new Map<string, any[]>();

export function resolveCanonicalRoomKey(
  orgId?: string | null,
  roomId?: string | null,
  meetingCode?: string | null
): string {
  if (roomId && roomId.trim()) return roomId.trim();
  if (meetingCode && meetingCode.trim()) {
    return `meet_${meetingCode.trim().toLowerCase().replace(/[^a-z0-9]/g, "")}`;
  }
  return (orgId && orgId.trim()) || "default";
}

export function getActiveHostedMeet(orgId: string): HostedMeetInfo | null {
  return activeMeets.get(orgId) || null;
}

export function getAnyActiveMeet(): HostedMeetInfo | null {
  for (const meet of activeMeets.values()) {
    if (meet) return meet;
  }
  return null;
}

export function getMeetByCode(code: string): HostedMeetInfo | null {
  if (!code) return null;
  const rawCode = code.trim().toLowerCase();
  const cleanCode = rawCode.replace(/[^a-z0-9]/g, "");

  if (activeMeetsByCode.has(rawCode)) return activeMeetsByCode.get(rawCode)!;
  if (activeMeetsByCode.has(cleanCode)) return activeMeetsByCode.get(cleanCode)!;

  for (const meet of activeMeets.values()) {
    if (meet) {
      const mc = meet.meetingCode?.toLowerCase() || "";
      const mcClean = mc.replace(/[^a-z0-9]/g, "");
      const mi = meet.meetingId?.toLowerCase() || "";
      const miClean = mi.replace(/[^a-z0-9]/g, "");

      if (
        mc === rawCode ||
        mcClean === cleanCode ||
        mi === rawCode ||
        miClean === cleanCode ||
        (cleanCode.length >= 6 && mcClean.includes(cleanCode))
      ) {
        return meet;
      }
    }
  }

  return null;
}

export function setActiveHostedMeet(orgId: string, meet: HostedMeetInfo): void {
  activeMeets.set(orgId, meet);
  if (meet.meetingCode) {
    const rawCode = meet.meetingCode.trim().toLowerCase();
    const cleanCode = rawCode.replace(/[^a-z0-9]/g, "");
    if (rawCode) activeMeetsByCode.set(rawCode, meet);
    if (cleanCode) activeMeetsByCode.set(cleanCode, meet);
  }
  if (meet.meetingId) {
    const rawId = meet.meetingId.trim().toLowerCase();
    const cleanId = rawId.replace(/[^a-z0-9]/g, "");
    if (rawId) activeMeetsByCode.set(rawId, meet);
    if (cleanId) activeMeetsByCode.set(cleanId, meet);
  }
  const canonicalKey = resolveCanonicalRoomKey(orgId, undefined, meet.meetingCode);
  broadcastToOrg(orgId, {
    type: "HOSTED_MEET_ACTIVE",
    meet
  });
  if (canonicalKey !== orgId) {
    broadcastToOrg(canonicalKey, {
      type: "HOSTED_MEET_ACTIVE",
      meet
    });
  }
}

export function endActiveHostedMeet(orgId: string): void {
  const existing = activeMeets.get(orgId);
  let canonicalKey = orgId;
  if (existing) {
    if (existing.meetingCode) {
      const cleanCode = existing.meetingCode.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      canonicalKey = `meet_${cleanCode}`;
      activeMeetsByCode.delete(cleanCode);
      activeMeetsByCode.delete(existing.meetingCode.trim().toLowerCase());
    }
    if (existing.meetingId) {
      activeMeetsByCode.delete(existing.meetingId.trim().toLowerCase().replace(/[^a-z0-9]/g, ""));
    }
  }
  activeMeets.delete(orgId);
  roomSharedDocs.delete(orgId);
  roomChat.delete(orgId);
  roomAgenda.delete(orgId);
  if (canonicalKey !== orgId) {
    roomSharedDocs.delete(canonicalKey);
    roomChat.delete(canonicalKey);
    roomAgenda.delete(canonicalKey);
  }
  broadcastToOrg(orgId, {
    type: "HOSTED_MEET_ENDED",
    orgId
  });
  if (canonicalKey !== orgId) {
    broadcastToOrg(canonicalKey, {
      type: "HOSTED_MEET_ENDED",
      orgId
    });
  }
}

export function broadcastToOrg(orgId: string, data: any, excludeWs?: WebSocket): void {
  const peers = roomPeers.get(orgId);
  if (!peers) return;
  const payload = JSON.stringify(data);
  for (const peer of peers.values()) {
    if (peer.ws !== excludeWs && peer.ws.readyState === WebSocket.OPEN) {
      try {
        peer.ws.send(payload);
      } catch (e) {
        // Safe send
      }
    }
  }
}

export function sendToPeer(orgId: string, targetPeerId: string, data: any): boolean {
  const peers = roomPeers.get(orgId);
  if (!peers) return false;
  const target = peers.get(targetPeerId);
  if (target && target.ws.readyState === WebSocket.OPEN) {
    try {
      target.ws.send(JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }
  return false;
}

export function sendToUser(orgId: string, targetUserId: string, data: any): boolean {
  const peers = roomPeers.get(orgId);
  if (!peers) return false;
  let sent = false;
  for (const peer of peers.values()) {
    if (peer.userId === targetUserId && peer.ws.readyState === WebSocket.OPEN) {
      try {
        peer.ws.send(JSON.stringify(data));
        sent = true;
      } catch (e) {}
    }
  }
  return sent;
}

export function setupMeetWebSocketServer(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    if (url.pathname === "/ws/meet" || url.pathname.startsWith("/ws/meet")) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  wss.on("connection", (ws: WebSocket, request: any) => {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    const roomIdParam = url.searchParams.get("roomId");
    const meetingCodeParam = url.searchParams.get("meetingCode");
    let orgId = url.searchParams.get("orgId") || "default";

    // Unify roomKey: if roomId or meetingCode is specified, route into roomKey
    let targetRoomKey = resolveCanonicalRoomKey(orgId, roomIdParam, meetingCodeParam);
    if (!roomIdParam && !meetingCodeParam && orgId === "default") {
      const anyMeet = getAnyActiveMeet();
      if (anyMeet) {
        targetRoomKey = resolveCanonicalRoomKey(anyMeet.orgId, undefined, anyMeet.meetingCode);
        orgId = anyMeet.orgId;
      }
    }

    const peerId = url.searchParams.get("peerId") || `peer-${Math.random().toString(36).substring(2, 9)}`;
    const userId = url.searchParams.get("userId") || "guest";
    const name = decodeURIComponent(url.searchParams.get("name") || "Guest");
    const role = decodeURIComponent(url.searchParams.get("role") || "Member");

    (ws as any).isAlive = true;
    ws.on("pong", () => {
      (ws as any).isAlive = true;
    });

    if (!roomPeers.has(targetRoomKey)) {
      roomPeers.set(targetRoomKey, new Map());
    }
    const peers = roomPeers.get(targetRoomKey)!;

    const peerInfo: ConnectedPeer = {
      ws,
      peerId,
      userId,
      name,
      role,
      orgId: targetRoomKey,
      isHost: activeMeets.get(orgId)?.hostId === userId,
      mic: false,
      video: false,
      handRaised: false,
      speaking: false
    };

    peers.set(peerId, peerInfo);

    // Send initial room snapshot to newly connected client
    const existingPeers = Array.from(peers.values())
      .filter((p) => p.peerId !== peerId && !p.peerId.startsWith("wait-"))
      .map((p) => ({
        peerId: p.peerId,
        userId: p.userId,
        name: p.name,
        role: p.role,
        mic: p.mic,
        video: p.video,
        handRaised: p.handRaised,
        speaking: p.speaking,
        isMe: false
      }));

    const currentChat = roomChat.get(targetRoomKey) || roomChat.get(orgId) || [];
    const currentDoc = roomSharedDocs.get(targetRoomKey) || roomSharedDocs.get(orgId) || null;
    const currentAgenda = roomAgenda.get(targetRoomKey) || roomAgenda.get(orgId) || [];

    ws.send(
      JSON.stringify({
        type: "ROOM_SNAPSHOT",
        activeMeet: activeMeets.get(orgId) || null,
        peers: existingPeers,
        chatMessages: currentChat,
        sharedDoc: currentDoc,
        agendaPoints: currentAgenda
      })
    );

    // Announce to active call peers (skip waiting-room observer sockets)
    if (!peerId.startsWith("wait-")) {
      broadcastToOrg(
        targetRoomKey,
        {
          type: "PEER_JOINED",
          fromPeerId: peerId,
          userId,
          name,
          role,
          mic: false,
          video: false,
          handRaised: false
        },
        ws
      );
    }

    ws.on("message", (rawMessage: any) => {
      try {
        const msg = JSON.parse(rawMessage.toString());
        if (!msg || !msg.type) return;

        // Ensure fromPeerId is populated
        msg.fromPeerId = msg.fromPeerId || peerId;

        switch (msg.type) {
          case "SIGNAL_OFFER":
          case "SIGNAL_ANSWER":
          case "SIGNAL_ICE": {
            if (msg.toPeerId) {
              sendToPeer(targetRoomKey, msg.toPeerId, msg);
            }
            break;
          }

          case "PEER_STATE_UPDATE": {
            const current = peers.get(peerId);
            if (current) {
              if (msg.mic !== undefined) current.mic = msg.mic;
              if (msg.video !== undefined) current.video = msg.video;
              if (msg.handRaised !== undefined) current.handRaised = msg.handRaised;
              if (msg.speaking !== undefined) current.speaking = msg.speaking;
            }
            broadcastToOrg(targetRoomKey, msg, ws);
            break;
          }

          case "NEW_CHAT_MESSAGE": {
            if (msg.data) {
              const list = roomChat.get(targetRoomKey) || [];
              if (!list.some((m) => m.id === msg.data.id)) {
                list.push(msg.data);
                roomChat.set(targetRoomKey, list);
              }
              broadcastToOrg(targetRoomKey, msg);
            }
            break;
          }

          case "SYNC_SHARED_DOC": {
            if (msg.doc) {
              roomSharedDocs.set(targetRoomKey, msg.doc);
              broadcastToOrg(targetRoomKey, msg, ws);
            }
            break;
          }

          case "STOP_SHARED_DOC": {
            roomSharedDocs.delete(targetRoomKey);
            broadcastToOrg(targetRoomKey, msg, ws);
            break;
          }

          case "NEW_AGENDA": {
            if (msg.data) {
              const list = roomAgenda.get(targetRoomKey) || [];
              if (!list.some((p) => p.id === msg.data.id)) {
                list.push(msg.data);
                roomAgenda.set(targetRoomKey, list);
              }
              broadcastToOrg(targetRoomKey, msg, ws);
            }
            break;
          }

          case "UPDATE_MEETING_TITLE": {
            const active = activeMeets.get(orgId);
            if (active && msg.title) {
              active.meetingTitle = msg.title;
              activeMeets.set(orgId, active);
            }
            broadcastToOrg(targetRoomKey, msg, ws);
            break;
          }

          case "REQUEST_ADMISSION": {
            broadcastToOrg(targetRoomKey, msg, ws);
            if (orgId && orgId !== targetRoomKey) {
              broadcastToOrg(orgId, msg, ws);
            }
            break;
          }

          case "ADMIT_PEER":
          case "DECLINE_PEER": {
            if (msg.userId) {
              sendToUser(targetRoomKey, msg.userId, msg);
              if (orgId && orgId !== targetRoomKey) {
                sendToUser(orgId, msg.userId, msg);
              }
            }
            broadcastToOrg(targetRoomKey, msg, ws);
            if (orgId && orgId !== targetRoomKey) {
              broadcastToOrg(orgId, msg, ws);
            }
            break;
          }

          case "KICK_PEER": {
            if (msg.targetPeerId) {
              sendToPeer(targetRoomKey, msg.targetPeerId, msg);
              const target = peers.get(msg.targetPeerId);
              if (target) {
                peers.delete(msg.targetPeerId);
                try {
                  target.ws.close();
                } catch (e) {}
              }
            }
            broadcastToOrg(targetRoomKey, msg, ws);
            break;
          }

          default: {
            if (msg.toPeerId) {
              sendToPeer(targetRoomKey, msg.toPeerId, msg);
            } else {
              broadcastToOrg(targetRoomKey, msg, ws);
            }
            break;
          }
        }
      } catch (err) {
        console.warn("[Meet WS] message parsing error:", err);
      }
    });

    ws.on("close", () => {
      peers.delete(peerId);
      broadcastToOrg(targetRoomKey, {
        type: "PEER_LEFT",
        fromPeerId: peerId,
        userId
      });
      if (peers.size === 0) {
        roomPeers.delete(targetRoomKey);
      }
    });

    ws.on("error", () => {
      peers.delete(peerId);
    });
  });

  const pingInterval = setInterval(() => {
    wss.clients.forEach((client) => {
      const extWs = client as any;
      if (extWs.isAlive === false) {
        return client.terminate();
      }
      extWs.isAlive = false;
      try {
        client.ping();
      } catch (e) {}
    });
  }, 25000);

  wss.on("close", () => {
    clearInterval(pingInterval);
  });

  return wss;
}
