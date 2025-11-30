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
  {
    title: "Settings",
    icon: Settings,
    href: "/settings",
  },
];

export function MobileNav({ orgSlug, open, onClose }: MobileNavProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    const fullPath = `/${orgSlug}${href}`;
    if (href === "") {
      return pathname === `/${orgSlug}` || pathname === `/${orgSlug}/`;
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
            afterCreateOrganizationUrl="/:slug"
            afterSelectOrganizationUrl="/:slug"
            afterLeaveOrganizationUrl="/"
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
        </nav>
      </SheetContent>
    </Sheet>
  );
}

