"use client";

import { useState, useEffect, useCallback } from"react";
import { Terminal } from "@phosphor-icons/react";
import { translate } from "@/i18n/runtime";
import { Skeleton } from"@/components/ui/skeleton";
import { Badge, CardSkeleton } from"@/shared/components";
import { CLI_TOOLS } from"@/shared/constants/cliTools";
import { getModelsByProviderId, PROVIDER_ID_TO_ALIAS } from"@/shared/constants/models";
import { ClaudeToolCard, CodexToolCard, DroidToolCard, OpenClawToolCard, DefaultToolCard, OpenCodeToolCard, MitmLinkCard } from"./components";
import { MITM_TOOLS } from"@/shared/constants/cliTools";

const CLOUD_URL = process.env.NEXT_PUBLIC_CLOUD_URL;

const STATUS_ENDPOINTS = {
 claude:"/api/cli-tools/claude-settings",
 codex:"/api/cli-tools/codex-settings",
 opencode:"/api/cli-tools/opencode-settings",
 droid:"/api/cli-tools/droid-settings",
 openclaw:"/api/cli-tools/openclaw-settings",
};

export default function CLIToolsPageClient({ machineId }) {
 const [connections, setConnections] = useState([]);
 const [loading, setLoading] = useState(true);
 const [expandedTool, setExpandedTool] = useState(null);
 const [modelMappings, setModelMappings] = useState({});
 const [cloudEnabled, setCloudEnabled] = useState(false);
 const [tunnelEnabled, setTunnelEnabled] = useState(false);
 const [tunnelPublicUrl, setTunnelPublicUrl] = useState("");
 const [apiKeys, setApiKeys] = useState([]);
 const [toolStatuses, setToolStatuses] = useState({});

 useEffect(() => {
 fetchConnections();
 loadCloudSettings();
 fetchApiKeys();
 fetchAllStatuses();
 }, []);

 const fetchAllStatuses = async () => {
 try {
 const entries = await Promise.all(
 Object.entries(STATUS_ENDPOINTS).map(async ([toolId, url]) => {
 try {
 const res = await fetch(url);
 const data = await res.json();
 return [toolId, data];
 } catch {
 return [toolId, null];
 }
 })
 );
 setToolStatuses(Object.fromEntries(entries));
 } catch (error) {
 console.error("Error fetching tool statuses:", error);
 }
 };

 const loadCloudSettings = async () => {
 try {
 const [settingsRes, tunnelRes] = await Promise.all([
 fetch("/api/settings"),
 fetch("/api/tunnel/status"),
 ]);
 if (settingsRes.ok) {
 const data = await settingsRes.json();
 setCloudEnabled(data.cloudEnabled || false);
 }
 if (tunnelRes.ok) {
 const data = await tunnelRes.json();
 setTunnelEnabled(data.enabled || false);
 setTunnelPublicUrl(data.publicUrl ||"");
 }
 } catch (error) {
 console.error("Error loading settings:", error);
 }
 };

 const fetchApiKeys = async () => {
 try {
 const res = await fetch("/api/keys");
 if (res.ok) {
 const data = await res.json();
 setApiKeys(data.keys || []);
 }
 } catch (error) {
 console.error("Error fetching API keys:", error);
 }
 };

 const fetchConnections = async () => {
 try {
 const res = await fetch("/api/providers");
 const data = await res.json();
 if (res.ok) {
 setConnections(data.connections || []);
 }
 } catch (error) {
 console.error("Error fetching connections:", error);
 } finally {
 setLoading(false);
 }
 };

 const getActiveProviders = () => connections.filter(c => c.isActive !== false);

 const getAllAvailableModels = () => {
 const activeProviders = getActiveProviders();
 const models = [];
 const seenModels = new Set();
 activeProviders.forEach(conn => {
 const alias = PROVIDER_ID_TO_ALIAS[conn.provider] || conn.provider;
 const providerModels = getModelsByProviderId(conn.provider);
 providerModels.forEach(m => {
 const modelValue = `${alias}/${m.id}`;
 if (!seenModels.has(modelValue)) {
 seenModels.add(modelValue);
 models.push({ value: modelValue, label: `${alias}/${m.id}`, provider: conn.provider, alias, connectionName: conn.name, modelId: m.id });
 }
 });
 });
 return models;
 };

 const handleModelMappingChange = useCallback((toolId, modelAlias, targetModel) => {
 setModelMappings(prev => {
 if (prev[toolId]?.[modelAlias] === targetModel) return prev;
 return { ...prev, [toolId]: { ...prev[toolId], [modelAlias]: targetModel } };
 });
 }, []);

 const getBaseUrl = () => {
 if (tunnelEnabled && tunnelPublicUrl) return tunnelPublicUrl;
 if (cloudEnabled && CLOUD_URL) return CLOUD_URL;
 if (typeof window !=="undefined") return window.location.origin;
 return"http://localhost:20128";
 };

 if (loading) {
 return (
 <div className="mx-auto max-w-7xl flex flex-col gap-8 pb-10 px-4">
 <div className="space-y-2 py-4">
 <Skeleton className="h-8 w-48"/>
 <Skeleton className="h-4 w-full max-w-xl"/>
 </div>
 <div className="flex flex-col gap-4">
 <CardSkeleton />
 <CardSkeleton />
 <CardSkeleton />
 </div>
 </div>
 );
 }

 const availableModels = getAllAvailableModels();
 const hasActiveProviders = availableModels.length > 0;

 const renderToolCard = (toolId, tool) => {
 const commonProps = {
 tool,
 isExpanded: expandedTool === toolId,
 onToggle: () => setExpandedTool(expandedTool === toolId ? null : toolId),
 baseUrl: getBaseUrl(),
 apiKeys,
 };

 switch (toolId) {
 case"claude":
 return (
 <ClaudeToolCard
 key={toolId}
 {...commonProps}
 activeProviders={getActiveProviders()}
 modelMappings={modelMappings[toolId] || {}}
 onModelMappingChange={(alias, target) => handleModelMappingChange(toolId, alias, target)}
 hasActiveProviders={hasActiveProviders}
 cloudEnabled={cloudEnabled}
 initialStatus={toolStatuses.claude}
 />
 );
 case"codex":
 return <CodexToolCard key={toolId} {...commonProps} activeProviders={getActiveProviders()} cloudEnabled={cloudEnabled} initialStatus={toolStatuses.codex} />;
 case"opencode":
 return <OpenCodeToolCard key={toolId} {...commonProps} activeProviders={getActiveProviders()} cloudEnabled={cloudEnabled} initialStatus={toolStatuses.opencode} />;
 case"droid":
 return <DroidToolCard key={toolId} {...commonProps} activeProviders={getActiveProviders()} hasActiveProviders={hasActiveProviders} cloudEnabled={cloudEnabled} initialStatus={toolStatuses.droid} />;
 case"openclaw":
 return <OpenClawToolCard key={toolId} {...commonProps} activeProviders={getActiveProviders()} hasActiveProviders={hasActiveProviders} cloudEnabled={cloudEnabled} initialStatus={toolStatuses.openclaw} />;
 default:
 return <DefaultToolCard key={toolId} toolId={toolId} {...commonProps} activeProviders={getActiveProviders()} cloudEnabled={cloudEnabled} tunnelEnabled={tunnelEnabled} />;
 }
 };

 const regularTools = Object.entries(CLI_TOOLS);
 const mitmTools = Object.entries(MITM_TOOLS);

 return (
 <div className="mx-auto max-w-7xl flex flex-col gap-6 py-6 px-4">
 {/* Page Header */}
 <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/50">
 <div className="space-y-1">
 <div className="flex items-center gap-2 text-muted-foreground font-medium text-xs uppercase tracking-tight">
 <Terminal className="size-4" weight="bold"/>
 Phát triển
 </div>
 <h1 className="text-3xl font-medium tracking-tight">CLI Tools</h1>
 <p className="text-sm text-muted-foreground font-medium">
 {translate("Configure CLI tools like Claude Code, Cursor, etc. to use with 8Router.")}
 </p>
 </div>
 </header>

 <div className="flex flex-col gap-8 mt-4">
 <section className="space-y-4">
 <div className="flex items-center gap-2 px-1">
 <span className="text-xs font-medium uppercase tracking-tight text-muted-foreground/50">Phổ biến</span>
 <div className="h-px flex-1 bg-gradient-to-r from-border/50 to-transparent"></div>
 </div>
 <div className="flex flex-col gap-3">
 {regularTools.map(([toolId, tool]) => renderToolCard(toolId, tool))}
 </div>
 </section>

 {mitmTools.length > 0 && (
 <section className="space-y-4">
 <div className="flex items-center gap-2 px-1">
 <span className="text-xs font-medium uppercase tracking-tight text-muted-foreground/50">MITM Tools & Proxies</span>
 <div className="h-px flex-1 bg-gradient-to-r from-border/50 to-transparent"></div>
 </div>
 <div className="flex flex-col gap-3">
 {mitmTools.map(([toolId, tool]) => (
 <MitmLinkCard key={toolId} tool={tool} />
 ))}
 </div>
 </section>
 )}
 </div>
 </div>
 );
}
