import { Router, Request, Response } from "express";
import {
  getActiveHostedMeet,
  getAnyActiveMeet,
  setActiveHostedMeet,
  endActiveHostedMeet,
  broadcastToOrg,
  HostedMeetInfo
} from "../services/meetSocketService";

const meetRouter = Router();

// GET /api/meet/active?orgId=...
meetRouter.get("/active", (req: Request, res: Response) => {
  const orgId = (req.query.orgId as string) || "default";
  let activeMeet = getActiveHostedMeet(orgId);
  if (!activeMeet) {
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
  const { orgId, message } = req.body;
  if (orgId && message) {
    broadcastToOrg(orgId, message);
  }
  res.json({ success: true });
});

export default meetRouter;
