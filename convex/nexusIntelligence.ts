import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { requireTenantId, getCurrentTenantId } from "./helpers/tenantScope";
import {
  filterAndCount,
  sortByPriority,
  suggestionExists,
  createSuggestion,
  calculatePriority,
  daysUntil,
  formatDateString,
  subtractDaysFormatted,
  type SuggestionPriority,
} from "./helpers/intelligenceHelpers";

// ============================================
// Queries
// ============================================

/**
 * Consolidated Command Center data query.
 * Returns filtered suggestions AND counts in a single database round-trip.
 */
export const getCommandCenterData = query({
  args: {
    type: v.optional(v.string()),
    sourceModule: v.optional(v.string()),
    priority: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenantId = await getCurrentTenantId(ctx);
    
    const emptyCounts = {
      total: 0,
      pending: 0,
      critical: 0,
      byType: { work_order: 0, purchase: 0, release_wo: 0, forecast_cascade: 0 },
      byModule: { outbound: 0, production: 0, inbound: 0, plan: 0 },
    };
    
    if (!tenantId) {
      return { suggestions: [], counts: emptyCounts };
    }

    // Single query to fetch all pending suggestions
    const allPending = await ctx.db
      .query("nexusSuggestions")
      .withIndex("by_tenantId_and_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "pending")
      )
      .collect();

    // Filter and count in a single pass
    const { filtered, counts } = filterAndCount(allPending, {
      type: args.type,
      sourceModule: args.sourceModule,
      priority: args.priority,
    });

    // Sort by priority (critical first) then by date
    const sorted = sortByPriority(filtered);

    return { suggestions: sorted, counts };
  },
});

/**
 * @deprecated Use getCommandCenterData instead for better efficiency.
 * Get all suggestions for the current tenant
 */
export const getSuggestions = query({
  args: {
    status: v.optional(v.string()),
    type: v.optional(v.string()),
    sourceModule: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenantId = await getCurrentTenantId(ctx);
    if (!tenantId) return [];

    let suggestionsQuery;

    if (args.status) {
      suggestionsQuery = ctx.db
        .query("nexusSuggestions")
        .withIndex("by_tenantId_and_status", (q) =>
          q.eq("tenantId", tenantId).eq("status", args.status!)
        );
    } else if (args.type) {
      suggestionsQuery = ctx.db
        .query("nexusSuggestions")
        .withIndex("by_tenantId_and_type", (q) =>
          q.eq("tenantId", tenantId).eq("type", args.type!)
        );
    } else if (args.sourceModule) {
      suggestionsQuery = ctx.db
        .query("nexusSuggestions")
        .withIndex("by_tenantId_and_sourceModule", (q) =>
          q.eq("tenantId", tenantId).eq("sourceModule", args.sourceModule!)
        );
    } else {
      suggestionsQuery = ctx.db
        .query("nexusSuggestions")
        .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId));
    }

    return suggestionsQuery.order("desc").collect();
  },
});

/**
 * @deprecated Use getCommandCenterData instead for better efficiency.
 * Get pending suggestion counts for badge display
 */
export const getSuggestionCounts = query({
  args: {},
  handler: async (ctx) => {
    const tenantId = await getCurrentTenantId(ctx);
    if (!tenantId) {
      return {
        total: 0,
        pending: 0,
        critical: 0,
        byType: { work_order: 0, purchase: 0, release_wo: 0, forecast_cascade: 0 },
        byModule: { outbound: 0, production: 0, inbound: 0, plan: 0 },
      };
    }

    const pending = await ctx.db
      .query("nexusSuggestions")
      .withIndex("by_tenantId_and_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "pending")
      )
      .collect();

    const { counts } = filterAndCount(pending, {});
    return counts;
  },
});

// ============================================
// Mutations (User Actions)
// ============================================

/**
 * Accept a suggestion and execute the recommended action
 */
