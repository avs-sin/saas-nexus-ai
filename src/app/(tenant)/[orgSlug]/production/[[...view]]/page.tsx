import { ProductionLayout } from "@/features/nexus-production";
import type { ProductionView } from "@/features/nexus-production";

interface ProductionPageProps {
  params: Promise<{
    orgSlug: string;
    view?: string[];
  }>;
}

export default async function ProductionPage({ params }: ProductionPageProps) {
  const { view } = await params;

  // Map URL segments to view names
  const viewMap: Record<string, ProductionView> = {
    "work-orders": "work-orders",
    "mrp": "mrp",
    "bom": "bom",
    "inventory": "inventory",
  };

  const currentView: ProductionView = view?.[0] ? viewMap[view[0]] || "dashboard" : "dashboard";

  return <ProductionLayout initialView={currentView} />;
}







