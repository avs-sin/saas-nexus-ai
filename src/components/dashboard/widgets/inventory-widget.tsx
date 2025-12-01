"use client";

import { Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SlidingNumber } from "@/components/ui/sliding-number";
import { MotionEffect } from "@/components/ui/motion-effect";

export function InventoryWidget() {
  // Placeholder data - will be connected to real data in Phase 2
  const data = {
    totalItems: 12847,
    lowStock: 23,
    outOfStock: 5,
  };

  return (
    <MotionEffect fade slide={{ direction: "up", offset: 20 }} delay={0} className="h-full">
      <Card className="h-full overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Inventory Items
          </CardTitle>
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground tracking-tight">
            <SlidingNumber number={data.totalItems} />
          </div>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-amber-600 dark:text-amber-400">{data.lowStock}</span> low stock
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-destructive" />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-destructive">{data.outOfStock}</span> out of stock
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </MotionEffect>
  );
}
