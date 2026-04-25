import { ShieldIcon } from "@phosphor-icons/react";
import { CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { translate } from "@/i18n/runtime";
import { Button, Card, CardDescription, CardHeader, CardTitle, Input, Toggle } from "@/shared/components";
import type { Settings } from "./types";

interface Props {
  settings: Settings;
  passwords: { current: string; new: string; confirm: string };
  setPasswords: (value: { current: string; new: string; confirm: string }) => void;
  passLoading: boolean;
  onRequireLoginChange: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function SecuritySection({ settings, passwords, setPasswords, passLoading, onRequireLoginChange, onSubmit }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ShieldIcon className="size-4" weight="bold" />
          {translate("Security")}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">{translate("Control dashboard authentication and password.")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">{translate("Require login")}</p>
            <p className="text-xs text-muted-foreground">{translate("When ON, dashboard requires password. When OFF, access without login.")}</p>
          </div>
          <Toggle checked={settings.requireLogin === true} onCheckedChange={onRequireLoginChange} className="scale-90" />
        </div>

        {settings.requireLogin === true && (
          <form onSubmit={onSubmit} className="space-y-4 border-t pt-4">
            {settings.hasPassword && (
              <div className="space-y-2">
                <Label htmlFor="current-password">{translate("Current Password")}</Label>
                <Input id="current-password" type="password" placeholder={translate("Enter current password")} value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} required />
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-password">{translate("New Password")}</Label>
                <Input id="new-password" type="password" placeholder={translate("Enter new password")} value={passwords.new} onChange={(e) => setPasswords({ ...passwords, new: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">{translate("Confirm New Password")}</Label>
                <Input id="confirm-password" type="password" placeholder={translate("Confirm new password")} value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} required />
              </div>
            </div>

            <div className="flex justify-start">
              <Button type="submit" disabled={passLoading} className="h-8 text-xs w-full sm:w-auto">
                {passLoading ? translate("Updating...") : settings.hasPassword ? translate("Update Password") : translate("Set Password")}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
