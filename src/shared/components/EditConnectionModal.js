"use client";

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  CheckCircle2, 
  AlertCircle, 
  Activity, 
  ShieldCheck, 
  RefreshCw,
  Save,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isOpenAICompatibleProvider, isAnthropicCompatibleProvider } from "@/shared/constants/providers";

export default function EditConnectionModal({ isOpen, connection, proxyPools, onSave, onClose }) {
  const [formData, setFormData] = useState({ name: "", priority: 1, apiKey: "" });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (connection) {
      setFormData({ name: connection.name || "", priority: connection.priority || 1, apiKey: "" });
      setTestResult(null);
      setValidationResult(null);
    }
  }, [connection]);

  const isOAuth = connection?.authType === "oauth";
  const isCompatible = connection ? (isOpenAICompatibleProvider(connection.provider) || isAnthropicCompatibleProvider(connection.provider)) : false;

  const handleTest = async () => {
    if (!connection?.provider) return;
    setTesting(true); setTestResult(null);
    try {
      const res = await fetch(`/api/providers/${connection.id}/test`, { method: "POST" });
      const data = await res.json();
      setTestResult(data.valid ? "success" : "failed");
    } catch { setTestResult("failed"); } finally { setTesting(false); }
  };

  const handleValidate = async () => {
    if (!connection?.provider || !formData.apiKey) return;
    setValidating(true); setValidationResult(null);
    try {
      const res = await fetch("/api/providers/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: connection.provider, apiKey: formData.apiKey }) });
      const data = await res.json();
      setValidationResult(data.valid ? "success" : "failed");
    } catch { setValidationResult("failed"); } finally { setValidating(false); }
  };

  const handleSubmit = async () => {
    if (!connection) return;
    setSaving(true);
    try {
      const updates = { name: formData.name, priority: formData.priority };
      if (!isOAuth && formData.apiKey) {
        updates.apiKey = formData.apiKey;
        if (validationResult === "success") { updates.testStatus = "active"; updates.lastError = null; updates.lastErrorAt = null; }
      }
      await onSave(updates);
    } finally { setSaving(false); }
  };

  if (!connection) return null;

  return (
    <Dialog open={isOpen} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Connection</DialogTitle>
          <DialogDescription>Modify metadata and credentials for {connection.provider}.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Identifier</Label>
            <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder={isOAuth ? "Account Name" : "Credential Label"} />
          </div>

          <div className="grid gap-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Routing Priority</Label>
            <Input type="number" value={formData.priority} onChange={e => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })} />
          </div>

          {!isOAuth && (
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Access Token</Label>
              <div className="flex gap-2">
                <Input type="password" value={formData.apiKey} onChange={e => setFormData({ ...formData, apiKey: e.target.value })} placeholder="Update key..." className="flex-1" />
                <Button variant="outline" size="sm" onClick={handleValidate} disabled={!formData.apiKey || validating} className="h-9 px-4 text-[10px] font-bold uppercase">
                  {validating ? <RefreshCw className="size-3 animate-spin" /> : "Verify"}
                </Button>
              </div>
              {validationResult && (
                <div className={cn("text-[9px] font-bold uppercase tracking-widest flex items-center gap-1", validationResult === 'success' ? "text-emerald-500" : "text-destructive")}>
                   {validationResult === 'success' ? <CheckCircle2 className="size-3" /> : <AlertCircle className="size-3" />}
                   {validationResult === 'success' ? "Token Validated" : "Validation Failed"}
                </div>
              )}
            </div>
          )}

          {!isCompatible && (
            <div className="pt-2 border-t flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">System Health Check</span>
              <div className="flex items-center gap-2">
                {testResult && (
                  <Badge variant={testResult === 'success' ? 'secondary' : 'destructive'} className="h-5 text-[8px] font-black border-none px-2 uppercase">
                    {testResult === 'success' ? 'Link OK' : 'LINK FAIL'}
                  </Badge>
                )}
                <Button variant="ghost" size="sm" onClick={handleTest} disabled={testing} className="h-8 text-[10px] font-bold uppercase">
                  {testing ? <RefreshCw className="size-3 animate-spin" /> : <Activity className="size-3 mr-1" />} Test
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" className="font-bold text-[10px] uppercase tracking-widest" onClick={onClose}>Cancel</Button>
          <Button className="font-bold text-[10px] uppercase tracking-widest px-8" onClick={handleSubmit} disabled={saving}>
            {saving ? <RefreshCw className="size-3 mr-2 animate-spin" /> : <Save className="size-3 mr-2" />} Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

EditConnectionModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  connection: PropTypes.object,
  proxyPools: PropTypes.array,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};
