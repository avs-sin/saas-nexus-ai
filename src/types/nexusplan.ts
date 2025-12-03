import { Id } from "../../convex/_generated/dataModel";

// ============================================
// Core Entity Types
// ============================================

export interface NexusCustomer {
  _id: Id<"nexusCustomers">;
  tenantId: Id<"tenants">;
  name: string;
  salesRep: string;
  ediId: string;
  createdAt: number;
  updatedAt: number;
}

export interface NexusVendor {
  _id: Id<"nexusVendors">;
  tenantId: Id<"tenants">;
  name: string;
  category: string;
  contactEmail: string;
  createdAt: number;
  updatedAt: number;
}

export interface NexusPlan {
  _id: Id<"nexusPlans">;
  tenantId: Id<"tenants">;
  customerId: Id<"nexusCustomers">;
  sku: string;
  periodStart: string; // YYYY-MM format
  planQty: number;
  createdAt: number;
  updatedAt: number;
}

// ============================================
// Purchase Order Types
// ============================================

export type POChangeType = "CREATED" | "QTY_CHANGE" | "DATE_CHANGE" | "CANCELLATION";
export type POStatus = "OPEN" | "PARTIAL" | "CLOSED" | "CANCELLED";

export interface POVersionPayload {
  qty: number;
  deliveryDate: string;
  price: number;
}

export interface POVersion {
  versionNumber: number;
  changeType: POChangeType;
  changedBy: string;
  changeReason: string;
  changedAt: string;
  payload: POVersionPayload;
}

export interface NexusPurchaseOrder {
  _id: Id<"nexusPurchaseOrders">;
  tenantId: Id<"tenants">;
  poNumber: string;
  customerId: Id<"nexusCustomers">;
  vendorId: Id<"nexusVendors">;
  status: POStatus;
  currentQty: number;
  currentDeliveryDate: string;
  sku: string;
  versions: POVersion[];
  createdAt: number;
  updatedAt: number;
}

// ============================================
// Discrepancy Types
// ============================================

export type DiscrepancyRelatedType = "PO" | "RECEIPT" | "PLAN";
export type DiscrepancyMetric = "QTY_VARIANCE" | "TIMING_VARIANCE" | "MODIFICATION_RATE";
export type DiscrepancySeverity = "LOW" | "MEDIUM" | "HIGH";
export type DiscrepancyStatus = "OPEN" | "INVESTIGATING" | "RESOLVED";

export interface NexusDiscrepancy {
  _id: Id<"nexusDiscrepancies">;
  tenantId: Id<"tenants">;
  relatedType: DiscrepancyRelatedType;
  relatedId: string;
  metric: DiscrepancyMetric;
  severity: DiscrepancySeverity;
  expected: string | number;
  actual: string | number;
  status: DiscrepancyStatus;
  detectedAt: string;
  description: string;
  createdAt: number;
  updatedAt: number;
}

// ============================================
// Scorecard Types
// ============================================

export interface ScorecardMetric {
  name: string;
  value: number; // 0-100
  weight: number; // 0-1
}

export interface ScoreTrend {
  date: string;
  score: number;
}

export interface NexusCustomerScore {
  _id: Id<"nexusCustomerScores">;
  tenantId: Id<"tenants">;
  customerId: Id<"nexusCustomers">;
  totalScore: number;
  metrics: ScorecardMetric[];
  trend: ScoreTrend[];
  createdAt: number;
  updatedAt: number;
}

export interface NexusVendorScore {
  _id: Id<"nexusVendorScores">;
  tenantId: Id<"tenants">;
  vendorId: Id<"nexusVendors">;
  totalScore: number;
  metrics: ScorecardMetric[];
  trend: ScoreTrend[];
  createdAt: number;
  updatedAt: number;
}

// ============================================
// AI Response Types
// ============================================

export interface DashboardBriefing {
  headline: string;
  criticalAlerts: string[];
  goodNews: string;
}

export interface DiscrepancyAnalysis {
  rootCause: string;
  recommendations: string[];
}

export interface NegotiationStrategy {
  openingStance: string;
  leveragePoints: string[];
  talkingPoints: string[];
  emailDraft: string;
}

// ============================================
// View Types
// ============================================

export type NexusPlanView =
  | "dashboard"
  | "planning"
  | "timeline"
  | "discrepancy"
  | "scorecard"
  | "vendor-scorecard";

// ============================================
// Grading Helpers
// ============================================

export interface ScoreGrade {
  letter: "A" | "B" | "C" | "F";
  color: string;
  bg: string;
  border: string;
}

export function getScoreGrade(score: number): ScoreGrade {
  if (score >= 90) {
    return {
      letter: "A",
      color: "text-emerald-500",
      bg: "bg-emerald-100",
      border: "border-emerald-200",
    };
  }
  if (score >= 80) {
    return {
      letter: "B",
      color: "text-blue-500",
      bg: "bg-blue-100",
      border: "border-blue-200",
    };
  }
  if (score >= 70) {
    return {
      letter: "C",
      color: "text-amber-500",
      bg: "bg-amber-100",
      border: "border-amber-200",
    };
  }
  return {
    letter: "F",
    color: "text-red-500",
    bg: "bg-red-100",
    border: "border-red-200",
  };
}










