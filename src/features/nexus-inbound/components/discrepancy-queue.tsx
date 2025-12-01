'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sparkles,
  Loader2,
  FileText,
  X,
} from 'lucide-react';
import { useMutation, useAction } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type {
  InboundDashboardData,
  InboundDiscrepancy,
  DiscrepancyStatus,
  ResolutionOutcome,
} from '../types';
import { RESOLUTION_OUTCOMES } from '../types';

interface DiscrepancyQueueProps {
  data: InboundDashboardData;
}

export function DiscrepancyQueue({ data }: DiscrepancyQueueProps) {
  const { discrepancies } = data;
  const updateDiscrepancy = useMutation(api.nexusInbound.updateDiscrepancy);
  const analyze = useAction(api.nexusInboundActions.analyzeDiscrepancyAction);
  const generateEmail = useAction(api.nexusInboundActions.generateResolutionEmailAction);

  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<{
    recommendation: string;
    reasoning: string;
    emailDraft: string;
  } | null>(null);
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState<InboundDiscrepancy | null>(null);

  // Manual Resolution State
  const [isResolvingManually, setIsResolvingManually] = useState(false);
  const [manualResolutionNote, setManualResolutionNote] = useState('');
  const [manualOutcome, setManualOutcome] = useState<ResolutionOutcome | ''>('');
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Resolved':
        return 'default';
      case 'Chargeback Pending':
      case 'Credit Pending':
      case 'RTV Pending':
      case 'Pending Vendor':
        return 'secondary';
      case 'Dispute In Progress':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return 'destructive';
      case 'High':
        return 'destructive';
      case 'Medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handleRowClick = (d: InboundDiscrepancy) => {
    if (selectedDiscrepancy?._id === d._id) return;
    setSelectedDiscrepancy(d);
    setAiResult(null);
    setIsResolvingManually(false);
    setManualResolutionNote('');
    setManualOutcome('');
  };

  const handleAIAnalyze = async (d: InboundDiscrepancy, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setAnalyzingId(d._id);
    setSelectedDiscrepancy(d);
    setAiResult(null);

    try {
      const result = await analyze({ discrepancy: d });
      setAiResult(result);
    } catch {
      alert('AI Analysis failed.');
    }
    setAnalyzingId(null);
  };

  const handleApplyResolution = async () => {
    if (!selectedDiscrepancy || !aiResult) return;
    await updateDiscrepancy({
      id: selectedDiscrepancy._id,
      status: 'Resolved' as DiscrepancyStatus,
      resolutionNote: `AI Recommendation Applied: ${aiResult.recommendation}`,
      resolvedAt: new Date().toISOString(),
    });
    setSelectedDiscrepancy(null);
    setAiResult(null);
  };

  const confirmManualResolution = async () => {
    if (!selectedDiscrepancy || !manualOutcome) return;
    await updateDiscrepancy({
      id: selectedDiscrepancy._id,
      status: 'Resolved' as DiscrepancyStatus,
      resolutionNote: manualResolutionNote,
      resolutionOutcome: manualOutcome as ResolutionOutcome,
      resolvedAt: new Date().toISOString(),
    });
    setIsResolvingManually(false);
    setSelectedDiscrepancy(null);
    setManualResolutionNote('');
    setManualOutcome('');
  };

  const generateEmailDraft = async () => {
    if (!selectedDiscrepancy || !manualOutcome) return;
    setIsGeneratingEmail(true);
    try {
      const draft = await generateEmail({ discrepancy: selectedDiscrepancy, outcome: manualOutcome });
      setManualResolutionNote(draft || '');
    } catch (e) {
      console.error(e);
    }
    setIsGeneratingEmail(false);
  };

  const closeDetails = () => {
    setSelectedDiscrepancy(null);
    setAiResult(null);
    setIsResolvingManually(false);
    setManualResolutionNote('');
    setManualOutcome('');
  };

  const resolutionOutcomes = RESOLUTION_OUTCOMES;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Discrepancy Queue
        </h2>
        <p className="text-muted-foreground">
          Manage receipt variances and quality failures. {discrepancies.filter(d => d.status !== 'Resolved').length} open issues.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List View */}
        <Card
          className={`transition-all duration-300 ${
            selectedDiscrepancy ? 'lg:col-span-2' : 'lg:col-span-3'
          }`}
        >
          <CardHeader>
            <CardTitle>Active Issues</CardTitle>
          </CardHeader>
          <div className="overflow-auto max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor / PO</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discrepancies.map((d) => (
                  <TableRow
                    key={d._id}
                    onClick={() => handleRowClick(d)}
                    className={`cursor-pointer transition-colors ${
                      selectedDiscrepancy?._id === d._id
                        ? 'bg-accent border-l-4 border-l-primary'
                        : 'hover:bg-accent/50'
                    }`}
                  >
                    <TableCell>
                      <div className="font-medium">{d.vendorName}</div>
                      <div className="text-xs text-muted-foreground font-mono">{d.poNumber}</div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{d.type.replace(/([A-Z])/g, ' $1').trim()}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getSeverityVariant(d.severity)}>{d.severity}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(d.status)}>{d.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => handleAIAnalyze(d, e)}
                        disabled={analyzingId === d._id}
                      >
                        {analyzingId === d._id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {discrepancies.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No discrepancies found. Good job!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Detail View */}
        {selectedDiscrepancy && (
          <Card className="animate-in slide-in-from-right-4 duration-300">
            <CardHeader className="border-b py-4 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Details</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={closeDetails}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div>
                <Badge variant="outline" className="font-mono text-xs mb-2">
                  {selectedDiscrepancy._id}
                </Badge>
                <h3 className="text-lg font-bold">
                  {selectedDiscrepancy.type.replace(/([A-Z])/g, ' $1').trim()}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{selectedDiscrepancy.description}</p>
              </div>

              <div className="flex gap-2">
                <Badge variant={getSeverityVariant(selectedDiscrepancy.severity)}>
                  {selectedDiscrepancy.severity}
                </Badge>
                <Badge variant={getStatusBadgeVariant(selectedDiscrepancy.status)}>
                  {selectedDiscrepancy.status}
                </Badge>
              </div>

              {selectedDiscrepancy.status !== 'Resolved' && !isResolvingManually && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    className="flex-1"
                    onClick={(e) => handleAIAnalyze(selectedDiscrepancy, e)}
                    disabled={analyzingId === selectedDiscrepancy._id}
                  >
                    {analyzingId === selectedDiscrepancy._id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    AI Assist
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => setIsResolvingManually(true)}>
                    Resolve Manually
                  </Button>
                </div>
              )}

              {isResolvingManually && (
                <div className="space-y-4 pt-4 border-t animate-in fade-in">
                  <div className="space-y-2">
                    <Label>Resolution Outcome</Label>
                    <Select
                      value={manualOutcome}
                      onValueChange={(value) => setManualOutcome(value as ResolutionOutcome)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select outcome..." />
                      </SelectTrigger>
                      <SelectContent>
                        {resolutionOutcomes.map((outcome) => (
                          <SelectItem key={outcome} value={outcome}>
                            {outcome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {manualOutcome && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label>Resolution Note / Email</Label>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={generateEmailDraft}
                          disabled={isGeneratingEmail}
                        >
                          {isGeneratingEmail ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <Sparkles className="h-3 w-3 mr-1" />
                          )}
                          AI Draft
                        </Button>
                      </div>
                      <Textarea
                        value={manualResolutionNote}
                        onChange={(e) => setManualResolutionNote(e.target.value)}
                        placeholder="Enter resolution details..."
                        className="min-h-[120px]"
                      />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button onClick={confirmManualResolution} className="flex-1" disabled={!manualOutcome}>
                      Confirm Resolution
                    </Button>
                    <Button variant="outline" onClick={() => setIsResolvingManually(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {aiResult && (
                <div className="mt-4 bg-primary/5 p-4 rounded-lg border border-primary/20 space-y-3">
                  <h4 className="font-bold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI Recommendation
                  </h4>
                  <p className="text-sm font-semibold">{aiResult.recommendation}</p>
                  <p className="text-xs text-muted-foreground">{aiResult.reasoning}</p>
                  <div className="pt-2">
                    <Label className="text-xs">Draft Email:</Label>
                    <div className="mt-1 p-3 bg-card rounded border text-sm font-mono whitespace-pre-wrap">
                      {aiResult.emailDraft}
                    </div>
                  </div>
                  <Button onClick={handleApplyResolution} className="w-full">
                    Apply & Resolve
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

