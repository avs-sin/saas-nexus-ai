"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// Initialize the Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
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

// ============================================
// 1. Generate MRP Analysis (Material Requirements Planning)
// ============================================

export const generateMRPAnalysisAction = action({
  args: {
    workOrders: v.array(v.any()),
    boms: v.array(v.any()),
    rawMaterials: v.array(v.any()),
    rawInventory: v.array(v.any()),
    planningHorizonDays: v.number(),
  },
  handler: async (_ctx, args) => {
    const { workOrders, boms, rawMaterials, rawInventory, planningHorizonDays } = args;

    // Build lookup maps
    const bomMap = new Map(boms.map((b: { finishedSku: string }) => [b.finishedSku, b]));
    const materialMap = new Map(rawMaterials.map((m: { sku: string }) => [m.sku, m]));
    const inventoryMap = new Map<string, number>();

    // Aggregate inventory by material SKU
    rawInventory.forEach((inv: { materialSku: string; qtyAvailable: number }) => {
      const current = inventoryMap.get(inv.materialSku) || 0;
      inventoryMap.set(inv.materialSku, current + inv.qtyAvailable);
    });

    // Calculate gross requirements from work orders
    const requirements = new Map<string, {
      materialSku: string;
      materialName: string;
      totalNeeded: number;
      currentAvailable: number;
      shortfall: number;
      suggestedOrderQty: number;
      orderByDate: string;
      neededByDate: string;
      urgency: string;
      estimatedCost: number;
      drivingWorkOrders: string[];
      leadTimeDays: number;
    }>();

    const today = new Date();
    const horizonEnd = new Date(today);
    horizonEnd.setDate(horizonEnd.getDate() + planningHorizonDays);

    // Filter relevant work orders
    const relevantWOs = workOrders.filter((wo: { scheduledStart: string; status: string }) => {
      const woDate = new Date(wo.scheduledStart);
      return woDate <= horizonEnd && !["completed", "cancelled"].includes(wo.status);
    });

    for (const wo of relevantWOs) {
      const bom = bomMap.get(wo.finishedSku) as { materials: Array<{ materialSku: string; materialName: string; qtyPerUnit: number; scrapFactor?: number }> } | undefined;
      if (!bom) continue;

      const qtyToProduce = wo.qtyPlanned - wo.qtyCompleted;
      if (qtyToProduce <= 0) continue;

      for (const line of bom.materials) {
        const scrap = line.scrapFactor || 1;
        const grossNeed = qtyToProduce * line.qtyPerUnit * scrap;

        const existing = requirements.get(line.materialSku);
        if (existing) {
          existing.totalNeeded += grossNeed;
          existing.drivingWorkOrders.push(wo.woNumber);
          if (new Date(wo.scheduledStart) < new Date(existing.neededByDate)) {
            existing.neededByDate = wo.scheduledStart;
          }
        } else {
          const material = materialMap.get(line.materialSku) as { leadTimeDays?: number; costPerUnit?: number } | undefined;
          const available = inventoryMap.get(line.materialSku) || 0;
          const leadTime = material?.leadTimeDays || 14;

          const neededDate = new Date(wo.scheduledStart);
          const orderByDate = new Date(neededDate);
          orderByDate.setDate(orderByDate.getDate() - leadTime);

          requirements.set(line.materialSku, {
            materialSku: line.materialSku,
            materialName: line.materialName,
            totalNeeded: grossNeed,
            currentAvailable: available,
            shortfall: 0,
            suggestedOrderQty: 0,
            orderByDate: orderByDate.toISOString().split("T")[0],
            neededByDate: wo.scheduledStart,
            urgency: "low",
            estimatedCost: 0,
            drivingWorkOrders: [wo.woNumber],
            leadTimeDays: leadTime,
          });
        }
      }
    }

    // Calculate shortfalls and urgency
    for (const req of requirements.values()) {
      req.shortfall = Math.max(0, req.totalNeeded - req.currentAvailable);
      req.suggestedOrderQty = Math.ceil(req.shortfall * 1.1);

      const material = materialMap.get(req.materialSku) as { costPerUnit?: number } | undefined;
      if (material) {
        req.estimatedCost = req.suggestedOrderQty * (material.costPerUnit || 0);
      }

      const orderBy = new Date(req.orderByDate);
      const daysUntilOrder = Math.ceil((orderBy.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilOrder < 0) {
        req.urgency = "critical";
      } else if (daysUntilOrder <= 3) {
        req.urgency = "high";
      } else if (daysUntilOrder <= 7) {
        req.urgency = "medium";
      } else {
        req.urgency = "low";
      }
    }

    const reqArray = Array.from(requirements.values()).filter((r) => r.shortfall > 0);

    // Build summary
    const summary = {
      totalMaterialsNeeded: requirements.size,
      materialsInStock: Array.from(requirements.values()).filter((r) => r.shortfall === 0).length,
      materialsToOrder: reqArray.length,
      totalEstimatedCost: reqArray.reduce((sum, r) => sum + r.estimatedCost, 0),
      criticalShortages: reqArray.filter((r) => r.urgency === "critical").length,
      headline: "",
    };

    const fallback = {
      generatedAt: new Date().toISOString(),
      planningHorizonDays,
      requirements: reqArray,
      alerts: [] as { type: string; severity: string; materialSku?: string; message: string; recommendation: string }[],
      summary: {
        ...summary,
        headline: reqArray.length > 0
          ? `${reqArray.length} materials need ordering. ${summary.criticalShortages} critical shortages.`
          : "All materials in stock for planned production.",
      },
    };

    if (reqArray.length === 0) {
      return fallback;
    }

    // Use AI for insights
    try {
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              headline: { type: SchemaType.STRING },
              alerts: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    type: { type: SchemaType.STRING },
                    severity: { type: SchemaType.STRING },
                    materialSku: { type: SchemaType.STRING },
                    message: { type: SchemaType.STRING },
                    recommendation: { type: SchemaType.STRING },
                  },
                  required: ["type", "severity", "message", "recommendation"],
                },
              },
            },
            required: ["headline", "alerts"],
          },
        },
      });

      const prompt = `You are an AI production planner for a pillow manufacturing company.

Analyze this Material Requirements Planning (MRP) data and provide insights:

MATERIAL SHORTAGES:
${JSON.stringify(reqArray.slice(0, 10), null, 2)}

ACTIVE WORK ORDERS:
${JSON.stringify(relevantWOs.slice(0, 10).map((wo: { woNumber: string; finishedSku: string; qtyPlanned: number; scheduledStart: string; priority: string }) => ({
  woNumber: wo.woNumber,
  sku: wo.finishedSku,
  qty: wo.qtyPlanned,
  start: wo.scheduledStart,
  priority: wo.priority,
})), null, 2)}

Generate:
1. "headline": A punchy 1-sentence executive summary (e.g., "3 critical foam shortages threaten next week's production")
2. "alerts": Array of specific alerts with:
   - type: "stockout_risk" | "lead_time_warning" | "capacity_constraint" | "cost_spike"
   - severity: "low" | "medium" | "high" | "critical"
   - materialSku: (optional)
   - message: What's the issue
   - recommendation: Specific action to take

Focus on actionable insights. Be specific with SKUs and quantities.`;

      const result = await model.generateContent(prompt);
      const aiResponse = parseAIResponse<{ headline: string; alerts: typeof fallback.alerts }>(
        result.response.text(),
        { headline: fallback.summary.headline, alerts: [] }
      );

      return {
        ...fallback,
        alerts: aiResponse.alerts,
        summary: {
          ...summary,
          headline: aiResponse.headline,
        },
      };
    } catch (error) {
      console.error("MRP AI Analysis Error:", error);
      return fallback;
    }
  },
});

