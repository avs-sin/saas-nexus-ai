interface NexusPlanLayoutProps {
  children: React.ReactNode;
}

export default function NexusPlanLayout({ children }: NexusPlanLayoutProps) {
  // NexusPlan pages now render inside the main TenantShell
  // Navigation is handled by the unified sidebar's collapsible module section
  return <>{children}</>;
}
