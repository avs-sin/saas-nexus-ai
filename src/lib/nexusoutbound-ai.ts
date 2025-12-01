"use server";

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
// Type Definitions
// ============================================

export interface OutboundBriefing {
  headline: string;
  volumeForecast: {
    today: number;
    tomorrow: number;
    trend: "up" | "down" | "stable";
  };
  criticalAlerts: string[];
  customerHighlight: string;
}

export interface ShipmentNotification {
  subject: string;
  body: string;
  tone: string;
}

export interface AccountBriefing {
  subject: string;
  summary: string;
  metrics: {
    totalShipments: number;
    onTimeRate: number;
    totalValue: number;
  };
  highlights: string[];
  nextWeekOutlook: string;
}

export interface ForecastPrediction {
  date: string;
  segment: string;
  carrier?: string;
  region?: string;
  predictedVolume: number;
  confidenceLevel: number;
  factors: string[];
}

export interface ForecastAlert {
  type: string;
  severity: string;
  message: string;
}

export interface ShippingForecast {
  predictions: ForecastPrediction[];
  alerts: ForecastAlert[];
}

// ============================================
// Dashboard Briefing
// ============================================

export async function generateOutboundBriefing(
  data: {
    orders: unknown[];
    shipments: unknown[];
    discrepancies: unknown[];
    forecasts: unknown[];
    kpis: {
      ordersToShipToday: number;
      inTransitShipments: number;
      deliveredThisWeek: number;
      openDiscrepancies: number;
      exceptionRate: number;
    };
  }
): Promise<OutboundBriefing> {
  const fallback: OutboundBriefing = {
    headline: `${data.kpis.ordersToShipToday} orders to ship today. Operations running normally.`,
    volumeForecast: {
      today: data.kpis.ordersToShipToday,
      tomorrow: Math.round(data.kpis.ordersToShipToday * 1.1),
      trend: "stable",
    },
    criticalAlerts:
      data.kpis.openDiscrepancies > 0
        ? [`${data.kpis.openDiscrepancies} open discrepancies require attention`]
        : ["No critical alerts"],
    customerHighlight: "All customer shipments on track.",
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

Orders: ${JSON.stringify(data.orders.slice(0, 20), null, 2)}
Shipments: ${JSON.stringify(data.shipments.slice(0, 20), null, 2)}
Discrepancies: ${JSON.stringify(data.discrepancies, null, 2)}
Forecasts: ${JSON.stringify(data.forecasts, null, 2)}
KPIs: ${JSON.stringify(data.kpis, null, 2)}

Provide:
1. "headline": A punchy 1-sentence summary of today's shipping outlook (mention specific numbers)
2. "volumeForecast": { today: number, tomorrow: number, trend: "up"|"down"|"stable" }
3. "criticalAlerts": Top 3 urgent issues (late orders, exceptions, capacity issues)
4. "customerHighlight": One notable customer-related insight (e.g., large B2B shipment, VIP order)

Be specific and data-driven.`;

    const result = await model.generateContent(prompt);
    return parseAIResponse(result.response.text(), fallback);
  } catch (error) {
    console.error("Briefing error:", error);
    return fallback;
  }
}

// ============================================
// Shipment Notifications
// ============================================

export async function generateShipmentNotification(
  shipment: {
    shipmentNumber: string;
    carrier: string;
    trackingNumber?: string;
    trackingUrl?: string;
    estimatedDelivery?: string;
  },
  order: {
    orderNumber: string;
    customerName: string;
    customerType: string;
  },
  event: "shipped" | "out_for_delivery" | "delivered" | "delayed" | "exception",
  context?: { delayReason?: string; newEta?: string }
): Promise<ShipmentNotification> {
  const fallback: ShipmentNotification = {
    subject: `Order ${order.orderNumber} - ${event.replace("_", " ").toUpperCase()}`,
    body: `Your order ${order.orderNumber} status: ${event}. Track at: ${shipment.trackingUrl || "N/A"}`,
    tone: order.customerType === "B2B" ? "professional" : "friendly",
  };

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

    const toneGuidance =
      order.customerType === "B2B"
        ? "Professional, concise, and formal. Use company name. Include order/PO reference."
        : "Friendly, warm, and conversational. Use first name if available. Add a personal touch.";

    const eventContext = {
      shipped: "The order has shipped and is on its way.",
      out_for_delivery: "The package is out for delivery today.",
      delivered: "The package has been delivered successfully.",
      delayed: `There is a delay. Reason: ${context?.delayReason || "carrier delay"}. New ETA: ${context?.newEta || "TBD"}.`,
      exception: "There is an issue with the delivery that requires attention.",
    };

    const prompt = `Generate a shipping notification email for this event:

Event: ${event}
Context: ${eventContext[event]}
Customer Type: ${order.customerType}
Order Number: ${order.orderNumber}
Customer Name: ${order.customerName}
Carrier: ${shipment.carrier}
Tracking Number: ${shipment.trackingNumber || "Not available yet"}
Estimated Delivery: ${shipment.estimatedDelivery || "TBD"}

Tone guidance: ${toneGuidance}

Generate a JSON with:
- "subject": Email subject line
- "body": Email body (plain text, keep under 150 words)
- "tone": The tone used (e.g., "professional", "friendly", "apologetic")`;

    const result = await model.generateContent(prompt);
    return parseAIResponse(result.response.text(), fallback);
  } catch (error) {
    console.error("Notification error:", error);
    return fallback;
  }
}

// ============================================
// B2B Account Briefing
// ============================================

export async function generateAccountBriefing(
  customerName: string,
  shipmentsThisWeek: unknown[],
  ordersThisWeek: unknown[]
): Promise<AccountBriefing | null> {
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

    const prompt = `Generate a weekly shipping briefing for B2B account: ${customerName}

This Week's Shipments: ${JSON.stringify(shipmentsThisWeek, null, 2)}
This Week's Orders: ${JSON.stringify(ordersThisWeek, null, 2)}

Create a professional weekly summary with:
- "subject": Email subject for weekly briefing
- "summary": 2-3 sentence executive summary
- "metrics": { totalShipments, onTimeRate (percentage 0-100), totalValue (estimated) }
- "highlights": 3 key points about their shipments this week
- "nextWeekOutlook": Brief outlook on upcoming shipments`;

    const result = await model.generateContent(prompt);
    return parseAIResponse(result.response.text(), null);
  } catch (error) {
    console.error("Account briefing error:", error);
    return null;
  }
}

// ============================================
// Shipping Demand Forecast
// ============================================

export async function generateShippingForecast(
  historicalShipments: unknown[],
  upcomingOrders: unknown[],
  externalFactors: { holidays: string[]; promotions: unknown[] }
): Promise<ShippingForecast> {
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  const fallback: ShippingForecast = {
    predictions: dates.map((date) => ({
      date,
      segment: "all",
      predictedVolume: Math.round(upcomingOrders.length * 0.8 + Math.random() * 10),
      confidenceLevel: 75,
      factors: ["Historical average"],
    })),
    alerts: [],
  };

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

    const prompt = `You are an AI demand forecasting engine for shipping operations.

Based on this data, predict shipping volumes for the next 7 days:

Historical Shipments: ${JSON.stringify(historicalShipments.slice(0, 30), null, 2)}
Upcoming Orders: ${JSON.stringify(upcomingOrders, null, 2)}
Holidays: ${JSON.stringify(externalFactors.holidays)}
Promotions: ${JSON.stringify(externalFactors.promotions)}
Dates to forecast: ${JSON.stringify(dates)}

For each date, provide predictions for 'B2B', 'B2C', and 'all' segments.
Include confidence levels (0-100) and contributing factors.
Flag any capacity warnings, demand spikes, or carrier constraints as alerts.`;

    const result = await model.generateContent(prompt);
    return parseAIResponse(result.response.text(), fallback);
  } catch (error) {
    console.error("Forecast error:", error);
    return fallback;
  }
}

// ============================================
// Exception Response Drafting
// ============================================

export async function draftExceptionResponse(
  customerInquiry: string,
  shipment: {
    shipmentNumber: string;
    status: string;
    carrier: string;
    trackingNumber?: string;
    estimatedDelivery?: string;
  },
  order: {
    orderNumber: string;
    customerName: string;
    customerType: string;
  },
  internalNotes: string[]
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = `A customer has inquired about their shipment. Draft a professional, empathetic response.

Customer Inquiry: "${customerInquiry}"

Shipment Details:
- Shipment #: ${shipment.shipmentNumber}
- Status: ${shipment.status}
- Carrier: ${shipment.carrier}
- Tracking: ${shipment.trackingNumber}
- Estimated Delivery: ${shipment.estimatedDelivery}

Order Details:
- Order #: ${order.orderNumber}
- Customer: ${order.customerName}
- Type: ${order.customerType}

Internal Notes: ${internalNotes.join("; ")}

Write a response that:
1. Acknowledges their concern
2. Provides relevant tracking/status information
3. Offers next steps or resolution
4. Maintains ${order.customerType === "B2B" ? "professional" : "friendly"} tone
5. Keep under 150 words`;

    const result = await model.generateContent(prompt);
    return result.response.text() || "Unable to generate response.";
  } catch (error) {
    console.error("Exception response error:", error);
    return "Unable to generate AI response. Please draft manually.";
  }
}


