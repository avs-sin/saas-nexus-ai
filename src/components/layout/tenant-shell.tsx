"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileNav } from "./mobile-nav";

interface TenantShellProps {
  orgSlug: string;
  children: React.ReactNode;
}

export function TenantShell({ orgSlug, children }: TenantShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar - Desktop */}
      <Sidebar orgSlug={orgSlug} />

      {/* Mobile Navigation */}
      <MobileNav
        orgSlug={orgSlug}
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <Topbar onMobileMenuToggle={() => setMobileNavOpen(true)} />

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}




