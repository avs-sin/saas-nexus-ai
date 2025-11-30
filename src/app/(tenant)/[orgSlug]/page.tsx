import { auth } from "@clerk/nextjs/server";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export default async function DashboardPage() {
  const { orgSlug } = await auth();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back! Here&apos;s an overview of your operations.
        </p>
      </div>

      {/* Dashboard Widgets */}
      <DashboardContent />
    </div>
  );
}

