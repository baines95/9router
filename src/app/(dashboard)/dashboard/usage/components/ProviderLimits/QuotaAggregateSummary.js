"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from"@/components/ui/card";
import { Progress } from"@/components/ui/progress";
import { cn } from"@/lib/utils";
import { ChartBar as BarChart2, CalendarBlank as Calendar } from"@phosphor-icons/react";

function AggregateRow({ label, data, icon: Icon }) {
 if (!data) return null;

 const isLow = data.remainingPct < 25;
 const isCritical = data.remainingPct < 10;

 return (
 <Card className="border-border/50 bg-background/50 shadow-none py-0">
 <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-2.5 border-b border-border/50">
 <div className="flex items-center gap-2">
 <Icon className="size-4 text-muted-foreground"/>
 <CardTitle className="text-sm font-medium text-foreground">{label} Quota</CardTitle>
 </div>
 <div className="flex flex-col items-end">
 <span className={cn(
"text-xl font-medium tracking-tight tabular-nums",
 isCritical ?"text-destructive": isLow ?"text-muted-foreground":"text-foreground"
 )}>
 {data.remainingPct}%
 </span>
 </div>
 </CardHeader>
 <CardContent className="px-4 py-3 flex-1 flex flex-col justify-center">
 <div className="flex flex-col gap-3">
 <Progress 
 value={data.remainingPct} 
 indicatorClassName={cn(
 isCritical ?"bg-destructive": isLow ?"bg-amber-500":"bg-primary"
 )}
 className="h-1.5 bg-muted/40"
 />
 <div className="flex items-center justify-between text-xs text-muted-foreground">
 <span>Used: <span className="font-medium text-foreground tabular-nums">{data.sumUsed.toLocaleString()}</span></span>
 <span>Total: <span className="font-medium text-foreground tabular-nums">{data.sumTotal.toLocaleString()}</span></span>
 </div>
 </div>
 </CardContent>
 </Card>
 );
}

export default function QuotaAggregateSummary({ aggregate }) {
 if (!aggregate || aggregate.kind ==="empty") return null;

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
