import * as log from "../utils/logger.js";
import { getMachineData, saveMachineData, deleteMachineData } from "../services/storage.js";
import type {
  Env,
  ExecutionContextLike,
  MachineData,
  MachineProviderRecord,
  SyncChanges,
  SyncRequestBody
} from "../types";

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*"
};

type SyncMachineData = MachineData & {
  providers: Record<string, MachineProviderRecord>;
  modelAliases: Record<string, string>;
  combos?: unknown[];
  apiKeys: Array<{ key?: string; [key: string]: unknown }>;
};

// Removed: WORKER_FIELDS and WORKER_SPECIFIC_FIELDS
// Now syncing entire provider based on updatedAt (simpler logic)

export async function handleSync(
  request: Request,
  env: Env,
  _ctx: ExecutionContextLike
): Promise<Response> {
  const url = new URL(request.url);
  const machineId = url.pathname.split("/")[2]; // /sync/:machineId

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*"
      }
    });
  }

  if (!machineId) {
    log.warn("SYNC", "Missing machineId in path");
    return jsonResponse({ error: "Missing machineId" }, 400);
  }

  // Route by method
  switch (request.method) {
    case "GET":
      return handleGet(machineId, env);
    case "POST":
      return handlePost(request, machineId, env);
    case "DELETE":
      return handleDelete(machineId, env);
    default:
      return jsonResponse({ error: "Method not allowed" }, 405);
  }
}

/**
 * GET /sync/:machineId - Return merged data for Web to update
 */
async function handleGet(machineId: string, env: Env): Promise<Response> {
  const data = await getMachineData(machineId, env);

  if (!data) {
    log.warn("SYNC", "No data found", { machineId });
    return jsonResponse({ error: "No data found" }, 404);
  }

  log.info("SYNC", "Data retrieved", { machineId });
  return jsonResponse({
    success: true,
    data
  });
}

/**
 * POST /sync/:machineId - Merge Web data with Worker data
 * providers stored by ID (supports multiple connections per provider)
 */
async function handlePost(request: Request, machineId: string, env: Env): Promise<Response> {
  let body: SyncRequestBody;
  try {
    body = (await request.json()) as SyncRequestBody;
  } catch {
    log.warn("SYNC", "Invalid JSON body", { machineId });
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  // Validate required fields
  if (!body.providers || !Array.isArray(body.providers)) {
    log.warn("SYNC", "Missing or invalid providers array", { machineId });
    return jsonResponse({ error: "Missing providers array" }, 400);
  }

  const existingData = ((await getMachineData(machineId, env)) || {
    providers: {},
    modelAliases: {},
    apiKeys: []
  }) as SyncMachineData;

  // Merge providers by ID
  const mergedProviders: Record<string, MachineProviderRecord> = {};
  const changes: SyncChanges = { updated: [], fromWorker: [] };
  const incomingProviderIds = new Set<string>();

  for (const webProvider of body.providers) {
    const providerId = webProvider.id;
    if (!providerId) {
      log.warn("SYNC", "Provider missing id", { provider: webProvider.provider });
      continue;
    }

    incomingProviderIds.add(providerId);
    const workerProvider = existingData.providers[providerId];

    if (workerProvider) {
      // Merge: token fields from Worker, config fields from Web
      mergedProviders[providerId] = mergeProvider(webProvider, workerProvider, changes, providerId);
    } else {
      // New provider from Web
      mergedProviders[providerId] = formatProviderData(webProvider);
      changes.updated.push(providerId);
    }
  }

  // Preserve existing Worker providers that are not present in Web payload
  for (const [providerId, workerProvider] of Object.entries(existingData.providers)) {
    if (incomingProviderIds.has(providerId)) continue;

    mergedProviders[providerId] = formatProviderData(workerProvider);
    changes.fromWorker.push(providerId);
  }

  // Prepare final data - modelAliases, apiKeys, combos always from Web
  const finalData: SyncMachineData = {
    providers: mergedProviders,
    modelAliases: body.modelAliases || existingData.modelAliases || {},
    combos: body.combos || existingData.combos || [],
    apiKeys: body.apiKeys || existingData.apiKeys || [],
    updatedAt: new Date().toISOString()
  };

  // Store in D1 + invalidate cache
  await saveMachineData(machineId, finalData, env);

  log.info("SYNC", "Data synced successfully", {
    machineId,
    providerCount: Object.keys(mergedProviders).length,
    changes
  });

  return jsonResponse({
    success: true,
    data: finalData,
    changes
  });
}

/**
 * DELETE /sync/:machineId - Clear cache when Worker is disabled
 */
async function handleDelete(machineId: string, env: Env): Promise<Response> {
  await deleteMachineData(machineId, env);

  log.info("SYNC", "Data deleted", { machineId });
  return jsonResponse({
    success: true,
    message: "Data deleted successfully"
  });
}

/**
 * Merge provider data: compare updatedAt to decide which source to use
 * Simple logic: newer wins (sync entire provider)
 */
function mergeProvider(
  webProvider: MachineProviderRecord,
  workerProvider: MachineProviderRecord,
  changes: SyncChanges,
  providerId: string
): MachineProviderRecord {
  const webTime = new Date(webProvider.updatedAt || 0).getTime();
  const workerTime = new Date(workerProvider.updatedAt || 0).getTime();

  let merged: MachineProviderRecord;

  if (workerTime > webTime) {
    // Cloud has newer data - use entire Cloud provider
    merged = formatProviderData(workerProvider);
    changes.fromWorker.push(providerId);
  } else {
    // Server has newer data - use entire Server provider
    merged = formatProviderData(webProvider);
    changes.updated.push(providerId);
  }

  // Always update timestamp
  merged.updatedAt = new Date().toISOString();
  return merged;
}

/**
 * Format provider data for storage
 */
function formatProviderData(provider: MachineProviderRecord): MachineProviderRecord {
  return {
    id: provider.id,
    provider: provider.provider,
    authType: provider.authType,
    name: provider.name,
    displayName: provider.displayName,
    email: provider.email,
    priority: provider.priority,
    globalPriority: provider.globalPriority,
    defaultModel: provider.defaultModel,
    accessToken: provider.accessToken,
    refreshToken: provider.refreshToken,
    expiresAt: provider.expiresAt,
    expiresIn: provider.expiresIn,
    tokenType: provider.tokenType,
    scope: provider.scope,
    idToken: provider.idToken,
    projectId: provider.projectId,
    apiKey: provider.apiKey,
    providerSpecificData: provider.providerSpecificData || {},
    isActive: provider.isActive,
    status: provider.status || "active",
    lastError: provider.lastError || null,
    lastErrorAt: provider.lastErrorAt || null,
    errorCode: provider.errorCode || null,
    rateLimitedUntil: provider.rateLimitedUntil || null,
    createdAt: provider.createdAt,
    updatedAt: provider.updatedAt || new Date().toISOString()
  };
}

/**
 * Update provider status (called when token refresh fails or API errors)
 */
export function updateProviderStatus(
  providers: Record<string, MachineProviderRecord>,
  providerId: string,
  status: string,
  error: string | null = null,
  errorCode: number | string | null = null
): Record<string, MachineProviderRecord> {
  if (providers[providerId]) {
    providers[providerId].status = status;
    providers[providerId].lastError = error;
    providers[providerId].lastErrorAt = error ? new Date().toISOString() : null;
    providers[providerId].errorCode = errorCode;
    providers[providerId].updatedAt = new Date().toISOString();
  }
  return providers;
}

/**
 * Helper to create JSON response
 */
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: CORS_HEADERS
  });
}
