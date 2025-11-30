"use client";

import { useEffect } from "react";
import { useOrganization, useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

/**
 * Component that syncs Clerk organization and user data with Convex.
 * Should be rendered within the tenant layout.
 */
export function TenantSync() {
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const { user, isLoaded: userLoaded } = useUser();

  const syncTenant = useMutation(api.tenants.syncTenant);
  const syncUser = useMutation(api.users.syncUser);

  useEffect(() => {
    if (!orgLoaded || !userLoaded) return;
    if (!organization || !user) return;

    // Sync tenant data
    syncTenant({
      orgId: organization.id,
      name: organization.name,
      slug: organization.slug || organization.id,
    }).catch(console.error);

    // Sync user data
    syncUser({
      email: user.primaryEmailAddress?.emailAddress || "",
      name: user.fullName || user.firstName || "User",
      imageUrl: user.imageUrl,
    }).catch(console.error);
  }, [organization, user, orgLoaded, userLoaded, syncTenant, syncUser]);

  return null;
}

