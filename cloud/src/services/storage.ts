import * as log from "../utils/logger.js";
import type { Env, MachineData, MachineProviderRecord } from "../types";

interface MachineDataRow {
  data: string;
}

interface CacheEntry {
  data: MachineData;
  timestamp: number;
}

// Request-scoped cache for getMachineData (avoids multiple D1 queries per request)
const requestCache: Map<string, CacheEntry> = new Map();
const CACHE_TTL_MS = 5000;

/**
 * Get machine data from D1 (with request-scope caching)
 */
export async function getMachineData(machineId: string, env: Env): Promise<MachineData | null> {
  const cached = requestCache.get(machineId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const row = await env.DB.prepare("SELECT data FROM machines WHERE machineId = ?")
    .bind(machineId)
    .first<MachineDataRow>();
  
  if (!row) {
    log.debug("STORAGE", `Not found: ${machineId}`);
    return null;
  }
  
  const data = JSON.parse(row.data) as MachineData;
  requestCache.set(machineId, { data, timestamp: Date.now() });
  log.debug("STORAGE", `Retrieved: ${machineId}`);
  return data;
}

/**
 * Save machine data to D1
 */
export async function saveMachineData(machineId: string, data: MachineData, env: Env): Promise<void> {
  const now = new Date().toISOString();
  data.updatedAt = now;
  
  // Upsert to D1
  await env.DB.prepare(`
    INSERT INTO machines (machineId, data, updatedAt) 
    VALUES (?, ?, ?)
    ON CONFLICT(machineId) DO UPDATE SET data = ?, updatedAt = ?
  `)
    .bind(machineId, JSON.stringify(data), now, JSON.stringify(data), now)
    .run();
  
  // Update cache after save
  requestCache.set(machineId, { data, timestamp: Date.now() });
  log.debug("STORAGE", `Saved: ${machineId}`);
}

/**
 * Delete machine data from D1
 */
export async function deleteMachineData(machineId: string, env: Env): Promise<void> {
  await env.DB.prepare("DELETE FROM machines WHERE machineId = ?")
    .bind(machineId)
    .run();
  
  // Clear cache after delete
  requestCache.delete(machineId);
  log.debug("STORAGE", `Deleted: ${machineId}`);
}

/**
 * Update specific fields in machine data (for token refresh, rate limit, etc.)
 */
export async function updateMachineProvider(
  machineId: string,
  connectionId: string,
  updates: Partial<MachineProviderRecord>,
  env: Env
): Promise<void> {
  const data = await getMachineData(machineId, env);
  if (!data?.providers?.[connectionId]) return;
  
  Object.assign(data.providers[connectionId], updates);
  data.providers[connectionId].updatedAt = new Date().toISOString();
  
  await saveMachineData(machineId, data, env);
}