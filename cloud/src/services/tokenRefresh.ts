// Re-export from open-sse with worker logger
import * as log from "../utils/logger.js";
import {
  TOKEN_EXPIRY_BUFFER_MS as BUFFER_MS,
  refreshTokenByProvider as _refreshTokenByProvider
} from "open-sse/services/tokenRefresh.js";

export const TOKEN_EXPIRY_BUFFER_MS = BUFFER_MS;

type RefreshTokenByProvider = typeof _refreshTokenByProvider;

type ProviderArg = Parameters<RefreshTokenByProvider>[0];
type CredentialsArg = Parameters<RefreshTokenByProvider>[1];
type RefreshResult = ReturnType<RefreshTokenByProvider>;

export const refreshTokenByProvider = (
  provider: ProviderArg,
  credentials: CredentialsArg
): RefreshResult => _refreshTokenByProvider(provider, credentials, log);
