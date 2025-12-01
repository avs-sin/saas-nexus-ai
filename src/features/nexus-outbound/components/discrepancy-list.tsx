"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  AlertTriangle,
  Search,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  Package,
  Truck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OutboundDiscrepancyWithDetails } from "../types";
import { getStatusColor, getSeverityColor, formatDate, formatRelativeTime } from "../types";

export function DiscrepancyList() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const discrepancies = useQuery(api.nexusOutbound.getDiscrepancies, {
    status: statusFilter !== "all" ? statusFilter : undefined,
  }) as OutboundDiscrepancyWithDetails[] | undefined;

  // Filter by search query
  const filteredDiscrepancies = discrepancies?.filter((disc) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      disc.orderNumber.toLowerCase().includes(query) ||
      disc.customerName.toLowerCase().includes(query) ||
      disc.description.toLowerCase().includes(query)
    );
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "short_ship":
        return <Package className="h-4 w-4 text-amber-500" />;
      case "wrong_item":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "damaged":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "lost":
        return <Truck className="h-4 w-4 text-red-500" />;
      case "address_issue":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "customer_refused":
        return <XCircle className="h-4 w-4 text-purple-500" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const statusCounts = {
    open: discrepancies?.filter((d) => d.status === "open").length ?? 0,
    investigating: discrepancies?.filter((d) => d.status === "investigating").length ?? 0,
    resolved: discrepancies?.filter((d) => d.status === "resolved").length ?? 0,
  };

  const severityCounts = {
    critical: discrepancies?.filter((d) => d.severity === "critical").length ?? 0,
    high: discrepancies?.filter((d) => d.severity === "high").length ?? 0,
    medium: discrepancies?.filter((d) => d.severity === "medium").length ?? 0,
    low: discrepancies?.filter((d) => d.severity === "low").length ?? 0,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Discrepancies
        </h2>
        <p className="text-muted-foreground">
          Track and resolve shipping issues and customer complaints
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.open}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Investigating</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.investigating}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.resolved}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical / High</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {severityCounts.critical + severityCounts.high}
            </div>
            <p className="text-xs text-muted-foreground">Priority issues</p>
          </CardContent>
        </Card>
      </div>

      {/* Discrepancies Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Issue Queue
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              {filteredDiscrepancies?.length ?? 0} issues
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order, customer, description..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Customer Notified</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDiscrepancies?.map((disc) => (
                  <TableRow key={disc._id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(disc.type)}
                        <span className="capitalize text-sm">
                          {disc.type.replace("_", " ")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{disc.orderNumber}</div>
                      <div className="text-xs text-muted-foreground">
                        {disc.customerName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm max-w-xs truncate">{disc.description}</p>
                      {disc.resolution && (
                        <p className="text-xs text-emerald-600 mt-1 truncate">
                          ✓ {disc.resolution}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getSeverityColor(disc.severity)}>
                        {disc.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(disc.status)}>{disc.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{formatRelativeTime(disc.createdAt)}</div>
                      {disc.resolvedAt && (
                        <div className="text-xs text-muted-foreground">
                          Resolved: {formatDate(disc.resolvedAt)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {disc.customerNotified ? (
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!filteredDiscrepancies || filteredDiscrepancies.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {statusFilter !== "all"
                        ? `No ${statusFilter} discrepancies`
                        : "No discrepancies found"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


