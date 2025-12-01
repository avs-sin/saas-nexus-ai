"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Bot, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductionDashboard } from "./dashboard";
import { WorkOrders } from "./work-orders";
import { MRPPlanner } from "./mrp-planner";
import { ProductionAIAssistant } from "./ai-assistant";
import type { ProductionView, ProductionDashboardData } from "../types";

interface ProductionLayoutProps {
  initialView?: ProductionView;
}

export function ProductionLayout({ initialView = "dashboard" }: ProductionLayoutProps) {
  const [currentView, setCurrentView] = useState<ProductionView>(initialView);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Sync view state with prop changes (for URL-based navigation)
  useEffect(() => {
    setCurrentView(initialView);
  }, [initialView]);

  // Data Loading
  const tenantExists = useQuery(api.tenants.exists);
  const data = useQuery(
    api.nexusProduction.getDashboardData,
    tenantExists ? {} : "skip"
  ) as ProductionDashboardData | null | undefined;

  if (data === undefined) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">Loading NexusProduction data...</p>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case "dashboard":
        return <ProductionDashboard />;
      case "work-orders":
        return <WorkOrders />;
      case "mrp":
        return <MRPPlanner />;
      default:
        return <ProductionDashboard />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-end items-center gap-2">
        <Button
          variant={isAiOpen ? "default" : "outline"}
          size="sm"
          onClick={() => setIsAiOpen(!isAiOpen)}
        >
          <Bot className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Copilot</span>
        </Button>
      </div>

      {/* Main Content */}
      {renderView()}

      {/* AI Assistant */}
      {data && (
        <ProductionAIAssistant
          isOpen={isAiOpen}
          onClose={() => setIsAiOpen(false)}
          data={data}
        />
      )}

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground pl-4 pr-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-primary-foreground/20 p-1 rounded-full">
            <Info className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium">{notification}</span>
        </div>
      )}
    </div>
  );
}