// ============================================
// 2. Suggest Material Purchases
// ============================================

// Helper function to calculate MRP (shared logic)
function calculateMRP(args: {
  workOrders: unknown[];
  boms: unknown[];
  rawMaterials: unknown[];
  rawInventory: unknown[];
  planningHorizonDays: number;
}) {
  const { workOrders, boms, rawMaterials, rawInventory, planningHorizonDays } = args;

  const bomMap = new Map((boms as Array<{ finishedSku: string }>).map((b) => [b.finishedSku, b]));
  const materialMap = new Map((rawMaterials as Array<{ sku: string }>).map((m) => [m.sku, m]));
  const inventoryMap = new Map<string, number>();

  (rawInventory as Array<{ materialSku: string; qtyAvailable: number }>).forEach((inv) => {
    const current = inventoryMap.get(inv.materialSku) || 0;
    inventoryMap.set(inv.materialSku, current + inv.qtyAvailable);
  });

  const requirements = new Map<string, {
    materialSku: string;
    materialName: string;
    totalNeeded: number;
    currentAvailable: number;
    shortfall: number;
    suggestedOrderQty: number;
    orderByDate: string;
    neededByDate: string;
    urgency: string;
    estimatedCost: number;
    drivingWorkOrders: string[];
    leadTimeDays: number;
  }>();

  const today = new Date();
  const horizonEnd = new Date(today);
  horizonEnd.setDate(horizonEnd.getDate() + planningHorizonDays);

  const relevantWOs = (workOrders as Array<{ scheduledStart: string; status: string; finishedSku: string; qtyPlanned: number; qtyCompleted: number; woNumber: string }>).filter((wo) => {
    const woDate = new Date(wo.scheduledStart);
    return woDate <= horizonEnd && !["completed", "cancelled"].includes(wo.status);
  });

  for (const wo of relevantWOs) {
    const bom = bomMap.get(wo.finishedSku) as { materials: Array<{ materialSku: string; materialName: string; qtyPerUnit: number; scrapFactor?: number }> } | undefined;
    if (!bom) continue;

    const qtyToProduce = wo.qtyPlanned - wo.qtyCompleted;
    if (qtyToProduce <= 0) continue;

    for (const line of bom.materials) {
      const scrap = line.scrapFactor || 1;
      const grossNeed = qtyToProduce * line.qtyPerUnit * scrap;

      const existing = requirements.get(line.materialSku);
      if (existing) {
        existing.totalNeeded += grossNeed;
        existing.drivingWorkOrders.push(wo.woNumber);
        if (new Date(wo.scheduledStart) < new Date(existing.neededByDate)) {
          existing.neededByDate = wo.scheduledStart;
        }
      } else {
        const material = materialMap.get(line.materialSku) as { leadTimeDays?: number; costPerUnit?: number } | undefined;
        const available = inventoryMap.get(line.materialSku) || 0;
        const leadTime = material?.leadTimeDays || 14;

        const neededDate = new Date(wo.scheduledStart);
        const orderByDate = new Date(neededDate);
        orderByDate.setDate(orderByDate.getDate() - leadTime);

        requirements.set(line.materialSku, {
          materialSku: line.materialSku,
          materialName: line.materialName,
          totalNeeded: grossNeed,
          currentAvailable: available,
          shortfall: 0,
          suggestedOrderQty: 0,
          orderByDate: orderByDate.toISOString().split("T")[0],
          neededByDate: wo.scheduledStart,
          urgency: "low",
          estimatedCost: 0,
          drivingWorkOrders: [wo.woNumber],
          leadTimeDays: leadTime,
        });
      }
    }
  }

  for (const req of requirements.values()) {
    req.shortfall = Math.max(0, req.totalNeeded - req.currentAvailable);
    req.suggestedOrderQty = Math.ceil(req.shortfall * 1.1);

    const material = materialMap.get(req.materialSku) as { costPerUnit?: number } | undefined;
    if (material) {
      req.estimatedCost = req.suggestedOrderQty * (material.costPerUnit || 0);
    }

    const orderBy = new Date(req.orderByDate);
    const daysUntilOrder = Math.ceil((orderBy.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilOrder < 0) {
      req.urgency = "critical";
    } else if (daysUntilOrder <= 3) {
      req.urgency = "high";
    } else if (daysUntilOrder <= 7) {
      req.urgency = "medium";
    } else {
      req.urgency = "low";
    }
  }

  return Array.from(requirements.values()).filter((r) => r.shortfall > 0);
}

export const suggestMaterialPurchasesAction = action({
  args: {
    workOrders: v.array(v.any()),
    boms: v.array(v.any()),
    rawMaterials: v.array(v.any()),
    rawInventory: v.array(v.any()),
    planningHorizonDays: v.number(),
  },
  handler: async (_ctx, args) => {
    const requirements = calculateMRP(args);

    return requirements
      .sort((a, b) => {
        const urgencyOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        const urgencyDiff = (urgencyOrder[a.urgency] || 3) - (urgencyOrder[b.urgency] || 3);
        if (urgencyDiff !== 0) return urgencyDiff;
        return new Date(a.orderByDate).getTime() - new Date(b.orderByDate).getTime();
      })
      .map((r) => ({
        materialSku: r.materialSku,
        materialName: r.materialName,
        orderQty: r.suggestedOrderQty,
        orderByDate: r.orderByDate,
        reason: `Need ${Math.round(r.totalNeeded)} units for work orders: ${r.drivingWorkOrders.join(", ")}. Current stock: ${r.currentAvailable}`,
        urgency: r.urgency,
        estimatedCost: r.estimatedCost,
      }));
  },
});

// ============================================
// 3. Optimize Production Schedule
// ============================================

export const optimizeProductionScheduleAction = action({
  args: {
    workOrders: v.array(v.any()),
    boms: v.array(v.any()),
  },
  handler: async (_ctx, args) => {
    const { workOrders, boms } = args;

    const pendingWOs = workOrders.filter((wo: { status: string }) =>
      ["draft", "scheduled", "released"].includes(wo.status)
    );

    if (pendingWOs.length < 2) {
      return null;
    }

    try {
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              optimizedSchedule: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    woNumber: { type: SchemaType.STRING },
                    suggestedStart: { type: SchemaType.STRING },
                    reason: { type: SchemaType.STRING },
                  },
                  required: ["woNumber", "suggestedStart", "reason"],
                },
              },
              savingsEstimate: { type: SchemaType.STRING },
              explanation: { type: SchemaType.STRING },
            },
            required: ["optimizedSchedule", "savingsEstimate", "explanation"],
          },
        },
      });

      const prompt = `You are a production scheduling optimizer for a pillow manufacturer.

CURRENT WORK ORDER SCHEDULE:
${JSON.stringify(pendingWOs.map((wo: { woNumber: string; finishedSku: string; finishedName: string; qtyPlanned: number; scheduledStart: string; priority: string }) => ({
  woNumber: wo.woNumber,
  sku: wo.finishedSku,
  name: wo.finishedName,
  qty: wo.qtyPlanned,
  scheduledStart: wo.scheduledStart,
  priority: wo.priority,
})), null, 2)}

BILL OF MATERIALS (what materials each product uses):
${JSON.stringify(boms.map((b: { finishedSku: string; materials: Array<{ materialSku: string }> }) => ({
  finishedSku: b.finishedSku,
  materials: b.materials.map((m) => m.materialSku),
})), null, 2)}

Optimize the schedule to:
1. Group similar products together (same SKU or same materials) to minimize changeovers
2. Respect priority levels (rush > high > normal > low)
3. Keep the same overall timeline (don't push anything significantly later)

Return:
- "optimizedSchedule": Array with woNumber, suggestedStart date (YYYY-MM-DD), and reason for each change
- "savingsEstimate": Estimated time/cost savings (e.g., "~2 hours changeover reduction")
- "explanation": Brief explanation of the optimization logic`;

      const result = await model.generateContent(prompt);
      const aiResponse = parseAIResponse<{
        optimizedSchedule: { woNumber: string; suggestedStart: string; reason: string }[];
        savingsEstimate: string;
        explanation: string;
      }>(result.response.text(), {
        optimizedSchedule: [],
        savingsEstimate: "Unable to calculate",
        explanation: "AI optimization unavailable",
      });

      return {
        currentSchedule: pendingWOs.map((wo: { woNumber: string; scheduledStart: string; finishedSku: string }) => ({
          woNumber: wo.woNumber,
          scheduledStart: wo.scheduledStart,
          finishedSku: wo.finishedSku,
        })),
        ...aiResponse,
      };
    } catch (error) {
      console.error("Schedule optimization error:", error);
      return null;
    }
  },
});

