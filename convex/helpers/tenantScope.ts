import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Get the current tenant ID from the authenticated user's organization.
 * This is the primary helper for tenant isolation - use it in ALL queries and mutations.
 * 
 * @param ctx - Convex query or mutation context
 * @returns The tenant ID or null if not authenticated/no org
 * @throws Error if user is not authenticated
 */
export async function getCurrentTenantId(
  ctx: QueryCtx | MutationCtx
): Promise<Id<"tenants"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  
  if (!identity) {
    return null;
  }

  // The orgId is passed from Clerk via the JWT token
  // It's available in the token's claims as "org_id"
  const orgId = identity.orgId as string | undefined;
  
  if (!orgId) {
    return null;
  }

  // Look up the tenant by Clerk org ID
  const tenant = await ctx.db
    .query("tenants")
    .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
    .first();

  return tenant?._id ?? null;
}

/**
 * Require a tenant ID - throws if not found.
 * Use this when the operation absolutely requires a tenant context.
 */
export async function requireTenantId(
  ctx: QueryCtx | MutationCtx
): Promise<Id<"tenants">> {
  const tenantId = await getCurrentTenantId(ctx);
  
  if (!tenantId) {
    throw new Error("Tenant not found. User must be part of an organization.");
  }
  
  return tenantId;
}

/**
 * Get the current user's Clerk ID from the auth context.
 */
export async function getCurrentClerkUserId(
  ctx: QueryCtx | MutationCtx
): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? null;
}

/**
 * Require authentication - throws if not authenticated.
 */
export async function requireAuth(
  ctx: QueryCtx | MutationCtx
): Promise<{ clerkUserId: string; orgId: string | undefined }> {
  const identity = await ctx.auth.getUserIdentity();
  
  if (!identity) {
    throw new Error("Not authenticated");
  }
  
  return {
    clerkUserId: identity.subject,
    orgId: identity.orgId as string | undefined,
  };
}

/**
 * Get or create a tenant for the current organization.
 * Used during onboarding when a new organization is created.
 */
export async function getOrCreateTenant(
  ctx: MutationCtx,
  orgId: string,
  name: string,
  slug: string
): Promise<Id<"tenants">> {
  // Check if tenant already exists
  const existingTenant = await ctx.db
    .query("tenants")
    .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
    .first();

  if (existingTenant) {
    return existingTenant._id;
  }

  // Create new tenant
  const now = Date.now();
  const tenantId = await ctx.db.insert("tenants", {
    orgId,
    name,
    slug,
    settings: {
      timezone: "America/New_York",
      currency: "USD",
      dateFormat: "MM/DD/YYYY",
      lowStockThreshold: 10,
    },
    createdAt: now,
    updatedAt: now,
  });

  return tenantId;
}

