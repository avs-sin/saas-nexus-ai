import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth, requireTenantId, getOrCreateTenant } from "./helpers/tenantScope";

/**
 * Get the current tenant's information
 */
export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const tenantId = await requireTenantId(ctx);
    return await ctx.db.get(tenantId);
  },
});

/**
 * Get tenant by slug (for URL routing validation)
 */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    
    return tenant;
  },
});

/**
 * Create or sync a tenant when a user signs in with an organization.
 * Called from the client after Clerk auth.
 */
export const syncTenant = mutation({
  args: {
    orgId: v.string(),
    name: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    
    const tenantId = await getOrCreateTenant(ctx, args.orgId, args.name, args.slug);
    
    // Update tenant name/slug if changed
    const tenant = await ctx.db.get(tenantId);
    if (tenant && (tenant.name !== args.name || tenant.slug !== args.slug)) {
      await ctx.db.patch(tenantId, {
        name: args.name,
        slug: args.slug,
        updatedAt: Date.now(),
      });
    }
    
    return tenantId;
  },
});

/**
 * Update tenant settings
 */
export const updateSettings = mutation({
  args: {
    settings: v.object({
      timezone: v.optional(v.string()),
      currency: v.optional(v.string()),
      dateFormat: v.optional(v.string()),
      lowStockThreshold: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const tenantId = await requireTenantId(ctx);
    const tenant = await ctx.db.get(tenantId);
    
    if (!tenant) {
      throw new Error("Tenant not found");
    }
    
    const currentSettings = tenant.settings ?? {};
    
    await ctx.db.patch(tenantId, {
      settings: {
        ...currentSettings,
        ...args.settings,
      },
      updatedAt: Date.now(),
    });
    
    return { success: true };
  },
});

