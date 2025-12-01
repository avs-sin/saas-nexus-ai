"use client";

import { OutboundDashboard } from "./dashboard";
import { OrderQueue } from "./order-queue";
import { ShipmentTracker } from "./shipment-tracker";
import { ForecastChart } from "./forecast-chart";
import { CommsPanel } from "./comms-panel";
import { DiscrepancyList } from "./discrepancy-list";
import type { OutboundView } from "../types";

interface OutboundLayoutProps {
  view: OutboundView;
}

export function OutboundLayout({ view }: OutboundLayoutProps) {
  switch (view) {
    case "dashboard":
      return <OutboundDashboard />;
    case "orders":
      return <OrderQueue />;
    case "shipments":
      return <ShipmentTracker />;
    case "forecast":
      return <ForecastChart />;
    case "communications":
      return <CommsPanel />;
    case "discrepancies":
      return <DiscrepancyList />;
    default:
      return <OutboundDashboard />;
  }
}