export const acceptSuggestion = mutation({
  args: {
    suggestionId: v.id("nexusSuggestions"),
  },
  handler: async (ctx, args) => {
    const tenantId = await requireTenantId(ctx);
    const suggestion = await ctx.db.get(args.suggestionId);

    if (!suggestion || suggestion.tenantId !== tenantId) {
      throw new Error("Suggestion not found");
    }

    if (suggestion.status !== "pending") {
      throw new Error("Suggestion is no longer pending");
    }

    const now = Date.now();

    // Execute the action based on suggestion type
    switch (suggestion.type) {
      case "work_order": {
        const payload = suggestion.payload as {
          finishedSku: string;
          finishedName: string;
          suggestedQty: number;
          priority: string;
          scheduledStart: string;
          scheduledEnd: string;
        };

        const warehouse = await ctx.db
          .query("warehouses")
          .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
          .first();

        if (!warehouse) {
          throw new Error("No warehouse configured");
        }

        const existingWOs = await ctx.db
          .query("nexusWorkOrders")
          .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
          .collect();
        const woNumber = `WO-${new Date().getFullYear()}-${String(existingWOs.length + 1).padStart(4, "0")}`;

        await ctx.db.insert("nexusWorkOrders", {
          tenantId,
          woNumber,
          finishedSku: payload.finishedSku,
          finishedName: payload.finishedName,
          qtyPlanned: payload.suggestedQty,
          qtyCompleted: 0,
          qtyRejected: 0,
          status: "draft",
          priority: payload.priority,
          scheduledStart: payload.scheduledStart,
          scheduledEnd: payload.scheduledEnd,
          warehouseId: warehouse._id,
          sourceOrderId: suggestion.relatedIds.orderId,
          notes: `Auto-generated from suggestion: ${suggestion.title}`,
          createdAt: now,
          updatedAt: now,
        });
        break;
      }

      case "purchase": {
        const payload = suggestion.payload as {
          materialSku: string;
          materialName: string;
          suggestedOrderQty: number;
          estimatedCost: number;
          orderByDate: string;
          neededByDate: string;
          linkedWorkOrders: string[];
        };

        await ctx.db.insert("nexusMaterialSuggestions", {
          tenantId,
          materialSku: payload.materialSku,
          materialName: payload.materialName,
          suggestedQty: payload.suggestedOrderQty,
          suggestedOrderDate: payload.orderByDate,
          neededByDate: payload.neededByDate,
          reason: suggestion.description,
          urgency: suggestion.priority,
          status: "accepted",
          linkedWorkOrders: payload.linkedWorkOrders,
          estimatedCost: payload.estimatedCost,
          generatedAt: now,
        });
        break;
      }

      case "release_wo": {
        const woId = suggestion.relatedIds.workOrderId;
        if (woId) {
          await ctx.db.patch(woId, {
            status: "released",
            updatedAt: now,
          });
        }
        break;
      }

      case "forecast_cascade":
        // Acknowledge only - individual actions are separate suggestions
        break;
    }

    await ctx.db.patch(args.suggestionId, {
      status: "accepted",
      acceptedAt: now,
      acceptedBy: "user",
    });

    return { success: true };
  },
});

/**
 * Dismiss a suggestion
 */
