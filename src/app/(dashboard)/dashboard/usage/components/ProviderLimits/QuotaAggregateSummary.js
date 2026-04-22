"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { BarChart2, Calendar } from "lucide-react";

function AggregateRow({ label, data, icon: Icon }) {
  if (!data) return null;

  const isLow = data.remainingPct < 25;
  const isCritical = data.remainingPct < 10;

  return (
    <Card className="shadow-none border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label} Quota</CardTitle>
        </div>
        <div className="flex flex-col items-end">
          <span className={cn(
            "text-2xl font-bold tracking-tight tabular-nums",
            isCritical ? "text-destructive" : isLow ? "text-amber-500" : "text-foreground"
          )}>
            {data.remainingPct}%
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="flex flex-col gap-4">
          <Progress 
            value={data.remainingPct} 
            indicatorClassName={cn(
              isCritical ? "bg-destructive" : isLow ? "bg-amber-500" : "bg-primary"
            )}
            className="h-1.5"
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Used</span>
              <span className="text-sm font-bold tabular-nums">{data.sumUsed.toLocaleString()}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Total</span>
              <span className="text-sm font-bold tabular-nums">{data.sumTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function QuotaAggregateSummary({ aggregate }) {
  if (!aggregate || aggregate.kind === "empty") return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <AggregateRow 
        label="Session" 
        data={aggregate.session} 
        icon={BarChart2} 
      />
      <AggregateRow 
        label="Weekly" 
        data={aggregate.weekly} 
        icon={Calendar} 
      />
    </div>
  );
}
