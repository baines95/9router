"use client";

import Link from"next/link";
import { Card } from"@/shared/components";
import { Badge } from"@/shared/components";
import Image from"next/image";
import { ChevronRight, Shield } from"lucide-react";
import { cn } from"@/lib/utils";

/**
 * Clickable card for MITM tools — navigates to /dashboard/mitm on click.
 */
export default function MitmLinkCard({ tool }) {
 return (
 <Link href="/dashboard/mitm"className="block group">
 <Card className="overflow-hidden border-border/50 hover: hover:border-border/50 transition-all duration-300">
 <div className="flex items-center justify-between p-4 cursor-pointer select-none">
 <div className="flex items-center gap-4">
 <div className="relative size-10 flex-shrink-0 bg-background rounded-lg border border-border/50 p-1.5 flex items-center justify-center">
 {tool.image ? (
 <Image
 src={tool.image}
 alt={tool.name}
 width={28}
 height={28}
 className="object-contain"
 />
 ) : (
 <Shield className="text-muted-foreground size-5"/>
 )}
 </div>
 <div className="space-y-0.5">
 <div className="flex items-center gap-2">
 <h3 className="font-medium text-sm tracking-tight">{tool.name}</h3>
 <Badge variant="outline"className="h-5 px-1.5 text-xs bg-primary/10 text-primary border-purple-500/20 font-medium uppercase tracking-tight">MITM</Badge>
 </div>
 <p className="text-xs text-muted-foreground line-clamp-1 max-w-md">{tool.description}</p>
 </div>
 </div>
 <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"/>
 </div>
 </Card>
 </Link>
 );
}
