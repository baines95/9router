"use client";

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { 
  Lock, 
  Key, 
  CaretUp, 
  CaretDown, 
  Pencil, 
  Trash, 
  Globe, 
  CircleNotch,
  Nodes
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { translate } from "@/i18n/runtime";
import CooldownTimer from "./CooldownTimer";

function StatusBadge({ variant, children }) {
  if (variant === "success") {
    return (
      <Badge className="border-primary/20 bg-primary/10 text-primary dark:text-primary px-1.5 py-0 h-4">
        {children}
      </Badge>
    );
  }
  if (variant === "error") {
    return <Badge variant="destructive" className="px-1.5 py-0 h-4">{children}</Badge>;
  }
  return <Badge variant="secondary" className="px-1.5 py-0 h-4">{children}</Badge>;
}

export default function ConnectionRow({
  connection,
  proxyPools,
  isOAuth,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onToggleActive,
  onUpdateProxy,
  onEdit,
  onDelete,
}) {
  const [updatingProxy, setUpdatingProxy] = useState(false);

  const proxyPoolMap = new Map((proxyPools || []).map((pool) => [pool.id, pool]));
  const boundProxyPoolId = connection.providerSpecificData?.proxyPoolId || null;
  const boundProxyPool = boundProxyPoolId
    ? proxyPoolMap.get(boundProxyPoolId)
    : null;
  const hasLegacyProxy =
    connection.providerSpecificData?.connectionProxyEnabled === true &&
    !!connection.providerSpecificData?.connectionProxyUrl;
  const hasAnyProxy = !!boundProxyPoolId || hasLegacyProxy;
  const proxyDisplayText = boundProxyPool
    ? `Pool: ${boundProxyPool.name}`
    : boundProxyPoolId
    ? `Pool: ${boundProxyPoolId} (inactive/missing)`
    : hasLegacyProxy
    ? `Legacy: ${connection.providerSpecificData?.connectionProxyUrl}`
    : "";

  let maskedProxyUrl = "";
  if (boundProxyPool?.proxyUrl || connection.providerSpecificData?.connectionProxyUrl) {
    const rawProxyUrl =
      boundProxyPool?.proxyUrl ||
      connection.providerSpecificData?.connectionProxyUrl;
    try {
      const parsed = new URL(rawProxyUrl);
      maskedProxyUrl = `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}`;
    } catch {
      maskedProxyUrl = rawProxyUrl;
    }
  }

  const noProxyText =
    boundProxyPool?.noProxy || connection.providerSpecificData?.connectionNoProxy || "";

  let proxyBadgeVariant = "default";
  if (boundProxyPool?.isActive === true) {
    proxyBadgeVariant = "success";
  } else if (boundProxyPoolId || hasLegacyProxy) {
    proxyBadgeVariant = "error";
  }

  const handleSelectProxy = async (poolId) => {
    setUpdatingProxy(true);
    try {
      await onUpdateProxy(poolId === "__none__" ? null : poolId);
    } finally {
      setUpdatingProxy(false);
    }
  };

  const displayName = isOAuth
    ? connection.name ||
      connection.email ||
      connection.displayName ||
      "OAuth Account"
    : connection.name;

  const [isCooldown, setIsCooldown] = useState(false);

  const modelLockUntil =
    Object.entries(connection)
      .filter(([k]) => k.startsWith("modelLock_"))
      .map(([, v]) => v)
      .filter(Boolean)
      .sort()[0] || null;

  useEffect(() => {
    const checkCooldown = () => {
      const until =
        Object.entries(connection)
          .filter(([k]) => k.startsWith("modelLock_"))
          .map(([, v]) => v)
          .filter((v) => v && new Date(v).getTime() > Date.now())
          .sort()[0] || null;
      setIsCooldown(!!until);
    };

    checkCooldown();
    const interval = modelLockUntil ? setInterval(checkCooldown, 1000) : null;
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [connection, modelLockUntil]);

  const effectiveStatus =
    connection.testStatus === "unavailable" && !isCooldown
      ? "active"
      : connection.testStatus;

  const getStatusVariant = () => {
    if (connection.isActive === false) return "default";
    if (effectiveStatus === "active" || effectiveStatus === "success")
      return "success";
    if (
      effectiveStatus === "error" ||
      effectiveStatus === "expired" ||
      effectiveStatus === "unavailable"
    )
      return "error";
    return "default";
  };

  const sv = getStatusVariant();

  return (
    <div
      className={cn(
        "group flex items-center justify-between rounded-lg p-1.5 transition-colors",
        "hover:bg-muted/30",
        connection.isActive === false && "opacity-60",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="flex flex-col">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className={cn(
              "rounded p-0.5",
              isFirst
                ? "cursor-not-allowed text-muted-foreground/30"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <CaretUp className="size-3" weight="bold" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            className={cn(
              "rounded p-0.5",
              isLast
                ? "cursor-not-allowed text-muted-foreground/30"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <CaretDown className="size-3" weight="bold" />
          </button>
        </div>
        <div className="size-7 rounded-lg bg-muted/20 flex items-center justify-center shrink-0">
          {isOAuth ? (
            <Lock className="size-3.5 text-muted-foreground" weight="bold" />
          ) : (
            <Key className="size-3.5 text-muted-foreground" weight="bold" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{displayName}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <StatusBadge variant={sv}>
              <span className="text-[9px] font-semibold tracking-tight">
                {connection.isActive === false
                  ? translate("Disabled")
                  : translate(effectiveStatus || "Unknown")}
              </span>
            </StatusBadge>
            {hasAnyProxy && (
              <StatusBadge variant={proxyBadgeVariant}>
                <span className="text-[9px] font-semibold tracking-tight">Proxy</span>
              </StatusBadge>
            )}
            {isCooldown && connection.isActive !== false && (
              <CooldownTimer until={modelLockUntil} />
            )}
            {connection.lastError && connection.isActive !== false && (
              <span
                className="max-w-[200px] truncate text-[10px] text-destructive"
                title={connection.lastError}
              >
                {connection.lastError}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground font-medium tabular-nums opacity-50">
              #{connection.priority}
            </span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="flex items-center gap-1">
          {(proxyPools || []).length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 flex-col gap-0 px-2 py-1 text-muted-foreground hover:text-foreground",
                    hasAnyProxy && "text-primary"
                  )}
                  disabled={updatingProxy}
                >
                  {updatingProxy ? (
                    <CircleNotch className="size-3.5 animate-spin" weight="bold" />
                  ) : (
                    <Nodes className="size-3.5" weight="bold" />
                  )}
                  <span className="text-[8px] font-semibold tracking-tighter uppercase">{translate("Proxy")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px]">
                <DropdownMenuItem
                  onClick={() => handleSelectProxy("__none__")}
                  className={!boundProxyPoolId ? "font-medium text-primary" : undefined}
                >
                  None
                </DropdownMenuItem>
                {(proxyPools || []).map((pool) => (
                  <DropdownMenuItem
                    key={pool.id}
                    onClick={() => handleSelectProxy(pool.id)}
                    className={boundProxyPoolId === pool.id ? "font-medium text-primary" : undefined}
                  >
                    {pool.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 flex-col gap-0 px-2 py-1 text-muted-foreground hover:text-foreground"
            onClick={onEdit}
          >
            <Pencil className="size-3.5" weight="bold" />
            <span className="text-[8px] font-semibold tracking-tighter uppercase">{translate("Edit")}</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 flex-col gap-0 px-2 py-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onDelete}
          >
            <Trash className="size-3.5" weight="bold" />
            <span className="text-[8px] font-semibold tracking-tighter uppercase">{translate("Delete")}</span>
          </Button>
        </div>

        <Switch
          checked={connection.isActive ?? true}
          onCheckedChange={onToggleActive}
          className="scale-[0.65] origin-right"
          title={(connection.isActive ?? true) ? translate("Disable") : translate("Enable")}
        />
      </div>
    </div>
  );
}

ConnectionRow.propTypes = {
  connection: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    email: PropTypes.string,
    displayName: PropTypes.string,
    modelLockUntil: PropTypes.string,
    testStatus: PropTypes.string,
    isActive: PropTypes.bool,
    lastError: PropTypes.string,
    priority: PropTypes.number,
    globalPriority: PropTypes.number,
  }).isRequired,
  proxyPools: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      proxyUrl: PropTypes.string,
      noProxy: PropTypes.string,
      isActive: PropTypes.bool,
    })
  ),
  isOAuth: PropTypes.bool.isRequired,
  isFirst: PropTypes.bool.isRequired,
  isLast: PropTypes.bool.isRequired,
  onMoveUp: PropTypes.func.isRequired,
  onMoveDown: PropTypes.func.isRequired,
  onToggleActive: PropTypes.func.isRequired,
  onUpdateProxy: PropTypes.func,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};
