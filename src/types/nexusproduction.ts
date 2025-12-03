import { Id } from "../../convex/_generated/dataModel";

// ============================================
// Raw Materials
// ============================================

export type MaterialCategory = "Fill" | "Fabric" | "Component" | "Packaging";

export interface RawMaterial {
  _id: Id<"nexusRawMaterials">;
  _creationTime: number;
  tenantId: Id<"tenants">;
  sku: string;
  name: string;
  category: MaterialCategory | string;
  uom: string;
  costPerUnit: number;
  leadTimeDays: number;
  reorderPoint: number;
  preferredVendorId?: Id<"nexusInboundVendors">;
  createdAt: number;
  updatedAt: number;
}

// ============================================
// Bill of Materials
// ============================================

export interface BOMLine {
  materialSku: string;
  materialName: string;
  qtyPerUnit: number;
  uom: string;
  scrapFactor?: number;
}

export interface BillOfMaterials {
  _id: Id<"nexusBOM">;
  _creationTime: number;
  tenantId: Id<"tenants">;
  finishedSku: string;
  finishedName: string;
  materials: BOMLine[];
  laborMinutesPerUnit?: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

// ============================================
// Inventory
// ============================================

export interface RawInventory {
  _id: Id<"nexusRawInventory">;
  _creationTime: number;
  tenantId: Id<"tenants">;
  materialSku: string;
  warehouseId: Id<"warehouses">;
  qtyOnHand: number;
  qtyAllocated: number;
  qtyAvailable: number;
  lotNumber?: string;
  vendorId?: Id<"nexusInboundVendors">;
  receivedDate?: string;
  expirationDate?: string;
  updatedAt: number;
}

export interface FinishedInventory {
  _id: Id<"nexusFinishedInventory">;
  _creationTime: number;
  tenantId: Id<"tenants">;
  sku: string;
  warehouseId: Id<"warehouses">;
  qtyOnHand: number;
  qtyAllocated: number;
  qtyAvailable: number;
  updatedAt: number;
}

// ============================================
// Work Orders
// ============================================

export type WorkOrderStatus =
  | "draft"
  | "scheduled"
  | "released"
  | "in_progress"
  | "completed"
  | "cancelled";

export type WorkOrderPriority = "low" | "normal" | "high" | "rush";

export interface WorkOrder {
  _id: Id<"nexusWorkOrders">;
  _creationTime: number;
  tenantId: Id<"tenants">;
  woNumber: string;
  finishedSku: string;
  finishedName: string;
  qtyPlanned: number;
  qtyCompleted: number;
  qtyRejected: number;
  status: WorkOrderStatus | string;
  priority: WorkOrderPriority | string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  warehouseId: Id<"warehouses">;
  lineAssignment?: string;
  sourceOrderId?: Id<"nexusOutboundOrders">;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

// ============================================
// AI Suggestions
// ============================================

export type SuggestionUrgency = "low" | "medium" | "high" | "critical";
export type SuggestionStatus = "pending" | "accepted" | "dismissed" | "ordered";

export interface MaterialSuggestion {
  _id: Id<"nexusMaterialSuggestions">;
  _creationTime: number;
  tenantId: Id<"tenants">;
  materialSku: string;
  materialName: string;
  suggestedQty: number;
  suggestedOrderDate: string;
  neededByDate: string;
  reason: string;
  urgency: SuggestionUrgency | string;
  status: SuggestionStatus | string;
  linkedWorkOrders: string[];
  vendorId?: Id<"nexusInboundVendors">;
  estimatedCost: number;
  generatedAt: number;
}

// ============================================
// AI Response Types
// ============================================

export interface MaterialRequirement {
  materialSku: string;
  materialName: string;
  totalNeeded: number;
  currentAvailable: number;
  shortfall: number;
  suggestedOrderQty: number;
  orderByDate: string;
  neededByDate: string;
  urgency: SuggestionUrgency;
  estimatedCost: number;
  drivingWorkOrders: string[];
  vendorName?: string;
  leadTimeDays: number;
}

export interface MRPAlert {
  type: "stockout_risk" | "lead_time_warning" | "capacity_constraint" | "cost_spike" | string;
  severity: "low" | "medium" | "high" | "critical" | string;
  materialSku?: string;
  message: string;
  recommendation: string;
}

export interface MRPSummary {
  totalMaterialsNeeded: number;
  materialsInStock: number;
  materialsToOrder: number;
  totalEstimatedCost: number;
  criticalShortages: number;
  headline: string;
}

export interface MRPAnalysis {
  generatedAt: string;
  planningHorizonDays: number;
  requirements: MaterialRequirement[];
  alerts: MRPAlert[];
  summary: MRPSummary;
}

export interface PurchaseSuggestion {
  materialSku: string;
  materialName: string;
  orderQty: number;
  orderByDate: string;
  reason: string;
  urgency: SuggestionUrgency;
  estimatedCost: number;
  vendorName?: string;
}

export interface ScheduleOptimization {
  currentSchedule: { woNumber: string; scheduledStart: string; finishedSku: string }[];
  optimizedSchedule: { woNumber: string; suggestedStart: string; reason: string }[];
  savingsEstimate: string;
  explanation: string;
}

export interface ProductionBriefing {
  headline: string;
  workOrdersSummary: {
    inProgress: number;
    scheduled: number;
    completedToday: number;
  };
  criticalAlerts: string[];
  materialStatus: string;
  capacityUtilization: number;
}

// ============================================
// Dashboard Data Type
// ============================================

export interface ProductionDashboardData {
  workOrders: WorkOrder[];
  boms: BillOfMaterials[];
  rawMaterials: RawMaterial[];
  rawInventory: RawInventory[];
  finishedInventory: FinishedInventory[];
  suggestions: MaterialSuggestion[];
  kpis: ProductionKPIs;
}

export interface ProductionKPIs {
  workOrdersInProgress: number;
  workOrdersScheduled: number;
  completedToday: number;
  materialShortages: number;
  capacityUtilization: number;
  pendingSuggestions: number;
}

// ============================================
// View Types
// ============================================

export type ProductionView =
  | "dashboard"
  | "work-orders"
  | "mrp"
  | "bom"
  | "inventory";

// ============================================
// Helper Functions
// ============================================

export function getWorkOrderStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    draft: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
    scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    released: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    in_progress: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };
  return statusColors[status] || "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
}

export function getPriorityColor(priority: string): string {
  const priorityColors: Record<string, string> = {
    low: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
    normal: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    high: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    rush: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return priorityColors[priority] || priorityColors.normal;
}

export function getUrgencyColor(urgency: string): string {
  const urgencyColors: Record<string, string> = {
    low: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return urgencyColors[urgency] || urgencyColors.low;
}

export function getSuggestionStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    accepted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    dismissed: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
    ordered: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  };
  return statusColors[status] || statusColors.pending;
}

export function getCategoryColor(category: string): string {
  const categoryColors: Record<string, string> = {
    Fill: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    Fabric: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
    Component: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    Packaging: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  };
  return categoryColors[category] || "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
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

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

export function getDaysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}







