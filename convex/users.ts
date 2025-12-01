import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { userRoleValidator } from "./schema";
import { requireAuth, requireTenantId, getCurrentTenantId, getCurrentClerkUserId } from "./helpers/tenantScope";

/**
 * Get the current user's profile for the current tenant
 */
export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const clerkUserId = await getCurrentClerkUserId(ctx);
    if (!clerkUserId) return null;
    
    const tenantId = await getCurrentTenantId(ctx);
    if (!tenantId) return null;
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_tenantId_and_clerkUserId", (q) => 
        q.eq("tenantId", tenantId).eq("clerkUserId", clerkUserId)
      )
      .first();
    
    return user;
  },
});

/**
 * List all users in the current tenant
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const tenantId = await getCurrentTenantId(ctx);
    if (!tenantId) return null;
    
    const users = await ctx.db
      .query("users")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();
    
    return users;
  },
});

/**
 * Sync user data from Clerk (called after sign-in)
 */
export const syncUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    tenantId: v.optional(v.id("tenants")), // Optional: can be passed from syncTenant result
  },
  handler: async (ctx, args) => {
    const { clerkUserId } = await requireAuth(ctx);
    
    // Use provided tenantId, or try to get it from context
    let tenantId = args.tenantId;
    if (!tenantId) {
      tenantId = await requireTenantId(ctx);
    }
    
    // Validate that the tenant exists
    const tenant = await ctx.db.get(tenantId);
    if (!tenant) {
      throw new Error("Tenant not found. User must be part of an organization.");
    }
    
    const now = Date.now();
    
    // Check if user already exists in this tenant
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_tenantId_and_clerkUserId", (q) => 
        q.eq("tenantId", tenantId).eq("clerkUserId", clerkUserId)
      )
      .first();
    
    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        name: args.name,
        imageUrl: args.imageUrl,
        lastLoginAt: now,
        updatedAt: now,
      });
      return existingUser._id;
    }
    
    // Check if this is the first user in the tenant (make them admin)
    const tenantUsers = await ctx.db
      .query("users")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .first();
    
    const role = tenantUsers ? "viewer" : "admin";
    
    // Create new user
    const userId = await ctx.db.insert("users", {
      clerkUserId,
      tenantId,
      role,
      email: args.email,
      name: args.name,
      imageUrl: args.imageUrl,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    });
    
    return userId;
  },
});

/**
 * Update a user's role (admin only)
 */
export const updateRole = mutation({
  args: {
    userId: v.id("users"),
    role: userRoleValidator,
  },
  handler: async (ctx, args) => {
    const { clerkUserId } = await requireAuth(ctx);
    const tenantId = await requireTenantId(ctx);
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_tenantId_and_clerkUserId", (q) => 
        q.eq("tenantId", tenantId).eq("clerkUserId", clerkUserId)
      )
      .first();
    
    if (!currentUser || currentUser.role !== "admin") {
      throw new Error("Only admins can update user roles");
    }
    
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser || targetUser.tenantId !== tenantId) {
      throw new Error("User not found in this tenant");
    }
    
    await ctx.db.patch(args.userId, {
      role: args.role,
      updatedAt: Date.now(),
    });
    
    return { success: true };
  },
});

/**
 * Deactivate a user (admin only)
 */
export const deactivate = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const tenantId = await requireTenantId(ctx);
    const { clerkUserId } = await requireAuth(ctx);
    
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_tenantId_and_clerkUserId", (q) => 
        q.eq("tenantId", tenantId).eq("clerkUserId", clerkUserId)
      )
      .first();
    
    if (!currentUser || currentUser.role !== "admin") {
      throw new Error("Only admins can deactivate users");
    }
    
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser || targetUser.tenantId !== tenantId) {
      throw new Error("User not found in this tenant");
    }
    
    // Can't deactivate yourself
    if (targetUser._id === currentUser._id) {
      throw new Error("Cannot deactivate yourself");
    }
    
    await ctx.db.patch(args.userId, {
      isActive: false,
      updatedAt: Date.now(),
    });
    
    return { success: true };
  },
});

