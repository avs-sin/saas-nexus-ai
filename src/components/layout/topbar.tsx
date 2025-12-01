"use client";

import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { Menu, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "./breadcrumbs";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";

interface TopbarProps {
  onMobileMenuToggle: () => void;
}

export function Topbar({ onMobileMenuToggle }: TopbarProps) {
  // Prevent hydration mismatch from Clerk components
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
      <div className="flex items-center justify-between h-full px-4 md:px-6">
        {/* Left side */}
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onMobileMenuToggle}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Organization Switcher */}
          <div className="hidden sm:block">
            {mounted ? (
              <OrganizationSwitcher
                appearance={{
                  elements: {
                    rootBox: "flex items-center",
                    organizationSwitcherTrigger:
                      "px-3 py-2 rounded-lg border border-border bg-background hover:bg-accent transition-colors",
                    organizationPreviewMainIdentifier: "text-foreground font-medium",
                    organizationPreviewSecondaryIdentifier: "text-muted-foreground",
                  },
                }}
                hidePersonal={true}
              />
            ) : (
              <Skeleton className="h-10 w-40 rounded-lg" />
            )}
          </div>

          {/* Breadcrumbs */}
          <div className="hidden md:block">
            <Breadcrumbs />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {/* <Badge 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  variant="default"
                >
                  0
                </Badge> */}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h4 className="font-semibold text-sm">Alerts</h4>
                <span className="text-xs text-muted-foreground">0 New</span>
              </div>
              <div className="p-8 text-center text-muted-foreground">
                <div className="h-12 w-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
                  <Bell className="h-6 w-6 opacity-50" />
                </div>
                <p className="text-sm font-medium text-foreground">No new alerts</p>
                <p className="text-xs mt-1">We'll let you know when something important happens</p>
              </div>
              <div className="p-2 border-t border-border bg-muted/5 text-center">
                <Button variant="link" size="sm" className="text-xs h-auto py-1">
                  See past alerts
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Button */}
          {mounted ? (
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-9 w-9",
                  userButtonTrigger: "rounded-lg",
                },
              }}
            />
          ) : (
            <Skeleton className="h-9 w-9 rounded-full" />
          )}
        </div>
      </div>
    </header>
  );
}
