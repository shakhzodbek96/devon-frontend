// Thin `fetch` wrapper for the real Auth & Roles backend (PLAN_AUTH_ROLES.md
// §2.1). Only the auth path uses this — every other module still reads
// `src/lib/mock-backend`. Adds the `Authorization: Bearer <token>` header
// from the auth store, and on a `401` clears the local session (the API
// client and the store intentionally know about each other here — this is
// the one seam where "real backend" meets "everything else is mock").

import { useAuthStore } from '@/stores/useAuthStore';
import { useExceptionStore } from '@/stores/useExceptionStore';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';

/** Thrown for both HTTP-error responses and network failures. `status = 0` means "network". */
export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;
  /** Business-rule error code (e.g. unit validation's 'duplicate-name') — see `bootstrap/app.php`. */
  code?: string;
  /** Full raw JSON body — only populated for unhandled backend exceptions (see `isUnhandledException`). */
  raw?: unknown;

  constructor(status: number, message: string, errors?: Record<string, string[]>, code?: string, raw?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.code = code;
    this.raw = raw;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Attach the bearer token + trigger session-clear on 401. Default true. */
  auth?: boolean;
}

interface ErrorBody {
  message?: string;
  errors?: Record<string, string[]>;
  code?: string;
  /** Present on Laravel's default (undebugged-by-us) exception JSON — the signal we use to tell
   *  "one of our ~20 intentional business exceptions" (always `{code, message}`, no `exception` key)
   *  apart from a genuine unhandled PHP exception/500/framework error. */
  exception?: string;
  file?: string;
  line?: number;
  trace?: unknown;
}

/**
 * True for anything the backend didn't deliberately translate into our
 * `{code, message}` business-error vocabulary (`bootstrap/app.php`'s
 * `$exceptions->render(...)` list) — i.e. a real unhandled PHP exception.
 * With `APP_DEBUG=true` (dev) Laravel's default handler includes `exception`
 * (the thrown class name) in the JSON body; that's the reliable signal,
 * independent of HTTP status (a bad-uuid route param 404s via
 * `ModelNotFoundException`, which is just as much "an exception" as a 500).
 */
function isUnhandledException(status: number, body: ErrorBody): boolean {
  return typeof body.exception === 'string' || status >= 500;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = useAuthStore.getState().token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'network');
  }

  if (response.status === 401 && auth) {
    // Session-level auth failure (missing/expired/revoked token) — clear
    // local state only. Does NOT call the store's `logout()` action,
    // which itself calls this client and would recurse on a 401.
    useAuthStore.getState().clearSession();
  }

  if (response.status === 204) {
    return undefined as T;
  }

  let json: unknown = null;
  try {
    json = await response.json();
  } catch {
    // No/invalid JSON body — fall through with `json = null`.
  }

  if (!response.ok) {
    const errorBody = (json ?? {}) as ErrorBody;
    const unhandled = isUnhandledException(response.status, errorBody);

    if (unhandled) {
      // Reported here (not left to callers) so it surfaces even when a
      // feature's catch block only checks for its own known error classes
      // and silently falls through to a generic toast otherwise.
      useExceptionStore.getState().report({
        status: response.status,
        method,
        path,
        message: errorBody.message ?? response.statusText,
        exception: errorBody.exception,
        file: errorBody.file,
        line: errorBody.line,
        trace: errorBody.trace,
        raw: json,
      });
    }

    throw new ApiError(
      response.status,
      errorBody.message ?? response.statusText,
      errorBody.errors,
      errorBody.code,
      unhandled ? json : undefined,
    );
  }

  return json as T;
}
