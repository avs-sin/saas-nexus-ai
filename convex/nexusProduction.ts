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
    if (!tenantId) return null;

    const workOrders = await ctx.db
      .query("nexusWorkOrders")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    const boms = await ctx.db
      .query("nexusBOM")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    const rawMaterials = await ctx.db
      .query("nexusRawMaterials")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    const rawInventory = await ctx.db
      .query("nexusRawInventory")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    const finishedInventory = await ctx.db
      .query("nexusFinishedInventory")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    const suggestions = await ctx.db
      .query("nexusMaterialSuggestions")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    // Calculate KPIs
    const today = new Date().toISOString().split("T")[0];
    const workOrdersInProgress = workOrders.filter((wo) => wo.status === "in_progress").length;
    const workOrdersScheduled = workOrders.filter((wo) => wo.status === "scheduled" || wo.status === "released").length;
    const completedToday = workOrders.filter(
      (wo) => wo.status === "completed" && wo.actualEnd?.startsWith(today)
    ).length;
    const pendingSuggestions = suggestions.filter((s) => s.status === "pending").length;

    // Count material shortages (materials below reorder point)
    const materialShortages = rawMaterials.filter((mat) => {
      const totalAvailable = rawInventory
        .filter((inv) => inv.materialSku === mat.sku)
        .reduce((sum, inv) => sum + inv.qtyAvailable, 0);
      return totalAvailable < mat.reorderPoint;
    }).length;

    // Estimate capacity utilization (simplified: in_progress / total active)
    const activeWOs = workOrders.filter((wo) => !["completed", "cancelled"].includes(wo.status));
    const capacityUtilization = activeWOs.length > 0
      ? Math.round((workOrdersInProgress / Math.max(activeWOs.length, 1)) * 100)
      : 0;

    return {
      workOrders,
      boms,
      rawMaterials,
      rawInventory,
      finishedInventory,
      suggestions,
      kpis: {
        workOrdersInProgress,
        workOrdersScheduled,
        completedToday,
        materialShortages,
        capacityUtilization,
        pendingSuggestions,
      },
    };
  },
});

export const hasData = query({
  args: {},
  handler: async (ctx) => {
    const tenantId = await getCurrentTenantId(ctx);
    if (!tenantId) return false;

    const existing = await ctx.db
      .query("nexusRawMaterials")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .first();

    return !!existing;
  },
});

// ============================================
// Work Order Queries
// ============================================

export const getWorkOrders = query({
  args: {},
  handler: async (ctx) => {
    const tenantId = await getCurrentTenantId(ctx);
    if (!tenantId) return null;

    return await ctx.db
      .query("nexusWorkOrders")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();
  },
});

export const getWorkOrderById = query({
  args: { woId: v.id("nexusWorkOrders") },
  handler: async (ctx, args) => {
    const tenantId = await getCurrentTenantId(ctx);
    if (!tenantId) return null;

    const wo = await ctx.db.get(args.woId);
    if (!wo || wo.tenantId !== tenantId) return null;

    return wo;
  },
});

// ============================================
// BOM Queries
// ============================================

export const getBOMs = query({
  args: {},
  handler: async (ctx) => {
    const tenantId = await getCurrentTenantId(ctx);
    if (!tenantId) return null;

    return await ctx.db
      .query("nexusBOM")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();
  },
});

export const getBOMBySku = query({
  args: { finishedSku: v.string() },
  handler: async (ctx, args) => {
    const tenantId = await getCurrentTenantId(ctx);
    if (!tenantId) return null;

    return await ctx.db
      .query("nexusBOM")
      .withIndex("by_tenantId_and_finishedSku", (q) =>
        q.eq("tenantId", tenantId).eq("finishedSku", args.finishedSku)
      )
      .first();
  },
});

// ============================================
// Raw Materials Queries
// ============================================

export const getRawMaterials = query({
  args: {},
  handler: async (ctx) => {
    const tenantId = await getCurrentTenantId(ctx);
    if (!tenantId) return null;

    return await ctx.db
      .query("nexusRawMaterials")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();
  },
});

export const getRawInventory = query({
  args: {},
  handler: async (ctx) => {
    const tenantId = await getCurrentTenantId(ctx);
    if (!tenantId) return null;

    return await ctx.db
      .query("nexusRawInventory")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();
  },
});

// ============================================
// Material Suggestions Queries
// ============================================

export const getMaterialSuggestions = query({
  args: {},
  handler: async (ctx) => {
    const tenantId = await getCurrentTenantId(ctx);
    if (!tenantId) return null;

    return await ctx.db
      .query("nexusMaterialSuggestions")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();
  },
});

// ============================================
// Work Order Mutations
// ============================================

