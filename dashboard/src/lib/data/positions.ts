// Data-seam facade for the position catalogue (PLAN_PHASE_AB.md §1.3).
// Re-exports either the real API (`src/lib/api/positions.ts`) or the
// localStorage mock (`src/lib/mock-backend`), switched centrally by
// `src/lib/data/config.ts`.

import * as mockBackend from '@/lib/mock-backend';
import * as realApi from '@/lib/api/positions';
import { dataSourceConfig } from './config';

export const listPositions =
  dataSourceConfig.positions === 'real' ? realApi.listPositions : mockBackend.listPositions;
