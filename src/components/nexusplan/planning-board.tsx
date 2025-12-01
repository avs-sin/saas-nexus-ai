"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Filter, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function PlanningBoard() {
  const data = useQuery(api.nexusplan.getPlanningData);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");

  if (!data) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  const { plans, customers, pos } = data;

  const filteredPlans =
    selectedCustomer === "all"
      ? plans
      : plans.filter((p) => p.customerId === selectedCustomer);

  // Helper to find matching PO Qty for a plan
  const getPoQtyForPlan = (sku: string, period: string) => {
    const matches = pos.filter(
      (po) => po.sku === sku && po.currentDeliveryDate.startsWith(period)
    );
    return matches.reduce((sum, po) => sum + po.currentQty, 0);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Planning Board
        </h2>
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
          <select
            className="h-9 sm:h-10 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
          >
            <option value="all">All Customers</option>
            {customers.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Forecast vs. Actuals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm text-left">
              <thead className="[&_tr]:border-b">
                <tr className="border-b border-border transition-colors">
                  <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                    Period
                  </th>
                  <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                    Customer
                  </th>
                  <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                    SKU
                  </th>
                  <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">
                    Plan Qty
                  </th>
                  <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">
                    PO Qty
                  </th>
                  <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">
                    Variance
                  </th>
                  <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-center">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {filteredPlans.map((plan) => {
                  const customer = customers.find((c) => c._id === plan.customerId);
                  const poQty = getPoQtyForPlan(plan.sku, plan.periodStart);
                  const variance = poQty - plan.planQty;
                  const variancePct = (variance / plan.planQty) * 100;

                  let status: "default" | "secondary" | "destructive" = "default";
                  let statusText = "Aligned";
                  if (Math.abs(variancePct) > 20) {
                    status = "destructive";
                    statusText = "Critical";
                  } else if (Math.abs(variancePct) > 10) {
                    status = "secondary";
                    statusText = "Review";
                  }

                  return (
                    <tr
                      key={plan._id}
                      className="border-b border-border transition-colors hover:bg-muted/50"
                    >
                      <td className="p-4 align-middle text-foreground">{plan.periodStart}</td>
                      <td className="p-4 align-middle font-medium text-foreground">
                        {customer?.name || "Unknown"}
                      </td>
                      <td className="p-4 align-middle text-foreground">{plan.sku}</td>
                      <td className="p-4 align-middle text-right text-foreground">
                        {plan.planQty.toLocaleString()}
                      </td>
                      <td className="p-4 align-middle text-right text-foreground">
                        {poQty.toLocaleString()}
                      </td>
                      <td
                        className={`p-4 align-middle text-right font-medium ${
                          variance > 0
                            ? "text-emerald-600"
                            : variance < 0
                            ? "text-destructive"
                            : "text-foreground"
                        }`}
                      >
                        {variance > 0 ? "+" : ""}
                        {variance.toLocaleString()} ({variancePct.toFixed(1)}%)
                      </td>
                      <td className="p-4 align-middle text-center">
                        <Badge variant={status}>{statusText}</Badge>
                      </td>
                    </tr>
                  );
                })}
                {filteredPlans.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-8 text-center text-muted-foreground"
                    >
                      No plans found. Run seed to populate data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
