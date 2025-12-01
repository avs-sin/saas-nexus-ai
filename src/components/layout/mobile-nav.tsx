"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Warehouse,
  Settings,
  X,
  Factory,
  ChevronDown,
  CalendarRange,
  Clock,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { OrganizationSwitcher } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useEffect } from "react";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";

interface MobileNavProps {
  orgSlug: string;
  open: boolean;
  onClose: () => void;
}

const navigation = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "",
  },
  {
    title: "Inventory",
    icon: Package,
    href: "/inventory",
  },
  {
    title: "Orders",
    icon: ClipboardList,
    href: "/orders",
  },
  {
    title: "Warehouses",
    icon: Warehouse,
    href: "/warehouses",
  },
];

const nexusPlanNavigation = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "",
  },
  {
    id: "planning",
    title: "Planning Board",
    icon: CalendarRange,
    href: "/planning",
  },
  {
    id: "timeline",
    title: "PO Timeline",
    icon: Clock,
    href: "/timeline",
  },
  {
    id: "discrepancy",
    title: "Discrepancy Inbox",
    icon: AlertTriangle,
    href: "/discrepancy",
  },
  {
    id: "scorecard",
    title: "Scorecards",
    icon: BarChart3,
    href: "/scorecard",
  },
];

const bottomNavigation = [
  {
    title: "Settings",
    icon: Settings,
    href: "/settings",
  },
];

export function MobileNav({ orgSlug, open, onClose }: MobileNavProps) {
  const pathname = usePathname();
  
  // Route detection for auto-expand on first visit
  const isInNexusPlan = pathname.startsWith(`/${orgSlug}/nexusplan`);
  
  // Persisted module expand/collapse state (shares key with desktop sidebar)
  const [nexusPlanOpen, setNexusPlanOpen] = useLocalStorage("nexus:sidebar-nexusplan", isInNexusPlan);

  // Keep modules expanded when navigating within them
  useEffect(() => {
    if (isInNexusPlan) {
      setNexusPlanOpen(true);
    }
  }, [isInNexusPlan, setNexusPlanOpen]);

  const isActive = (href: string) => {
    const fullPath = `/${orgSlug}${href}`;
    if (href === "") {
      return pathname === `/${orgSlug}` || pathname === `/${orgSlug}/`;
    }
    return pathname.startsWith(fullPath);
  };

  const isNexusPlanItemActive = (href: string) => {
    const basePath = `/${orgSlug}/nexusplan`;
    const fullPath = `${basePath}${href}`;
    if (href === "") {
      return pathname === basePath || pathname === `${basePath}/`;
    }
    return pathname.startsWith(fullPath);
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="h-16 flex flex-row items-center justify-between px-4 border-b border-border">
          <SheetTitle className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">N</span>
            </div>
            <span className="font-semibold text-lg">Nexus AI</span>
          </SheetTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </SheetHeader>

        <div className="p-4">
          {/* Organization Switcher */}
          <OrganizationSwitcher
            appearance={{
              baseTheme: dark,
              elements: {
                rootBox: "w-full",
                organizationSwitcherTrigger:
                  "w-full px-3 py-2 rounded-lg border border-border bg-background hover:bg-accent transition-colors justify-start",
                organizationPreviewMainIdentifier: "text-foreground font-medium",
                organizationPreviewSecondaryIdentifier: "text-muted-foreground",
              },
            }}
            hidePersonal={true}
          />
        </div>

        <Separator />

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={`/${orgSlug}${item.href}`}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  active
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", active && "text-primary")} />
                <span>{item.title}</span>
              </Link>
            );
          })}

          {/* Modules Section */}
          <Separator className="my-3" />
          <p className="px-3 py-1 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
            Modules
          </p>

          {/* NexusPlan Module - Collapsible */}
          <Collapsible open={nexusPlanOpen} onOpenChange={setNexusPlanOpen}>
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  isInNexusPlan
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <Factory className={cn("h-5 w-5", isInNexusPlan && "text-primary")} />
                <span className="flex-1 text-left">NexusPlan</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    nexusPlanOpen && "rotate-180"
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden">
              <div className="ml-4 pl-3 border-l border-border/50 mt-1 space-y-0.5">
                {nexusPlanNavigation.map((item) => {
                  const active = isNexusPlanItemActive(item.href);
                  return (
                    <Link
                      key={item.id}
                      href={`/${orgSlug}/nexusplan${item.href}`}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm",
                        active
                          ? "bg-accent/70 text-accent-foreground font-medium"
                          : "text-muted-foreground/80 hover:bg-accent/40 hover:text-foreground"
                      )}
                    >
                      <item.icon className={cn("h-4 w-4", active && "text-primary")} />
                      <span>{item.title}</span>
                    </Link>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator className="my-3" />

          {/* Bottom Navigation */}
          {bottomNavigation.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={`/${orgSlug}${item.href}`}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  active
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", active && "text-primary")} />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
