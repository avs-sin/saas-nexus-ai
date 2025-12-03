"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Loader2, Factory, Calendar, Target, User, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  getWorkOrderStatusColor,
  getPriorityColor,
  formatDate,
  type WorkOrder,
} from "../types";
import { Id } from "../../../../convex/_generated/dataModel";
import { useState } from "react";

export function WorkOrders() {
  const tenantExists = useQuery(api.tenants.exists);
  const workOrders = useQuery(
    api.nexusProduction.getWorkOrders,
    tenantExists ? {} : "skip"
  ) as WorkOrder[] | null | undefined;
  const updateWorkOrder = useMutation(api.nexusProduction.updateWorkOrder);

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Loading state
  if (workOrders === undefined) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">Loading work orders...</p>
      </div>
    );
  }

  if (!workOrders || workOrders.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Work Orders</h2>
          <p className="text-muted-foreground">No work orders found. Seed production data first.</p>
        </div>
      </div>
    );
  }

  const handleStatusChange = async (woId: Id<"nexusWorkOrders">, newStatus: string) => {
    setUpdatingId(woId);
    try {
      const updates: { status: string; actualStart?: string; actualEnd?: string } = { status: newStatus };
      
      if (newStatus === "in_progress" && !workOrders.find(wo => wo._id === woId)?.actualStart) {
        updates.actualStart = new Date().toISOString().split("T")[0];
      }
      if (newStatus === "completed") {
        updates.actualEnd = new Date().toISOString().split("T")[0];
      }
      
      await updateWorkOrder({ woId, ...updates });
    } catch (error) {
      console.error("Failed to update work order:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  const getNextStatus = (currentStatus: string): string | null => {
    const statusFlow: Record<string, string> = {
      draft: "scheduled",
      scheduled: "released",
      released: "in_progress",
      in_progress: "completed",
    };
    return statusFlow[currentStatus] || null;
  };

  const getStatusAction = (status: string): string => {
    const actions: Record<string, string> = {
      draft: "Schedule",
      scheduled: "Release",
      released: "Start",
      in_progress: "Complete",
    };
    return actions[status] || "";
  };

  // Group by status
  const inProgress = workOrders.filter((wo) => wo.status === "in_progress");
  const scheduled = workOrders.filter((wo) => wo.status === "scheduled" || wo.status === "released");
  const drafts = workOrders.filter((wo) => wo.status === "draft");
  const completed = workOrders.filter((wo) => wo.status === "completed");

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Work Orders</h2>
        <p className="text-muted-foreground">
          Manage production work orders for pillow manufacturing
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Factory className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgress.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scheduled.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <Target className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{drafts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completed.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Work Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Work Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>WO Number</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Line</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workOrders.map((wo) => {
                const progress = wo.qtyPlanned > 0
                  ? Math.round((wo.qtyCompleted / wo.qtyPlanned) * 100)
                  : 0;
                const nextStatus = getNextStatus(wo.status);

                return (
                  <TableRow key={wo._id}>
                    <TableCell className="font-medium">{wo.woNumber}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{wo.finishedName}</p>
                        <p className="text-xs text-muted-foreground">{wo.finishedSku}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p>
                          {wo.qtyCompleted}/{wo.qtyPlanned}
                        </p>
                        {wo.qtyRejected > 0 && (
                          <p className="text-xs text-destructive">
                            {wo.qtyRejected} rejected
                          </p>
                        )}
                        {wo.status === "in_progress" && (
                          <div className="w-20 h-1.5 bg-muted rounded-full mt-1">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{formatDate(wo.scheduledStart)}</p>
                        <p className="text-xs text-muted-foreground">
                          → {formatDate(wo.scheduledEnd)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(wo.priority)}>{wo.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getWorkOrderStatusColor(wo.status)}>
                        {wo.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {wo.lineAssignment ? (
                        <div className="flex items-center gap-1 text-sm">
                          <User className="h-3 w-3" />
                          {wo.lineAssignment}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {nextStatus && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(wo._id, nextStatus)}
                          disabled={updatingId === wo._id}
                        >
                          {updatingId === wo._id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            getStatusAction(wo.status)
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}







