"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { InventoryWidget } from "./widgets/inventory-widget";
import { OrdersWidget } from "./widgets/orders-widget";
import { WarehouseWidget } from "./widgets/warehouse-widget";
import { ActivityWidget } from "./widgets/activity-widget";

export function DashboardContent() {
  const warehouseStats = useQuery(api.warehouses.getStats);
  const recentActivity = useQuery(api.activity.getRecent, { limit: 5 });

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {/* Top row - Stats cards */}
      <InventoryWidget />
      <OrdersWidget />
      <WarehouseWidget stats={warehouseStats} />
      
      {/* Activity Widget - spans 1 column on mobile, 1 on lg */}
      <div className="md:col-span-2 lg:col-span-1">
        <ActivityWidget activities={recentActivity} />
      </div>

      {/* Bottom row - larger widgets */}
      <div className="md:col-span-2 lg:col-span-2">
        <WarehouseUtilizationChart stats={warehouseStats} />
      </div>
      <div className="md:col-span-2 lg:col-span-2">
        <RecentOrdersTable />
      </div>
    </div>
  );
}

// Warehouse Utilization Chart placeholder
function WarehouseUtilizationChart({ stats }: { stats: { avgUtilization: number; totalCapacity: number; activeWarehouses: number } | undefined }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="font-semibold text-foreground mb-4">Warehouse Utilization</h3>
      <div className="h-48 flex items-center justify-center">
        {stats ? (
          <div className="text-center">
            <div className="relative w-32 h-32 mx-auto mb-4">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  className="text-muted"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${(stats.avgUtilization / 100) * 351.86} 351.86`}
                  className="text-primary"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-foreground">
                  {stats.avgUtilization}%
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Average across {stats.activeWarehouses} active warehouses
            </p>
          </div>
        ) : (
          <div className="text-muted-foreground">
            <div className="animate-pulse flex flex-col items-center gap-2">
              <div className="w-32 h-32 bg-muted rounded-full" />
              <div className="h-4 w-24 bg-muted rounded" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Recent Orders Table placeholder
function RecentOrdersTable() {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="font-semibold text-foreground mb-4">Recent Orders</h3>
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between py-2 border-b border-border last:border-0"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                #{i}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Order PO-{1000 + i}
                </p>
                <p className="text-xs text-muted-foreground">
                  {i === 1 ? "Just now" : `${i} hours ago`}
                </p>
              </div>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
              {i % 2 === 0 ? "Processing" : "Pending"}
            </span>
          </div>
        ))}
      </div>
      <p className="text-center text-sm text-muted-foreground mt-4">
        Order management coming in Phase 2
      </p>
    </div>
  );
}

