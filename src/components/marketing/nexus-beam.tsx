"use client";

import { forwardRef, useRef } from "react";
import { cn } from "@/lib/utils";
import { AnimatedBeam } from "@/components/ui/animated-beam";
import {
  LayoutDashboard,
  TrendingUp,
  PackageCheck,
  Truck,
  Factory,
} from "lucide-react";

const Circle = forwardRef<
  HTMLDivElement,
  { className?: string; children?: React.ReactNode; label?: string }
>(({ className, children, label }, ref) => {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        ref={ref}
        className={cn(
          "z-10 flex size-14 items-center justify-center rounded-full border-2 bg-white shadow-md transition-transform hover:scale-105",
          className
        )}
      >
        {children}
      </div>
      {label && (
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
          {label}
        </span>
      )}
    </div>
  );
});

Circle.displayName = "Circle";

export function NexusBeamDemo({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const commandCenterRef = useRef<HTMLDivElement>(null);
  const planRef = useRef<HTMLDivElement>(null);
  const inboundRef = useRef<HTMLDivElement>(null);
  const outboundRef = useRef<HTMLDivElement>(null);
  const productionRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className={cn(
        "relative flex h-[400px] w-full max-w-2xl items-center justify-center overflow-hidden rounded-xl border bg-background/50 backdrop-blur-sm p-10",
        className
      )}
      ref={containerRef}
    >
      <div className="flex size-full flex-col items-stretch justify-between gap-10">
        {/* Top row: Plan, Command Center, Production */}
        <div className="flex flex-row items-center justify-between">
          <Circle
            ref={planRef}
            className="border-emerald-300"
            label="NexusPlan"
          >
            <TrendingUp className="h-6 w-6 text-emerald-600" />
          </Circle>
          <Circle
            ref={commandCenterRef}
            className="size-20 border-slate-400 bg-slate-50"
            label="Command Center"
          >
            <LayoutDashboard className="h-8 w-8 text-slate-700" />
          </Circle>
          <Circle
            ref={productionRef}
            className="border-amber-300"
            label="NexusProduction"
          >
            <Factory className="h-6 w-6 text-amber-600" />
          </Circle>
        </div>

        {/* Bottom row: Inbound, Outbound */}
        <div className="flex flex-row items-center justify-around px-12">
          <Circle
            ref={inboundRef}
            className="border-blue-300"
            label="NexusInbound"
          >
            <PackageCheck className="h-6 w-6 text-blue-600" />
          </Circle>
          <Circle
            ref={outboundRef}
            className="border-purple-300"
            label="NexusOutbound"
          >
            <Truck className="h-6 w-6 text-purple-600" />
          </Circle>
        </div>
      </div>

      {/* Beams from Command Center to each module */}
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={commandCenterRef}
        toRef={planRef}
        curvature={-50}
        gradientStartColor="#10b981"
        gradientStopColor="#64748b"
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={commandCenterRef}
        toRef={productionRef}
        curvature={-50}
        gradientStartColor="#f59e0b"
        gradientStopColor="#64748b"
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={commandCenterRef}
        toRef={inboundRef}
        curvature={50}
        gradientStartColor="#3b82f6"
        gradientStopColor="#64748b"
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={commandCenterRef}
        toRef={outboundRef}
        curvature={50}
        gradientStartColor="#a855f7"
        gradientStopColor="#64748b"
      />

      {/* Cross-module connections */}
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={planRef}
        toRef={inboundRef}
        curvature={30}
        reverse
        delay={0.5}
        gradientStartColor="#10b981"
        gradientStopColor="#3b82f6"
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={productionRef}
        toRef={outboundRef}
        curvature={30}
        reverse
        delay={0.5}
        gradientStartColor="#f59e0b"
        gradientStopColor="#a855f7"
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={inboundRef}
        toRef={outboundRef}
        curvature={-30}
        delay={1}
        gradientStartColor="#3b82f6"
        gradientStopColor="#a855f7"
      />
    </div>
  );
}

