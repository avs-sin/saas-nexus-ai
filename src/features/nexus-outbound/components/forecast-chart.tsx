"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  TrendingUp,
  AlertTriangle,
  Calendar,
  Sparkles,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { ShippingForecast } from "../types";

export function ForecastChart() {
  const forecasts = useQuery(api.nexusOutbound.getForecasts, {
    days: 14,
  }) as ShippingForecast[] | undefined;

  // Transform data for charts
  const chartData = forecasts
    ?.map((f) => {
      const allPred = f.predictions.find((p) => p.segment === "all");
      const b2bPred = f.predictions.find((p) => p.segment === "B2B");
      const b2cPred = f.predictions.find((p) => p.segment === "B2C");
      const date = new Date(f.forecastDate);

      return {
        date: date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
        fullDate: f.forecastDate,
        total: allPred?.predictedVolume ?? 0,
        b2b: b2bPred?.predictedVolume ?? 0,
        b2c: b2cPred?.predictedVolume ?? 0,
        confidence: allPred?.confidenceLevel ?? 0,
        hasAlert: f.alerts.length > 0,
        alerts: f.alerts,
      };
    })
    .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());

  // Collect all alerts
  const allAlerts = forecasts?.flatMap((f) =>
    f.alerts.map((a) => ({
      ...a,
      date: f.forecastDate,
    }))
  ) ?? [];

  // Calculate summary stats
  const totalPredicted = chartData?.reduce((sum, d) => sum + d.total, 0) ?? 0;
  const avgConfidence = chartData?.length
    ? Math.round(chartData.reduce((sum, d) => sum + d.confidence, 0) / chartData.length)
    : 0;
  const alertCount = allAlerts.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Demand Forecast
        </h2>
        <p className="text-muted-foreground">
          AI-powered shipping volume predictions for capacity planning
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">14-Day Forecast</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPredicted}</div>
            <p className="text-xs text-muted-foreground">Total predicted shipments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <Sparkles className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgConfidence}%</div>
            <p className="text-xs text-muted-foreground">AI prediction confidence</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Capacity Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alertCount}</div>
            <p className="text-xs text-muted-foreground">Upcoming constraints</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Day</CardTitle>
            <Calendar className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {chartData && chartData.length > 0
                ? chartData.reduce((max, d) => (d.total > max.total ? d : max)).date
                : "—"}
            </div>
            <p className="text-xs text-muted-foreground">Highest predicted volume</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Volume Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Volume Forecast (14 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="b2b"
                    name="B2B"
                    stackId="a"
                    fill="hsl(var(--primary))"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="b2c"
                    name="B2C"
                    stackId="a"
                    fill="hsl(var(--chart-2))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Confidence Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Prediction Confidence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    domain={[50, 100]}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="confidence"
                    name="Confidence %"
                    stroke="hsl(var(--chart-3))"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "hsl(var(--chart-3))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Alerts Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Capacity Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allAlerts.length > 0 ? (
              <div className="space-y-3">
                {allAlerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      alert.severity === "high"
                        ? "border-red-500/50 bg-red-50/50 dark:bg-red-900/10"
                        : alert.severity === "medium"
                        ? "border-amber-500/50 bg-amber-50/50 dark:bg-amber-900/10"
                        : "border-blue-500/50 bg-blue-50/50 dark:bg-blue-900/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(alert.date).toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          alert.severity === "high"
                            ? "text-red-600"
                            : alert.severity === "medium"
                            ? "text-amber-600"
                            : "text-blue-600"
                        }
                      >
                        {alert.severity}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No capacity alerts</p>
                <p className="text-sm">All systems operating within normal parameters</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


