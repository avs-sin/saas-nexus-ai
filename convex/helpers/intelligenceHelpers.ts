import { MutationCtx, QueryCtx } from "../_generated/server";
import { Id, Doc } from "../_generated/dataModel";

// ============================================
// Types
// ============================================

export type SuggestionType = "work_order" | "purchase" | "release_wo" | "forecast_cascade";
export type SuggestionModule = "outbound" | "production" | "inbound" | "plan";
export type SuggestionPriority = "low" | "medium" | "high" | "critical";

export interface SuggestionInput {
  tenantId: Id<"tenants">;
  type: SuggestionType;
  sourceModule: SuggestionModule;
  targetModule: SuggestionModule;
  priority: SuggestionPriority;
  title: string;
  description: string;
  payload: Record<string, unknown>;
  relatedIds: {
    orderId?: Id<"nexusOutboundOrders">;
    workOrderId?: Id<"nexusWorkOrders">;
    poId?: Id<"nexusInboundPOs">;
    materialSku?: string;
    planId?: Id<"nexusPlans">;
  };
  expiresInDays?: number;
}

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

export interface FilterArgs {
  type?: string;
  sourceModule?: string;
  priority?: string;
}

// ============================================
// Priority Calculation
// ============================================

const PRIORITY_ORDER: Record<SuggestionPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

interface PriorityThresholds {
  criticalDays: number;
  highDays: number;
}

/**
 * Calculate priority based on days remaining until deadline.
 * Lower days = higher priority.
 */
export function calculatePriority(
  daysRemaining: number,
  thresholds: PriorityThresholds = { criticalDays: 2, highDays: 7 }
): SuggestionPriority {
  if (daysRemaining <= thresholds.criticalDays) return "critical";
  if (daysRemaining <= thresholds.highDays) return "high";
  return "medium";
}

/**
 * Calculate days between now and a target date.
 */
export function daysUntil(targetDate: Date | string | number): number {
  const target = new Date(targetDate).getTime();
  const now = Date.now();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

// ============================================
// Date Formatting
// ============================================

/**
 * Format a Date to ISO date string (YYYY-MM-DD).
 */
export function formatDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Add days to a date and return as ISO date string.
 */
export function addDaysFormatted(date: Date, days: number): string {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return formatDateString(result);
}

/**
 * Subtract days from a date and return as ISO date string.
 */
export function subtractDaysFormatted(date: Date, days: number): string {
  return addDaysFormatted(date, -days);
}

// ============================================
// Suggestion Existence Check
// ============================================

interface ExistenceCheckOptions {
  type: SuggestionType;
  orderId?: Id<"nexusOutboundOrders">;
  workOrderId?: Id<"nexusWorkOrders">;
  materialSku?: string;
  planId?: Id<"nexusPlans">;
}

/**
 * Check if a pending suggestion already exists with the given criteria.
 * Prevents duplicate suggestions.
 */
export async function suggestionExists(
  ctx: MutationCtx,
  tenantId: Id<"tenants">,
  options: ExistenceCheckOptions
): Promise<boolean> {
  const pending = await ctx.db
    .query("nexusSuggestions")
    .withIndex("by_tenantId_and_status", (q) =>
      q.eq("tenantId", tenantId).eq("status", "pending")
    )
    .filter((q) => {
      let condition = q.eq(q.field("type"), options.type);
      
      if (options.orderId) {
        condition = q.and(condition, q.eq(q.field("relatedIds.orderId"), options.orderId));
      }
      if (options.workOrderId) {
        condition = q.and(condition, q.eq(q.field("relatedIds.workOrderId"), options.workOrderId));
      }
      if (options.materialSku) {
        condition = q.and(condition, q.eq(q.field("relatedIds.materialSku"), options.materialSku));
      }
      if (options.planId) {
        condition = q.and(condition, q.eq(q.field("relatedIds.planId"), options.planId));
      }
      
      return condition;
    })
    .first();

  return pending !== null;
}

// ============================================
// Suggestion Creation
// ============================================

/**
 * Create a new suggestion with standard fields.
 */
export async function createSuggestion(
  ctx: MutationCtx,
  input: SuggestionInput
): Promise<Id<"nexusSuggestions">> {
  const now = Date.now();
  const expiresInDays = input.expiresInDays ?? 7;

  return await ctx.db.insert("nexusSuggestions", {
    tenantId: input.tenantId,
    type: input.type,
    sourceModule: input.sourceModule,
    targetModule: input.targetModule,
    priority: input.priority,
    title: input.title,
    description: input.description,
    payload: input.payload,
    relatedIds: input.relatedIds,
    status: "pending",
    createdAt: now,
    expiresAt: now + expiresInDays * 24 * 60 * 60 * 1000,
  });
}

// ============================================
// Filtering & Counting (for consolidated query)
// ============================================

/**
 * Filter suggestions and compute counts in a single pass.
 * Much more efficient than separate queries.
 */
export function filterAndCount(
  suggestions: Doc<"nexusSuggestions">[],
  filters: FilterArgs
): { filtered: Doc<"nexusSuggestions">[]; counts: SuggestionCounts } {
  // Initialize counts
  const counts: SuggestionCounts = {
    total: 0,
    pending: 0,
    critical: 0,
    byType: { work_order: 0, purchase: 0, release_wo: 0, forecast_cascade: 0 },
    byModule: { outbound: 0, production: 0, inbound: 0, plan: 0 },
  };

  const filtered: Doc<"nexusSuggestions">[] = [];

  for (const s of suggestions) {
    // Always count totals (for all pending)
    counts.total++;
    counts.pending++;
    
    if (s.priority === "critical") counts.critical++;
    
    const sType = s.type as keyof typeof counts.byType;
    if (sType in counts.byType) counts.byType[sType]++;
    
    const sModule = s.sourceModule as keyof typeof counts.byModule;
    if (sModule in counts.byModule) counts.byModule[sModule]++;

    // Apply filters for the filtered list
    if (filters.type && s.type !== filters.type) continue;
    if (filters.sourceModule && s.sourceModule !== filters.sourceModule) continue;
    if (filters.priority && s.priority !== filters.priority) continue;

    filtered.push(s);
  }

  return { filtered, counts };
}

/**
 * Sort suggestions by priority (critical first) then by creation date (newest first).
 */
export function sortByPriority(
  suggestions: Doc<"nexusSuggestions">[]
): Doc<"nexusSuggestions">[] {
  return [...suggestions].sort((a, b) => {
    const aPriority = PRIORITY_ORDER[a.priority as SuggestionPriority] ?? 4;
    const bPriority = PRIORITY_ORDER[b.priority as SuggestionPriority] ?? 4;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return b.createdAt - a.createdAt;
  });
}