export const createWorkOrder = mutation({
  args: {
    finishedSku: v.string(),
    finishedName: v.string(),
    qtyPlanned: v.number(),
    priority: v.string(),
    scheduledStart: v.string(),
    scheduledEnd: v.string(),
    warehouseId: v.id("warehouses"),
    lineAssignment: v.optional(v.string()),
    sourceOrderId: v.optional(v.id("nexusOutboundOrders")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenantId = await requireTenantId(ctx);
    const now = Date.now();

    // Generate WO number
    const existingCount = await ctx.db
      .query("nexusWorkOrders")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();
    const woNumber = `WO-${new Date().getFullYear()}-${String(existingCount.length + 1).padStart(4, "0")}`;

    return await ctx.db.insert("nexusWorkOrders", {
      tenantId,
      woNumber,
      finishedSku: args.finishedSku,
      finishedName: args.finishedName,
      qtyPlanned: args.qtyPlanned,
      qtyCompleted: 0,
      qtyRejected: 0,
      status: "draft",
      priority: args.priority,
      scheduledStart: args.scheduledStart,
      scheduledEnd: args.scheduledEnd,
      warehouseId: args.warehouseId,
      lineAssignment: args.lineAssignment,
      sourceOrderId: args.sourceOrderId,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateWorkOrder = mutation({
  args: {
    woId: v.id("nexusWorkOrders"),
    status: v.optional(v.string()),
    qtyCompleted: v.optional(v.number()),
    qtyRejected: v.optional(v.number()),
    priority: v.optional(v.string()),
    scheduledStart: v.optional(v.string()),
    scheduledEnd: v.optional(v.string()),
    actualStart: v.optional(v.string()),
    actualEnd: v.optional(v.string()),
    lineAssignment: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenantId = await requireTenantId(ctx);
    const { woId, ...updates } = args;

    const wo = await ctx.db.get(woId);
    if (!wo || wo.tenantId !== tenantId) {
      throw new Error("Work order not found");
    }

    // Filter out undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    await ctx.db.patch(woId, {
      ...cleanUpdates,
      updatedAt: Date.now(),
    });

    // Trigger cross-module intelligence: Check material needs when WO is scheduled/released
    const newStatus = args.status;
    const oldStatus = wo.status;
    if (
      newStatus &&
      (newStatus === "scheduled" || newStatus === "released") &&
      oldStatus !== newStatus
    ) {
      await ctx.scheduler.runAfter(0, internal.nexusIntelligence.detectMaterialNeed, {
        tenantId,
        workOrderId: woId,
      });
    }
  },
});

// ============================================
// Inventory Mutations
// ============================================

export const updateRawInventory = mutation({
  args: {
    inventoryId: v.id("nexusRawInventory"),
    qtyOnHand: v.optional(v.number()),
    qtyAllocated: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const tenantId = await requireTenantId(ctx);
    const { inventoryId, qtyOnHand, qtyAllocated } = args;

    const inv = await ctx.db.get(inventoryId);
    if (!inv || inv.tenantId !== tenantId) {
      throw new Error("Inventory record not found");
    }

    const newQtyOnHand = qtyOnHand ?? inv.qtyOnHand;
    const newQtyAllocated = qtyAllocated ?? inv.qtyAllocated;

    await ctx.db.patch(inventoryId, {
      qtyOnHand: newQtyOnHand,
      qtyAllocated: newQtyAllocated,
      qtyAvailable: newQtyOnHand - newQtyAllocated,
      updatedAt: Date.now(),
    });
  },
});

// ============================================
// Material Suggestion Mutations
// ============================================

export const updateSuggestionStatus = mutation({
  args: {
    suggestionId: v.id("nexusMaterialSuggestions"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const tenantId = await requireTenantId(ctx);

    const suggestion = await ctx.db.get(args.suggestionId);
    if (!suggestion || suggestion.tenantId !== tenantId) {
      throw new Error("Suggestion not found");
    }

    await ctx.db.patch(args.suggestionId, {
      status: args.status,
    });
  },
});

export const saveMaterialSuggestion = mutation({
  args: {
    materialSku: v.string(),
    materialName: v.string(),
    suggestedQty: v.number(),
    suggestedOrderDate: v.string(),
    neededByDate: v.string(),
    reason: v.string(),
    urgency: v.string(),
    linkedWorkOrders: v.array(v.string()),
    vendorId: v.optional(v.id("nexusInboundVendors")),
    estimatedCost: v.number(),
  },
  handler: async (ctx, args) => {
    const tenantId = await requireTenantId(ctx);

    return await ctx.db.insert("nexusMaterialSuggestions", {
      tenantId,
      materialSku: args.materialSku,
      materialName: args.materialName,
      suggestedQty: args.suggestedQty,
      suggestedOrderDate: args.suggestedOrderDate,
      neededByDate: args.neededByDate,
      reason: args.reason,
      urgency: args.urgency,
      status: "pending",
      linkedWorkOrders: args.linkedWorkOrders,
      vendorId: args.vendorId,
      estimatedCost: args.estimatedCost,
      generatedAt: Date.now(),
    });
  },
});

// ============================================
// Cross-Module Queries
// ============================================

// Get demand forecasts from NexusPlan to drive production planning
export const getPlannedDemand = query({
  args: {},
  handler: async (ctx) => {
    const tenantId = await getCurrentTenantId(ctx);
    if (!tenantId) return null;

    // Get plans from NexusPlan module
    const plans = await ctx.db
      .query("nexusPlans")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    // Get customers for context
    const customers = await ctx.db
      .query("nexusCustomers")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    // Get purchase orders for fulfillment status
    const pos = await ctx.db
      .query("nexusPurchaseOrders")
      .withIndex("by_tenantId_and_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "OPEN")
      )
      .collect();

    return { plans, customers, purchaseOrders: pos };
  },
});

// Get vendor data from NexusInbound for material sourcing
export const getInboundVendorData = query({
  args: {},
  handler: async (ctx) => {
    const tenantId = await getCurrentTenantId(ctx);
    if (!tenantId) return null;

    // Get vendors from NexusInbound
    const vendors = await ctx.db
      .query("nexusInboundVendors")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    // Get vendor scorecards
    const scorecards = await ctx.db
      .query("nexusInboundScorecards")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    // Get open inbound POs (raw materials in transit)
    const openPOs = await ctx.db
      .query("nexusInboundPOs")
      .withIndex("by_tenantId_and_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "Open")
      )
      .collect();

    // Get recent discrepancies for vendor quality assessment
    const discrepancies = await ctx.db
      .query("nexusInboundDiscrepancies")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    return { vendors, scorecards, openPOs, discrepancies };
  },
});

// Get outbound demand for make-to-order production
export const getOutboundDemand = query({
  args: {},
  handler: async (ctx) => {
    const tenantId = await getCurrentTenantId(ctx);
    if (!tenantId) return null;

    // Get pending orders from NexusOutbound
    const pendingOrders = await ctx.db
      .query("nexusOutboundOrders")
      .withIndex("by_tenantId_and_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "pending")
      )
      .collect();

    // Get allocated orders (inventory reserved but not shipped)
    const allocatedOrders = await ctx.db
      .query("nexusOutboundOrders")
      .withIndex("by_tenantId_and_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "allocated")
      )
      .collect();

    // Get shipping forecasts
    const forecasts = await ctx.db
      .query("nexusShippingForecasts")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    return { pendingOrders, allocatedOrders, forecasts };
  },
});

// Aggregated cross-module data for AI supply chain analysis
export const getSupplyChainData = query({
  args: {},
  handler: async (ctx) => {
    const tenantId = await getCurrentTenantId(ctx);
    if (!tenantId) return null;

    // Production data
    const workOrders = await ctx.db
      .query("nexusWorkOrders")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    const rawInventory = await ctx.db
      .query("nexusRawInventory")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    const finishedInventory = await ctx.db
      .query("nexusFinishedInventory")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    const suggestions = await ctx.db
      .query("nexusMaterialSuggestions")
      .withIndex("by_tenantId_and_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "pending")
      )
      .collect();

    // Inbound data
    const inboundVendors = await ctx.db
      .query("nexusInboundVendors")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    const inboundPOs = await ctx.db
      .query("nexusInboundPOs")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    const inboundDiscrepancies = await ctx.db
      .query("nexusInboundDiscrepancies")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    const scorecards = await ctx.db
      .query("nexusInboundScorecards")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    // Outbound data
    const outboundOrders = await ctx.db
      .query("nexusOutboundOrders")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    const shipments = await ctx.db
      .query("nexusShipments")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    const outboundDiscrepancies = await ctx.db
      .query("nexusOutboundDiscrepancies")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    // NexusPlan data
    const plans = await ctx.db
      .query("nexusPlans")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    const customers = await ctx.db
      .query("nexusCustomers")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    // Calculate KPIs
    const productionKpis = {
      workOrdersInProgress: workOrders.filter((wo) => wo.status === "in_progress").length,
      workOrdersScheduled: workOrders.filter((wo) => wo.status === "scheduled").length,
      materialShortages: suggestions.length,
    };

    const inboundKpis = {
      openPOs: inboundPOs.filter((po) => po.status === "Open").length,
      openDiscrepancies: inboundDiscrepancies.filter((d) => d.status !== "Resolved").length,
    };

    const outboundKpis = {
      pendingOrders: outboundOrders.filter((o) => o.status === "pending").length,
      inTransit: shipments.filter((s) => s.status === "in_transit").length,
      openDiscrepancies: outboundDiscrepancies.filter((d) => d.status === "open").length,
    };

    return {
      production: {
        workOrders,
        rawInventory,
        finishedInventory,
        suggestions,
        kpis: productionKpis,
      },
      inbound: {
        vendors: inboundVendors,
        pos: inboundPOs,
        discrepancies: inboundDiscrepancies,
        scorecards,
        kpis: inboundKpis,
      },
      outbound: {
        orders: outboundOrders,
        shipments,
        discrepancies: outboundDiscrepancies,
        kpis: outboundKpis,
      },
      plan: {
        plans,
        customers,
      },
    };
  },
});

// ============================================
// Seed Data Mutation (Pillow Manufacturing)
// ============================================

export const seedProductionData = mutation({
  args: {},
  handler: async (ctx) => {
    const tenantId = await requireTenantId(ctx);
    const now = Date.now();

    // Check if data already exists
    const existing = await ctx.db
      .query("nexusRawMaterials")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .first();

    if (existing) {
      return { success: false, message: "Production data already exists" };
    }

    // Get or create a warehouse
    let warehouse = await ctx.db
      .query("warehouses")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .first();

    if (!warehouse) {
      const whId = await ctx.db.insert("warehouses", {
        tenantId,
        name: "Main Production Facility",
        code: "WH-001",
        location: {
          address: "1234 Industrial Blvd",
          city: "Phoenix",
          state: "AZ",
          zipCode: "85001",
          country: "USA",
        },
        capacity: 50000,
        utilizationPercent: 65,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      warehouse = await ctx.db.get(whId);
    }

    const warehouseId = warehouse!._id;

    // ============================================
    // Create Raw Materials (Pillow Manufacturing)
    // ============================================

    // Fill Materials
    await ctx.db.insert("nexusRawMaterials", {
      tenantId,
      sku: "RAW-MF-STD",
      name: "Memory Foam - Standard Density",
      category: "Fill",
      uom: "LB",
      costPerUnit: 5.50,
      leadTimeDays: 14,
      reorderPoint: 500,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("nexusRawMaterials", {
      tenantId,
      sku: "RAW-MF-GEL",
      name: "Memory Foam - Gel Infused",
      category: "Fill",
      uom: "LB",
      costPerUnit: 7.25,
      leadTimeDays: 14,
      reorderPoint: 300,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("nexusRawMaterials", {
      tenantId,
      sku: "RAW-POLY-HF",
      name: "Polyester Fiber - Hypoallergenic",
      category: "Fill",
      uom: "LB",
      costPerUnit: 2.75,
      leadTimeDays: 7,
      reorderPoint: 800,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("nexusRawMaterials", {
      tenantId,
      sku: "RAW-DOWN-WHT",
      name: "White Goose Down",
      category: "Fill",
      uom: "LB",
      costPerUnit: 45.00,
      leadTimeDays: 21,
      reorderPoint: 100,
      createdAt: now,
      updatedAt: now,
    });

    // Fabric Materials
    await ctx.db.insert("nexusRawMaterials", {
      tenantId,
      sku: "RAW-FAB-COT",
      name: "Cotton Shell Fabric - 300TC",
      category: "Fabric",
      uom: "YD",
      costPerUnit: 4.50,
      leadTimeDays: 10,
      reorderPoint: 1000,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("nexusRawMaterials", {
      tenantId,
      sku: "RAW-FAB-BAM",
      name: "Bamboo Blend Fabric",
      category: "Fabric",
      uom: "YD",
      costPerUnit: 6.00,
      leadTimeDays: 12,
      reorderPoint: 500,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("nexusRawMaterials", {
      tenantId,
      sku: "RAW-FAB-COOL",
      name: "Cooling Tech Fabric",
      category: "Fabric",
      uom: "YD",
      costPerUnit: 8.50,
      leadTimeDays: 14,
      reorderPoint: 300,
      createdAt: now,
      updatedAt: now,
    });

    // Components
    await ctx.db.insert("nexusRawMaterials", {
      tenantId,
      sku: "RAW-ZIP-20",
      name: "Zipper - 20 inch",
      category: "Component",
      uom: "EA",
      costPerUnit: 0.45,
      leadTimeDays: 7,
      reorderPoint: 5000,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("nexusRawMaterials", {
      tenantId,
      sku: "RAW-THRD-WHT",
      name: "Thread - White Heavy Duty",
      category: "Component",
      uom: "SPOOL",
      costPerUnit: 3.25,
      leadTimeDays: 5,
      reorderPoint: 200,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("nexusRawMaterials", {
      tenantId,
      sku: "RAW-LBL-CARE",
      name: "Care Labels",
      category: "Component",
      uom: "EA",
      costPerUnit: 0.08,
      leadTimeDays: 5,
      reorderPoint: 10000,
      createdAt: now,
      updatedAt: now,
    });

    // Packaging
    await ctx.db.insert("nexusRawMaterials", {
      tenantId,
      sku: "RAW-PKG-BAG",
      name: "Pillow Bag - Zippered",
      category: "Packaging",
      uom: "EA",
      costPerUnit: 0.85,
      leadTimeDays: 7,
      reorderPoint: 3000,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("nexusRawMaterials", {
      tenantId,
      sku: "RAW-PKG-BOX",
      name: "Shipping Box - Standard",
      category: "Packaging",
      uom: "EA",
      costPerUnit: 1.25,
      leadTimeDays: 7,
      reorderPoint: 2000,
      createdAt: now,
      updatedAt: now,
    });

    // ============================================
    // Create Bills of Materials (Finished Pillows)
    // ============================================

    // Memory Foam Queen Pillow
    await ctx.db.insert("nexusBOM", {
      tenantId,
      finishedSku: "PLW-MF-Q",
      finishedName: "Memory Foam Queen Pillow",
      materials: [
        { materialSku: "RAW-MF-STD", materialName: "Memory Foam - Standard Density", qtyPerUnit: 2.5, uom: "LB", scrapFactor: 1.05 },
        { materialSku: "RAW-FAB-COT", materialName: "Cotton Shell Fabric - 300TC", qtyPerUnit: 1.2, uom: "YD", scrapFactor: 1.08 },
        { materialSku: "RAW-ZIP-20", materialName: "Zipper - 20 inch", qtyPerUnit: 1, uom: "EA" },
        { materialSku: "RAW-THRD-WHT", materialName: "Thread - White Heavy Duty", qtyPerUnit: 0.02, uom: "SPOOL" },
        { materialSku: "RAW-LBL-CARE", materialName: "Care Labels", qtyPerUnit: 1, uom: "EA" },
        { materialSku: "RAW-PKG-BAG", materialName: "Pillow Bag - Zippered", qtyPerUnit: 1, uom: "EA" },
      ],
      laborMinutesPerUnit: 12,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Memory Foam King Pillow
    await ctx.db.insert("nexusBOM", {
      tenantId,
      finishedSku: "PLW-MF-K",
      finishedName: "Memory Foam King Pillow",
      materials: [
        { materialSku: "RAW-MF-STD", materialName: "Memory Foam - Standard Density", qtyPerUnit: 3.2, uom: "LB", scrapFactor: 1.05 },
        { materialSku: "RAW-FAB-COT", materialName: "Cotton Shell Fabric - 300TC", qtyPerUnit: 1.5, uom: "YD", scrapFactor: 1.08 },
        { materialSku: "RAW-ZIP-20", materialName: "Zipper - 20 inch", qtyPerUnit: 1, uom: "EA" },
        { materialSku: "RAW-THRD-WHT", materialName: "Thread - White Heavy Duty", qtyPerUnit: 0.025, uom: "SPOOL" },
        { materialSku: "RAW-LBL-CARE", materialName: "Care Labels", qtyPerUnit: 1, uom: "EA" },
        { materialSku: "RAW-PKG-BAG", materialName: "Pillow Bag - Zippered", qtyPerUnit: 1, uom: "EA" },
      ],
      laborMinutesPerUnit: 15,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Gel Memory Foam Queen (Premium)
    await ctx.db.insert("nexusBOM", {
      tenantId,
      finishedSku: "PLW-GEL-Q",
      finishedName: "Gel Memory Foam Queen Pillow",
      materials: [
        { materialSku: "RAW-MF-GEL", materialName: "Memory Foam - Gel Infused", qtyPerUnit: 2.5, uom: "LB", scrapFactor: 1.05 },
        { materialSku: "RAW-FAB-COOL", materialName: "Cooling Tech Fabric", qtyPerUnit: 1.2, uom: "YD", scrapFactor: 1.08 },
        { materialSku: "RAW-ZIP-20", materialName: "Zipper - 20 inch", qtyPerUnit: 1, uom: "EA" },
        { materialSku: "RAW-THRD-WHT", materialName: "Thread - White Heavy Duty", qtyPerUnit: 0.02, uom: "SPOOL" },
        { materialSku: "RAW-LBL-CARE", materialName: "Care Labels", qtyPerUnit: 1, uom: "EA" },
        { materialSku: "RAW-PKG-BAG", materialName: "Pillow Bag - Zippered", qtyPerUnit: 1, uom: "EA" },
      ],
      laborMinutesPerUnit: 14,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Down Pillow Queen (Luxury)
    await ctx.db.insert("nexusBOM", {
      tenantId,
      finishedSku: "PLW-DOWN-Q",
      finishedName: "Goose Down Queen Pillow",
      materials: [
        { materialSku: "RAW-DOWN-WHT", materialName: "White Goose Down", qtyPerUnit: 1.8, uom: "LB", scrapFactor: 1.02 },
        { materialSku: "RAW-FAB-BAM", materialName: "Bamboo Blend Fabric", qtyPerUnit: 1.3, uom: "YD", scrapFactor: 1.08 },
        { materialSku: "RAW-THRD-WHT", materialName: "Thread - White Heavy Duty", qtyPerUnit: 0.02, uom: "SPOOL" },
        { materialSku: "RAW-LBL-CARE", materialName: "Care Labels", qtyPerUnit: 1, uom: "EA" },
        { materialSku: "RAW-PKG-BAG", materialName: "Pillow Bag - Zippered", qtyPerUnit: 1, uom: "EA" },
      ],
      laborMinutesPerUnit: 18,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Polyester Standard Pillow (Economy)
    await ctx.db.insert("nexusBOM", {
      tenantId,
      finishedSku: "PLW-POLY-STD",
      finishedName: "Polyester Standard Pillow",
      materials: [
        { materialSku: "RAW-POLY-HF", materialName: "Polyester Fiber - Hypoallergenic", qtyPerUnit: 1.5, uom: "LB", scrapFactor: 1.03 },
        { materialSku: "RAW-FAB-COT", materialName: "Cotton Shell Fabric - 300TC", qtyPerUnit: 0.9, uom: "YD", scrapFactor: 1.08 },
        { materialSku: "RAW-THRD-WHT", materialName: "Thread - White Heavy Duty", qtyPerUnit: 0.015, uom: "SPOOL" },
        { materialSku: "RAW-LBL-CARE", materialName: "Care Labels", qtyPerUnit: 1, uom: "EA" },
        { materialSku: "RAW-PKG-BAG", materialName: "Pillow Bag - Zippered", qtyPerUnit: 1, uom: "EA" },
      ],
      laborMinutesPerUnit: 8,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // ============================================
    // Create Raw Inventory (with some shortages)
    // ============================================

    // Memory Foam - Standard (LOW - will trigger alert)
    await ctx.db.insert("nexusRawInventory", {
      tenantId,
      materialSku: "RAW-MF-STD",
      warehouseId,
      qtyOnHand: 350,
      qtyAllocated: 100,
      qtyAvailable: 250,
      lotNumber: "MF-2024-1201",
      receivedDate: "2024-11-15",
      updatedAt: now,
    });

    // Memory Foam - Gel (OK)
    await ctx.db.insert("nexusRawInventory", {
      tenantId,
      materialSku: "RAW-MF-GEL",
      warehouseId,
      qtyOnHand: 450,
      qtyAllocated: 50,
      qtyAvailable: 400,
      lotNumber: "GEL-2024-1180",
      receivedDate: "2024-11-20",
      updatedAt: now,
    });

    // Polyester Fiber (OK)
    await ctx.db.insert("nexusRawInventory", {
      tenantId,
      materialSku: "RAW-POLY-HF",
      warehouseId,
      qtyOnHand: 1200,
      qtyAllocated: 200,
      qtyAvailable: 1000,
      lotNumber: "POLY-2024-1155",
      receivedDate: "2024-11-10",
      updatedAt: now,
    });

    // Down (CRITICAL - very low)
    await ctx.db.insert("nexusRawInventory", {
      tenantId,
      materialSku: "RAW-DOWN-WHT",
      warehouseId,
      qtyOnHand: 45,
      qtyAllocated: 20,
      qtyAvailable: 25,
      lotNumber: "DOWN-2024-0892",
      receivedDate: "2024-10-28",
      updatedAt: now,
    });

    // Cotton Fabric (LOW)
    await ctx.db.insert("nexusRawInventory", {
      tenantId,
      materialSku: "RAW-FAB-COT",
      warehouseId,
      qtyOnHand: 800,
      qtyAllocated: 150,
      qtyAvailable: 650,
      lotNumber: "COT-2024-1190",
      receivedDate: "2024-11-18",
      updatedAt: now,
    });

    // Bamboo Fabric (OK)
    await ctx.db.insert("nexusRawInventory", {
      tenantId,
      materialSku: "RAW-FAB-BAM",
      warehouseId,
      qtyOnHand: 600,
      qtyAllocated: 0,
      qtyAvailable: 600,
      lotNumber: "BAM-2024-1175",
      receivedDate: "2024-11-12",
      updatedAt: now,
    });

    // Cooling Fabric (OK)
    await ctx.db.insert("nexusRawInventory", {
      tenantId,
      materialSku: "RAW-FAB-COOL",
      warehouseId,
      qtyOnHand: 400,
      qtyAllocated: 50,
      qtyAvailable: 350,
      lotNumber: "COOL-2024-1160",
      receivedDate: "2024-11-08",
      updatedAt: now,
    });

    // Zippers (OK)
    await ctx.db.insert("nexusRawInventory", {
      tenantId,
      materialSku: "RAW-ZIP-20",
      warehouseId,
      qtyOnHand: 8000,
      qtyAllocated: 500,
      qtyAvailable: 7500,
      lotNumber: "ZIP-2024-1200",
      receivedDate: "2024-11-22",
      updatedAt: now,
    });

    // Thread (OK)
    await ctx.db.insert("nexusRawInventory", {
      tenantId,
      materialSku: "RAW-THRD-WHT",
      warehouseId,
      qtyOnHand: 300,
      qtyAllocated: 10,
      qtyAvailable: 290,
      lotNumber: "THR-2024-1195",
      receivedDate: "2024-11-20",
      updatedAt: now,
    });

    // Care Labels (OK)
    await ctx.db.insert("nexusRawInventory", {
      tenantId,
      materialSku: "RAW-LBL-CARE",
      warehouseId,
      qtyOnHand: 15000,
      qtyAllocated: 1000,
      qtyAvailable: 14000,
      lotNumber: "LBL-2024-1198",
      receivedDate: "2024-11-21",
      updatedAt: now,
    });

    // Pillow Bags (LOW)
    await ctx.db.insert("nexusRawInventory", {
      tenantId,
      materialSku: "RAW-PKG-BAG",
      warehouseId,
      qtyOnHand: 2500,
      qtyAllocated: 800,
      qtyAvailable: 1700,
      lotNumber: "BAG-2024-1185",
      receivedDate: "2024-11-15",
      updatedAt: now,
    });

    // Shipping Boxes (OK)
    await ctx.db.insert("nexusRawInventory", {
      tenantId,
      materialSku: "RAW-PKG-BOX",
      warehouseId,
      qtyOnHand: 3500,
      qtyAllocated: 200,
      qtyAvailable: 3300,
      lotNumber: "BOX-2024-1182",
      receivedDate: "2024-11-14",
      updatedAt: now,
    });

    // ============================================
    // Create Work Orders (Various Statuses)
    // ============================================

    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    // In Progress - Memory Foam Queen
    await ctx.db.insert("nexusWorkOrders", {
      tenantId,
      woNumber: "WO-2024-0142",
      finishedSku: "PLW-MF-Q",
      finishedName: "Memory Foam Queen Pillow",
      qtyPlanned: 200,
      qtyCompleted: 85,
      qtyRejected: 3,
      status: "in_progress",
      priority: "high",
      scheduledStart: formatDate(new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)),
      scheduledEnd: formatDate(today),
      actualStart: formatDate(new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)),
      warehouseId,
      lineAssignment: "LINE-A",
      notes: "Priority order for Walmart replenishment",
      createdAt: now,
      updatedAt: now,
    });

    // In Progress - Gel Pillow
    await ctx.db.insert("nexusWorkOrders", {
      tenantId,
      woNumber: "WO-2024-0143",
      finishedSku: "PLW-GEL-Q",
      finishedName: "Gel Memory Foam Queen Pillow",
      qtyPlanned: 100,
      qtyCompleted: 45,
      qtyRejected: 1,
      status: "in_progress",
      priority: "normal",
      scheduledStart: formatDate(new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000)),
      scheduledEnd: formatDate(new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000)),
      actualStart: formatDate(new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000)),
      warehouseId,
      lineAssignment: "LINE-B",
      createdAt: now,
      updatedAt: now,
    });

    // Scheduled - King Pillows
    await ctx.db.insert("nexusWorkOrders", {
      tenantId,
      woNumber: "WO-2024-0144",
      finishedSku: "PLW-MF-K",
      finishedName: "Memory Foam King Pillow",
      qtyPlanned: 150,
      qtyCompleted: 0,
      qtyRejected: 0,
      status: "scheduled",
      priority: "normal",
      scheduledStart: formatDate(new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000)),
      scheduledEnd: formatDate(new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)),
      warehouseId,
      lineAssignment: "LINE-A",
      createdAt: now,
      updatedAt: now,
    });

    // Scheduled - Rush Down Pillows
    await ctx.db.insert("nexusWorkOrders", {
      tenantId,
      woNumber: "WO-2024-0145",
      finishedSku: "PLW-DOWN-Q",
      finishedName: "Goose Down Queen Pillow",
      qtyPlanned: 50,
      qtyCompleted: 0,
      qtyRejected: 0,
      status: "scheduled",
      priority: "rush",
      scheduledStart: formatDate(new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000)),
      scheduledEnd: formatDate(new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000)),
      warehouseId,
      lineAssignment: "LINE-B",
      notes: "Rush order - hotel chain grand opening",
      createdAt: now,
      updatedAt: now,
    });

    // Released - Polyester Pillows (ready to start)
    await ctx.db.insert("nexusWorkOrders", {
      tenantId,
      woNumber: "WO-2024-0146",
      finishedSku: "PLW-POLY-STD",
      finishedName: "Polyester Standard Pillow",
      qtyPlanned: 500,
      qtyCompleted: 0,
      qtyRejected: 0,
      status: "released",
      priority: "low",
      scheduledStart: formatDate(today),
      scheduledEnd: formatDate(new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000)),
      warehouseId,
      notes: "Economy line for Amazon FBA",
      createdAt: now,
      updatedAt: now,
    });

    // Draft - Future Planning
    await ctx.db.insert("nexusWorkOrders", {
      tenantId,
      woNumber: "WO-2024-0147",
      finishedSku: "PLW-GEL-Q",
      finishedName: "Gel Memory Foam Queen Pillow",
      qtyPlanned: 300,
      qtyCompleted: 0,
      qtyRejected: 0,
      status: "draft",
      priority: "normal",
      scheduledStart: formatDate(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)),
      scheduledEnd: formatDate(new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000)),
      warehouseId,
      notes: "Tentative - awaiting sales confirmation",
      createdAt: now,
      updatedAt: now,
    });

    // Completed - Yesterday
    await ctx.db.insert("nexusWorkOrders", {
      tenantId,
      woNumber: "WO-2024-0141",
      finishedSku: "PLW-POLY-STD",
      finishedName: "Polyester Standard Pillow",
      qtyPlanned: 400,
      qtyCompleted: 395,
      qtyRejected: 5,
      status: "completed",
      priority: "normal",
      scheduledStart: formatDate(new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000)),
      scheduledEnd: formatDate(new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000)),
      actualStart: formatDate(new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000)),
      actualEnd: formatDate(new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000)),
      warehouseId,
      lineAssignment: "LINE-A",
      createdAt: now,
      updatedAt: now,
    });

    // ============================================
    // Create Finished Inventory
    // ============================================

    await ctx.db.insert("nexusFinishedInventory", {
      tenantId,
      sku: "PLW-MF-Q",
      warehouseId,
      qtyOnHand: 450,
      qtyAllocated: 120,
      qtyAvailable: 330,
      updatedAt: now,
    });

    await ctx.db.insert("nexusFinishedInventory", {
      tenantId,
      sku: "PLW-MF-K",
      warehouseId,
      qtyOnHand: 180,
      qtyAllocated: 50,
      qtyAvailable: 130,
      updatedAt: now,
    });

    await ctx.db.insert("nexusFinishedInventory", {
      tenantId,
      sku: "PLW-GEL-Q",
      warehouseId,
      qtyOnHand: 220,
      qtyAllocated: 80,
      qtyAvailable: 140,
      updatedAt: now,
    });

    await ctx.db.insert("nexusFinishedInventory", {
      tenantId,
      sku: "PLW-DOWN-Q",
      warehouseId,
      qtyOnHand: 65,
      qtyAllocated: 25,
      qtyAvailable: 40,
      updatedAt: now,
    });

    await ctx.db.insert("nexusFinishedInventory", {
      tenantId,
      sku: "PLW-POLY-STD",
      warehouseId,
      qtyOnHand: 850,
      qtyAllocated: 200,
      qtyAvailable: 650,
      updatedAt: now,
    });

    // ============================================
    // Create Sample Material Suggestions
    // ============================================

    await ctx.db.insert("nexusMaterialSuggestions", {
      tenantId,
      materialSku: "RAW-MF-STD",
      materialName: "Memory Foam - Standard Density",
      suggestedQty: 600,
      suggestedOrderDate: formatDate(today),
      neededByDate: formatDate(new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)),
      reason: "Current stock (250 LB available) below reorder point (500 LB). Needed for WO-2024-0142, WO-2024-0144.",
      urgency: "high",
      status: "pending",
      linkedWorkOrders: ["WO-2024-0142", "WO-2024-0144"],
      estimatedCost: 3300.00,
      generatedAt: now,
    });

    await ctx.db.insert("nexusMaterialSuggestions", {
      tenantId,
      materialSku: "RAW-DOWN-WHT",
      materialName: "White Goose Down",
      suggestedQty: 150,
      suggestedOrderDate: formatDate(today),
      neededByDate: formatDate(new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000)),
      reason: "CRITICAL: Only 25 LB available, need 90 LB for rush order WO-2024-0145 (hotel chain). 21-day lead time.",
      urgency: "critical",
      status: "pending",
      linkedWorkOrders: ["WO-2024-0145"],
      estimatedCost: 6750.00,
      generatedAt: now,
    });

    await ctx.db.insert("nexusMaterialSuggestions", {
      tenantId,
      materialSku: "RAW-PKG-BAG",
      materialName: "Pillow Bag - Zippered",
      suggestedQty: 3000,
      suggestedOrderDate: formatDate(new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)),
      neededByDate: formatDate(new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000)),
      reason: "Stock at 1700 units, below reorder point of 3000. Multiple work orders upcoming.",
      urgency: "medium",
      status: "pending",
      linkedWorkOrders: ["WO-2024-0142", "WO-2024-0143", "WO-2024-0144"],
      estimatedCost: 2550.00,
      generatedAt: now,
    });

    return { success: true, message: "Production data seeded successfully for pillow manufacturing" };
  },
});

/**
 * Internal seed mutation (for dev tools)
 */
export const seedProductionDataInternal = internalMutation({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const tenantId = args.tenantId;
    const now = Date.now();

    const existing = await ctx.db
      .query("nexusRawMaterials")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .first();

    if (existing) {
      return { success: false, message: "Production data already exists" };
    }

    // Get or create warehouse
    let warehouse = await ctx.db.query("warehouses").withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId)).first();
    if (!warehouse) {
      const whId = await ctx.db.insert("warehouses", { tenantId, name: "Main Facility", code: "WH-001", location: { address: "1234 Industrial Blvd", city: "Phoenix", state: "AZ", zipCode: "85001", country: "USA" }, capacity: 50000, utilizationPercent: 65, isActive: true, createdAt: now, updatedAt: now });
      warehouse = await ctx.db.get(whId);
    }
    const warehouseId = warehouse!._id;

    // Create Raw Materials
    await ctx.db.insert("nexusRawMaterials", { tenantId, sku: "MAT-POLY-FILL", name: "Polyester Fiberfill", category: "Fill Materials", uom: "LB", costPerUnit: 2.50, leadTimeDays: 7, reorderPoint: 500, createdAt: now, updatedAt: now });
    await ctx.db.insert("nexusRawMaterials", { tenantId, sku: "MAT-COTTON-SHELL", name: "Cotton Pillow Shell", category: "Shell Materials", uom: "EA", costPerUnit: 3.25, leadTimeDays: 10, reorderPoint: 200, createdAt: now, updatedAt: now });

    // Create BOM
    await ctx.db.insert("nexusBOM", { tenantId, finishedSku: "FIN-PILLOW-STD", finishedName: "Standard Pillow", isActive: true, materials: [{ materialSku: "MAT-POLY-FILL", materialName: "Polyester Fiberfill", qtyPerUnit: 1.5, uom: "LB", scrapFactor: 1.05 }, { materialSku: "MAT-COTTON-SHELL", materialName: "Cotton Shell", qtyPerUnit: 1, uom: "EA", scrapFactor: 1.02 }], createdAt: now, updatedAt: now });

    // Create Raw Inventory
    await ctx.db.insert("nexusRawInventory", { tenantId, materialSku: "MAT-POLY-FILL", warehouseId, lotNumber: "LOT-2024-001", qtyOnHand: 5000, qtyAllocated: 1500, qtyAvailable: 3500, expirationDate: "2025-12-31", receivedDate: new Date(now).toISOString().split("T")[0], updatedAt: now });

    // Create Work Order
    const today = new Date();
    await ctx.db.insert("nexusWorkOrders", { tenantId, woNumber: "WO-2024-0001", finishedSku: "FIN-PILLOW-STD", finishedName: "Standard Pillow", qtyPlanned: 500, qtyCompleted: 0, qtyRejected: 0, status: "draft", priority: "normal", scheduledStart: today.toISOString().split("T")[0], scheduledEnd: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], warehouseId, lineAssignment: "Line A", notes: "Initial batch", createdAt: now, updatedAt: now });

    return { success: true };
  },
});

/**
 * DEV ONLY: Seed with explicit tenant ID
 */
export const devSeedProduction = mutation({
  args: { tenantIdStr: v.string() },
  handler: async (ctx, args) => {
    const tenantId = args.tenantIdStr as Id<"tenants">;
    await ctx.runMutation(internal.nexusProduction.seedProductionDataInternal, { tenantId });
    return { success: true };
  },
});
