// Thin `fetch` wrapper for the real Auth & Roles backend (PLAN_AUTH_ROLES.md
// §2.1). Only the auth path uses this — every other module still reads
// `src/lib/mock-backend`. Adds the `Authorization: Bearer <token>` header
// from the auth store, and on a `401` clears the local session (the API
// client and the store intentionally know about each other here — this is
// the one seam where "real backend" meets "everything else is mock").

import { useAuthStore } from '@/stores/useAuthStore';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';

/** Thrown for both HTTP-error responses and network failures. `status = 0` means "network". */
export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;
  /** Business-rule error code (e.g. unit validation's 'duplicate-name') — see `bootstrap/app.php`. */
  code?: string;

  constructor(status: number, message: string, errors?: Record<string, string[]>, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.code = code;
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
    throw new ApiError(
      response.status,
      errorBody.message ?? response.statusText,
      errorBody.errors,
      errorBody.code,
    );
  }

  return json as T;
}
