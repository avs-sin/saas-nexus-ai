"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Truck,
  Search,
  Filter,
  Package,
  MapPin,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ShipmentWithOrder } from "../types";
import { getStatusColor, formatDate, formatCurrency } from "../types";

export function ShipmentTracker() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const shipments = useQuery(api.nexusOutbound.getShipments, {
    status: statusFilter !== "all" ? statusFilter : undefined,
  }) as ShipmentWithOrder[] | undefined;

  // Filter by search query
  const filteredShipments = shipments?.filter((shipment) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      shipment.shipmentNumber.toLowerCase().includes(query) ||
      shipment.trackingNumber?.toLowerCase().includes(query) ||
      shipment.orderNumber.toLowerCase().includes(query) ||
      shipment.customerName.toLowerCase().includes(query)
    );
  });

  const statusCounts = {
    label_created: shipments?.filter((s) => s.status === "label_created").length ?? 0,
    picked_up: shipments?.filter((s) => s.status === "picked_up").length ?? 0,
    in_transit: shipments?.filter((s) => s.status === "in_transit").length ?? 0,
    out_for_delivery: shipments?.filter((s) => s.status === "out_for_delivery").length ?? 0,
    delivered: shipments?.filter((s) => s.status === "delivered").length ?? 0,
    exception: shipments?.filter((s) => s.status === "exception").length ?? 0,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Shipment Tracker
        </h2>
        <p className="text-muted-foreground">
          Real-time tracking and management of all outbound shipments
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { key: "label_created", label: "Label Created", icon: Package },
          { key: "picked_up", label: "Picked Up", icon: Truck },
          { key: "in_transit", label: "In Transit", icon: MapPin },
          { key: "out_for_delivery", label: "Out for Delivery", icon: Truck },
          { key: "delivered", label: "Delivered", icon: Package },
          { key: "exception", label: "Exception", icon: Clock },
        ].map(({ key, label, icon: Icon }) => (
          <Card
            key={key}
            className={`cursor-pointer transition-all ${
              statusFilter === key
                ? "ring-2 ring-primary"
                : "hover:border-primary/50"
            }`}
            onClick={() => setStatusFilter(statusFilter === key ? "all" : key)}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xl font-bold">
                    {statusCounts[key as keyof typeof statusCounts]}
                  </p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Shipments List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Shipments
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              {filteredShipments?.length ?? 0} shipments
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by shipment #, tracking #, order..."
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
                <SelectItem value="label_created">Label Created</SelectItem>
                <SelectItem value="picked_up">Picked Up</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="exception">Exception</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Shipments Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shipment</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Carrier</TableHead>
                  <TableHead>Tracking</TableHead>
                  <TableHead>Est. Delivery</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShipments?.map((shipment) => (
                  <TableRow key={shipment._id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <div className="font-medium">{shipment.shipmentNumber}</div>
                      <div className="text-xs text-muted-foreground">
                        {shipment.weight} lbs
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{shipment.orderNumber}</div>
                      <div className="text-xs text-muted-foreground">
                        {shipment.customerName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{shipment.carrier}</div>
                      <div className="text-xs text-muted-foreground">
                        {shipment.serviceLevel}
                      </div>
                    </TableCell>
                    <TableCell>
                      {shipment.trackingNumber ? (
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-sm">
                            {shipment.trackingNumber.slice(0, 12)}...
                          </span>
                          {shipment.trackingUrl && (
                            <a
                              href={shipment.trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:text-primary/80"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {shipment.estimatedDelivery ? (
                        <div>
                          <div className="text-sm">{shipment.estimatedDelivery}</div>
                          {shipment.actualDelivery && (
                            <div className="text-xs text-emerald-600">
                              Delivered: {shipment.actualDelivery}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">TBD</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(shipment.shippingCost)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(shipment.status)}>
                        {shipment.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        Track
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!filteredShipments || filteredShipments.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No shipments found
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








