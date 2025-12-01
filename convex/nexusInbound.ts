import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { requireTenantId, getCurrentTenantId } from "./helpers/tenantScope";

// ============================================
// Dashboard Queries
// ============================================

export const getDashboardData = query({
  args: {},
  handler: async (ctx) => {
    const tenantId = await getCurrentTenantId(ctx);

    if (!tenantId) {
      return null;
    }

    const vendors = await ctx.db
      .query("nexusInboundVendors")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    const pos = await ctx.db
      .query("nexusInboundPOs")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    const discrepancies = await ctx.db
      .query("nexusInboundDiscrepancies")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    const ediLogs = await ctx.db
      .query("nexusInboundEdiLogs")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .order("desc")
      .take(50);

    const scorecards = await ctx.db
      .query("nexusInboundScorecards")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    return { vendors, pos, discrepancies, ediLogs, scorecards };
  },
});

// ============================================
// Discrepancy Mutations
// ============================================

export const createDiscrepancy = mutation({
  args: {
    poNumber: v.string(),
    vendorName: v.string(),
    type: v.string(),
    severity: v.string(),
    description: v.string(),
    status: v.string(),
    createdAt: v.string(),
    itemSku: v.optional(v.string()),
    expectedQty: v.optional(v.number()),
    receivedQty: v.optional(v.number()),
    qualityIssueType: v.optional(v.string()),
    inspectionDetails: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const tenantId = await requireTenantId(ctx);
    await ctx.db.insert("nexusInboundDiscrepancies", { ...args, tenantId });
  },
});

export const updateDiscrepancy = mutation({
  args: {
    id: v.id("nexusInboundDiscrepancies"),
    status: v.string(),
    resolutionNote: v.optional(v.string()),
    resolutionOutcome: v.optional(v.string()),
    resolvedAt: v.optional(v.string()),
    type: v.optional(v.string()),
    severity: v.optional(v.string()),
    description: v.optional(v.string()),
    itemSku: v.optional(v.string()),
    expectedQty: v.optional(v.number()),
    receivedQty: v.optional(v.number()),
    qualityIssueType: v.optional(v.string()),
    inspectionDetails: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const tenantId = await requireTenantId(ctx);
    const { id, ...updates } = args;

    const discrepancy = await ctx.db.get(id);
    if (!discrepancy || discrepancy.tenantId !== tenantId) {
      throw new Error("Discrepancy not found");
    }

    await ctx.db.patch(id, updates);
  },
});

// ============================================
// Purchase Order Mutations
// ============================================

export const updatePO = mutation({
  args: {
    id: v.id("nexusInboundPOs"),
    status: v.string(),
    lines: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const tenantId = await requireTenantId(ctx);
    const { id, ...updates } = args;

    const po = await ctx.db.get(id);
    if (!po || po.tenantId !== tenantId) {
      throw new Error("PO not found");
    }

    const oldStatus = po.status;
    await ctx.db.patch(id, updates);

    // Trigger cross-module intelligence: Check if work orders can be released
    const newStatus = args.status;
    if (
      (newStatus === "Partial" || newStatus === "Closed") &&
      oldStatus !== newStatus
    ) {
      await ctx.scheduler.runAfter(0, internal.nexusIntelligence.detectWORelease, {
        tenantId,
        poId: id,
      });
    }
  },
});

export const addPO = mutation({
  args: {
    poNumber: v.string(),
    vendorId: v.id("nexusInboundVendors"),
    vendorName: v.string(),
    dateOrdered: v.string(),
    datePromised: v.string(),
    status: v.string(),
    lines: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const tenantId = await requireTenantId(ctx);
    await ctx.db.insert("nexusInboundPOs", { ...args, tenantId });
  },
});

// ============================================
// EDI Log Mutations
// ============================================

export const logEdiMessage = mutation({
  args: {
    type: v.string(),
    direction: v.string(),
    partner: v.string(),
    timestamp: v.string(),
    status: v.string(),
    rawSize: v.string(),
  },
  handler: async (ctx, args) => {
    const tenantId = await requireTenantId(ctx);
    await ctx.db.insert("nexusInboundEdiLogs", { ...args, tenantId });
  },
});

// ============================================
// Seed Data Mutation
// ============================================

