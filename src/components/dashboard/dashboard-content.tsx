"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { InventoryWidget } from "./widgets/inventory-widget";
import { OrdersWidget } from "./widgets/orders-widget";
import { WarehouseWidget } from "./widgets/warehouse-widget";
import { ActivityWidget } from "./widgets/activity-widget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MotionEffect } from "@/components/ui/motion-effect";
import { SlidingNumber } from "@/components/ui/sliding-number";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function DashboardContent() {
  const warehouseStats = useQuery(api.warehouses.getStats);
  const recentActivity = useQuery(api.activity.getRecent, { limit: 5 });

  return (
    <div className="space-y-6">
      {/* Top row - Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <InventoryWidget />
        <OrdersWidget />
        <WarehouseWidget stats={warehouseStats} />
        <ActivityWidget activities={recentActivity} />
      </div>

      {/* Bottom row - larger widgets */}
      <div className="grid gap-4 md:grid-cols-2">
        <WarehouseUtilizationChart stats={warehouseStats} />
        <RecentOrdersTable />
      </div>
    </div>
  );
}

// Warehouse Utilization Chart with polished styling
function WarehouseUtilizationChart({ stats }: { stats: { avgUtilization: number; totalCapacity: number; activeWarehouses: number } | undefined }) {
  const circumference = 2 * Math.PI * 60; // ~377
  const utilization = stats?.avgUtilization ?? 0;
  const strokeDashoffset = circumference - (utilization / 100) * circumference;

  return (
    <MotionEffect fade slide={{ direction: "up", offset: 20 }} delay={0.4} className="h-full">
      <Card className="h-full overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Warehouse Utilization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-52 flex items-center justify-center">
            {stats ? (
              <div className="text-center">
                <div className="relative w-36 h-36 mx-auto mb-4">
                  <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 144 144">
                    {/* Background ring */}
                    <circle
                      cx="72"
                      cy="72"
                      r="60"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      className="text-muted/20"
                    />
                    {/* Progress ring - only render if > 0 */}
                    {utilization > 0 && (
                      <circle
                        cx="72"
                        cy="72"
                        r="60"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        className="text-primary transition-all duration-1000 ease-out"
                      />
                    )}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-foreground tracking-tight">
                      <SlidingNumber number={utilization} />%
                    </span>
                    <span className="text-xs text-muted-foreground">utilized</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Average across <span className="font-medium text-foreground">{stats.activeWarehouses}</span> active warehouses
                </p>
              </div>
            ) : (
              <div className="text-muted-foreground">
                <div className="animate-pulse flex flex-col items-center gap-3">
                  <div className="w-36 h-36 bg-muted rounded-full" />
                  <div className="h-4 w-32 bg-muted rounded" />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </MotionEffect>
  );
}

// Recent Orders Table with polished styling
function RecentOrdersTable() {
  const orders = [
    { id: 1, name: "Order #1001", time: "Just now", status: "Waiting", amount: "$12,450", items: 24 },
    { id: 2, name: "Order #1002", time: "2 hours ago", status: "In Progress", amount: "$8,320", items: 12 },
    { id: 3, name: "Order #1003", time: "3 hours ago", status: "Waiting", amount: "$4,150", items: 8 },
    { id: 4, name: "Order #1004", time: "4 hours ago", status: "In Progress", amount: "$15,780", items: 45 },
  ];

  const getStatusStyles = (status: string) => {
    switch (status.toLowerCase()) {
      case 'in progress':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'waiting':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <MotionEffect fade slide={{ direction: "up", offset: 20 }} delay={0.5} className="h-full">
      <Card className="h-full overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Latest Orders</CardTitle>
          <Badge variant="outline" className="font-normal text-muted-foreground">
            Today
          </Badge>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/30 uppercase font-medium">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Total Cost</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((order, index) => (
                  <tr 
                    key={order.id} 
                    className="group hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-primary/5 flex items-center justify-center text-xs font-semibold text-primary border border-primary/10">
                          #{order.id}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{order.name}</div>
                          <div className="text-xs text-muted-foreground">{order.time}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                      {order.amount}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {order.items} units
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs font-medium border shadow-sm",
                          getStatusStyles(order.status)
                        )}
                      >
                        {order.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t border-border bg-muted/5">
            <div className="flex items-center justify-center">
              <button className="text-sm text-primary font-medium hover:underline underline-offset-4 transition-all">
                View all orders
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </MotionEffect>
  );
}
