import { WifiHighIcon } from "@phosphor-icons/react";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { translate } from "@/i18n/runtime";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Toggle } from "@/shared/components";
import type { Settings } from "./types";
interface Props {
  settings: Settings;
  proxyForm: { outboundProxyEnabled: boolean; outboundProxyUrl: string; outboundNoProxy: string };
  setProxyForm: (value: { outboundProxyEnabled: boolean; outboundProxyUrl: string; outboundNoProxy: string } | ((prev: { outboundProxyEnabled: boolean; outboundProxyUrl: string; outboundNoProxy: string }) => { outboundProxyEnabled: boolean; outboundProxyUrl: string; outboundNoProxy: string })) => void;
  proxyLoading: boolean;
  proxyTestLoading: boolean;
  onToggleProxy: () => void;
  onSubmitProxy: (e: React.FormEvent) => void;
  onTestProxy: () => void;
}

export function NetworkSection({ settings, proxyForm, setProxyForm, proxyLoading, proxyTestLoading, onToggleProxy, onSubmitProxy, onTestProxy }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <WifiHighIcon className="size-4" weight="bold" />
          {translate("Network")}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">{translate("Configure outbound proxy for provider requests.")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">{translate("Outbound Proxy")}</p>
            <p className="text-xs text-muted-foreground">{translate("Enable proxy for OAuth and provider outbound requests.")}</p>
          </div>
          <Toggle checked={settings.outboundProxyEnabled === true} onCheckedChange={onToggleProxy} className="scale-90" />
        </div>

        {settings.outboundProxyEnabled === true && (
          <form onSubmit={onSubmitProxy} className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="proxy-url">{translate("Proxy URL")}</Label>
              <Input
                id="proxy-url"
                placeholder="http://127.0.0.1:7897"
                value={proxyForm.outboundProxyUrl}
                onChange={(e) => setProxyForm((prev) => ({ ...prev, outboundProxyUrl: e.target.value }))}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="no-proxy">{translate("No Proxy")}</Label>
              <Input
                id="no-proxy"
                placeholder="localhost,127.0.0.1"
                value={proxyForm.outboundNoProxy}
                onChange={(e) => setProxyForm((prev) => ({ ...prev, outboundNoProxy: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="secondary" disabled={proxyTestLoading} onClick={onTestProxy} className="h-8 text-xs w-full sm:w-auto">
                {proxyTestLoading ? translate("Testing...") : translate("Test proxy URL")}
              </Button>
              <Button type="submit" disabled={proxyLoading} className="h-8 text-xs w-full sm:w-auto">
                {proxyLoading ? translate("Applying...") : translate("Apply")}
              </Button>
            </div>
          </form>
        )}

      </CardContent>
    </Card>
  );
}
