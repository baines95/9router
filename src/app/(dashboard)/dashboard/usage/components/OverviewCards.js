"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const fmt = (n) => new Intl.NumberFormat().format(n || 0);
const fmtCost = (n) => `$${(n || 0).toFixed(2)}`;

function StatCard({ label, value, valueClass }) {
  return (
    <Card className="shadow-none border-border">
      <CardHeader className="p-3 pb-0">
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
          {label}
        </span>
      </CardHeader>
      <CardContent className="p-3 pt-1">
        <span className={cn("text-xl font-bold tabular-nums", valueClass)}>
          {value}
        </span>
      </CardContent>
    </Card>
  );
}

export default function OverviewCards({ stats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard 
        label="Total Requests" 
        value={fmt(stats.totalRequests)} 
      />
      <StatCard 
        label="Total Input Tokens" 
        value={fmt(stats.totalPromptTokens)} 
        valueClass="text-primary"
      />
      <StatCard 
        label="Output Tokens" 
        value={fmt(stats.totalCompletionTokens)} 
        valueClass="text-emerald-500"
      />
      <StatCard 
        label="Est. Cost" 
        value={`~${fmtCost(stats.totalCost)}`} 
        valueClass="text-amber-500"
      />
    </div>
  );
}
