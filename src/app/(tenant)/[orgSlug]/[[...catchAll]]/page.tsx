import { notFound } from "next/navigation";

interface CatchAllPageProps {
  params: Promise<{ orgSlug: string; catchAll?: string[] }>;
}

// Valid routes that will be implemented later
const validRoutes = ["inventory", "orders", "warehouses", "settings"];

export default async function CatchAllPage({ params }: CatchAllPageProps) {
  const { catchAll } = await params;
  
  // If no catchAll, this shouldn't be hit (root page handles it)
  if (!catchAll || catchAll.length === 0) {
    notFound();
  }

  const rootPath = catchAll[0];

  // Check if it's a valid route
  if (!validRoutes.includes(rootPath)) {
    notFound();
  }

  // Placeholder pages for future features
  const pageContent: Record<string, { title: string; description: string }> = {
    inventory: {
      title: "Inventory Management",
      description: "Track and manage your inventory across all warehouses.",
    },
    orders: {
      title: "Production Orders",
      description: "Create and track production orders and shipments.",
    },
    warehouses: {
      title: "Warehouse Management",
      description: "Manage your warehouse locations and capacity.",
    },
    settings: {
      title: "Settings",
      description: "Configure your organization settings and preferences.",
    },
  };

  const content = pageContent[rootPath];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{content.title}</h1>
        <p className="text-muted-foreground mt-1">{content.description}</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <span className="text-2xl">🚧</span>
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">
          Coming Soon
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          This feature is currently in development and will be available in Phase 2.
        </p>
      </div>
    </div>
  );
}