// ============================================
// 4. Generate Production Briefing
// ============================================

export const generateProductionBriefingAction = action({
  args: {
    workOrders: v.array(v.any()),
    rawInventory: v.array(v.any()),
    rawMaterials: v.array(v.any()),
    suggestions: v.array(v.any()),
    kpis: v.any(),
  },
  handler: async (_ctx, args) => {
    const { workOrders, rawInventory, rawMaterials, suggestions, kpis } = args;

    const fallback = {
      headline: `${kpis.workOrdersInProgress} work orders in progress. ${kpis.materialShortages} material shortages flagged.`,
      workOrdersSummary: {
        inProgress: kpis.workOrdersInProgress,
        scheduled: kpis.workOrdersScheduled,
        completedToday: kpis.completedToday,
      },
      criticalAlerts: kpis.materialShortages > 0
        ? [`${kpis.materialShortages} materials below reorder point`]
        : ["No critical alerts"],
      materialStatus: kpis.materialShortages > 0 ? "Action needed" : "All materials in stock",
      capacityUtilization: kpis.capacityUtilization,
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
              workOrdersSummary: {
                type: SchemaType.OBJECT,
                properties: {
                  inProgress: { type: SchemaType.NUMBER },
                  scheduled: { type: SchemaType.NUMBER },
                  completedToday: { type: SchemaType.NUMBER },
                },
                required: ["inProgress", "scheduled", "completedToday"],
              },
              criticalAlerts: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING },
              },
              materialStatus: { type: SchemaType.STRING },
              capacityUtilization: { type: SchemaType.NUMBER },
            },
            required: ["headline", "workOrdersSummary", "criticalAlerts", "materialStatus", "capacityUtilization"],
          },
        },
      });

      const criticalSuggestions = suggestions.filter((s: { urgency: string; status: string }) =>
        s.urgency === "critical" && s.status === "pending"
      );

      const prompt = `You are NexusAI, a production operations analyst for a pillow manufacturing plant.

Generate a morning production briefing based on this data:

WORK ORDERS:
${JSON.stringify(workOrders.slice(0, 15).map((wo: { woNumber: string; finishedName: string; status: string; qtyPlanned: number; qtyCompleted: number; priority: string }) => ({
  woNumber: wo.woNumber,
  product: wo.finishedName,
  status: wo.status,
  qty: wo.qtyPlanned,
  completed: wo.qtyCompleted,
  priority: wo.priority,
})), null, 2)}

CRITICAL MATERIAL ALERTS:
${JSON.stringify(criticalSuggestions, null, 2)}

KPIs:
${JSON.stringify(kpis, null, 2)}

Provide:
1. "headline": A punchy 1-sentence summary (e.g., "Strong output day: 2 WOs on track, but foam shortage threatens tomorrow's King pillow run")
2. "workOrdersSummary": { inProgress, scheduled, completedToday }
3. "criticalAlerts": Top 3 urgent issues needing attention today
4. "materialStatus": Brief status of raw materials (e.g., "2 critical shortages need immediate PO")
5. "capacityUtilization": Current capacity % (0-100)

Be specific with product names and WO numbers.`;

      const result = await model.generateContent(prompt);
      return parseAIResponse(result.response.text(), fallback);
    } catch (error) {
      console.error("Production briefing error:", error);
      return fallback;
    }
  },
});

