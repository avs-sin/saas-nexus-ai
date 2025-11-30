import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireTenantId, getCurrentTenantId, getCurrentClerkUserId } from "./helpers/tenantScope";

/**
 * Get recent activity for the current tenant
 */
export const getRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const tenantId = await getCurrentTenantId(ctx);
    
    // Return empty array if no tenant yet (still syncing)
    if (!tenantId) {
      return [];
    }
    
    const limit = args.limit ?? 10;
    
    const activities = await ctx.db
      .query("activityLog")
      .withIndex("by_tenantId_and_createdAt", (q) => q.eq("tenantId", tenantId))
      .order("desc")
      .take(limit);
    
    // Enrich with user info
    const enrichedActivities = await Promise.all(
      activities.map(async (activity) => {
        let userName = "System";
        if (activity.userId) {
          const user = await ctx.db.get(activity.userId);
          userName = user?.name ?? "Unknown";
        }
        return {
          ...activity,
          userName,
        };
      })
    );
    
    return enrichedActivities;
  },
});

/**
 * Log an activity (internal use)
 */
export const log = mutation({
  args: {
    action: v.string(),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    description: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const tenantId = await requireTenantId(ctx);
    const clerkUserId = await getCurrentClerkUserId(ctx);
    
    // Get user ID if logged in
    let userId = undefined;
    if (clerkUserId) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_tenantId_and_clerkUserId", (q) => 
          q.eq("tenantId", tenantId).eq("clerkUserId", clerkUserId)
        )
        .first();
      userId = user?._id;
    }
    
    await ctx.db.insert("activityLog", {
      tenantId,
      userId,
      action: args.action,
      entityType: args.entityType,
      entityId: args.entityId,
      description: args.description,
      metadata: args.metadata,
      createdAt: Date.now(),
    });
  },
});

