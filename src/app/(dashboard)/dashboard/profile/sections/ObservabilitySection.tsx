import { PulseIcon } from "@phosphor-icons/react";
import { translate } from "@/i18n/runtime";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Toggle } from "@/shared/components";

interface Props {
  enabled: boolean;
  onChange: (value: boolean) => void;
}

export function ObservabilitySection({ enabled, onChange }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <PulseIcon className="size-4" weight="bold" />
          {translate("Observability")}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">{translate("Control request logging visibility in the dashboard logs view.")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">{translate("Enable Observability")}</p>
            <p className="text-xs text-muted-foreground">{translate("Record request details for inspection in logs.")}</p>
          </div>
          <Toggle checked={enabled} onCheckedChange={onChange} className="scale-90" />
        </div>
      </CardContent>
    </Card>
  );
}
