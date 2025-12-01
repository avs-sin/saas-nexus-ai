"use client";

import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MotionEffect } from "@/components/ui/motion-effect";
import { cn } from "@/lib/utils";

interface ActivityEntry {
  _id: string;
  action: string;
  entityType: string;
  description: string;
  createdAt: number;
  userName: string;
}

interface ActivityWidgetProps {
  activities: ActivityEntry[] | undefined;
}

export function ActivityWidget({ activities }: ActivityWidgetProps) {
  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return 'bg-emerald-500';
      case 'update':
        return 'bg-blue-500';
      case 'delete':
        return 'bg-destructive';
      default:
        return 'bg-primary';
    }
  };

  if (!activities) {
    return (
      <Card className="h-full overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Recent Activity
          </CardTitle>
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Activity className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <MotionEffect fade slide={{ direction: "up", offset: 20 }} delay={0.3} className="h-full">
        <Card className="h-full overflow-hidden border-dashed">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Latest Updates
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center text-center py-10 h-full">
              <div className="h-16 w-16 rounded-full bg-muted/50 mb-4 flex items-center justify-center ring-1 ring-border">
                <Activity className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-sm font-medium text-foreground">Nothing happened yet</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-[12rem]">
                Updates from your team will show up here
              </p>
            </div>
          </CardContent>
        </Card>
      </MotionEffect>
    );
  }

  return (
    <MotionEffect fade slide={{ direction: "up", offset: 20 }} delay={0.3} className="h-full">
      <Card className="h-full overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Latest Updates
          </CardTitle>
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Activity className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <MotionEffect
                key={activity._id}
                fade
                slide={{ direction: "right", offset: 10 }}
                delay={0.05 * index}
              >
                <div className="flex items-start gap-3 group">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm font-semibold text-primary ring-2 ring-background">
                      {activity.userName.charAt(0).toUpperCase()}
                    </div>
                    <span 
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-background",
                        getActionColor(activity.action)
                      )} 
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate group-hover:text-primary transition-colors">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span className="font-medium">{activity.userName}</span>
                      <span className="mx-1.5">·</span>
                      <span>{formatTime(activity.createdAt)}</span>
                    </p>
                  </div>
                </div>
              </MotionEffect>
            ))}
          </div>
        </CardContent>
      </Card>
    </MotionEffect>
  );
}
