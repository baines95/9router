import { getModelInfoCore } from "open-sse/services/model.js";
import { handleChatCore } from "open-sse/handlers/chatCore.js";
import { errorResponse } from "open-sse/utils/error.js";
import {
  checkFallbackError,
  isAccountUnavailable,
  getUnavailableUntil,
  getEarliestRateLimitedUntil,
  formatRetryAfter
} from "open-sse/services/accountFallback.js";
import { getComboModelsFromData, handleComboChat } from "open-sse/services/combo.js";
import { HTTP_STATUS } from "open-sse/config/runtimeConfig.js";
import * as log from "../utils/logger.js";
import { refreshTokenByProvider } from "../services/tokenRefresh.js";
import { parseApiKey, extractBearerToken } from "../utils/apiKey.js";
import { getMachineData, saveMachineData } from "../services/storage.js";
import type {
  Env,
  ExecutionContextLike,
  MachineCredentials,
  MachineData,
  MachineProviderRecord,
  RateLimitResult
} from "../types";

type ChatRequestBody = Record<string, unknown> & {
  model?: string;
  stream?: boolean;
};

type CoreResult = {
  success: boolean;
  response: Response;
  status?: number;
  error?: unknown;
};

type CredentialsUpdate = {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  [key: string]: unknown;
};

type ProviderSelection = MachineCredentials | RateLimitResult | null;

const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

async function getModelInfo(modelStr: string, machineId: string, env: Env) {
  const data = await getMachineData(machineId, env);
  return getModelInfoCore(modelStr, data?.modelAliases || {});
}

/**
 * Handle chat request
 */
export async function handleChat(
  request: Request,
  env: Env,
  _ctx: ExecutionContextLike,
  machineIdOverride: string | null = null
): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "*"
      }
    });
  }

  // Determine machineId: from URL (old) or from API key (new)
  let machineId = machineIdOverride;

  if (!machineId) {
    // New format: extract machineId from API key
    const apiKey = extractBearerToken(request);
    if (!apiKey) return errorResponse(HTTP_STATUS.UNAUTHORIZED, "Missing API key");

    const parsed = await parseApiKey(apiKey);
    if (!parsed) return errorResponse(HTTP_STATUS.UNAUTHORIZED, "Invalid API key format");

    if (!parsed.isNewFormat || !parsed.machineId) {
      return errorResponse(HTTP_STATUS.BAD_REQUEST, "API key does not contain machineId. Use /{machineId}/v1/... endpoint for old format keys.");
    }

    machineId = parsed.machineId;
  }

  if (!await validateApiKey(request, machineId, env)) {
    return errorResponse(HTTP_STATUS.UNAUTHORIZED, "Invalid API key");
  }

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return errorResponse(HTTP_STATUS.BAD_REQUEST, "Invalid JSON body");
  }

  log.info("CHAT", `${machineId} | ${body.model}`, { stream: body.stream !== false });

  const modelStr = body.model;
  if (!modelStr) return errorResponse(HTTP_STATUS.BAD_REQUEST, "Missing model");

  // Check if model is a combo
  const data = await getMachineData(machineId, env);
  const comboModels = getComboModelsFromData(modelStr, data?.combos || []);

  if (comboModels) {
    log.info("COMBO", `"${modelStr}" with ${comboModels.length} models`);
    return handleComboChat({
      body,
      models: comboModels,
      handleSingleModel: (reqBody: ChatRequestBody, model: string) => handleSingleModelChat(reqBody, model, machineId as string, env),
      log
    });
  }

  // Single model request
  return handleSingleModelChat(body, modelStr, machineId, env);
}

/**
 * Handle single model chat request
 */
