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
  Search, 
  Info, 
  ShieldAlert, 
  ArrowRight 
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function OpenClawToolCard({
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
  const [openclawStatus, setOpenclawStatus] = useState(initialStatus || null);
  const [checkingOpenclaw, setCheckingOpenclaw] = useState(false);
  const [applying, setApplying] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState(null);
  const [selectedApiKey, setSelectedApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [agentModels, setAgentModels] = useState({}); // { [agentId]: modelId }
  const [agentModalFor, setAgentModalFor] = useState(null); // agentId opening modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modelAliases, setModelAliases] = useState({});
  const [showManualConfigModal, setShowManualConfigModal] = useState(false);
  const [customBaseUrl, setCustomBaseUrl] = useState("");
  const hasInitializedModel = useRef(false);

  const getConfigStatus = () => {
    if (!openclawStatus?.installed) return "not_configured";
    const currentProvider = openclawStatus.settings?.models?.providers?.["8router"];
    if (!currentProvider) return "not_configured";
    const localMatch = currentProvider.baseUrl?.includes("localhost") || currentProvider.baseUrl?.includes("127.0.0.1") || currentProvider.baseUrl?.includes("0.0.0.0");
    const tunnelMatch = baseUrl && currentProvider.baseUrl?.startsWith(baseUrl);
    if (localMatch || tunnelMatch) return "configured";
    return "other";
  };

  const configStatus = getConfigStatus();

  useEffect(() => {
    if (apiKeys?.length > 0 && !selectedApiKey) {
      setSelectedApiKey(apiKeys[0].key);
    }
  }, [apiKeys, selectedApiKey]);

  useEffect(() => {
    if (initialStatus) setOpenclawStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    if (isExpanded && !openclawStatus) {
      checkOpenclawStatus();
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
    if (openclawStatus?.installed && !hasInitializedModel.current) {
      hasInitializedModel.current = true;
      const provider = openclawStatus.settings?.models?.providers?.["8router"];
      if (provider) {
        const primaryModel = openclawStatus.settings?.agents?.defaults?.model?.primary;
        if (primaryModel) setSelectedModel(primaryModel.replace("8router/", ""));
        if (provider.apiKey && apiKeys?.some(k => k.key === provider.apiKey)) {
          setSelectedApiKey(provider.apiKey);
        }
      }
      const agentList = openclawStatus.agents || [];
      const initAgentModels = {};
      agentList.forEach((agent) => {
        if (agent.currentModel) initAgentModels[agent.id] = agent.currentModel;
      });
      setAgentModels(initAgentModels);
    }
  }, [openclawStatus, apiKeys]);

  const checkOpenclawStatus = async () => {
    setCheckingOpenclaw(true);
    try {
      const res = await fetch("/api/cli-tools/openclaw-settings");
      const data = await res.json();
      setOpenclawStatus(data);
    } catch (error) {
      setOpenclawStatus({ installed: false, error: error.message });
    } finally {
      setCheckingOpenclaw(false);
    }
  };

  const normalizeLocalhost = (url) => url.replace("://localhost", "://127.0.0.1");

  const getLocalBaseUrl = () => {
    if (typeof window !== "undefined") {
      return normalizeLocalhost(window.location.origin);
    }
    return "http://127.0.0.1:20128";
  };

  const getEffectiveBaseUrl = () => {
    const url = customBaseUrl || getLocalBaseUrl();
    return url.endsWith("/v1") ? url : `${url}/v1`;
  };

  const getDisplayUrl = () => {
    const url = customBaseUrl || getLocalBaseUrl();
    return url.endsWith("/v1") ? url : `${url}/v1`;
  };

  const handleApplySettings = async () => {
    setApplying(true);
    setMessage(null);
    try {
      const keyToUse = selectedApiKey?.trim() 
        || (apiKeys?.length > 0 ? apiKeys[0].key : null)
        || (!cloudEnabled ? "sk_8router" : null);

      const res = await fetch("/api/cli-tools/openclaw-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          baseUrl: getEffectiveBaseUrl(), 
          apiKey: keyToUse,
          model: selectedModel,
          agentModels,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Áp dụng cấu hình thành công!" });
        checkOpenclawStatus();
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
      const res = await fetch("/api/cli-tools/openclaw-settings", { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Đã đặt lại cấu hình!" });
        setSelectedModel("");
        setSelectedApiKey("");
        checkOpenclawStatus();
      } else {
        setMessage({ type: "error", text: data.error || "Không thể đặt lại cấu hình" });
      }
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setRestoring(false);
    }
  };

  const handleModelSelect = (model) => {
    if (agentModalFor) {
      setAgentModels(prev => ({ ...prev, [agentModalFor]: model.value }));
      setAgentModalFor(null);
    } else {
      setSelectedModel(model.value);
    }
    setModalOpen(false);
  };

  const getManualConfigs = () => {
    const keyToUse = (selectedApiKey && selectedApiKey.trim()) 
      ? selectedApiKey 
      : (!cloudEnabled ? "sk_8router" : "<API_KEY_FROM_DASHBOARD>");

    const settingsContent = {
      agents: {
        defaults: {
          model: {
            primary: `8router/${selectedModel || "provider/model-id"}`,
          },
        },
      },
      models: {
        providers: {
          "8router": {
            baseUrl: getEffectiveBaseUrl(),
            apiKey: keyToUse,
            api: "openai-completions",
            models: [
              {
                id: selectedModel || "provider/model-id",
                name: (selectedModel || "provider/model-id").split("/").pop(),
              },
            ],
          },
        },
      },
    };

    return [
      {
        filename: "~/.openclaw/openclaw.json",
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
        checking={checkingOpenclaw}
        applying={applying}
        restoring={restoring}
        message={message}
        onApply={handleApplySettings}
        onReset={handleResetSettings}
        onShowManualConfig={() => setShowManualConfigModal(true)}
        onCheckStatus={checkOpenclawStatus}
        hasActiveProviders={hasActiveProviders}
      >
        {!checkingOpenclaw && openclawStatus && !openclawStatus.installed && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <div className="flex items-start gap-3">
                <ShieldAlert className="text-amber-500 size-5 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-amber-700 dark:text-amber-400 text-sm">Chưa phát hiện Open Claw CLI</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cấu hình thủ công vẫn khả dụng nếu bạn đang chạy 8router trên server từ xa.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {!checkingOpenclaw && openclawStatus?.installed && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {/* Base URL */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-2">
                    <Search className="size-3" />
                    Base URL
                  </label>
                  {openclawStatus?.settings?.models?.providers?.["8router"]?.baseUrl && (
                    <span className="text-[10px] text-muted-foreground/60 italic truncate max-w-[200px]">
                      Hiện tại: {openclawStatus.settings.models.providers["8router"].baseUrl}
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
                  {customBaseUrl && customBaseUrl !== getLocalBaseUrl() && (
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

              {/* Default Model */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                  Model mặc định
                </label>
                <div className="flex items-center gap-2">
                  <Input 
                    value={selectedModel} 
                    onChange={(e) => setSelectedModel(e.target.value)} 
                    placeholder="provider/model-id" 
                    className="h-9 text-xs flex-1"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => { setAgentModalFor(null); setModalOpen(true); }} 
                    disabled={!hasActiveProviders} 
                    className="h-9 px-3 shrink-0 font-semibold"
                  >
                    Chọn
                  </Button>
                  {selectedModel && (
                    <Button 
                      variant="ghost" 
                      size="icon-sm" 
                      onClick={() => setSelectedModel("")} 
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Per-agent model overrides */}
              {(openclawStatus.agents || []).filter(a => a.agentDir).length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Cấu hình từng Agent
                  </label>
                  <div className="space-y-3">
                    {(openclawStatus.agents || []).filter(a => a.agentDir).map((agent) => (
                      <div key={agent.id} className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-primary truncate max-w-[150px]" title={agent.name || agent.id}>
                            {agent.name || agent.id}
                          </span>
                          <ArrowRight className="size-3 text-muted-foreground shrink-0" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            value={agentModels[agent.id] || ""}
                            onChange={(e) => setAgentModels(prev => ({ ...prev, [agent.id]: e.target.value }))}
                            placeholder={`Mặc định (${selectedModel || "chưa chọn"})`}
                            className="h-8 text-[11px]"
                          />
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => { setAgentModalFor(agent.id); setModalOpen(true); }} 
                            disabled={!hasActiveProviders} 
                            className="h-8 px-2 text-[10px] font-bold"
                          >
                            Chọn
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </BaseToolCard>

      <ModelSelectModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={handleModelSelect}
        selectedModel={selectedModel}
        activeProviders={activeProviders}
        modelAliases={modelAliases}
        title="Chọn Model cho Open Claw"
      />

      <ManualConfigModal
        isOpen={showManualConfigModal}
        onClose={() => setShowManualConfigModal(false)}
        title="Open Claw - Cấu hình thủ công"
        configs={getManualConfigs()}
      />
    </>
  );
}
