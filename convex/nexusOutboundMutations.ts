import { v } from "convex/values";
import { mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { requireTenantId } from "./helpers/tenantScope";

/**
 * Create a new outbound order
 */
export const createOrder = mutation({
  args: {
    orderNumber: v.string(),
    customerType: v.string(),
    customerId: v.optional(v.string()),
    customerName: v.string(),
    customerEmail: v.string(),
    shippingAddress: v.object({
      street: v.string(),
      city: v.string(),
      state: v.string(),
      zipCode: v.string(),
      country: v.string(),
    }),
    lines: v.array(
      v.object({
        sku: v.string(),
        description: v.string(),
        qtyOrdered: v.number(),
        qtyShipped: v.number(),
        unitPrice: v.number(),
      })
    ),
    priority: v.string(),
    requestedShipDate: v.string(),
    sourceWarehouseId: v.optional(v.id("warehouses")),
  },
  handler: async (ctx, args) => {
    const tenantId = await requireTenantId(ctx);
    const now = Date.now();

    const orderId = await ctx.db.insert("nexusOutboundOrders", {
      tenantId,
      orderNumber: args.orderNumber,
      customerType: args.customerType,
      customerId: args.customerId,
      customerName: args.customerName,
      customerEmail: args.customerEmail,
      shippingAddress: args.shippingAddress,
      lines: args.lines,
      priority: args.priority,
      requestedShipDate: args.requestedShipDate,
      status: "pending",
      sourceWarehouseId: args.sourceWarehouseId,
      createdAt: now,
      updatedAt: now,
    });

    // Log activity
    await ctx.db.insert("activityLog", {
      tenantId,
      action: "order_created",
      entityType: "outbound_order",
      entityId: orderId,
      description: `Created outbound order ${args.orderNumber} for ${args.customerName}`,
      createdAt: now,
    });

    // Trigger cross-module intelligence: Check if production is needed
    await ctx.scheduler.runAfter(0, internal.nexusIntelligence.detectProductionNeed, {
      tenantId,
      orderId,
    });

    return orderId;
  },
});

/**
 * Update order status
 */
export const updateOrderStatus = mutation({
  args: {
    orderId: v.id("nexusOutboundOrders"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const tenantId = await requireTenantId(ctx);
    const order = await ctx.db.get(args.orderId);

    if (!order || order.tenantId !== tenantId) {
      throw new Error("Order not found");
    }

    await ctx.db.patch(args.orderId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activityLog", {
      tenantId,
      action: "order_status_updated",
      entityType: "outbound_order",
      entityId: args.orderId,
      description: `Order ${order.orderNumber} status changed to ${args.status}`,
      createdAt: Date.now(),
    });

    return args.orderId;
  },
});

/**
 * Create a shipment for an order
 */
export const createShipment = mutation({
  args: {
    orderId: v.id("nexusOutboundOrders"),
    shipmentNumber: v.string(),
    carrier: v.string(),
    serviceLevel: v.string(),
    trackingNumber: v.optional(v.string()),
    trackingUrl: v.optional(v.string()),
    estimatedDelivery: v.optional(v.string()),
    weight: v.number(),
    dimensions: v.optional(
      v.object({
        length: v.number(),
        width: v.number(),
        height: v.number(),
      })
    ),
    shippingCost: v.number(),
    labelUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenantId = await requireTenantId(ctx);
    const order = await ctx.db.get(args.orderId);

    if (!order || order.tenantId !== tenantId) {
      throw new Error("Order not found");
    }

    const now = Date.now();

    const shipmentId = await ctx.db.insert("nexusShipments", {
      tenantId,
      orderId: args.orderId,
      shipmentNumber: args.shipmentNumber,
      carrier: args.carrier,
      serviceLevel: args.serviceLevel,
      trackingNumber: args.trackingNumber,
      trackingUrl: args.trackingUrl,
      status: "label_created",
      estimatedDelivery: args.estimatedDelivery,
      weight: args.weight,
      dimensions: args.dimensions,
      shippingCost: args.shippingCost,
      labelUrl: args.labelUrl,
      createdAt: now,
    });

    // Create initial shipment event
    await ctx.db.insert("nexusShipmentEvents", {
      tenantId,
      shipmentId,
      event: "label_created",
      description: `Shipping label created for ${args.carrier} ${args.serviceLevel}`,
      timestamp: now,
    });

    // Update order status
    await ctx.db.patch(args.orderId, {
      status: "packed",
      updatedAt: now,
    });

    // Log activity
    await ctx.db.insert("activityLog", {
      tenantId,
      action: "shipment_created",
      entityType: "shipment",
      entityId: shipmentId,
      description: `Created shipment ${args.shipmentNumber} for order ${order.orderNumber}`,
      createdAt: now,
    });

    return shipmentId;
  },
});

/**
 * Update shipment status
 */
export const updateShipmentStatus = mutation({
  args: {
    shipmentId: v.id("nexusShipments"),
    status: v.string(),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenantId = await requireTenantId(ctx);
    const shipment = await ctx.db.get(args.shipmentId);

    if (!shipment || shipment.tenantId !== tenantId) {
      throw new Error("Shipment not found");
    }

    const now = Date.now();

    // Update shipment
    const updates: Record<string, unknown> = { status: args.status };
    
    if (args.status === "delivered") {
      updates.deliveredAt = now;
      updates.actualDelivery = new Date().toISOString().split("T")[0];
    } else if (args.status === "picked_up") {
      updates.shippedAt = now;
    }

    await ctx.db.patch(args.shipmentId, updates);

    // Create shipment event
    await ctx.db.insert("nexusShipmentEvents", {
      tenantId,
      shipmentId: args.shipmentId,
      event: args.status,
      description: args.description || `Status updated to ${args.status}`,
      location: args.location,
      timestamp: now,
    });

    // Update order status if delivered
    if (args.status === "delivered") {
      await ctx.db.patch(shipment.orderId, {
        status: "delivered",
        updatedAt: now,
      });
    } else if (args.status === "picked_up" || args.status === "in_transit") {
      await ctx.db.patch(shipment.orderId, {
        status: "shipped",
        updatedAt: now,
      });
    }

    return args.shipmentId;
  },
});

/**
 * Log a communication
 */
export const logComm = mutation({
  args: {
    shipmentId: v.optional(v.id("nexusShipments")),
    orderId: v.optional(v.id("nexusOutboundOrders")),
    customerId: v.optional(v.string()),
    channel: v.string(),
    type: v.string(),
    recipient: v.string(),
    subject: v.optional(v.string()),
    body: v.string(),
    aiGenerated: v.boolean(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const tenantId = await requireTenantId(ctx);

    return ctx.db.insert("nexusOutboundComms", {
      tenantId,
      shipmentId: args.shipmentId,
      orderId: args.orderId,
      customerId: args.customerId,
      channel: args.channel,
      type: args.type,
      recipient: args.recipient,
      subject: args.subject,
      body: args.body,
      aiGenerated: args.aiGenerated,
      sentAt: Date.now(),
      status: args.status,
    });
  },
});

/**
 * Save shipping forecast
 */
export const saveForecast = mutation({
  args: {
    forecastDate: v.string(),
    predictions: v.array(
      v.object({
        segment: v.string(),
        carrier: v.optional(v.string()),
        region: v.optional(v.string()),
        predictedVolume: v.number(),
        confidenceLevel: v.number(),
        factors: v.array(v.string()),
      })
    ),
    alerts: v.array(
      v.object({
        type: v.string(),
        severity: v.string(),
        message: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const tenantId = await requireTenantId(ctx);

    return ctx.db.insert("nexusShippingForecasts", {
      tenantId,
      forecastDate: args.forecastDate,
      generatedAt: Date.now(),
      predictions: args.predictions,
      alerts: args.alerts,
    });
  },
});

/**
 * Create a discrepancy
 */
export const createDiscrepancy = mutation({
  args: {
    shipmentId: v.optional(v.id("nexusShipments")),
    orderId: v.id("nexusOutboundOrders"),
    type: v.string(),
    severity: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const tenantId = await requireTenantId(ctx);
    const order = await ctx.db.get(args.orderId);

    if (!order || order.tenantId !== tenantId) {
      throw new Error("Order not found");
    }

    const now = Date.now();

    const discId = await ctx.db.insert("nexusOutboundDiscrepancies", {
      tenantId,
      shipmentId: args.shipmentId,
      orderId: args.orderId,
      type: args.type,
      severity: args.severity,
      description: args.description,
      status: "open",
      customerNotified: false,
      createdAt: now,
    });

    // Log activity
    await ctx.db.insert("activityLog", {
      tenantId,
      action: "discrepancy_created",
      entityType: "outbound_discrepancy",
      entityId: discId,
      description: `Created ${args.severity} discrepancy for order ${order.orderNumber}: ${args.type}`,
      createdAt: now,
    });

    return discId;
  },
});

/**
 * Resolve a discrepancy
 */
export const resolveDiscrepancy = mutation({
  args: {
    discrepancyId: v.id("nexusOutboundDiscrepancies"),
    resolution: v.string(),
    notifyCustomer: v.boolean(),
  },
  handler: async (ctx, args) => {
    const tenantId = await requireTenantId(ctx);
    const disc = await ctx.db.get(args.discrepancyId);

    if (!disc || disc.tenantId !== tenantId) {
      throw new Error("Discrepancy not found");
    }

    const now = Date.now();

    await ctx.db.patch(args.discrepancyId, {
      status: "resolved",
      resolution: args.resolution,
      customerNotified: args.notifyCustomer,
      resolvedAt: now,
    });

    return args.discrepancyId;
  },
});

/**
 * Seed demo data for NexusOutbound
 */
export const seedOutboundData = mutation({
  args: {},
  handler: async (ctx) => {
    const tenantId = await requireTenantId(ctx);
    const now = Date.now();

    // Check if data already exists
    const existingOrder = await ctx.db
      .query("nexusOutboundOrders")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .first();

    if (existingOrder) {
      return { message: "Data already exists", seeded: false };
    }

    // Get warehouses
    const warehouses = await ctx.db
      .query("warehouses")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();
    const warehouseId = warehouses[0]?._id;

    // Sample B2B customers
    const b2bCustomers = [
      { name: "Acme Manufacturing", email: "orders@acme.com" },
      { name: "TechCorp Industries", email: "procurement@techcorp.com" },
      { name: "Global Retail Inc", email: "supply@globalretail.com" },
    ];

    // Sample B2C customers
    const b2cCustomers = [
      { name: "John Smith", email: "john.smith@email.com" },
      { name: "Sarah Johnson", email: "sarah.j@email.com" },
      { name: "Michael Chen", email: "m.chen@email.com" },
      { name: "Emily Davis", email: "emily.d@email.com" },
    ];

    const statuses = ["pending", "allocated", "picking", "packed", "shipped", "delivered"];
    const carriers = ["UPS", "FedEx", "USPS"];
    const serviceLevels = ["Ground", "2Day", "Overnight"];
    const priorities = ["standard", "express", "next_day"];

    const orderIds: string[] = [];

    // Create B2B orders
    for (let i = 0; i < 5; i++) {
      const customer = b2bCustomers[i % b2bCustomers.length];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const daysAgo = Math.floor(Math.random() * 14);
      const requestedDate = new Date(now - daysAgo * 24 * 60 * 60 * 1000);

      const orderId = await ctx.db.insert("nexusOutboundOrders", {
        tenantId,
        orderNumber: `SO-${2001 + i}`,
        customerType: "B2B",
        customerName: customer.name,
        customerEmail: customer.email,
        shippingAddress: {
          street: `${100 + i * 10} Industrial Blvd`,
          city: ["Chicago", "Houston", "Phoenix"][i % 3],
          state: ["IL", "TX", "AZ"][i % 3],
          zipCode: `${60000 + i * 1000}`,
          country: "USA",
        },
        lines: [
          {
            sku: `SKU-${1000 + i}`,
            description: `Industrial Component ${String.fromCharCode(65 + i)}`,
            qtyOrdered: 50 + i * 25,
            qtyShipped: status === "delivered" || status === "shipped" ? 50 + i * 25 : 0,
            unitPrice: 45.99 + i * 10,
          },
          {
            sku: `SKU-${2000 + i}`,
            description: `Raw Material Pack ${i + 1}`,
            qtyOrdered: 100,
            qtyShipped: status === "delivered" || status === "shipped" ? 100 : 0,
            unitPrice: 22.50,
          },
        ],
        priority: priorities[i % 3],
        requestedShipDate: requestedDate.toISOString().split("T")[0],
        status,
        sourceWarehouseId: warehouseId,
        createdAt: now - daysAgo * 24 * 60 * 60 * 1000,
        updatedAt: now,
      });

      orderIds.push(orderId);
    }

    // Create B2C orders
    for (let i = 0; i < 8; i++) {
      const customer = b2cCustomers[i % b2cCustomers.length];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const daysAgo = Math.floor(Math.random() * 7);
      const requestedDate = new Date(now + (3 - daysAgo) * 24 * 60 * 60 * 1000);

      const orderId = await ctx.db.insert("nexusOutboundOrders", {
        tenantId,
        orderNumber: `WEB-${3001 + i}`,
        customerType: "B2C",
        customerName: customer.name,
        customerEmail: customer.email,
        shippingAddress: {
          street: `${200 + i * 5} Main Street Apt ${i + 1}`,
          city: ["New York", "Los Angeles", "Seattle", "Miami"][i % 4],
          state: ["NY", "CA", "WA", "FL"][i % 4],
          zipCode: `${10000 + i * 5000}`,
          country: "USA",
        },
        lines: [
          {
            sku: `PROD-${100 + i}`,
            description: `Consumer Product ${i + 1}`,
            qtyOrdered: 1 + (i % 3),
            qtyShipped: status === "delivered" || status === "shipped" ? 1 + (i % 3) : 0,
            unitPrice: 29.99 + i * 5,
          },
        ],
        priority: i % 4 === 0 ? "next_day" : i % 2 === 0 ? "express" : "standard",
        requestedShipDate: requestedDate.toISOString().split("T")[0],
        status,
        sourceWarehouseId: warehouseId,
        createdAt: now - daysAgo * 24 * 60 * 60 * 1000,
        updatedAt: now,
      });

      orderIds.push(orderId);
    }

    // Create shipments for shipped/delivered orders
    const shippedOrders = await ctx.db
      .query("nexusOutboundOrders")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .filter((q) =>
        q.or(q.eq(q.field("status"), "shipped"), q.eq(q.field("status"), "delivered"))
      )
      .collect();

    for (let i = 0; i < shippedOrders.length; i++) {
      const order = shippedOrders[i];
      const carrier = carriers[i % 3];
      const serviceLevel = serviceLevels[i % 3];
      const isDelivered = order.status === "delivered";

      const shipmentId = await ctx.db.insert("nexusShipments", {
        tenantId,
        orderId: order._id,
        shipmentNumber: `SHP-${4001 + i}`,
        carrier,
        serviceLevel,
        trackingNumber: `1Z${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        trackingUrl: `https://track.${carrier.toLowerCase()}.com/`,
        status: isDelivered ? "delivered" : "in_transit",
        estimatedDelivery: new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        actualDelivery: isDelivered
          ? new Date(now - 24 * 60 * 60 * 1000).toISOString().split("T")[0]
          : undefined,
        weight: 5 + i * 2,
        dimensions: { length: 12, width: 10, height: 8 },
        shippingCost: 12.99 + i * 3,
        shippedAt: now - 3 * 24 * 60 * 60 * 1000,
        deliveredAt: isDelivered ? now - 24 * 60 * 60 * 1000 : undefined,
        createdAt: now - 3 * 24 * 60 * 60 * 1000,
      });

      // Add tracking events
      await ctx.db.insert("nexusShipmentEvents", {
        tenantId,
        shipmentId,
        event: "label_created",
        description: "Shipping label created",
        timestamp: now - 3 * 24 * 60 * 60 * 1000,
      });

      await ctx.db.insert("nexusShipmentEvents", {
        tenantId,
        shipmentId,
        event: "picked_up",
        description: `Package picked up by ${carrier}`,
        location: "Origin Facility",
        timestamp: now - 2.5 * 24 * 60 * 60 * 1000,
      });

      await ctx.db.insert("nexusShipmentEvents", {
        tenantId,
        shipmentId,
        event: "in_transit",
        description: "Package in transit",
        location: "Regional Hub",
        timestamp: now - 2 * 24 * 60 * 60 * 1000,
      });

      if (isDelivered) {
        await ctx.db.insert("nexusShipmentEvents", {
          tenantId,
          shipmentId,
          event: "out_for_delivery",
          description: "Out for delivery",
          location: "Local Facility",
          timestamp: now - 1.5 * 24 * 60 * 60 * 1000,
        });

        await ctx.db.insert("nexusShipmentEvents", {
          tenantId,
          shipmentId,
          event: "delivered",
          description: "Package delivered",
          location: "Delivered to customer",
          timestamp: now - 24 * 60 * 60 * 1000,
        });
      }
    }

    // Create sample discrepancies
    const discrepancyTypes = ["short_ship", "wrong_item", "damaged", "address_issue"];
    const severities = ["low", "medium", "high"];

    for (let i = 0; i < 3; i++) {
      await ctx.db.insert("nexusOutboundDiscrepancies", {
        tenantId,
        orderId: orderIds[i] as any,
        type: discrepancyTypes[i % 4],
        severity: severities[i % 3],
        description: [
          "Customer reported 2 units short",
          "Wrong color variant shipped",
          "Package arrived damaged - crushed corner",
        ][i],
        status: i === 0 ? "open" : i === 1 ? "investigating" : "resolved",
        resolution: i === 2 ? "Replacement shipped via expedited delivery" : undefined,
        customerNotified: true,
        createdAt: now - i * 24 * 60 * 60 * 1000,
        resolvedAt: i === 2 ? now : undefined,
      });
    }

    // Create sample communications
    await ctx.db.insert("nexusOutboundComms", {
      tenantId,
      orderId: orderIds[0] as any,
      channel: "email",
      type: "shipped",
      recipient: "orders@acme.com",
      subject: "Your Order SO-2001 Has Shipped!",
      body: "Great news! Your order has been shipped and is on its way. Track your package using the link below.",
      aiGenerated: true,
      sentAt: now - 2 * 24 * 60 * 60 * 1000,
      status: "delivered",
    });

    await ctx.db.insert("nexusOutboundComms", {
      tenantId,
      orderId: orderIds[5] as any,
      channel: "email",
      type: "delivered",
      recipient: "john.smith@email.com",
      subject: "Your Package Has Been Delivered! 📦",
      body: "Hi John! Your order has been delivered. We hope you love your purchase! Let us know if you have any questions.",
      aiGenerated: true,
      sentAt: now - 24 * 60 * 60 * 1000,
      status: "delivered",
    });

    // Create sample forecasts
    for (let i = 0; i < 7; i++) {
      const forecastDate = new Date(now + i * 24 * 60 * 60 * 1000);
      await ctx.db.insert("nexusShippingForecasts", {
        tenantId,
        forecastDate: forecastDate.toISOString().split("T")[0],
        generatedAt: now,
        predictions: [
          {
            segment: "all",
            predictedVolume: 15 + Math.floor(Math.random() * 10),
            confidenceLevel: 85 + Math.floor(Math.random() * 10),
            factors: ["Historical trend", "Day of week pattern"],
          },
          {
            segment: "B2B",
            predictedVolume: 5 + Math.floor(Math.random() * 5),
            confidenceLevel: 80 + Math.floor(Math.random() * 15),
            factors: ["Contract deliveries", "Weekly pattern"],
          },
          {
            segment: "B2C",
            predictedVolume: 10 + Math.floor(Math.random() * 8),
            confidenceLevel: 75 + Math.floor(Math.random() * 15),
            factors: ["E-commerce traffic", "Promotions"],
          },
        ],
        alerts:
          i === 2
            ? [
                {
                  type: "spike_detected",
                  severity: "medium",
                  message: "20% volume increase expected due to promotional campaign",
                },
              ]
            : [],
      });
    }

    return { message: "Demo data seeded successfully", seeded: true };
  },
});

/**
 * Internal seed mutation (for dev tools)
 */
export const seedOutboundDataInternal = internalMutation({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const tenantId = args.tenantId;
    const now = Date.now();

    const existingOrder = await ctx.db
      .query("nexusOutboundOrders")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .first();

    if (existingOrder) {
      return { message: "Data already exists", seeded: false };
    }

    const warehouses = await ctx.db
      .query("warehouses")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();
    const warehouseId = warehouses[0]?._id;

    // Create sample orders
    const orderId = await ctx.db.insert("nexusOutboundOrders", {
      tenantId,
      orderNumber: "ORD-2024-0001",
      customerId: "CUST-001",
      customerName: "Acme Manufacturing",
      customerEmail: "orders@acme.com",
      customerType: "B2B",
      status: "pending",
      priority: "standard",
      requestedShipDate: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      shippingAddress: { street: "123 Industrial Ave", city: "Detroit", state: "MI", zipCode: "48201", country: "USA" },
      lines: [{ sku: "SKU-WIDGET-PRO", description: "Widget Pro", qtyOrdered: 100, qtyShipped: 0, unitPrice: 25.00 }],
      sourceWarehouseId: warehouseId,
      createdAt: now,
      updatedAt: now,
    });

    // Create sample shipment
    await ctx.db.insert("nexusShipments", {
      tenantId,
      shipmentNumber: "SHP-2024-0001",
      orderId,
      status: "pending",
      carrier: "UPS",
      serviceLevel: "Ground",
      trackingNumber: "1Z999AA10123456784",
      trackingUrl: "https://ups.com/track/1Z999AA10123456784",
      weight: 15.5,
      shippingCost: 12.50,
      createdAt: now,
    });

    return { message: "Demo data seeded", seeded: true };
  },
});

/**
 * DEV ONLY: Seed with explicit tenant ID
 */
export const devSeedOutbound = mutation({
  args: { tenantIdStr: v.string() },
  handler: async (ctx, args) => {
    const tenantId = args.tenantIdStr as Id<"tenants">;
    await ctx.runMutation(internal.nexusOutboundMutations.seedOutboundDataInternal, { tenantId });
    return { success: true };
  },
});
