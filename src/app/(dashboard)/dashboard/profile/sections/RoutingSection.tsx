import { SignpostIcon } from "@phosphor-icons/react";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { translate } from "@/i18n/runtime";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Toggle } from "@/shared/components";
import type { Settings } from "./types";
interface Props {
  settings: Settings;
  onFallbackToggle: () => void;
  onStickyChange: (value: string) => void;
  onComboToggle: () => void;
}

export function RoutingSection({ settings, onFallbackToggle, onStickyChange, onComboToggle }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <SignpostIcon className="size-4" weight="bold" />
          {translate("Routing")}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">{translate("Control fallback and provider distribution strategy.")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">{translate("Round Robin")}</p>
            <p className="text-xs text-muted-foreground">{translate("Cycle through accounts to distribute load.")}</p>
          </div>
          <Toggle checked={settings.fallbackStrategy === "round-robin"} onCheckedChange={onFallbackToggle} className="scale-90" />
        </div>

        {settings.fallbackStrategy === "round-robin" && (
          <>
            <Separator />
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="sticky-limit">{translate("Sticky Limit")}</Label>
              </div>
              <Input
                id="sticky-limit"
                type="number"
                min="1"
                max="10"
                value={settings.stickyRoundRobinLimit || 3}
                onChange={(e) => onStickyChange(e.target.value)}
                className="w-24 text-center"
              />
            </div>
          </>
        )}

        <Separator />

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">{translate("Combo Round Robin")}</p>
          </div>
          <Toggle checked={settings.comboStrategy === "round-robin"} onCheckedChange={onComboToggle} className="scale-90" />
        </div>

      </CardContent>
    </Card>
  );
}
