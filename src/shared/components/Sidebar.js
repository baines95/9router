"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  ChartBar, 
  CaretRight, 
  Database, 
  Globe, 
  Stack, 
  Desktop, 
  Power, 
  MagnifyingGlass, 
  Gear, 
  ShieldCheck, 
  Terminal, 
  Lightning,
  Command,
  Warning,
  DotsThree,
  Headphones
} from "@phosphor-icons/react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuBadge,
  SidebarRail,
  useSidebar
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { APP_CONFIG } from "@/shared/constants/config";
import { MEDIA_PROVIDER_KINDS } from "@/shared/constants/providers";
import { Button } from "@/components/ui/button";

const VISIBLE_MEDIA_KINDS = ["embedding", "tts"];

export default function AppSidebar({ ...props }) {
  const pathname = usePathname();
  const { isMobile } = useSidebar();
  const [showShutdownModal, setShowShutdownModal] = React.useState(false);
  const [isShuttingDown, setIsShuttingDown] = React.useState(false);
  const [isDisconnected, setIsDisconnected] = React.useState(false);
  const [enableTranslator, setEnableTranslator] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => { if (data.enableTranslator) setEnableTranslator(true); })
      .catch(() => {});
  }, []);

  const handleShutdown = async () => {
    setIsShuttingDown(true);
    try {
      await fetch("/api/shutdown", { method: "POST" });
    } catch (e) {}
    setIsShuttingDown(false);
    setShowShutdownModal(false);
    setIsDisconnected(true);
  };

  const isActive = (url) => {
    if (url === "/dashboard/endpoint") {
      return pathname === "/dashboard" || pathname.startsWith("/dashboard/endpoint");
    }
    return pathname.startsWith(url);
  };

  const navData = React.useMemo(() => ({
    user: { name: "System Admin", email: "admin@8router.ai", avatar: "/favicon.svg" },
    teams: [{ name: "8Router Proxy", logo: Command, plan: `v${APP_CONFIG.version}` }],
    navMain: [
      { title: "Dịch vụ chính", items: [{ title: "Endpoint", url: "/dashboard/endpoint", icon: Lightning, badge: "API" }, { title: "Nhà cung cấp", url: "/dashboard/providers", icon: Database }, { title: "Kết hợp", url: "/dashboard/combos", icon: Stack }] },
      { title: "Giám sát", items: [{ title: "Thống kê", url: "/dashboard/usage", icon: ChartBar }, { title: "Quota", url: "/dashboard/quota", icon: MagnifyingGlass }] },
      { title: "Phát triển", items: [{ title: "MITM Proxy", url: "/dashboard/mitm", icon: ShieldCheck }, { title: "Công cụ", url: "/dashboard/cli-tools", icon: Terminal }] },
    ],
    system: [{ title: "Proxy Pools", url: "/dashboard/proxy-pools", icon: Globe }, { title: "Nhật ký Console", url: "/dashboard/console-log", icon: Desktop }, ...(enableTranslator ? [{ title: "Translator", url: "/dashboard/translator", icon: Globe }] : [])]
  }), [enableTranslator]);

  return (
    <>
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              {(() => {
                const TeamLogo = navData.teams[0].logo;
                return (
                  <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                      <TeamLogo className="size-4" weight="bold" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight ml-1">
                      <span className="truncate font-semibold">{navData.teams[0].name}</span>
                      <span className="truncate text-xs">{navData.teams[0].plan}</span>
                    </div>
                  </SidebarMenuButton>
                );
              })()}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          {navData.navMain.map((group) => (
            <SidebarGroup key={group.title}>
              <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton isActive={isActive(item.url)} tooltip={item.title} render={<Link href={item.url} />}>
                      <item.icon data-icon="inline-start" weight={isActive(item.url) ? "fill" : "regular"} />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                    {item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ))}

          <SidebarGroup>
            <SidebarGroupLabel>Hệ thống</SidebarGroupLabel>
            <SidebarMenu>
              <Collapsible defaultOpen={pathname.includes("media-providers")} className="group/collapsible">
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Media Providers" render={<CollapsibleTrigger />}>
                    <Headphones data-icon="inline-start" />
                    <span>Media Providers</span>
                    <CaretRight data-icon="inline-end" className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {MEDIA_PROVIDER_KINDS.filter((k) => VISIBLE_MEDIA_KINDS.includes(k.id)).map((kind) => (
                        <SidebarMenuSubItem key={kind.id}>
                          <SidebarMenuSubButton isActive={pathname.includes(kind.id)} render={<Link href={`/dashboard/media-providers/${kind.id}`} />}>
                            <span>{kind.label}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {navData.system.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton isActive={isActive(item.url)} tooltip={item.title} render={<Link href={item.url} />}>
                    <item.icon data-icon="inline-start" weight={isActive(item.url) ? "fill" : "regular"} />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger render={
                  <SidebarMenuButton size="lg">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={navData.user.avatar} alt={navData.user.name} />
                      <AvatarFallback className="rounded-lg">SA</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight ml-1">
                      <span className="truncate font-semibold">{navData.user.name}</span>
                      <span className="truncate text-xs">{navData.user.email}</span>
                    </div>
                    <DotsThree data-icon="inline-end" className="ml-auto" />
                  </SidebarMenuButton>
                } />
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side={isMobile ? "bottom" : "right"}
                  align="end"
                  sideOffset={4}
                >
                  <div className="flex items-center gap-2 px-2 py-2">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={navData.user.avatar} alt={navData.user.name} />
                      <AvatarFallback className="rounded-lg">SA</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{navData.user.name}</span>
                      <span className="truncate text-xs text-muted-foreground">{navData.user.email}</span>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem render={
                      <Link href="/dashboard/profile" className="flex items-center">
                        <Gear data-icon="inline-start" />
                        <span>Cài đặt hệ thống</span>
                      </Link>
                    } />
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowShutdownModal(true)} className="text-destructive focus:text-destructive">
                    <Power data-icon="inline-start" />
                    <span>Shutdown Server</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <Dialog open={showShutdownModal} onOpenChange={setShowShutdownModal}>
        <DialogContent>
          <DialogTitle>Critical Shutdown</DialogTitle>
          <DialogDescription>
            Stop the 8Router proxy core. This will immediately disconnect all active upstream sessions.
          </DialogDescription>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => setShowShutdownModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleShutdown} disabled={isShuttingDown}>
               {isShuttingDown ? (
                 <>
                   <Desktop data-icon="inline-start" className="animate-spin" />
                   Terminating...
                 </>
               ) : (
                 "Confirm Shutdown"
               )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {isDisconnected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card p-6 rounded-lg border text-center max-w-sm mx-4">
            <Power className="size-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">8Router Offline</h2>
            <p className="text-sm text-muted-foreground mb-6">The infrastructure node has been successfully de-provisioned and halted.</p>
            <Button className="w-full" onClick={() => globalThis.location.reload()}>
              Reconnect Gateway
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
