"use client";

import { Warehouse } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Warehouses
          </CardTitle>
          <Warehouse className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Warehouses
        </CardTitle>
        <Warehouse className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">
          {stats.activeWarehouses}
          <span className="text-sm font-normal text-muted-foreground ml-1">
            / {stats.totalWarehouses}
          </span>
        </div>
        <div className="flex items-center gap-4 mt-2">
          <p className="text-xs text-muted-foreground">
            {stats.totalCapacity.toLocaleString()} sq ft total
          </p>
          <p className="text-xs text-primary">
            {stats.avgUtilization}% utilized
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

