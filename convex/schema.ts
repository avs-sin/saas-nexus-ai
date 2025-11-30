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
});

