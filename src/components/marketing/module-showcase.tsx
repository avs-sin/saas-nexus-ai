"use client";

import { motion } from "motion/react";
import {
  LayoutDashboard,
  TrendingUp,
  PackageCheck,
  Truck,
  Factory,
  Sparkles,
  Users,
  FileBarChart,
  Zap,
  Clock,
  Bot,
  BarChart3,
  Boxes,
  Send,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ModuleCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  features: { icon: React.ReactNode; text: string }[];
  color: string;
  delay: number;
}

function ModuleCard({
  title,
  description,
  icon,
  features,
  color,
  delay,
}: ModuleCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay }}
      className={cn(
        "group relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm transition-all hover:shadow-lg",
        "hover:-translate-y-1"
      )}
    >
      <div
        className={cn(
          "mb-4 flex h-12 w-12 items-center justify-center rounded-xl",
          color
        )}
      >
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mb-4 text-sm text-muted-foreground">{description}</p>
      <ul className="mt-auto space-y-2">
        {features.map((feature, index) => (
          <li
            key={index}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <span className="text-foreground/60">{feature.icon}</span>
            {feature.text}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

const modules: Omit<ModuleCardProps, "delay">[] = [
  {
    title: "Command Center",
    description:
      "Unified AI-powered operations hub that orchestrates decisions across all modules.",
    icon: <LayoutDashboard className="h-6 w-6 text-slate-700" />,
    color: "bg-slate-100",
    features: [
      { icon: <Sparkles className="h-4 w-4" />, text: "Cross-module AI suggestions" },
      { icon: <Zap className="h-4 w-4" />, text: "Real-time operations view" },
      { icon: <Bot className="h-4 w-4" />, text: "Intelligent task prioritization" },
    ],
  },
  {
    title: "NexusPlan",
    description:
      "Demand forecasting and vendor management with EDI integration and scorecards.",
    icon: <TrendingUp className="h-6 w-6 text-emerald-600" />,
    color: "bg-emerald-100",
    features: [
      { icon: <BarChart3 className="h-4 w-4" />, text: "Demand forecasting" },
      { icon: <Users className="h-4 w-4" />, text: "Customer & vendor scorecards" },
      { icon: <FileBarChart className="h-4 w-4" />, text: "PO version tracking" },
    ],
  },
  {
    title: "NexusInbound",
    description:
      "Streamlined receiving workflows with vendor quality tracking and discrepancy management.",
    icon: <PackageCheck className="h-6 w-6 text-blue-600" />,
    color: "bg-blue-100",
    features: [
      { icon: <Boxes className="h-4 w-4" />, text: "Receiving automation" },
      { icon: <FileBarChart className="h-4 w-4" />, text: "EDI 850/856/810 processing" },
      { icon: <Users className="h-4 w-4" />, text: "Vendor quality tracking" },
    ],
  },
  {
    title: "NexusOutbound",
    description:
      "End-to-end order fulfillment with AI-powered customer communications.",
    icon: <Truck className="h-6 w-6 text-purple-600" />,
    color: "bg-purple-100",
    features: [
      { icon: <Send className="h-4 w-4" />, text: "Order fulfillment queue" },
      { icon: <Clock className="h-4 w-4" />, text: "Shipment tracking" },
      { icon: <Bot className="h-4 w-4" />, text: "AI customer comms" },
    ],
  },
  {
    title: "NexusProduction",
    description:
      "Work order management with MRP planning and bill of materials control.",
    icon: <Factory className="h-6 w-6 text-amber-600" />,
    color: "bg-amber-100",
    features: [
      { icon: <Wrench className="h-4 w-4" />, text: "Work order scheduling" },
      { icon: <BarChart3 className="h-4 w-4" />, text: "MRP planning" },
      { icon: <Boxes className="h-4 w-4" />, text: "BOM management" },
    ],
  },
];

export function ModuleShowcase() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Five Modules. One Unified Platform.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Each module is purpose-built for a specific operational domain, yet
            they work together through AI-powered orchestration.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module, index) => (
            <ModuleCard key={module.title} {...module} delay={index * 0.1} />
          ))}
        </div>
      </div>
    </section>
  );
}

