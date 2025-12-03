"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

// Map path segments to display names
const pathNames: Record<string, string> = {
  inventory: "Inventory",
  orders: "Orders",
  warehouses: "Warehouses",
  settings: "Settings",
  new: "New",
  edit: "Edit",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // First segment is the org slug
  const orgSlug = segments[0];
  const pathSegments = segments.slice(1);

  if (pathSegments.length === 0) {
    return (
      <nav className="flex items-center text-sm text-muted-foreground">
        <Home className="h-4 w-4" />
        <ChevronRight className="h-4 w-4 mx-1" />
        <span className="font-medium text-foreground">Dashboard</span>
      </nav>
    );
  }

  return (
    <nav className="flex items-center text-sm text-muted-foreground">
      <Link
        href={`/${orgSlug}`}
        className="hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>
      {pathSegments.map((segment, index) => {
        const href = `/${orgSlug}/${pathSegments.slice(0, index + 1).join("/")}`;
        const isLast = index === pathSegments.length - 1;
        const displayName = pathNames[segment] || segment;

        return (
          <span key={segment} className="flex items-center">
            <ChevronRight className="h-4 w-4 mx-1" />
            {isLast ? (
              <span className={cn("font-medium text-foreground")}>
                {displayName}
              </span>
            ) : (
              <Link
                href={href}
                className="hover:text-foreground transition-colors"
              >
                {displayName}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}