// ============================================
// 5. Chat with Production AI
// ============================================

export const chatWithProductionAIAction = action({
  args: {
    message: v.string(),
    history: v.array(
      v.object({
        role: v.string(),
        parts: v.array(v.object({ text: v.string() })),
      })
    ),
    contextData: v.any(),
  },
  handler: async (_ctx, args) => {
    try {
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

      const systemInstruction = `You are NexusAI, an expert production planning assistant for a pillow manufacturing company.

You help with:
- Material requirements planning (MRP)
- Work order scheduling and tracking
- Inventory management
- Bill of Materials questions
- Production capacity planning

CURRENT PRODUCTION DATA:
Work Orders: ${JSON.stringify(args.contextData.workOrders?.slice(0, 10) || [])}
Bills of Materials: ${JSON.stringify(args.contextData.boms?.slice(0, 5) || [])}
Raw Materials: ${JSON.stringify(args.contextData.rawMaterials?.slice(0, 10) || [])}
Raw Inventory: ${JSON.stringify(args.contextData.rawInventory?.slice(0, 10) || [])}
Material Suggestions: ${JSON.stringify(args.contextData.suggestions?.slice(0, 5) || [])}
KPIs: ${JSON.stringify(args.contextData.kpis || {})}

Rules:
1. Be concise and data-driven
2. Reference specific WO numbers, SKUs, and quantities
3. Provide actionable recommendations
4. If asked about material availability, calculate from inventory data
5. Consider lead times when discussing material orders`;

      const chat = model.startChat({
        history: args.history.map((h) => ({
          role: h.role as "user" | "model",
          parts: h.parts,
        })),
        systemInstruction,
      });

      const result = await chat.sendMessage(args.message);
      return result.response.text() || "I couldn't generate a response.";
    } catch (error) {
      console.error("Production AI Chat Error:", error);
      return "I'm having trouble connecting to the analysis engine. Please try again.";
    }
  },
});

