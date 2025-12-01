"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Download,
  Sparkles,
  Loader2,
  Trophy,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { generateScorecardInsightAI } from "@/lib/nexusplan-ai";
import { getScoreGrade } from "@/types/nexusplan";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function CustomerScorecard() {
  const data = useQuery(api.nexusplan.getCustomerScorecards);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);

  // Set initial selected customer when data loads
  useEffect(() => {
    if (data && data.customers.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(data.customers[0]._id);
    }
  }, [data, selectedCustomerId]);

  // Fetch new insight when customer changes
  useEffect(() => {
    if (data && selectedCustomerId) {
      const customer = data.customers.find((c) => c._id === selectedCustomerId);
      const scoreData = data.scores.find((s) => s.customerId === selectedCustomerId);
      if (customer && scoreData) {
        setIsLoadingInsight(true);
        setAiInsight(null);
        generateScorecardInsightAI(customer.name, scoreData, "CUSTOMER")
          .then((text) => setAiInsight(text))
          .catch((err) => console.error(err))
          .finally(() => setIsLoadingInsight(false));
      }
    }
  }, [selectedCustomerId, data]);

  if (!data) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  const { scores, customers } = data;
  const customer = customers.find((c) => c._id === selectedCustomerId);
  const scoreData = scores.find((s) => s.customerId === selectedCustomerId);
  const grade = scoreData ? getScoreGrade(scoreData.totalScore) : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Customer Scorecards
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Real-time scoring based on forecast accuracy and PO compliance.
          </p>
        </div>
        <Button variant="outline" size="sm" className="w-fit sm:size-default">
          <Download className="h-4 w-4 mr-2" /> Export All
        </Button>
      </div>

      {/* Partner List Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {scores.map((s) => {
          const cust = customers.find((c) => c._id === s.customerId);
          if (!cust) return null;
          const g = getScoreGrade(s.totalScore);
          const isSelected = selectedCustomerId === s.customerId;

          return (
            <div
              key={s._id}
              onClick={() => setSelectedCustomerId(s.customerId)}
              className={`relative cursor-pointer group transition-all duration-200 ease-in-out hover:-translate-y-1 ${
                isSelected
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-xl shadow-lg"
                  : ""
              }`}
            >
              <Card
                className={`h-full border transition-colors ${
                  isSelected
                    ? "bg-muted/50 border-border"
                    : "hover:border-border/80"
                }`}
              >
                <CardContent className="p-5 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3
                        className="font-semibold text-foreground line-clamp-1"
                        title={cust.name}
                      >
                        {cust.name}
                      </h3>
                      <span
                        className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${g.bg} ${g.color}`}
                      >
                        {g.letter}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">
                      EDI: {cust.ediId}
                    </p>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-muted-foreground uppercase">
                        Score
                      </span>
                      <span className={`text-2xl font-bold ${g.color}`}>
                        {s.totalScore}
                      </span>
                    </div>
                    {s.totalScore > 85 ? (
                      <Trophy className="h-5 w-5 text-yellow-500 mb-1" />
                    ) : s.totalScore < 70 ? (
                      <AlertCircle className="h-5 w-5 text-destructive/70 mb-1" />
                    ) : (
                      <TrendingUp className="h-5 w-5 text-muted-foreground mb-1" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {scores.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No customer scorecards found. Run seed to populate data.
          </CardContent>
        </Card>
      )}

      {customer && scoreData && grade && (
        <>
          <div className="border-t border-border my-8" />

          {/* Selected Partner Detailed View */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-foreground">
                Detailed Analysis: {customer.name}
              </h3>
              <Badge variant="outline" className={`${grade.bg} ${grade.color} border-0`}>
                Grade {grade.letter} ({scoreData.totalScore}/100)
              </Badge>
            </div>

            {/* AI Executive Summary */}
            <Card className="bg-primary/5 border-primary/10 overflow-hidden relative">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-primary/10 rounded-full opacity-50 blur-xl" />
              <CardContent className="p-6 relative z-10">
                <div className="flex gap-4">
                  <div className="p-2 bg-card rounded-lg shadow-sm h-fit shrink-0 border border-border">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <div className="space-y-2 flex-1">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      NexusAI Executive Summary
                      {isLoadingInsight && (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      )}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {isLoadingInsight
                        ? "Generating real-time insights based on latest data..."
                        : aiInsight ||
                          "No specific insights generated for this period."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Trend Chart Placeholder */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>90-Day Score Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] flex items-end gap-2">
                    {scoreData.trend.map((t, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-primary rounded-t"
                          style={{ height: `${t.score * 2}px` }}
                        />
                        <span className="text-xs text-muted-foreground mt-2">
                          {t.date}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Metrics Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Key Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {scoreData.metrics.map((m, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium text-foreground/80">
                            {m.name}
                          </span>
                          <span className="font-bold">{m.value}%</span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${
                              m.value > 90
                                ? "bg-emerald-500"
                                : m.value > 70
                                ? "bg-primary"
                                : "bg-amber-500"
                            }`}
                            style={{ width: `${m.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