export const dismissSuggestion = mutation({
  args: {
    suggestionId: v.id("nexusSuggestions"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenantId = await requireTenantId(ctx);
    const suggestion = await ctx.db.get(args.suggestionId);

    if (!suggestion || suggestion.tenantId !== tenantId) {
      throw new Error("Suggestion not found");
    }

    if (suggestion.status !== "pending") {
      throw new Error("Suggestion is no longer pending");
    }

    await ctx.db.patch(args.suggestionId, {
      status: "dismissed",
      dismissedAt: Date.now(),
      dismissedBy: "user",
      dismissReason: args.reason,
    });

    return { success: true };
  },
});

// ============================================
// Seed Functions (Dev/Testing)
// ============================================

export const seedSampleSuggestionsInternal = internalMutation({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, args) => {
    const tenantId = args.tenantId;
    const now = Date.now();

    // Clear existing suggestions
    const existing = await ctx.db
      .query("nexusSuggestions")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    for (const s of existing) {
      await ctx.db.delete(s._id);
    }

    const samples = [
      {
        type: "work_order" as const,
        sourceModule: "outbound" as const,
        targetModule: "production" as const,
        priority: "critical" as const,
        title: "Create WO for 500 × SKU-WIDGET-PRO",
        description: "Order ORD-2024-0892 from Acme Corp requires 500 units of Widget Pro, but only 45 available.",
        payload: { finishedSku: "SKU-WIDGET-PRO", finishedName: "Widget Pro", qtyNeeded: 500, qtyInStock: 45, shortfall: 455, suggestedQty: 455, priority: "critical", scheduledStart: "2024-12-02", scheduledEnd: "2024-12-05" },
        relatedIds: {},
        expiresInDays: 7,
      },
      {
        type: "purchase" as const,
        sourceModule: "production" as const,
        targetModule: "inbound" as const,
        priority: "high" as const,
        title: "Order 2,000 KG of Aluminum Alloy A356",
        description: "Work orders WO-2024-0145, WO-2024-0147 require 2,400 KG but only 380 KG in stock.",
        payload: { materialSku: "MAT-ALU-A356", materialName: "Aluminum Alloy A356", suggestedOrderQty: 2200, estimatedCost: 18700, orderByDate: "2024-12-03", neededByDate: "2024-12-13", linkedWorkOrders: ["WO-2024-0145", "WO-2024-0147"] },
        relatedIds: { materialSku: "MAT-ALU-A356" },
        expiresInDays: 14,
      },
      {
        type: "release_wo" as const,
        sourceModule: "inbound" as const,
        targetModule: "production" as const,
        priority: "medium" as const,
        title: "Release WO-2024-0138 - Materials Now Available",
        description: "Materials received from TechSupply Co enable work order WO-2024-0138.",
        payload: { woNumber: "WO-2024-0138", finishedSku: "SKU-GADGET-X", finishedName: "Gadget X Assembly", materialsReceived: [{ sku: "MAT-PCB-001", name: "PCB Board Type A", qtyReceived: 150 }], canNowProceed: true },
        relatedIds: {},
        expiresInDays: 3,
      },
      {
        type: "forecast_cascade" as const,
        sourceModule: "plan" as const,
        targetModule: "production" as const,
        priority: "high" as const,
        title: "Forecast increased 35% for SKU-SENSOR-V2",
        description: "Global Retail Inc increased Q1 2025 forecast from 2,000 to 2,700 units.",
        payload: { sku: "SKU-SENSOR-V2", periodStart: "2025-01", previousQty: 2000, newQty: 2700, percentChange: 35, customerName: "Global Retail Inc", impactedWorkOrders: ["WO-2024-0156"], impactedMaterials: ["Sensor Module"], recommendedActions: ["Increase production capacity"] },
        relatedIds: {},
        expiresInDays: 14,
      },
    ];

    for (const s of samples) {
      await createSuggestion(ctx, { tenantId, ...s });
    }

    return { created: samples.length };
  },
});

export const seedSampleSuggestions = mutation({
  args: {},
  handler: async (ctx) => {
    const tenantId = await requireTenantId(ctx);
    await ctx.runMutation(internal.nexusIntelligence.seedSampleSuggestionsInternal, { tenantId });
    return { success: true };
  },
});

export const devSeedSuggestions = mutation({
  args: { tenantIdStr: v.string() },
  handler: async (ctx, args) => {
    const tenantId = args.tenantIdStr as Id<"tenants">;
    await ctx.runMutation(internal.nexusIntelligence.seedSampleSuggestionsInternal, { tenantId });
    return { success: true };
  },
});

// ============================================
// Event Detectors (refactored with helpers)
// ============================================

