"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import { 
  CircleNotch as Loader2, 
  ArrowSquareOut as ExternalLink, 
  CheckCircle,
  Copy,
  Check,
  WarningCircle,
  ArrowClockwise
} from "@phosphor-icons/react";
import { Modal, Button, Input } from "@/shared/components";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";

/**
 * OAuth Modal Component
 * - Localhost: Auto callback via popup message
 * - Remote: Manual paste callback URL
 */
export default function OAuthModal({ isOpen, provider, providerInfo, onSuccess, onClose, oauthMeta, idcConfig }) {
  const [step, setStep] = useState("waiting"); // waiting | input | success | error
  const [authData, setAuthData] = useState(null);
  const [callbackUrl, setCallbackUrl] = useState("");
  const [error, setError] = useState(null);
  const [isDeviceCode, setIsDeviceCode] = useState(false);
  const [deviceData, setDeviceData] = useState(null);
  const [polling, setPolling] = useState(false);
  const popupRef = useRef(null);
  const pollingAbortRef = useRef(false);
  const { copied, copy } = useCopyToClipboard();

  // State for client-only values to avoid hydration mismatch
  const [isLocalhost, setIsLocalhost] = useState(false);
  const [placeholderUrl, setPlaceholderUrl] = useState("/callback?code=...");
  const callbackProcessedRef = useRef(false);

  // Detect if running on localhost (client-side only)
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsLocalhost(
        window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      );
      setPlaceholderUrl(`${window.location.origin}/callback?code=...`);
    }
  }, []);

  // Exchange tokens
  const exchangeTokens = useCallback(async (code, state) => {
    if (!authData) return;
    try {
      const res = await fetch(`/api/oauth/${provider}/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          redirectUri: authData.redirectUri,
          codeVerifier: authData.codeVerifier,
          state,
          ...(oauthMeta ? { meta: oauthMeta } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStep("success");
      onSuccess?.();
    } catch (err) {
      setError(err.message);
      setStep("error");
    }
  }, [authData, provider, onSuccess, oauthMeta]);

  // Poll for device code token
  const startPolling = useCallback(async (deviceCode, codeVerifier, interval, extraData) => {
    pollingAbortRef.current = false;
    setPolling(true);
    const maxAttempts = 60;

    for (let i = 0; i < maxAttempts; i++) {
      if (pollingAbortRef.current) {
        setPolling(false);
        return;
      }

      await new Promise((r) => setTimeout(r, interval * 1000));

      if (pollingAbortRef.current) {
        setPolling(false);
        return;
      }

      try {
        const res = await fetch(`/api/oauth/${provider}/poll`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceCode, codeVerifier, extraData }),
        });

        const data = await res.json();

        if (data.success) {
          pollingAbortRef.current = true;
          setStep("success");
          setPolling(false);
          onSuccess?.();
          return;
        }

        if (data.error === "expired_token" || data.error === "access_denied") {
          throw new Error(data.errorDescription || data.error);
        }

        if (data.error === "slow_down") {
          interval = Math.min(interval + 5, 30);
        }
      } catch (err) {
        setError(err.message);
        setStep("error");
        setPolling(false);
        return;
      }
    }

    setError("Authorization timeout");
    setStep("error");
    setPolling(false);
  }, [provider, onSuccess]);

  // Start OAuth flow
  const startOAuthFlow = useCallback(async () => {
    if (!provider) return;
    try {
      setError(null);

      const deviceCodeProviders = ["github", "qwen", "kiro", "kimi-coding", "kilocode", "codebuddy"];
      if (deviceCodeProviders.includes(provider)) {
        setIsDeviceCode(true);
        setStep("waiting");

        const deviceCodeUrl = new URL(`/api/oauth/${provider}/device-code`, window.location.origin);
        if (provider === "kiro" && idcConfig?.startUrl) {
          deviceCodeUrl.searchParams.set("start_url", idcConfig.startUrl);
          if (idcConfig.region) {
            deviceCodeUrl.searchParams.set("region", idcConfig.region);
          }
          deviceCodeUrl.searchParams.set("auth_method", "idc");
        }
        const res = await fetch(deviceCodeUrl.toString());
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setDeviceData(data);

        const extraData = provider === "kiro"
          ? {
              _clientId: data._clientId,
              _clientSecret: data._clientSecret,
              _region: data._region,
              _authMethod: data._authMethod,
              _startUrl: data._startUrl,
            }
          : null;
        startPolling(data.device_code, data.codeVerifier, data.interval || 5, extraData);
        return;
      }

      const appPort = window.location.port || (window.location.protocol === "https:" ? "443" : "80");
      let redirectUri;
      let codexProxyActive = false;

      if (provider === "codex") {
        try {
          const proxyRes = await fetch(`/api/oauth/codex/start-proxy?app_port=${appPort}`);
          const proxyData = await proxyRes.json();
          codexProxyActive = proxyData.success;
        } catch {
          codexProxyActive = false;
        }
        redirectUri = "http://localhost:1455/auth/callback";
      } else {
        redirectUri = `http://localhost:${appPort}/callback`;
      }

      const authorizeUrl = new URL(`/api/oauth/${provider}/authorize`, window.location.origin);
      authorizeUrl.searchParams.set("redirect_uri", redirectUri);
      if (oauthMeta) {
        Object.entries(oauthMeta).forEach(([k, v]) => { if (v) authorizeUrl.searchParams.set(k, v); });
      }
      const res = await fetch(authorizeUrl.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAuthData({ ...data, redirectUri });

      if (provider === "codex" && codexProxyActive) {
        setStep("waiting");
        popupRef.current = window.open(data.authUrl, "oauth_popup", "width=600,height=700");
        if (!popupRef.current) setStep("input");
      } else if (!isLocalhost || provider === "codex") {
        setStep("input");
        window.open(data.authUrl, "_blank");
      } else {
        setStep("waiting");
        popupRef.current = window.open(data.authUrl, "oauth_popup", "width=600,height=700");
        if (!popupRef.current) setStep("input");
      }
    } catch (err) {
      setError(err.message);
      setStep("error");
    }
  }, [provider, isLocalhost, startPolling, oauthMeta, idcConfig]);

  useEffect(() => {
    if (isOpen && provider) {
      setAuthData(null);
      setCallbackUrl("");
      setError(null);
      setIsDeviceCode(false);
      setDeviceData(null);
      setPolling(false);
      pollingAbortRef.current = false;
      startOAuthFlow();
    } else if (!isOpen) {
      pollingAbortRef.current = true;
      if (provider === "codex") {
        fetch("/api/oauth/codex/stop-proxy").catch(() => {});
      }
    }
  }, [isOpen, provider, startOAuthFlow]);

  useEffect(() => {
    if (!authData) return;
    callbackProcessedRef.current = false;

    const handleCallback = async (data) => {
      if (callbackProcessedRef.current) return;
      const { code, state, error: callbackError, errorDescription } = data;
      if (callbackError) {
        callbackProcessedRef.current = true;
        setError(errorDescription || callbackError);
        setStep("error");
        return;
      }
      if (code) {
        callbackProcessedRef.current = true;
        await exchangeTokens(code, state);
      }
    };

    const handleMessage = (event) => {
      const isLocalhost = event.origin.includes("localhost") || event.origin.includes("127.0.0.1");
      const isSameOrigin = event.origin === window.location.origin;
      if (!isLocalhost && !isSameOrigin) return;
      if (event.data?.type === "oauth_callback") {
        handleCallback(event.data.data);
      }
    };
    window.addEventListener("message", handleMessage);

    let channel;
    try {
      channel = new BroadcastChannel("oauth_callback");
      channel.onmessage = (event) => handleCallback(event.data);
    } catch (e) {
      console.log("BroadcastChannel not supported");
    }

    const handleStorage = (event) => {
      if (event.key === "oauth_callback" && event.newValue) {
        try {
          const data = JSON.parse(event.newValue);
          handleCallback(data);
          localStorage.removeItem("oauth_callback");
        } catch (e) {
          console.log("Failed to parse localStorage data");
        }
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("storage", handleStorage);
      if (channel) channel.close();
    };
  }, [authData, exchangeTokens]);

  const handleManualSubmit = async () => {
    try {
      setError(null);
      const url = new URL(callbackUrl);
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const errorParam = url.searchParams.get("error");
      if (errorParam) throw new Error(url.searchParams.get("error_description") || errorParam);
      if (!code) throw new Error("No authorization code found in URL");
      await exchangeTokens(code, state);
    } catch (err) {
      setError(err.message);
      setStep("error");
    }
  };

  const handleClose = useCallback(() => {
    if (provider === "codex") {
      fetch("/api/oauth/codex/stop-proxy").catch(() => {});
    }
    onClose();
  }, [onClose, provider]);

  if (!provider || !providerInfo) return null;
  const deviceLoginUrl = deviceData?.verification_uri_complete || deviceData?.verification_uri || "";

  return (
    <Modal isOpen={isOpen} title={`Connect ${providerInfo.name}`} onClose={handleClose} size="lg">
      <div className="flex flex-col gap-4">
        {step === "waiting" && !isDeviceCode && (
          <div className="text-center py-6">
            <div className="size-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="size-8 text-primary animate-spin" weight="bold" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Waiting for Authorization</h3>
            <p className="text-sm text-text-muted mb-4">
              Complete the authorization in the popup window.
            </p>
            <Button variant="ghost" onClick={() => setStep("input")} className="w-full">
              Popup blocked? Enter URL manually
            </Button>
          </div>
        )}

        {step === "waiting" && isDeviceCode && deviceData && (
          <>
            <div className="text-center py-4">
              <p className="text-sm text-text-muted mb-4">
                Visit the login URL below and authorize:
              </p>
              <div className="bg-sidebar p-4 rounded-lg mb-4">
                <p className="text-xs text-text-muted mb-1">Login URL</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm break-all">{deviceLoginUrl}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={copied === "login_url" ? Check : Copy}
                    onClick={() => copy(deviceLoginUrl, "login_url")}
                    disabled={!deviceLoginUrl}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={ExternalLink}
                    onClick={() => window.open(deviceLoginUrl, "_blank", "noopener,noreferrer")}
                    disabled={!deviceLoginUrl}
                  >
                    Open
                  </Button>
                </div>
              </div>
              <div className="bg-primary/10 p-4 rounded-lg">
                <p className="text-xs text-text-muted mb-1">Your Code</p>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-2xl font-mono font-bold text-primary">{deviceData.user_code}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={copied === "user_code" ? Check : Copy}
                    onClick={() => copy(deviceData.user_code, "user_code")}
                  />
                </div>
              </div>
            </div>
            {polling && (
              <div className="flex items-center justify-center gap-2 text-sm text-text-muted">
                <Loader2 className="size-4 animate-spin" weight="bold" />
                Waiting for authorization...
              </div>
            )}
          </>
        )}

        {step === "input" && !isDeviceCode && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Step 1: Open this URL in your browser</p>
              <div className="flex gap-2">
                <Input value={authData?.authUrl || ""} readOnly className="flex-1 font-mono text-xs" />
                <Button variant="secondary" icon={copied === "auth_url" ? Check : Copy} onClick={() => copy(authData?.authUrl, "auth_url")}>
                  Copy
                </Button>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Step 2: Paste the callback URL here</p>
              <p className="text-xs text-text-muted mb-2">
                After authorization, copy the full URL from your browser.
              </p>
              <Input
                value={callbackUrl}
                onChange={(e) => setCallbackUrl(e.target.value)}
                placeholder={placeholderUrl}
                className="font-mono text-xs"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleManualSubmit} className="w-full" disabled={!callbackUrl}>
                Connect
              </Button>
              <Button onClick={handleClose} variant="ghost" className="w-full">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="text-center py-6">
            <div className="size-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="size-8 text-green-600" weight="bold" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Connected Successfully!</h3>
            <p className="text-sm text-text-muted mb-4">
              Your {providerInfo.name} account has been connected.
            </p>
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        )}

        {step === "error" && (
          <div className="text-center py-6">
            <div className="size-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <WarningCircle className="size-8 text-red-600" weight="bold" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Connection Failed</h3>
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <div className="flex gap-2">
              <Button onClick={startOAuthFlow} variant="secondary" className="w-full" icon={ArrowClockwise}>
                Try Again
              </Button>
              <Button onClick={handleClose} variant="ghost" className="w-full">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

OAuthModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  provider: PropTypes.string,
  providerInfo: PropTypes.shape({ name: PropTypes.string }),
  onSuccess: PropTypes.func,
  onClose: PropTypes.func.isRequired,
  oauthMeta: PropTypes.object,
  idcConfig: PropTypes.shape({
    startUrl: PropTypes.string,
    region: PropTypes.string,
  }),
};
