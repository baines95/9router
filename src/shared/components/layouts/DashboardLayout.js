"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useNotificationStore } from "@/store/notificationStore";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import Sidebar from "../Sidebar";
import Header from "../Header";

// ... (getToastStyle remains same)

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const notifications = useNotificationStore((state) => state.notifications);
  const removeNotification = useNotificationStore((state) => state.removeNotification);

  return (
    <SidebarProvider defaultOpen={true}>
      <TooltipProvider delayDuration={0}>
        <div className="flex h-screen w-full overflow-hidden bg-bg">
          {/* Notifications ... */}
          <div className="fixed top-4 right-4 z-[80] flex w-[min(92vw,380px)] flex-col gap-2">
            {notifications.map((n) => {
              const style = getToastStyle(n.type);
              return (
                <div
                  key={n.id}
                  className={`rounded-lg border px-3 py-2 shadow-lg backdrop-blur-sm ${style.wrapper}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px] leading-5">{style.icon}</span>
                    <div className="min-w-0 flex-1">
                      {n.title ? <p className="text-xs font-semibold mb-0.5">{n.title}</p> : null}
                      <p className="text-xs whitespace-pre-wrap break-words">{n.message}</p>
                    </div>
                    {n.dismissible ? (
                      <button
                        type="button"
                        onClick={() => removeNotification(n.id)}
                        className="text-current/70 hover:text-current"
                        aria-label="Dismiss notification"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          <Sidebar />

          <SidebarInset className="flex flex-col flex-1 h-full min-w-0 overflow-hidden transition-all duration-300">
            <Header key={pathname} />
            <div className={`flex-1 overflow-y-auto custom-scrollbar ${pathname === "/dashboard/basic-chat" ? "" : "p-4 lg:p-6"} ${pathname === "/dashboard/basic-chat" ? "flex flex-col overflow-hidden" : ""}`}>
              <div className={`${pathname === "/dashboard/basic-chat" ? "flex-1 w-full h-full flex flex-col" : "max-w-7xl mx-auto"}`}>
                {children}
              </div>
            </div>
          </SidebarInset>
        </div>
      </TooltipProvider>
    </SidebarProvider>
  );
}