/**
 * Detector 1: Outbound → Production
 * Triggered when order created. Checks inventory, suggests work orders.
 */
export const detectProductionNeed = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    orderId: v.id("nexusOutboundOrders"),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return;

    for (const line of order.lines) {
      const inventory = await ctx.db
        .query("nexusFinishedInventory")
        .withIndex("by_tenantId_and_sku", (q) =>
          q.eq("tenantId", args.tenantId).eq("sku", line.sku)
        )
        .first();

      const qtyAvailable = inventory?.qtyAvailable ?? 0;
      const qtyNeeded = line.qtyOrdered - line.qtyShipped;
      const shortfall = qtyNeeded - qtyAvailable;

      if (shortfall <= 0) continue;

      // Check for existing suggestion
      const exists = await suggestionExists(ctx, args.tenantId, {
        type: "work_order",
        orderId: args.orderId,
      });
      if (exists) continue;

      const bom = await ctx.db
        .query("nexusBOM")
        .withIndex("by_tenantId_and_finishedSku", (q) =>
          q.eq("tenantId", args.tenantId).eq("finishedSku", line.sku)
        )
        .first();

      const finishedName = bom?.finishedName ?? line.description;
      const requestedDate = new Date(order.requestedShipDate);
      const daysRemaining = daysUntil(requestedDate);

      // Priority based on urgency
      let priority: SuggestionPriority = calculatePriority(daysRemaining, { criticalDays: 2, highDays: 5 });
      if (order.priority === "next_day") priority = "critical";
      else if (order.priority === "express" && priority !== "critical") priority = "high";

      const productionDays = 3;
      const startDate = subtractDaysFormatted(requestedDate, productionDays);

      await createSuggestion(ctx, {
        tenantId: args.tenantId,
        type: "work_order",
        sourceModule: "outbound",
        targetModule: "production",
        priority,
        title: `Create WO for ${shortfall} × ${line.sku}`,
        description: `Order ${order.orderNumber} requires ${qtyNeeded} units of ${finishedName}, but only ${qtyAvailable} available.`,
        payload: {
          finishedSku: line.sku,
          finishedName,
          qtyNeeded,
          qtyInStock: qtyAvailable,
          shortfall,
          suggestedQty: shortfall,
          priority,
          scheduledStart: startDate,
          scheduledEnd: order.requestedShipDate,
          sourceOrderNumber: order.orderNumber,
        },
        relatedIds: { orderId: args.orderId },
        expiresInDays: 7,
      });
    }
  },
});

/**
 * Detector 2: Production → Inbound
 * Triggered when WO scheduled. Explodes BOM, checks materials.
 */
