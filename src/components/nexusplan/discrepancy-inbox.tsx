"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Check, Sparkles, Loader2, ArrowRight } from "lucide-react";
import { analyzeDiscrepancyAI } from "@/lib/nexusplan-ai";
import type { DiscrepancyAnalysis, NexusDiscrepancy } from "@/types/nexusplan";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Id } from "../../../convex/_generated/dataModel";

export function DiscrepancyInbox() {
  const discrepancies = useQuery(api.nexusplan.getDiscrepancies);
  const pos = useQuery(api.nexusplan.getPurchaseOrders);
  const updateStatus = useMutation(api.nexusplan.updateDiscrepancyStatus);

  const [analysisResults, setAnalysisResults] = useState<
    Record<string, DiscrepancyAnalysis | null>
  >({});
  const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({});

  if (!discrepancies || !pos) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  const openCount = discrepancies.filter((d) => d.status !== "RESOLVED").length;
  const resolvedCount = discrepancies.filter((d) => d.status === "RESOLVED").length;

  const handleInvestigate = async (d: NexusDiscrepancy) => {
    if (loadingIds[d._id]) return;

    setLoadingIds((prev) => ({ ...prev, [d._id]: true }));
    try {
      // Find related context
      const relatedPO = pos.find(
        (p) => p.poNumber === d.relatedId || p._id === d.relatedId
      );
      const result = await analyzeDiscrepancyAI(d, { relatedPO, allPOs: pos });
      setAnalysisResults((prev) => ({ ...prev, [d._id]: result }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingIds((prev) => ({ ...prev, [d._id]: false }));
    }
  };

  const handleResolve = async (discrepancyId: Id<"nexusDiscrepancies">) => {
    await updateStatus({ discrepancyId, status: "RESOLVED" });
  };

  const getSeverityVariant = (severity: string): "default" | "secondary" | "destructive" => {
    if (severity === "HIGH") return "destructive";
    if (severity === "MEDIUM") return "secondary";
    return "default";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Discrepancy Inbox
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="sm:size-default">Resolved ({resolvedCount})</Button>
          <Button variant="default" size="sm" className="sm:size-default">Open ({openCount})</Button>
        </div>
      </div>

      <div className="grid gap-4">
        {discrepancies.map((d) => {
          const severityVariant = getSeverityVariant(d.severity);
          const analysis = analysisResults[d._id];
          const isLoading = loadingIds[d._id];

          return (
            <Card
              key={d._id}
              className={`border-l-4 ${
                d.severity === "HIGH"
                  ? "border-l-destructive"
                  : d.severity === "MEDIUM"
                  ? "border-l-amber-500"
                  : "border-l-primary"
              }`}
            >
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6 justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <Badge variant={severityVariant}>{d.severity}</Badge>
                      <span className="font-semibold text-lg text-foreground">
                        {d.metric.replace(/_/g, " ")}
                      </span>
                      <span className="text-sm text-muted-foreground ml-2">
                        ID: {d._id.slice(-6)}
                      </span>
                    </div>
                    <p className="text-foreground/80">{d.description}</p>

                    <div className="grid grid-cols-3 sm:inline-flex sm:gap-6 gap-2 mt-4 text-sm text-muted-foreground bg-muted p-3 rounded-md">
                      <div className="flex flex-col">
                        <span className="text-xs uppercase font-bold text-muted-foreground/70">
                          Related To
                        </span>
                        <span className="font-medium text-foreground text-xs sm:text-sm truncate">
                          {d.relatedType} {d.relatedId}
                        </span>
                      </div>
                      <div className="flex flex-col sm:border-l sm:border-border sm:pl-4">
                        <span className="text-xs uppercase font-bold text-muted-foreground/70">
                          Expected
                        </span>
                        <span className="font-medium text-foreground text-xs sm:text-sm">{d.expected}</span>
                      </div>
                      <div className="flex flex-col sm:border-l sm:border-border sm:pl-4">
                        <span className="text-xs uppercase font-bold text-muted-foreground/70">
                          Actual
                        </span>
                        <span className="font-medium text-destructive text-xs sm:text-sm">{d.actual}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 min-w-[150px]">
                    {d.status !== "RESOLVED" && (
                      <>
                        <Button
                          className="w-full gap-2"
                          onClick={() => handleInvestigate(d as NexusDiscrepancy)}
                          disabled={isLoading || !!analysis}
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                          {analysis ? "Analyzed" : "AI Investigate"}
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full gap-2"
                          onClick={() => handleResolve(d._id)}
                        >
                          <Check className="h-4 w-4" /> Resolve
                        </Button>
                      </>
                    )}
                    {d.status === "RESOLVED" && (
                      <Button
                        variant="ghost"
                        disabled
                        className="w-full text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20"
                      >
                        <Check className="h-4 w-4 mr-2" /> Resolved
                      </Button>
                    )}
                    <span className="text-xs text-center text-muted-foreground mt-2">
                      Detected: {new Date(d.detectedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* AI Analysis Result Area */}
                {analysis && (
                  <div className="mt-6 pt-4 border-t border-border animate-in fade-in slide-in-from-top-2">
                    <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                      <div className="flex items-center gap-2 mb-3 text-primary">
                        <Sparkles className="h-4 w-4" />
                        <h4 className="font-semibold text-sm">
                          NexusAI Diagnostics
                        </h4>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-bold text-foreground block mb-1">
                            Root Cause Hypothesis:
                          </span>
                          <p className="text-muted-foreground">{analysis.rootCause}</p>
                        </div>
                        <div>
                          <span className="font-bold text-foreground block mb-1">
                            Recommended Actions:
                          </span>
                          <ul className="space-y-1">
                            {analysis.recommendations?.map((rec, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-muted-foreground"
                              >
                                <ArrowRight className="h-3 w-3 mt-1 text-primary shrink-0" />
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {discrepancies.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No discrepancies found. Run seed to populate data.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
