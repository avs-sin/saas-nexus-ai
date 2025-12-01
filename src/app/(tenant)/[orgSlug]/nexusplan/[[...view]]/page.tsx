"use client";

import { notFound } from "next/navigation";
import { use } from "react";
import {
  NexusPlanDashboard,
  PlanningBoard,
  POTimeline,
  DiscrepancyInbox,
  CustomerScorecard,
  VendorScorecard,
  AIAssistant,
} from "@/components/nexusplan";

interface NexusPlanViewPageProps {
  params: Promise<{ orgSlug: string; view?: string[] }>;
}

const validViews = [
  "planning",
  "timeline",
  "discrepancy",
  "scorecard",
  "vendor-scorecard",
];

export default function NexusPlanViewPage({ params }: NexusPlanViewPageProps) {
  const { view } = use(params);

  // If no view specified, show dashboard
  if (!view || view.length === 0) {
    return (
      <>
        <NexusPlanDashboard />
        <AIAssistant />
      </>
    );
  }

  const currentView = view[0];

  // Check if it's a valid view
  if (!validViews.includes(currentView)) {
    notFound();
  }

  const renderContent = () => {
    switch (currentView) {
      case "planning":
        return <PlanningBoard />;
      case "timeline":
        return <POTimeline />;
      case "discrepancy":
        return <DiscrepancyInbox />;
      case "scorecard":
        return <CustomerScorecard />;
      case "vendor-scorecard":
        return <VendorScorecard />;
      default:
        return null;
    }
  };

  return (
    <>
      {renderContent()}
      <AIAssistant />
    </>
  );
}

