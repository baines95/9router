"use client";

import { useState, useEffect } from"react";
import { 
 Button, 
 Input, 
 ModelSelectModal, 
 ManualConfigModal,
 Badge,
 Tooltip
} from"@/shared/components";
import { BaseToolCard } from"./";
import { 
 RotateCcw, 
 X, 
 Plus, 
 Search, 
 Info, 
 ShieldAlert, 
 BookOpen 
} from"lucide-react";
import { cn } from"@/lib/utils";

export default function OpenCodeToolCard({ 
 tool, 
 isExpanded, 
 onToggle, 
 baseUrl, 
 apiKeys, 
 activeProviders, 
 cloudEnabled, 
 initialStatus 
}) {
 const [status, setStatus] = useState(initialStatus || null);
 const [checking, setChecking] = useState(false);
 const [applying, setApplying] = useState(false);
 const [restoring, setRestoring] = useState(false);
 const [message, setMessage] = useState(null);
 const [showInstallGuide, setShowInstallGuide] = useState(false);
 const [selectedApiKey, setSelectedApiKey] = useState("");
 const [selectedModel, setSelectedModel] = useState("");
 const [subagentModel, setSubagentModel] = useState("");
 const [modalOpen, setModalOpen] = useState(false);
 const [subagentModalOpen, setSubagentModalOpen] = useState(false);
 const [modelAliases, setModelAliases] = useState({});
 const [showManualConfigModal, setShowManualConfigModal] = useState(false);
 const [customBaseUrl, setCustomBaseUrl] = useState("");
 const [selectedModels, setSelectedModels] = useState([]);
 const [activeModel, setActiveModel] = useState("");

 useEffect(() => {
 if (apiKeys?.length > 0 && !selectedApiKey) {
 setSelectedApiKey(apiKeys[0].key);
 }
 }, [apiKeys, selectedApiKey]);

 useEffect(() => {
 if (initialStatus) setStatus(initialStatus);
 }, [initialStatus]);

 useEffect(() => {
 if (isExpanded && !status) {
 checkStatus();
 fetchModelAliases();
 }
 if (isExpanded) fetchModelAliases();
 }, [isExpanded]);

 useEffect(() => {
 if (status?.opencode?.models) {
 setSelectedModels(status.opencode.models);
 }
 if (status?.opencode?.activeModel) {
 setActiveModel(status.opencode.activeModel);
 }
 
 if (status?.config?.agent?.explorer?.model?.startsWith("8router/")) {
 setSubagentModel(status.config.agent.explorer.model.replace("8router/",""));
 }
 }, [status]);

 const fetchModelAliases = async () => {
 try {
 const res = await fetch("/api/models/alias");
 const data = await res.json();
 if (res.ok) setModelAliases(data.aliases || {});
 } catch (error) {
 console.log("Error fetching model aliases:", error);
 }
 };

 const getConfigStatus = () => {
 if (!status?.installed) return"not_configured";
 if (!status.config) return"not_configured";
 const url = status.config?.provider?.["8router"]?.options?.baseURL ||"";
 const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
 return status.has8Router && (isLocal || url.includes(baseUrl)) ?"configured": status.has8Router ?"other":"not_configured";
 };

 const configStatus = getConfigStatus();

 const getEffectiveBaseUrl = () => {
 const url = customBaseUrl || baseUrl;
 return url.endsWith("/v1") ? url : `${url}/v1`;
 };

 const getDisplayUrl = () => customBaseUrl || `${baseUrl}/v1`;

 const checkStatus = async () => {
 setChecking(true);
 try {
 const res = await fetch("/api/cli-tools/opencode-settings");
 const data = await res.json();
 setStatus(data);
 } catch (error) {
 setStatus({ installed: false, error: error.message });
 } finally {
 setChecking(false);
 }
 };

 const handleApply = async () => {
 setApplying(true);
 setMessage(null);
 try {
 const keyToUse = (selectedApiKey && selectedApiKey.trim())
 ? selectedApiKey
 : (!cloudEnabled ?"sk_8router": selectedApiKey);

 const res = await fetch("/api/cli-tools/opencode-settings", {
 method:"POST",
 headers: {"Content-Type":"application/json"},
 body: JSON.stringify({ 
 baseUrl: getEffectiveBaseUrl(), 
 apiKey: keyToUse, 
 models: selectedModels,
 activeModel: activeModel ===""?"": (activeModel || selectedModels[0]),
 subagentModel: subagentModel
 }),
 });
 const data = await res.json();
 if (res.ok) {
 setMessage({ type:"success", text:"Áp dụng cấu hình thành công!"});
 checkStatus();
 } else {
 setMessage({ type:"error", text: data.error ||"Không thể áp dụng cấu hình"});
 }
 } catch (error) {
 setMessage({ type:"error", text: error.message });
 } finally {
 setApplying(false);
 }
 };

 const handleReset = async () => {
 setRestoring(true);
 setMessage(null);
 try {
 const res = await fetch("/api/cli-tools/opencode-settings", { method:"DELETE"});
 const data = await res.json();
 if (res.ok) {
 setMessage({ type:"success", text:"Đã đặt lại cấu hình!"});
 setSelectedModel("");
 setSubagentModel("");
 setSelectedModels([]);
 setActiveModel("");
 checkStatus();
 } else {
 setMessage({ type:"error", text: data.error ||"Không thể đặt lại cấu hình"});
 }
 } catch (error) {
 setMessage({ type:"error", text: error.message });
 } finally {
 setRestoring(false);
 }
 };

 const getManualConfigs = () => {
 const keyToUse = (selectedApiKey && selectedApiKey.trim())
 ? selectedApiKey
 : (!cloudEnabled ?"sk_8router":"<API_KEY_FROM_DASHBOARD>");

 const modelsToShow = selectedModels.length > 0 ? selectedModels : ["provider/model-id"];
 const activeModelToShow = activeModel || selectedModels[0] || modelsToShow[0];
 const effectiveSubagentModel = subagentModel || activeModelToShow;

 const modelsObj = {};
 modelsToShow.forEach(m => {
 modelsObj[m] = { name: m };
 });

 return [{
 filename:"~/.config/opencode/opencode.json",
 content: JSON.stringify({
 provider: {
"8router": {
 npm:"@ai-sdk/openai-compatible",
 options: { baseURL: getEffectiveBaseUrl(), apiKey: keyToUse },
 models: modelsObj,
 },
 },
 model: `8router/${activeModelToShow}`,
 agent: {
 explorer: {
 description:"Fast explorer subagent for codebase exploration",
 mode:"subagent",
 model: `8router/${effectiveSubagentModel}`
 }
 }
 }, null, 2),
 }];
 };

 return (
 <>
 <BaseToolCard
 tool={tool}
 isExpanded={isExpanded}
 onToggle={onToggle}
 status={configStatus}
 checking={checking}
 applying={applying}
 restoring={restoring}
 message={message}
 onApply={handleApply}
 onReset={handleReset}
 onShowManualConfig={() => setShowManualConfigModal(true)}
 onCheckStatus={checkStatus}
 hasActiveProviders={activeProviders?.length > 0 && selectedModels.length > 0}
 >
 {!checking && status && !status.installed && (
 <div className="space-y-4">
 <div className="flex flex-col gap-3 p-4 bg-muted/30 border border-border/50 rounded-xl">
 <div className="flex items-start gap-3">
 <ShieldAlert className="text-muted-foreground size-5 shrink-0 mt-0.5"/>
 <div className="flex-1">
 <p className="font-medium text-muted-foreground dark:text-muted-foreground text-sm">Chưa phát hiện Open Code CLI</p>
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
 npm install -g opencode
 </code>
 </div>
 </div>
 )}
 </div>
 )}

 {!checking && status?.installed && (
 <div className="space-y-4">
 <div className="grid grid-cols-1 gap-4">
 {/* Base URL */}
 <div className="space-y-2">
 <label className="text-xs font-medium uppercase tracking-tight text-muted-foreground/80 flex items-center gap-2">
 <Search className="size-3"/>
 Base URL
 </label>
 <div className="flex items-center gap-2">
 <Input 
 value={getDisplayUrl()} 
 onChange={(e) => setCustomBaseUrl(e.target.value)} 
 placeholder="https://.../v1"
 className="h-9 text-xs"
 />
 {customBaseUrl && customBaseUrl !== baseUrl && (
 <Button variant="ghost"size="icon-sm"onClick={() => setCustomBaseUrl("")} title="Khôi phục mặc định">
 <RotateCcw className="size-3.5"/>
 </Button>
 )}
 </div>
 </div>

 {/* API Key */}
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
 {apiKeys.map((key) => <option key={key.id} value={key.key}>{key.key}</option>)}
 </select>
 ) : (
 <div className="h-9 flex items-center px-3 bg-muted/20 border border-border/50 rounded-md text-xs text-muted-foreground">
 {cloudEnabled ?"Chưa có API key":"sk_8router (Mặc định)"}
 </div>
 )}
 </div>

 {/* Models */}
 <div className="space-y-2">
 <label className="text-xs font-medium uppercase tracking-tight text-muted-foreground/80">
 Danh sách Model ({selectedModels.length})
 </label>
 
 <div className="space-y-2">
 {selectedModels.map((id) => (
 <div key={id} className="flex items-center gap-2 p-2 bg-muted/30 border border-border/50 rounded-lg group">
 <span className="flex-1 text-xs font-mono truncate">{id}</span>
 <div className="flex items-center gap-2">
 {activeModel === id ? (
 <Badge variant="outline"className="h-6 border-primary/30 bg-primary/5 text-primary text-xs font-medium">
 Đang dùng
 </Badge>
 ) : (
 <Button 
 variant="ghost"
 size="sm"
 onClick={() => setActiveModel(id)} 
 className="h-6 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
 >
 Đặt làm chính
 </Button>
 )}
 <Button 
 variant="ghost"
 size="icon-xs"
 onClick={() => setSelectedModels(prev => prev.filter(m => m !== id))} 
 className="text-muted-foreground hover:text-destructive shrink-0"
 >
 <X className="size-3.5"/>
 </Button>
 </div>
 </div>
 ))}
 
 <div className="flex items-center gap-2">
 <Input 
 value={selectedModel} 
 onChange={(e) => setSelectedModel(e.target.value)} 
 onKeyDown={(e) => { 
 if (e.key ==="Enter") { 
 e.preventDefault(); 
 if (selectedModel.trim() && !selectedModels.includes(selectedModel.trim())) {
 setSelectedModels(prev => [...prev, selectedModel.trim()]);
 if (!activeModel) setActiveModel(selectedModel.trim());
 }
 setSelectedModel(""); 
 } 
 }}
 placeholder="provider/model-id"
 className="h-9 text-xs flex-1"
 />
 <Button 
 variant="outline"
 size="sm"
 onClick={() => setModalOpen(true)} 
 disabled={!activeProviders?.length}
 className="h-9 px-3 shrink-0 font-semibold"
 >
 Chọn
 </Button>
 <Button 
 variant="outline"
 size="icon-sm"
 onClick={() => { 
 if (selectedModel.trim() && !selectedModels.includes(selectedModel.trim())) {
 setSelectedModels(prev => [...prev, selectedModel.trim()]);
 if (!activeModel) setActiveModel(selectedModel.trim());
 }
 setSelectedModel(""); 
 }} 
 disabled={!selectedModel.trim()} 
 className="h-9 w-9 shrink-0"
 >
 <Plus className="size-4"/>
 </Button>
 </div>
 </div>
 </div>

 {/* Subagent Model */}
 <div className="space-y-2 pt-2 border-t border-border/50">
 <label className="text-xs font-medium uppercase tracking-tight text-muted-foreground/80">
 Model Subagent (Explorer)
 </label>
 <div className="flex items-center gap-2">
 <Input 
 value={subagentModel} 
 onChange={(e) => setSubagentModel(e.target.value)} 
 placeholder={activeModel || selectedModels[0] ||"provider/model-id"} 
 className="h-9 text-xs flex-1"
 />
 <Button 
 variant="outline"
 size="sm"
 onClick={() => setSubagentModalOpen(true)} 
 disabled={!activeProviders?.length}
 className="h-9 px-3 shrink-0 font-semibold"
 >
 Chọn
 </Button>
 {subagentModel && (
 <Button 
 variant="ghost"
 size="icon-sm"
 onClick={() => setSubagentModel("")} 
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
 onSelect={(model) => { 
 if (!selectedModels.includes(model.value)) setSelectedModels(prev => [...prev, model.value]); 
 if (!activeModel) setActiveModel(model.value); 
 setModalOpen(false); 
 }}
 activeProviders={activeProviders}
 modelAliases={modelAliases}
 title="Chọn Models cho Open Code"
 />

 <ModelSelectModal
 isOpen={subagentModalOpen}
 onClose={() => setSubagentModalOpen(false)}
 onSelect={(model) => { 
 setSubagentModel(model.value); 
 setSubagentModalOpen(false); 
 }}
 activeProviders={activeProviders}
 modelAliases={modelAliases}
 title="Chọn Model Subagent cho Open Code"
 />

 <ManualConfigModal
 isOpen={showManualConfigModal}
 onClose={() => setShowManualConfigModal(false)}
 title="Open Code - Cấu hình thủ công"
 configs={getManualConfigs()}
 />
 </>
 );
}
