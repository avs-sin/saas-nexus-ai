"use client";

import { Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function InventoryWidget() {
  // Placeholder data - will be connected to real data in Phase 2
  const data = {
    totalItems: 12847,
    lowStock: 23,
    outOfStock: 5,
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Inventory Items
        </CardTitle>
        <Package className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">
          {data.totalItems.toLocaleString()}
        </div>
        <div className="flex items-center gap-4 mt-2">
          <p className="text-xs text-yellow-500">
            {data.lowStock} low stock
          </p>
          <p className="text-xs text-destructive">
            {data.outOfStock} out of stock
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

