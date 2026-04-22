"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Check, FileCode } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ManualConfigModal({ isOpen, onClose, title = "Manual Configuration", configs = [] }) {
  const [copiedIndex, setCopiedIndex] = useState(null);
  const copyToClipboard = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) { console.log(err); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
             <FileCode className="size-5 text-primary" />
             {title}
          </DialogTitle>
          <DialogDescription>Manual system configuration for infrastructure integration.</DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
           <div className="space-y-6 py-2">
             {configs.map((config, index) => (
               <div key={index} className="space-y-2">
                 <div className="flex items-center justify-between px-1">
                   <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{config.filename}</span>
                   <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase" onClick={() => copyToClipboard(config.content, index)}>
                      {copiedIndex === index ? <Check className="size-3 mr-1.5 text-emerald-500" /> : <Copy className="size-3 mr-1.5" />}
                      {copiedIndex === index ? "Copied" : "Copy Source"}
                   </Button>
                 </div>
                 <pre className="p-4 rounded-xl bg-muted/40 border border-border font-mono text-[11px] leading-relaxed text-foreground/80 overflow-auto whitespace-pre-wrap break-all">
                   {config.content}
                 </pre>
               </div>
             ))}
           </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
