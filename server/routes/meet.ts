import { Router, Request, Response } from "express";
import {
  getActiveHostedMeet,
  getAnyActiveMeet,
  getMeetByCode,
  setActiveHostedMeet,
  endActiveHostedMeet,
  broadcastToOrg,
  sendToPeer,
  sendToUser,
  resolveCanonicalRoomKey,
  HostedMeetInfo
} from "../services/meetSocketService";

const meetRouter = Router();

// GET /api/meet/active?orgId=...&code=...
meetRouter.get("/active", (req: Request, res: Response) => {
  const orgId = (req.query.orgId as string) || "default";
  const code = (req.query.code as string)?.trim();

  if (code) {
    const matched = getMeetByCode(code);
    if (matched) {
      return res.json({ activeMeet: matched });
    }
  }

  let activeMeet = getActiveHostedMeet(orgId);
  if (!activeMeet && orgId === "default") {
    activeMeet = getAnyActiveMeet();
  }
  res.json({ activeMeet });
});

// POST /api/meet/start
meetRouter.post("/start", (req: Request, res: Response) => {
  const { orgId, meet } = req.body;
  if (!orgId || !meet) {
    res.status(400).json({ error: "orgId and meet information required" });
    return;
  }
  const hostedMeet: HostedMeetInfo = {
    meetingId: meet.meetingId || `meet-${Date.now()}`,
    meetingCode: meet.meetingCode,
    meetingTitle: meet.meetingTitle || "Live Meeting",
    channelName: meet.channelName || "General",
    channelId: meet.channelId,
    orgId,
    hostId: meet.hostId || "host",
    hostName: meet.hostName || "Host",
    startedAt: meet.startedAt || new Date().toISOString(),
    isPublic: meet.isPublic !== undefined ? Boolean(meet.isPublic) : true
  };
  setActiveHostedMeet(orgId, hostedMeet);
  res.json({ success: true, meet: hostedMeet });
});

// POST /api/meet/end
meetRouter.post("/end", (req: Request, res: Response) => {
  const { orgId } = req.body;
  if (!orgId) {
    res.status(400).json({ error: "orgId required" });
    return;
  }
  endActiveHostedMeet(orgId);
  res.json({ success: true });
});

// POST /api/meet/signal (HTTP fallback for signal relaying)
meetRouter.post("/signal", (req: Request, res: Response) => {
  let { orgId, roomId, meetingCode, message } = req.body;
  if (!orgId || orgId === "default") {
    const anyMeet = getAnyActiveMeet();
    if (anyMeet) {
      orgId = anyMeet.orgId;
    }
  }
  const targetRoomKey = resolveCanonicalRoomKey(
    orgId,
    roomId || message?.roomId,
    meetingCode || message?.meetingCode
  );
  if (message) {
    if (message.toPeerId) {
      sendToPeer(targetRoomKey, message.toPeerId, message);
    } else if (message.type === "ADMIT_PEER" || message.type === "DECLINE_PEER") {
      if (message.userId) {
        sendToUser(targetRoomKey, message.userId, message);
        if (orgId && orgId !== targetRoomKey) {
          sendToUser(orgId, message.userId, message);
        }
      }
      broadcastToOrg(targetRoomKey, message);
    } else {
      broadcastToOrg(targetRoomKey, message);
      if (message.type === "REQUEST_ADMISSION" && orgId && orgId !== targetRoomKey) {
        broadcastToOrg(orgId, message);
      }
    }
  }
  res.json({ success: true });
});

// GET /api/meet/ice-servers (returns dynamic STUN/TURN ICE configuration)
meetRouter.get("/ice-servers", async (_req: Request, res: Response) => {
  const defaultIceServers: any[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
    { urls: "stun:global.stun.twilio.com:3478" }
  ];

  // 1. Cloudflare Calls TURN ephemeral credentials if configured
  const cfTokenId = process.env.CLOUDFLARE_TURN_TOKEN_ID;
  const cfApiToken = process.env.CLOUDFLARE_TURN_API_TOKEN;
  if (cfTokenId && cfApiToken) {
    try {
      const cfRes = await fetch(
        `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(cfTokenId)}/credentials/generate-ice-servers`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cfApiToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ ttl: 86400 })
        }
      );
      if (cfRes.ok) {
        const cfData = (await cfRes.json()) as { iceServers?: any[] };
        if (Array.isArray(cfData?.iceServers) && cfData.iceServers.length > 0) {
          return res.json({ iceServers: [...defaultIceServers, ...cfData.iceServers] });
        }
      }
    } catch (err) {
      console.warn("[Meet ICE] Cloudflare TURN fetch warning:", err);
    }
  }

  // 2. Metered TURN API key if configured
  const meteredKey = process.env.METERED_TURN_API_KEY;
  const meteredApp = process.env.METERED_APP_NAME || "impacto";
  if (meteredKey) {
    try {
      const mRes = await fetch(
        `https://${encodeURIComponent(meteredApp)}.metered.live/api/v1/turn/credentials?apiKey=${encodeURIComponent(meteredKey)}`
      );
      if (mRes.ok) {
        const mServers = await mRes.json();
        if (Array.isArray(mServers) && mServers.length > 0) {
          return res.json({ iceServers: [...defaultIceServers, ...mServers] });
        }
      }
    } catch (err) {
      console.warn("[Meet ICE] Metered TURN fetch warning:", err);
    }
  }

  // 3. Explicit custom TURN_* environment configuration
  const turnUrlsRaw = process.env.TURN_URLS || process.env.VITE_TURN_URLS;
  const turnUser = process.env.TURN_USERNAME || process.env.VITE_TURN_USERNAME;
  const turnCred = process.env.TURN_CREDENTIAL || process.env.VITE_TURN_CREDENTIAL;
  if (turnUrlsRaw && turnUser && turnCred) {
    const urls = turnUrlsRaw
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean);
    if (urls.length > 0) {
      return res.json({
        iceServers: [
          ...defaultIceServers,
          { urls, username: turnUser, credential: turnCred }
        ]
      });
    }
  }

  // 4. Fallback multi-port STUN + OpenRelay TLS/TCP/UDP relay
  return res.json({
    iceServers: [
      ...defaultIceServers,
      {
        urls: [
          "turn:openrelay.metered.ca:80",
          "turn:openrelay.metered.ca:80?transport=tcp",
          "turn:openrelay.metered.ca:443",
          "turn:openrelay.metered.ca:443?transport=tcp",
          "turns:openrelay.metered.ca:443?transport=tcp"
        ],
        username: "openrelayproject",
        credential: "openrelayproject"
      }
    ]
  });
});

export default meetRouter;
