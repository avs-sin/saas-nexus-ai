'use client';

import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, AlertTriangle, CheckCircle2, Package, ArrowUpRight, Sparkles, Loader2 } from 'lucide-react';
import { useAction } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { InboundDashboardData } from '../types';

interface DashboardProps {
  data: InboundDashboardData;
}

export function InboundDashboard({ data }: DashboardProps) {
  const { discrepancies, ediLogs, scorecards, pos } = data;
  const [briefing, setBriefing] = useState<string>('');
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const generateBriefing = useAction(api.nexusInboundActions.generateDashboardBriefingAction);

  const avgScore = scorecards.length > 0
    ? Math.round(scorecards.reduce((acc, s) => acc + s.totalScore, 0) / scorecards.length * 10) / 10
    : 0;

  const receivedLinesCount = pos.reduce((acc, po) => {
    return acc + (po.lines.filter((l) => l.qtyReceived > 0).length || 0);
  }, 0);

  const trendData = scorecards.length > 0 ? scorecards[0].history : [];
  const openDiscrepancyCount = discrepancies.filter((d) => d.status !== 'Resolved').length;

  const fetchBriefing = async () => {
    setLoadingBriefing(true);
    try {
      const text = await generateBriefing({ discrepancies, pos, scorecards });
      setBriefing(text || 'System operational.');
    } catch {
      setBriefing("AI Service Unavailable");
    }
    setLoadingBriefing(false);
  };

  useEffect(() => {
    fetchBriefing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discrepancies.length, pos.length]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Inbound Dashboard
        </h2>
        <p className="text-muted-foreground">
          Nexus AI is monitoring {pos.length} purchase orders and {scorecards.length} vendors.
        </p>
      </div>

      {/* AI Daily Briefing Section - Matching NexusPlan style */}
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
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2 text-primary font-medium text-xs uppercase tracking-wider">
                  <Sparkles className="h-4 w-4" /> Morning Briefing
                </div>
                <h3 className="text-xl md:text-2xl font-semibold leading-tight text-foreground">
                  &ldquo;{briefing}&rdquo;
                </h3>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI Cards - Matching NexusPlan style */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Receipts (WTD)</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-chart-1" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{receivedLinesCount}</div>
            <p className="text-xs text-muted-foreground">Line items received</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Discrepancies</CardTitle>
            <AlertTriangle className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openDiscrepancyCount}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Vendor Score</CardTitle>
            <Activity className="h-4 w-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgScore}</div>
            <p className="text-xs text-muted-foreground">Across {scorecards.length} active vendors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">EDI Throughput</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ediLogs.length}</div>
            <p className="text-xs text-muted-foreground">Messages processed</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Split - Matching NexusPlan layout */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Chart */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Vendor Quality Trends</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis dataKey="date" className="text-muted-foreground" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis className="text-muted-foreground" fontSize={12} tickLine={false} axisLine={false} domain={[60, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: 'hsl(var(--background))' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* EDI Log */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>EDI Ingestion Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ediLogs.slice(0, 6).map((msg) => (
                <div key={msg._id} className="flex items-center">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">EDI {msg.type} - {msg.direction}</p>
                    <p className="text-xs text-muted-foreground">{msg.partner}</p>
                  </div>
                  <div className="ml-auto">
                    <Badge
                      variant={msg.status === 'Processed' ? 'default' : 'destructive'}
                    >
                      {msg.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {ediLogs.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No EDI messages yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

