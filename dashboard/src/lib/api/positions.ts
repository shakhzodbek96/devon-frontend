// Real backend for the seeded position catalogue (PLAN_PHASE_AB.md §1.2).
// Signature-compatible with the mock's `listPositions`
// (`src/lib/mock-backend/index.ts`).

import type { Position } from '@/types/domain';
import { apiFetch } from './client';

export function listPositions(): Promise<Position[]> {
  return apiFetch<Position[]>('/positions');
}