export const seedData = mutation({
  args: {},
  handler: async (ctx) => {
    const tenantId = await requireTenantId(ctx);

    // Check if data exists
    const existing = await ctx.db
      .query("nexusInboundVendors")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .first();

    if (existing) return "Already seeded";

    // Create Vendors
    const v1 = await ctx.db.insert("nexusInboundVendors", {
      tenantId,
      name: "Acme Industrial",
      ediId: "ACM001",
      status: "Active",
      overallScore: 92,
    });

    const v2 = await ctx.db.insert("nexusInboundVendors", {
      tenantId,
      name: "Globex Corp",
      ediId: "GLB999",
      status: "OnHold",
      overallScore: 74,
    });

    const v3 = await ctx.db.insert("nexusInboundVendors", {
      tenantId,
      name: "Soylent Supply",
      ediId: "SYL123",
      status: "Active",
      overallScore: 88,
    });

    // Create Purchase Orders
    await ctx.db.insert("nexusInboundPOs", {
      tenantId,
      poNumber: "PO-10045",
      vendorId: v1,
      vendorName: "Acme Industrial",
      dateOrdered: "2023-10-01",
      datePromised: "2023-10-15",
      status: "Open",
      lines: [
        {
          id: "l1",
          itemSku: "SKU-998",
          description: "Steel Bolts M10",
          qtyOrdered: 5000,
          qtyReceived: 0,
          unitPrice: 0.25,
          uom: "EA",
        },
        {
          id: "l2",
          itemSku: "SKU-102",
          description: "Aluminum Sheet 4x8",
          qtyOrdered: 200,
          qtyReceived: 0,
          unitPrice: 45.0,
          uom: "EA",
        },
      ],
    });

    await ctx.db.insert("nexusInboundPOs", {
      tenantId,
      poNumber: "PO-10046",
      vendorId: v2,
      vendorName: "Globex Corp",
      dateOrdered: "2023-10-05",
      datePromised: "2023-10-20",
      status: "Partial",
      lines: [
        {
          id: "l3",
          itemSku: "CHEM-X",
          description: "Industrial Solvent",
          qtyOrdered: 1000,
          qtyReceived: 500,
          unitPrice: 12.5,
          uom: "L",
        },
      ],
    });

    // Create Discrepancies
    await ctx.db.insert("nexusInboundDiscrepancies", {
      tenantId,
      poNumber: "PO-10042",
      vendorName: "Globex Corp",
      type: "QuantityShortage",
      severity: "High",
      description: "Expected 500 units of SKU-101, received 450.",
      status: "Pending Vendor",
      createdAt: "2023-10-10T09:30:00Z",
      itemSku: "SKU-101",
      expectedQty: 500,
      receivedQty: 450,
    });

    await ctx.db.insert("nexusInboundDiscrepancies", {
      tenantId,
      poNumber: "PO-10044",
      vendorName: "Soylent Supply",
      type: "QualityFailure",
      severity: "Critical",
      description: "Batch 99 failed viscosity test during inspection.",
      status: "Open",
      createdAt: "2023-10-12T14:15:00Z",
      itemSku: "VISCO-OIL",
    });

    await ctx.db.insert("nexusInboundDiscrepancies", {
      tenantId,
      poNumber: "PO-10039",
      vendorName: "Acme Industrial",
      type: "PriceMismatch",
      severity: "Medium",
      description: "Invoice unit price $0.28 vs PO price $0.25.",
      status: "Resolved",
      createdAt: "2023-10-01T10:00:00Z",
      resolvedAt: "2023-10-02T11:00:00Z",
      itemSku: "BOLT-X10",
    });

    // Create EDI Logs
    await ctx.db.insert("nexusInboundEdiLogs", {
      tenantId,
      type: "856",
      direction: "Inbound",
      partner: "Acme Industrial",
      timestamp: "10:45 AM",
      status: "Processed",
      rawSize: "12KB",
    });

    await ctx.db.insert("nexusInboundEdiLogs", {
      tenantId,
      type: "997",
      direction: "Outbound",
      partner: "Acme Industrial",
      timestamp: "10:46 AM",
      status: "Processed",
      rawSize: "1KB",
    });

    await ctx.db.insert("nexusInboundEdiLogs", {
      tenantId,
      type: "810",
      direction: "Inbound",
      partner: "Globex Corp",
      timestamp: "09:15 AM",
      status: "Failed",
      rawSize: "8KB",
    });

    await ctx.db.insert("nexusInboundEdiLogs", {
      tenantId,
      type: "850",
      direction: "Outbound",
      partner: "Soylent Supply",
      timestamp: "Yesterday",
      status: "Processed",
      rawSize: "4KB",
    });

    // Create Scorecards
    await ctx.db.insert("nexusInboundScorecards", {
      tenantId,
      vendorId: v1,
      period: "Q3 2023",
      totalScore: 92,
      components: [
        { metric: "On-Time Delivery", score: 98, weight: 0.3 },
        { metric: "Qty Accuracy", score: 100, weight: 0.25 },
        { metric: "Quality", score: 85, weight: 0.3 },
        { metric: "Documentation", score: 90, weight: 0.1 },
        { metric: "Responsiveness", score: 80, weight: 0.05 },
      ],
      history: [
        { date: "2023-01", score: 88 },
        { date: "2023-02", score: 89 },
        { date: "2023-03", score: 91 },
        { date: "2023-04", score: 85 },
        { date: "2023-05", score: 92 },
        { date: "2023-06", score: 94 },
      ],
    });

    await ctx.db.insert("nexusInboundScorecards", {
      tenantId,
      vendorId: v2,
      period: "Q3 2023",
      totalScore: 74,
      components: [
        { metric: "On-Time Delivery", score: 65, weight: 0.3 },
        { metric: "Qty Accuracy", score: 70, weight: 0.25 },
        { metric: "Quality", score: 80, weight: 0.3 },
        { metric: "Documentation", score: 85, weight: 0.1 },
        { metric: "Responsiveness", score: 90, weight: 0.05 },
      ],
      history: [
        { date: "2023-01", score: 78 },
        { date: "2023-02", score: 75 },
        { date: "2023-03", score: 72 },
        { date: "2023-04", score: 70 },
        { date: "2023-05", score: 74 },
        { date: "2023-06", score: 74 },
      ],
    });

    await ctx.db.insert("nexusInboundScorecards", {
      tenantId,
      vendorId: v3,
      period: "Q3 2023",
      totalScore: 88,
      components: [
        { metric: "On-Time Delivery", score: 90, weight: 0.3 },
        { metric: "Qty Accuracy", score: 95, weight: 0.25 },
        { metric: "Quality", score: 82, weight: 0.3 },
        { metric: "Documentation", score: 80, weight: 0.1 },
        { metric: "Responsiveness", score: 95, weight: 0.05 },
      ],
      history: [
        { date: "2023-01", score: 82 },
        { date: "2023-02", score: 85 },
        { date: "2023-03", score: 86 },
        { date: "2023-04", score: 88 },
        { date: "2023-05", score: 89 },
        { date: "2023-06", score: 88 },
      ],
    });

    return "Seeding Complete";
  },
});

