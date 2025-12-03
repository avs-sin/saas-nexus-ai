"use client";

import { Marquee } from "@/components/ui/marquee";
import {
  Eye,
  Brain,
  Shield,
  Plug,
  Clock,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const benefits = [
  {
    icon: Eye,
    text: "Real-time Visibility",
    color: "text-blue-500",
  },
  {
    icon: Brain,
    text: "AI-powered Suggestions",
    color: "text-purple-500",
  },
  {
    icon: Shield,
    text: "Multi-tenant Isolation",
    color: "text-emerald-500",
  },
  {
    icon: Plug,
    text: "EDI Integration",
    color: "text-amber-500",
  },
  {
    icon: Clock,
    text: "Automated Workflows",
    color: "text-rose-500",
  },
  {
    icon: TrendingUp,
    text: "Demand Forecasting",
    color: "text-cyan-500",
  },
  {
    icon: Users,
    text: "Vendor Scorecards",
    color: "text-indigo-500",
  },
  {
    icon: Zap,
    text: "Real-time Sync",
    color: "text-orange-500",
  },
];

function BenefitCard({
  icon: Icon,
  text,
  color,
}: {
  icon: typeof Eye;
  text: string;
  color: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-full border bg-card px-5 py-2.5 shadow-sm",
        "transition-all hover:shadow-md hover:scale-[1.02]"
      )}
    >
      <Icon className={cn("h-5 w-5", color)} />
      <span className="text-sm font-medium text-foreground whitespace-nowrap">
        {text}
      </span>
    </div>
  );
}

export function BenefitsMarquee() {
  return (
    <section className="py-12 overflow-hidden">
      <div className="relative">
        {/* Fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent z-10" />

        <Marquee pauseOnHover className="[--duration:35s]">
          {benefits.map((benefit) => (
            <BenefitCard key={benefit.text} {...benefit} />
          ))}
        </Marquee>

        <Marquee reverse pauseOnHover className="[--duration:35s] mt-4">
          {[...benefits].reverse().map((benefit) => (
            <BenefitCard key={benefit.text} {...benefit} />
          ))}
        </Marquee>
      </div>
    </section>
  );
}

