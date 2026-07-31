// Data-seam facade for the position catalogue (PLAN_PHASE_AB.md §1.3).
// `listPositions` re-exports either the real API (`src/lib/api/positions.ts`)
// or the localStorage mock (`src/lib/mock-backend`), switched centrally by
// `src/lib/data/config.ts`. The CRUD mutations (create/update/delete) exist
// only on the real backend — the mock never had a writable catalogue — so
// they re-export the real API unconditionally.

import * as mockBackend from '@/lib/mock-backend';
import * as realApi from '@/lib/api/positions';
import { dataSourceConfig } from './config';

export const listPositions =
  dataSourceConfig.positions === 'real' ? realApi.listPositions : mockBackend.listPositions;

export const createPosition = realApi.createPosition;
export const updatePosition = realApi.updatePosition;
export const deletePosition = realApi.deletePosition;
export { PositionValidationError } from '@/lib/api/positions';
export type { PositionInput, PositionValidationCode } from '@/lib/api/positions';