/**
 * Internal seed mutation (for dev tools)
 */
export const seedDataInternal = internalMutation({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const tenantId = args.tenantId;

    const existing = await ctx.db
      .query("nexusInboundVendors")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .first();

    if (existing) return "Already seeded";

    // Create Vendors
    const v1 = await ctx.db.insert("nexusInboundVendors", { tenantId, name: "Acme Industrial", ediId: "ACM001", status: "Active", overallScore: 92 });
    const v2 = await ctx.db.insert("nexusInboundVendors", { tenantId, name: "Globex Corp", ediId: "GLB999", status: "OnHold", overallScore: 74 });
    const v3 = await ctx.db.insert("nexusInboundVendors", { tenantId, name: "Soylent Supply", ediId: "SYL123", status: "Active", overallScore: 88 });

    // Create POs
    await ctx.db.insert("nexusInboundPOs", { tenantId, poNumber: "PO-10045", vendorId: v1, vendorName: "Acme Industrial", dateOrdered: "2023-10-01", datePromised: "2023-10-15", status: "Open", lines: [{ id: "l1", itemSku: "SKU-998", description: "Widget A", qtyOrdered: 100, qtyReceived: 0, unitPrice: 12.5, uom: "EA" }] });
    await ctx.db.insert("nexusInboundPOs", { tenantId, poNumber: "PO-10046", vendorId: v2, vendorName: "Globex Corp", dateOrdered: "2023-09-25", datePromised: "2023-10-10", status: "Partial", lines: [{ id: "l1", itemSku: "SKU-112", description: "Gadget B", qtyOrdered: 200, qtyReceived: 150, unitPrice: 25.0, uom: "EA" }] });

    // Create Discrepancies
    await ctx.db.insert("nexusInboundDiscrepancies", { tenantId, poNumber: "PO-10046", vendorName: "Globex Corp", type: "ShortShip", severity: "High", status: "Open", description: "Short 50 units of SKU-112", itemSku: "SKU-112", expectedQty: 200, receivedQty: 150, createdAt: "2023-10-08" });

    // Create Scorecards
    await ctx.db.insert("nexusInboundScorecards", { tenantId, vendorId: v1, totalScore: 88, period: "2023-H1", components: [{ metric: "On-Time Delivery", score: 90, weight: 0.3 }], history: [{ date: "2023-06", score: 88 }] });

    return "Seeding Complete";
  },
});

/**
 * DEV ONLY: Seed with explicit tenant ID
 */
export const devSeedInbound = mutation({
  args: { tenantIdStr: v.string() },
  handler: async (ctx, args) => {
    const tenantId = args.tenantIdStr as Id<"tenants">;
    await ctx.runMutation(internal.nexusInbound.seedDataInternal, { tenantId });
    return { success: true };
  },
});
