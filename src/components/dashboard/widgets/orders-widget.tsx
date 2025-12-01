"use client";

import { ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SlidingNumber } from "@/components/ui/sliding-number";
import { MotionEffect } from "@/components/ui/motion-effect";

export function OrdersWidget() {
  // Placeholder data - will be connected to real data in Phase 2
  const data = {
    activeOrders: 47,
    pendingApproval: 8,
    completedToday: 12,
  };

  return (
    <MotionEffect fade slide={{ direction: "up", offset: 20 }} delay={0.1} className="h-full">
      <Card className="h-full overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Production Orders
          </CardTitle>
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <ClipboardList className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground tracking-tight">
            <SlidingNumber number={data.activeOrders} />
          </div>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{data.pendingApproval}</span> pending
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-emerald-600 dark:text-emerald-400">{data.completedToday}</span> completed today
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </MotionEffect>
  );
}