// ============================================
// 6. Analyze Supply Chain (Cross-Module)
// ============================================

export const analyzeSupplyChainAction = action({
  args: {
    productionData: v.any(),
    inboundData: v.optional(v.any()),
    outboundData: v.optional(v.any()),
    planData: v.optional(v.any()),
  },
  handler: async (_ctx, args) => {
    const { productionData, inboundData, outboundData, planData } = args;

    try {
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              overallHealth: {
                type: SchemaType.OBJECT,
                properties: {
                  score: { type: SchemaType.NUMBER },
                  trend: { type: SchemaType.STRING },
                  summary: { type: SchemaType.STRING },
                },
                required: ["score", "trend", "summary"],
              },
              inboundInsights: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING },
              },
              productionInsights: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING },
              },
              outboundInsights: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING },
              },
              recommendations: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    priority: { type: SchemaType.STRING },
                    action: { type: SchemaType.STRING },
                    impact: { type: SchemaType.STRING },
                  },
                  required: ["priority", "action", "impact"],
                },
              },
              bottlenecks: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING },
              },
            },
            required: ["overallHealth", "inboundInsights", "productionInsights", "outboundInsights", "recommendations", "bottlenecks"],
          },
        },
      });

      const prompt = `You are a supply chain analyst providing end-to-end visibility across inbound, production, and outbound operations for a pillow manufacturer.

PRODUCTION DATA:
- Work Orders: ${JSON.stringify(productionData?.workOrders?.slice(0, 10) || [])}
- Material Shortages: ${JSON.stringify(productionData?.suggestions?.filter((s: { urgency: string }) => s.urgency === "critical") || [])}
- KPIs: ${JSON.stringify(productionData?.kpis || {})}

INBOUND DATA (raw material receiving):
- Open POs: ${JSON.stringify(inboundData?.pos?.filter((p: { status: string }) => p.status === "Open")?.slice(0, 5) || [])}
- Vendor Scores: ${JSON.stringify(inboundData?.scorecards?.slice(0, 3) || [])}
- Discrepancies: ${JSON.stringify(inboundData?.discrepancies?.filter((d: { status: string }) => d.status !== "Resolved")?.slice(0, 3) || [])}

OUTBOUND DATA (shipping):
- Pending Orders: ${JSON.stringify(outboundData?.orders?.filter((o: { status: string }) => o.status === "pending")?.slice(0, 5) || [])}
- KPIs: ${JSON.stringify(outboundData?.kpis || {})}

DEMAND FORECAST (from NexusPlan):
${JSON.stringify(planData?.plans?.slice(0, 5) || [])}

Provide a comprehensive supply chain analysis:

1. "overallHealth": { score (0-100), trend ("improving"|"stable"|"declining"), summary }
2. "inboundInsights": 2-3 key observations about raw material supply
3. "productionInsights": 2-3 key observations about manufacturing
4. "outboundInsights": 2-3 key observations about shipping/fulfillment
5. "recommendations": Top 3 prioritized actions with expected impact
6. "bottlenecks": Current constraints limiting throughput

Be specific with numbers, dates, and product names.`;

      const result = await model.generateContent(prompt);
      
      const fallback = {
        overallHealth: {
          score: 75,
          trend: "stable",
          summary: "Supply chain operating normally with some material constraints.",
        },
        inboundInsights: ["Material supply data being analyzed"],
        productionInsights: ["Production operations data being analyzed"],
        outboundInsights: ["Outbound fulfillment data being analyzed"],
        recommendations: [
          { priority: "high", action: "Review material inventory levels", impact: "Prevent production delays" },
        ],
        bottlenecks: ["Analysis in progress"],
      };

      return parseAIResponse(result.response.text(), fallback);
    } catch (error) {
      console.error("Supply chain analysis error:", error);
      return {
        overallHealth: {
          score: 0,
          trend: "unknown",
          summary: "Unable to analyze supply chain. Please try again.",
        },
        inboundInsights: ["Analysis unavailable"],
        productionInsights: ["Analysis unavailable"],
        outboundInsights: ["Analysis unavailable"],
        recommendations: [],
        bottlenecks: ["Analysis unavailable"],
      };
    }
  },
});

