declare module "open-sse" {
  const mod: any;
  export default mod;
}

declare module "open-sse/translator/index.js" {
  export function initTranslators(...args: any[]): any;
}

declare module "open-sse/config/ollamaModels.js" {
  export const ollamaModels: any;
}

declare module "open-sse/utils/ollamaTransform.js" {
  export function transformToOllama(response: Response, model: string): Response;
}

declare module "open-sse/services/model.js" {
  export function getModelInfoCore(...args: any[]): Promise<any>;
}

declare module "open-sse/handlers/chatCore.js" {
  export function handleChatCore(...args: any[]): Promise<any>;
}

declare module "open-sse/handlers/embeddingsCore.js" {
  export function handleEmbeddingsCore(...args: any[]): Promise<any>;
}

declare module "open-sse/utils/error.js" {
  export function errorResponse(status: number, message: string): Response;
}

declare module "open-sse/services/accountFallback.js" {
  export function checkFallbackError(...args: any[]): { shouldFallback: boolean; cooldownMs: number; newBackoffLevel?: number };
  export function isAccountUnavailable(value?: string | null): boolean;
  export function getUnavailableUntil(cooldownMs: number): string;
  export function getEarliestRateLimitedUntil(connections: any[]): string | null;
  export function formatRetryAfter(isoTimestamp: string): string;
}

declare module "open-sse/services/combo.js" {
  export function getComboModelsFromData(...args: any[]): any;
  export function handleComboChat(...args: any[]): Promise<Response>;
}

declare module "open-sse/config/runtimeConfig.js" {
  export const HTTP_STATUS: Record<string, number>;
}

declare module "open-sse/services/tokenRefresh.js" {
  export const TOKEN_EXPIRY_BUFFER_MS: number;
  export function refreshTokenByProvider(provider: unknown, credentials: unknown, log?: unknown): Promise<unknown>;
}

declare module "@/*" {
  const mod: any;
  export default mod;
}

declare module "cloudflare:sockets" {
  export function connect(options: {
    hostname: string;
    port: number;
    secureTransport?: "on" | "off";
  }): {
    writable: WritableStream<Uint8Array>;
    readable: ReadableStream<Uint8Array>;
    opened: Promise<unknown>;
  };
}
