"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Shield, CheckCircle2, XCircle, ArrowRight, ShieldCheck, StopCircle, PlayCircle, AlertCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_MITM_ROUTER_BASE = "http://localhost:20128";

/**
 * Shared MITM infrastructure card — manages SSL cert + server start/stop.
 * DNS per-tool is handled separately in MitmToolCard.
 */
export default function MitmServerCard({ apiKeys, cloudEnabled, onStatusChange }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [sudoPassword, setSudoPassword] = useState("");
  const [selectedApiKey, setSelectedApiKey] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [mitmRouterBaseUrl, setMitmRouterBaseUrl] = useState(DEFAULT_MITM_ROUTER_BASE);

  const isWindows = typeof navigator !== "undefined" && navigator.userAgent?.includes("Windows");
  const isAdmin = status?.isAdmin !== false;

  useEffect(() => {
    if (apiKeys?.length > 0 && !selectedApiKey) {
      setSelectedApiKey(apiKeys[0].key);
    }
  }, [apiKeys, selectedApiKey]);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/cli-tools/antigravity-mitm");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (data.mitmRouterBaseUrl) {
          setMitmRouterBaseUrl(data.mitmRouterBaseUrl);
        }
        onStatusChange?.(data);
      }
    } catch {
      setStatus({ running: false, certExists: false, dnsStatus: {} });
    }
  };

  const handleAction = (action) => {
    setActionError(null);
    if (isWindows || status?.hasCachedPassword) {
      doAction(action, "");
    } else {
      setPendingAction(action);
      setShowPasswordModal(true);
      setModalError(null);
    }
  };

  const doAction = async (action, password) => {
    setLoading(true);
    setActionError(null);
    try {
      let res;
      if (action === "trust-cert") {
        res = await fetch("/api/cli-tools/antigravity-mitm", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "trust-cert", sudoPassword: password }),
        });
      } else if (action === "start") {
        const keyToUse = selectedApiKey?.trim()
          || (apiKeys?.length > 0 ? apiKeys[0].key : null)
          || (!cloudEnabled ? "sk_8router" : null);
        res = await fetch("/api/cli-tools/antigravity-mitm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey: keyToUse,
            sudoPassword: password,
            mitmRouterBaseUrl: mitmRouterBaseUrl.trim() || DEFAULT_MITM_ROUTER_BASE,
          }),
        });
      } else {
        res = await fetch("/api/cli-tools/antigravity-mitm", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sudoPassword: password }),
        });
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setActionError(data.error || `Failed to ${action} MITM server`);
        return;
      }
      setShowPasswordModal(false);
      setSudoPassword("");
      await fetchStatus();
    } catch (e) {
      setActionError(e.message || "Network error");
    } finally {
      setLoading(false);
      setPendingAction(null);
    }
  };

  const handleConfirmPassword = () => {
    if (!sudoPassword.trim()) {
      setModalError("Sudo password is required");
      return;
    }
    doAction(pendingAction, sudoPassword);
  };

  const isRunning = status?.running;

  return (
    <>
      <Card className="border-primary/20 bg-primary/5 shadow-none p-4">
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="size-5 text-primary" />
              <span className="font-semibold text-sm text-foreground">MITM Server</span>
              {isRunning ? (
                <Badge className="h-5 px-1.5 text-[10px] bg-green-500/10 text-green-600 border-green-500/20 shadow-none">Running</Badge>
              ) : (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] shadow-none">Stopped</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {[
                { label: "Cert", ok: status?.certExists },
                { label: "Trusted", ok: status?.certTrusted },
                { label: "Server", ok: isRunning },
              ].map(({ label, ok }) => (
                <div key={label} className="flex items-center gap-1">
                  {ok ? <CheckCircle2 className="size-3 text-green-600" /> : <XCircle className="size-3 text-muted-foreground" />}
                  <span className={cn(ok ? "text-green-600 font-medium" : "text-muted-foreground")}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Purpose & How it works */}
          <div className="p-3 rounded-lg bg-background/50 border border-border/50 flex flex-col gap-2.5">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">Purpose:</span> Use Antigravity IDE & GitHub Copilot with ANY provider/model from 8Router.
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">How it works:</span> Antigravity/Copilot IDE request → DNS redirect to localhost:443 → MITM proxy intercepts → 8Router → response.
            </p>
          </div>

          {/* Base URL + API Key — same row pattern as Claude Code / cli-tools */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <span className="w-32 shrink-0 text-xs font-semibold text-foreground text-right">8Router Base URL</span>
              <div className="flex-1">
                <Input
                  type="text"
                  value={mitmRouterBaseUrl}
                  onChange={(e) => setMitmRouterBaseUrl(e.target.value)}
                  placeholder={DEFAULT_MITM_ROUTER_BASE}
                  disabled={isRunning}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            {!isRunning && (
              <div className="flex items-center gap-2">
                <span className="w-32 shrink-0 text-xs font-semibold text-foreground text-right">API Key</span>
                <div className="flex-1">
                  {apiKeys?.length > 0 ? (
                    <select
                      value={selectedApiKey}
                      onChange={(e) => setSelectedApiKey(e.target.value)}
                      className="w-full h-8 px-2 bg-background rounded-lg border border-input text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {apiKeys.map((key) => (
                        <option key={key.id} value={key.key}>
                          {key.key}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-muted-foreground px-2 py-1.5 block">
                      {cloudEnabled ? "No API keys — create one in Keys page" : "sk_8router (default)"}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {status?.certExists && !status?.certTrusted && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAction("trust-cert")}
                disabled={loading}
                className="h-8 bg-yellow-500/10 border-yellow-500/20 text-yellow-600 hover:bg-yellow-500/20 shadow-none text-xs"
              >
                <ShieldCheck className="size-4 mr-1.5" />
                Trust Cert
              </Button>
            )}
            {isRunning ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleAction("stop")}
                disabled={loading}
                className="h-8 bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20 shadow-none text-xs"
              >
                <StopCircle className="size-4 mr-1.5" />
                Stop Server
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => handleAction("start")}
                disabled={loading || (isWindows && !isAdmin)}
                className="h-8 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 shadow-none text-xs"
              >
                <PlayCircle className="size-4 mr-1.5" />
                Start Server
              </Button>
            )}
            {isRunning && (
              <p className="text-[11px] text-muted-foreground ml-auto">Enable DNS per tool below to activate interception</p>
            )}
          </div>

          {/* Action error */}
          {actionError && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg text-xs bg-destructive/10 text-destructive border-destructive/20 shadow-none">
              <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Windows admin warning */}
          {isWindows && !isAdmin && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs bg-destructive/10 text-destructive border-destructive/20 shadow-none">
              <Shield className="size-3.5" />
              <span>Administrator required — restart 8Router as Administrator to use MITM</span>
            </div>
          )}
        </div>
      </Card>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-xl p-6 w-full max-w-sm flex flex-col gap-4 shadow-none">
            <h3 className="font-semibold text-foreground">Sudo Password Required</h3>
            <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <AlertTriangle className="size-5 text-yellow-500 shrink-0" />
              <p className="text-xs text-muted-foreground">Required for SSL certificate and server startup</p>
            </div>
            <Input
              type="password"
              placeholder="Enter sudo password"
              value={sudoPassword}
              onChange={(e) => setSudoPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !loading) handleConfirmPassword(); }}
              className="h-9"
            />
            {modalError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs bg-destructive/10 text-destructive border-destructive/20 shadow-none">
                <AlertCircle className="size-3.5" />
                <span>{modalError}</span>
              </div>
            )}
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setShowPasswordModal(false); setSudoPassword(""); setModalError(null); }} disabled={loading}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleConfirmPassword} disabled={loading}>
                {loading ? "Confirming..." : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
