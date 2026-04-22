"use client";

import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Clock } from "lucide-react";

const formatResetTimeDisplay = (resetTime) => {
  if (!resetTime) return null;
  try {
    const resetDate = new Date(resetTime);
    if (isNaN(resetDate.getTime())) return null;

    const now = new Date();
    const isToday = resetDate.toDateString() === now.toDateString();
    const isTomorrow = new Date(now.getTime() + 86400000).toDateString() === resetDate.toDateString();

    const timeStr = resetDate.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    if (isToday) return `Hôm nay, ${timeStr}`;
    if (isTomorrow) return `Ngày mai, ${timeStr}`;

    return resetDate.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return null;
  }
};

export default function QuotaProgressBar({
  percentage = 0,
  label = "",
  used = 0,
  total = 0,
  unlimited = false,
  resetTime = null
}) {
  const resetDisplay = formatResetTimeDisplay(resetTime);
  const remaining = percentage;
  const isLow = remaining < 25;
  const isCritical = remaining < 10;

  return (
    <div className="flex flex-col gap-2.5 py-1 group/progress">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            {label}
          </span>
          {resetDisplay && (
            <div className="flex items-center gap-1 text-[9px] font-medium text-muted-foreground/40">
              <Clock className="size-2.5" />
              <span>Reset: {resetDisplay}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <div className="flex items-baseline gap-1">
            <span className={cn(
              "text-xs font-black tabular-nums tracking-tight",
              isCritical ? "text-destructive" : isLow ? "text-amber-500" : "text-foreground"
            )}>
              {unlimited ? "∞" : `${remaining}%`}
            </span>
            {!unlimited && <span className="text-[8px] font-bold text-muted-foreground/30 uppercase">Rem</span>}
          </div>
          <span className="text-[8px] font-medium text-muted-foreground/40 tabular-nums uppercase tracking-tighter">
            {unlimited ? "Không giới hạn" : `${used.toLocaleString()} / ${total.toLocaleString()}`}
          </span>
        </div>
      </div>
      
      {!unlimited && (
        <Progress 
          value={remaining} 
          className="h-1.5 bg-muted/30"
          indicatorClassName={cn(
            "transition-all duration-700 ease-out",
            isCritical ? "bg-destructive" : isLow ? "bg-amber-500" : "bg-primary"
          )}
        />
      )}
    </div>
  );
}
