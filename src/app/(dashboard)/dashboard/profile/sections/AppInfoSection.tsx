import { InfoIcon } from "@phosphor-icons/react";
import { translate } from "@/i18n/runtime";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components";
import { APP_CONFIG } from "@/shared/constants/config";

export function AppInfoSection() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <InfoIcon className="size-4" weight="bold" />
          {translate("About")}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">{translate("Application metadata and runtime mode.")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1 text-xs text-muted-foreground">
        <p>{APP_CONFIG.name} v{APP_CONFIG.version}</p>
        <p>{translate("Local Mode - All data stored on your machine")}</p>
      </CardContent>
    </Card>
  );
}
