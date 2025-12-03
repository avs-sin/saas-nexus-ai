import { InboundLayout } from "@/features/nexus-inbound";

interface InboundPageProps {
  params: Promise<{
    orgSlug: string;
    view?: string[];
  }>;
}

export default async function InboundPage({ params }: InboundPageProps) {
  const { view } = await params;
  
  // Map URL segments to view names
  const viewMap: Record<string, 'dashboard' | 'receiving' | 'discrepancies' | 'scorecards'> = {
    'receiving': 'receiving',
    'discrepancies': 'discrepancies',
    'scorecards': 'scorecards',
  };
  
  const currentView = view?.[0] ? viewMap[view[0]] || 'dashboard' : 'dashboard';
  
  return <InboundLayout initialView={currentView} />;
}








