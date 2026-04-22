"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Button, 
  ModelSelectModal, 
  ManualConfigModal, 
  Tooltip, 
  Input,
  Toggle
} from "@/shared/components";
import { BaseToolCard } from "./";
import { ArrowRight, RotateCcw, X, Info, Search, ShieldAlert, BookOpen } from "lucide-react";

const CLOUD_URL = process.env.NEXT_PUBLIC_CLOUD_URL;

export default function ClaudeToolCard({
  tool,
  isExpanded,
  onToggle,
  activeProviders,
  modelMappings,
  onModelMappingChange,
  baseUrl,
  hasActiveProviders,
  apiKeys,
  cloudEnabled,
  initialStatus,
}) {
  const [claudeStatus, setClaudeStatus] = useState(initialStatus || null);
  const [checkingClaude, setCheckingClaude] = useState(false);
  const [applying, setApplying] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentEditingAlias, setCurrentEditingAlias] = useState(null);
  const [selectedApiKey, setSelectedApiKey] = useState("");
  const [modelAliases, setModelAliases] = useState({});
  const [showManualConfigModal, setShowManualConfigModal] = useState(false);
  const [customBaseUrl, setCustomBaseUrl] = useState("");
  const [ccFilterNaming, setCcFilterNaming] = useState(false);
  const hasInitializedModels = useRef(false);

  const getConfigStatus = () => {
    if (!claudeStatus?.installed) return "not_configured";
    const currentUrl = claudeStatus.settings?.env?.ANTHROPIC_BASE_URL;
    if (!currentUrl) return "not_configured";
    const localMatch = currentUrl.includes("localhost") || currentUrl.includes("127.0.0.1");
    const cloudMatch = cloudEnabled && CLOUD_URL && currentUrl.startsWith(CLOUD_URL);
    const tunnelMatch = baseUrl && currentUrl.startsWith(baseUrl);
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
    if (initialStatus) setClaudeStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    if (isExpanded && !claudeStatus) {
      checkClaudeStatus();
      fetchModelAliases();
    }
    if (isExpanded) fetchModelAliases();
  }, [isExpanded]);

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(data => {
      setCcFilterNaming(!!data.ccFilterNaming);
    }).catch(() => {});
  }, []);

  const handleCcFilterNamingToggle = async (value) => {
    setCcFilterNaming(value);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ccFilterNaming: value }),
    }).catch(() => {});
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

  useEffect(() => {
    if (claudeStatus?.installed && !hasInitializedModels.current) {
      hasInitializedModels.current = true;
      const env = claudeStatus.settings?.env || {};
      
      tool.defaultModels.forEach((model) => {
        if (model.envKey) {
          const value = env[model.envKey] || model.defaultValue || "";
          if (value) {
            onModelMappingChange(model.alias, value);
          }
        }
      });
      const tokenFromFile = env.ANTHROPIC_AUTH_TOKEN;
      if (tokenFromFile && apiKeys?.some(k => k.key === tokenFromFile)) {
        setSelectedApiKey(tokenFromFile);
      }
    }
  }, [claudeStatus, apiKeys, tool.defaultModels, onModelMappingChange]);

  const checkClaudeStatus = async () => {
    setCheckingClaude(true);
    try {
      const res = await fetch("/api/cli-tools/claude-settings");
      const data = await res.json();
      setClaudeStatus(data);
    } catch (error) {
      setClaudeStatus({ installed: false, error: error.message });
    } finally {
      setCheckingClaude(false);
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

  const handleApplySettings = async () => {
    setApplying(true);
    setMessage(null);
    try {
      const env = { ANTHROPIC_BASE_URL: getEffectiveBaseUrl() };
      const keyToUse = selectedApiKey?.trim() 
        || (apiKeys?.length > 0 ? apiKeys[0].key : null)
        || (!cloudEnabled ? "sk_8router" : null);
      
      if (keyToUse) {
        env.ANTHROPIC_AUTH_TOKEN = keyToUse;
      }
      
      tool.defaultModels.forEach((model) => {
        const targetModel = modelMappings[model.alias];
        if (targetModel && model.envKey) env[model.envKey] = targetModel;
      });
      const res = await fetch("/api/cli-tools/claude-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ env }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Cấu hình thành công!" });
        setClaudeStatus(prev => ({ ...prev, hasBackup: true, settings: { ...prev?.settings, env } }));
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
      const res = await fetch("/api/cli-tools/claude-settings", { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Đặt lại thành công!" });
        tool.defaultModels.forEach((model) => onModelMappingChange(model.alias, model.defaultValue || ""));
        setSelectedApiKey("");
      } else {
        setMessage({ type: "error", text: data.error || "Không thể đặt lại cấu hình" });
      }
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setRestoring(false);
    }
  };

  const openModelSelector = (alias) => {
    setCurrentEditingAlias(alias);
    setModalOpen(true);
  };

  const handleModelSelect = (model) => {
    if (currentEditingAlias) onModelMappingChange(currentEditingAlias, model.value);
  };

  const getManualConfigs = () => {
    const keyToUse = (selectedApiKey && selectedApiKey.trim()) 
      ? selectedApiKey 
      : (!cloudEnabled ? "sk_8router" : "<API_KEY_FROM_DASHBOARD>");
    const env = { ANTHROPIC_BASE_URL: getEffectiveBaseUrl(), ANTHROPIC_AUTH_TOKEN: keyToUse };
    tool.defaultModels.forEach((model) => {
      const targetModel = modelMappings[model.alias];
      if (targetModel && model.envKey) env[model.envKey] = targetModel;
    });
    
    return [
      {
        filename: "~/.claude/settings.json",
        content: JSON.stringify({ hasCompletedOnboarding: true, env }, null, 2),
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
        checking={checkingClaude}
        applying={applying}
        restoring={restoring}
        message={message}
        onApply={handleApplySettings}
        onReset={handleResetSettings}
        onShowManualConfig={() => setShowManualConfigModal(true)}
        onCheckStatus={checkClaudeStatus}
        hasActiveProviders={hasActiveProviders}
      >
        {!checkingClaude && claudeStatus && !claudeStatus.installed && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <div className="flex items-start gap-3">
                <ShieldAlert className="text-amber-500 size-5 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-amber-700 dark:text-amber-400 text-sm">Chưa phát hiện Claude CLI</p>
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
                    npm install -g @anthropic-ai/claude-code
                  </code>
                </div>
                <p className="text-xs text-muted-foreground">Sau khi cài đặt, hãy chạy lệnh <code className="px-1 bg-muted rounded">claude</code> để khởi tạo.</p>
              </div>
            )}
          </div>
        )}

        {!checkingClaude && claudeStatus?.installed && (
          <div className="space-y-4">
            {/* Form Fields */}
            <div className="grid grid-cols-1 gap-4">
              {/* Base URL */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-2">
                    <Search className="size-3" />
                    Base URL
                  </label>
                  {claudeStatus?.settings?.env?.ANTHROPIC_BASE_URL && (
                    <span className="text-[10px] text-muted-foreground/60 italic truncate max-w-[200px]" title={claudeStatus.settings.env.ANTHROPIC_BASE_URL}>
                      Hiện tại: {claudeStatus.settings.env.ANTHROPIC_BASE_URL}
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
                {apiKeys.length > 0 ? (
                  <select 
                    value={selectedApiKey} 
                    onChange={(e) => setSelectedApiKey(e.target.value)} 
                    className="w-full h-9 px-3 py-1 bg-background border border-input rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                  >
                    {apiKeys.map((key) => <option key={key.id} value={key.key}>{key.key}</option>)}
                  </select>
                ) : (
                  <div className="h-9 flex items-center px-3 bg-muted/20 border border-border rounded-md text-xs text-muted-foreground">
                    {cloudEnabled ? "Chưa có API key - Hãy tạo một cái" : "sk_8router (Mặc định)"}
                  </div>
                )}
              </div>

              {/* Model Mappings */}
              {tool.defaultModels.map((model) => (
                <div key={model.alias} className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                    {model.name}
                  </label>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={modelMappings[model.alias] || ""} 
                      onChange={(e) => onModelMappingChange(model.alias, e.target.value)} 
                      placeholder="provider/model-id" 
                      className="h-9 text-xs"
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
                      <Button variant="ghost" size="icon-sm" onClick={() => onModelMappingChange(model.alias, "")} className="text-muted-foreground hover:text-destructive">
                        <X className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {/* CC Filter Naming */}
              <div className="flex items-center justify-between p-3 bg-muted/20 rounded-xl border border-border/50">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">Lọc tên hội thoại</span>
                    <Tooltip text="Tự động trả lời các yêu cầu đặt tên hội thoại của Claude Code, giúp tiết kiệm token.">
                      <Info className="size-3.5 text-muted-foreground cursor-help" />
                    </Tooltip>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Tối ưu hóa token bằng cách giả lập phản hồi tên topic.</p>
                </div>
                <Toggle checked={ccFilterNaming} onCheckedChange={handleCcFilterNamingToggle} />
              </div>
            </div>
          </div>
        )}
      </BaseToolCard>

      <ModelSelectModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onSelect={handleModelSelect} 
        selectedModel={currentEditingAlias ? modelMappings[currentEditingAlias] : null} 
        activeProviders={activeProviders} 
        modelAliases={modelAliases} 
        title={`Chọn model cho ${currentEditingAlias}`} 
      />
      
      <ManualConfigModal
        isOpen={showManualConfigModal}
        onClose={() => setShowManualConfigModal(false)}
        title="Claude CLI - Cấu hình thủ công"
        configs={getManualConfigs()}
      />
    </>
  );
}
