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
import { Input } from '@/components/ui/input';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  Package,
  Save,
  Sparkles,
  Wand2,
  ClipboardCheck,
  ArrowRight,
  Truck,
} from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type {
  InboundDashboardData,
  InboundPurchaseOrder,
  POStatus,
  DiscrepancyType,
  DiscrepancyStatus,
  QualityIssueType,
  InspectionDetails,
} from '../types';

interface LineState {
  receivedQty: number;
  inspection: InspectionDetails;
}

interface ReceivingTerminalProps {
  data: InboundDashboardData;
}

export function ReceivingTerminal({ data }: ReceivingTerminalProps) {
  const { pos, vendors } = data;
  const addDiscrepancy = useMutation(api.nexusInbound.createDiscrepancy);
  const updatePO = useMutation(api.nexusInbound.updatePO);
  const addPO = useMutation(api.nexusInbound.addPO);

  const [searchTerm, setSearchTerm] = useState('');
  const [activePO, setActivePO] = useState<InboundPurchaseOrder | null>(null);
  const [lineStates, setLineStates] = useState<Record<string, LineState>>({});
  const [successMsg, setSuccessMsg] = useState('');
  const [aiWarning, setAiWarning] = useState<string | null>(null);

  // Modal State
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [currentInspectLineId, setCurrentInspectLineId] = useState<string | null>(null);
  const [tempInspection, setTempInspection] = useState<InspectionDetails | null>(null);

  const initializePO = (po: InboundPurchaseOrder) => {
    setActivePO(po);
    const initialStates: Record<string, LineState> = {};
    po.lines.forEach((l) => {
      initialStates[l.id] = {
        receivedQty: l.qtyReceived || 0,
        inspection: {
          required: false,
          personnelCount: 1,
          laborHours: 0,
          issueFound: false,
        },
      };
    });
    setLineStates(initialStates);
    setSuccessMsg('');

    if (po.vendorName.includes('Globex')) {
      setAiWarning(
        "AI Risk Alert: Vendor has a 35% historically high defect rate. Recommend 100% sampling."
      );
    } else {
      setAiWarning(null);
    }
  };

  const handleSearch = () => {
    const po = pos.find((p) =>
      p.poNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (po) {
      initializePO(po);
    } else {
      alert('PO Not found');
    }
  };

  const handleSimulatePO = async () => {
    if (vendors.length === 0) return;
    const vendor = vendors[Math.floor(Math.random() * vendors.length)];
    const idNum = 10050 + Math.floor(Math.random() * 10000);

    await addPO({
      poNumber: `PO-${idNum}`,
      vendorId: vendor._id,
      vendorName: vendor.name,
      dateOrdered: new Date().toISOString().split('T')[0],
      datePromised: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      status: 'Open' as POStatus,
      lines: [
        {
          id: `l-${Date.now()}-1`,
          itemSku: `SKU-${100 + Math.floor(Math.random() * 900)}`,
          description: 'Incoming Raw Material',
          qtyOrdered: 500,
          qtyReceived: 0,
          unitPrice: 20,
          uom: 'EA',
        },
      ],
    });
    setSuccessMsg(`Incoming Shipment PO-${idNum} from ${vendor.name} has been queued.`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleAutoFill = () => {
    if (!activePO) return;
    setLineStates((prev) => {
      const next = { ...prev };
      activePO.lines.forEach((l) => {
        if (next[l.id]) next[l.id].receivedQty = l.qtyOrdered;
      });
      return next;
    });
  };

  const updateLineQty = (lineId: string, val: string) => {
    setLineStates((prev) => ({
      ...prev,
      [lineId]: { ...prev[lineId], receivedQty: parseInt(val) || 0 },
    }));
  };

  const openInspection = (lineId: string) => {
    setCurrentInspectLineId(lineId);
    const currentInspection = lineStates[lineId].inspection;
    setTempInspection({
      ...currentInspection,
      startedAt: currentInspection.startedAt || new Date().toISOString(),
    });
    setInspectModalOpen(true);
  };

  const saveInspection = () => {
    if (currentInspectLineId && tempInspection) {
      const minutes = tempInspection.durationMinutes || 0;
      const hours = parseFloat(((minutes / 60) * tempInspection.personnelCount).toFixed(2));
      setLineStates((prev) => ({
        ...prev,
        [currentInspectLineId]: {
          ...prev[currentInspectLineId],
          inspection: {
            ...tempInspection,
            laborHours: hours,
            endedAt: new Date().toISOString(),
          },
        },
      }));
      setInspectModalOpen(false);
    }
  };

  const handleSubmit = async () => {
    if (!activePO) return;

    let discrepanciesCreated = 0;
    const updatedLines = activePO.lines.map((line) => {
      const state = lineStates[line.id];
      return { ...line, qtyReceived: state.receivedQty };
    });

    for (const line of activePO.lines) {
      const state = lineStates[line.id];
      const variance = state.receivedQty - line.qtyOrdered;

      if (variance !== 0) {
        await addDiscrepancy({
          poNumber: activePO.poNumber,
          vendorName: activePO.vendorName,
          type: variance < 0 ? ('QuantityShortage' as DiscrepancyType) : ('QuantityOverage' as DiscrepancyType),
          severity: 'Medium',
          description: `Variance detected. Ordered ${line.qtyOrdered}, Received ${state.receivedQty}.`,
          status: 'Open' as DiscrepancyStatus,
          createdAt: new Date().toISOString(),
          itemSku: line.itemSku,
          expectedQty: line.qtyOrdered,
          receivedQty: state.receivedQty,
        });
        discrepanciesCreated++;
      }

      if (state.inspection.issueFound) {
        await addDiscrepancy({
          poNumber: activePO.poNumber,
          vendorName: activePO.vendorName,
          type: 'QualityFailure' as DiscrepancyType,
          severity: state.inspection.severity || 'High',
          description: `Quality Issue: ${state.inspection.issueType}.`,
          status: 'Open' as DiscrepancyStatus,
          createdAt: new Date().toISOString(),
          itemSku: line.itemSku,
          qualityIssueType: state.inspection.issueType as QualityIssueType,
          inspectionDetails: state.inspection,
        });
        discrepanciesCreated++;
      }
    }

    // Update PO Status
    await updatePO({
      id: activePO._id,
      status: discrepanciesCreated > 0 ? ('Partial' as POStatus) : ('Closed' as POStatus),
      lines: updatedLines,
    });

    if (discrepanciesCreated > 0) {
      alert(`${discrepanciesCreated} discrepancies recorded.`);
    } else {
      setSuccessMsg('Receipt finalized successfully. No issues.');
    }

    setTimeout(() => {
      setActivePO(null);
      setSearchTerm('');
      setSuccessMsg('');
      setAiWarning(null);
    }, 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Receiving Terminal
          </h2>
          <p className="text-muted-foreground">
            Scan PO, ASN, or LPN to begin receiving. {pos.filter(p => p.status === 'Open').length} orders pending.
          </p>
        </div>
        {!activePO && (
          <Button onClick={handleSimulatePO}>
            <Truck className="mr-2 h-4 w-4" /> Simulate Inbound Shipment
          </Button>
        )}
      </div>

      {!activePO && (
        <div className="space-y-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Scan Barcode or Enter PO # (e.g., PO-10045)"
                    className="text-lg h-12 pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <Button size="lg" onClick={handleSearch} className="px-8">
                  Lookup Order
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h3 className="text-lg font-bold">Incoming Queue</h3>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">PO Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Contents</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pos
                    .filter((p) => p.status === 'Open' || p.status === 'Partial')
                    .map((po) => (
                      <TableRow
                        key={po._id}
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => initializePO(po)}
                      >
                        <TableCell className="font-semibold">{po.poNumber}</TableCell>
                        <TableCell>{po.vendorName}</TableCell>
                        <TableCell>{po.datePromised}</TableCell>
                        <TableCell>{po.lines.length} Line Items</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost">
                            Receive <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  {pos.filter((p) => p.status === 'Open' || p.status === 'Partial').length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No open orders in the queue.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>
        </div>
      )}

      {activePO && (
        <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CardHeader className="border-b flex flex-row justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <CardTitle className="text-2xl">{activePO.poNumber}</CardTitle>
              <Badge variant="outline">{activePO.status}</Badge>
            </div>
            <Button variant="secondary" size="sm" onClick={handleAutoFill}>
              <Wand2 className="mr-2 h-3 w-3" /> Auto-Fill
            </Button>
          </CardHeader>
          {aiWarning && (
            <div className="bg-amber-500/10 border-b border-amber-500/20 p-4 text-amber-700 dark:text-amber-400">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span className="font-medium">AI Risk Alert:</span>
              </div>
              <p className="mt-1 text-sm">{aiWarning}</p>
            </div>
          )}
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">SKU / Description</TableHead>
                  <TableHead className="text-right">Ordered</TableHead>
                  <TableHead className="w-[180px] text-right">Received Qty</TableHead>
                  <TableHead className="text-center w-[180px]">QC Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activePO.lines.map((line) => {
                  const state = lineStates[line.id];
                  return (
                    <TableRow key={line.id}>
                      <TableCell className="pl-6 py-4">
                        <div className="font-bold">{line.itemSku}</div>
                        <div className="text-sm text-muted-foreground">{line.description}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {line.qtyOrdered} {line.uom}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          className="text-right font-mono font-medium"
                          value={state?.receivedQty || 0}
                          onChange={(e) => updateLineQty(line.id, e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant={
                            state?.inspection.issueFound
                              ? 'destructive'
                              : state?.inspection.required
                              ? 'secondary'
                              : 'outline'
                          }
                          size="sm"
                          onClick={() => openInspection(line.id)}
                        >
                          <ClipboardCheck className="mr-2 h-3 w-3" />
                          {state?.inspection.issueFound ? 'Defect' : 'Inspect'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="p-6 border-t flex justify-end gap-3 items-center">
              <Button variant="outline" onClick={() => setActivePO(null)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} className="px-6">
                <Save className="mr-2 h-4 w-4" /> Finalize Receipt
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inspection Modal */}
      <Dialog open={inspectModalOpen} onOpenChange={setInspectModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Line Inspection & Quality Control</DialogTitle>
            <DialogDescription>
              Record inspection results and any quality issues found.
            </DialogDescription>
          </DialogHeader>
          {tempInspection && (
            <div className="space-y-6 py-4">
              <div className="flex items-center justify-between">
                <Label>Quality Issue Found?</Label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={tempInspection.issueFound ? 'destructive' : 'outline'}
                    onClick={() =>
                      setTempInspection((prev) => (prev ? { ...prev, issueFound: true } : null))
                    }
                  >
                    Yes
                  </Button>
                  <Button
                    size="sm"
                    variant={!tempInspection.issueFound ? 'default' : 'outline'}
                    onClick={() =>
                      setTempInspection((prev) => (prev ? { ...prev, issueFound: false } : null))
                    }
                  >
                    No
                  </Button>
                </div>
              </div>
              {tempInspection.issueFound && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Issue Type</Label>
                    <Select
                      value={tempInspection.issueType || ''}
                      onValueChange={(value) =>
                        setTempInspection((prev) =>
                          prev ? { ...prev, issueType: value as QualityIssueType } : null
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select issue type..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Damage">Damage</SelectItem>
                        <SelectItem value="Contamination">Contamination</SelectItem>
                        <SelectItem value="Wrong SKU">Wrong SKU</SelectItem>
                        <SelectItem value="Packaging Defect">Packaging Defect</SelectItem>
                        <SelectItem value="Off-Spec Dimensions">Off-Spec Dimensions</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={tempInspection.issueDescription || ''}
                      onChange={(e) =>
                        setTempInspection((prev) =>
                          prev ? { ...prev, issueDescription: e.target.value } : null
                        )
                      }
                      placeholder="Describe the issue..."
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setInspectModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveInspection}>Save Inspection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {successMsg && (
        <div className="fixed bottom-6 right-6 p-4 bg-primary text-primary-foreground rounded-md shadow-2xl flex items-center z-50 animate-in slide-in-from-bottom-5">
          <Package className="h-5 w-5 mr-3" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}
    </div>
  );
}

