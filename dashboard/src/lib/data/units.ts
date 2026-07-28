// Data-seam facade for the organizational structure tree (PLAN_PHASE_AB.md
// §1.3, §2.5). Re-exports either the real API (`src/lib/api/units.ts`) or
// the localStorage mock (`src/lib/mock-backend`) under one stable
// signature, switched centrally by `src/lib/data/config.ts`.
// `src/features/units/*` imports from here — never straight from the mock.

import * as mockBackend from '@/lib/mock-backend';
import * as realApi from '@/lib/api/units';
import { dataSourceConfig } from './config';

export { MockNetworkError, UnitValidationError } from '@/lib/mock-backend/errors';
export type { CreateUnitInput, UpdateUnitInput } from '@/lib/api/units';

export const listUnits = dataSourceConfig.units === 'real' ? realApi.listUnits : mockBackend.listUnits;
export const getUnit = dataSourceConfig.units === 'real' ? realApi.getUnit : mockBackend.getUnit;
export const createUnit =
  dataSourceConfig.units === 'real' ? realApi.createUnit : mockBackend.createUnit;
export const updateUnit =
  dataSourceConfig.units === 'real' ? realApi.updateUnit : mockBackend.updateUnit;
export const archiveUnit =
  dataSourceConfig.units === 'real' ? realApi.archiveUnit : mockBackend.archiveUnit;
