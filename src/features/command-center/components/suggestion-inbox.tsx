"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Sparkles,
  Loader2,
  CheckCircle,
  Filter,
  Factory,
  ShoppingCart,
  Play,
  TrendingUp,
  Inbox,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SuggestionCard } from "./suggestion-card";
import type { NexusSuggestion, SuggestionType, SuggestionModule, SuggestionPriority } from "@/types/intelligence";

type FilterType = "all" | SuggestionType;
type FilterModule = "all" | SuggestionModule;
type FilterPriority = "all" | SuggestionPriority;

export function SuggestionInbox() {
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterModule, setFilterModule] = useState<FilterModule>("all");
  const [filterPriority, setFilterPriority] = useState<FilterPriority>("all");

  const tenantExists = useQuery(api.tenants.exists);

  // Single consolidated query - filters applied server-side, already sorted
  const data = useQuery(
    api.nexusIntelligence.getCommandCenterData,
    tenantExists
      ? {
          type: filterType !== "all" ? filterType : undefined,
          sourceModule: filterModule !== "all" ? filterModule : undefined,
          priority: filterPriority !== "all" ? filterPriority : undefined,
        }
      : "skip"
  );

  const acceptSuggestion = useMutation(api.nexusIntelligence.acceptSuggestion);
  const dismissSuggestion = useMutation(api.nexusIntelligence.dismissSuggestion);

  const handleAccept = async (id: string) => {
    await acceptSuggestion({ suggestionId: id as any });
  };

  const handleDismiss = async (id: string, reason?: string) => {
    await dismissSuggestion({ suggestionId: id as any, reason });
  };

  // Loading state
  if (tenantExists === undefined || (tenantExists && data === undefined)) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">Loading Command Center...</p>
      </div>
    );
  }

  const suggestions = (data?.suggestions ?? []) as NexusSuggestion[];
  const counts = data?.counts ?? {
    total: 0,
    pending: 0,
    critical: 0,
    byType: { work_order: 0, purchase: 0, release_wo: 0, forecast_cascade: 0 },
    byModule: { outbound: 0, production: 0, inbound: 0, plan: 0 },
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Command Center
            </h2>
            <p className="text-muted-foreground">
              AI-powered suggestions from across your supply chain
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card className={counts.critical > 0 ? "border-red-500/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <Badge variant="destructive" className="h-5 px-1.5">
              {counts.critical}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {counts.critical}
            </div>
            <p className="text-xs text-muted-foreground">Urgent attention needed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Work Orders</CardTitle>
            <Factory className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.byType.work_order}</div>
            <p className="text-xs text-muted-foreground">Production suggestions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Purchases</CardTitle>
            <ShoppingCart className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.byType.purchase}</div>
            <p className="text-xs text-muted-foreground">Material orders needed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Type:</span>
              <div className="flex gap-1">
                {[
                  { value: "all", label: "All", icon: null },
                  { value: "work_order", label: "WO", icon: <Factory className="h-3 w-3" /> },
                  { value: "purchase", label: "PO", icon: <ShoppingCart className="h-3 w-3" /> },
                  { value: "release_wo", label: "Release", icon: <Play className="h-3 w-3" /> },
                  { value: "forecast_cascade", label: "Forecast", icon: <TrendingUp className="h-3 w-3" /> },
                ].map((option) => (
                  <Button
                    key={option.value}
                    variant={filterType === option.value ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setFilterType(option.value as FilterType)}
                  >
                    {option.icon}
                    <span className={option.icon ? "ml-1" : ""}>{option.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Priority Filter */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Priority:</span>
              <div className="flex gap-1">
                {["all", "critical", "high", "medium", "low"].map((p) => (
                  <Button
                    key={p}
                    variant={filterPriority === p ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-2 text-xs capitalize"
                    onClick={() => setFilterPriority(p as FilterPriority)}
                  >
                    {p}
                  </Button>
                ))}
              </div>
            </div>

            {/* Module Filter */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">From:</span>
              <div className="flex gap-1">
                {[
                  { value: "all", label: "All" },
                  { value: "outbound", label: "Outbound" },
                  { value: "production", label: "Production" },
                  { value: "inbound", label: "Inbound" },
                  { value: "plan", label: "Plan" },
                ].map((m) => (
                  <Button
                    key={m.value}
                    variant={filterModule === m.value ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setFilterModule(m.value as FilterModule)}
                  >
                    {m.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suggestions List */}
      {suggestions.length > 0 ? (
        <div className="space-y-4">
          {suggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion._id}
              suggestion={suggestion}
              onAccept={handleAccept}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              All Caught Up!
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              No pending suggestions right now. NexusAI is continuously monitoring your
              supply chain and will alert you when action is needed.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
