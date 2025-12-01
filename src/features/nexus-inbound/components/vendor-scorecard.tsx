'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  CartesianGrid,
} from 'recharts';
import { Search, Zap, Loader2, ClipboardList, TrendingUp } from 'lucide-react';
import { useAction } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { InboundDashboardData, InboundVendor, InboundVendorScoreCard } from '../types';

interface VendorScorecardProps {
  data: InboundDashboardData;
}

export function VendorScorecard({ data }: VendorScorecardProps) {
  const { scorecards, vendors, discrepancies } = data;
  const [selectedVendorId, setSelectedVendorId] = useState<string>(vendors[0]?._id || '');
  const [searchTerm, setSearchTerm] = useState('');

  // Negotiation Strategy State
  const [strategy, setStrategy] = useState<{
    strategyName: string;
    keyLeveragePoints: string[];
    openingStatement: string;
    recommendedGoal: string;
  } | null>(null);
  const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);

  const generateStrategy = useAction(api.nexusInboundActions.generateNegotiationStrategyAction);

  const filteredVendors = vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.ediId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const scorecard = scorecards.find((s) => s.vendorId === selectedVendorId);
  const vendor = vendors.find((v) => v._id === selectedVendorId);

  const handleGenerateStrategy = async () => {
    if (!vendor || !scorecard) return;
    setIsGeneratingStrategy(true);
    const vendorDiscrepancies = discrepancies.filter((d) => d.vendorName === vendor.name);
    try {
      const result = await generateStrategy({
        vendorName: vendor.name,
        scorecard,
        recentDiscrepancies: vendorDiscrepancies,
      });
      setStrategy(result);
    } catch {
      console.error('Failed to generate strategy');
    }
    setIsGeneratingStrategy(false);
  };

  // Reset strategy when vendor changes
  useEffect(() => {
    setStrategy(null);
  }, [selectedVendorId]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-foreground';
    if (score >= 75) return 'text-muted-foreground';
    return 'text-destructive';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Vendor Scorecards
        </h2>
        <p className="text-muted-foreground">
          Performance tracking across {vendors.length} active vendors.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Sidebar List */}
      <Card className="md:col-span-1">
        <CardHeader className="border-b py-4">
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
            Vendor Directory
          </CardTitle>
          <div className="relative mt-3">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search vendors..."
              className="pl-9 h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="overflow-y-auto max-h-[400px] p-2 space-y-2">
          {filteredVendors.map((v) => {
            const vScore = scorecards.find((s) => s.vendorId === v._id)?.totalScore || 0;
            return (
              <div
                key={v._id}
                onClick={() => setSelectedVendorId(v._id)}
                className={`p-3 rounded-md cursor-pointer transition-all border ${
                  selectedVendorId === v._id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-transparent hover:bg-accent hover:border-border'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="truncate pr-2">
                    <div className="font-medium text-sm truncate">{v.name}</div>
                    <div
                      className={`text-xs mt-0.5 ${
                        selectedVendorId === v._id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}
                    >
                      {v.ediId}
                    </div>
                  </div>
                  <div
                    className={`text-lg font-bold ${
                      selectedVendorId === v._id ? 'text-primary-foreground' : getScoreColor(vScore)
                    }`}
                  >
                    {vScore}
                  </div>
                </div>
              </div>
            );
          })}
          {filteredVendors.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">No vendors found.</div>
          )}
        </CardContent>
      </Card>

      {/* Main Detail View */}
      <div className="md:col-span-3 space-y-6">
        {scorecard && vendor ? (
          <>
            {/* Header */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">{vendor.name}</h2>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={vendor.status === 'Active' ? 'default' : 'destructive'}>
                        {vendor.status}
                      </Badge>
                      <span className="text-muted-foreground text-sm border-l border-border pl-2 ml-1">
                        ID: {vendor.ediId}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Overall Score
                    </div>
                    <div className={`text-4xl font-black ${getScoreColor(scorecard.totalScore)}`}>
                      {scorecard.totalScore}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Period: {scorecard.period}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Negotiation Strategy Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Actionable Intelligence
              </h3>

              {!strategy ? (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="py-8 flex flex-col items-center justify-center text-center">
                    <p className="text-muted-foreground mb-4 max-w-md">
                      Nexus AI can analyze {vendor.name}&apos;s performance history, discrepancies, and
                      scores to generate a data-backed negotiation strategy.
                    </p>
                    <Button onClick={handleGenerateStrategy} disabled={isGeneratingStrategy}>
                      {isGeneratingStrategy ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <ClipboardList className="h-4 w-4 mr-2" />
                      )}
                      Generate Negotiation Strategy
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
                  <Card className="overflow-hidden">
                    <CardHeader className="bg-primary text-primary-foreground py-4">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>Strategy: {strategy.strategyName}</span>
                        <Badge variant="outline" className="text-primary-foreground border-primary-foreground/20">
                          AI Generated
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 grid md:grid-cols-2 gap-8">
                      <div>
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                          Key Leverage Points
                        </h4>
                        <ul className="space-y-2">
                          {strategy.keyLeveragePoints?.map((p, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-sm bg-accent/50 p-2 rounded"
                            >
                              <div className="h-5 w-5 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0 text-xs font-bold">
                                {i + 1}
                              </div>
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                            Opening Statement
                          </h4>
                          <div className="p-3 bg-primary/5 text-sm italic rounded-lg border border-primary/10">
                            &quot;{strategy.openingStatement}&quot;
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                            Recommended Goal
                          </h4>
                          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            {strategy.recommendedGoal}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <div className="bg-accent/50 p-3 flex justify-end border-t">
                      <Button variant="ghost" size="sm" onClick={() => setStrategy(null)}>
                        Reset
                      </Button>
                    </div>
                  </Card>
                </div>
              )}
            </div>

            {/* Charts */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Score Composition</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart
                        cx="50%"
                        cy="50%"
                        outerRadius="75%"
                        data={scorecard.components.map((c) => ({
                          subject: c.metric,
                          A: c.score,
                          fullMark: 100,
                        }))}
                      >
                        <PolarGrid className="stroke-border" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar
                          name="Score"
                          dataKey="A"
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--primary))"
                          fillOpacity={0.2}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: '8px',
                            border: 'none',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            backgroundColor: 'hsl(var(--card))',
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Metric Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-5">
                    {scorecard.components.map((comp) => (
                      <div key={comp.metric} className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{comp.metric}</span>
                          <span className="font-bold">{comp.score}/100</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              comp.score >= 90
                                ? 'bg-primary'
                                : comp.score >= 75
                                ? 'bg-chart-2'
                                : 'bg-destructive'
                            }`}
                            style={{ width: `${comp.score}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>Weight: {(comp.weight * 100).toFixed(0)}%</span>
                          <span className={comp.score < 75 ? 'text-destructive' : ''}>
                            {comp.score >= 90 ? 'Excellent' : comp.score >= 75 ? 'Good' : 'Needs Improvement'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Historical Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Historical Performance (12 Months)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={scorecard.history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                      <XAxis
                        dataKey="date"
                        className="text-muted-foreground"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        className="text-muted-foreground"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, 100]}
                      />
                      <Tooltip
                        cursor={{ fill: 'hsl(var(--accent))' }}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          borderRadius: '8px',
                          border: '1px solid hsl(var(--border))',
                        }}
                      />
                      <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            Select a vendor to view details
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

