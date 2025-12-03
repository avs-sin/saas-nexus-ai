"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
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

/**
 * Generate AI-powered dashboard briefing for outbound operations
 */
export const generateDashboardBriefingAction = action({
  args: {
    orders: v.array(v.any()),
    shipments: v.array(v.any()),
    discrepancies: v.array(v.any()),
    forecasts: v.array(v.any()),
    kpis: v.any(),
  },
  handler: async (_ctx, args) => {
    try {
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              headline: { type: SchemaType.STRING },
              volumeForecast: {
                type: SchemaType.OBJECT,
                properties: {
                  today: { type: SchemaType.NUMBER },
                  tomorrow: { type: SchemaType.NUMBER },
                  trend: { type: SchemaType.STRING },
                },
                required: ["today", "tomorrow", "trend"],
              },
              criticalAlerts: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING },
              },
              customerHighlight: { type: SchemaType.STRING },
            },
            required: ["headline", "volumeForecast", "criticalAlerts", "customerHighlight"],
          },
        },
      });

      const prompt = `You are NexusAI, an outbound fulfillment operations analyst.
Generate a morning briefing for the shipping manager based on this data:

Orders: ${JSON.stringify(args.orders.slice(0, 20), null, 2)}
Shipments: ${JSON.stringify(args.shipments.slice(0, 20), null, 2)}
Discrepancies: ${JSON.stringify(args.discrepancies, null, 2)}
Forecasts: ${JSON.stringify(args.forecasts, null, 2)}
KPIs: ${JSON.stringify(args.kpis, null, 2)}

Provide:
1. "headline": A punchy 1-sentence summary of today's shipping outlook (mention specific numbers)
2. "volumeForecast": { today: number, tomorrow: number, trend: "up"|"down"|"stable" }
3. "criticalAlerts": Top 3 urgent issues (late orders, exceptions, capacity issues)
4. "customerHighlight": One notable customer-related insight (e.g., large B2B shipment, VIP order)

Be specific and data-driven. Use actual order numbers and customer names where relevant.`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      
      const fallback = {
        headline: `${args.kpis.ordersToShipToday} orders to ship today. Operations running normally.`,
        volumeForecast: {
          today: args.kpis.ordersToShipToday,
          tomorrow: Math.round(args.kpis.ordersToShipToday * 1.1),
          trend: "stable" as const,
        },
        criticalAlerts: args.kpis.openDiscrepancies > 0 
          ? [`${args.kpis.openDiscrepancies} open discrepancies require attention`]
          : ["No critical alerts"],
        customerHighlight: "All customer shipments on track.",
      };

      return parseAIResponse(response.text(), fallback);
    } catch (error) {
      console.error("Dashboard briefing error:", error);
      return {
        headline: "AI briefing temporarily unavailable. Check dashboard KPIs for status.",
        volumeForecast: { today: args.kpis.ordersToShipToday, tomorrow: 0, trend: "stable" },
        criticalAlerts: ["AI service unavailable"],
        customerHighlight: "Unable to generate insights.",
      };
    }
  },
});

/**
 * Generate AI-powered shipment notification
 */
