"use client";

import { useState } from "react";
import {
  Factory,
  ShoppingCart,
  Play,
  TrendingUp,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  type NexusSuggestion,
  type SuggestionType,
  type SuggestionPriority,
  type SuggestionModule,
  getPriorityColor,
  getModuleColor,
  formatRelativeTime,
} from "@/types/intelligence";

interface SuggestionCardProps {
  suggestion: NexusSuggestion;
  onAccept: (id: string) => Promise<void>;
  onDismiss: (id: string, reason?: string) => Promise<void>;
}

const typeIcons: Record<SuggestionType, React.ReactNode> = {
  work_order: <Factory className="h-5 w-5" />,
  purchase: <ShoppingCart className="h-5 w-5" />,
  release_wo: <Play className="h-5 w-5" />,
  forecast_cascade: <TrendingUp className="h-5 w-5" />,
};

const typeLabels: Record<SuggestionType, string> = {
  work_order: "Create Work Order",
  purchase: "Purchase Materials",
  release_wo: "Release Work Order",
  forecast_cascade: "Forecast Update",
};

const moduleLabels: Record<SuggestionModule, string> = {
  outbound: "Outbound",
  production: "Production",
  inbound: "Inbound",
  plan: "NexusPlan",
};

export function SuggestionCard({ suggestion, onAccept, onDismiss }: SuggestionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      await onAccept(suggestion._id);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async () => {
    setLoading(true);
    try {
      await onDismiss(suggestion._id);
    } finally {
      setLoading(false);
    }
  };

  const priorityClass = getPriorityColor(suggestion.priority as SuggestionPriority);
  const sourceColor = getModuleColor(suggestion.sourceModule as SuggestionModule);
  const targetColor = getModuleColor(suggestion.targetModule as SuggestionModule);

  return (
    <Card className={`transition-all hover:shadow-md ${suggestion.priority === "critical" ? "border-red-500/50 dark:border-red-500/30" : ""}`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`p-2 rounded-lg bg-primary/10 ${sourceColor}`}>
              {typeIcons[suggestion.type as SuggestionType]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground truncate">
                  {suggestion.title}
                </h3>
                <Badge variant="outline" className={priorityClass}>
                  {suggestion.priority}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span className={sourceColor}>
                  {moduleLabels[suggestion.sourceModule as SuggestionModule]}
                </span>
                <ArrowRight className="h-3 w-3" />
                <span className={targetColor}>
                  {moduleLabels[suggestion.targetModule as SuggestionModule]}
                </span>
                <span className="text-muted-foreground/50">•</span>
                <span>{formatRelativeTime(suggestion.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setExpanded(!expanded)}
              className="text-muted-foreground"
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Description */}
        <p className={`mt-3 text-sm text-muted-foreground ${expanded ? "" : "line-clamp-2"}`}>
          {suggestion.description}
        </p>

        {/* Expanded Details */}
        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-4">
            {/* Payload Details */}
            <div className="bg-muted/50 rounded-lg p-3">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                Recommendation Details
              </h4>
              <PayloadDetails type={suggestion.type as SuggestionType} payload={suggestion.payload} />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDismiss}
                disabled={loading}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Dismiss
              </Button>
              <Button
                size="sm"
                onClick={handleAccept}
                disabled={loading}
                className="gap-2"
              >
                <Check className="h-4 w-4" />
                Accept & Execute
              </Button>
            </div>
          </div>
        )}

        {/* Quick Actions (when collapsed) */}
        {!expanded && (
          <div className="flex items-center justify-end gap-2 mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              disabled={loading}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={handleAccept}
              disabled={loading}
            >
              <Check className="h-4 w-4 mr-1" />
              Accept
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PayloadDetails({ type, payload }: { type: SuggestionType; payload: any }) {
  switch (type) {
    case "work_order":
      return (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Product:</span>{" "}
            <span className="font-medium">{payload.finishedName}</span>
          </div>
          <div>
            <span className="text-muted-foreground">SKU:</span>{" "}
            <span className="font-medium">{payload.finishedSku}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Quantity Needed:</span>{" "}
            <span className="font-medium">{payload.suggestedQty} units</span>
          </div>
          <div>
            <span className="text-muted-foreground">In Stock:</span>{" "}
            <span className="font-medium">{payload.qtyInStock} units</span>
          </div>
          <div>
            <span className="text-muted-foreground">Scheduled Start:</span>{" "}
            <span className="font-medium">{payload.scheduledStart}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Due Date:</span>{" "}
            <span className="font-medium">{payload.scheduledEnd}</span>
          </div>
        </div>
      );

    case "purchase":
      return (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Material:</span>{" "}
            <span className="font-medium">{payload.materialName}</span>
          </div>
          <div>
            <span className="text-muted-foreground">SKU:</span>{" "}
            <span className="font-medium">{payload.materialSku}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Order Quantity:</span>{" "}
            <span className="font-medium">{payload.suggestedOrderQty}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Est. Cost:</span>{" "}
            <span className="font-medium">${payload.estimatedCost?.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Order By:</span>{" "}
            <span className="font-medium">{payload.orderByDate}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Needed By:</span>{" "}
            <span className="font-medium">{payload.neededByDate}</span>
          </div>
          {payload.linkedWorkOrders?.length > 0 && (
            <div className="col-span-2">
              <span className="text-muted-foreground">For Work Orders:</span>{" "}
              <span className="font-medium">{payload.linkedWorkOrders.join(", ")}</span>
            </div>
          )}
        </div>
      );

    case "release_wo":
      return (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Work Order:</span>{" "}
            <span className="font-medium">{payload.woNumber}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Product:</span>{" "}
            <span className="font-medium">{payload.finishedName}</span>
          </div>
          {payload.materialsReceived?.length > 0 && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Materials Received:</span>
              <ul className="mt-1 ml-4 list-disc">
                {payload.materialsReceived.map((m: any, i: number) => (
                  <li key={i} className="font-medium">
                    {m.name} ({m.qtyReceived} received)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );

    case "forecast_cascade":
      return (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">SKU:</span>{" "}
            <span className="font-medium">{payload.sku}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Period:</span>{" "}
            <span className="font-medium">{payload.periodStart}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Previous Qty:</span>{" "}
            <span className="font-medium">{payload.previousQty}</span>
          </div>
          <div>
            <span className="text-muted-foreground">New Qty:</span>{" "}
            <span className={`font-medium ${payload.percentChange > 0 ? "text-emerald-600" : "text-red-600"}`}>
              {payload.newQty} ({payload.percentChange > 0 ? "+" : ""}{payload.percentChange}%)
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Customer:</span>{" "}
            <span className="font-medium">{payload.customerName}</span>
          </div>
          {payload.impactedWorkOrders?.length > 0 && (
            <div>
              <span className="text-muted-foreground">Impacted WOs:</span>{" "}
              <span className="font-medium">{payload.impactedWorkOrders.length}</span>
            </div>
          )}
          {payload.recommendedActions?.length > 0 && (
            <div className="col-span-2 mt-2">
              <span className="text-muted-foreground">Recommended Actions:</span>
              <ul className="mt-1 ml-4 list-disc">
                {payload.recommendedActions.map((action: string, i: number) => (
                  <li key={i}>{action}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );

    default:
      return (
        <pre className="text-xs overflow-auto">
          {JSON.stringify(payload, null, 2)}
        </pre>
      );
  }
}







