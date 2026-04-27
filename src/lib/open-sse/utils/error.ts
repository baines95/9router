import { ERROR_TYPES, DEFAULT_ERROR_MESSAGES } from "../config/errorConfig";
import { formatRetryAfter } from "../services/accountFallback";

interface ErrorResponse {
  error: {
    message: string;
    type: string;
    code: string;
  };
}

/**
 * Build OpenAI-compatible error response body
 */
export function buildErrorBody(statusCode: number, message?: string): ErrorResponse {
  const errorInfo = (ERROR_TYPES as any)[statusCode] || 
    (statusCode >= 500 
      ? { type: "server_error", code: "internal_server_error" }
      : { type: "invalid_request_error", code: "" });

  return {
    error: {
      message: message || (DEFAULT_ERROR_MESSAGES as any)[statusCode] || "An error occurred",
      type: errorInfo.type,
      code: errorInfo.code
    }
  };
}

/**
 * Create error Response object (for non-streaming)
 */
export function errorResponse(statusCode: number, message?: string): Response {
  return new Response(JSON.stringify(buildErrorBody(statusCode, message)), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

/**
 * Write error to SSE stream (for streaming)
 */
export async function writeStreamError(writer: WritableStreamDefaultWriter, statusCode: number, message?: string): Promise<void> {
  const errorBody = buildErrorBody(statusCode, message);
  const encoder = new TextEncoder();
  await writer.write(encoder.encode(`data: ${JSON.stringify(errorBody)}\n\n`));
}

/**
 * Parse upstream provider error response
 */
export async function parseUpstreamError(response: Response): Promise<{statusCode: number, message: string, resetsAtMs?: number}> {
  let message: any = "";
  const status = response.status || 502;
  let resetsAtMs: number | undefined;

  const retryAfterHeader = response.headers.get("Retry-After");
  if (retryAfterHeader) {
    const retryAfterSeconds = Number(retryAfterHeader);
    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
      resetsAtMs = Date.now() + Math.floor(retryAfterSeconds * 1000);
    } else {
      const retryAfterDate = Date.parse(retryAfterHeader);
      if (!Number.isNaN(retryAfterDate) && retryAfterDate > Date.now()) {
        resetsAtMs = retryAfterDate;
      }
    }
  }

  try {
    const text = await response.text();

    try {
      const json = JSON.parse(text);
      message = json.error?.message || json.message || json.error || text;
    } catch {
      message = text;
    }
  } catch {
    message = `Upstream error: ${status}`;
  }

  const messageStr = typeof message === "string" ? message : JSON.stringify(message);
  const finalMessage = messageStr || (DEFAULT_ERROR_MESSAGES as any)[status] || `Upstream error: ${status}`;

  return {
    statusCode: status,
    message: finalMessage,
    resetsAtMs
  };
}

export interface ErrorResult {
  success: false;
  status: number;
  error: string;
  response: Response;
  resetsAtMs?: number;
}

/**
 * Create error result for chatCore handler
 */
export function createErrorResult(statusCode: number, message: string, resetsAtMs?: number): ErrorResult {
  return {
    success: false,
    status: statusCode,
    error: message,
    response: errorResponse(statusCode, message),
    resetsAtMs
  };
}

export function unavailableResponse(statusCode: number, message: string, retryAfter: string, retryAfterHuman?: string): Response {
  if (!retryAfter) {
    return errorResponse(statusCode, message);
  }

  const human = retryAfterHuman || formatRetryAfter(retryAfter);
  const retryAfterSec = Math.max(Math.ceil((new Date(retryAfter).getTime() - Date.now()) / 1000), 1);
  const msg = `${message} (${human})`;

  return new Response(
    JSON.stringify(buildErrorBody(statusCode, msg)),
    {
      status: statusCode,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSec)
      }
    }
  );
}

/**
 * Format provider error with context
 */
export function formatProviderError(error: any, provider: string, model: string, statusCode: number): string {
  const code = statusCode || error?.status || error?.code || "ERR";
  const message = error?.message || `${provider}/${model} request failed`;
  const causeCode = error.cause?.code;
  const causeMsg = error.cause?.message;
  const causeStr = causeCode || causeMsg ? ` (cause: ${[causeCode, causeMsg].filter(Boolean).join(": ")})` : "";
  return `[${code}]: ${message}${causeStr}`;
}

