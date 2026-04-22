"use client";

import { Loader2, MoreVertical, ShieldCheck, ShieldAlert, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import ProviderIcon from "@/shared/components/ProviderIcon";
import { formatResetTime, getQuotaRemainingPercent } from "./utils";

function QuotaRow({ quota }) {
  const remaining = getQuotaRemainingPercent(quota);
  const countdown = formatResetTime(quota.resetAt);
  const isLow = remaining < 25;
  const isCritical = remaining < 10;

  return (
    <div className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 border-b last:border-0 border-border">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-muted-foreground uppercase">
            {quota.name}
          </span>
          {countdown !== "-" && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
              <Clock className="size-3" />
              <span>Reset {countdown}</span>
            </div>
          )}
        </div>
        <div className="flex items-baseline gap-1">
          <span className={cn(
            "text-sm font-bold tabular-nums",
            isCritical ? "text-destructive" : isLow ? "text-amber-500" : "text-foreground"
          )}>
            {remaining}%
          </span>
          <span className="text-[10px] font-medium text-muted-foreground/50 uppercase">còn lại</span>
        </div>
      </div>
      
      <Progress 
        value={remaining} 
        className="h-2"
        indicatorClassName={cn(
          isCritical ? "bg-destructive" : isLow ? "bg-amber-500" : "bg-primary"
        )}
      />
    </div>
  );
}

export default function ProviderQuotaCard({
  connection,
  quota,
  isLoading,
  isSilentRefreshing,
  error,
  isInactive,
}) {
  const conn = connection;

  return (
    <Card className={cn(
      "shadow-none border-border overflow-hidden transition-all p-0",
      isInactive && "opacity-60 grayscale",
      isSilentRefreshing && "bg-muted/10"
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-3 border-b bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-background border border-border shadow-xs">
            <ProviderIcon
              src={`/providers/${conn.provider}.png`}
              alt={conn.provider}
              size={20}
              className="object-contain"
            />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-xs font-bold truncate tracking-tight">
              {conn.name || conn.provider}
            </CardTitle>
            <CardDescription className="text-[9px] uppercase font-bold text-muted-foreground/60">
              {conn.provider}
            </CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {quota?.plan && (
            <Badge variant="secondary" className="h-4 text-[8px] uppercase font-black bg-primary/10 text-primary border-none">
              {quota.plan}
            </Badge>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-7 text-muted-foreground/50 hover:text-foreground rounded-full" />}>
              <MoreVertical className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
               <DropdownMenuItem className="text-xs font-bold">Settings</DropdownMenuItem>
               <DropdownMenuItem className="text-destructive text-xs font-bold">Disconnect</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-4 flex-1">
        {isLoading && !isSilentRefreshing ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 className="size-5 animate-spin text-primary" />
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Polling...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-destructive">
            <AlertCircle className="size-5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Connection Error</span>
          </div>
        ) : quota?.quotas?.length ? (
          <div className="space-y-4">
            {quota.quotas.map((q, i) => <QuotaRow key={i} quota={q} />)}
          </div>
        ) : (
          <div className="py-10 text-center opacity-20">
            <span className="text-[10px] uppercase font-bold tracking-widest">No Data</span>
          </div>
        )}
      </CardContent>
      
      {quota?.quotas?.length > 0 && !isLoading && !error && (
         <CardFooter className="px-4 py-2 border-t bg-muted/50 justify-between">
            <span className="text-[10px] text-muted-foreground uppercase">Cập nhật: {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            <div className="flex items-center gap-1">
               <div className="size-1.5 rounded-full bg-emerald-500"></div>
               <span className="text-[10px] font-bold text-emerald-600 uppercase">Live</span>
            </div>
         </CardFooter>
      )}
    </Card>
  );
}
