"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Button, 
  Input, 
  ModelSelectModal, 
  ManualConfigModal,
  Tooltip
} from "@/shared/components";
import { BaseToolCard } from "./";
import { 
  RotateCcw, 
  X, 
  Plus, 
  Search, 
  Info, 
  ShieldAlert, 
  BookOpen 
} from "lucide-react";
import { cn } from "@/lib/utils";

const CLOUD_URL = process.env.NEXT_PUBLIC_CLOUD_URL;

export default function DroidToolCard({
  tool,
  isExpanded,
  onToggle,
  baseUrl,
  hasActiveProviders,
  apiKeys,
  activeProviders,
  cloudEnabled,
  initialStatus,
}) {
  const [droidStatus, setDroidStatus] = useState(initialStatus || null);
  const [checkingDroid, setCheckingDroid] = useState(false);
  const [applying, setApplying] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState(null);
  const [selectedApiKey, setSelectedApiKey] = useState("");
  const [modelList, setModelList] = useState([]);
  const [modelInput, setModelInput] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modelAliases, setModelAliases] = useState({});
  const [showManualConfigModal, setShowManualConfigModal] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [customBaseUrl, setCustomBaseUrl] = useState("");
  const hasInitializedModel = useRef(false);

  const getConfigStatus = () => {
    if (!droidStatus?.installed) return "not_configured";
    const currentConfig = droidStatus.settings?.customModels?.find(m => m.id?.startsWith("custom:8Router"));
    if (!currentConfig) return "not_configured";
    const localMatch = currentConfig.baseUrl?.includes("localhost") || currentConfig.baseUrl?.includes("127.0.0.1");
    const cloudMatch = cloudEnabled && CLOUD_URL && currentConfig.baseUrl?.startsWith(CLOUD_URL);
    const tunnelMatch = baseUrl && currentConfig.baseUrl?.startsWith(baseUrl);
    if (localMatch || cloudMatch || tunnelMatch) return "configured";
    return "other";
  };

  const configStatus = getConfigStatus();

  useEffect(() => {
    if (apiKeys?.length > 0 && !selectedApiKey) {
      setSelectedApiKey(apiKeys[0].key);
    }
  }, [apiKeys, selectedApiKey]);

  useEffect(() => {
    if (initialStatus) setDroidStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    if (isExpanded && !droidStatus) {
      checkDroidStatus();
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
    if (droidStatus?.installed && !hasInitializedModel.current) {
      hasInitializedModel.current = true;
      const existingModels = (droidStatus.settings?.customModels || [])
        .filter(m => m.id?.startsWith("custom:8Router"))
        .sort((a, b) => (a.index || 0) - (b.index || 0))
        .map(m => m.model);
      if (existingModels.length > 0) {
        setModelList(existingModels);
      } else {
        const legacy = droidStatus.settings?.customModels?.find(m => m.id === "custom:8Router-0");
        if (legacy?.model) {
          setModelList([legacy.model]);
        }
      }
    }
  }, [droidStatus]);

  const checkDroidStatus = async () => {
    setCheckingDroid(true);
    try {
      const res = await fetch("/api/cli-tools/droid-settings");
      const data = await res.json();
      setDroidStatus(data);
    } catch (error) {
      setDroidStatus({ installed: false, error: error.message });
    } finally {
      setCheckingDroid(false);
    }
  };

  const getEffectiveBaseUrl = () => {
    const url = customBaseUrl || baseUrl;
    return url.endsWith("/v1") ? url : `${url}/v1`;
  };

  const getDisplayUrl = () => {
    const url = customBaseUrl || baseUrl;
    return url.endsWith("/v1") ? url : `${url}/v1`;
  };

  const addModel = () => {
    const val = modelInput.trim();
    if (!val || modelList.includes(val)) return;
    setModelList((prev) => [...prev, val]);
    setModelInput("");
  };

  const removeModel = (id) => setModelList((prev) => prev.filter((m) => m !== id));

  const handleModelSelect = (model) => {
    if (!model.value || modelList.includes(model.value)) return;
    setModelList((prev) => [...prev, model.value]);
    setModalOpen(false);
  };

  const handleApplySettings = async () => {
    setApplying(true);
    setMessage(null);
    try {
      const keyToUse = selectedApiKey?.trim()
        || (apiKeys?.length > 0 ? apiKeys[0].key : null)
        || (!cloudEnabled ? "sk_8router" : null);

      const res = await fetch("/api/cli-tools/droid-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: getEffectiveBaseUrl(),
          apiKey: keyToUse,
          models: modelList,
          activeModel: modelList[0] || "",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Áp dụng cấu hình thành công!" });
        checkDroidStatus();
      } else {
        setMessage({ type: "error", text: data.error || "Không thể áp dụng cấu hình" });
      }
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setApplying(false);
    }
  };

  const handleResetSettings = async () => {
    setRestoring(true);
    setMessage(null);
    try {
      const res = await fetch("/api/cli-tools/droid-settings", { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Đã đặt lại cấu hình!" });
        setModelList([]);
        checkDroidStatus();
      } else {
        setMessage({ type: "error", text: data.error || "Không thể đặt lại cấu hình" });
      }
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setRestoring(false);
    }
  };

  const getManualConfigs = () => {
    const keyToUse = (selectedApiKey && selectedApiKey.trim())
      ? selectedApiKey
      : (!cloudEnabled ? "sk_8router" : "<API_KEY_FROM_DASHBOARD>");

    const settingsContent = {
      customModels: modelList.map((m, i) => ({
        model: m,
        id: `custom:8Router-${i}`,
        index: i,
        baseUrl: getEffectiveBaseUrl(),
        apiKey: keyToUse,
        displayName: m,
        maxOutputTokens: 131072,
        noImageSupport: false,
        provider: "openai",
      })),
    };

    const platform = typeof navigator !== "undefined" && navigator.platform;
    const isWindows = platform?.toLowerCase().includes("win");
    const settingsPath = isWindows
      ? "%USERPROFILE%\\.factory\\settings.json"
      : "~/.factory/settings.json";

    return [
      {
        filename: settingsPath,
        content: JSON.stringify(settingsContent, null, 2),
      },
    ];
  };

  return (
    <>
      <BaseToolCard
        tool={tool}
        isExpanded={isExpanded}
        onToggle={onToggle}
        status={configStatus}
        checking={checkingDroid}
        applying={applying}
        restoring={restoring}
        message={message}
        onApply={handleApplySettings}
        onReset={handleResetSettings}
        onShowManualConfig={() => setShowManualConfigModal(true)}
        onCheckStatus={checkDroidStatus}
        hasActiveProviders={hasActiveProviders && modelList.length > 0}
      >
        {!checkingDroid && droidStatus && !droidStatus.installed && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <div className="flex items-start gap-3">
                <ShieldAlert className="text-amber-500 size-5 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-amber-700 dark:text-amber-400 text-sm">Chưa phát hiện Factory Droid CLI</p>
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
                  className="h-8 text-[11px] font-bold"
                >
                  <BookOpen className="mr-1.5 size-3.5" />
                  {showInstallGuide ? "Ẩn hướng dẫn" : "Hướng dẫn cài đặt"}
                </Button>
              </div>
            </div>
            
            {showInstallGuide && (
              <div className="p-4 bg-muted/30 border border-border rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2">
                <h4 className="text-sm font-bold">Lệnh cài đặt:</h4>
                <div className="relative group">
                  <code className="block px-3 py-2 bg-background border border-border rounded-lg font-mono text-[11px] text-primary">
                    curl -fsSL https://app.factory.ai/cli | sh
                  </code>
                </div>
              </div>
            )}
          </div>
        )}

        {!checkingDroid && droidStatus?.installed && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {/* Base URL */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-2">
                    <Search className="size-3" />
                    Base URL
                  </label>
                  {droidStatus?.settings?.customModels?.find(m => m.id?.startsWith("custom:8Router"))?.baseUrl && (
                    <span className="text-[10px] text-muted-foreground/60 italic truncate max-w-[200px]">
                      Hiện tại: {droidStatus.settings.customModels.find(m => m.id?.startsWith("custom:8Router")).baseUrl}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Input 
                    value={getDisplayUrl()} 
                    onChange={(e) => setCustomBaseUrl(e.target.value)} 
                    placeholder="https://.../v1" 
                    className="h-9 text-xs"
                  />
                  {customBaseUrl && customBaseUrl !== baseUrl && (
                    <Button variant="ghost" size="icon-sm" onClick={() => setCustomBaseUrl("")} title="Khôi phục mặc định">
                      <RotateCcw className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* API Key */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-2">
                  <Info className="size-3" />
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
                  <div className="h-9 flex items-center px-3 bg-muted/20 border border-border rounded-md text-xs text-muted-foreground">
                    {cloudEnabled ? "Chưa có API key" : "sk_8router (Mặc định)"}
                  </div>
                )}
              </div>

              {/* Models */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
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
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                  
                  <div className="flex items-center gap-2">
                    <Input 
                      value={modelInput} 
                      onChange={(e) => setModelInput(e.target.value)} 
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addModel(); } }}
                      placeholder="provider/model-id" 
                      className="h-9 text-xs"
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setModalOpen(true)} 
                      disabled={!hasActiveProviders}
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
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </BaseToolCard>

      <ModelSelectModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={handleModelSelect}
        selectedModel={null}
        activeProviders={activeProviders}
        modelAliases={modelAliases}
        title="Chọn Model cho Factory Droid"
      />

      <ManualConfigModal
        isOpen={showManualConfigModal}
        onClose={() => setShowManualConfigModal(false)}
        title="Factory Droid - Cấu hình thủ công"
        configs={getManualConfigs()}
      />
    </>
  );
}
