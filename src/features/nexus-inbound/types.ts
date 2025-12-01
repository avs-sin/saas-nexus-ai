import { Id } from "../../../convex/_generated/dataModel";

// Using string literal types for better Convex compatibility
export type VendorStatus = 'Active' | 'OnHold' | 'Disqualified';

export type POStatus = 'Open' | 'Partial' | 'Closed';

export type DiscrepancyType = 
  | 'QuantityShortage' 
  | 'QuantityOverage' 
  | 'ItemMismatch' 
  | 'QualityFailure' 
  | 'PriceMismatch' 
  | 'DocumentationMissing';

export type DiscrepancyStatus = 
  | 'Open' 
  | 'Pending Vendor' 
  | 'Resolved' 
  | 'Chargeback Pending' 
  | 'Credit Pending' 
  | 'RTV Pending' 
  | 'Dispute In Progress';

export type ResolutionOutcome = 
  | 'Chargeback Issued' 
  | 'Credit Requested' 
  | 'Return to Vendor (RTV)' 
  | 'Waived / Accepted' 
  | 'Internal Rework' 
  | 'Scrap at Vendor Expense' 
  | 'Disputed / Escalated';

export type QualityIssueType = 
  | 'Damage' 
  | 'Contamination' 
  | 'Wrong SKU' 
  | 'Packaging Defect' 
  | 'Off-Spec Dimensions' 
  | 'Other';

export interface InspectionDetails {
  required: boolean;
  startedAt?: string;
  endedAt?: string;
  durationMinutes?: number;
  personnelCount: number;
  laborHours: number;
  issueFound: boolean;
  issueType?: string; // QualityIssueType from Convex
  issueDescription?: string;
  qtyAffected?: number;
  severity?: string; // 'Low' | 'Medium' | 'High' | 'Critical' from Convex
  photos?: string[];
}

// Maps to Convex table 'nexusInboundVendors'
export interface InboundVendor {
  _id: Id<"nexusInboundVendors">;
  _creationTime: number;
  name: string;
  ediId: string;
  status: string; // VendorStatus from Convex
  overallScore: number;
}

export interface POLine {
  id: string;
  itemSku: string;
  description: string;
  qtyOrdered: number;
  qtyReceived: number;
  unitPrice: number;
  uom: string;
}

// Maps to Convex table 'nexusInboundPOs'
export interface InboundPurchaseOrder {
  _id: Id<"nexusInboundPOs">;
  _creationTime: number;
  poNumber: string;
  vendorId: Id<"nexusInboundVendors">;
  vendorName: string;
  dateOrdered: string;
  datePromised: string;
  status: string; // POStatus from Convex
  lines: POLine[];
}

// Maps to Convex table 'nexusInboundDiscrepancies'
export interface InboundDiscrepancy {
  _id: Id<"nexusInboundDiscrepancies">;
  _creationTime: number;
  poNumber: string;
  vendorName: string;
  type: string; // DiscrepancyType from Convex
  severity: string; // 'Low' | 'Medium' | 'High' | 'Critical' from Convex
  description: string;
  status: string; // DiscrepancyStatus from Convex
  createdAt: string;
  itemSku?: string;
  expectedQty?: number;
  receivedQty?: number;
  qualityIssueType?: string; // QualityIssueType from Convex
  inspectionDetails?: InspectionDetails;
  resolutionNote?: string;
  resolutionOutcome?: string; // ResolutionOutcome from Convex
  resolvedAt?: string;
}

// Maps to Convex table 'nexusInboundEdiLogs'
export interface InboundEDIMessage {
  _id: Id<"nexusInboundEdiLogs">;
  _creationTime: number;
  type: string; // '850' | '810' | '856' | '846' | '997'
  direction: string; // 'Inbound' | 'Outbound'
  partner: string;
  timestamp: string;
  status: string; // 'Processed' | 'Failed' | 'Pending'
  rawSize: string;
}

export interface ScoreComponent {
  metric: string;
  score: number;
  weight: number;
}

// Maps to Convex table 'nexusInboundScorecards'
export interface InboundVendorScoreCard {
  _id: Id<"nexusInboundScorecards">;
  vendorId: Id<"nexusInboundVendors">;
  period: string;
  totalScore: number;
  components: ScoreComponent[];
  history: { date: string; score: number }[];
}

// Dashboard data type
export interface InboundDashboardData {
  vendors: InboundVendor[];
  pos: InboundPurchaseOrder[];
  discrepancies: InboundDiscrepancy[];
  ediLogs: InboundEDIMessage[];
  scorecards: InboundVendorScoreCard[];
}

// Resolution outcome values for dropdown
export const RESOLUTION_OUTCOMES: ResolutionOutcome[] = [
  'Chargeback Issued',
  'Credit Requested',
  'Return to Vendor (RTV)',
  'Waived / Accepted',
  'Internal Rework',
  'Scrap at Vendor Expense',
  'Disputed / Escalated',
];
