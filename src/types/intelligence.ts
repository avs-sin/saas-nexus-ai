import { Id } from "../../convex/_generated/dataModel";

// ============================================
// Suggestion Types
// ============================================

export type SuggestionType =
  | "work_order"      // Outbound → Production: Create WO to fulfill order
  | "purchase"        // Production → Inbound: Create PO for materials
  | "release_wo"      // Inbound → Production: Release blocked work order
  | "forecast_cascade"; // Plan → All: Cascade forecast changes

export type SuggestionModule = "outbound" | "production" | "inbound" | "plan";

export type SuggestionPriority = "low" | "medium" | "high" | "critical";

export type SuggestionStatus = "pending" | "accepted" | "dismissed" | "expired";

// ============================================
// Payload Types (Data for each suggestion type)
// ============================================

export interface WorkOrderPayload {
  finishedSku: string;
  finishedName: string;
  qtyNeeded: number;
  qtyInStock: number;
  shortfall: number;
  suggestedQty: number;
  priority: string;
  scheduledStart: string;
  scheduledEnd: string;
  sourceOrderNumber: string;
}

export interface PurchasePayload {
  materialSku: string;
  materialName: string;
  qtyNeeded: number;
  qtyAvailable: number;
  shortfall: number;
  suggestedOrderQty: number;
  leadTimeDays: number;
  estimatedCost: number;
  orderByDate: string;
  neededByDate: string;
  linkedWorkOrders: string[];
  vendorName?: string;
}

export interface ReleaseWOPayload {
  woNumber: string;
  finishedSku: string;
  finishedName: string;
  materialsReceived: {
    sku: string;
    name: string;
    qtyReceived: number;
  }[];
  canNowProceed: boolean;
  blockedSince: string;
}

export interface ForecastCascadePayload {
  sku: string;
  periodStart: string;
  previousQty: number;
  newQty: number;
  percentChange: number;
  customerName: string;
  impactedWorkOrders: string[];
  impactedMaterials: string[];
  recommendedActions: string[];
}

export type SuggestionPayload =
  | WorkOrderPayload
  | PurchasePayload
  | ReleaseWOPayload
  | ForecastCascadePayload;

// ============================================
// Related IDs Structure
// ============================================

export interface SuggestionRelatedIds {
  orderId?: Id<"nexusOutboundOrders">;
  workOrderId?: Id<"nexusWorkOrders">;
  poId?: Id<"nexusInboundPOs">;
  materialSku?: string;
  planId?: Id<"nexusPlans">;
}

// ============================================
// Main Suggestion Type
// ============================================

export interface NexusSuggestion {
  _id: Id<"nexusSuggestions">;
  _creationTime: number;
  tenantId: Id<"tenants">;
  type: SuggestionType;
  sourceModule: SuggestionModule;
  targetModule: SuggestionModule;
  priority: SuggestionPriority;
  title: string;
  description: string;
  payload: SuggestionPayload;
  relatedIds: SuggestionRelatedIds;
  status: SuggestionStatus;
  createdAt: number;
  expiresAt?: number;
  acceptedAt?: number;
  acceptedBy?: string;
  dismissedAt?: number;
  dismissedBy?: string;
  dismissReason?: string;
}

// ============================================
// Command Center Dashboard Types
// ============================================

export interface SuggestionCounts {
  total: number;
  pending: number;
  critical: number;
  byType: {
    work_order: number;
    purchase: number;
    release_wo: number;
    forecast_cascade: number;
  };
  byModule: {
    outbound: number;
    production: number;
    inbound: number;
    plan: number;
  };
}

export interface CommandCenterData {
  suggestions: NexusSuggestion[];
  counts: SuggestionCounts;
}

// ============================================
// Helper Functions
// ============================================

export function getPriorityColor(priority: SuggestionPriority): string {
  const colors: Record<SuggestionPriority, string> = {
    low: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return colors[priority] || colors.low;
}

export function getStatusColor(status: SuggestionStatus): string {
  const colors: Record<SuggestionStatus, string> = {
    pending: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    accepted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    dismissed: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
    expired: "bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-500",
  };
  return colors[status] || colors.pending;
}

export function getTypeLabel(type: SuggestionType): string {
  const labels: Record<SuggestionType, string> = {
    work_order: "Create Work Order",
    purchase: "Purchase Materials",
    release_wo: "Release Work Order",
    forecast_cascade: "Forecast Update",
  };
  return labels[type] || type;
}

export function getTypeIcon(type: SuggestionType): string {
  const icons: Record<SuggestionType, string> = {
    work_order: "Factory",
    purchase: "ShoppingCart",
    release_wo: "Play",
    forecast_cascade: "TrendingUp",
  };
  return icons[type] || "Sparkles";
}

export function getModuleColor(module: SuggestionModule): string {
  const colors: Record<SuggestionModule, string> = {
    outbound: "text-cyan-600 dark:text-cyan-400",
    production: "text-amber-600 dark:text-amber-400",
    inbound: "text-purple-600 dark:text-purple-400",
    plan: "text-emerald-600 dark:text-emerald-400",
  };
  return colors[module] || "text-muted-foreground";
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
  
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

