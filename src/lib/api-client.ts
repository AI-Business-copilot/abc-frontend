import { supabase } from "@/lib/supabase";

const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const SESSION_EXPIRED_MESSAGE =
  "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.";

const AUTH_NOTICE_KEY = "abc:auth:notice";

/** Fired when the login screen should show a session-expired message. */
export const AUTH_NOTICE_EVENT = "abc:auth-notice";

export class SessionExpiredError extends Error {
  constructor() {
    super(SESSION_EXPIRED_MESSAGE);
    this.name = "SessionExpiredError";
  }
}

/** Reads and clears a one-shot auth notice left by an expired session. */
export function consumeAuthNotice(): string {
  try {
    const notice = window.sessionStorage.getItem(AUTH_NOTICE_KEY) ?? "";
    if (notice) window.sessionStorage.removeItem(AUTH_NOTICE_KEY);
    return notice;
  } catch {
    return "";
  }
}

/** Leaves a one-shot notice for the login screen without clearing storage. */
export function markSessionExpired(): void {
  try {
    window.sessionStorage.setItem(AUTH_NOTICE_KEY, SESSION_EXPIRED_MESSAGE);
  } catch {
    // Private browsing can block storage; the generic login screen still works.
  }
  window.dispatchEvent(
    new CustomEvent(AUTH_NOTICE_EVENT, { detail: SESSION_EXPIRED_MESSAGE }),
  );
}

/** True when a Supabase session blob is present in localStorage. */
export function hasStoredAuthSession(): boolean {
  try {
    return Object.keys(window.localStorage).some(
      (key) =>
        key.startsWith("sb-") &&
        key.endsWith("-auth-token") &&
        Boolean(window.localStorage.getItem(key)),
    );
  } catch {
    return false;
  }
}

const SESSION_ERROR_CODES = new Set([
  "refresh_token_not_found",
  "refresh_token_already_used",
  "session_expired",
  "invalid_refresh_token",
  "invalid_jwt",
]);

/** True when Supabase rejected the stored session/refresh token. */
export function isSessionExpiredError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const authError = error as Error & { code?: string };
  if (authError.code && SESSION_ERROR_CODES.has(authError.code)) return true;
  return /refresh token|session (is )?(expired|missing)|invalid (jwt|access token)/i.test(
    authError.message,
  );
}

type ErrorPayload = {
  message?: string;
  error?: string;
};

let redirectingToLogin = false;

async function expireSession(): Promise<void> {
  if (redirectingToLogin) return;
  redirectingToLogin = true;

  // Write the notice before signing out: clearing the session can trigger a
  // route guard that mounts the login screen immediately.
  markSessionExpired();

  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Ignore storage/network failures while clearing the stale session.
  }

  if (!window.location.pathname.startsWith("/login")) {
    window.location.assign("/login");
  }
}

async function readAccessToken(forceRefresh: boolean): Promise<string> {
  if (forceRefresh) {
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data.session?.access_token) return data.session.access_token;

    // Another tab may have rotated the refresh token while this one was
    // refreshing. Re-read storage before treating the session as dead.
    const fallback = await supabase.auth.getSession();
    if (!fallback.error && fallback.data.session?.access_token) {
      return fallback.data.session.access_token;
    }
  } else {
    const { data, error } = await supabase.auth.getSession();
    if (!error && data.session?.access_token) return data.session.access_token;
  }

  await expireSession();
  throw new SessionExpiredError();
}

function send(url: string, init: RequestInit, token: string): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  // FormData must go out without a Content-Type so the browser adds the multipart boundary itself.
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(url, { ...init, headers });
}

/**
 * Calls the API with the current Supabase token.
 *
 * An expired access token is refreshed once and the request retried. When the
 * refresh token is no longer valid the local session is cleared and the user is
 * sent back to the login screen with a readable message instead of a raw JWT
 * error.
 */
export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const url = /^https?:\/\//i.test(path) ? path : `${apiBaseUrl}${path}`;

  let response = await send(url, init, await readAccessToken(false));

  if (response.status === 401) {
    response = await send(url, init, await readAccessToken(true));
    if (response.status === 401) {
      await expireSession();
      throw new SessionExpiredError();
    }
  }

  return response;
}

async function readErrorMessage(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => ({}))) as ErrorPayload;
  return payload.message || payload.error || `Yêu cầu thất bại (${response.status}).`;
}

export async function apiJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await apiFetch(path, init);

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
