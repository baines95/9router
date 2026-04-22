"use client";

import * as React from "react";
import {
  Tooltip as ShadcnTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function Tooltip({ text, children, position = "top" }) {
  if (!text) return children;

  return (
    <ShadcnTooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side={position} className="bg-gray-900 text-white border-none text-[11px] px-2 py-1">
        <p>{text}</p>
      </TooltipContent>
    </ShadcnTooltip>
  );
}