export const detectMaterialNeed = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    workOrderId: v.id("nexusWorkOrders"),
  },
  handler: async (ctx, args) => {
    const workOrder = await ctx.db.get(args.workOrderId);
    if (!workOrder) return;

    const bom = await ctx.db
      .query("nexusBOM")
      .withIndex("by_tenantId_and_finishedSku", (q) =>
        q.eq("tenantId", args.tenantId).eq("finishedSku", workOrder.finishedSku)
      )
      .first();

    if (!bom) return;

    for (const material of bom.materials) {
      const scrapFactor = material.scrapFactor ?? 1;
      const qtyNeeded = workOrder.qtyPlanned * material.qtyPerUnit * scrapFactor;

      const inventoryRecords = await ctx.db
        .query("nexusRawInventory")
        .withIndex("by_tenantId_and_materialSku", (q) =>
          q.eq("tenantId", args.tenantId).eq("materialSku", material.materialSku)
        )
        .collect();

      const qtyAvailable = inventoryRecords.reduce((sum, inv) => sum + inv.qtyAvailable, 0);
      const shortfall = qtyNeeded - qtyAvailable;

      if (shortfall <= 0) continue;

      const exists = await suggestionExists(ctx, args.tenantId, {
        type: "purchase",
        materialSku: material.materialSku,
      });
      if (exists) continue;

      const rawMaterial = await ctx.db
        .query("nexusRawMaterials")
        .withIndex("by_tenantId_and_sku", (q) =>
          q.eq("tenantId", args.tenantId).eq("sku", material.materialSku)
        )
        .first();

      const leadTimeDays = rawMaterial?.leadTimeDays ?? 14;
      const costPerUnit = rawMaterial?.costPerUnit ?? 0;
      const neededByDate = new Date(workOrder.scheduledStart);
      const orderByDate = subtractDaysFormatted(neededByDate, leadTimeDays);
      const daysRemaining = daysUntil(neededByDate);

      const priority = calculatePriority(daysRemaining, { criticalDays: leadTimeDays, highDays: leadTimeDays + 7 });

      await createSuggestion(ctx, {
        tenantId: args.tenantId,
        type: "purchase",
        sourceModule: "production",
        targetModule: "inbound",
        priority,
        title: `Order ${Math.ceil(shortfall)} ${material.uom} of ${material.materialName}`,
        description: `Work order ${workOrder.woNumber} requires ${Math.ceil(qtyNeeded)} ${material.uom}, but only ${Math.round(qtyAvailable)} available. Order by ${orderByDate}.`,
        payload: {
          materialSku: material.materialSku,
          materialName: material.materialName,
          qtyNeeded: Math.ceil(qtyNeeded),
          qtyAvailable: Math.round(qtyAvailable),
          shortfall: Math.ceil(shortfall),
          suggestedOrderQty: Math.ceil(shortfall * 1.1),
          leadTimeDays,
          estimatedCost: Math.ceil(shortfall * 1.1) * costPerUnit,
          orderByDate,
          neededByDate: formatDateString(neededByDate),
          linkedWorkOrders: [workOrder.woNumber],
        },
        relatedIds: { workOrderId: args.workOrderId, materialSku: material.materialSku },
        expiresInDays: 14,
      });
    }
  },
});

/**
 * Detector 3: Inbound → Production
 * Triggered when PO received. Finds blocked work orders.
 */
export const detectWORelease = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    poId: v.id("nexusInboundPOs"),
  },
  handler: async (ctx, args) => {
    const po = await ctx.db.get(args.poId);
    if (!po) return;

    const receivedMaterials = po.lines
      .filter((line) => line.qtyReceived > 0)
      .map((line) => ({ sku: line.itemSku, name: line.description, qtyReceived: line.qtyReceived }));

    if (receivedMaterials.length === 0) return;

    const workOrders = await ctx.db
      .query("nexusWorkOrders")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .filter((q) => q.or(q.eq(q.field("status"), "draft"), q.eq(q.field("status"), "scheduled")))
      .collect();

    for (const wo of workOrders) {
      const bom = await ctx.db
        .query("nexusBOM")
        .withIndex("by_tenantId_and_finishedSku", (q) =>
          q.eq("tenantId", args.tenantId).eq("finishedSku", wo.finishedSku)
        )
        .first();

      if (!bom) continue;

      const relevantMaterials = receivedMaterials.filter((rm) =>
        bom.materials.some((bm) => bm.materialSku === rm.sku)
      );

      if (relevantMaterials.length === 0) continue;

      // Check if all materials are now available
      let canProceed = true;
      for (const material of bom.materials) {
        const scrapFactor = material.scrapFactor ?? 1;
        const qtyNeeded = wo.qtyPlanned * material.qtyPerUnit * scrapFactor;

        const inventoryRecords = await ctx.db
          .query("nexusRawInventory")
          .withIndex("by_tenantId_and_materialSku", (q) =>
            q.eq("tenantId", args.tenantId).eq("materialSku", material.materialSku)
          )
          .collect();

        const qtyAvailable = inventoryRecords.reduce((sum, inv) => sum + inv.qtyAvailable, 0);
        if (qtyAvailable < qtyNeeded) {
          canProceed = false;
          break;
        }
      }

      if (!canProceed) continue;

      const exists = await suggestionExists(ctx, args.tenantId, {
        type: "release_wo",
        workOrderId: wo._id,
      });
      if (exists) continue;

      const priority: SuggestionPriority = wo.priority === "rush" ? "critical" : wo.priority === "high" ? "high" : "medium";

      await createSuggestion(ctx, {
        tenantId: args.tenantId,
        type: "release_wo",
        sourceModule: "inbound",
        targetModule: "production",
        priority,
        title: `Release ${wo.woNumber} - Materials Now Available`,
        description: `Materials received from ${po.vendorName} (PO ${po.poNumber}) enable work order ${wo.woNumber}.`,
        payload: {
          woNumber: wo.woNumber,
          finishedSku: wo.finishedSku,
          finishedName: wo.finishedName,
          materialsReceived: relevantMaterials,
          canNowProceed: true,
          blockedSince: wo.createdAt,
        },
        relatedIds: { workOrderId: wo._id, poId: args.poId },
        expiresInDays: 3,
      });
    }
  },
});

