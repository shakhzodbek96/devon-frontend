// POV resolution (milestone 2). Every M2 page resolves the acting persona
// through this hook to decide queue contents + action visibility, and passes
// `employee.uuid` as `actorUuid` into every mutation.
//
// PLAN_PHASE_F1.md §0 (foundational fix): this used to resolve the acting
// employee from the MOCK employees table (`src/lib/mock-backend`), whose
// `userUuid` values never match a REAL Sanctum session's uuid — every M2
// page hung forever on a real login. Employee + unit resolution now goes
// through the data facade (`src/lib/data/*`, already 'real' since Phase C
// / A+B), which reads the actual backend row for `sessionUser.uuid`. The
// five POV personas are seeded with IDENTICAL uuids in both the mock
// localStorage table and the real DB (EmployeesSeeder::PERSONAS), so the
// POV switcher below keeps resolving correctly for the still-mock
// `letters`/`tasks` modules — only the *source* of the employee/unit rows
// changed, not the uuids those modules key off.
//
// Real document mutations always take the AUTHENTICATED user's own employee
// as actor (server-enforced, per-document — never a client-supplied "act as
// anyone"). `isSelf` below reflects exactly that: true unless the POV
// switcher has selected a different persona.

import { useEffect, useState } from 'react';

import { getEmployee, listEmployees } from '@/lib/data/employees';
import { listUnits } from '@/lib/data/units';
import { findUserByEmployee } from '@/lib/mock-backend';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Employee, Role, User } from '@/types/domain';

export interface ActingContext {
  /** The acting persona (falls back to the session user's own employee). */
  employee: Employee;
  /**
   * Persona's user row (roles source) when acting as someone else — read
   * from the mock users table (demo-only, cosmetic; see module doc above).
   * `undefined` when acting as self (self roles come from the real session
   * instead — see `roles`) or when the employee has no mock user row.
   */
  user: User | undefined;
  roles: Role[];
  /** Units where the persona is `headEmployeeUuid` — drives approval queues. */
  headedUnitUuids: string[];
  /** True when acting as the session user's own employee. */
  isSelf: boolean;
}

/**
 * Resolve the acting persona from the real backend (employee + units).
 * Re-resolves whenever `actingAsEmployeeUuid` (or the session) changes —
 * that per-key effect is the memoisation; a module-level cache would go
 * stale across reseeds. Returns `null` while loading or when unauthenticated.
 */
export function useActingEmployee(): ActingContext | null {
  const sessionUser = useAuthStore((s) => s.user);
  const actingAsEmployeeUuid = useAuthStore((s) => s.actingAsEmployeeUuid);
  const [ctx, setCtx] = useState<ActingContext | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!sessionUser) {
      setCtx(null);
      return;
    }
    setCtx(null);
    void (async () => {
      try {
        let employee: Employee | null = null;
        if (actingAsEmployeeUuid) {
          employee = await getEmployee(actingAsEmployeeUuid);
        }
        if (!employee) {
          // Own POV (or a stale acting uuid) — resolve via the session user.
          const employees = await listEmployees();
          employee = employees.find((e) => e.userUuid === sessionUser.uuid) ?? null;
        }
        if (!employee) {
          if (!cancelled) setCtx(null);
          return;
        }
        const isSelf = employee.userUuid === sessionUser.uuid;
        const [mockUser, units] = await Promise.all([
          // Self roles come from the authenticated session (always correct,
          // no extra round-trip); a switched-POV persona's roles are a
          // demo-only read of the mock users table — never used to
          // authorize a real mutation, which the backend gates itself
          // against the actual authenticated user regardless of this value.
          isSelf ? Promise.resolve(null) : findUserByEmployee(employee.uuid),
          listUnits(),
        ]);
        if (cancelled) return;
        const employeeUuid = employee.uuid;
        setCtx({
          employee,
          user: mockUser ?? undefined,
          roles: isSelf ? sessionUser.roles : (mockUser?.roles ?? []),
          headedUnitUuids: units
            .filter((u) => u.headEmployeeUuid === employeeUuid)
            .map((u) => u.uuid),
          isSelf,
        });
      } catch {
        // Simulated network flake on a read — leave ctx null; the next
        // POV/session change retries.
        if (!cancelled) setCtx(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionUser, actingAsEmployeeUuid]);

  return ctx;
}
