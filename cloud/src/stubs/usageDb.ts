import type { UsageDb } from "../types";

// Stub for cloud worker - no-op async functions
export async function saveRequestUsage(): Promise<void> {}

export function trackPendingRequest(): void {}

export async function appendRequestLog(): Promise<void> {}

export async function getUsageDb(): Promise<UsageDb> {
  return { data: { history: [] } };
}

export async function getUsageHistory(): Promise<unknown[]> {
  return [];
}

export async function getUsageStats(): Promise<Record<string, never>> {
  return {};
}

export async function getRecentLogs(): Promise<unknown[]> {
  return [];
}
