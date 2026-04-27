export interface D1RunResult {
  meta?: {
    changes?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<D1RunResult>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatement;
}

export interface KVNamespaceLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface Env {
  KV: KVNamespaceLike;
  DB: D1DatabaseLike;
}

export interface ExecutionContextLike {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException?(): void;
}

export interface WorkerScheduledEvent {
  scheduledTime: number;
  cron: string;
  [key: string]: unknown;
}

export interface MachineProviderRecord {
  id?: string;
  provider?: string;
  authType?: string;
  name?: string;
  displayName?: string;
  email?: string;
  priority?: number;
  globalPriority?: number;
  defaultModel?: string;
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  expiresIn?: number;
  tokenType?: string;
  scope?: string;
  idToken?: string;
  projectId?: string;
  providerSpecificData?: Record<string, unknown>;
  isActive?: boolean;
  status?: string;
  lastError?: string | null;
  lastErrorAt?: string | null;
  errorCode?: number | string | null;
  rateLimitedUntil?: string | null;
  createdAt?: string;
  updatedAt?: string;
  backoffLevel?: number;
}

export interface MachineData {
  providers?: Record<string, MachineProviderRecord>;
  modelAliases?: Record<string, string>;
  combos?: unknown[];
  apiKeys?: Array<{ key?: string; [key: string]: unknown }>;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface MachineCredentials {
  id: string;
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  projectId?: string;
  copilotToken?: unknown;
  providerSpecificData?: Record<string, unknown>;
  status?: string;
  lastError?: string | null;
  rateLimitedUntil?: string | null;
}

export interface SyncChanges {
  updated: string[];
  fromWorker: string[];
}

export interface SyncRequestBody {
  providers: MachineProviderRecord[];
  modelAliases?: Record<string, string>;
  combos?: unknown[];
  apiKeys?: Array<{ key?: string; [key: string]: unknown }>;
}

export interface ForwardRequestBody {
  targetUrl: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface CountTokensBody {
  messages?: Array<{
    content?:
      | string
      | Array<{
          type?: string;
          text?: string;
          [key: string]: unknown;
        }>;
    [key: string]: unknown;
  }>;
}

export interface CacheClearBody {
  machineId?: string;
  [key: string]: unknown;
}

export interface EmbeddingsRequestBody {
  model?: string;
  input?: unknown;
  [key: string]: unknown;
}

export interface CleanupResult {
  success: boolean;
  deleted?: number;
  cutoffDate?: string;
  error?: string;
}

export interface WorkerModule {
  fetch(request: Request, env: Env, ctx: ExecutionContextLike): Promise<Response>;
  scheduled?(event: WorkerScheduledEvent, env: Env, ctx: ExecutionContextLike): Promise<void>;
}

export interface CfRequestInit extends RequestInit {
  cf?: {
    scrapeShield?: boolean;
    minify?: boolean;
    mirage?: boolean;
    polish?: "off" | "lossless" | "lossy";
    [key: string]: unknown;
  };
}

export interface UsageDb {
  data: {
    history: unknown[];
  };
}

export type ParsedApiKey =
  | {
      machineId: string;
      keyId: string;
      isNewFormat: true;
    }
  | {
      machineId: null;
      keyId: string;
      isNewFormat: false;
    };

export interface RateLimitResult {
  allRateLimited: true;
  retryAfter: string;
  retryAfterHuman: string;
  lastError: string | null;
  lastErrorCode: number | string | null;
}
