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
    
    // Return null if no tenant yet (user not in org or tenant not synced)
    if (!tenantId) {
      return null;
    }

    const pos = await ctx.db
      .query("nexusPurchaseOrders")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    const discrepancies = await ctx.db
      .query("nexusDiscrepancies")
      .withIndex("by_tenantId_and_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "OPEN")
      )
      .collect();

    const scores = await ctx.db
      .query("nexusCustomerScores")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    const openPos = pos.filter((p) => p.status === "OPEN").length;
    const avgScore =
      scores.length > 0
        ? scores.reduce((a, b) => a + b.totalScore, 0) / scores.length
        : 0;

    return {
      pos,
      openPosCount: openPos,
      discrepancyCount: discrepancies.length,
      avgScore,
      recentActivity: pos.slice(0, 5),
    };
  },
});

// ============================================
// Planning Board Queries
// ============================================

export const getPlanningData = query({
  args: {},
  handler: async (ctx) => {
    const tenantId = await getCurrentTenantId(ctx);
    if (!tenantId) return null;

    const plans = await ctx.db
      .query("nexusPlans")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    const customers = await ctx.db
      .query("nexusCustomers")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    const pos = await ctx.db
      .query("nexusPurchaseOrders")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    return { plans, customers, pos };
  },
});

// ============================================
// Discrepancy Queries
// ============================================

export const getDiscrepancies = query({
  args: {},
  handler: async (ctx) => {
    const tenantId = await getCurrentTenantId(ctx);
    if (!tenantId) return null;

    return await ctx.db
      .query("nexusDiscrepancies")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();
  },
});

