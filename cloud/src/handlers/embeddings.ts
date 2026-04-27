import { getModelInfoCore } from "open-sse/services/model.js";
import { handleEmbeddingsCore } from "open-sse/handlers/embeddingsCore.js";
import { errorResponse } from "open-sse/utils/error.js";
import {
  checkFallbackError,
  isAccountUnavailable,
  getEarliestRateLimitedUntil,
  getUnavailableUntil,
  formatRetryAfter
} from "open-sse/services/accountFallback.js";
import { HTTP_STATUS } from "open-sse/config/runtimeConfig.js";
import * as log from "../utils/logger.js";
import { parseApiKey, extractBearerToken } from "../utils/apiKey.js";
import { getMachineData, saveMachineData } from "../services/storage.js";
import type {
  EmbeddingsRequestBody,
  Env,
  ExecutionContextLike,
  MachineCredentials,
  MachineData,
  MachineProviderRecord,
  RateLimitResult
} from "../types";

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

/**
 * Handle POST /v1/embeddings and /{machineId}/v1/embeddings requests.
 */
export async function handleEmbeddings(
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

  // Resolve machineId
  let machineId = machineIdOverride;

  if (!machineId) {
    const apiKey = extractBearerToken(request);
    if (!apiKey) return errorResponse(HTTP_STATUS.UNAUTHORIZED, "Missing API key");

    const parsed = await parseApiKey(apiKey);
    if (!parsed) return errorResponse(HTTP_STATUS.UNAUTHORIZED, "Invalid API key format");

    if (!parsed.isNewFormat || !parsed.machineId) {
      return errorResponse(
        HTTP_STATUS.BAD_REQUEST,
        "API key does not contain machineId. Use /{machineId}/v1/... endpoint for old format keys."
      );
    }
    machineId = parsed.machineId;
  }

  // Validate API key
  if (!await validateApiKey(request, machineId, env)) {
    return errorResponse(HTTP_STATUS.UNAUTHORIZED, "Invalid API key");
  }

  // Parse body
  let body: EmbeddingsRequestBody;
  try {
    body = (await request.json()) as EmbeddingsRequestBody;
  } catch {
    return errorResponse(HTTP_STATUS.BAD_REQUEST, "Invalid JSON body");
  }

  const modelStr = body.model;
  if (!modelStr) return errorResponse(HTTP_STATUS.BAD_REQUEST, "Missing model");

  if (!body.input) return errorResponse(HTTP_STATUS.BAD_REQUEST, "Missing required field: input");

  log.info("EMBEDDINGS", `${machineId} | ${modelStr}`);

  // Resolve model info
  const data = await getMachineData(machineId, env);
  const modelInfo = await getModelInfoCore(modelStr, data?.modelAliases || {});
  if (!modelInfo.provider) return errorResponse(HTTP_STATUS.BAD_REQUEST, "Invalid model format");

  const provider = modelInfo.provider as string;
  const model = modelInfo.model as string;
  log.info("EMBEDDINGS_MODEL", `${provider.toUpperCase()} | ${model}`);

  // Provider credential + fallback loop (mirrors handleChat)
  let excludeConnectionId: string | null = null;
  let lastError: unknown = null;
  let lastStatus: number | null = null;

  while (true) {
    const credentials = await getProviderCredentials(machineId, provider, env, excludeConnectionId);

    if (!credentials || isRateLimited(credentials)) {
      if (credentials && isRateLimited(credentials)) {
        const retryAfterSec = Math.ceil(
          (new Date(credentials.retryAfter).getTime() - Date.now()) / 1000
        );
        const errorMsg = (lastError as string | null) || credentials.lastError || "Unavailable";
        const msg = `[${provider}/${model}] ${errorMsg} (${credentials.retryAfterHuman})`;
        const status = lastStatus || Number(credentials.lastErrorCode) || HTTP_STATUS.SERVICE_UNAVAILABLE;
        log.warn("EMBEDDINGS", `${provider.toUpperCase()} | ${msg}`);
        return new Response(
          JSON.stringify({ error: { message: msg } }),
          {
            status,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": String(Math.max(retryAfterSec, 1))
            }
          }
        );
      }
      if (!excludeConnectionId) {
        return errorResponse(HTTP_STATUS.BAD_REQUEST, `No credentials for provider: ${provider}`);
      }
      log.warn("EMBEDDINGS", `${provider.toUpperCase()} | no more accounts`);
      return new Response(
        JSON.stringify({ error: (lastError as string | null) || "All accounts unavailable" }),
        {
          status: lastStatus || HTTP_STATUS.SERVICE_UNAVAILABLE,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    log.debug("EMBEDDINGS", `account=${credentials.id}`, { provider });

    const result = (await handleEmbeddingsCore({
      body,
      modelInfo: { provider, model },
      credentials,
      log,
      onCredentialsRefreshed: async (newCreds: CredentialsUpdate) => {
        await updateCredentials(machineId, credentials.id, newCreds, env);
      },
      onRequestSuccess: async () => {
        await clearAccountError(machineId, credentials.id, credentials, env);
      }
    })) as CoreResult;

    if (result.success) return result.response;

    const { shouldFallback } = checkFallbackError(result.status, result.error);

    if (shouldFallback) {
      log.warn("EMBEDDINGS_FALLBACK", `${provider.toUpperCase()} | ${credentials.id} | ${result.status}`);
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
    const allConnections = Object.entries(data.providers)
      .filter(([, conn]) => (conn as MachineProviderRecord).provider === provider && (conn as MachineProviderRecord).isActive)
      .map(([, conn]) => conn as MachineProviderRecord);
    const earliest = getEarliestRateLimitedUntil(allConnections);
    if (earliest) {
      const rateLimitedConns = allConnections.filter(
        c => c.rateLimitedUntil && new Date(c.rateLimitedUntil).getTime() > Date.now()
      );
      const earliestConn = rateLimitedConns.sort(
        (a, b) => new Date(a.rateLimitedUntil || 0).getTime() - new Date(b.rateLimitedUntil || 0).getTime()
      )[0];
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
    providerSpecificData: connection.providerSpecificData,
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
  log.warn("EMBEDDINGS_ACCOUNT", `${connectionId} | unavailable until ${rateLimitedUntil}`);
}

async function clearAccountError(
  machineId: string,
  connectionId: string,
  currentCredentials: MachineCredentials,
  env: Env
): Promise<void> {
  const hasError =
    currentCredentials.status === "unavailable" ||
    currentCredentials.lastError ||
    currentCredentials.rateLimitedUntil;

  if (!hasError) return;

  const data = await getMachineData(machineId, env) as MachineData | null;
  if (!data?.providers?.[connectionId]) return;

  data.providers[connectionId].status = "active";
  data.providers[connectionId].lastError = null;
  data.providers[connectionId].lastErrorAt = null;
  data.providers[connectionId].rateLimitedUntil = null;
  data.providers[connectionId].backoffLevel = 0;
  data.providers[connectionId].updatedAt = new Date().toISOString();

  await saveMachineData(machineId, data, env);
  log.info("EMBEDDINGS_ACCOUNT", `${connectionId} | error cleared`);
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
  if (newCredentials.refreshToken)
    data.providers[connectionId].refreshToken = newCredentials.refreshToken;
  if (newCredentials.expiresIn) {
    data.providers[connectionId].expiresAt = new Date(
      Date.now() + newCredentials.expiresIn * 1000
    ).toISOString();
    data.providers[connectionId].expiresIn = newCredentials.expiresIn;
  }
  data.providers[connectionId].updatedAt = new Date().toISOString();

  await saveMachineData(machineId, data, env);
  log.debug("EMBEDDINGS_TOKEN", `credentials updated | ${connectionId}`);
}
