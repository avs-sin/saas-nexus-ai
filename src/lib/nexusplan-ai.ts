"use server";

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import type {
  DashboardBriefing,
  DiscrepancyAnalysis,
  NegotiationStrategy,
} from "@/types/nexusplan";

// Initialize the Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Model name for Gemini API
const GEMINI_MODEL = "gemini-2.0-flash";

// Helper to clean JSON string from Markdown code blocks
function parseAIResponse<T>(text: string | undefined, fallback: T): T {
  if (!text) return fallback;
  try {
    const cleanText = text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.warn("JSON Parse Error on AI response:", text, error);
    return fallback;
  }
}

// Construct a context string that gives the AI visibility into the current app state
function getSystemContext(dataContext: unknown): string {
  return `
You are NexusAI, an expert supply chain analyst assistant embedded in the NexusPlan application.
Your goal is to assist planners, procurement managers, and account reps.

Current Database State:
${JSON.stringify(dataContext, null, 2)}

Rules:
1. Be concise, professional, and data-driven.
2. When analyzing discrepancies, look for patterns in the PO versions or related plans.
3. When answering general questions, refer to specific IDs (e.g., PO-9001) where relevant.
4. Use actual data from the provided context when possible.
`;
}

// ============================================
// Chat with NexusAI
// ============================================

interface ChatMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

export async function chatWithNexusAI(
  history: ChatMessage[],
  message: string,
  dataContext: unknown
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const chat = model.startChat({
      history: history.map((msg) => ({
        role: msg.role,
        parts: msg.parts,
      })),
      systemInstruction: getSystemContext(dataContext),
    });

    const result = await chat.sendMessage(message);
    const response = result.response;
    return response.text() || "I couldn't generate a response.";
  } catch (error) {
    console.error("AI Chat Error:", error);
    return "I am currently unable to connect to the analysis engine. Please try again later.";
  }
}

// ============================================
// Dashboard Briefing
// ============================================

export async function generateDashboardBriefing(
  dataContext: unknown
): Promise<DashboardBriefing> {
  const fallback: DashboardBriefing = {
    headline: "System Online - Data Synchronization Active",
    criticalAlerts: ["AI Briefing service unavailable"],
    goodNews: "Core systems are operational",
  };

  try {
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            headline: { type: SchemaType.STRING },
            criticalAlerts: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
            },
            goodNews: { type: SchemaType.STRING },
          },
          required: ["headline", "criticalAlerts", "goodNews"],
        },
      },
    });

    const prompt = `Generate a "Morning Supply Chain Briefing" for the procurement manager.
Look at the provided database context (POs, Discrepancies, Scores).

Structure the response as a JSON object with:
1. "headline": A punchy 1-sentence summary of the overall health.
2. "criticalAlerts": An array of strings, listing the top 3 most urgent issues (e.g., specific high severity discrepancies or late POs).
3. "goodNews": One positive trend or achievement.

Context:
${JSON.stringify(dataContext, null, 2)}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    return parseAIResponse(response.text(), fallback);
  } catch (error) {
    console.error("Briefing Error:", error);
    return fallback;
  }
}

// ============================================
// Discrepancy Analysis
// ============================================

export async function analyzeDiscrepancyAI(
  discrepancy: unknown,
  relatedContext: unknown
): Promise<DiscrepancyAnalysis> {
  const fallback: DiscrepancyAnalysis = {
    rootCause: "Analysis unavailable.",
    recommendations: ["Review manually"],
  };

  try {
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            rootCause: { type: SchemaType.STRING },
            recommendations: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
            },
          },
          required: ["rootCause", "recommendations"],
        },
      },
    });

    const prompt = `You are investigating a specific supply chain discrepancy. 
Analyze the following discrepancy record in the context of the available POs and Plans.

Discrepancy Details:
${JSON.stringify(discrepancy, null, 2)}

Related Context (POs, Plans, etc.):
${JSON.stringify(relatedContext, null, 2)}

Task:
1. Identify the likely root cause (e.g., "Supplier ignored revision v2", "Plan increased but PO didn't match").
2. Suggest 3 concrete actions to resolve it.

Return JSON with "rootCause" (string) and "recommendations" (array of strings).`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    return parseAIResponse(response.text(), fallback);
  } catch (error) {
    console.error("Analysis Error:", error);
    return fallback;
  }
}

// ============================================
// Scorecard Insights
// ============================================

export async function generateScorecardInsightAI(
  entityName: string,
  scoreData: unknown,
  type: "CUSTOMER" | "VENDOR"
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const context =
      type === "CUSTOMER"
        ? "Focus on forecast accuracy, PO stability, and demand volatility."
        : "Focus on on-time delivery, quality control, cost variance, and responsiveness.";

    const prompt = `Generate a brief, high-impact executive summary (max 3 sentences) for this ${type.toLowerCase()}'s performance. 
${context}
Mention the strongest metric and the biggest area for improvement.

Entity: ${entityName}
Score Data: ${JSON.stringify(scoreData, null, 2)}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text() || "AI insights are currently unavailable.";
  } catch (error) {
    console.error("Scorecard Insight Error:", error);
    return "AI insights are currently unavailable.";
  }
}

// ============================================
// Vendor Negotiation Strategy
// ============================================

export async function generateVendorNegotiationStrategy(
  vendorName: string,
  scoreData: unknown,
  operationalHistory: unknown
): Promise<NegotiationStrategy | null> {
  try {
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            openingStance: { type: SchemaType.STRING },
            leveragePoints: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
            },
            talkingPoints: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
            },
            emailDraft: { type: SchemaType.STRING },
          },
          required: ["openingStance", "leveragePoints", "talkingPoints", "emailDraft"],
        },
      },
    });

    const prompt = `You are preparing a procurement manager for a meeting with vendor "${vendorName}".

Based on their Scorecard: ${JSON.stringify(scoreData, null, 2)}
And their Recent Operational History: ${JSON.stringify(operationalHistory, null, 2)}

Generate a strategy document with:
1. "openingStance": Should we be aggressive, collaborative, or apologetic? (one word or short phrase)
2. "leveragePoints": 3 specific failures (with dates/PO numbers if available) we can use to negotiate better pricing or terms.
3. "talkingPoints": 3 bullet points for the meeting agenda.
4. "emailDraft": A short, professional email (3-4 sentences) to send to them to set up this meeting.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    return parseAIResponse<NegotiationStrategy | null>(response.text(), null);
  } catch (error) {
    console.error("Negotiation Strategy Error:", error);
    return null;
  }
}



