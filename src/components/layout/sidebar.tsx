"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  LayoutDashboard,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Factory,
  CalendarRange,
  Clock,
  AlertTriangle,
  BarChart3,
  Truck,
  FileBarChart,
  Package,
  Send,
  TrendingUp,
  Mail,
  Cog,
  Boxes,
  ClipboardList,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useEffect } from "react";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";

interface SidebarProps {
  orgSlug: string;
}

const navigation = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "",
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
    title: "Timeline",
    icon: Clock,
    href: "/timeline",
  },
  {
    id: "discrepancy",
    title: "Issues List",
    icon: AlertTriangle,
    href: "/discrepancy",
  },
  {
    id: "scorecard",
    title: "Performance",
    icon: BarChart3,
    href: "/scorecard",
  },
];

const nexusInboundNavigation = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "",
  },
  {
    id: "receiving",
    title: "Receiving",
    icon: Truck,
    href: "/receiving",
  },
  {
    id: "discrepancies",
    title: "Issues List",
    icon: AlertTriangle,
    href: "/discrepancies",
  },
  {
    id: "scorecards",
    title: "Vendor Quality",
    icon: FileBarChart,
    href: "/scorecards",
  },
];

const nexusProductionNavigation = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "",
  },
  {
    id: "work-orders",
    title: "Work Orders",
    icon: ClipboardList,
    href: "/work-orders",
  },
  {
    id: "mrp",
    title: "Supply Planning",
    icon: Cog,
    href: "/mrp",
  },
  {
    id: "inventory",
    title: "Inventory",
    icon: Boxes,
    href: "/inventory",
  },
];

const nexusOutboundNavigation = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "",
  },
  {
    id: "orders",
    title: "Order Queue",
    icon: Package,
    href: "/orders",
  },
  {
    id: "shipments",
    title: "Shipments",
    icon: Send,
    href: "/shipments",
  },
  {
    id: "forecast",
    title: "Demand Forecast",
    icon: TrendingUp,
    href: "/forecast",
  },
  {
    id: "communications",
    title: "AI Assistant",
    icon: Mail,
    href: "/communications",
  },
  {
    id: "discrepancies",
    title: "Issues List",
    icon: AlertTriangle,
    href: "/discrepancies",
  },
];

const bottomNavigation = [
  {
    title: "Settings",
    icon: Settings,
    href: "/settings",
  },
];

