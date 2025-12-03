"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Loader2,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  ShoppingCart,
  Calendar,
  TrendingUp,
  Package,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getUrgencyColor,
  getSuggestionStatusColor,
  formatCurrency,
  formatDate,
  getDaysUntil,
  type ProductionDashboardData,
  type MRPAnalysis,
} from "../types";
import { Id } from "../../../../convex/_generated/dataModel";

export function MRPPlanner() {
  const tenantExists = useQuery(api.tenants.exists);
  const data = useQuery(
    api.nexusProduction.getDashboardData,
    tenantExists ? {} : "skip"
  ) as ProductionDashboardData | null | undefined;
  
  const runMRPAnalysis = useAction(api.nexusProductionActions.generateMRPAnalysisAction);
  const updateSuggestionStatus = useMutation(api.nexusProduction.updateSuggestionStatus);
  const saveSuggestion = useMutation(api.nexusProduction.saveMaterialSuggestion);

  const [mrpResults, setMrpResults] = useState<MRPAnalysis | null>(null);
  const [isRunningMRP, setIsRunningMRP] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Loading state
  if (data === undefined) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">Loading MRP data...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">MRP Planner</h2>
          <p className="text-muted-foreground">No production data found. Seed data first.</p>
        </div>
      </div>
    );
  }

  const handleRunMRP = async () => {
    setIsRunningMRP(true);
    try {
      const results = await runMRPAnalysis({
        workOrders: data.workOrders,
        boms: data.boms,
        rawMaterials: data.rawMaterials,
        rawInventory: data.rawInventory,
        planningHorizonDays: 30,
      });
      setMrpResults(results as MRPAnalysis);

      // Save new suggestions to database
      for (const req of results.requirements) {
        if (req.suggestedOrderQty > 0) {
          await saveSuggestion({
            materialSku: req.materialSku,
            materialName: req.materialName,
            suggestedQty: req.suggestedOrderQty,
            suggestedOrderDate: req.orderByDate,
            neededByDate: req.neededByDate,
            reason: `Need ${Math.round(req.totalNeeded)} units for: ${req.drivingWorkOrders.join(", ")}. Available: ${req.currentAvailable}`,
            urgency: req.urgency,
            linkedWorkOrders: req.drivingWorkOrders,
            estimatedCost: req.estimatedCost,
          });
        }
      }
    } catch (error) {
      console.error("MRP analysis failed:", error);
    } finally {
      setIsRunningMRP(false);
    }
  };

  const handleSuggestionAction = async (
    suggestionId: Id<"nexusMaterialSuggestions">,
    action: "accepted" | "dismissed" | "ordered"
  ) => {
    setUpdatingId(suggestionId);
    try {
      await updateSuggestionStatus({ suggestionId, status: action });
    } catch (error) {
      console.error("Failed to update suggestion:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingSuggestions = data.suggestions.filter((s) => s.status === "pending");
  const historySuggestions = data.suggestions.filter((s) => s.status !== "pending");

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">MRP Planner</h2>
          <p className="text-muted-foreground">
            AI-powered Material Requirements Planning for production
          </p>
        </div>
        <Button onClick={handleRunMRP} disabled={isRunningMRP} className="gap-2">
          {isRunningMRP ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Run MRP Analysis
            </>
          )}
        </Button>
      </div>

      {/* MRP Results */}
      {mrpResults && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle>AI Analysis Results</CardTitle>
            </div>
            <CardDescription>
              Generated {formatDate(mrpResults.generatedAt)} • {mrpResults.planningHorizonDays}-day horizon
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="p-4 bg-card rounded-lg border">
              <h4 className="font-semibold text-lg mb-2">&ldquo;{mrpResults.summary.headline}&rdquo;</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Materials Analyzed</p>
                  <p className="text-xl font-bold">{mrpResults.summary.totalMaterialsNeeded}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">In Stock</p>
                  <p className="text-xl font-bold text-emerald-600">{mrpResults.summary.materialsInStock}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Need to Order</p>
                  <p className="text-xl font-bold text-amber-600">{mrpResults.summary.materialsToOrder}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Critical</p>
                  <p className="text-xl font-bold text-red-600">{mrpResults.summary.criticalShortages}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Est. Cost</p>
                  <p className="text-xl font-bold">{formatCurrency(mrpResults.summary.totalEstimatedCost)}</p>
                </div>
              </div>
            </div>

            {/* Alerts */}
            {mrpResults.alerts.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  AI Alerts
                </h4>
                <div className="space-y-2">
                  {mrpResults.alerts.map((alert, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border ${
                        alert.severity === "critical"
                          ? "bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800"
                          : alert.severity === "high"
                          ? "bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800"
                          : "bg-muted border-border"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{alert.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            💡 {alert.recommendation}
                          </p>
                        </div>
                        <Badge className={getUrgencyColor(alert.severity)}>{alert.severity}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Requirements Table */}
            {mrpResults.requirements.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Material Requirements</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-right">Needed</TableHead>
                      <TableHead className="text-right">Available</TableHead>
                      <TableHead className="text-right">Shortfall</TableHead>
                      <TableHead className="text-right">Order Qty</TableHead>
                      <TableHead>Order By</TableHead>
                      <TableHead>Urgency</TableHead>
                      <TableHead className="text-right">Est. Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mrpResults.requirements.map((req, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{req.materialName}</p>
                            <p className="text-xs text-muted-foreground">{req.materialSku}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{Math.round(req.totalNeeded)}</TableCell>
                        <TableCell className="text-right">{req.currentAvailable}</TableCell>
                        <TableCell className="text-right text-destructive font-medium">
                          {req.shortfall}
                        </TableCell>
                        <TableCell className="text-right font-medium">{req.suggestedOrderQty}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{formatDate(req.orderByDate)}</p>
                            <p className="text-xs text-muted-foreground">
                              {getDaysUntil(req.orderByDate) < 0
                                ? "OVERDUE"
                                : `${getDaysUntil(req.orderByDate)} days`}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getUrgencyColor(req.urgency)}>{req.urgency}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(req.estimatedCost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pending Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Pending Purchase Suggestions
          </CardTitle>
          <CardDescription>
            AI-generated recommendations awaiting action
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingSuggestions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Order By</TableHead>
                  <TableHead>Needed By</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead className="text-right">Est. Cost</TableHead>
                  <TableHead>Work Orders</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingSuggestions.map((suggestion) => (
                  <TableRow key={suggestion._id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{suggestion.materialName}</p>
                        <p className="text-xs text-muted-foreground">{suggestion.materialSku}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">{suggestion.suggestedQty}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(suggestion.suggestedOrderDate)}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(suggestion.neededByDate)}</TableCell>
                    <TableCell>
                      <Badge className={getUrgencyColor(suggestion.urgency)}>{suggestion.urgency}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(suggestion.estimatedCost)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {suggestion.linkedWorkOrders.slice(0, 2).map((wo) => (
                          <Badge key={wo} variant="outline" className="text-xs">
                            {wo}
                          </Badge>
                        ))}
                        {suggestion.linkedWorkOrders.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{suggestion.linkedWorkOrders.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleSuggestionAction(suggestion._id, "ordered")}
                          disabled={updatingId === suggestion._id}
                        >
                          {updatingId === suggestion._id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Create PO"
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSuggestionAction(suggestion._id, "dismissed")}
                          disabled={updatingId === suggestion._id}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-muted-foreground">No pending suggestions</p>
              <p className="text-sm text-muted-foreground mt-1">
                Run MRP Analysis to generate new recommendations
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      {historySuggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Suggestion History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Est. Cost</TableHead>
                  <TableHead>Generated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historySuggestions.slice(0, 10).map((suggestion) => (
                  <TableRow key={suggestion._id}>
                    <TableCell>
                      <p className="font-medium">{suggestion.materialName}</p>
                    </TableCell>
                    <TableCell className="text-right">{suggestion.suggestedQty}</TableCell>
                    <TableCell>
                      <Badge className={getSuggestionStatusColor(suggestion.status)}>
                        {suggestion.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(suggestion.estimatedCost)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(suggestion.generatedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}







