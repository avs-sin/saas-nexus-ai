"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Package,
  Truck,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Loader2,
  Database,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { OutboundBriefing, OutboundDashboardData } from "../types";
import { getStatusColor, formatRelativeTime } from "../types";

export function OutboundDashboard() {
  const tenantExists = useQuery(api.tenants.exists);
  const data = useQuery(
    api.nexusOutbound.getDashboardData,
    tenantExists ? {} : "skip"
  ) as OutboundDashboardData | null | undefined;
  const hasData = useQuery(api.nexusOutbound.hasData, tenantExists ? {} : "skip");
  const seedData = useMutation(api.nexusOutboundMutations.seedOutboundData);
  const generateBriefing = useAction(api.nexusOutboundActions.generateDashboardBriefingAction);

  const [briefing, setBriefing] = useState<OutboundBriefing | null>(null);
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  // Generate AI briefing when data loads
  useEffect(() => {
    if (data && data.orders.length > 0 && !briefing) {
      setLoadingBriefing(true);
      generateBriefing({
        orders: data.orders,
        shipments: data.shipments,
        discrepancies: data.discrepancies,
        forecasts: data.forecasts,
        kpis: data.kpis,
      })
        .then((res) => setBriefing(res as OutboundBriefing))
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
        <p className="text-muted-foreground">Loading NexusOutbound data...</p>
      </div>
    );
  }

  // Empty state
  if (!hasData || !data || data.orders.length === 0) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Outbound Dashboard
          </h2>
          <p className="text-muted-foreground">
            AI-powered fulfillment management for B2B and B2C operations
          </p>
        </div>

        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Database className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Outbound Data Yet
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Get started by seeding demo data to explore NexusOutbound&apos;s AI-powered
              features including demand forecasting, shipment tracking, and automated
              customer communications.
            </p>
            <Button onClick={handleSeedData} disabled={seeding} className="gap-2">
              {seeding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {seeding ? "Seeding Data..." : "Seed Demo Data"}
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

  const { kpis, recentOrders, forecasts, comms } = data;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Outbound Dashboard
        </h2>
        <p className="text-muted-foreground">
          NexusAI is monitoring {kpis.totalOrders} orders and {kpis.totalShipments} shipments.
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
                NexusAI is analyzing shipping operations...
              </span>
            </div>
          ) : briefing ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2 text-primary font-medium text-xs uppercase tracking-wider">
                  <Sparkles className="h-4 w-4" /> Morning Briefing
                </div>
                <h3 className="text-xl md:text-2xl font-semibold leading-tight text-foreground">
                  &ldquo;{briefing.headline}&rdquo;
                </h3>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mt-4">
                {/* Volume Forecast */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">
                    Volume Forecast
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-bold text-foreground">
                      {briefing.volumeForecast.today}
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      {briefing.volumeForecast.trend === "up" ? (
                        <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                      ) : briefing.volumeForecast.trend === "down" ? (
                        <ArrowDownRight className="h-4 w-4 text-red-500" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-amber-500" />
                      )}
                      <span className="text-muted-foreground">
                        → {briefing.volumeForecast.tomorrow} tomorrow
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

                {/* Customer Highlight */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                    Customer Highlight
                  </span>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    {briefing.customerHighlight}
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
            <CardTitle className="text-sm font-medium">Orders to Ship Today</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.ordersToShipToday}</div>
            <p className="text-xs text-muted-foreground">Pending fulfillment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In-Transit Shipments</CardTitle>
            <Truck className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.inTransitShipments}</div>
            <p className="text-xs text-muted-foreground">On the way</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered This Week</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.deliveredThisWeek}</div>
            <p className="text-xs text-muted-foreground">Successfully completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exception Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.exceptionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {kpis.openDiscrepancies} open issues
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Split */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Recent Orders */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order._id} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{order.orderNumber}</p>
                      <Badge variant="outline" className="text-xs">
                        {order.customerType}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {order.customerName} • {formatRelativeTime(order.createdAt)}
                    </p>
                  </div>
                  <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                </div>
              ))}
              {recentOrders.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent orders.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* AI Communications */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Communications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {comms.slice(0, 5).map((comm) => (
                <div key={comm._id} className="flex items-start gap-3">
                  <div
                    className={`w-2 h-2 rounded-full mt-2 ${
                      comm.aiGenerated ? "bg-primary" : "bg-muted"
                    }`}
                  />
                  <div className="space-y-1 flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{comm.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {comm.type} • {comm.recipient}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {comm.status}
                  </Badge>
                </div>
              ))}
              {comms.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No communications yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Preview */}
      {forecasts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>7-Day Volume Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {forecasts.slice(0, 7).map((forecast) => {
                const allPrediction = forecast.predictions.find((p) => p.segment === "all");
                const hasAlert = forecast.alerts.length > 0;
                return (
                  <div
                    key={forecast._id}
                    className={`flex-shrink-0 w-24 p-3 rounded-lg border ${
                      hasAlert ? "border-amber-500/50 bg-amber-50/50 dark:bg-amber-900/10" : "border-border"
                    }`}
                  >
                    <p className="text-xs text-muted-foreground mb-1">
                      {new Date(forecast.forecastDate).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-xl font-bold">
                      {allPrediction?.predictedVolume ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {allPrediction?.confidenceLevel ?? 0}% conf
                    </p>
                    {hasAlert && (
                      <AlertTriangle className="h-3 w-3 text-amber-500 mt-1" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


