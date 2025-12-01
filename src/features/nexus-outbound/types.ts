import { Id } from "../../../convex/_generated/dataModel";

// ============================================
// Enums
// ============================================

export enum OrderStatus {
  Pending = "pending",
  Allocated = "allocated",
  Picking = "picking",
  Packed = "packed",
  Shipped = "shipped",
  Delivered = "delivered",
}

export enum ShipmentStatus {
  LabelCreated = "label_created",
  PickedUp = "picked_up",
  InTransit = "in_transit",
  OutForDelivery = "out_for_delivery",
  Delivered = "delivered",
  Exception = "exception",
}

export enum CustomerType {
  B2B = "B2B",
  B2C = "B2C",
}

export enum Priority {
  Standard = "standard",
  Express = "express",
  NextDay = "next_day",
}

export enum Carrier {
  UPS = "UPS",
  FedEx = "FedEx",
  USPS = "USPS",
  Freight = "Freight",
  LTL = "LTL",
}

export enum ServiceLevel {
  Ground = "Ground",
  TwoDay = "2Day",
  Overnight = "Overnight",
  Freight = "Freight",
}

export enum DiscrepancyType {
  ShortShip = "short_ship",
  WrongItem = "wrong_item",
  Damaged = "damaged",
  Lost = "lost",
  AddressIssue = "address_issue",
  CustomerRefused = "customer_refused",
}

export enum DiscrepancySeverity {
  Low = "low",
  Medium = "medium",
  High = "high",
  Critical = "critical",
}

export enum DiscrepancyStatus {
  Open = "open",
  Investigating = "investigating",
  Resolved = "resolved",
}

export enum CommChannel {
  Email = "email",
  SMS = "sms",
  InApp = "in_app",
}

export enum CommType {
  Shipped = "shipped",
  Delivered = "delivered",
  Delayed = "delayed",
  WeeklyBriefing = "weekly_briefing",
  InquiryResponse = "inquiry_response",
}

// ============================================
// Core Entity Types
// ============================================

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface OrderLine {
  sku: string;
  description: string;
  qtyOrdered: number;
  qtyShipped: number;
  unitPrice: number;
}

export interface OutboundOrder {
  _id: Id<"nexusOutboundOrders">;
  tenantId: Id<"tenants">;
  orderNumber: string;
  customerType: CustomerType | string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: ShippingAddress;
  lines: OrderLine[];
  priority: Priority | string;
  requestedShipDate: string;
  status: OrderStatus | string;
  sourceWarehouseId?: Id<"warehouses">;
  createdAt: number;
  updatedAt: number;
}

export interface ShipmentDimensions {
  length: number;
  width: number;
  height: number;
}

export interface Shipment {
  _id: Id<"nexusShipments">;
  tenantId: Id<"tenants">;
  orderId: Id<"nexusOutboundOrders">;
  shipmentNumber: string;
  carrier: Carrier | string;
  serviceLevel: ServiceLevel | string;
  trackingNumber?: string;
  trackingUrl?: string;
  status: ShipmentStatus | string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  weight: number;
  dimensions?: ShipmentDimensions;
  shippingCost: number;
  labelUrl?: string;
  shippedAt?: number;
  deliveredAt?: number;
  createdAt: number;
}

export interface ShipmentWithOrder extends Shipment {
  orderNumber: string;
  customerName: string;
  customerType: string;
}

export interface ShipmentEvent {
  _id: Id<"nexusShipmentEvents">;
  tenantId: Id<"tenants">;
  shipmentId: Id<"nexusShipments">;
  event: string;
  description: string;
  location?: string;
  timestamp: number;
}

export interface OutboundComm {
  _id: Id<"nexusOutboundComms">;
  tenantId: Id<"tenants">;
  shipmentId?: Id<"nexusShipments">;
  orderId?: Id<"nexusOutboundOrders">;
  customerId?: string;
  channel: CommChannel | string;
  type: CommType | string;
  recipient: string;
  subject?: string;
  body: string;
  aiGenerated: boolean;
  sentAt: number;
  status: string;
}

export interface ForecastPrediction {
  segment: string;
  carrier?: string;
  region?: string;
  predictedVolume: number;
  confidenceLevel: number;
  factors: string[];
}

export interface ForecastAlert {
  type: string;
  severity: string;
  message: string;
}

export interface ShippingForecast {
  _id: Id<"nexusShippingForecasts">;
  tenantId: Id<"tenants">;
  forecastDate: string;
  generatedAt: number;
  predictions: ForecastPrediction[];
  alerts: ForecastAlert[];
}

export interface OutboundDiscrepancy {
  _id: Id<"nexusOutboundDiscrepancies">;
  tenantId: Id<"tenants">;
  shipmentId?: Id<"nexusShipments">;
  orderId: Id<"nexusOutboundOrders">;
  type: DiscrepancyType | string;
  severity: DiscrepancySeverity | string;
  description: string;
  status: DiscrepancyStatus | string;
  resolution?: string;
  customerNotified: boolean;
  createdAt: number;
  resolvedAt?: number;
}

export interface OutboundDiscrepancyWithDetails extends OutboundDiscrepancy {
  orderNumber: string;
  customerName: string;
  shipmentNumber?: string | null;
}

// ============================================
// Dashboard Types
// ============================================

export interface OutboundKPIs {
  ordersToShipToday: number;
  inTransitShipments: number;
  deliveredThisWeek: number;
  openDiscrepancies: number;
  exceptionRate: number;
  totalOrders: number;
  totalShipments: number;
}

export interface OutboundDashboardData {
  orders: OutboundOrder[];
  shipments: Shipment[];
  discrepancies: OutboundDiscrepancy[];
  comms: OutboundComm[];
  forecasts: ShippingForecast[];
  kpis: OutboundKPIs;
  recentOrders: OutboundOrder[];
}

export interface OutboundBriefing {
  headline: string;
  volumeForecast: {
    today: number;
    tomorrow: number;
    trend: "up" | "down" | "stable";
  };
  criticalAlerts: string[];
  customerHighlight: string;
}

// ============================================
// View Types
// ============================================

export type OutboundView =
  | "dashboard"
  | "orders"
  | "shipments"
  | "forecast"
  | "communications"
  | "discrepancies";

// ============================================
// Helper Functions
// ============================================

export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    // Order statuses
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    allocated: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    picking: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    packed: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
    shipped: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
    delivered: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    // Shipment statuses
    label_created: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
    picked_up: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    in_transit: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
    out_for_delivery: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    exception: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    // Discrepancy statuses
    open: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    investigating: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    resolved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  };
  return statusColors[status] || "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
}

export function getPriorityColor(priority: string): string {
  const priorityColors: Record<string, string> = {
    standard: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
    express: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    next_day: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return priorityColors[priority] || priorityColors.standard;
}

export function getSeverityColor(severity: string): string {
  const severityColors: Record<string, string> = {
    low: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return severityColors[severity] || severityColors.low;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatDate(date: string | number): string {
  const d = typeof date === "number" ? new Date(date) : new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(timestamp);
}


