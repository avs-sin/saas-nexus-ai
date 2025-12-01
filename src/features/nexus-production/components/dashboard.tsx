"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Factory,
  Package,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  Loader2,
  Database,
  RefreshCw,
  Clock,
  Boxes,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getWorkOrderStatusColor,
  getPriorityColor,
  getUrgencyColor,
  formatDate,
  type ProductionDashboardData,
  type ProductionBriefing,
} from "../types";

export function ProductionDashboard() {
  const tenantExists = useQuery(api.tenants.exists);
  const data = useQuery(
    api.nexusProduction.getDashboardData,
    tenantExists ? {} : "skip"
  ) as ProductionDashboardData | null | undefined;
  const hasData = useQuery(api.nexusProduction.hasData, tenantExists ? {} : "skip");
  const seedData = useMutation(api.nexusProduction.seedProductionData);
  const generateBriefing = useAction(api.nexusProductionActions.generateProductionBriefingAction);

  const [briefing, setBriefing] = useState<ProductionBriefing | null>(null);
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  // Generate AI briefing when data loads
  useEffect(() => {
    if (data && data.workOrders.length > 0 && !briefing) {
      setLoadingBriefing(true);
      generateBriefing({
        workOrders: data.workOrders,
        rawInventory: data.rawInventory,
        rawMaterials: data.rawMaterials,
        suggestions: data.suggestions,
        kpis: data.kpis,
      })
        .then((res) => setBriefing(res as ProductionBriefing))
        .catch(console.error)
        .finally(() => setLoadingBriefing(false));
    }
  }, [data, briefing, generateBriefing]);

  const handleSeedData = async () => {
    setSeeding(true);
    setSeedMessage(null);
    try {
      const result = await seedData();
      setSeedMessage(result.message);
    } catch (error) {
      setSeedMessage("Failed to seed data. Please try again.");
      console.error(error);
    } finally {
      setSeeding(false);
    }
  };

  // Loading state
  if (tenantExists === undefined || (tenantExists && data === undefined)) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">Loading NexusProduction data...</p>
      </div>
    );
  }

  // Empty state
  if (!hasData || !data || data.workOrders.length === 0) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Production Dashboard
          </h2>
          <p className="text-muted-foreground">
            AI-powered manufacturing operations for pillow production
          </p>
        </div>

        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Database className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Production Data Yet
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Get started by seeding demo data to explore NexusProduction&apos;s AI-powered
              features including MRP planning, work order management, and material
              requirements analysis.
            </p>
            <Button onClick={handleSeedData} disabled={seeding} className="gap-2">
              {seeding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {seeding ? "Seeding Data..." : "Seed Pillow Manufacturing Data"}
            </Button>
            {seedMessage && (
              <p
                className={`mt-4 text-sm ${
                  seedMessage.includes("Failed") ? "text-destructive" : "text-emerald-600"
                }`}
              >
                {seedMessage}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { kpis, workOrders, suggestions } = data;
  const activeWorkOrders = workOrders.filter(
    (wo) => !["completed", "cancelled"].includes(wo.status)
  );
  const criticalSuggestions = suggestions.filter(
    (s) => s.urgency === "critical" && s.status === "pending"
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Production Dashboard
        </h2>
        <p className="text-muted-foreground">
          NexusAI is monitoring {workOrders.length} work orders and{" "}
          {data.rawMaterials.length} raw materials.
        </p>
      </div>

      {/* AI Daily Briefing */}
      <Card className="bg-card border-border relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Sparkles className="h-32 w-32 text-primary" />
        </div>
        <CardContent className="p-6 relative z-10">
          {loadingBriefing ? (
            <div className="flex items-center gap-3 py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-muted-foreground">
                NexusAI is analyzing production operations...
              </span>
            </div>
          ) : briefing ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2 text-primary font-medium text-xs uppercase tracking-wider">
                  <Sparkles className="h-4 w-4" /> Production Briefing
                </div>
                <h3 className="text-xl md:text-2xl font-semibold leading-tight text-foreground">
                  &ldquo;{briefing.headline}&rdquo;
                </h3>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mt-4">
                {/* Work Orders Summary */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">
                    Work Orders
                  </span>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">In Progress</span>
                      <span className="font-medium">{briefing.workOrdersSummary.inProgress}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Scheduled</span>
                      <span className="font-medium">{briefing.workOrdersSummary.scheduled}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Completed Today</span>
                      <span className="font-medium text-emerald-600">
                        {briefing.workOrdersSummary.completedToday}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Critical Alerts */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-destructive uppercase tracking-wider">
                    Requires Attention
                  </span>
                  <ul className="space-y-1">
                    {briefing.criticalAlerts.slice(0, 3).map((alert, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        {alert}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Material Status */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                    Material Status
                  </span>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Boxes className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    {briefing.materialStatus}
                  </div>
                  <div className="mt-2">
                    <span className="text-xs text-muted-foreground">Capacity Utilization</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${briefing.capacityUtilization}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{briefing.capacityUtilization}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">AI briefing unavailable</div>
          )}
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Work Orders In Progress</CardTitle>
            <Factory className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.workOrdersInProgress}</div>
            <p className="text-xs text-muted-foreground">Active production</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.workOrdersScheduled}</div>
            <p className="text-xs text-muted-foreground">Ready to start</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Material Shortages</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.materialShortages}</div>
            <p className="text-xs text-muted-foreground">Below reorder point</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Suggestions</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.pendingSuggestions}</div>
            <p className="text-xs text-muted-foreground">AI recommendations</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Split */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Active Work Orders */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Active Work Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeWorkOrders.slice(0, 6).map((wo) => (
                <div key={wo._id} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{wo.woNumber}</p>
                      <Badge variant="outline" className={getPriorityColor(wo.priority)}>
                        {wo.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {wo.finishedName} • {wo.qtyCompleted}/{wo.qtyPlanned} units
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getWorkOrderStatusColor(wo.status)}>
                      {wo.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              ))}
              {activeWorkOrders.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No active work orders.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Critical Material Suggestions */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Material Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {criticalSuggestions.length > 0 ? (
                criticalSuggestions.slice(0, 4).map((suggestion) => (
                  <div key={suggestion._id} className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{suggestion.materialName}</p>
                        <p className="text-xs text-muted-foreground">
                          Order {suggestion.suggestedQty} by {formatDate(suggestion.suggestedOrderDate)}
                        </p>
                      </div>
                      <Badge className={getUrgencyColor(suggestion.urgency)}>
                        {suggestion.urgency}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {suggestion.reason}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No critical material alerts
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

