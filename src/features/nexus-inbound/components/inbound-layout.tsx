'use client';

import React, { useState, useEffect } from 'react';
import {
  Bot,
  PlayCircle,
  Info,
  Loader2,
} from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';

import { InboundDashboard } from './dashboard';
import { ReceivingTerminal } from './receiving-terminal';
import { DiscrepancyQueue } from './discrepancy-queue';
import { VendorScorecard } from './vendor-scorecard';
import { AIAssistant } from './ai-assistant';

type View = 'dashboard' | 'receiving' | 'discrepancies' | 'scorecards';

interface InboundLayoutProps {
  initialView?: View;
}

export function InboundLayout({ initialView = 'dashboard' }: InboundLayoutProps) {
  const [currentView, setCurrentView] = useState<View>(initialView);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Sync view state with prop changes (for URL-based navigation)
  useEffect(() => {
    setCurrentView(initialView);
  }, [initialView]);

  // Data Loading
  const data = useQuery(api.nexusInbound.getDashboardData);
  const seedData = useMutation(api.nexusInbound.seedData);
  const simulateLog = useMutation(api.nexusInbound.logEdiMessage);

  // Auto-seed if empty
  useEffect(() => {
    if (data && data.vendors.length === 0) {
      seedData().then(() => setNotification('Demo data seeded for your organization.'));
    }
  }, [data, seedData]);

  if (!data) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">Loading Nexus Inbound data...</p>
      </div>
    );
  }

  const handleSimulate = async () => {
    await simulateLog({
      type: '856',
      direction: 'Inbound',
      partner: 'Acme Industrial',
      timestamp: new Date().toLocaleTimeString(),
      status: 'Processed',
      rawSize: '15KB',
    });
    setNotification('System Event: EDI Traffic Simulated.');
    setTimeout(() => setNotification(null), 3000);
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <InboundDashboard data={data} />;
      case 'receiving':
        return <ReceivingTerminal data={data} />;
      case 'discrepancies':
        return <DiscrepancyQueue data={data} />;
      case 'scorecards':
        return <VendorScorecard data={data} />;
      default:
        return <InboundDashboard data={data} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions - Minimal, matching NexusPlan style */}
      <div className="flex justify-end items-center gap-2">
        <Button variant="secondary" size="sm" onClick={handleSimulate}>
          <PlayCircle className="h-4 w-4 mr-2" /> Simulate EDI
        </Button>

        <Button
          variant={isAiOpen ? 'default' : 'outline'}
          size="sm"
          onClick={() => setIsAiOpen(!isAiOpen)}
        >
          <Bot className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Copilot</span>
        </Button>
      </div>

      {/* Main Content */}
      {renderView()}

      {/* AI Assistant */}
      <AIAssistant isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} data={data} />

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground pl-4 pr-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-primary-foreground/20 p-1 rounded-full">
            <Info className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium">{notification}</span>
        </div>
      )}
    </div>
  );
}

