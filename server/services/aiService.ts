import { GoogleGenAI } from "@google/genai";
import { cleanValue } from "./supabaseAdmin";

let aiClient: GoogleGenAI | null = null;

export function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = cleanValue(process.env.GEMINI_API_KEY);
    aiClient = new GoogleGenAI({ apiKey: apiKey || "placeholder-key" });
  }
  return aiClient;
}

export async function generateMeetingSummary(title: string, notes: string, attendees?: string): Promise<string> {
  const ai = getAiClient();
  const prompt = `Analyze the following meeting notes and attendees for cooperative "${title || 'Meeting'}":\nAttendees: ${attendees || 'None'}\nNotes:\n${notes}\n\nProvide a professional executive summary, key decisions made, and a structured list of action items with owners and deadlines. Format in clean Markdown.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return response.text || "";
}

export async function generateLedgerInsights(entries: any[]): Promise<string> {
  const ai = getAiClient();
  const prompt = `Analyze the following financial ledger entries for anomalies, unusual expense spikes, missing receipt references, or budget recommendations:\n${JSON.stringify(entries || [], null, 2)}\n\nProvide 3-5 concise, actionable financial insights and risk flags in bullet points.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return response.text || "";
}

export async function generateCommunicationDraft(
  type?: string,
  tone?: string,
  recipient?: string,
  details?: string
): Promise<string> {
  const ai = getAiClient();
  const prompt = `Draft a professional cooperative ${type || 'announcement'} message with tone "${tone || 'formal'}" for recipient "${recipient || 'members'}". Details: ${details}\n\nInclude placeholders like {member_name} where appropriate.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return response.text || "";
}
