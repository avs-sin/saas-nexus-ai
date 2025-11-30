"use client";

import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Menu, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "./breadcrumbs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface TopbarProps {
  onMobileMenuToggle: () => void;
}

export function Topbar({ onMobileMenuToggle }: TopbarProps) {
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
            <OrganizationSwitcher
              appearance={{
                baseTheme: dark,
                elements: {
                  rootBox: "flex items-center",
                  organizationSwitcherTrigger:
                    "px-3 py-2 rounded-lg border border-border bg-background hover:bg-accent transition-colors",
                  organizationPreviewMainIdentifier: "text-foreground font-medium",
                  organizationPreviewSecondaryIdentifier: "text-muted-foreground",
                },
              }}
              afterCreateOrganizationUrl="/:slug"
              afterSelectOrganizationUrl="/:slug"
              afterLeaveOrganizationUrl="/"
            />
          </div>

          {/* Breadcrumbs */}
          <div className="hidden md:block">
            <Breadcrumbs />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <Badge 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  variant="default"
                >
                  3
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-4 text-center text-muted-foreground">
                <p className="text-sm">No new notifications</p>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Button */}
          <UserButton
            appearance={{
              baseTheme: dark,
              elements: {
                avatarBox: "h-9 w-9",
                userButtonTrigger: "rounded-lg",
              },
            }}
            afterSignOutUrl="/"
          />
        </div>
      </div>
    </header>
  );
}

