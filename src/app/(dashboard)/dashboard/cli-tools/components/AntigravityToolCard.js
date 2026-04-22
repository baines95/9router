"use client";

import { useState, useEffect } from"react";
import { 
 Button, 
 Input, 
 ModelSelectModal,
 Tooltip
} from"@/shared/components";
import { BaseToolCard } from"./";
import { 
 RotateCcw, 
 CheckCircle2, 
 Circle, 
 ArrowRight, 
 StopCircle, 
 PlayCircle, 
 AlertTriangle, 
 AlertCircle, 
 X, 
 Save,
 Loader2,
 ShieldAlert,
 Info
} from"lucide-react";
import { cn } from"@/lib/utils";

export default function AntigravityToolCard({
 tool,
 isExpanded,
 onToggle,
 baseUrl,
 apiKeys,
 activeProviders,
 hasActiveProviders,
 cloudEnabled,
 initialStatus,
}) {
 const [status, setStatus] = useState(initialStatus || null);
 const [loading, setLoading] = useState(false);
 const [startingStep, setStartingStep] = useState(null); //"cert"|"server"|"dns"| null
 const [showPasswordModal, setShowPasswordModal] = useState(false);
 const [sudoPassword, setSudoPassword] = useState("");
 const [selectedApiKey, setSelectedApiKey] = useState("");
 const [message, setMessage] = useState(null);
 const [modelMappings, setModelMappings] = useState({});
 const [modalOpen, setModalOpen] = useState(false);
 const [currentEditingAlias, setCurrentEditingAlias] = useState(null);
 const [modelAliases, setModelAliases] = useState({});

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
 fetchStatus();
 loadSavedMappings();
 fetchModelAliases();
 }
 if (isExpanded) {
 loadSavedMappings();
 fetchModelAliases();
 }
 }, [isExpanded]);

 const loadSavedMappings = async () => {
 try {
 const res = await fetch("/api/cli-tools/antigravity-mitm/alias?tool=antigravity");
 if (res.ok) {
 const data = await res.json();
 const aliases = data.aliases || {};
 if (Object.keys(aliases).length > 0) {
 setModelMappings(aliases);
 }
 }
 } catch (error) {
 console.log("Error loading saved mappings:", error);
 }
 };

 const fetchModelAliases = async () => {
 try {
 const res = await fetch("/api/models/alias");
 const data = await res.json();
 if (res.ok) setModelAliases(data.aliases || {});
 } catch (error) {
 console.log("Error fetching model aliases:", error);
 }
 };

 const fetchStatus = async () => {
 try {
 const res = await fetch("/api/cli-tools/antigravity-mitm");
 if (res.ok) {
 const data = await res.json();
 setStatus(data);
 }
 } catch (error) {
 console.log("Error fetching status:", error);
 setStatus({ running: false });
 }
 };

 const isWindows = typeof navigator !=="undefined"&& navigator.userAgent?.includes("Windows");

 const handleStart = () => {
 if (isWindows || status?.hasCachedPassword) {
 doStart("");
 } else {
 setShowPasswordModal(true);
 setMessage(null);
 }
 };

 const handleStop = () => {
 if (isWindows || status?.hasCachedPassword) {
 doStop("");
 } else {
 setShowPasswordModal(true);
 setMessage(null);
 }
 };

 const doStart = async (password) => {
 setLoading(true);
 setMessage(null);
 setStartingStep("cert");
 try {
 const keyToUse = selectedApiKey?.trim()
 || (apiKeys?.length > 0 ? apiKeys[0].key : null)
 || (!cloudEnabled ?"sk_8router": null);

 const res = await fetch("/api/cli-tools/antigravity-mitm", {
 method:"POST",
 headers: {"Content-Type":"application/json"},
 body: JSON.stringify({ apiKey: keyToUse, sudoPassword: password }),
 });

 const data = await res.json();
 if (res.ok) {
 setStartingStep(null);
 setMessage({ type:"success", text:"Đã khởi động MITM thành công!"});
 setShowPasswordModal(false);
 setSudoPassword("");
 fetchStatus();
 } else {
 setStartingStep(null);
 setMessage({ type:"error", text: data.error ||"Không thể khởi động"});
 }
 } catch (error) {
 setStartingStep(null);
 setMessage({ type:"error", text: error.message });
 } finally {
 setLoading(false);
 }
 };

 const doStop = async (password) => {
 setLoading(true);
 setMessage(null);
 try {
 const res = await fetch("/api/cli-tools/antigravity-mitm", {
 method:"DELETE",
 headers: {"Content-Type":"application/json"},
 body: JSON.stringify({ sudoPassword: password }),
 });

 const data = await res.json();
 if (res.ok) {
 setMessage({ type:"success", text:"Đã dừng MITM!"});
 setShowPasswordModal(false);
 setSudoPassword("");
 fetchStatus();
 } else {
 setMessage({ type:"error", text: data.error ||"Không thể dừng"});
 }
 } catch (error) {
 setMessage({ type:"error", text: error.message });
 } finally {
 setLoading(false);
 }
 };

 const handleConfirmPassword = () => {
 if (!sudoPassword.trim()) {
 setMessage({ type:"error", text:"Mật khẩu sudo là bắt buộc"});
 return;
 }
 if (status?.running) {
 doStop(sudoPassword);
 } else {
 doStart(sudoPassword);
 }
 };

 const openModelSelector = (alias) => {
 setCurrentEditingAlias(alias);
 setModalOpen(true);
 };

 const handleModelSelect = (model) => {
 if (currentEditingAlias) {
 setModelMappings(prev => ({
 ...prev,
 [currentEditingAlias]: model.value,
 }));
 }
 };

 const handleModelMappingChange = (alias, value) => {
 setModelMappings(prev => ({
 ...prev,
 [alias]: value,
 }));
 };

 const handleSaveMappings = async () => {
 setLoading(true);
 setMessage(null);
 try {
 const res = await fetch("/api/cli-tools/antigravity-mitm/alias", {
 method:"PUT",
 headers: {"Content-Type":"application/json"},
 body: JSON.stringify({ tool:"antigravity", mappings: modelMappings }),
 });

 if (!res.ok) {
 const data = await res.json();
 throw new Error(data.error ||"Lỗi khi lưu ánh xạ");
 }

 setMessage({ type:"success", text:"Đã lưu ánh xạ thành công!"});
 } catch (error) {
 setMessage({ type:"error", text: error.message });
 } finally {
 setLoading(false);
 }
 };

 const isRunning = status?.running;

 return (
 <>
 <BaseToolCard
 tool={tool}
 isExpanded={isExpanded}
 onToggle={onToggle}
 status={isRunning ?"configured":"not_configured"}
 checking={loading && !startingStep}
 applying={loading && startingStep === null}
 restoring={false}
 message={message}
 onApply={handleSaveMappings}
 onReset={() => isRunning ? handleStop() : null}
 onCheckStatus={fetchStatus}
 hasActiveProviders={hasActiveProviders}
 >
 <div className="space-y-6">
 {/* Status Indicators */}
 <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3 bg-muted/20 rounded-xl border border-border/50">
 {[
 { key:"cert", label:"Chứng chỉ", ok: status?.certExists },
 { key:"server", label:"Server", ok: status?.running },
 { key:"dns", label:"DNS", ok: status?.dnsConfigured },
 ].map(({ key, label, ok }, i) => {
 const isLoading = startingStep === key;
 return (
 <div key={key} className="flex items-center gap-2">
 <div className="flex items-center gap-1.5">
 {isLoading ? (
 <Loader2 className="size-3.5 text-primary animate-spin"/>
 ) : ok ? (
 <CheckCircle2 className="size-3.5 text-primary"/>
 ) : (
 <Circle className="size-3.5 text-muted-foreground"/>
 )}
 <span className={cn(
"text-xs font-medium",
 isLoading ?"text-primary": ok ?"text-primary":"text-muted-foreground"
 )}>
 {label}
 </span>
 </div>
 {i < 2 && <ArrowRight className="size-3 text-muted-foreground/30"/>}
 </div>
 );
 })}
 </div>

 {/* Control Section */}
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <label className="text-xs font-medium uppercase tracking-tight text-muted-foreground/80">
 Điều khiển MITM
 </label>
 {isRunning ? (
 <Button 
 variant="destructive"
 size="sm"
 onClick={handleStop} 
 disabled={loading}
 className="h-8 font-medium"
 >
 <StopCircle className="mr-2 size-3.5"/>
 Dừng MITM
 </Button>
 ) : (
 <Button 
 variant="primary"
 size="sm"
 onClick={handleStart} 
 disabled={loading || !hasActiveProviders}
 className="h-8 font-medium"
 >
 <PlayCircle className="mr-2 size-3.5"/>
 Khởi động MITM
 </Button>
 )}
 </div>

 {isWindows && !isRunning && (
 <div className="flex items-start gap-3 p-3 bg-muted/30 border border-border/50 rounded-xl">
 <ShieldAlert className="text-muted-foreground size-5 shrink-0 mt-0.5"/>
 <p className="text-xs text-muted-foreground dark:text-muted-foreground">
 <span className="font-medium">Windows:</span> Vui lòng chạy Terminal (8Router) với quyền Administrator để kích hoạt MITM.
 </p>
 </div>
 )}

 {!isRunning && (
 <div className="p-4 bg-muted/30 border border-border/50 rounded-xl space-y-3">
 <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
 <Info className="size-3.5"/>
 Cách thức hoạt động
 </div>
 <ul className="space-y-2">
 <li className="text-xs text-muted-foreground flex items-start gap-2">
 <div className="size-1.5 rounded-full bg-primary/50 mt-1 shrink-0"/>
 Tạo chứng chỉ SSL và thêm vào hệ thống (Trust Store).
 </li>
 <li className="text-xs text-muted-foreground flex items-start gap-2">
 <div className="size-1.5 rounded-full bg-primary/50 mt-1 shrink-0"/>
 Điều hướng <code className="px-1 bg-muted rounded border">daily-cloudcode-pa.googleapis.com</code> về localhost.
 </li>
 <li className="text-xs text-muted-foreground flex items-start gap-2">
 <div className="size-1.5 rounded-full bg-primary/50 mt-1 shrink-0"/>
 Ánh xạ các model Antigravity sang bất kỳ provider nào qua 8Router.
 </li>
 </ul>
 </div>
 )}
 </div>

 {/* Model Mappings */}
 {isRunning && (
 <div className="space-y-4 pt-4 border-t border-border/50">
 <div className="grid grid-cols-1 gap-4">
 {/* API Key */}
 <div className="space-y-2">
 <label className="text-xs font-medium uppercase tracking-tight text-muted-foreground/80">
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

 {/* Model Mappings */}
 {tool.defaultModels.map((model) => (
 <div key={model.alias} className="space-y-2">
 <label className="text-xs font-medium uppercase tracking-tight text-muted-foreground/80 truncate block"title={model.name}>
 {model.name}
 </label>
 <div className="flex items-center gap-2">
 <Input 
 value={modelMappings[model.alias] ||""} 
 onChange={(e) => handleModelMappingChange(model.alias, e.target.value)} 
 placeholder="provider/model-id"
 className="h-9 text-xs flex-1"
 />
 <Button 
 variant="outline"
 size="sm"
 onClick={() => openModelSelector(model.alias)} 
 disabled={!hasActiveProviders}
 className="h-9 px-3 shrink-0 font-semibold"
 >
 Chọn Model
 </Button>
 {modelMappings[model.alias] && (
 <Button 
 variant="ghost"
 size="icon-sm"
 onClick={() => handleModelMappingChange(model.alias,"")} 
 className="text-muted-foreground hover:text-destructive"
 >
 <X className="size-4"/>
 </Button>
 )}
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 </BaseToolCard>

 {/* Sudo Password Modal */}
 {showPasswordModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
 <div className="bg-background border border-border/50 rounded-2xl p-6 w-full max-w-sm space-y-5">
 <div className="space-y-2">
 <h3 className="text-lg font-medium">Yêu cầu mật khẩu Sudo</h3>
 <p className="text-xs text-muted-foreground">Cần quyền admin để cấu hình chứng chỉ SSL và DNS hệ thống.</p>
 </div>

 <div className="flex items-start gap-3 p-3 bg-muted/30 border border-border/50 rounded-xl">
 <ShieldAlert className="text-muted-foreground size-5 shrink-0 mt-0.5"/>
 <p className="text-xs text-muted-foreground dark:text-muted-foreground font-medium">
 Mật khẩu này chỉ được sử dụng để thực thi lệnh hệ thống và không được lưu trữ.
 </p>
 </div>

 <Input
 type="password"
 placeholder="Nhập mật khẩu sudo"
 value={sudoPassword}
 onChange={(e) => setSudoPassword(e.target.value)}
 onKeyDown={(e) => {
 if (e.key ==="Enter"&& !loading) handleConfirmPassword();
 }}
 className="h-10"
 autoFocus
 />

 <div className="flex items-center justify-end gap-3 pt-2">
 <Button
 variant="ghost"
 size="sm"
 onClick={() => { setShowPasswordModal(false); setSudoPassword(""); setMessage(null); }}
 disabled={loading}
 className="font-medium"
 >
 Hủy
 </Button>
 <Button
 variant="primary"
 size="sm"
 onClick={handleConfirmPassword}
 disabled={loading || !sudoPassword.trim()}
 loading={loading}
 className="font-medium min-w-[100px]"
 >
 Xác nhận
 </Button>
 </div>
 </div>
 </div>
 )}

 <ModelSelectModal
 isOpen={modalOpen}
 onClose={() => setModalOpen(false)}
 onSelect={handleModelSelect}
 selectedModel={currentEditingAlias ? modelMappings[currentEditingAlias] : null}
 activeProviders={activeProviders}
 modelAliases={modelAliases}
 title={`Chọn model cho ${currentEditingAlias}`}
 />
 </>
 );
}
