"use client";

import { useState, useEffect, useRef } from "react";
import { Desktop, Trash } from "@phosphor-icons/react";
import { Card, Button } from "@/shared/components";
import { CONSOLE_LOG_CONFIG } from "@/shared/constants/config";

const LOG_LEVEL_COLORS = {
  LOG: "text-primary",
  INFO: "text-primary",
  WARN: "text-muted-foreground",
  ERROR: "text-destructive",
  DEBUG: "text-primary",
};

function colorLine(line) {
  const match = line.match(/\[(\w+)\]/g);
  const levelTag = match ? match[0]?.replace(/[\[\]]/g, "") : null;
  const color = LOG_LEVEL_COLORS[levelTag] || "text-primary";
  return <span className={color}>{line}</span>;
}

export default function ConsoleLogClient() {
  const [logs, setLogs] = useState([]);
  const [connected, setConnected] = useState(false);
  const logRef = useRef(null);

  const handleClear = async () => {
    try {
      await fetch("/api/translator/console-logs", { method: "DELETE" });
    } catch (err) {
      console.error("Failed to clear console logs:", err);
    }
  };

  useEffect(() => {
    const es = new EventSource("/api/translator/console-logs/stream");
    es.onopen = () => setConnected(true);
    es.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "init") {
        setLogs(msg.logs.slice(-CONSOLE_LOG_CONFIG.maxLines));
      } else if (msg.type === "line") {
        setLogs((prev) => {
          const next = [...prev, msg.line];
          return next.length > CONSOLE_LOG_CONFIG.maxLines ? next.slice(-CONSOLE_LOG_CONFIG.maxLines) : next;
        });
      } else if (msg.type === "clear") {
        setLogs([]);
      }
    };
    es.onerror = () => setConnected(false);
    return () => es.close();
  }, []);

  useEffect(() => {
    if (!logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  return (
    <div className="mx-auto max-w-7xl flex flex-col gap-6 py-6 px-4">
      {/* Page Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/50">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground font-medium text-xs uppercase tracking-tight">
            <Desktop className="size-4" weight="bold"/>
            Hệ thống
          </div>
          <h1 className="text-3xl font-medium tracking-tight">Console Log</h1>
          <p className="text-sm text-muted-foreground font-medium">
            Live server console output
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleClear} className="h-8 text-xs font-semibold uppercase tracking-tight px-3">
            <Trash className="size-3.5 mr-2" weight="bold"/>
            Clear Log
          </Button>
        </div>
      </header>

      <Card className="border-border/50 overflow-hidden bg-black shadow-none">
        <div
          ref={logRef}
          className="p-4 text-xs font-mono h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar"
        >
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full opacity-20 gap-2">
              <Desktop className="size-12" />
              <span className="text-xs font-medium uppercase tracking-tight">Chưa có log console nào.</span>
            </div>
          ) : (
            <div className="space-y-0.5">
              {logs.map((line, i) => (
                <div key={i} className="whitespace-pre-wrap break-all">{colorLine(line)}</div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
