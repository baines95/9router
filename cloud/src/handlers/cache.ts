import { errorResponse } from "open-sse/utils/error.js";
import { extractBearerToken, parseApiKey } from "../utils/apiKey.js";
import * as log from "../utils/logger.js";
import type { CacheClearBody, Env } from "../types";

export async function handleCacheClear(request: Request, env: Env): Promise<Response> {
  const apiKey = extractBearerToken(request);
  if (!apiKey) {
    return errorResponse(401, "Missing API key");
  }

  try {
    const body = (await request.json().catch(() => ({}))) as CacheClearBody;

    // Get machineId from API key or body
    let machineId = body.machineId;
    if (!machineId) {
      const parsed = await parseApiKey(apiKey);
      machineId = parsed?.machineId ?? undefined;
    }

    if (!machineId) {
      return errorResponse(400, "Missing machineId");
    }

    // No cache layer to clear anymore
    log.info("CACHE", `Cache clear requested for machine: ${machineId} (no-op)`);

    return new Response(JSON.stringify({ success: true, machineId, message: "No cache layer" }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse(500, message);
  }
}
