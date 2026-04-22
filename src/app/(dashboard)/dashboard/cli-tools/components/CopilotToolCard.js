"use client";

import { useState, useEffect } from"react";
import { 
 Button, 
 Input, 
 ModelSelectModal, 
 ManualConfigModal,
 Tooltip
} from"@/shared/components";
import { BaseToolCard } from"./";
import { 
 RotateCcw, 
 X, 
 Plus, 
 Info, 
 Search 
} from"lucide-react";
import { cn } from"@/lib/utils";

export default function CopilotToolCard({ 
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
 const [selectedApiKey, setSelectedApiKey] = useState("");
 const [modelAliases, setModelAliases] = useState({});
 const [showManualConfigModal, setShowManualConfigModal] = useState(false);

 const [modelInput, setModelInput] = useState("");
 const [modelList, setModelList] = useState([]);
 const [modalOpen, setModalOpen] = useState(false);

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
 if (status?.config && Array.isArray(status.config) && modelList.length === 0) {
 const entry = status.config.find((e) => e.name ==="8Router");
 if (entry?.models?.length > 0) {
 setModelList(entry.models.map((m) => m.id));
 }
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
 if (!status) return"not_configured";
 if (!status.has8Router) return"not_configured";
 const url = status.currentUrl ||"";
 return url.includes("localhost") || url.includes("127.0.0.1") || url.includes(baseUrl)
 ?"configured":"other";
 };

 const configStatus = getConfigStatus();
 const getEffectiveBaseUrl = () => baseUrl.endsWith("/v1") ? baseUrl : `${baseUrl}/v1`;

 const addModel = () => {
 const val = modelInput.trim();
 if (!val || modelList.includes(val)) return;
 setModelList((prev) => [...prev, val]);
 setModelInput("");
 };

 const removeModel = (id) => setModelList((prev) => prev.filter((m) => m !== id));

 const checkStatus = async () => {
 setChecking(true);
 try {
 const res = await fetch("/api/cli-tools/copilot-settings");
 const data = await res.json();
 setStatus(data);
 } catch (error) {
 setStatus({ error: error.message });
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

 const res = await fetch("/api/cli-tools/copilot-settings", {
 method:"POST",
 headers: {"Content-Type":"application/json"},
 body: JSON.stringify({ baseUrl: getEffectiveBaseUrl(), apiKey: keyToUse, models: modelList }),
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
 const res = await fetch("/api/cli-tools/copilot-settings", { method:"DELETE"});
 const data = await res.json();
 if (res.ok) {
 setMessage({ type:"success", text:"Đã đặt lại cấu hình!"});
 setModelList([]);
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
 const effectiveBaseUrl = getEffectiveBaseUrl();

 return [{
 filename:"~/Library/Application Support/Code/User/chatLanguageModels.json",
 content: JSON.stringify([{
 name:"8Router",
 vendor:"azure",
 apiKey: keyToUse,
 models: modelList.map((id) => ({
 id, name: id,
 url: `${effectiveBaseUrl}/chat/completions#models.ai.azure.com`,
 toolCalling: true, vision: false,
 maxInputTokens: 128000, maxOutputTokens: 16000,
 })),
 }], null, 2),
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
 hasActiveProviders={activeProviders?.length > 0 && modelList.length > 0}
 >
 <div className="space-y-4">
 <div className="flex items-start gap-3 p-4 bg-primary/10 border border-blue-500/30 rounded-xl">
 <Info className="text-primary size-5 shrink-0 mt-0.5"/>
 <div className="space-y-1">
 <p className="text-sm font-medium text-primary dark:text-primary">
 Ghi vào tệp <code className="px-1.5 py-0.5 bg-primary/10 rounded font-mono text-xs">chatLanguageModels.json</code>
 </p>
 <p className="text-xs text-muted-foreground">
 Hãy khởi động lại VS Code sau khi áp dụng để thay đổi có hiệu lực.
 </p>
 </div>
 </div>

 <div className="grid grid-cols-1 gap-4">
 {/* API Key */}
 <div className="space-y-2">
 <label className="text-xs font-medium uppercase tracking-tight text-muted-foreground/80 flex items-center gap-2">
 <Search className="size-3"/>
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
 Danh sách Model ({modelList.length})
 </label>
 
 <div className="space-y-2">
 {modelList.map((id) => (
 <div key={id} className="flex items-center gap-2 p-2 bg-muted/30 border border-border/50 rounded-lg group">
 <span className="flex-1 text-xs font-mono truncate">{id}</span>
 <Button 
 variant="ghost"
 size="icon-xs"
 onClick={() => removeModel(id)} 
 className="text-muted-foreground hover:text-destructive shrink-0"
 >
 <X className="size-3.5"/>
 </Button>
 </div>
 ))}
 
 <div className="flex items-center gap-2">
 <Input 
 value={modelInput} 
 onChange={(e) => setModelInput(e.target.value)} 
 onKeyDown={(e) => { if (e.key ==="Enter") { e.preventDefault(); addModel(); } }}
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
 onClick={addModel} 
 disabled={!modelInput.trim()} 
 className="h-9 w-9 shrink-0"
 >
 <Plus className="size-4"/>
 </Button>
 </div>
 </div>
 </div>
 </div>
 </div>
 </BaseToolCard>

 <ModelSelectModal
 isOpen={modalOpen}
 onClose={() => setModalOpen(false)}
 onSelect={(model) => { 
 setModelInput(model.value); 
 setModalOpen(false); 
 }}
 selectedModel={modelInput}
 activeProviders={activeProviders}
 modelAliases={modelAliases}
 title="Chọn Model cho GitHub Copilot"
 />

 <ManualConfigModal
 isOpen={showManualConfigModal}
 onClose={() => setShowManualConfigModal(false)}
 title="GitHub Copilot - Cấu hình thủ công"
 configs={getManualConfigs()}
 />
 </>
 );
}
