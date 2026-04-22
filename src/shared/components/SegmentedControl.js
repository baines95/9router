"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export default function SegmentedControl({
  options = [],
  value,
  onChange,
  size = "md",
  className,
}) {
  return (
    <Tabs value={value} onValueChange={onChange} className={className}>
      <TabsList className={cn(
        "bg-muted/50 p-1",
        size === "sm" && "h-8",
        size === "md" && "h-10",
        size === "lg" && "h-12"
      )}>
        {options.map((option) => (
          <TabsTrigger
            key={option.value}
            value={option.value}
            className={cn(
              "px-4 font-medium transition-all",
              size === "sm" && "text-xs px-2",
              size === "md" && "text-sm",
              size === "lg" && "text-base px-6"
            )}
          >
            {option.icon && (
              typeof option.icon === "string" ? (
                <span className="material-symbols-outlined text-[16px] mr-1.5">
                  {option.icon}
                </span>
              ) : (
                <span className="mr-1.5">{option.icon}</span>
              )
            )}
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
