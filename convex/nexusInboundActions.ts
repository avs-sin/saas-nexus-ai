"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Helper to initialize Gemini AI client
// Requires GEMINI_API_KEY environment variable to be set in Convex dashboard
// Model name for Gemini API
const GEMINI_MODEL = "gemini-2.0-flash";

const getAI = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is not set in Convex environment variables. Set it in the Convex dashboard."
    );
  }
  return new GoogleGenerativeAI(key);
};

export const chatWithNexusAction = action({
  args: {
    message: v.string(),
    history: v.array(
      v.object({ role: v.string(), parts: v.array(v.object({ text: v.string() })) })
    ),
    contextData: v.any(),
  },
  handler: async (ctx, args) => {
    const ai = getAI();
    const model = ai.getGenerativeModel({ model: GEMINI_MODEL });

    const systemInstruction = `
You are Nexus AI, an expert supply chain and logistics assistant embedded in the Nexus Inbound system.
You have access to the current system data. 
Answer questions briefly and professionally. 

CURRENT SYSTEM DATA:
Vendors: ${JSON.stringify(args.contextData.vendors)}
Purchase Orders: ${JSON.stringify(args.contextData.pos)}
Discrepancies: ${JSON.stringify(args.contextData.discrepancies)}
EDI Logs: ${JSON.stringify(args.contextData.ediLogs)}
Scorecards: ${JSON.stringify(args.contextData.scorecards)}
`;

    const chat = model.startChat({
      history: args.history.map((h) => ({
        role: h.role as "user" | "model",
        parts: h.parts,
      })),
      systemInstruction,
    });

    const result = await chat.sendMessage(args.message);
    return result.response.text();
  },
});

export const analyzeDiscrepancyAction = action({
  args: { discrepancy: v.any() },
  handler: async (ctx, args) => {
    const ai = getAI();
    const model = ai.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = `
Analyze the following warehouse discrepancy and provide a JSON response.
Discrepancy Details: ${JSON.stringify(args.discrepancy)}

Task:
1. Recommend an action (e.g., "Request Credit", "Return to Vendor", "Waive & Receive").
2. Provide a short reasoning based on severity and type.
3. Draft a short, professional email to the vendor regarding this issue.

Output JSON format:
{
  "recommendation": "string",
  "reasoning": "string",
  "emailDraft": "string"
}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    try {
      return JSON.parse(text);
    } catch {
      return {
        recommendation: "Manual Review Required",
        reasoning: "AI service unavailable.",
        emailDraft: "Error generating draft.",
      };
    }
  },
});

export const generateResolutionEmailAction = action({
  args: { discrepancy: v.any(), outcome: v.string() },
  handler: async (ctx, args) => {
    const ai = getAI();
    const model = ai.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = `
You are a logistics manager. Write a professional email to the vendor regarding a discrepancy resolution.
Vendor: ${args.discrepancy.vendorName}
PO Number: ${args.discrepancy.poNumber}
Issue: ${args.discrepancy.type} (${args.discrepancy.description})
Item: ${args.discrepancy.itemSku || "N/A"}
The decided Resolution Outcome is: "${args.outcome}".

Instructions:
- If the outcome is "Chargeback" or "Return to Vendor", be firm but professional.
- If the outcome is "Waive", be conciliatory but note it for the record.
- Keep it concise.
- Return ONLY the body of the email.
`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  },
});

export const generateDashboardBriefingAction = action({
  args: { discrepancies: v.any(), pos: v.any(), scorecards: v.any() },
  handler: async (ctx, args) => {
    const ai = getAI();
    const model = ai.getGenerativeModel({ model: GEMINI_MODEL });

    const openDiscrepancies = args.discrepancies.filter(
      (d: { status: string }) => d.status !== "Resolved"
    );
    const openPOs = args.pos.filter(
      (p: { status: string }) => p.status === "Open"
    );
    const lowestScore =
      args.scorecards.length > 0
        ? Math.min(...args.scorecards.map((s: { totalScore: number }) => s.totalScore))
        : "N/A";

    const prompt = `
Generate a "Morning Logistics Briefing" for the Warehouse Manager based on this data:
- Open Discrepancies: ${openDiscrepancies.length}
- Incoming POs: ${openPOs.length}
- Lowest Vendor Score: ${lowestScore}

The briefing should be 2-3 sentences max. Focus on what needs immediate attention.
Example: "Good morning. You have 3 critical quality failures from Globex Corp that need review. Inbound volume is high with 12 POs expected today."
`;

    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error("Briefing generation error:", error);
      return "Good morning. Unable to generate briefing due to connection issues.";
    }
  },
});

export const generateNegotiationStrategyAction = action({
  args: {
    vendorName: v.string(),
    scorecard: v.any(),
    recentDiscrepancies: v.any(),
  },
  handler: async (ctx, args) => {
    const ai = getAI();
    const model = ai.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = `
Create a negotiation strategy for a meeting with vendor "${args.vendorName}".

Data:
- Current Score: ${args.scorecard.totalScore}/100
- Recent Issues: ${JSON.stringify(args.recentDiscrepancies.map((d: { type: string }) => d.type))}

Output JSON format:
{
  "strategyName": "string (e.g. Hardball on Quality, Partnership Expansion)",
  "keyLeveragePoints": ["string", "string"],
  "openingStatement": "string (one sentence)",
  "recommendedGoal": "string"
}
`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return JSON.parse(text);
    } catch {
      return null;
    }
  },
});

