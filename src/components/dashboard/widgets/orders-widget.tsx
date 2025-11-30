"use client";

import { ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function OrdersWidget() {
  // Placeholder data - will be connected to real data in Phase 2
  const data = {
    activeOrders: 47,
    pendingApproval: 8,
    completedToday: 12,
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Production Orders
        </CardTitle>
        <ClipboardList className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">
          {data.activeOrders}
        </div>
        <div className="flex items-center gap-4 mt-2">
          <p className="text-xs text-primary">
            {data.pendingApproval} pending
          </p>
          <p className="text-xs text-green-500">
            {data.completedToday} completed today
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