export const generateShipmentNotificationAction = action({
  args: {
    shipment: v.any(),
    order: v.any(),
    event: v.string(), // 'shipped' | 'out_for_delivery' | 'delivered' | 'delayed' | 'exception'
    customerType: v.string(), // 'B2B' | 'B2C'
    delayReason: v.optional(v.string()),
    newEta: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    try {
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              subject: { type: SchemaType.STRING },
              body: { type: SchemaType.STRING },
              tone: { type: SchemaType.STRING },
            },
            required: ["subject", "body", "tone"],
          },
        },
      });

      const toneGuidance = args.customerType === "B2B"
        ? "Professional, concise, and formal. Use company name. Include order/PO reference."
        : "Friendly, warm, and conversational. Use first name if available. Add a personal touch.";

      const eventContext = {
        shipped: "The order has shipped and is on its way.",
        out_for_delivery: "The package is out for delivery today.",
        delivered: "The package has been delivered successfully.",
        delayed: `There is a delay. Reason: ${args.delayReason || "carrier delay"}. New ETA: ${args.newEta || "TBD"}.`,
        exception: "There is an issue with the delivery that requires attention.",
      };

      const prompt = `Generate a shipping notification email for this event:

Event: ${args.event}
Context: ${eventContext[args.event as keyof typeof eventContext]}
Customer Type: ${args.customerType}
Order Number: ${args.order?.orderNumber}
Customer Name: ${args.order?.customerName}
Carrier: ${args.shipment?.carrier}
Tracking Number: ${args.shipment?.trackingNumber || "Not available yet"}
Estimated Delivery: ${args.shipment?.estimatedDelivery || "TBD"}

Tone guidance: ${toneGuidance}

Generate a JSON with:
- "subject": Email subject line
- "body": Email body (HTML allowed, keep under 200 words)
- "tone": The tone used (e.g., "professional", "friendly", "apologetic")`;

      const result = await model.generateContent(prompt);
      const response = result.response;

      return parseAIResponse(response.text(), {
        subject: `Order ${args.order?.orderNumber} - ${args.event.replace("_", " ").toUpperCase()}`,
        body: `Your order ${args.order?.orderNumber} status: ${args.event}. Track at: ${args.shipment?.trackingUrl || "N/A"}`,
        tone: args.customerType === "B2B" ? "professional" : "friendly",
      });
    } catch (error) {
      console.error("Notification generation error:", error);
      return {
        subject: `Order Update - ${args.order?.orderNumber}`,
        body: "There has been an update to your order. Please check your account for details.",
        tone: "neutral",
      };
    }
  },
});

/**
 * Generate AI-powered weekly B2B account briefing
 */
export const generateAccountBriefingAction = action({
  args: {
    customerName: v.string(),
    customerId: v.string(),
    shipmentsThisWeek: v.array(v.any()),
    ordersThisWeek: v.array(v.any()),
  },
  handler: async (_ctx, args) => {
    try {
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              subject: { type: SchemaType.STRING },
              summary: { type: SchemaType.STRING },
              metrics: {
                type: SchemaType.OBJECT,
                properties: {
                  totalShipments: { type: SchemaType.NUMBER },
                  onTimeRate: { type: SchemaType.NUMBER },
                  totalValue: { type: SchemaType.NUMBER },
                },
                required: ["totalShipments", "onTimeRate", "totalValue"],
              },
              highlights: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING },
              },
              nextWeekOutlook: { type: SchemaType.STRING },
            },
            required: ["subject", "summary", "metrics", "highlights", "nextWeekOutlook"],
          },
        },
      });

      const prompt = `Generate a weekly shipping briefing for B2B account: ${args.customerName}

This Week's Shipments: ${JSON.stringify(args.shipmentsThisWeek, null, 2)}
This Week's Orders: ${JSON.stringify(args.ordersThisWeek, null, 2)}

Create a professional weekly summary with:
- "subject": Email subject for weekly briefing
- "summary": 2-3 sentence executive summary
- "metrics": { totalShipments, onTimeRate (percentage), totalValue (estimated from orders) }
- "highlights": 3 key points about their shipments this week
- "nextWeekOutlook": Brief outlook on upcoming shipments`;

      const result = await model.generateContent(prompt);
      const response = result.response;

      return parseAIResponse(response.text(), {
        subject: `Weekly Shipping Briefing - ${args.customerName}`,
        summary: `This week we processed ${args.shipmentsThisWeek.length} shipments for your account.`,
        metrics: {
          totalShipments: args.shipmentsThisWeek.length,
          onTimeRate: 95,
          totalValue: 0,
        },
        highlights: ["All shipments processed on schedule."],
        nextWeekOutlook: "Normal volume expected.",
      });
    } catch (error) {
      console.error("Account briefing error:", error);
      return null;
    }
  },
});

/**
 * Generate shipping demand forecast using AI
 */