export const updateDiscrepancyStatus = mutation({
  args: {
    discrepancyId: v.id("nexusDiscrepancies"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const tenantId = await requireTenantId(ctx);

    const discrepancy = await ctx.db.get(args.discrepancyId);
    if (!discrepancy || discrepancy.tenantId !== tenantId) {
      throw new Error("Discrepancy not found");
    }

    await ctx.db.patch(args.discrepancyId, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

// ============================================
// Purchase Order Queries
// ============================================

export const getPurchaseOrders = query({
  args: {},
  handler: async (ctx) => {
    const tenantId = await getCurrentTenantId(ctx);
    if (!tenantId) return null;

    return await ctx.db
      .query("nexusPurchaseOrders")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();
  },
});

export const getPurchaseOrderById = query({
  args: { poId: v.id("nexusPurchaseOrders") },
  handler: async (ctx, args) => {
    const tenantId = await getCurrentTenantId(ctx);
    if (!tenantId) return null;

    const po = await ctx.db.get(args.poId);
    if (!po || po.tenantId !== tenantId) {
      return null;
    }

    return po;
  },
});

// ============================================
// Customer Scorecard Queries
// ============================================

export const getCustomerScorecards = query({
  args: {},
  handler: async (ctx) => {
    const tenantId = await getCurrentTenantId(ctx);
    if (!tenantId) return null;

    const scores = await ctx.db
      .query("nexusCustomerScores")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    const customers = await ctx.db
      .query("nexusCustomers")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    return { scores, customers };
  },
});

// ============================================
// Vendor Scorecard Queries
// ============================================

export const getVendorScorecards = query({
  args: {},
  handler: async (ctx) => {
    const tenantId = await getCurrentTenantId(ctx);
    if (!tenantId) return null;

    const scores = await ctx.db
      .query("nexusVendorScores")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    const vendors = await ctx.db
      .query("nexusVendors")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    const pos = await ctx.db
      .query("nexusPurchaseOrders")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    const discrepancies = await ctx.db
      .query("nexusDiscrepancies")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    return { scores, vendors, pos, discrepancies };
  },
});

// ============================================
// Plan Mutations
// ============================================

export const upsertPlan = mutation({
  args: {
    planId: v.optional(v.id("nexusPlans")),
    customerId: v.id("nexusCustomers"),
    sku: v.string(),
    periodStart: v.string(),
    planQty: v.number(),
  },
  handler: async (ctx, args) => {
    const tenantId = await requireTenantId(ctx);
    const now = Date.now();

    let previousQty = 0;
    let resultId: any;

    if (args.planId) {
      // Update existing plan
      const existingPlan = await ctx.db.get(args.planId);
      if (!existingPlan || existingPlan.tenantId !== tenantId) {
        throw new Error("Plan not found");
      }
      previousQty = existingPlan.planQty;

      await ctx.db.patch(args.planId, {
        customerId: args.customerId,
        sku: args.sku,
        periodStart: args.periodStart,
        planQty: args.planQty,
        updatedAt: now,
      });
      resultId = args.planId;
    } else {
      // Check if plan exists for this customer/sku/period
      const existingPlan = await ctx.db
        .query("nexusPlans")
        .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
        .filter((q) =>
          q.and(
            q.eq(q.field("customerId"), args.customerId),
            q.eq(q.field("sku"), args.sku),
            q.eq(q.field("periodStart"), args.periodStart)
          )
        )
        .first();

      if (existingPlan) {
        previousQty = existingPlan.planQty;
        await ctx.db.patch(existingPlan._id, {
          planQty: args.planQty,
          updatedAt: now,
        });
        resultId = existingPlan._id;
      } else {
        // Create new plan
        resultId = await ctx.db.insert("nexusPlans", {
          tenantId,
          customerId: args.customerId,
          sku: args.sku,
          periodStart: args.periodStart,
          planQty: args.planQty,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Trigger cross-module intelligence: Cascade forecast changes
    await ctx.scheduler.runAfter(0, internal.nexusIntelligence.cascadeForecast, {
      tenantId,
      planId: resultId,
      previousQty,
    });

    return resultId;
  },
});

// ============================================
// Entity Lookup Queries
// ============================================

export const getCustomers = query({
  args: {},
  handler: async (ctx) => {
    const tenantId = await getCurrentTenantId(ctx);
    if (!tenantId) return null;

    return await ctx.db
      .query("nexusCustomers")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();
  },
});

export const getVendors = query({
  args: {},
  handler: async (ctx) => {
    const tenantId = await getCurrentTenantId(ctx);
    if (!tenantId) return null;

    return await ctx.db
      .query("nexusVendors")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();
  },
});

// ============================================
// Seed Data Mutation
// ============================================

export const seedNexusPlanData = mutation({
  args: {},
  handler: async (ctx) => {
    const tenantId = await requireTenantId(ctx);
    const now = Date.now();

    // Check if data already exists
    const existingCustomer = await ctx.db
      .query("nexusCustomers")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .first();

    if (existingCustomer) {
      return { success: false, message: "Data already seeded for this tenant" };
    }

    // Create Customers
    const c1 = await ctx.db.insert("nexusCustomers", {
      tenantId,
      name: "Acme Automotives",
      salesRep: "John Doe",
      ediId: "ACME_EDI_001",
      createdAt: now,
      updatedAt: now,
    });

    const c2 = await ctx.db.insert("nexusCustomers", {
      tenantId,
      name: "Globex Aerospace",
      salesRep: "Sarah Smith",
      ediId: "GLBX_EDI_882",
      createdAt: now,
      updatedAt: now,
    });

    const c3 = await ctx.db.insert("nexusCustomers", {
      tenantId,
      name: "Soylent Nutrition",
      salesRep: "Mike Ross",
      ediId: "SOYL_EDI_999",
      createdAt: now,
      updatedAt: now,
    });

    const c4 = await ctx.db.insert("nexusCustomers", {
      tenantId,
      name: "Massive Dynamic",
      salesRep: "Walter B.",
      ediId: "MASS_EDI_777",
      createdAt: now,
      updatedAt: now,
    });

    // Create Vendors
    const v1 = await ctx.db.insert("nexusVendors", {
      tenantId,
      name: "Global Component Systems",
      category: "Raw Materials",
      contactEmail: "orders@gcs.com",
      createdAt: now,
      updatedAt: now,
    });

    const v2 = await ctx.db.insert("nexusVendors", {
      tenantId,
      name: "Rapid Parts Inc",
      category: "Machining",
      contactEmail: "sales@rapidparts.com",
      createdAt: now,
      updatedAt: now,
    });

    const v3 = await ctx.db.insert("nexusVendors", {
      tenantId,
      name: "Steel Works Ltd",
      category: "Metals",
      contactEmail: "supply@steelworks.com",
      createdAt: now,
      updatedAt: now,
    });

    // Create Plans
    await ctx.db.insert("nexusPlans", {
      tenantId,
      customerId: c1,
      sku: "BRAKE-PAD-X1",
      periodStart: "2024-10",
      planQty: 1000,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("nexusPlans", {
      tenantId,
      customerId: c1,
      sku: "BRAKE-PAD-X1",
      periodStart: "2024-11",
      planQty: 1200,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("nexusPlans", {
      tenantId,
      customerId: c1,
      sku: "BRAKE-PAD-X1",
      periodStart: "2024-12",
      planQty: 800,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("nexusPlans", {
      tenantId,
      customerId: c2,
      sku: "TURBINE-BLADE-Z",
      periodStart: "2024-10",
      planQty: 50,
      createdAt: now,
      updatedAt: now,
    });

    // Create Purchase Orders
    const po1 = await ctx.db.insert("nexusPurchaseOrders", {
      tenantId,
      poNumber: "PO-9001",
      customerId: c1,
      vendorId: v1,
      status: "OPEN",
      sku: "BRAKE-PAD-X1",
      currentQty: 1100,
      currentDeliveryDate: "2024-10-15",
      versions: [
        {
          versionNumber: 1,
          changeType: "CREATED",
          changedBy: "EDI_GW",
          changeReason: "Initial 850 Order",
          changedAt: "2024-09-01T08:00:00Z",
          payload: { qty: 1000, deliveryDate: "2024-10-10", price: 45.0 },
        },
        {
          versionNumber: 2,
          changeType: "QTY_CHANGE",
          changedBy: "EDI_GW",
          changeReason: "860 Revision - Increased Demand",
          changedAt: "2024-09-15T14:30:00Z",
          payload: { qty: 1100, deliveryDate: "2024-10-10", price: 45.0 },
        },
        {
          versionNumber: 3,
          changeType: "DATE_CHANGE",
          changedBy: "Planner_UI",
          changeReason: "Supplier Delay Accepted",
          changedAt: "2024-10-01T09:15:00Z",
          payload: { qty: 1100, deliveryDate: "2024-10-15", price: 45.0 },
        },
      ],
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("nexusPurchaseOrders", {
      tenantId,
      poNumber: "PO-9002",
      customerId: c1,
      vendorId: v1,
      status: "CLOSED",
      sku: "BRAKE-PAD-X1",
      currentQty: 1200,
      currentDeliveryDate: "2024-11-05",
      versions: [
        {
          versionNumber: 1,
          changeType: "CREATED",
          changedBy: "EDI_GW",
          changeReason: "Initial 850",
          changedAt: "2024-10-01T08:00:00Z",
          payload: { qty: 1200, deliveryDate: "2024-11-05", price: 45.0 },
        },
      ],
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("nexusPurchaseOrders", {
      tenantId,
      poNumber: "PO-9003",
      customerId: c2,
      vendorId: v2,
      status: "OPEN",
      sku: "TURBINE-BLADE-Z",
      currentQty: 50,
      currentDeliveryDate: "2024-10-20",
      versions: [
        {
          versionNumber: 1,
          changeType: "CREATED",
          changedBy: "EDI_GW",
          changeReason: "Initial 850",
          changedAt: "2024-10-05T08:00:00Z",
          payload: { qty: 50, deliveryDate: "2024-10-20", price: 1200.0 },
        },
      ],
      createdAt: now,
      updatedAt: now,
    });

    // Create Discrepancies
    await ctx.db.insert("nexusDiscrepancies", {
      tenantId,
      relatedType: "PO",
      relatedId: "PO-9001",
      metric: "QTY_VARIANCE",
      severity: "MEDIUM",
      expected: 1000,
      actual: 1100,
      status: "OPEN",
      detectedAt: "2024-09-15T14:31:00Z",
      description: "PO Qty exceeds Plan Qty by 10% after Revision 2.",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("nexusDiscrepancies", {
      tenantId,
      relatedType: "RECEIPT",
      relatedId: "REC-554",
      metric: "TIMING_VARIANCE",
      severity: "HIGH",
      expected: "2024-10-01",
      actual: "2024-10-05",
      status: "RESOLVED",
      detectedAt: "2024-10-06T10:00:00Z",
      description: "Receipt arrived 4 days late vs Promised Date.",
      createdAt: now,
      updatedAt: now,
    });

    // Create Customer Scores
    await ctx.db.insert("nexusCustomerScores", {
      tenantId,
      customerId: c1,
      totalScore: 82,
      metrics: [
        { name: "Forecast Accuracy", value: 75, weight: 0.4 },
        { name: "PO Stability", value: 80, weight: 0.25 },
        { name: "On-Time Fulfillment", value: 95, weight: 0.2 },
        { name: "EDI Compliance", value: 90, weight: 0.15 },
      ],
      trend: [
        { date: "2024-08", score: 78 },
        { date: "2024-09", score: 80 },
        { date: "2024-10", score: 82 },
      ],
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("nexusCustomerScores", {
      tenantId,
      customerId: c2,
      totalScore: 94,
      metrics: [
        { name: "Forecast Accuracy", value: 95, weight: 0.4 },
        { name: "PO Stability", value: 98, weight: 0.25 },
        { name: "On-Time Fulfillment", value: 90, weight: 0.2 },
        { name: "EDI Compliance", value: 85, weight: 0.15 },
      ],
      trend: [
        { date: "2024-08", score: 92 },
        { date: "2024-09", score: 93 },
        { date: "2024-10", score: 94 },
      ],
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("nexusCustomerScores", {
      tenantId,
      customerId: c3,
      totalScore: 68,
      metrics: [
        { name: "Forecast Accuracy", value: 60, weight: 0.4 },
        { name: "PO Stability", value: 70, weight: 0.25 },
        { name: "On-Time Fulfillment", value: 80, weight: 0.2 },
        { name: "EDI Compliance", value: 65, weight: 0.15 },
      ],
      trend: [
        { date: "2024-08", score: 72 },
        { date: "2024-09", score: 70 },
        { date: "2024-10", score: 68 },
      ],
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("nexusCustomerScores", {
      tenantId,
      customerId: c4,
      totalScore: 88,
      metrics: [
        { name: "Forecast Accuracy", value: 85, weight: 0.4 },
        { name: "PO Stability", value: 90, weight: 0.25 },
        { name: "On-Time Fulfillment", value: 88, weight: 0.2 },
        { name: "EDI Compliance", value: 92, weight: 0.15 },
      ],
      trend: [
        { date: "2024-08", score: 85 },
        { date: "2024-09", score: 87 },
        { date: "2024-10", score: 88 },
      ],
      createdAt: now,
      updatedAt: now,
    });

    // Create Vendor Scores
    await ctx.db.insert("nexusVendorScores", {
      tenantId,
      vendorId: v1,
      totalScore: 85,
      metrics: [
        { name: "On-Time Delivery", value: 88, weight: 0.4 },
        { name: "Quality Rate", value: 95, weight: 0.3 },
        { name: "Cost Variance", value: 70, weight: 0.2 },
        { name: "Response Time", value: 90, weight: 0.1 },
      ],
      trend: [
        { date: "2024-08", score: 82 },
        { date: "2024-09", score: 84 },
        { date: "2024-10", score: 85 },
      ],
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("nexusVendorScores", {
      tenantId,
      vendorId: v2,
      totalScore: 72,
      metrics: [
        { name: "On-Time Delivery", value: 65, weight: 0.4 },
        { name: "Quality Rate", value: 80, weight: 0.3 },
        { name: "Cost Variance", value: 90, weight: 0.2 },
        { name: "Response Time", value: 60, weight: 0.1 },
      ],
      trend: [
        { date: "2024-08", score: 78 },
        { date: "2024-09", score: 75 },
        { date: "2024-10", score: 72 },
      ],
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("nexusVendorScores", {
      tenantId,
      vendorId: v3,
      totalScore: 91,
      metrics: [
        { name: "On-Time Delivery", value: 95, weight: 0.4 },
        { name: "Quality Rate", value: 92, weight: 0.3 },
        { name: "Cost Variance", value: 88, weight: 0.2 },
        { name: "Response Time", value: 85, weight: 0.1 },
      ],
      trend: [
        { date: "2024-08", score: 89 },
        { date: "2024-09", score: 90 },
        { date: "2024-10", score: 91 },
      ],
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, message: "NexusPlan data seeded successfully" };
  },
});

/**
 * Internal seed mutation (for dev tools)
 */
export const seedNexusPlanDataInternal = internalMutation({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const tenantId = args.tenantId;
    const now = Date.now();

    const existingCustomer = await ctx.db
      .query("nexusCustomers")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .first();

    if (existingCustomer) {
      return { success: false, message: "Data already seeded" };
    }

    // Create Customers
    const c1 = await ctx.db.insert("nexusCustomers", { tenantId, name: "Acme Automotives", salesRep: "John Doe", ediId: "ACME_EDI_001", createdAt: now, updatedAt: now });
    const c2 = await ctx.db.insert("nexusCustomers", { tenantId, name: "Globex Aerospace", salesRep: "Sarah Smith", ediId: "GLBX_EDI_882", createdAt: now, updatedAt: now });
    const c3 = await ctx.db.insert("nexusCustomers", { tenantId, name: "Soylent Nutrition", salesRep: "Mike Ross", ediId: "SOYL_EDI_999", createdAt: now, updatedAt: now });
    const c4 = await ctx.db.insert("nexusCustomers", { tenantId, name: "Massive Dynamic", salesRep: "Walter B.", ediId: "MASS_EDI_777", createdAt: now, updatedAt: now });

    // Create Vendors
    const v1 = await ctx.db.insert("nexusVendors", { tenantId, name: "Global Component Systems", category: "Raw Materials", contactEmail: "orders@gcs.com", createdAt: now, updatedAt: now });
    const v2 = await ctx.db.insert("nexusVendors", { tenantId, name: "Rapid Parts Inc", category: "Machining", contactEmail: "sales@rapidparts.com", createdAt: now, updatedAt: now });
    const v3 = await ctx.db.insert("nexusVendors", { tenantId, name: "Steel Works Ltd", category: "Metals", contactEmail: "supply@steelworks.com", createdAt: now, updatedAt: now });

    // Create Plans
    await ctx.db.insert("nexusPlans", { tenantId, customerId: c1, sku: "BRAKE-PAD-X1", periodStart: "2024-10", planQty: 1000, createdAt: now, updatedAt: now });
    await ctx.db.insert("nexusPlans", { tenantId, customerId: c1, sku: "BRAKE-PAD-X1", periodStart: "2024-11", planQty: 1200, createdAt: now, updatedAt: now });
    await ctx.db.insert("nexusPlans", { tenantId, customerId: c2, sku: "TURBINE-BLADE-Z", periodStart: "2024-10", planQty: 50, createdAt: now, updatedAt: now });

    // Create POs
    await ctx.db.insert("nexusPurchaseOrders", { tenantId, poNumber: "PO-9001", customerId: c1, vendorId: v1, status: "OPEN", sku: "BRAKE-PAD-X1", currentQty: 1100, currentDeliveryDate: "2024-10-15", versions: [{ versionNumber: 1, changeType: "CREATED", changedBy: "EDI_GW", changeReason: "Initial 850", changedAt: "2024-09-01T08:00:00Z", payload: { qty: 1000, deliveryDate: "2024-10-10", price: 45.0 } }], createdAt: now, updatedAt: now });

    // Create Discrepancies
    await ctx.db.insert("nexusDiscrepancies", { tenantId, relatedType: "PO", relatedId: "PO-9001", metric: "QTY_VARIANCE", severity: "MEDIUM", expected: 1000, actual: 1100, status: "OPEN", detectedAt: "2024-09-15T14:31:00Z", description: "PO Qty exceeds Plan Qty by 10%", createdAt: now, updatedAt: now });

    // Create Customer Scores
    await ctx.db.insert("nexusCustomerScores", { tenantId, customerId: c1, totalScore: 82, metrics: [{ name: "Forecast Accuracy", value: 75, weight: 0.4 }], trend: [{ date: "2024-10", score: 82 }], createdAt: now, updatedAt: now });
    await ctx.db.insert("nexusCustomerScores", { tenantId, customerId: c2, totalScore: 94, metrics: [{ name: "Forecast Accuracy", value: 95, weight: 0.4 }], trend: [{ date: "2024-10", score: 94 }], createdAt: now, updatedAt: now });

    // Create Vendor Scores
    await ctx.db.insert("nexusVendorScores", { tenantId, vendorId: v1, totalScore: 85, metrics: [{ name: "On-Time Delivery", value: 88, weight: 0.4 }], trend: [{ date: "2024-10", score: 85 }], createdAt: now, updatedAt: now });
    await ctx.db.insert("nexusVendorScores", { tenantId, vendorId: v2, totalScore: 72, metrics: [{ name: "On-Time Delivery", value: 65, weight: 0.4 }], trend: [{ date: "2024-10", score: 72 }], createdAt: now, updatedAt: now });

    return { success: true };
  },
});

/**
 * DEV ONLY: Seed with explicit tenant ID
 */
export const devSeedNexusPlan = mutation({
  args: { tenantIdStr: v.string() },
  handler: async (ctx, args) => {
    const tenantId = args.tenantIdStr as Id<"tenants">;
    await ctx.runMutation(internal.nexusplan.seedNexusPlanDataInternal, { tenantId });
    return { success: true };
  },
});
