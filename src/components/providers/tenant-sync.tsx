"use client";

import { useEffect, useState } from "react";
import { useOrganization, useUser, useAuth } from "@clerk/nextjs";
import { useMutation, useConvexAuth } from "convex/react";
import { api } from "../../../convex/_generated/api";

/**
 * Component that syncs Clerk organization and user data with Convex.
 * Should be rendered within the tenant layout.
 * 
 * Note: Requires Clerk JWT template "convex" to be configured.
 * See README for setup instructions.
 */
export function TenantSync() {
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const { user, isLoaded: userLoaded } = useUser();
  const { isAuthenticated: isConvexAuthenticated, isLoading: isConvexLoading } = useConvexAuth();
  const [hasSynced, setHasSynced] = useState(false);

  const syncTenant = useMutation(api.tenants.syncTenant);
  const syncUser = useMutation(api.users.syncUser);

  useEffect(() => {
    // Wait for all auth states to be loaded
    if (!orgLoaded || !userLoaded || isConvexLoading) return;
    if (!organization || !user) return;
    
    // Only sync if Convex is authenticated and we haven't synced yet
    if (!isConvexAuthenticated) {
      // Convex auth not ready - JWT template may not be configured
      // This is expected during initial setup
      return;
    }
    
    if (hasSynced) return;

    // Sync tenant data
    syncTenant({
      orgId: organization.id,
      name: organization.name,
      slug: organization.slug || organization.id,
    })
      .then(() => setHasSynced(true))
      .catch((error) => {
        // Only log non-auth errors
        if (!error.message?.includes("Not authenticated")) {
          console.error("Failed to sync tenant:", error);
        }
      });

    // Sync user data
    syncUser({
      email: user.primaryEmailAddress?.emailAddress || "",
      name: user.fullName || user.firstName || "User",
      imageUrl: user.imageUrl,
    }).catch((error) => {
      // Only log non-auth errors
      if (!error.message?.includes("Not authenticated")) {
        console.error("Failed to sync user:", error);
      }
    });
  }, [
    organization,
    user,
    orgLoaded,
    userLoaded,
    isConvexAuthenticated,
    isConvexLoading,
    hasSynced,
    syncTenant,
    syncUser,
  ]);

  return null;
}