export const generateShippingForecastAction = action({
  args: {
    historicalShipments: v.array(v.any()),
    upcomingOrders: v.array(v.any()),
    holidays: v.array(v.string()),
    promotions: v.array(v.any()),
  },
  handler: async (_ctx, args) => {
    try {
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              predictions: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    date: { type: SchemaType.STRING },
                    segment: { type: SchemaType.STRING },
                    predictedVolume: { type: SchemaType.NUMBER },
                    confidenceLevel: { type: SchemaType.NUMBER },
                    factors: {
                      type: SchemaType.ARRAY,
                      items: { type: SchemaType.STRING },
                    },
                  },
                  required: ["date", "segment", "predictedVolume", "confidenceLevel", "factors"],
                },
              },
              alerts: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    type: { type: SchemaType.STRING },
                    severity: { type: SchemaType.STRING },
                    message: { type: SchemaType.STRING },
                  },
                  required: ["type", "severity", "message"],
                },
              },
            },
            required: ["predictions", "alerts"],
          },
        },
      });

      // Generate dates for next 7 days
      const dates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d.toISOString().split("T")[0];
      });

      const prompt = `You are an AI demand forecasting engine for shipping operations.

Based on this data, predict shipping volumes for the next 7 days:

Historical Shipments (last 30 days): ${JSON.stringify(args.historicalShipments.slice(0, 50), null, 2)}
Upcoming Orders: ${JSON.stringify(args.upcomingOrders, null, 2)}
Holidays: ${JSON.stringify(args.holidays)}
Promotions: ${JSON.stringify(args.promotions)}
Dates to forecast: ${JSON.stringify(dates)}

For each date, provide predictions for 'B2B', 'B2C', and 'all' segments.
Include confidence levels (0-100) and contributing factors.
Flag any capacity warnings, demand spikes, or carrier constraints as alerts.`;

      const result = await model.generateContent(prompt);
      const response = result.response;

      // Default forecast if AI fails
      const defaultPredictions = dates.flatMap((date) => [
        {
          date,
          segment: "all",
          predictedVolume: Math.round(args.upcomingOrders.length * 0.8 + Math.random() * 10),
          confidenceLevel: 75,
          factors: ["Historical average", "Current order pipeline"],
        },
      ]);

      return parseAIResponse(response.text(), {
        predictions: defaultPredictions,
        alerts: [],
      });
    } catch (error) {
      console.error("Forecast generation error:", error);
      return {
        predictions: [],
        alerts: [{ type: "error", severity: "medium", message: "AI forecast unavailable" }],
      };
    }
  },
});

/**
 * Draft exception response for customer inquiry
 */
export const draftExceptionResponseAction = action({
  args: {
    customerInquiry: v.string(),
    shipment: v.any(),
    order: v.any(),
    internalNotes: v.array(v.string()),
  },
  handler: async (_ctx, args) => {
    try {
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

      const prompt = `A customer has inquired about their shipment. Draft a professional, empathetic response.

Customer Inquiry: "${args.customerInquiry}"

Shipment Details:
- Shipment #: ${args.shipment?.shipmentNumber}
- Status: ${args.shipment?.status}
- Carrier: ${args.shipment?.carrier}
- Tracking: ${args.shipment?.trackingNumber}
- Estimated Delivery: ${args.shipment?.estimatedDelivery}

Order Details:
- Order #: ${args.order?.orderNumber}
- Customer: ${args.order?.customerName}
- Type: ${args.order?.customerType}

Internal Notes: ${args.internalNotes.join("; ")}

Write a response that:
1. Acknowledges their concern
2. Provides relevant tracking/status information
3. Offers next steps or resolution
4. Maintains professional yet warm tone
5. Keep under 150 words`;

      const result = await model.generateContent(prompt);
      return result.response.text() || "Unable to generate response. Please try again.";
    } catch (error) {
      console.error("Exception response error:", error);
      return "Unable to generate AI response. Please draft manually.";
    }
  },
});








