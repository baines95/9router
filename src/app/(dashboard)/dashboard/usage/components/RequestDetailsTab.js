"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  ChevronRight, 
  Search, 
  RotateCcw, 
  ExternalLink, 
  Clock, 
  Zap, 
  Database, 
  ArrowUp, 
  ArrowDown, 
  Activity,
  History,
  FileJson,
  Languages,
  Code2,
  Terminal,
  BrainCircuit,
  Filter,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetScrollArea
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AI_PROVIDERS, getProviderByAlias } from "@/shared/constants/providers";

let providerNameCache = null;
let providerNodesCache = null;

async function fetchProviderNames() {
  if (providerNameCache && providerNodesCache) return { providerNameCache, providerNodesCache };
  const nodesRes = await fetch("/api/provider-nodes");
  const nodesData = await nodesRes.json();
  const nodes = nodesData.nodes || [];
  providerNodesCache = {};
  for (const node of nodes) { providerNodesCache[node.id] = node.name; }
  providerNameCache = { ...AI_PROVIDERS, ...providerNodesCache };
  return { providerNameCache, providerNodesCache };
}

function getProviderName(providerId, cache) {
  if (!providerId || !cache) return providerId;
  const cached = cache[providerId];
  if (typeof cached === 'string') return cached;
  if (cached?.name) return cached.name;
  const providerConfig = getProviderByAlias(providerId) || AI_PROVIDERS[providerId];
  return providerConfig?.name || providerId;
}

function CollapsibleSection({ title, children, defaultOpen = false, icon: Icon = null }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-muted/5">
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-3.5 hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-2.5">
          {Icon && <Icon className="size-3.5 text-muted-foreground opacity-60" />}
          <span className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">{title}</span>
        </div>
        <ChevronRight className={cn("size-3.5 text-muted-foreground transition-transform duration-200", isOpen && "rotate-90")} />
      </button>
      {isOpen && <div className="p-4 border-t border-border bg-background">{children}</div>}
    </div>
  );
}

function getInputTokens(tokens) {
  const prompt = tokens?.prompt_tokens || tokens?.input_tokens || 0;
  const cache = tokens?.cached_tokens || tokens?.cache_read_input_tokens || 0;
  return prompt < cache ? cache : prompt;
}

