"use client";

import { useState } from "react";
import { 
  Input, 
  ModelSelectModal,
  Button,
  Tooltip
} from "@/shared/components";
import { BaseToolCard } from "./";
import { 
  Copy, 
  Check, 
  X, 
  Info, 
  AlertTriangle, 
  AlertCircle,
  Search,
  ExternalLink
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export default function DefaultToolCard({ 
  toolId, 
  tool, 
  isExpanded, 
  onToggle, 
  baseUrl, 
  apiKeys, 
  activeProviders = [], 
  cloudEnabled = false, 
  tunnelEnabled = false 
}) {
  const [copiedField, setCopiedField] = useState(null);
  const [showModelModal, setShowModelModal] = useState(false);
  const [modelValue, setModelValue] = useState("");
  const [selectedApiKey, setSelectedApiKey] = useState(() => 
    apiKeys?.length > 0 ? apiKeys[0].key : ""
  );

  const replaceVars = (text) => {
    const keyToUse = (selectedApiKey && selectedApiKey.trim()) 
      ? selectedApiKey 
      : (!cloudEnabled ? "sk_8router" : "your-api-key");
    
    const normalizedBaseUrl = baseUrl || "http://localhost:20128";
    const baseUrlWithV1 = normalizedBaseUrl.endsWith("/v1") 
      ? normalizedBaseUrl 
      : `${normalizedBaseUrl}/v1`;
    
    return text
      .replace(/\{\{baseUrl\}\}/g, baseUrlWithV1)
      .replace(/\{\{apiKey\}\}/g, keyToUse)
      .replace(/\{\{model\}\}/g, modelValue || "provider/model-id");
  };

  const handleCopy = async (text, field) => {
    await navigator.clipboard.writeText(replaceVars(text));
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSelectModel = (model) => {
    setModelValue(model.value);
  };

  const hasActiveProviders = activeProviders.length > 0;

  const renderApiKeySelector = () => {
    return (
      <div className="flex items-center gap-2 mt-2">
        {apiKeys?.length > 0 ? (
          <>
            <select
              value={selectedApiKey}
              onChange={(e) => setSelectedApiKey(e.target.value)}
              className="flex-1 h-9 px-3 bg-background border border-input rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
            >
              {apiKeys.map((key) => (
                <option key={key.id} value={key.key}>{key.key}</option>
              ))}
            </select>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => handleCopy(selectedApiKey, "apiKey")}
              className="shrink-0 h-9 w-9"
            >
              {copiedField === "apiKey" ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
            </Button>
          </>
        ) : (
          <div className="h-9 flex items-center px-3 bg-muted/20 border border-border rounded-md text-xs text-muted-foreground w-full">
            {cloudEnabled ? "Chưa có API key" : "sk_8router (Mặc định)"}
          </div>
        )}
      </div>
    );
  };

  const renderModelSelector = () => {
    return (
      <div className="flex items-center gap-2 mt-2">
        <Input
          value={modelValue}
          onChange={(e) => setModelValue(e.target.value)}
          placeholder="provider/model-id"
          className="h-9 text-xs flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowModelModal(true)}
          disabled={!hasActiveProviders}
          className="h-9 px-3 shrink-0 font-semibold"
        >
          Chọn Model
        </Button>
        {modelValue && (
          <>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => handleCopy(modelValue, "model")}
              className="shrink-0 h-9 w-9"
            >
              {copiedField === "model" ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setModelValue("")}
              className="h-9 w-9 text-muted-foreground hover:text-destructive"
            >
              <X className="size-4" />
            </Button>
          </>
        )}
      </div>
    );
  };

  const renderNotes = () => {
    if (!tool.notes || tool.notes.length === 0) return null;
    
    return (
      <div className="space-y-3 mb-6">
        {tool.notes.map((note, index) => {
          if (note.type === "cloudCheck" && (cloudEnabled || tunnelEnabled)) return null;
          
          const isWarning = note.type === "warning";
          const isError = note.type === "cloudCheck" && !cloudEnabled && !tunnelEnabled;
          
          return (
            <div 
              key={index} 
              className={cn(
                "flex items-start gap-3 p-4 rounded-xl border",
                isWarning ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400" :
                isError ? "bg-destructive/10 border-destructive/30 text-destructive" :
                "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400"
              )}
            >
              {isWarning ? <AlertTriangle className="size-5 shrink-0 mt-0.5" /> :
               isError ? <AlertCircle className="size-5 shrink-0 mt-0.5" /> :
               <Info className="size-5 shrink-0 mt-0.5" />}
              <p className="text-sm font-medium">{note.text}</p>
            </div>
          );
        })}
      </div>
    );
  };

  const canShowGuide = () => {
    if (tool.requiresExternalUrl && !cloudEnabled && !tunnelEnabled) return false;
    if (tool.requiresCloud && !cloudEnabled) return false;
    return true;
  };

  const renderGuideSteps = () => {
    if (!tool.guideSteps) return <p className="text-muted-foreground text-sm italic">Sắp có hướng dẫn...</p>;

    return (
      <div className="space-y-6">
        {renderNotes()}
        {canShowGuide() && tool.guideSteps.map((item) => (
          <div key={item.step} className="flex items-start gap-4">
            <div 
              className="size-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white shadow-sm"
              style={{ backgroundColor: tool.color || "#6366f1" }}
            >
              {item.step}
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <p className="font-bold text-sm">{item.title}</p>
              {item.desc && <p className="text-xs text-muted-foreground">{item.desc}</p>}
              {item.type === "apiKeySelector" && renderApiKeySelector()}
              {item.type === "modelSelector" && renderModelSelector()}
              {item.value && (
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-muted/50 rounded-lg text-[11px] font-mono border border-border truncate">
                    {replaceVars(item.value)}
                  </code>
                  {item.copyable && (
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => handleCopy(item.value, `${item.step}-${item.title}`)}
                      className="shrink-0 h-8 w-8"
                    >
                      {copiedField === `${item.step}-${item.title}` ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {canShowGuide() && tool.codeBlock && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {tool.codeBlock.language}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(tool.codeBlock.code, "codeblock")}
                className="h-7 px-2 text-[10px] font-bold uppercase"
              >
                {copiedField === "codeblock" ? <Check className="mr-1.5 size-3 text-emerald-500" /> : <Copy className="mr-1.5 size-3" />}
                {copiedField === "codeblock" ? "Đã sao chép!" : "Sao chép"}
              </Button>
            </div>
            <pre className="p-4 bg-muted/50 rounded-xl border border-border overflow-x-auto">
              <code className="text-[11px] font-mono whitespace-pre text-foreground/80 leading-relaxed">
                {replaceVars(tool.codeBlock.code)}
              </code>
            </pre>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <BaseToolCard
        tool={tool}
        isExpanded={isExpanded}
        onToggle={onToggle}
        status={null}
        onApply={null}
        onReset={null}
        hasActiveProviders={hasActiveProviders}
      >
        <div className="pt-2">
          {renderGuideSteps()}
        </div>
      </BaseToolCard>

      <ModelSelectModal
        isOpen={showModelModal}
        onClose={() => setShowModelModal(false)}
        onSelect={handleSelectModel}
        selectedModel={modelValue}
        activeProviders={activeProviders}
        title="Chọn Model"
      />
    </>
  );
}
