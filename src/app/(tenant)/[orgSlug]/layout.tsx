import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { TenantShell } from "@/components/layout/tenant-shell";
import { ConvexClientProvider } from "@/components/providers/convex-provider";
import { TenantSync } from "@/components/providers/tenant-sync";

interface TenantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}

export default async function TenantLayout({
  children,
  params,
}: TenantLayoutProps) {
  const { userId, orgSlug: activeOrgSlug } = await auth();
  const { orgSlug } = await params;

  // Redirect to sign-in if not authenticated
  if (!userId) {
    redirect("/sign-in");
  }

  // If user has no active org or org doesn't match URL, redirect
  if (!activeOrgSlug) {
    redirect("/");
  }

  // Verify the URL org matches the active org
  if (activeOrgSlug !== orgSlug) {
    redirect(`/${activeOrgSlug}`);
  }

  return (
    <ConvexClientProvider>
      <TenantSync />
      <TenantShell orgSlug={orgSlug}>{children}</TenantShell>
    </ConvexClientProvider>
  );
}