export default function RequestDetailsTab() {
  const [details, setDetails] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, totalItems: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [providers, setProviders] = useState([]);
  const [providerNameCache, setProviderNameCache] = useState(null);
  const [filters, setFilters] = useState({ provider: "", startDate: "", endDate: "" });

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch("/api/usage/providers");
      const data = await res.json();
      setProviders(data.providers || []);
      const cache = await fetchProviderNames();
      setProviderNameCache(cache.providerNameCache);
    } catch (error) { console.error(error); }
  }, []);

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pagination.page.toString(), pageSize: pagination.pageSize.toString() });
      if (filters.provider) params.append("provider", filters.provider);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      const res = await fetch(`/api/usage/request-details?${params}`);
      const data = await res.json();
      setDetails(data.details || []);
      setPagination(prev => ({ ...prev, ...data.pagination }));
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, [pagination.page, pagination.pageSize, filters]);

  useEffect(() => { fetchProviders(); }, [fetchProviders]);
  useEffect(() => { fetchDetails(); }, [fetchDetails]);

  return (
    <div className="flex flex-col gap-6">
      {/* Filters Toolbar */}
      <Card className="shadow-none border-border bg-muted/20">
        <CardContent className="p-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="size-3.5 text-muted-foreground opacity-50" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-2">Filters</span>
          </div>

          <Select value={filters.provider} onValueChange={v => setFilters({ ...filters, provider: v })}>
             <SelectTrigger className="h-8 text-[11px] font-bold uppercase tracking-wider w-[180px] bg-background border-border"><SelectValue placeholder="All Providers" /></SelectTrigger>
             <SelectContent>{providers.map(p => <SelectItem key={p.id} value={p.id} className="text-[11px] font-bold uppercase">{p.name}</SelectItem>)}</SelectContent>
          </Select>

          <Input type="datetime-local" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} className="h-8 text-[11px] w-[180px] bg-background font-mono" />
          <span className="text-muted-foreground opacity-30 text-[10px] font-bold">TO</span>
          <Input type="datetime-local" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} className="h-8 text-[11px] w-[180px] bg-background font-mono" />

          <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase ml-auto" onClick={() => setFilters({ provider: "", startDate: "", endDate: "" })} disabled={!filters.provider && !filters.startDate && !filters.endDate}>
             <RotateCcw className="size-3 mr-2" /> Reset
          </Button>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="shadow-none border-border overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-muted/50 border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
              <tr>
                <th className="text-left p-4">Timestamp</th>
                <th className="text-left p-4">Model Pipeline</th>
                <th className="text-left p-4">Provider</th>
                <th className="text-right p-4">Input</th>
                <th className="text-right p-4">Output</th>
                <th className="text-left p-4">Latency (TTFT/Total)</th>
                <th className="text-center p-4">Inspection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan="7" className="p-20 text-center text-muted-foreground"><RefreshCw className="size-6 animate-spin mx-auto mb-2 opacity-20" /><p className="text-[10px] font-bold uppercase tracking-widest">Hydrating data logs...</p></td></tr>
              ) : details.length === 0 ? (
                <tr><td colSpan="7" className="p-20 text-center opacity-20 text-[10px] font-bold uppercase tracking-widest">No traffic logs found</td></tr>
              ) : details.map((d, i) => (
                <tr key={`${d.id}-${i}`} className="hover:bg-muted/30 transition-colors group">
                  <td className="p-4 tabular-nums text-muted-foreground">{new Date(d.timestamp).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                  <td className="p-4 font-mono font-bold text-xs">{d.model}</td>
                  <td className="p-4">
                     <Badge variant="outline" className="h-4 text-[8px] font-black uppercase border-border bg-muted/50 text-muted-foreground">
                        {getProviderName(d.provider, providerNameCache)}
                     </Badge>
                  </td>
                  <td className="p-4 text-right tabular-nums font-bold text-muted-foreground">{getInputTokens(d.tokens).toLocaleString()}</td>
                  <td className="p-4 text-right tabular-nums font-bold text-muted-foreground">{(d.tokens?.completion_tokens || 0).toLocaleString()}</td>
                  <td className="p-4">
                     <div className="flex flex-col gap-0.5 text-[11px] tabular-nums font-medium opacity-60">
                        <span>{d.latency?.ttft || 0}ms <span className="text-[9px] opacity-50 uppercase">TTFT</span></span>
                        <span>{d.latency?.total || 0}ms <span className="text-[9px] opacity-50 uppercase">TOTAL</span></span>
                     </div>
                  </td>
                  <td className="p-4 text-center">
                    <Button variant="ghost" size="icon" className="size-8 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/10 hover:text-primary" onClick={() => { setSelectedDetail(d); setIsSheetOpen(true); }}>
                       <ExternalLink className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Basic Pagination (To be replaced by standardized component if exists) */}
        {!loading && details.length > 0 && (
          <div className="p-4 border-t border-border bg-muted/10 flex items-center justify-between">
             <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Page {pagination.page} of {pagination.totalPages}</span>
             <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold uppercase" onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))} disabled={pagination.page <= 1}>PREV</Button>
                <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold uppercase" onClick={() => setPagination(p => ({ ...p, page: Math.min(pagination.totalPages, p.page + 1) }))} disabled={pagination.page >= pagination.totalPages}>NEXT</Button>
             </div>
          </div>
        )}
      </Card>

      {/* Inspector Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-xl border-l border-border p-0 flex flex-col">
          <SheetHeader className="p-6 border-b bg-muted/20 shrink-0">
             <div className="flex items-center gap-2 text-primary mb-1">
                <History className="size-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Transaction Log</span>
             </div>
             <SheetTitle className="text-xl font-bold tracking-tight">Request Details</SheetTitle>
             <SheetDescription className="text-xs font-medium">Deep inspection of gateway routing and responses.</SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1">
            {selectedDetail && (
              <div className="p-6 space-y-8 pb-10">
                {/* Meta Grid */}
                <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                   <MetaItem label="Request ID" value={selectedDetail.id} mono />
                   <MetaItem label="Timestamp" value={new Date(selectedDetail.timestamp).toLocaleString()} />
                   <MetaItem label="Model Target" value={selectedDetail.model} mono />
                   <MetaItem label="Active Provider" value={getProviderName(selectedDetail.provider, providerNameCache)} />
                   <div className="space-y-1">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Status</span>
                      <div><Badge className={cn("border-none h-5 text-[9px] font-black uppercase", selectedDetail.status === 'success' ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600")}>{selectedDetail.status}</Badge></div>
                   </div>
                   <div className="space-y-1">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Execution</span>
                      <div className="text-xs font-bold tabular-nums">{selectedDetail.latency?.total || 0}ms <span className="opacity-40 ml-1 font-medium">TOTAL</span></div>
                   </div>
                </div>

                {/* Data Flow Layers */}
                <div className="space-y-4 pt-4 border-t">
                  <CollapsibleSection title="Client Request (Original)" defaultOpen icon={FileJson}>
                     <CodeBlock content={selectedDetail.request} />
                  </CollapsibleSection>

                  {selectedDetail.providerRequest && (
                    <CollapsibleSection title="Provider Routing (Translated)" icon={Languages}>
                       <CodeBlock content={selectedDetail.providerRequest} />
                    </CollapsibleSection>
                  )}

                  {selectedDetail.providerResponse && (
                    <CollapsibleSection title="Provider Response (Raw)" icon={Code2}>
                       <CodeBlock content={selectedDetail.providerResponse} />
                    </CollapsibleSection>
                  )}

                  <CollapsibleSection title="Final Unified Response" defaultOpen icon={Terminal}>
                     {selectedDetail.response?.thinking && (
                        <div className="mb-4 space-y-2">
                           <div className="flex items-center gap-2 text-amber-600/80">
                              <BrainCircuit className="size-3.5" />
                              <span className="text-[9px] font-black uppercase tracking-widest">Cognitive Chain (Thinking)</span>
                           </div>
                           <pre className="p-4 rounded-xl bg-amber-500/[0.03] border border-amber-500/10 text-[11px] leading-relaxed font-mono text-amber-900/80 dark:text-amber-100/80 whitespace-pre-wrap">{selectedDetail.response.thinking}</pre>
                        </div>
                     )}
                     <CodeBlock content={selectedDetail.response?.content || "[No Content]"} />
                  </CollapsibleSection>
                </div>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function MetaItem({ label, value, mono = false }) {
  return (
    <div className="space-y-1">
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">{label}</p>
      <p className={cn("text-xs font-bold truncate", mono && "font-mono opacity-80")}>{value}</p>
    </div>
  );
}

function CodeBlock({ content }) {
  const text = typeof content === 'object' ? JSON.stringify(content, null, 2) : content;
  return (
    <pre className="p-4 rounded-xl bg-muted/40 border border-border font-mono text-[11px] leading-relaxed text-foreground/80 overflow-auto max-h-[400px] no-scrollbar">
      {text}
    </pre>
  );
}
