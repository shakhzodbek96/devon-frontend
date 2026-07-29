// Data-seam facade for the Employees module (PLAN_PHASE_C.md §4). Re-exports
// either the real API (`src/lib/api/employees.ts`) or the localStorage mock
// (`src/lib/mock-backend`) under one stable signature, switched centrally
// by `src/lib/data/config.ts`. Only the components listed in
// PLAN_PHASE_C.md §4 import from here — `src/lib/acting.ts` and all of
// `src/features/{documents,letters,tasks}/*` stay on the mock directly
// (intentional hybrid — see PLAN_PHASE_C.md §0.2).

import * as mockBackend from '@/lib/mock-backend';
import * as realApi from '@/lib/api/employees';
import { dataSourceConfig } from './config';

export { EmployeeValidationError, MockNetworkError } from '@/lib/mock-backend/errors';
export type { CreateEmployeeFullInput, EmployeeFilters, UpdateEmployeeInput } from '@/lib/api/employees';

export const listEmployees =
  dataSourceConfig.employees === 'real' ? realApi.listEmployees : mockBackend.listEmployees;
export const getEmployee =
  dataSourceConfig.employees === 'real' ? realApi.getEmployee : mockBackend.getEmployee;
export const createEmployeeFull =
  dataSourceConfig.employees === 'real' ? realApi.createEmployeeFull : mockBackend.createEmployeeFull;
export const updateEmployee =
  dataSourceConfig.employees === 'real' ? realApi.updateEmployee : mockBackend.updateEmployee;
export const terminateEmployee =
  dataSourceConfig.employees === 'real' ? realApi.terminateEmployee : mockBackend.terminateEmployee;

/**
 * The mock and real implementations return structurally different "user"
 * shapes (mock's full `User` vs. the real API's `ApiSessionUser`) — this
 * common subset is all every caller (`Step2Contact`, `UpdateEmployeeSheet`,
 * `ProfilePage`) actually reads.
 */
export interface FoundUser {
  uuid: string;
  email: string;
  employeeUuid?: string;
  mustChangePassword: boolean;
  passwordChangedAt?: string;
}

export async function findUserByEmail(email: string): Promise<FoundUser | null> {
  return dataSourceConfig.employees === 'real'
    ? realApi.findUserByEmail(email)
    : mockBackend.findUserByEmail(email);
}

export const validatePinfl =
  dataSourceConfig.employees === 'real'
    ? realApi.validatePinfl
    : async (pinfl: string) => {
        const all = await mockBackend.listEmployees();

        return all.some((e) => e.pinfl === pinfl && e.status !== 'TERMINATED');
      };
