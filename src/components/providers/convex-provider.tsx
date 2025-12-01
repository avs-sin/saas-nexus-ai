"use client";

import { ReactNode, useCallback } from "react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { useAuth } from "@clerk/nextjs";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  // Tell Clerk to use the "convex" JWT template
  const useAuthWithTemplate = () => {
    const auth = useAuth();
    return {
      ...auth,
      getToken: useCallback(
        (options?: { template?: string }) =>
          auth.getToken({ template: "convex", ...options }),
        [auth]
      ),
    };
  };

  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuthWithTemplate}>
      {children}
    </ConvexProviderWithClerk>
  );
}

