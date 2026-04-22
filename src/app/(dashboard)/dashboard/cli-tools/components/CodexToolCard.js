"use client";

import { useState, useEffect } from"react";
import { 
 RotateCcw, 
 Settings, 
 Info,
 X,
 BookOpen,
 ShieldAlert,
 Search
} from"lucide-react";
import { 
 Button, 
 Input, 
 ModelSelectModal, 
 ManualConfigModal,
 Tooltip
} from"@/shared/components";
import { BaseToolCard } from"./";

export default function CodexToolCard({ 
 tool, 
 isExpanded, 
 onToggle, 
 baseUrl, 
 apiKeys, 
 activeProviders, 
 cloudEnabled, 
 initialStatus 
}) {
 const [codexStatus, setCodexStatus] = useState(initialStatus || null);
 const [checkingCodex, setCheckingCodex] = useState(false);
 const [applying, setApplying] = useState(false);
 const [restoring, setRestoring] = useState(false);
 const [message, setMessage] = useState(null);
 const [showInstallGuide, setShowInstallGuide] = useState(false);
 const [selectedApiKey, setSelectedApiKey] = useState("");
 const [selectedModel, setSelectedModel] = useState("");
 const [subagentModel, setSubagentModel] = useState("");
 const [modalOpen, setModalOpen] = useState(false);
 const [modelAliases, setModelAliases] = useState({});
 const [showManualConfigModal, setShowManualConfigModal] = useState(false);
 const [customBaseUrl, setCustomBaseUrl] = useState("");

 useEffect(() => {
 if (apiKeys?.length > 0 && !selectedApiKey) {
 setSelectedApiKey(apiKeys[0].key);
 }
 }, [apiKeys, selectedApiKey]);

 useEffect(() => {
 if (initialStatus) setCodexStatus(initialStatus);
 }, [initialStatus]);

 useEffect(() => {
 if (isExpanded && !codexStatus) {
 checkCodexStatus();
 fetchModelAliases();
 }
 if (isExpanded) fetchModelAliases();
 }, [isExpanded]);

 const fetchModelAliases = async () => {
 try {
 const res = await fetch("/api/models/alias");
 const data = await res.json();
 if (res.ok) setModelAliases(data.aliases || {});
 } catch (error) { 
 console.log("Error fetching model aliases:", error); 
 }
 };

 useEffect(() => {
 if (codexStatus?.config) {
 const modelMatch = codexStatus.config.match(/^model\s*=\s*"([^"]+)"/m);
 if (modelMatch) setSelectedModel(modelMatch[1]);
 const subagentModelMatch = codexStatus.config.match(/\[agents\.subagent\]\s*\n\s*model\s*=\s*"([^"]+)"/m);
 if (subagentModelMatch) setSubagentModel(subagentModelMatch[1]);
 }
 }, [codexStatus]);

 const getConfigStatus = () => {
 if (!codexStatus?.installed) return"not_configured";
 if (!codexStatus.config) return"not_configured";
 const hasBaseUrl = codexStatus.config.includes(baseUrl) || codexStatus.config.includes("localhost") || codexStatus.config.includes("127.0.0.1");
 return hasBaseUrl ?"configured":"other";
 };

 const configStatus = getConfigStatus();

 const getEffectiveBaseUrl = () => {
 const url = customBaseUrl || `${baseUrl}/v1`;
 return url.endsWith("/v1") ? url : `${url}/v1`;
 };
 
 const getDisplayUrl = () => customBaseUrl || `${baseUrl}/v1`;

 const checkCodexStatus = async () => {
 setCheckingCodex(true);
 try {
 const res = await fetch("/api/cli-tools/codex-settings");
 const data = await res.json();
 setCodexStatus(data);
 } catch (error) {
 setCodexStatus({ installed: false, error: error.message });
 } finally {
 setCheckingCodex(false);
 }
 };

 const handleApplySettings = async () => {
 setApplying(true);
 setMessage(null);
 try {
 const keyToUse = (selectedApiKey && selectedApiKey.trim()) ? selectedApiKey : (!cloudEnabled ?"sk_8router": selectedApiKey);
 const res = await fetch("/api/cli-tools/codex-settings", {
 method:"POST",
 headers: {"Content-Type":"application/json"},
 body: JSON.stringify({ 
 baseUrl: getEffectiveBaseUrl(), 
 apiKey: keyToUse, 
 model: selectedModel, 
 subagentModel: subagentModel || selectedModel 
 }),
 });
 if (res.ok) {
 setMessage({ type:"success", text:"Áp dụng cấu hình thành công!"});
 checkCodexStatus();
 } else {
 const data = await res.json();
 setMessage({ type:"error", text: data.error ||"Không thể áp dụng cấu hình"});
 }
 } catch (error) { 
 setMessage({ type:"error", text: error.message }); 
 } finally { 
 setApplying(false); 
 }
 };

 const handleResetSettings = async () => {
 setRestoring(true);
 setMessage(null);
 try {
 const res = await fetch("/api/cli-tools/codex-settings", { method:"DELETE"});
 if (res.ok) {
 setMessage({ type:"success", text:"Đã đặt lại cấu hình!"});
 setSelectedModel(""); 
 setSubagentModel(""); 
 checkCodexStatus();
 } else {
 const data = await res.json();
 setMessage({ type:"error", text: data.error ||"Không thể đặt lại cấu hình"});
 }
 } catch (error) { 
 setMessage({ type:"error", text: error.message }); 
 } finally { 
 setRestoring(false); 
 }
 };

 const getManualConfigs = () => {
 const keyToUse = (selectedApiKey && selectedApiKey.trim()) ? selectedApiKey : (!cloudEnabled ?"sk_8router":"<API_KEY>");
 const configContent = `# 8Router Configuration for Codex CLI\nmodel ="${selectedModel}"\nmodel_provider ="8router"\n\n[model_providers.8router]\nname ="8Router"\nbase_url ="${getEffectiveBaseUrl()}"\nwire_api ="responses"\n\n[agents.subagent]\nmodel ="${subagentModel || selectedModel}"\n`;
 const authContent = JSON.stringify({ OPENAI_API_KEY: keyToUse }, null, 2);
 return [
 { filename:"~/.codex/config.toml", content: configContent }, 
 { filename:"~/.codex/auth.json", content: authContent }
 ];
 };

 return (
 <>
 <BaseToolCard
 tool={tool}
 isExpanded={isExpanded}
 onToggle={onToggle}
 status={configStatus}
 checking={checkingCodex}
 applying={applying}
 restoring={restoring}
 message={message}
 onApply={handleApplySettings}
 onReset={handleResetSettings}
 onShowManualConfig={() => setShowManualConfigModal(true)}
 onCheckStatus={checkCodexStatus}
 hasActiveProviders={activeProviders?.length > 0}
 >
 {!checkingCodex && codexStatus && !codexStatus.installed && (
 <div className="space-y-4">
 <div className="flex flex-col gap-3 p-4 bg-muted/30 border border-border/50 rounded-xl">
 <div className="flex items-start gap-3">
 <ShieldAlert className="text-muted-foreground size-5 shrink-0 mt-0.5"/>
 <div className="flex-1">
 <p className="font-medium text-muted-foreground dark:text-muted-foreground text-sm">Chưa phát hiện Codex CLI</p>
 <p className="text-xs text-muted-foreground mt-1">
 Cấu hình thủ công vẫn khả dụng nếu bạn đang chạy 8router trên server từ xa.
 </p>
 </div>
 </div>
 <div className="flex items-center gap-2 pl-8">
 <Button 
 variant="outline"
 size="sm"
 onClick={() => setShowInstallGuide(!showInstallGuide)}
 className="h-8 text-xs font-medium"
 >
 <BookOpen className="mr-1.5 size-3.5"/>
 {showInstallGuide ?"Ẩn hướng dẫn":"Hướng dẫn cài đặt"}
 </Button>
 </div>
 </div>
 
 {showInstallGuide && (
 <div className="p-4 bg-muted/30 border border-border/50 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2">
 <h4 className="text-sm font-medium">Lệnh cài đặt:</h4>
 <div className="relative group">
 <code className="block px-3 py-2 bg-background border border-border/50 rounded-lg font-mono text-xs text-primary">
 npm install -g @openai/codex
 </code>
 </div>
 </div>
 )}
 </div>
 )}

 {!checkingCodex && codexStatus?.installed && (
 <div className="space-y-4">
 <div className="grid grid-cols-1 gap-4">
 {/* Gateway URL */}
 <div className="space-y-2">
 <label className="text-xs font-medium uppercase tracking-tight text-muted-foreground/80 flex items-center gap-2">
 <Search className="size-3"/>
 Gateway URL
 </label>
 <Input 
 value={getDisplayUrl()} 
 onChange={e => setCustomBaseUrl(e.target.value)} 
 placeholder="https://.../v1"
 className="h-9 text-xs"
 />
 </div>

 {/* Access Key */}
 <div className="space-y-2">
 <label className="text-xs font-medium uppercase tracking-tight text-muted-foreground/80 flex items-center gap-2">
 <Info className="size-3"/>
 API Key
 </label>
 {apiKeys?.length > 0 ? (
 <select 
 value={selectedApiKey} 
 onChange={(e) => setSelectedApiKey(e.target.value)} 
 className="w-full h-9 px-3 py-1 bg-background border border-input rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
 >
 {apiKeys.map(k => (
 <option key={k.id} value={k.key}>
 {k.key.slice(0, 12)}...
 </option>
 ))}
 </select>
 ) : (
 <div className="h-9 flex items-center px-3 bg-muted/20 border border-border/50 rounded-md text-xs text-muted-foreground">
 {cloudEnabled ?"Chưa có API key":"sk_8router (Mặc định)"}
 </div>
 )}
 </div>

 {/* Primary Model */}
 <div className="space-y-2">
 <label className="text-xs font-medium uppercase tracking-tight text-muted-foreground/80">
 Model chính
 </label>
 <div className="flex items-center gap-2">
 <Input 
 value={selectedModel} 
 readOnly 
 placeholder="Chọn model..."
 className="h-9 text-xs flex-1 bg-muted/20"
 />
 <Button 
 variant="outline"
 size="sm"
 className="h-9 px-3 shrink-0 font-semibold"
 onClick={() => setModalOpen(true)}
 >
 Chọn Model
 </Button>
 {selectedModel && (
 <Button 
 variant="ghost"
 size="icon-sm"
 onClick={() => setSelectedModel("")} 
 className="text-muted-foreground hover:text-destructive"
 >
 <X className="size-4"/>
 </Button>
 )}
 </div>
 </div>
 </div>
 </div>
 )}
 </BaseToolCard>

 <ModelSelectModal 
 isOpen={modalOpen} 
 onClose={() => setModalOpen(false)} 
 onSelect={m => { 
 setSelectedModel(m.value); 
 if(!subagentModel) setSubagentModel(m.value); 
 setModalOpen(false); 
 }} 
 selectedModel={selectedModel} 
 activeProviders={activeProviders} 
 modelAliases={modelAliases} 
 title="Codex - Chọn Model"
 />
 
 <ManualConfigModal 
 isOpen={showManualConfigModal} 
 onClose={() => setShowManualConfigModal(false)} 
 title="Codex - Cấu hình thủ công"
 configs={getManualConfigs()} 
 />
 </>
 );
}
