"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  ArrowUpRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  Sparkles,
  Loader2,
  Database,
  RefreshCw,
} from "lucide-react";
import { generateDashboardBriefing } from "@/lib/nexusplan-ai";
import type { DashboardBriefing } from "@/types/nexusplan";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function NexusPlanDashboard() {
  // Wait for tenant to exist before querying data
  const tenantExists = useQuery(api.tenants.exists);
  const data = useQuery(
    api.nexusplan.getDashboardData,
    tenantExists ? {} : "skip"
  );
  const scorecardData = useQuery(
    api.nexusplan.getCustomerScorecards,
    tenantExists ? {} : "skip"
  );
  const seedData = useMutation(api.nexusplan.seedNexusPlanData);

  const [briefing, setBriefing] = useState<DashboardBriefing | null>(null);
  const [loadingBriefing, setLoadingBriefing] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  // Trigger AI briefing only when data loads
  useEffect(() => {
    if (data && data.pos.length > 0) {
      setLoadingBriefing(true);
      generateDashboardBriefing(data)
        .then((res) => setBriefing(res))
        .catch((err) => console.error(err))
        .finally(() => setLoadingBriefing(false));
    } else {
      setLoadingBriefing(false);
    }
  }, [data]);

  const handleSeedData = async () => {
    setSeeding(true);
    setSeedMessage(null);
    try {
      const result = await seedData();
      setSeedMessage(result.message);
    } catch (error) {
      setSeedMessage("Failed to seed data. Please check your Convex configuration.");
      console.error(error);
    } finally {
      setSeeding(false);
    }
  };

  // Show loading state while waiting for tenant or data
  if (tenantExists === undefined || (tenantExists && data === undefined)) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">Loading NexusPlan data...</p>
      </div>
    );
  }

  // Show empty state with seed option
  if (!data || data.pos.length === 0) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Executive Dashboard
          </h2>
          <p className="text-muted-foreground">Welcome to NexusPlan Manufacturing & Procurement System</p>
        </div>

        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Database className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Data Yet
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Get started by seeding demo data to explore NexusPlan&apos;s features including
              purchase orders, customer scorecards, vendor management, and AI-powered insights.
            </p>
            <Button
              onClick={handleSeedData}
              disabled={seeding}
              className="gap-2"
            >
              {seeding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {seeding ? "Seeding Data..." : "Seed Demo Data"}
            </Button>
            {seedMessage && (
              <p className={`mt-4 text-sm ${seedMessage.includes("Failed") ? "text-destructive" : "text-emerald-600"}`}>
                {seedMessage}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { pos, openPosCount, discrepancyCount, avgScore, recentActivity } = data;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Executive Dashboard
        </h2>
        <p className="text-muted-foreground">
          Welcome back. NexusAI is monitoring {pos.length} active orders.
        </p>
      </div>

      {/* AI Daily Briefing Section */}
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
                NexusAI is analyzing live data...
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

              <div className="grid md:grid-cols-2 gap-6 mt-4">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-destructive uppercase tracking-wider">
                    Requires Attention
                  </span>
                  <ul className="space-y-2">
                    {briefing.criticalAlerts?.length > 0 ? (
                      briefing.criticalAlerts.map((alert, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                          {alert}
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-muted-foreground italic">
                        No critical alerts detected.
                      </li>
                    )}
                  </ul>
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                    Positive Trends
                  </span>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    {briefing.goodNews}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-destructive">Briefing unavailable.</div>
          )}
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Customer Score</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgScore.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Across all customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Discrepancies</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{discrepancyCount}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active POs</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openPosCount}</div>
            <p className="text-xs text-muted-foreground">In pipeline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pos.length}</div>
            <p className="text-xs text-muted-foreground">All statuses</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Split */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Score Overview */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Customer Score Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scorecardData?.scores.map((score) => {
                const customer = scorecardData.customers.find(
                  (c) => c._id === score.customerId
                );
                return (
                  <div key={score._id} className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {customer?.name || "Unknown"}
                      </p>
                      <div className="h-2 bg-muted rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full rounded-full transition-all ${
                            score.totalScore >= 90
                              ? "bg-emerald-500"
                              : score.totalScore >= 70
                              ? "bg-primary"
                              : "bg-amber-500"
                          }`}
                          style={{ width: `${score.totalScore}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-bold w-12 text-right">
                      {score.totalScore}
                    </span>
                  </div>
                );
              })}
              {!scorecardData?.scores.length && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No scorecard data available. Run seed to populate.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent PO Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((po) => (
                <div key={po._id} className="flex items-center">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{po.poNumber}</p>
                    <p className="text-xs text-muted-foreground">{po.sku}</p>
                  </div>
                  <div className="ml-auto">
                    <Badge
                      variant={
                        po.status === "OPEN"
                          ? "default"
                          : po.status === "CLOSED"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {po.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {!recentActivity.length && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent activity.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
