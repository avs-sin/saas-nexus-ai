"use client";

import { use } from "react";
import { OutboundLayout } from "@/features/nexus-outbound/components/outbound-layout";
import type { OutboundView } from "@/features/nexus-outbound/types";

interface OutboundPageProps {
  params: Promise<{
    orgSlug: string;
    view?: string[];
  }>;
}

export default function OutboundPage({ params }: OutboundPageProps) {
  const resolvedParams = use(params);
  const viewSegments = resolvedParams.view ?? [];
  
  // Map URL segments to view names
  const viewMap: Record<string, OutboundView> = {
    "": "dashboard",
    "orders": "orders",
    "shipments": "shipments",
    "forecast": "forecast",
    "communications": "communications",
    "discrepancies": "discrepancies",
  };
  
  const currentView = viewMap[viewSegments[0] ?? ""] ?? "dashboard";
  
  return <OutboundLayout view={currentView} />;
}








