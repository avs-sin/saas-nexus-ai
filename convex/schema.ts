import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// User roles within a tenant
export const userRoleValidator = v.union(
  v.literal("admin"),
  v.literal("manager"),
  v.literal("operator"),
  v.literal("viewer")
);

export default defineSchema({
  // Tenants table - linked to Clerk Organizations
  tenants: defineTable({
    // Clerk Organization ID
    orgId: v.string(),
    // Organization name (synced from Clerk)
    name: v.string(),
    // Organization slug for URL routing
    slug: v.string(),
    // Tenant-specific settings stored as JSON
    settings: v.optional(v.object({
      timezone: v.optional(v.string()),
      currency: v.optional(v.string()),
      dateFormat: v.optional(v.string()),
      lowStockThreshold: v.optional(v.number()),
    })),
    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_slug", ["slug"]),

  // Users table - tenant-scoped user profiles
  users: defineTable({
    // Clerk User ID
    clerkUserId: v.string(),
    // Reference to tenant
    tenantId: v.id("tenants"),
    // User's role within this tenant
    role: userRoleValidator,
    // User info (synced from Clerk)
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    // Status
    isActive: v.boolean(),
    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
    lastLoginAt: v.optional(v.number()),
  })
    .index("by_clerkUserId", ["clerkUserId"])
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_and_clerkUserId", ["tenantId", "clerkUserId"])
    .index("by_email", ["email"]),

  // Warehouses table - tenant-scoped
  warehouses: defineTable({
    // Reference to tenant (for isolation)
    tenantId: v.id("tenants"),
    // Warehouse details
    name: v.string(),
    code: v.string(), // Short code like "WH-001"
    location: v.object({
      address: v.string(),
      city: v.string(),
      state: v.string(),
      zipCode: v.string(),
      country: v.string(),
    }),
    // Capacity in square feet
    capacity: v.number(),
    // Current utilization percentage (0-100)
    utilizationPercent: v.number(),
    // Status
    isActive: v.boolean(),
    // Contact info
    contactName: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_and_code", ["tenantId", "code"]),

  // Activity log for recent events (tenant-scoped)
  activityLog: defineTable({
    tenantId: v.id("tenants"),
    userId: v.optional(v.id("users")),
    action: v.string(),
    entityType: v.string(), // e.g., "warehouse", "inventory", "order"
    entityId: v.optional(v.string()),
    description: v.string(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_and_createdAt", ["tenantId", "createdAt"]),

  // ============================================
  // NexusPlan Module Tables
  // ============================================

  // NexusPlan Customers - EDI trading partners
  nexusCustomers: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    salesRep: v.string(),
    ediId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_and_ediId", ["tenantId", "ediId"]),

  // NexusPlan Vendors - Suppliers
  nexusVendors: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    category: v.string(),
    contactEmail: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_and_category", ["tenantId", "category"]),

  // NexusPlan Plans - Forecasts
  nexusPlans: defineTable({
    tenantId: v.id("tenants"),
    customerId: v.id("nexusCustomers"),
    sku: v.string(),
    periodStart: v.string(), // YYYY-MM format
    planQty: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_and_customerId", ["tenantId", "customerId"])
    .index("by_tenantId_and_period", ["tenantId", "periodStart"]),

  // NexusPlan Purchase Orders with version history
  nexusPurchaseOrders: defineTable({
    tenantId: v.id("tenants"),
    poNumber: v.string(),
    customerId: v.id("nexusCustomers"),
    vendorId: v.id("nexusVendors"),
    status: v.string(), // 'OPEN' | 'PARTIAL' | 'CLOSED' | 'CANCELLED'
    currentQty: v.number(),
    currentDeliveryDate: v.string(),
    sku: v.string(),
    versions: v.array(
      v.object({
        versionNumber: v.number(),
        changeType: v.string(), // 'CREATED' | 'QTY_CHANGE' | 'DATE_CHANGE' | 'CANCELLATION'
        changedBy: v.string(),
        changeReason: v.string(),
        changedAt: v.string(),
        payload: v.object({
          qty: v.number(),
          deliveryDate: v.string(),
          price: v.number(),
        }),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_and_poNumber", ["tenantId", "poNumber"])
    .index("by_tenantId_and_status", ["tenantId", "status"])
    .index("by_tenantId_and_vendorId", ["tenantId", "vendorId"])
    .index("by_tenantId_and_customerId", ["tenantId", "customerId"]),

  // NexusPlan Discrepancies - Variance tracking
  nexusDiscrepancies: defineTable({
    tenantId: v.id("tenants"),
    relatedType: v.string(), // 'PO' | 'RECEIPT' | 'PLAN'
    relatedId: v.string(), // Can be ID or PO Number string
    metric: v.string(), // 'QTY_VARIANCE' | 'TIMING_VARIANCE' | 'MODIFICATION_RATE'
    severity: v.string(), // 'LOW' | 'MEDIUM' | 'HIGH'
    expected: v.union(v.string(), v.number()),
    actual: v.union(v.string(), v.number()),
    status: v.string(), // 'OPEN' | 'INVESTIGATING' | 'RESOLVED'
    detectedAt: v.string(),
    description: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_and_status", ["tenantId", "status"])
    .index("by_tenantId_and_severity", ["tenantId", "severity"]),

  // NexusPlan Customer Scorecards
  nexusCustomerScores: defineTable({
    tenantId: v.id("tenants"),
    customerId: v.id("nexusCustomers"),
    totalScore: v.number(),
    metrics: v.array(
      v.object({
        name: v.string(),
        value: v.number(),
        weight: v.number(),
      })
    ),
    trend: v.array(
      v.object({
        date: v.string(),
        score: v.number(),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_and_customerId", ["tenantId", "customerId"]),

  // NexusPlan Vendor Scorecards
  nexusVendorScores: defineTable({
    tenantId: v.id("tenants"),
    vendorId: v.id("nexusVendors"),
    totalScore: v.number(),
    metrics: v.array(
      v.object({
        name: v.string(),
        value: v.number(),
        weight: v.number(),
      })
    ),
    trend: v.array(
      v.object({
        date: v.string(),
        score: v.number(),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_and_vendorId", ["tenantId", "vendorId"]),

  // ============================================
  // NexusInbound Module Tables
  // ============================================

  // NexusInbound Vendors - Suppliers for receiving
  nexusInboundVendors: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    ediId: v.string(),
    status: v.string(), // 'Active' | 'OnHold' | 'Disqualified'
    overallScore: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_and_ediId", ["tenantId", "ediId"]),

  // NexusInbound Purchase Orders
  nexusInboundPOs: defineTable({
    tenantId: v.id("tenants"),
    poNumber: v.string(),
    vendorId: v.id("nexusInboundVendors"),
    vendorName: v.string(), // Denormalized for ease
    dateOrdered: v.string(),
    datePromised: v.string(),
    status: v.string(), // 'Open' | 'Partial' | 'Closed'
    lines: v.array(
      v.object({
        id: v.string(),
        itemSku: v.string(),
        description: v.string(),
        qtyOrdered: v.number(),
        qtyReceived: v.number(),
        unitPrice: v.number(),
        uom: v.string(),
      })
    ),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_and_poNumber", ["tenantId", "poNumber"])
    .index("by_tenantId_and_status", ["tenantId", "status"]),

  // NexusInbound Discrepancies
  nexusInboundDiscrepancies: defineTable({
    tenantId: v.id("tenants"),
    poNumber: v.string(),
    vendorName: v.string(),
    type: v.string(), // DiscrepancyType enum
    severity: v.string(), // 'Low' | 'Medium' | 'High' | 'Critical'
    description: v.string(),
    status: v.string(), // DiscrepancyStatus enum
    createdAt: v.string(),
    itemSku: v.optional(v.string()),
    expectedQty: v.optional(v.number()),
    receivedQty: v.optional(v.number()),
    qualityIssueType: v.optional(v.string()),
    inspectionDetails: v.optional(v.any()),
    resolutionNote: v.optional(v.string()),
    resolutionOutcome: v.optional(v.string()),
    resolvedAt: v.optional(v.string()),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_and_status", ["tenantId", "status"])
    .index("by_tenantId_and_severity", ["tenantId", "severity"]),

  // NexusInbound EDI Logs
  nexusInboundEdiLogs: defineTable({
    tenantId: v.id("tenants"),
    type: v.string(), // '850' | '810' | '856' | '846' | '997'
    direction: v.string(), // 'Inbound' | 'Outbound'
    partner: v.string(),
    timestamp: v.string(),
    status: v.string(), // 'Processed' | 'Failed' | 'Pending'
    rawSize: v.string(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_and_status", ["tenantId", "status"]),

  // NexusInbound Vendor Scorecards
  nexusInboundScorecards: defineTable({
    tenantId: v.id("tenants"),
    vendorId: v.id("nexusInboundVendors"),
    period: v.string(),
    totalScore: v.number(),
    components: v.array(
      v.object({
        metric: v.string(),
        score: v.number(),
        weight: v.number(),
      })
    ),
    history: v.array(
      v.object({
        date: v.string(),
        score: v.number(),
      })
    ),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_and_vendorId", ["tenantId", "vendorId"]),

  // ============================================
  // NexusOutbound Module Tables
  // ============================================

  // Outbound Orders (sales orders / fulfillment requests)
  nexusOutboundOrders: defineTable({
    tenantId: v.id("tenants"),
    orderNumber: v.string(),
    customerType: v.string(), // 'B2B' | 'B2C'
    customerId: v.optional(v.string()), // Link to nexusCustomers for B2B
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
    priority: v.string(), // 'standard' | 'express' | 'next_day'
    requestedShipDate: v.string(),
    status: v.string(), // 'pending' | 'allocated' | 'picking' | 'packed' | 'shipped' | 'delivered'
    sourceWarehouseId: v.optional(v.id("warehouses")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_and_orderNumber", ["tenantId", "orderNumber"])
    .index("by_tenantId_and_status", ["tenantId", "status"])
    .index("by_tenantId_and_customerType", ["tenantId", "customerType"]),

  // Shipments (physical packages)
  nexusShipments: defineTable({
    tenantId: v.id("tenants"),
    orderId: v.id("nexusOutboundOrders"),
    shipmentNumber: v.string(),
    carrier: v.string(), // 'UPS' | 'FedEx' | 'USPS' | 'Freight' | 'LTL'
    serviceLevel: v.string(), // 'Ground' | '2Day' | 'Overnight' | 'Freight'
    trackingNumber: v.optional(v.string()),
    trackingUrl: v.optional(v.string()),
    status: v.string(), // 'label_created' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception'
    estimatedDelivery: v.optional(v.string()),
    actualDelivery: v.optional(v.string()),
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
    shippedAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_and_shipmentNumber", ["tenantId", "shipmentNumber"])
    .index("by_tenantId_and_status", ["tenantId", "status"])
    .index("by_tenantId_and_orderId", ["tenantId", "orderId"]),

  // Shipment Events (tracking history)
  nexusShipmentEvents: defineTable({
    tenantId: v.id("tenants"),
    shipmentId: v.id("nexusShipments"),
    event: v.string(),
    description: v.string(),
    location: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_shipmentId", ["shipmentId"]),

  // AI Communications Log
  nexusOutboundComms: defineTable({
    tenantId: v.id("tenants"),
    shipmentId: v.optional(v.id("nexusShipments")),
    orderId: v.optional(v.id("nexusOutboundOrders")),
    customerId: v.optional(v.string()),
    channel: v.string(), // 'email' | 'sms' | 'in_app'
    type: v.string(), // 'shipped' | 'delivered' | 'delayed' | 'weekly_briefing' | 'inquiry_response'
    recipient: v.string(),
    subject: v.optional(v.string()),
    body: v.string(),
    aiGenerated: v.boolean(),
    sentAt: v.number(),
    status: v.string(), // 'sent' | 'delivered' | 'failed'
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_and_type", ["tenantId", "type"]),

  // Shipping Forecasts (AI-generated)
  nexusShippingForecasts: defineTable({
    tenantId: v.id("tenants"),
    forecastDate: v.string(), // Date this forecast is FOR
    generatedAt: v.number(),
    predictions: v.array(
      v.object({
        segment: v.string(), // 'B2B', 'B2C', 'all'
        carrier: v.optional(v.string()),
        region: v.optional(v.string()),
        predictedVolume: v.number(),
        confidenceLevel: v.number(), // 0-100
        factors: v.array(v.string()), // Contributing factors
      })
    ),
    alerts: v.array(
      v.object({
        type: v.string(), // 'capacity_warning' | 'spike_detected' | 'carrier_constraint'
        severity: v.string(),
        message: v.string(),
      })
    ),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_and_forecastDate", ["tenantId", "forecastDate"]),

  // Outbound Discrepancies
  nexusOutboundDiscrepancies: defineTable({
    tenantId: v.id("tenants"),
    shipmentId: v.optional(v.id("nexusShipments")),
    orderId: v.id("nexusOutboundOrders"),
    type: v.string(), // 'short_ship' | 'wrong_item' | 'damaged' | 'lost' | 'address_issue' | 'customer_refused'
    severity: v.string(), // 'low' | 'medium' | 'high' | 'critical'
    description: v.string(),
    status: v.string(), // 'open' | 'investigating' | 'resolved'
    resolution: v.optional(v.string()),
    customerNotified: v.boolean(),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_and_status", ["tenantId", "status"])
    .index("by_tenantId_and_severity", ["tenantId", "severity"]),

  // ============================================
  // NexusProduction Module Tables
  // ============================================

  // Raw Materials Catalog (purchasable materials: fabric, fill, components)
  nexusRawMaterials: defineTable({
    tenantId: v.id("tenants"),
    sku: v.string(),                    // "RAW-MF-01" (memory foam)
    name: v.string(),                   // "Memory Foam - Standard Density"
    category: v.string(),               // "Fill" | "Fabric" | "Component" | "Packaging"
    uom: v.string(),                    // "LB" | "YD" | "EA"
    costPerUnit: v.number(),
    leadTimeDays: v.number(),           // How long vendor takes to deliver
    reorderPoint: v.number(),           // Alert when inventory falls below
    preferredVendorId: v.optional(v.id("nexusInboundVendors")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_and_sku", ["tenantId", "sku"])
    .index("by_tenantId_and_category", ["tenantId", "category"]),

  // Bill of Materials (recipe for each finished product)
  nexusBOM: defineTable({
    tenantId: v.id("tenants"),
    finishedSku: v.string(),            // "PLW-MF-Q" (Memory Foam Queen Pillow)
    finishedName: v.string(),           // "Memory Foam Queen Pillow"
    materials: v.array(
      v.object({
        materialSku: v.string(),        // Links to nexusRawMaterials
        materialName: v.string(),       // Denormalized for display
        qtyPerUnit: v.number(),         // 1.5 lbs foam per pillow
        uom: v.string(),
        scrapFactor: v.optional(v.number()), // 1.05 = 5% waste assumed
      })
    ),
    laborMinutesPerUnit: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_and_finishedSku", ["tenantId", "finishedSku"]),

  // Raw Material Inventory (what you have on hand)
  nexusRawInventory: defineTable({
    tenantId: v.id("tenants"),
    materialSku: v.string(),
    warehouseId: v.id("warehouses"),
    qtyOnHand: v.number(),
    qtyAllocated: v.number(),           // Reserved for open work orders
    qtyAvailable: v.number(),           // onHand - allocated (computed)
    lotNumber: v.optional(v.string()),
    vendorId: v.optional(v.id("nexusInboundVendors")),
    receivedDate: v.optional(v.string()),
    expirationDate: v.optional(v.string()), // For perishables
    updatedAt: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_and_materialSku", ["tenantId", "materialSku"])
    .index("by_tenantId_and_warehouseId", ["tenantId", "warehouseId"]),

  // Work Orders (production jobs)
  nexusWorkOrders: defineTable({
    tenantId: v.id("tenants"),
    woNumber: v.string(),               // "WO-2025-001234"
    finishedSku: v.string(),
    finishedName: v.string(),
    qtyPlanned: v.number(),
    qtyCompleted: v.number(),
    qtyRejected: v.number(),            // QC failures
    status: v.string(),                 // 'draft' | 'scheduled' | 'released' | 'in_progress' | 'completed' | 'cancelled'
    priority: v.string(),               // 'low' | 'normal' | 'high' | 'rush'
    scheduledStart: v.string(),
    scheduledEnd: v.string(),
    actualStart: v.optional(v.string()),
    actualEnd: v.optional(v.string()),
    warehouseId: v.id("warehouses"),
    lineAssignment: v.optional(v.string()), // "LINE-A"
    sourceOrderId: v.optional(v.id("nexusOutboundOrders")), // If made for specific order
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_and_woNumber", ["tenantId", "woNumber"])
    .index("by_tenantId_and_status", ["tenantId", "status"])
    .index("by_tenantId_and_scheduledStart", ["tenantId", "scheduledStart"]),

  // Finished Goods Inventory
  nexusFinishedInventory: defineTable({
    tenantId: v.id("tenants"),
    sku: v.string(),
    warehouseId: v.id("warehouses"),
    qtyOnHand: v.number(),
    qtyAllocated: v.number(),           // Reserved for outbound orders
    qtyAvailable: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_and_sku", ["tenantId", "sku"])
    .index("by_tenantId_and_warehouseId", ["tenantId", "warehouseId"]),

  // AI-Generated Material Purchase Suggestions
  nexusMaterialSuggestions: defineTable({
    tenantId: v.id("tenants"),
    materialSku: v.string(),
    materialName: v.string(),
    suggestedQty: v.number(),
    suggestedOrderDate: v.string(),     // When to place PO
    neededByDate: v.string(),           // When production needs it
    reason: v.string(),                 // AI explanation
    urgency: v.string(),                // 'low' | 'medium' | 'high' | 'critical'
    status: v.string(),                 // 'pending' | 'accepted' | 'dismissed' | 'ordered'
    linkedWorkOrders: v.array(v.string()), // WO numbers driving this need
    vendorId: v.optional(v.id("nexusInboundVendors")),
    estimatedCost: v.number(),
    generatedAt: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_and_status", ["tenantId", "status"])
    .index("by_tenantId_and_urgency", ["tenantId", "urgency"]),

  // ============================================
  // Cross-Module Intelligence (Command Center)
  // ============================================

  // Unified AI Suggestions - Cross-module recommendations
  nexusSuggestions: defineTable({
    tenantId: v.id("tenants"),
    // What type of action is being suggested
    type: v.string(),           // 'work_order' | 'purchase' | 'release_wo' | 'forecast_cascade'
    // Which module triggered this suggestion
    sourceModule: v.string(),   // 'outbound' | 'production' | 'inbound' | 'plan'
    // Which module would execute the action
    targetModule: v.string(),   // 'production' | 'inbound' | 'outbound'
    // Urgency level
    priority: v.string(),       // 'low' | 'medium' | 'high' | 'critical'
    // Human-readable summary
    title: v.string(),
    // AI-generated explanation of why this is recommended
    description: v.string(),
    // Data payload needed to execute the suggested action
    payload: v.any(),
    // Links to related records across modules
    relatedIds: v.object({
      orderId: v.optional(v.id("nexusOutboundOrders")),
      workOrderId: v.optional(v.id("nexusWorkOrders")),
      poId: v.optional(v.id("nexusInboundPOs")),
      materialSku: v.optional(v.string()),
      planId: v.optional(v.id("nexusPlans")),
    }),
    // Suggestion lifecycle
    status: v.string(),         // 'pending' | 'accepted' | 'dismissed' | 'expired'
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),  // Auto-expire stale suggestions
    // Audit trail
    acceptedAt: v.optional(v.number()),
    acceptedBy: v.optional(v.string()),
    dismissedAt: v.optional(v.number()),
    dismissedBy: v.optional(v.string()),
    dismissReason: v.optional(v.string()),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_and_status", ["tenantId", "status"])
    .index("by_tenantId_and_priority", ["tenantId", "priority"])
    .index("by_tenantId_and_type", ["tenantId", "type"])
    .index("by_tenantId_and_sourceModule", ["tenantId", "sourceModule"]),
});

