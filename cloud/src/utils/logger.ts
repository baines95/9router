// Logger utility for worker

export type LogPayload = string | Record<string, unknown> | undefined;

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const LEVEL = LOG_LEVELS.INFO;

// ANSI color codes
const COLORS = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m"
};

function formatTime() {
  return new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });
}

function formatInline(data: LogPayload): string {
  if (!data) return "";
  if (typeof data === "string") return data;
  try {
    return Object.entries(data).map(([k, v]) => `${k}=${v}`).join(" | ");
  } catch {
    return String(data);
  }
}

export function debug(tag: string, message: string, data?: LogPayload): void {
  if (LEVEL <= LOG_LEVELS.DEBUG) {
    const extra = data ? ` | ${formatInline(data)}` : "";
    console.log(`[${formatTime()}] 🔍 [${tag}] ${message}${extra}`);
  }
}

export function info(tag: string, message: string, data?: LogPayload): void {
  if (LEVEL <= LOG_LEVELS.INFO) {
    const extra = data ? ` | ${formatInline(data)}` : "";
    console.log(`[${formatTime()}] ℹ️  [${tag}] ${message}${extra}`);
  }
}

export function warn(tag: string, message: string, data?: LogPayload): void {
  if (LEVEL <= LOG_LEVELS.WARN) {
    const extra = data ? ` | ${formatInline(data)}` : "";
    console.warn(`${COLORS.yellow}[${formatTime()}] ⚠️  [${tag}] ${message}${extra}${COLORS.reset}`);
  }
}

export function error(tag: string, message: string, data?: LogPayload): void {
  if (LEVEL <= LOG_LEVELS.ERROR) {
    const extra = data ? ` | ${formatInline(data)}` : "";
    console.error(`${COLORS.red}[${formatTime()}] ❌ [${tag}] ${message}${extra}${COLORS.reset}`);
  }
}

export function request(method: string, path: string, extra?: LogPayload): void {
  const data = extra ? ` | ${formatInline(extra)}` : "";
  console.log(`[${formatTime()}] 📥 ${method} ${path}${data}`);
}

export function response(status: number, duration: number, extra?: LogPayload): void {
  const icon = status < 400 ? "📤" : "💥";
  const data = extra ? ` | ${formatInline(extra)}` : "";
  console.log(`[${formatTime()}] ${icon} ${status} (${duration}ms)${data}`);
}

export function stream(event: string, data?: LogPayload): void {
  const extra = data ? ` | ${formatInline(data)}` : "";
  console.log(`[${formatTime()}] 🌊 [STREAM] ${event}${extra}`);
}

// Mask sensitive data
export function maskKey(key?: string): string {
  if (!key || key.length < 8) return "***";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}