/**
 * Detector 4: Plan → Everything
 * Triggered when forecast changes. Cascades impact analysis.
 */
export const cascadeForecast = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    planId: v.id("nexusPlans"),
    previousQty: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan) return;

    const previousQty = args.previousQty ?? 0;
    const qtyChange = plan.planQty - previousQty;
    const percentChange = previousQty > 0 ? (qtyChange / previousQty) * 100 : 100;

    // Only significant changes (>10% or new)
    if (Math.abs(percentChange) < 10 && previousQty > 0) return;

    const exists = await suggestionExists(ctx, args.tenantId, {
      type: "forecast_cascade",
      planId: args.planId,
    });
    if (exists) return;

    const customer = await ctx.db.get(plan.customerId);
    const customerName = customer?.name ?? "Unknown Customer";

    const workOrders = await ctx.db
      .query("nexusWorkOrders")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .filter((q) => q.eq(q.field("finishedSku"), plan.sku))
      .collect();

    const impactedWOs = workOrders
      .filter((wo) => !["completed", "cancelled"].includes(wo.status))
      .map((wo) => wo.woNumber);

    const bom = await ctx.db
      .query("nexusBOM")
      .withIndex("by_tenantId_and_finishedSku", (q) =>
        q.eq("tenantId", args.tenantId).eq("finishedSku", plan.sku)
      )
      .first();

    const impactedMaterials = bom?.materials.map((m) => m.materialName) ?? [];

    const recommendedActions: string[] = qtyChange > 0
      ? [`Increase production capacity for ${plan.sku}`, impactedMaterials.length > 0 ? `Review material orders for: ${impactedMaterials.slice(0, 3).join(", ")}` : ""].filter(Boolean)
      : [`Consider reducing scheduled production for ${plan.sku}`, "Review open POs for potential adjustments"];

    const changeDirection = qtyChange > 0 ? "increased" : "decreased";
    const priority: SuggestionPriority = Math.abs(percentChange) > 30 ? "high" : "medium";

    await createSuggestion(ctx, {
      tenantId: args.tenantId,
      type: "forecast_cascade",
      sourceModule: "plan",
      targetModule: "production",
      priority,
      title: `Forecast ${changeDirection} ${Math.abs(Math.round(percentChange))}% for ${plan.sku}`,
      description: `${customerName} ${changeDirection} their ${plan.periodStart} forecast from ${previousQty} to ${plan.planQty} units. Impacts ${impactedWOs.length} work orders.`,
      payload: {
        sku: plan.sku,
        periodStart: plan.periodStart,
        previousQty,
        newQty: plan.planQty,
        percentChange: Math.round(percentChange),
        customerName,
        impactedWorkOrders: impactedWOs,
        impactedMaterials,
        recommendedActions,
      },
      relatedIds: { planId: args.planId },
      expiresInDays: 14,
    });
  },
});
