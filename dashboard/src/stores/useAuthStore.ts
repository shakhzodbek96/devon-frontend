import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Role } from '@/types/domain';
import { appendAudit, getEmployee, PERSONAS } from '@/lib/mock-backend';
import { ApiError } from '@/lib/api/client';
import { login as apiLogin, logout as apiLogout, me as apiMe } from '@/lib/api/auth';

export interface SessionUser {
  uuid: string;
  email: string;
  fullName: string;
  roles: Role[];
  /** Gates the forced `/change-password` redirect (RequireAuth). */
  mustChangePassword: boolean;
}

type LoginResult = { ok: true } | { ok: false; reason: 'invalid-credentials' | 'network' };

interface AuthState {
  user: SessionUser | null;
  /** Sanctum bearer token — persisted, sent as `Authorization: Bearer <token>`. */
  token: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  isAuthenticated: boolean;
  /**
   * POV switcher (milestone 2): the employee the session is acting as.
   * `null` = the session user's own employee. Persisted inside the session
   * blob so a refresh keeps the POV. Unchanged by this slice — still reads
   * the mock Employee data; only the login path below is real.
   */
  actingAsEmployeeUuid: string | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  /** Best-effort `POST /auth/logout`, then clears local state. */
  logout: () => void;
  /** Clears local session state only — no network call. Used internally by
   *  the API client on a `401` so it doesn't recurse back into `logout()`. */
  clearSession: () => void;
  isExpired: () => boolean;
  /** Act as another persona without logging out. Audited (actor = real session user). */
  switchPov: (employeeUuid: string) => Promise<void>;
  /** Return to the session user's own POV. Audited like `switchPov`. */
  resetPov: () => Promise<void>;
  /** Re-fetch the current user from `GET /auth/me`. No-op when not authenticated or expired. */
  refreshSessionUser: () => Promise<void>;
  /** Locally flip `mustChangePassword` after a successful change — avoids an extra round-trip. */
  clearMustChangePassword: () => void;
}

/** Reverse-resolve a persona key from PERSONAS for audit context; falls back to the uuid. */
function personaKeyFor(employeeUuid: string): string {
  return (
    Object.entries(PERSONAS).find(([, uuid]) => uuid === employeeUuid)?.[0] ?? employeeUuid
  );
}

const STORAGE_KEY = 'devon.dashboard.session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      issuedAt: null,
      expiresAt: null,
      isAuthenticated: false,
      actingAsEmployeeUuid: null,
      login: async (email, password) => {
        try {
          const { token, user } = await apiLogin(email.trim(), password);
          const now = new Date();
          set({
            user: {
              uuid: user.uuid,
              email: user.email,
              fullName: user.fullName,
              roles: user.roles,
              mustChangePassword: user.mustChangePassword,
            },
            token,
            issuedAt: now.toISOString(),
            expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
            isAuthenticated: true,
          });
          return { ok: true };
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) {
            return { ok: false, reason: 'invalid-credentials' };
          }
          return { ok: false, reason: 'network' };
        }
      },
      logout: () => {
        const { token } = get();
        if (token) {
          void apiLogout().catch(() => {
            // Best-effort — local state is cleared regardless.
          });
        }
        get().clearSession();
      },
      clearSession: () =>
        set({
          user: null,
          token: null,
          issuedAt: null,
          expiresAt: null,
          isAuthenticated: false,
          actingAsEmployeeUuid: null,
        }),
      isExpired: () => {
        const exp = get().expiresAt;
        if (!exp) return true;
        return new Date(exp).getTime() < Date.now();
      },
      switchPov: async (employeeUuid) => {
        const session = get().user;
        if (!session) return;
        const employee = await getEmployee(employeeUuid);
        if (!employee) throw new Error(`Employee not found: ${employeeUuid}`);
        // Flip the POV before the audit write so the UI reacts immediately.
        set({ actingAsEmployeeUuid: employeeUuid });
        await appendAudit({
          actorUuid: session.uuid,
          actorName: session.fullName,
          action: 'POV_SWITCHED',
          resourceType: 'user',
          resourceUuid: session.uuid,
          resourceLabel: employee.fullNameGenerated,
          context: { to: personaKeyFor(employeeUuid) },
        });
      },
      resetPov: async () => {
        const session = get().user;
        if (!session || get().actingAsEmployeeUuid === null) return;
        set({ actingAsEmployeeUuid: null });
        await appendAudit({
          actorUuid: session.uuid,
          actorName: session.fullName,
          action: 'POV_SWITCHED',
          resourceType: 'user',
          resourceUuid: session.uuid,
          resourceLabel: session.fullName,
          context: { to: 'self' },
        });
      },
      refreshSessionUser: async () => {
        const current = get().user;
        if (!current || get().isExpired()) return;
        try {
          // Drop a persisted POV whose employee vanished in a reseed —
          // otherwise every acting-aware surface would resolve to nothing.
          const acting = get().actingAsEmployeeUuid;
          if (acting && !(await getEmployee(acting))) {
            set({ actingAsEmployeeUuid: null });
          }

          const fresh = await apiMe();
          set({
            user: {
              uuid: fresh.uuid,
              email: fresh.email,
              fullName: fresh.fullName,
              roles: fresh.roles,
              mustChangePassword: fresh.mustChangePassword,
            },
          });
        } catch {
          // Network hiccup (or a 401, already handled by the API client) —
          // swallow. The cached session keeps working; next refresh retries.
        }
      },
      clearMustChangePassword: () => {
        const current = get().user;
        if (!current) return;
        set({ user: { ...current, mustChangePassword: false } });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
