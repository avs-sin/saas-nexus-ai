import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireTenantId, getCurrentTenantId } from "./helpers/tenantScope";

const locationValidator = v.object({
  address: v.string(),
  city: v.string(),
  state: v.string(),
  zipCode: v.string(),
  country: v.string(),
});

/**
 * List all warehouses for the current tenant
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const tenantId = await requireTenantId(ctx);
    
    const warehouses = await ctx.db
      .query("warehouses")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();
    
    return warehouses;
  },
});

/**
 * Get a single warehouse by ID
 */
export const get = query({
  args: { id: v.id("warehouses") },
  handler: async (ctx, args) => {
    const tenantId = await requireTenantId(ctx);
    const warehouse = await ctx.db.get(args.id);
    
    // Ensure warehouse belongs to this tenant
    if (!warehouse || warehouse.tenantId !== tenantId) {
      return null;
    }
    
    return warehouse;
  },
});

/**
 * Get warehouse stats for dashboard
 */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const tenantId = await getCurrentTenantId(ctx);
    
    // Return default stats if no tenant yet (still syncing)
    if (!tenantId) {
      return {
        totalWarehouses: 0,
        activeWarehouses: 0,
        totalCapacity: 0,
        avgUtilization: 0,
      };
    }
    
    const warehouses = await ctx.db
      .query("warehouses")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();
    
    const activeWarehouses = warehouses.filter(w => w.isActive);
    const totalCapacity = activeWarehouses.reduce((sum, w) => sum + w.capacity, 0);
    const avgUtilization = activeWarehouses.length > 0
      ? activeWarehouses.reduce((sum, w) => sum + w.utilizationPercent, 0) / activeWarehouses.length
      : 0;
    
    return {
      totalWarehouses: warehouses.length,
      activeWarehouses: activeWarehouses.length,
      totalCapacity,
      avgUtilization: Math.round(avgUtilization),
    };
  },
});

/**
 * Create a new warehouse
 */
export const create = mutation({
  args: {
    name: v.string(),
    code: v.string(),
    location: locationValidator,
    capacity: v.number(),
    contactName: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenantId = await requireTenantId(ctx);
    
    // Check for duplicate code within tenant
    const existing = await ctx.db
      .query("warehouses")
      .withIndex("by_tenantId_and_code", (q) => 
        q.eq("tenantId", tenantId).eq("code", args.code)
      )
      .first();
    
    if (existing) {
      throw new Error(`Warehouse with code ${args.code} already exists`);
    }
    
    const now = Date.now();
    
    const warehouseId = await ctx.db.insert("warehouses", {
      tenantId,
      name: args.name,
      code: args.code,
      location: args.location,
      capacity: args.capacity,
      utilizationPercent: 0,
      isActive: true,
      contactName: args.contactName,
      contactPhone: args.contactPhone,
      contactEmail: args.contactEmail,
      createdAt: now,
      updatedAt: now,
    });
    
    return warehouseId;
  },
});

/**
 * Update a warehouse
 */
export const update = mutation({
  args: {
    id: v.id("warehouses"),
    name: v.optional(v.string()),
    location: v.optional(locationValidator),
    capacity: v.optional(v.number()),
    utilizationPercent: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    contactName: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenantId = await requireTenantId(ctx);
    const warehouse = await ctx.db.get(args.id);
    
    if (!warehouse || warehouse.tenantId !== tenantId) {
      throw new Error("Warehouse not found");
    }
    
    const { id, ...updates } = args;
    
    // Filter out undefined values
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }
    
    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });
    
    return { success: true };
  },
});

/**
 * Delete a warehouse
 */
export const remove = mutation({
  args: { id: v.id("warehouses") },
  handler: async (ctx, args) => {
    const tenantId = await requireTenantId(ctx);
    const warehouse = await ctx.db.get(args.id);
    
    if (!warehouse || warehouse.tenantId !== tenantId) {
      throw new Error("Warehouse not found");
    }
    
    await ctx.db.delete(args.id);
    
    return { success: true };
  },
});

