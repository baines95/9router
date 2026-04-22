"use client";

import { Card, CardHeader, CardTitle, CardContent } from"@/components/ui/card";
import { cn } from"@/lib/utils";

const fmt = (n) => new Intl.NumberFormat().format(n || 0);
const fmtCost = (n) => `$${(n || 0).toFixed(2)}`;

function StatCard({ label, value, valueClass }) {
 return (
 <Card className="border-border/50 bg-background/50 shadow-none hover:bg-muted/10 transition-colors">
 <CardHeader className="p-3 pb-2 border-b border-border/50">
 <span className="text-xs font-medium text-foreground capitalize">
 {label}
 </span>
 </CardHeader>
 <CardContent className="p-3 pt-3">
 <span className={cn("text-xl font-semibold tabular-nums", valueClass)}>
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
 label="Tổng số yêu cầu"
 value={fmt(stats.totalRequests)} 
 />
 <StatCard 
 label="Token Nhập"
 value={fmt(stats.totalPromptTokens)} 
 valueClass="text-primary"
 />
 <StatCard 
 label="Token Xuất"
 value={fmt(stats.totalCompletionTokens)} 
 valueClass="text-primary"
 />
 <StatCard 
 label="Chi phí ước tính"
 value={`~${fmtCost(stats.totalCost)}`} 
 valueClass="text-muted-foreground"
 />
 </div>
 );
}
