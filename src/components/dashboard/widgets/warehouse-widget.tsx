"use client";

import { Warehouse } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SlidingNumber } from "@/components/ui/sliding-number";
import { MotionEffect } from "@/components/ui/motion-effect";

interface WarehouseStats {
  totalWarehouses: number;
  activeWarehouses: number;
  totalCapacity: number;
  avgUtilization: number;
}

interface WarehouseWidgetProps {
  stats: WarehouseStats | undefined;
}

export function WarehouseWidget({ stats }: WarehouseWidgetProps) {
  if (!stats) {
    return (
      <Card className="h-full overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Warehouses
          </CardTitle>
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Warehouse className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-9 w-20 mb-3" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <MotionEffect fade slide={{ direction: "up", offset: 20 }} delay={0.2} className="h-full">
      <Card className="h-full overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Warehouses
          </CardTitle>
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Warehouse className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground tracking-tight flex items-baseline">
            <SlidingNumber number={stats.activeWarehouses} />
            <span className="text-base font-normal text-muted-foreground ml-1">
              / {stats.totalWarehouses}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-3">
            <p className="text-xs text-muted-foreground">
              {stats.totalCapacity.toLocaleString()} sq ft total
            </p>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{stats.avgUtilization}%</span> utilized
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </MotionEffect>
  );
}