async function handleSingleModelChat(
  body: ChatRequestBody,
  modelStr: string,
  machineId: string,
  env: Env
): Promise<Response> {
  const modelInfo = await getModelInfo(modelStr, machineId, env);
  if (!modelInfo.provider) return errorResponse(HTTP_STATUS.BAD_REQUEST, "Invalid model format");

  const provider = modelInfo.provider as string;
  const model = modelInfo.model as string;
  log.info("MODEL", `${provider.toUpperCase()} | ${model}`);

  let excludeConnectionId: string | null = null;
  let lastError: unknown = null;
  let lastStatus: number | null = null;

  while (true) {
    const credentials = await getProviderCredentials(machineId, provider, env, excludeConnectionId);
    if (!credentials || isRateLimited(credentials)) {
      if (credentials && isRateLimited(credentials)) {
        const retryAfterSec = Math.ceil((new Date(credentials.retryAfter).getTime() - Date.now()) / 1000);
        const errorMsg = (lastError as string | null) || credentials.lastError || "Unavailable";
        const msg = `[${provider}/${model}] ${errorMsg} (${credentials.retryAfterHuman})`;
        const status = lastStatus || Number(credentials.lastErrorCode) || HTTP_STATUS.SERVICE_UNAVAILABLE;
        log.warn("CHAT", `${provider.toUpperCase()} | ${msg}`);
        return new Response(
          JSON.stringify({ error: { message: msg } }),
          { status, headers: { "Content-Type": "application/json", "Retry-After": String(Math.max(retryAfterSec, 1)) } }
        );
      }
      if (!excludeConnectionId) {
        return errorResponse(HTTP_STATUS.BAD_REQUEST, `No credentials for provider: ${provider}`);
      }
      log.warn("CHAT", `${provider.toUpperCase()} | no more accounts`);
      return new Response(
        JSON.stringify({ error: (lastError as string | null) || "All accounts unavailable" }),
        { status: lastStatus || HTTP_STATUS.SERVICE_UNAVAILABLE, headers: { "Content-Type": "application/json" } }
      );
    }

    log.debug("CHAT", `account=${credentials.id}`, { provider });

    const refreshedCredentials = await checkAndRefreshToken(machineId, provider, credentials, env);

    // Use shared chatCore
    const result = (await handleChatCore({
      body,
      modelInfo: { provider, model },
      credentials: refreshedCredentials,
      log,
      onCredentialsRefreshed: async (newCreds: CredentialsUpdate) => {
        await updateCredentials(machineId, credentials.id, newCreds, env);
      },
      onRequestSuccess: async () => {
        // Clear error status only if currently has error (optimization)
        await clearAccountError(machineId, credentials.id, credentials, env);
      }
    })) as CoreResult;

    if (result.success) return result.response;

    const { shouldFallback } = checkFallbackError(result.status, result.error);

    if (shouldFallback) {
      log.warn("FALLBACK", `${provider.toUpperCase()} | ${credentials.id} | ${result.status}`);
      await markAccountUnavailable(machineId, credentials.id, result.status ?? 0, result.error, env);
      excludeConnectionId = credentials.id;
      lastError = result.error;
      lastStatus = result.status ?? null;
      continue;
    }

    return result.response;
  }
}

function isRateLimited(value: ProviderSelection): value is RateLimitResult {
  return Boolean(value && "allRateLimited" in value && value.allRateLimited);
}

async function checkAndRefreshToken(
  machineId: string,
  provider: string,
  credentials: MachineCredentials,
  env: Env
): Promise<MachineCredentials> {
  if (!credentials.expiresAt) return credentials;

  const expiresAt = new Date(credentials.expiresAt).getTime();
  if (expiresAt - Date.now() >= TOKEN_EXPIRY_BUFFER_MS) return credentials;

  log.debug("TOKEN", `${provider.toUpperCase()} | expiring, refreshing`);

  const newCredentials = await refreshTokenByProvider(provider, credentials) as CredentialsUpdate | null;
  if (newCredentials?.accessToken) {
    await updateCredentials(machineId, credentials.id, newCredentials, env);
    return {
      ...credentials,
      accessToken: newCredentials.accessToken,
      refreshToken: newCredentials.refreshToken || credentials.refreshToken,
      expiresAt: newCredentials.expiresIn
        ? new Date(Date.now() + newCredentials.expiresIn * 1000).toISOString()
        : credentials.expiresAt
    };
  }

  return credentials;
}

async function validateApiKey(request: Request, machineId: string, env: Env): Promise<boolean> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  const apiKey = authHeader.slice(7);
  const data = await getMachineData(machineId, env);
  return data?.apiKeys?.some(k => k.key === apiKey) || false;
}

