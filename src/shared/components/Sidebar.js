"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  BarChart3, 
  ChevronRight, 
  Database, 
  Globe, 
  Layers, 
  Monitor, 
  Power, 
  Search, 
  Settings, 
  ShieldCheck, 
  Terminal, 
  Zap,
  Command,
  Box,
  LayoutDashboard,
  AlertTriangle
} from "lucide-react";

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
  SidebarGroupContent,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { APP_CONFIG } from "@/shared/constants/config";
import { MEDIA_PROVIDER_KINDS } from "@/shared/constants/providers";
import { Button } from "@/components/ui/button";

const VISIBLE_MEDIA_KINDS = ["embedding", "tts"];

export default function AppSidebar({ ...props }) {
  const pathname = usePathname();
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
    user: { name: "Admin", email: "admin@8router.ai", avatar: "/favicon.svg" },
    teams: [{ name: "8Router Proxy", logo: Command, plan: `v${APP_CONFIG.version}` }],
    navMain: [
      { title: "Dịch vụ chính", items: [{ title: "Endpoint", url: "/dashboard/endpoint", icon: Zap, badge: "API" }, { title: "Nhà cung cấp", url: "/dashboard/providers", icon: Database }, { title: "Kết hợp", url: "/dashboard/combos", icon: Layers }] },
      { title: "Giám sát", items: [{ title: "Thống kê", url: "/dashboard/usage", icon: BarChart3 }, { title: "Quota", url: "/dashboard/quota", icon: Search }] },
      { title: "Phát triển", items: [{ title: "MITM Proxy", url: "/dashboard/mitm", icon: ShieldCheck }, { title: "Công cụ", url: "/dashboard/cli-tools", icon: Terminal }] },
    ],
    system: [{ title: "Proxy Pools", url: "/dashboard/proxy-pools", icon: Globe }, { title: "Nhật ký Console", url: "/dashboard/console-log", icon: Monitor }, ...(enableTranslator ? [{ title: "Translator", url: "/dashboard/translator", icon: Globe }] : [])]
  }), [enableTranslator]);

  return (
    <>
      <Sidebar collapsible="icon" {...props} className="border-r">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              {(() => {
                const TeamLogo = navData.teams[0].logo;
                return (
                  <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground" render={<Link href="/dashboard" />}>
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <TeamLogo className="size-4" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
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
                      <item.icon />
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
                    <Box />
                    <span>Media Providers</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
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
                    <item.icon />
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
              <SidebarMenuButton isActive={isActive("/dashboard/profile")} tooltip="Settings" render={<Link href="/dashboard/profile" />}>
                <Settings />
                <span>Cài đặt</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setShowShutdownModal(true)} className="text-destructive hover:bg-destructive/10 hover:text-destructive" tooltip="Shutdown">
                <Power />
                <span>Shutdown Server</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <Dialog open={showShutdownModal} onOpenChange={setShowShutdownModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
             <div className="size-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-2">
                <AlertTriangle className="size-5" />
             </div>
            <DialogTitle>Critical Shutdown</DialogTitle>
            <DialogDescription>Stop the 8Router proxy core. This will disconnect all active upstream sessions.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="ghost" className="font-bold text-[10px] uppercase tracking-widest" onClick={() => setShowShutdownModal(false)}>Cancel Operation</Button>
            <Button variant="destructive" className="font-bold text-[10px] uppercase tracking-widest px-8" onClick={handleShutdown} disabled={isShuttingDown}>
               {isShuttingDown ? "Terminating..." : "Confirm Shutdown"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isDisconnected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-card p-6 rounded-2xl border border-border shadow-2xl text-center max-w-sm mx-4 animate-in zoom-in-95 duration-300">
            <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-4">
              <Power className="size-6" />
            </div>
            <h2 className="text-lg font-bold mb-2">9Router Offline</h2>
            <p className="text-sm text-muted-foreground mb-6">The infrastructure node has been successfully de-provisioned.</p>
            <Button className="w-full font-bold text-[10px] uppercase tracking-widest h-10" onClick={() => globalThis.location.reload()}>
              Reconnect Gateway
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
