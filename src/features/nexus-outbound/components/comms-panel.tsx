"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Mail,
  Sparkles,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OutboundComm } from "../types";
import { formatRelativeTime } from "../types";

export function CommsPanel() {
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const comms = useQuery(api.nexusOutbound.getComms, {
    type: typeFilter !== "all" ? typeFilter : undefined,
    limit: 50,
  }) as OutboundComm[] | undefined;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "shipped":
        return <Send className="h-4 w-4 text-cyan-500" />;
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case "delayed":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "weekly_briefing":
        return <MessageSquare className="h-4 w-4 text-purple-500" />;
      case "inquiry_response":
        return <Mail className="h-4 w-4 text-blue-500" />;
      default:
        return <Mail className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <Send className="h-3 w-3" />;
      case "delivered":
        return <CheckCircle className="h-3 w-3 text-emerald-500" />;
      case "failed":
        return <XCircle className="h-3 w-3 text-red-500" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const typeCounts = {
    shipped: comms?.filter((c) => c.type === "shipped").length ?? 0,
    delivered: comms?.filter((c) => c.type === "delivered").length ?? 0,
    delayed: comms?.filter((c) => c.type === "delayed").length ?? 0,
    weekly_briefing: comms?.filter((c) => c.type === "weekly_briefing").length ?? 0,
    inquiry_response: comms?.filter((c) => c.type === "inquiry_response").length ?? 0,
  };

  const aiGeneratedCount = comms?.filter((c) => c.aiGenerated).length ?? 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          AI Communications
        </h2>
        <p className="text-muted-foreground">
          AI-generated customer communications and notification history
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Mail className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{comms?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">Communications</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Generated</CardTitle>
            <Sparkles className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aiGeneratedCount}</div>
            <p className="text-xs text-muted-foreground">
              {comms?.length ? Math.round((aiGeneratedCount / comms.length) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shipping Updates</CardTitle>
            <Send className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {typeCounts.shipped + typeCounts.delivered}
            </div>
            <p className="text-xs text-muted-foreground">Proactive notifications</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">B2B Briefings</CardTitle>
            <MessageSquare className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{typeCounts.weekly_briefing}</div>
            <p className="text-xs text-muted-foreground">Weekly summaries</p>
          </CardContent>
        </Card>
      </div>

      {/* Communications List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Communication Log
            </span>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="delayed">Delayed</SelectItem>
                <SelectItem value="weekly_briefing">Weekly Briefing</SelectItem>
                <SelectItem value="inquiry_response">Inquiry Response</SelectItem>
              </SelectContent>
            </Select>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {comms?.map((comm) => (
              <div
                key={comm._id}
                className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-1">{getTypeIcon(comm.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">{comm.subject || "No subject"}</p>
                        {comm.aiGenerated && (
                          <Badge
                            variant="outline"
                            className="text-xs flex items-center gap-1 shrink-0"
                          >
                            <Sparkles className="h-3 w-3" />
                            AI
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        To: {comm.recipient}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {comm.body}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Badge variant="outline" className="flex items-center gap-1">
                      {getStatusIcon(comm.status)}
                      {comm.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(comm.sentAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {(!comms || comms.length === 0) && (
              <div className="text-center py-12 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No communications yet</p>
                <p className="text-sm">
                  AI-generated notifications will appear here when shipments are processed
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}








