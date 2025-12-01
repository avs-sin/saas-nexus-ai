import { v } from "convex/values";
import { query } from "./_generated/server";
import { getCurrentTenantId, requireTenantId } from "./helpers/tenantScope";

/**
 * Get dashboard data for NexusOutbound
 */
export const getDashboardData = query({
  args: {},
  handler: async (ctx) => {
    const tenantId = await getCurrentTenantId(ctx);
    if (!tenantId) return null;

    // Get orders
    const orders = await ctx.db
      .query("nexusOutboundOrders")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    // Get shipments
    const shipments = await ctx.db
      .query("nexusShipments")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    // Get discrepancies
    const discrepancies = await ctx.db
      .query("nexusOutboundDiscrepancies")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    // Get recent communications
    const comms = await ctx.db
      .query("nexusOutboundComms")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .order("desc")
      .take(10);

    // Get latest forecast
    const forecasts = await ctx.db
      .query("nexusShippingForecasts")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .order("desc")
      .take(7);

    // Calculate KPIs
    const today = new Date().toISOString().split("T")[0];
    const ordersToShipToday = orders.filter(
      (o) => o.requestedShipDate === today && o.status !== "shipped" && o.status !== "delivered"
    ).length;

    const inTransitShipments = shipments.filter(
      (s) => s.status === "in_transit" || s.status === "out_for_delivery"
    ).length;

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const deliveredThisWeek = shipments.filter(
      (s) => s.status === "delivered" && s.deliveredAt && s.deliveredAt > weekAgo
    ).length;

    const openDiscrepancies = discrepancies.filter((d) => d.status !== "resolved").length;
    const exceptionRate =
      shipments.length > 0
        ? Math.round((shipments.filter((s) => s.status === "exception").length / shipments.length) * 100)
        : 0;

    // Recent activity (last 5 orders)
    const recentOrders = orders
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5);

    return {
      orders,
      shipments,
      discrepancies,
      comms,
      forecasts,
      kpis: {
        ordersToShipToday,
        inTransitShipments,
        deliveredThisWeek,
        openDiscrepancies,
        exceptionRate,
        totalOrders: orders.length,
        totalShipments: shipments.length,
      },
      recentOrders,
    };
  },
});

/**
 * Get all orders with optional status filter
 */
export const getOrders = query({
  args: {
    status: v.optional(v.string()),
    customerType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenantId = await getCurrentTenantId(ctx);
    if (!tenantId) return [];

    let ordersQuery;

    if (args.status) {
      ordersQuery = ctx.db
        .query("nexusOutboundOrders")
        .withIndex("by_tenantId_and_status", (q) =>
          q.eq("tenantId", tenantId).eq("status", args.status!)
        );
    } else if (args.customerType) {
      ordersQuery = ctx.db
        .query("nexusOutboundOrders")
        .withIndex("by_tenantId_and_customerType", (q) =>
          q.eq("tenantId", tenantId).eq("customerType", args.customerType!)
        );
    } else {
      ordersQuery = ctx.db
        .query("nexusOutboundOrders")
        .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId));
    }

    return ordersQuery.order("desc").collect();
  },
});

/**
 * Get a single order by ID
 */
export const getOrder = query({
  args: { orderId: v.id("nexusOutboundOrders") },
  handler: async (ctx, args) => {
    const tenantId = await requireTenantId(ctx);
    const order = await ctx.db.get(args.orderId);

    if (!order || order.tenantId !== tenantId) {
      return null;
    }

    // Get associated shipments
    const shipments = await ctx.db
      .query("nexusShipments")
      .withIndex("by_tenantId_and_orderId", (q) =>
        q.eq("tenantId", tenantId).eq("orderId", args.orderId)
      )
      .collect();

    return { ...order, shipments };
  },
});

/**
 * Get all shipments with optional status filter
 */
export const getShipments = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenantId = await getCurrentTenantId(ctx);
    if (!tenantId) return [];

    let shipmentsQuery;

    if (args.status) {
      shipmentsQuery = ctx.db
        .query("nexusShipments")
        .withIndex("by_tenantId_and_status", (q) =>
          q.eq("tenantId", tenantId).eq("status", args.status!)
        );
    } else {
      shipmentsQuery = ctx.db
        .query("nexusShipments")
        .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId));
    }

    const shipments = await shipmentsQuery.order("desc").collect();

    // Enrich with order data
    const enrichedShipments = await Promise.all(
      shipments.map(async (shipment) => {
        const order = await ctx.db.get(shipment.orderId);
        return {
          ...shipment,
          orderNumber: order?.orderNumber ?? "Unknown",
          customerName: order?.customerName ?? "Unknown",
          customerType: order?.customerType ?? "Unknown",
        };
      })
    );

    return enrichedShipments;
  },
});

/**
 * Get shipment events for tracking
 */
export const getShipmentEvents = query({
  args: { shipmentId: v.id("nexusShipments") },
  handler: async (ctx, args) => {
    const tenantId = await requireTenantId(ctx);

    const shipment = await ctx.db.get(args.shipmentId);
    if (!shipment || shipment.tenantId !== tenantId) {
      return [];
    }

    return ctx.db
      .query("nexusShipmentEvents")
      .withIndex("by_shipmentId", (q) => q.eq("shipmentId", args.shipmentId))
      .order("desc")
      .collect();
  },
});

/**
 * Get shipping forecasts
 */
export const getForecasts = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const tenantId = await getCurrentTenantId(ctx);
    if (!tenantId) return [];

    const limit = args.days ?? 7;

    return ctx.db
      .query("nexusShippingForecasts")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .order("desc")
      .take(limit);
  },
});

/**
 * Get outbound communications
 */
export const getComms = query({
  args: {
    type: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const tenantId = await getCurrentTenantId(ctx);
    if (!tenantId) return [];

    let commsQuery;

    if (args.type) {
      commsQuery = ctx.db
        .query("nexusOutboundComms")
        .withIndex("by_tenantId_and_type", (q) =>
          q.eq("tenantId", tenantId).eq("type", args.type!)
        );
    } else {
      commsQuery = ctx.db
        .query("nexusOutboundComms")
        .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId));
    }

    return commsQuery.order("desc").take(args.limit ?? 20);
  },
});

/**
 * Get outbound discrepancies
 */
export const getDiscrepancies = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenantId = await getCurrentTenantId(ctx);
    if (!tenantId) return [];

    let query;

    if (args.status) {
      query = ctx.db
        .query("nexusOutboundDiscrepancies")
        .withIndex("by_tenantId_and_status", (q) =>
          q.eq("tenantId", tenantId).eq("status", args.status!)
        );
    } else {
      query = ctx.db
        .query("nexusOutboundDiscrepancies")
        .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId));
    }

    const discrepancies = await query.order("desc").collect();

    // Enrich with order data
    const enrichedDiscrepancies = await Promise.all(
      discrepancies.map(async (disc) => {
        const order = await ctx.db.get(disc.orderId);
        const shipment = disc.shipmentId ? await ctx.db.get(disc.shipmentId) : null;
        return {
          ...disc,
          orderNumber: order?.orderNumber ?? "Unknown",
          customerName: order?.customerName ?? "Unknown",
          shipmentNumber: shipment?.shipmentNumber ?? null,
        };
      })
    );

    return enrichedDiscrepancies;
  },
});

/**
 * Check if tenant has any outbound data
 */
export const hasData = query({
  args: {},
  handler: async (ctx) => {
    const tenantId = await getCurrentTenantId(ctx);
    if (!tenantId) return false;

    const order = await ctx.db
      .query("nexusOutboundOrders")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .first();

    return order !== null;
  },
});


