"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Calendar, Package, DollarSign, ArrowRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function POTimeline() {
  const pos = useQuery(api.nexusplan.getPurchaseOrders);
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);

  if (!pos) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  // Set initial selected PO
  const effectiveSelectedId = selectedPoId || (pos[0]?._id ?? null);
  const selectedPO = pos.find((p) => p._id === effectiveSelectedId);

  if (!selectedPO) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          PO Timeline & Versioning
        </h2>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No purchase orders found. Run seed to populate data.
          </CardContent>
        </Card>
      </div>
    );
  }

  const sortedVersions = [...selectedPO.versions].sort(
    (a, b) => b.versionNumber - a.versionNumber
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          PO Timeline & Versioning
        </h2>
        <select
          className="h-9 sm:h-10 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
          value={effectiveSelectedId ?? ""}
          onChange={(e) => setSelectedPoId(e.target.value)}
        >
          {pos.map((po) => (
            <option key={po._id} value={po._id}>
              {po.poNumber} - {po.sku}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Header Info */}
        <Card className="md:col-span-3 bg-muted/30">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl">{selectedPO.poNumber}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  SKU: {selectedPO.sku}
                </p>
              </div>
              <Badge variant={selectedPO.status === "OPEN" ? "default" : "secondary"}>
                {selectedPO.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] sm:text-xs text-muted-foreground uppercase font-bold">
                Current Qty
              </span>
              <span className="text-sm sm:text-lg font-medium text-foreground">
                {selectedPO.currentQty.toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] sm:text-xs text-muted-foreground uppercase font-bold">
                Promised Date
              </span>
              <span className="text-sm sm:text-lg font-medium text-foreground">
                {selectedPO.currentDeliveryDate}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] sm:text-xs text-muted-foreground uppercase font-bold">
                Total Revisions
              </span>
              <span className="text-sm sm:text-lg font-medium text-foreground">
                {selectedPO.versions.length}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Timeline Visualization */}
        <div className="md:col-span-3 space-y-8 relative pl-6 border-l-2 border-border ml-4">
          {sortedVersions.map((version, index) => {
            const isLatest = index === 0;
            return (
              <div key={version.versionNumber} className="relative">
                {/* Dot on line */}
                <div
                  className={`absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-card shadow-sm ${
                    isLatest ? "bg-primary" : "bg-muted-foreground/50"
                  }`}
                />

                <Card className={isLatest ? "border-primary/30 shadow-md" : "opacity-80"}>
                  <CardHeader className="pb-2">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="bg-muted">
                          v{version.versionNumber}
                        </Badge>
                        <span className="font-semibold text-sm text-foreground">
                          {version.changeType.replace("_", " ")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          by {version.changedBy}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(version.changedAt).toLocaleString()}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm italic text-muted-foreground mb-4 border-l-2 border-border pl-2">
                      &ldquo;{version.changeReason}&rdquo;
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-foreground">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{version.payload.qty} units</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{version.payload.deliveryDate}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>${version.payload.price}</span>
                      </div>
                    </div>

                    {/* Diff from previous version */}
                    {index < sortedVersions.length - 1 && (
                      <div className="mt-4 pt-4 border-t border-border bg-muted/30 -mx-6 px-6 pb-2 rounded-b-lg">
                        <p className="text-xs font-bold text-muted-foreground mb-2">
                          Changes from v{sortedVersions[index + 1].versionNumber}:
                        </p>
                        <div className="flex flex-wrap gap-4 text-sm">
                          {version.payload.qty !==
                            sortedVersions[index + 1].payload.qty && (
                            <div className="flex items-center gap-1 text-amber-600">
                              <span>
                                Qty: {sortedVersions[index + 1].payload.qty}
                              </span>
                              <ArrowRight className="h-3 w-3" />
                              <span className="font-bold">
                                {version.payload.qty}
                              </span>
                            </div>
                          )}
                          {version.payload.deliveryDate !==
                            sortedVersions[index + 1].payload.deliveryDate && (
                            <div className="flex items-center gap-1 text-amber-600">
                              <span>
                                Date:{" "}
                                {sortedVersions[index + 1].payload.deliveryDate}
                              </span>
                              <ArrowRight className="h-3 w-3" />
                              <span className="font-bold">
                                {version.payload.deliveryDate}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
