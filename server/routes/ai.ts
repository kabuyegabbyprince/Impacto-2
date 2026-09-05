import { Router } from "express";
import {
  generateMeetingSummary,
  generateLedgerInsights,
  generateCommunicationDraft,
} from "../services/aiService";

const router = Router();

router.post("/meeting-summary", async (req, res) => {
  try {
    const { title, notes, attendees } = req.body;
    const summary = await generateMeetingSummary(title, notes, attendees);
    res.json({ success: true, summary });
  } catch (err: any) {
    console.error("[AI Meeting Summary Error]:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to generate meeting summary" });
  }
});

router.post("/ledger-insights", async (req, res) => {
  try {
    const { entries } = req.body;
    const insights = await generateLedgerInsights(entries);
    res.json({ success: true, insights });
  } catch (err: any) {
    console.error("[AI Ledger Insights Error]:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to generate ledger insights" });
  }
});

router.post("/communication-draft", async (req, res) => {
  try {
    const { type, tone, recipient, details } = req.body;
    const draft = await generateCommunicationDraft(type, tone, recipient, details);
    res.json({ success: true, draft });
  } catch (err: any) {
    console.error("[AI Communication Draft Error]:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to draft communication" });
  }
});

export default router;
