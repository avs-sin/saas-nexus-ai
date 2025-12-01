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
  Package,
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Mail,
  Copy,
} from "lucide-react";
import {
  generateScorecardInsightAI,
  generateVendorNegotiationStrategy,
} from "@/lib/nexusplan-ai";
import { getScoreGrade, NegotiationStrategy } from "@/types/nexusplan";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function VendorScorecard() {
  const data = useQuery(api.nexusplan.getVendorScorecards);

  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);

  const [negotiationStrategy, setNegotiationStrategy] =
    useState<NegotiationStrategy | null>(null);
  const [loadingStrategy, setLoadingStrategy] = useState(false);
  const [showStrategy, setShowStrategy] = useState(false);

  // Set initial selected vendor when data loads
  useEffect(() => {
    if (data && data.vendors.length > 0 && !selectedVendorId) {
      setSelectedVendorId(data.vendors[0]._id);
    }
  }, [data, selectedVendorId]);

  // Fetch insight when vendor changes
  useEffect(() => {
    if (data && selectedVendorId) {
      const vendor = data.vendors.find((v) => v._id === selectedVendorId);
      const scoreData = data.scores.find((s) => s.vendorId === selectedVendorId);
      if (vendor && scoreData) {
        setIsLoadingInsight(true);
        setAiInsight(null);
        setNegotiationStrategy(null);
        setShowStrategy(false);
        generateScorecardInsightAI(vendor.name, scoreData, "VENDOR")
          .then((text) => setAiInsight(text))
          .catch((err) => console.error(err))
          .finally(() => setIsLoadingInsight(false));
      }
    }
  }, [selectedVendorId, data]);

  if (!data) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  const { scores, vendors, pos, discrepancies } = data;
  const vendor = vendors.find((v) => v._id === selectedVendorId);
  const scoreData = scores.find((s) => s.vendorId === selectedVendorId);
  const grade = scoreData ? getScoreGrade(scoreData.totalScore) : null;

  // Operational Data for the selected vendor
  const vendorPOs = pos.filter((po) => po.vendorId === selectedVendorId);
  const vendorDiscrepancies = discrepancies.filter((d) => {
    const relatedPO = vendorPOs.find(
      (p) => p._id === d.relatedId || p.poNumber === d.relatedId
    );
    return !!relatedPO;
  });

  const handleGenerateStrategy = async () => {
    if (!vendor || !scoreData) return;
    setLoadingStrategy(true);
    setShowStrategy(true);
    try {
      const strategy = await generateVendorNegotiationStrategy(
        vendor.name,
        scoreData,
        { pos: vendorPOs, discrepancies: vendorDiscrepancies }
      );
      setNegotiationStrategy(strategy);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStrategy(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Vendor Scorecards
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Supplier performance monitoring and operational audit.
          </p>
        </div>
        <Button variant="outline" size="sm" className="w-fit sm:size-default">
          <Download className="h-4 w-4 mr-2" /> Export Report
        </Button>
      </div>

      {/* Vendor List Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {scores.map((s) => {
          const v = vendors.find((vend) => vend._id === s.vendorId);
          if (!v) return null;
          const g = getScoreGrade(s.totalScore);
          const isSelected = selectedVendorId === s.vendorId;

          return (
            <div
              key={s._id}
              onClick={() => setSelectedVendorId(s.vendorId)}
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
                        title={v.name}
                      >
                        {v.name}
                      </h3>
                      <span
                        className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${g.bg} ${g.color}`}
                      >
                        {g.letter}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">
                      {v.category}
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
            No vendor scorecards found. Run seed to populate data.
          </CardContent>
        </Card>
      )}

      {vendor && scoreData && grade && (
        <>
          <div className="border-t border-border my-8" />

          <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <h3 className="text-lg sm:text-xl font-bold text-foreground">{vendor.name}</h3>
                <Badge variant="outline" className={`${grade.bg} ${grade.color} border-0 w-fit`}>
                  Grade {grade.letter} ({scoreData.totalScore}/100)
                </Badge>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="text-sm text-muted-foreground">
                  Contact:{" "}
                  <span className="text-primary hover:underline cursor-pointer break-all">
                    {vendor.contactEmail}
                  </span>
                </div>
                <Button onClick={handleGenerateStrategy} size="sm" className="w-fit sm:size-default">
                  <Briefcase className="h-4 w-4 mr-2" />
                  Negotiation Prep
                </Button>
              </div>
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
                      NexusAI Supplier Analysis
                      {isLoadingInsight && (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      )}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {isLoadingInsight
                        ? "Analyzing operational history and delivery performance..."
                        : aiInsight ||
                          "No specific insights generated for this period."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Negotiation Strategy Panel */}
            {showStrategy && (
              <div className="animate-in slide-in-from-top-4 fade-in duration-500">
                <Card className="border-primary/20 shadow-md">
                  <CardHeader className="bg-primary/5 border-b border-primary/10 pb-4">
                    <CardTitle className="text-foreground flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-primary" />
                      Negotiation & Meeting Strategy
                      {loadingStrategy && (
                        <Loader2 className="h-4 w-4 animate-spin ml-2" />
                      )}
                    </CardTitle>
                  </CardHeader>
                  {!loadingStrategy && negotiationStrategy && (
                    <CardContent className="grid md:grid-cols-2 gap-8 pt-6">
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                            Recommended Stance
                          </h4>
                          <div className="p-3 bg-primary/10 text-foreground rounded-md border border-primary/20 font-medium">
                            {negotiationStrategy.openingStance}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                            Leverage Points
                          </h4>
                          <ul className="space-y-2">
                            {negotiationStrategy.leveragePoints?.map(
                              (point, i) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-2 text-sm text-foreground/80"
                                >
                                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                  {point}
                                </li>
                              )
                            )}
                          </ul>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                            Agenda Items
                          </h4>
                          <ul className="space-y-2">
                            {negotiationStrategy.talkingPoints?.map(
                              (point, i) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-2 text-sm text-foreground/80"
                                >
                                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                  {point}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      </div>

                      <div className="bg-muted rounded-lg p-5 border border-border">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2 text-foreground font-semibold">
                            <Mail className="h-4 w-4" />
                            Draft Email
                          </div>
                          <Button
                            variant="ghost"
                            className="h-8 text-xs"
                            onClick={() =>
                              copyToClipboard(negotiationStrategy.emailDraft)
                            }
                          >
                            <Copy className="h-3 w-3 mr-1" /> Copy
                          </Button>
                        </div>
                        <div className="text-sm text-muted-foreground font-mono bg-card p-4 rounded border border-border whitespace-pre-wrap">
                          {negotiationStrategy.emailDraft}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </div>
            )}

            {/* Metrics Grid */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Trend */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>90-Day Trend</CardTitle>
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

              {/* Metric List */}
              <Card>
                <CardHeader>
                  <CardTitle>Vendor KPI Breakdown</CardTitle>
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

            {/* Operational History */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Orders & Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {vendorPOs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No recent active orders.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {vendorPOs.slice(0, 5).map((po) => (
                        <div
                          key={po._id}
                          className="flex items-center justify-between border-b border-border last:border-0 pb-3 last:pb-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 text-primary rounded-md">
                              <Package className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {po.poNumber}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {po.sku}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant={
                                po.status === "OPEN" ? "secondary" : "outline"
                              }
                            >
                              {po.status}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {po.currentDeliveryDate}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button variant="ghost" className="w-full mt-4 text-xs">
                    View All Orders <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Active Quality/Delivery Issues</CardTitle>
                </CardHeader>
                <CardContent>
                  {vendorDiscrepancies.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                      <div className="h-10 w-10 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-2">
                        <Trophy className="h-5 w-5" />
                      </div>
                      <p className="text-sm">No active issues found.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {vendorDiscrepancies.map((d) => (
                        <div
                          key={d._id}
                          className="flex items-start gap-3 p-3 bg-destructive/5 border border-destructive/20 rounded-md"
                        >
                          <AlertTriangle className="h-4 w-4 text-destructive mt-1 shrink-0" />
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-destructive">
                                {d.metric.replace(/_/g, " ")}
                              </span>
                              <Badge
                                variant="destructive"
                                className="text-[10px] h-5 px-1.5"
                              >
                                {d.severity}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {d.description}
                            </p>
                            <div className="mt-2 text-xs text-destructive font-medium">
                              Exp: {d.expected} | Act: {d.actual}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