export function Sidebar({ orgSlug }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useLocalStorage("nexus:sidebar-collapsed", false);
  
  // Get suggestion counts for Command Center badge
  const tenantExists = useQuery(api.tenants.exists);
  const suggestionCounts = useQuery(
    api.nexusIntelligence.getSuggestionCounts,
    tenantExists ? {} : "skip"
  );
  
  // Route detection for auto-expand on first visit
  const isInNexusPlan = pathname.startsWith(`/${orgSlug}/nexusplan`);
  const isInNexusInbound = pathname.startsWith(`/${orgSlug}/inbound`);
  const isInNexusProduction = pathname.startsWith(`/${orgSlug}/production`);
  const isInNexusOutbound = pathname.startsWith(`/${orgSlug}/outbound`);
  const isInCommandCenter = pathname.startsWith(`/${orgSlug}/command-center`);

  // Persisted module expand/collapse states
  const [nexusPlanOpen, setNexusPlanOpen] = useLocalStorage("nexus:sidebar-nexusplan", isInNexusPlan);
  const [nexusInboundOpen, setNexusInboundOpen] = useLocalStorage("nexus:sidebar-inbound", isInNexusInbound);
  const [nexusProductionOpen, setNexusProductionOpen] = useLocalStorage("nexus:sidebar-production", isInNexusProduction);
  const [nexusOutboundOpen, setNexusOutboundOpen] = useLocalStorage("nexus:sidebar-outbound", isInNexusOutbound);

  // Keep modules expanded when navigating within them
  useEffect(() => {
    if (isInNexusPlan) {
      setNexusPlanOpen(true);
    }
    if (isInNexusInbound) {
      setNexusInboundOpen(true);
    }
    if (isInNexusProduction) {
      setNexusProductionOpen(true);
    }
    if (isInNexusOutbound) {
      setNexusOutboundOpen(true);
    }
  }, [isInNexusPlan, isInNexusInbound, isInNexusProduction, isInNexusOutbound]);

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

  const isNexusInboundItemActive = (href: string) => {
    const basePath = `/${orgSlug}/inbound`;
    const fullPath = `${basePath}${href}`;
    if (href === "") {
      return pathname === basePath || pathname === `${basePath}/`;
    }
    return pathname.startsWith(fullPath);
  };

  const isNexusProductionItemActive = (href: string) => {
    const basePath = `/${orgSlug}/production`;
    const fullPath = `${basePath}${href}`;
    if (href === "") {
      return pathname === basePath || pathname === `${basePath}/`;
    }
    return pathname.startsWith(fullPath);
  };

  const isNexusOutboundItemActive = (href: string) => {
    const basePath = `/${orgSlug}/outbound`;
    const fullPath = `${basePath}${href}`;
    if (href === "") {
      return pathname === basePath || pathname === `${basePath}/`;
    }
    return pathname.startsWith(fullPath);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "hidden md:flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
          <Link href={`/${orgSlug}`} className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
              <span className="text-primary-foreground font-bold text-sm">N</span>
            </div>
            {!collapsed && (
              <span className="font-semibold text-sidebar-foreground text-lg">
                Nexus AI
              </span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const active = isActive(item.href);
            const navItem = (
              <Link
                key={item.href}
                href={`/${orgSlug}${item.href}`}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", active && "text-sidebar-primary")} />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{navItem}</TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return navItem;
          })}

          {/* Command Center */}
          {(() => {
            const commandCenterItem = (
              <Link
                href={`/${orgSlug}/command-center`}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative",
                  isInCommandCenter
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <Sparkles className={cn("h-5 w-5 shrink-0", isInCommandCenter && "text-sidebar-primary")} />
                {!collapsed && <span className="flex-1">Command Center</span>}
                {(suggestionCounts?.pending ?? 0) > 0 && (
                  <Badge
                    variant={suggestionCounts?.critical && suggestionCounts.critical > 0 ? "destructive" : "default"}
                    className={cn(
                      "h-5 min-w-[1.25rem] px-1.5 text-xs font-semibold",
                      collapsed && "absolute -top-1 -right-1"
                    )}
                  >
                    {suggestionCounts?.pending}
                  </Badge>
                )}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip>
                  <TooltipTrigger asChild>{commandCenterItem}</TooltipTrigger>
                  <TooltipContent side="right" className="font-medium flex items-center gap-2">
                    Command Center
                    {(suggestionCounts?.pending ?? 0) > 0 && (
                      <Badge
                        variant={suggestionCounts?.critical && suggestionCounts.critical > 0 ? "destructive" : "default"}
                        className="h-5 min-w-[1.25rem] px-1.5 text-xs"
                      >
                        {suggestionCounts?.pending}
                      </Badge>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return commandCenterItem;
          })()}

          {/* Apps Section */}
          <div className="mt-4 mb-2 px-3">
             {!collapsed && (
              <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">
                Apps
              </p>
            )}
          </div>

          {/* NexusPlan Module - Collapsible */}
          {collapsed ? (
            // Collapsed: show icon with tooltip linking to NexusPlan dashboard
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={`/${orgSlug}/nexusplan`}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                    isInNexusPlan
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <Factory className={cn("h-5 w-5 shrink-0", isInNexusPlan && "text-sidebar-primary")} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                NexusPlan
              </TooltipContent>
            </Tooltip>
          ) : (
            // Expanded: show collapsible section
            <Collapsible open={nexusPlanOpen} onOpenChange={setNexusPlanOpen}>
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                    isInNexusPlan
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <Factory className={cn("h-5 w-5 shrink-0", isInNexusPlan && "text-sidebar-primary")} />
                  <span className="flex-1 text-left">NexusPlan</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform duration-200",
                      nexusPlanOpen && "rotate-180"
                    )}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapse data-[state=open]:animate-expand">
                <div className="ml-4 pl-3 border-l border-sidebar-border/50 mt-1 space-y-0.5">
                  {nexusPlanNavigation.map((item) => {
                    const active = isNexusPlanItemActive(item.href);
                    return (
                      <Link
                        key={item.id}
                        href={`/${orgSlug}/nexusplan${item.href}`}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm relative group",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm"
                            : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                        )}
                        <item.icon className={cn("h-4 w-4 shrink-0 transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                        <span>{item.title}</span>
                      </Link>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* NexusInbound Module - Collapsible */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={`/${orgSlug}/inbound`}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                    isInNexusInbound
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <Truck className={cn("h-5 w-5 shrink-0", isInNexusInbound && "text-sidebar-primary")} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                Nexus Inbound
              </TooltipContent>
            </Tooltip>
          ) : (
            <Collapsible open={nexusInboundOpen} onOpenChange={setNexusInboundOpen}>
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                    isInNexusInbound
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <Truck className={cn("h-5 w-5 shrink-0", isInNexusInbound && "text-sidebar-primary")} />
                  <span className="flex-1 text-left">Nexus Inbound</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform duration-200",
                      nexusInboundOpen && "rotate-180"
                    )}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapse data-[state=open]:animate-expand">
                <div className="ml-4 pl-3 border-l border-sidebar-border/50 mt-1 space-y-0.5">
                  {nexusInboundNavigation.map((item) => {
                    const active = isNexusInboundItemActive(item.href);
                    return (
                      <Link
                        key={item.id}
                        href={`/${orgSlug}/inbound${item.href}`}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm relative group",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm"
                            : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                        )}
                        <item.icon className={cn("h-4 w-4 shrink-0 transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                        <span>{item.title}</span>
                      </Link>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* NexusProduction Module - Collapsible */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={`/${orgSlug}/production`}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                    isInNexusProduction
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <Cog className={cn("h-5 w-5 shrink-0", isInNexusProduction && "text-sidebar-primary")} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                Nexus Production
              </TooltipContent>
            </Tooltip>
          ) : (
            <Collapsible open={nexusProductionOpen} onOpenChange={setNexusProductionOpen}>
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                    isInNexusProduction
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <Cog className={cn("h-5 w-5 shrink-0", isInNexusProduction && "text-sidebar-primary")} />
                  <span className="flex-1 text-left">Nexus Production</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform duration-200",
                      nexusProductionOpen && "rotate-180"
                    )}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapse data-[state=open]:animate-expand">
                <div className="ml-4 pl-3 border-l border-sidebar-border/50 mt-1 space-y-0.5">
                  {nexusProductionNavigation.map((item) => {
                    const active = isNexusProductionItemActive(item.href);
                    return (
                      <Link
                        key={item.id}
                        href={`/${orgSlug}/production${item.href}`}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm relative group",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm"
                            : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                        )}
                        <item.icon className={cn("h-4 w-4 shrink-0 transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                        <span>{item.title}</span>
                      </Link>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* NexusOutbound Module - Collapsible */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={`/${orgSlug}/outbound`}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                    isInNexusOutbound
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <Send className={cn("h-5 w-5 shrink-0", isInNexusOutbound && "text-sidebar-primary")} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                Nexus Outbound
              </TooltipContent>
            </Tooltip>
          ) : (
            <Collapsible open={nexusOutboundOpen} onOpenChange={setNexusOutboundOpen}>
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                    isInNexusOutbound
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <Send className={cn("h-5 w-5 shrink-0", isInNexusOutbound && "text-sidebar-primary")} />
                  <span className="flex-1 text-left">Nexus Outbound</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform duration-200",
                      nexusOutboundOpen && "rotate-180"
                    )}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapse data-[state=open]:animate-expand">
                <div className="ml-4 pl-3 border-l border-sidebar-border/50 mt-1 space-y-0.5">
                  {nexusOutboundNavigation.map((item) => {
                    const active = isNexusOutboundItemActive(item.href);
                    return (
                      <Link
                        key={item.id}
                        href={`/${orgSlug}/outbound${item.href}`}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm relative group",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm"
                            : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                        )}
                        <item.icon className={cn("h-4 w-4 shrink-0 transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                        <span>{item.title}</span>
                      </Link>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </nav>

        {/* Bottom Navigation */}
        <div className="p-3 space-y-1">
          <Separator className="mb-3" />
          {bottomNavigation.map((item) => {
            const active = isActive(item.href);
            const navItem = (
              <Link
                key={item.href}
                href={`/${orgSlug}${item.href}`}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", active && "text-sidebar-primary")} />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{navItem}</TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return navItem;
          })}

          {/* Theme Toggle & Collapse */}
          <div className={cn(
            "flex items-center mt-2",
            collapsed ? "justify-center" : "justify-between"
          )}>
            {!collapsed && <ThemeToggle />}
            <Button
              variant="ghost"
              size="sm"
              className={collapsed ? "w-full justify-center" : ""}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  <span>Collapse</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