async function getProviderCredentials(
  machineId: string,
  provider: string,
  env: Env,
  excludeConnectionId: string | null = null
): Promise<ProviderSelection> {
  const data = await getMachineData(machineId, env) as MachineData | null;
  if (!data?.providers) return null;

  const providerConnections = Object.entries(data.providers)
    .filter(([connId, conn]) => {
      const record = conn as MachineProviderRecord;
      if (record.provider !== provider || !record.isActive) return false;
      if (excludeConnectionId && connId === excludeConnectionId) return false;
      if (isAccountUnavailable(record.rateLimitedUntil)) return false;
      return true;
    })
    .sort((a, b) => ((a[1] as MachineProviderRecord).priority || 999) - ((b[1] as MachineProviderRecord).priority || 999));

  if (providerConnections.length === 0) {
    // Check if accounts exist but all rate limited
    const allConnections = Object.entries(data.providers)
      .filter(([, conn]) => (conn as MachineProviderRecord).provider === provider && (conn as MachineProviderRecord).isActive)
      .map(([, conn]) => conn as MachineProviderRecord);
    const earliest = getEarliestRateLimitedUntil(allConnections);
    if (earliest) {
      const rateLimitedConns = allConnections.filter(c => c.rateLimitedUntil && new Date(c.rateLimitedUntil).getTime() > Date.now());
      const earliestConn = rateLimitedConns.sort((a, b) => new Date(a.rateLimitedUntil || 0).getTime() - new Date(b.rateLimitedUntil || 0).getTime())[0];
      return {
        allRateLimited: true,
        retryAfter: earliest,
        retryAfterHuman: formatRetryAfter(earliest),
        lastError: earliestConn?.lastError || null,
        lastErrorCode: earliestConn?.errorCode || null
      };
    }
    return null;
  }

  const [connectionId, connection] = providerConnections[0] as [string, MachineProviderRecord];

  return {
    id: connectionId,
    apiKey: connection.apiKey,
    accessToken: connection.accessToken,
    refreshToken: connection.refreshToken,
    expiresAt: connection.expiresAt,
    projectId: connection.projectId,
    copilotToken: connection.providerSpecificData?.copilotToken,
    providerSpecificData: connection.providerSpecificData,
    // Include current status for optimization check
    status: connection.status,
    lastError: connection.lastError,
    rateLimitedUntil: connection.rateLimitedUntil
  };
}

async function markAccountUnavailable(
  machineId: string,
  connectionId: string,
  status: number,
  errorText: unknown,
  env: Env
): Promise<void> {
  const data = await getMachineData(machineId, env) as MachineData | null;
  if (!data?.providers?.[connectionId]) return;

  const conn = data.providers[connectionId];
  const backoffLevel = conn.backoffLevel || 0;
  const { cooldownMs, newBackoffLevel } = checkFallbackError(status, errorText, backoffLevel);
  const rateLimitedUntil = getUnavailableUntil(cooldownMs);
  const reason = typeof errorText === "string" ? errorText.slice(0, 100) : "Provider error";

  data.providers[connectionId].rateLimitedUntil = rateLimitedUntil;
  data.providers[connectionId].status = "unavailable";
  data.providers[connectionId].lastError = reason;
  data.providers[connectionId].errorCode = status || null;
  data.providers[connectionId].lastErrorAt = new Date().toISOString();
  data.providers[connectionId].backoffLevel = newBackoffLevel ?? backoffLevel;
  data.providers[connectionId].updatedAt = new Date().toISOString();

  await saveMachineData(machineId, data, env);
  log.warn("ACCOUNT", `${connectionId} | unavailable until ${rateLimitedUntil} (backoff=${newBackoffLevel ?? backoffLevel})`);
}

async function clearAccountError(
  machineId: string,
  connectionId: string,
  currentCredentials: MachineCredentials,
  env: Env
): Promise<void> {
  // Only update if currently has error status (optimization)
  const hasError = currentCredentials.status === "unavailable" ||
                   currentCredentials.lastError ||
                   currentCredentials.rateLimitedUntil;

  if (!hasError) return; // Skip if already clean

  const data = await getMachineData(machineId, env) as MachineData | null;
  if (!data?.providers?.[connectionId]) return;

  data.providers[connectionId].status = "active";
  data.providers[connectionId].lastError = null;
  data.providers[connectionId].lastErrorAt = null;
  data.providers[connectionId].rateLimitedUntil = null;
  data.providers[connectionId].backoffLevel = 0;
  data.providers[connectionId].updatedAt = new Date().toISOString();

  await saveMachineData(machineId, data, env);
  log.info("ACCOUNT", `${connectionId} | error cleared`);
}

async function updateCredentials(
  machineId: string,
  connectionId: string,
  newCredentials: CredentialsUpdate,
  env: Env
): Promise<void> {
  const data = await getMachineData(machineId, env) as MachineData | null;
  if (!data?.providers?.[connectionId]) return;

  data.providers[connectionId].accessToken = newCredentials.accessToken;
  if (newCredentials.refreshToken) data.providers[connectionId].refreshToken = newCredentials.refreshToken;
  if (newCredentials.expiresIn) {
    data.providers[connectionId].expiresAt = new Date(Date.now() + newCredentials.expiresIn * 1000).toISOString();
    data.providers[connectionId].expiresIn = newCredentials.expiresIn;
  }
  data.providers[connectionId].updatedAt = new Date().toISOString();

  await saveMachineData(machineId, data, env);
  log.debug("TOKEN", `credentials updated | ${connectionId}`);
}
