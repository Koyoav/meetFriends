import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../auth/tokenStorage';

// Points at the FastAPI backend (see ../../backend). Override via EXPO_PUBLIC_API_URL
// for a device/simulator that can't reach localhost (e.g. Android emulator: 10.0.2.2).
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

// Lets AuthContext know the refresh token was rejected, so it can flip isSignedIn
// back to false instead of leaving the app stranded on an authenticated screen
// with every subsequent request 401ing. Set once by AuthProvider on mount.
let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null): void {
  onSessionExpired = handler;
}

// Bumped on an explicit logout so a refresh that was already in flight at that moment
// can tell its result is stale and must not write tokens back into storage — otherwise
// a successful /auth/refresh resolving just after logout() clears storage would silently
// undo the logout (the server has no idea the user logged out locally).
let authGeneration = 0;

export function invalidateAuthGeneration(): void {
  authGeneration += 1;
}

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown) {
    super(typeof detail === 'string' ? detail : `Request failed with status ${status}`);
    this.status = status;
    this.detail = detail;
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
};

async function parseBody(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function rawRequest(path: string, options: RequestOptions, accessToken: string | null) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.auth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  return response;
}

// Shared by every in-flight request that hits a 401 at the same time, so a page that
// fires several authenticated calls at once performs one /auth/refresh, not one per call.
let refreshInFlight: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = doRefreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function doRefreshAccessToken(): Promise<string | null> {
  const generationAtStart = authGeneration;
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  const response = await rawRequest('/auth/refresh', { method: 'POST', body: { refresh_token: refreshToken } }, null);

  // The user logged out (or another session-expiry) while this call was in flight.
  // Storage was already cleared by that path; don't let this stale result undo it.
  if (generationAtStart !== authGeneration) return null;

  if (!response.ok) {
    await clearTokens();
    onSessionExpired?.();
    return null;
  }

  const data = await parseBody(response);
  await setTokens(data.access_token, data.refresh_token);
  return data.access_token;
}

/**
 * Calls the backend. Retries once with a refreshed access token on a 401 when `auth`
 * is set. Note: if the refresh itself fails, the caller still gets this rejection
 * (ApiError with the original 401) on top of the app having redirected to the signed-out
 * stack via the session-expired handler — there's currently only one authenticated call
 * site in this codebase (none yet; auth.login/signup don't pass `auth: true`), so no
 * screen has needed to special-case that double signal yet.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const accessToken = options.auth ? await getAccessToken() : null;
  let response = await rawRequest(path, options, accessToken);

  if (response.status === 401 && options.auth) {
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      response = await rawRequest(path, options, newAccessToken);
    }
  }

  const data = await parseBody(response);
  if (!response.ok) {
    throw new ApiError(response.status, data?.detail ?? data);
  }
  return data as T;
}
