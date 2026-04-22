"use client";

import { useState, useEffect, useCallback } from"react";
import { Card } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Badge } from"@/components/ui/badge";
import { Input } from"@/components/ui/input";
import { ModelSelectModal } from"@/shared/components";
import Image from"next/image";
import { ChevronDown, ArrowRight, X, StopCircle, PlayCircle, AlertTriangle, AlertCircle } from"lucide-react";
import { cn } from"@/lib/utils";

/**
 * Per-tool MITM card — shows DNS status + model mappings.
 * - Auto-saves model mapping on blur or modal select
 * - Skips sudo modal if password is already cached
 * - Model mappings can only be edited when DNS is active
 */
export default function MitmToolCard({
 tool,
 isExpanded,
 onToggle,
 serverRunning,
 dnsActive,
 hasCachedPassword,
 apiKeys,
 activeProviders,
 hasActiveProviders,
 modelAliases = {},
 cloudEnabled,
 onDnsChange,
}) {
 const [loading, setLoading] = useState(false);
 const [warning, setWarning] = useState(null);
 const [showPasswordModal, setShowPasswordModal] = useState(false);
 const [sudoPassword, setSudoPassword] = useState("");
 const [pendingDnsAction, setPendingDnsAction] = useState(null);
 const [modalError, setModalError] = useState(null);
 const [modelMappings, setModelMappings] = useState({});
 const [modalOpen, setModalOpen] = useState(false);
 const [currentEditingAlias, setCurrentEditingAlias] = useState(null);

 const isWindows = typeof navigator !=="undefined"&& navigator.userAgent?.includes("Windows");

 useEffect(() => {
 if (isExpanded) loadSavedMappings();
 }, [isExpanded]);

 const loadSavedMappings = async () => {
 try {
 const res = await fetch(`/api/cli-tools/antigravity-mitm/alias?tool=${tool.id}`);
 if (res.ok) {
 const data = await res.json();
 if (Object.keys(data.aliases || {}).length > 0) setModelMappings(data.aliases);
 }
 } catch { /* ignore */ }
 };

 const saveMappings = useCallback(async (mappings) => {
 try {
 await fetch("/api/cli-tools/antigravity-mitm/alias", {
 method:"PUT",
 headers: {"Content-Type":"application/json"},
 body: JSON.stringify({ tool: tool.id, mappings }),
 });
 } catch { /* ignore */ }
 }, [tool.id]);

 const handleMappingBlur = (alias, value) => {
 saveMappings({ ...modelMappings, [alias]: value });
 };

 const handleModelMappingChange = (alias, value) => {
 setModelMappings(prev => ({ ...prev, [alias]: value }));
 };

 const openModelSelector = (alias) => {
 setCurrentEditingAlias(alias);
 setModalOpen(true);
 };

 const handleModelSelect = (model) => {
 if (!currentEditingAlias || model.isPlaceholder) return;
 const updated = { ...modelMappings, [currentEditingAlias]: model.value };
 setModelMappings(updated);
 saveMappings(updated);
 };

 const handleDnsToggle = () => {
 if (!serverRunning) return;
 const action = dnsActive ?"disable":"enable";
 if (isWindows || hasCachedPassword) {
 doDnsAction(action,"");
 } else {
 setPendingDnsAction(action);
 setShowPasswordModal(true);
 setModalError(null);
 }
 };

 const doDnsAction = async (action, password) => {
 setLoading(true);
 setWarning(null);
 try {
 const res = await fetch("/api/cli-tools/antigravity-mitm", {
 method:"PATCH",
 headers: {"Content-Type":"application/json"},
 body: JSON.stringify({ tool: tool.id, action, sudoPassword: password }),
 });
 const data = await res.json();
 if (!res.ok) throw new Error(data.error ||"Failed to toggle DNS");

 if (action ==="enable") {
 setWarning(`Restart ${tool.name} to apply changes`);
 }

 setShowPasswordModal(false);
 setSudoPassword("");
 onDnsChange?.(data);
 } catch { /* ignore */ } finally {
 setLoading(false);
 setPendingDnsAction(null);
 }
 };

 const handleConfirmPassword = () => {
 if (!sudoPassword.trim()) {
 setModalError("Sudo password is required");
 return;
 }
 doDnsAction(pendingDnsAction, sudoPassword);
 };

 return (
 <>
 <Card className="overflow-hidden p-3">
 <div className="flex items-center justify-between hover:cursor-pointer"onClick={onToggle}>
 <div className="flex items-center gap-3">
 <div className="size-8 flex items-center justify-center shrink-0">
 <Image
 src={tool.image}
 alt={tool.name}
 width={32}
 height={32}
 className="size-8 object-contain rounded-lg"
 sizes="32px"
 onError={(e) => { e.target.style.display ="none"; }}
 />
 </div>
 <div className="min-w-0">
 <div className="flex items-center gap-2">
 <h3 className="font-medium text-sm leading-none">{tool.name}</h3>
 {!serverRunning ? (
 <Badge variant="secondary"className="h-5 px-1.5 text-xs">Server off</Badge>
 ) : dnsActive ? (
 <Badge className="h-5 px-1.5 text-xs bg-primary/10 text-primary border-primary/20">Active</Badge>
 ) : (
 <Badge variant="outline"className="h-5 px-1.5 text-xs bg-muted/30 text-muted-foreground border-border/50">DNS off</Badge>
 )}
 </div>
 <p className="text-xs text-muted-foreground mt-1">Intercept {tool.name} requests via MITM proxy</p>
 </div>
 </div>
 <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", isExpanded &&"rotate-180")} />
 </div>

 {isExpanded && (
 <div className="mt-4 pt-4 border-t border-border/50 flex flex-col gap-4">
 {/* Info */}
 <div className="flex flex-col gap-0.5 text-xs text-muted-foreground px-1">
 <p>Toggle DNS to redirect {tool.name} traffic through 8Router via MITM.</p>
 {!dnsActive && (
 <p className="text-muted-foreground text-xs mt-1">
 ⚠️ Enable DNS to edit model mappings
 </p>
 )}
 </div>

 {/* Model Mappings */}
 {tool.defaultModels?.length > 0 && (
 <div className="flex flex-col gap-2">
 {tool.defaultModels.map((model) => (
 <div key={model.alias} className="flex items-center gap-2">
 <span className="w-32 shrink-0 text-xs font-semibold text-foreground text-right">{model.name}</span>
 <ArrowRight className="size-3 text-muted-foreground shrink-0"/>
 <Input
 type="text"
 value={modelMappings[model.alias] ||""}
 onChange={(e) => handleModelMappingChange(model.alias, e.target.value)}
 onBlur={(e) => handleMappingBlur(model.alias, e.target.value)}
 placeholder="provider/model-id"
 disabled={!dnsActive}
 className="h-8 flex-1 text-xs"
 />
 <Button
 variant="outline"
 size="sm"
 onClick={() => openModelSelector(model.alias)}
 disabled={!hasActiveProviders || !dnsActive}
 className="h-8 px-3 text-xs"
 >
 Select
 </Button>
 {modelMappings[model.alias] && (
 <Button
 variant="ghost"
 size="icon"
 onClick={() => {
 handleModelMappingChange(model.alias,"");
 saveMappings({ ...modelMappings, [model.alias]:""});
 }}
 className="size-8 text-muted-foreground hover:text-destructive"
 title="Clear"
 >
 <X className="size-3.5"/>
 </Button>
 )}
 </div>
 ))}
 </div>
 )}

 {tool.defaultModels?.length === 0 && (
 <p className="text-xs text-muted-foreground px-1">Model mappings will be available soon.</p>
 )}

 {/* Start / Stop DNS button */}
 <div className="flex flex-col gap-2 items-start">
 {dnsActive ? (
 <Button
 variant="destructive"
 size="sm"
 onClick={handleDnsToggle}
 disabled={!serverRunning || loading}
 className="h-8 bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
 >
 <StopCircle className="size-4 mr-1.5"/>
 Stop DNS
 </Button>
 ) : (
 <Button
 variant="default"
 size="sm"
 onClick={handleDnsToggle}
 disabled={!serverRunning || loading}
 className="h-8 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
 >
 <PlayCircle className="size-4 mr-1.5"/>
 Start DNS
 </Button>
 )}

 {/* Warning below button */}
 {warning && (
 <div className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-muted-foreground">
 <AlertTriangle className="size-3.5"/>
 <span>{warning}</span>
 </div>
 )}
 </div>
 </div>
 )}
 </Card>

 {/* Password Modal */}
 {showPasswordModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
 <div className="bg-background border border-border/50 rounded-xl p-6 w-full max-w-sm flex flex-col gap-4">
 <h3 className="font-semibold text-foreground">Sudo Password Required</h3>
 <div className="flex items-start gap-3 p-3 bg-muted/30 border border-border/50 rounded-lg">
 <AlertTriangle className="size-5 text-muted-foreground shrink-0"/>
 <p className="text-xs text-muted-foreground">Required to modify /etc/hosts and flush DNS cache</p>
 </div>
 <Input
 type="password"
 placeholder="Enter sudo password"
 value={sudoPassword}
 onChange={(e) => setSudoPassword(e.target.value)}
 onKeyDown={(e) => { if (e.key ==="Enter"&& !loading) handleConfirmPassword(); }}
 className="h-9"
 />
 {modalError && (
 <div className="flex items-center gap-2 px-2 py-1.5 rounded text-xs bg-destructive/10 text-destructive">
 <AlertCircle className="size-3.5"/>
 <span>{modalError}</span>
 </div>
 )}
 <div className="flex items-center justify-end gap-2">
 <Button variant="ghost"size="sm"onClick={() => { setShowPasswordModal(false); setSudoPassword(""); setModalError(null); }} disabled={loading}>
 Cancel
 </Button>
 <Button size="sm"onClick={handleConfirmPassword} disabled={loading}>
 {loading ?"Confirming...":"Confirm"}
 </Button>
 </div>
 </div>
 </div>
 )}

 {/* Model Select Modal */}
 <ModelSelectModal
 isOpen={modalOpen}
 onClose={() => setModalOpen(false)}
 onSelect={handleModelSelect}
 selectedModel={currentEditingAlias ? modelMappings[currentEditingAlias] : null}
 activeProviders={activeProviders}
 modelAliases={modelAliases}
 title={`Select model for ${currentEditingAlias}`}
 />
 </>
 );
}
