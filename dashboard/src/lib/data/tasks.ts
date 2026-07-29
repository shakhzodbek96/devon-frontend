// Data-seam facade for the task delegation / Kanban module (PLAN_PHASE_H.md
// §5 — the LAST mock module). Re-exports either the real API
// (`src/lib/api/tasks.ts`) or the localStorage mock (`src/lib/mock-backend`)
// under one stable signature, switched centrally by `src/lib/data/config.ts`.
// `src/features/tasks/*` — Kanban, create, detail, all lifecycle dialogs —
// imports from here.

import * as mockBackend from '@/lib/mock-backend';
import * as realApi from '@/lib/api/tasks';
import { dataSourceConfig } from './config';

export { MockNetworkError, TaskValidationError } from '@/lib/mock-backend/errors';
export type {
  CreateTaskInput,
  ReviewTaskInput,
  SubmitDeliverableInput,
  TaskDetail,
  TaskFilters,
  TaskReviewDecision,
  TaskStats,
  UpdateTaskInput,
} from '@/lib/api/tasks';

// Pure client-side logic (deadline vs. today, no I/O) — identical either way,
// so it is never switched by `dataSourceConfig`.
export { isTaskOverdue } from '@/lib/mock-backend';

export const listTasks = dataSourceConfig.tasks === 'real' ? realApi.listTasks : mockBackend.listTasks;

export const getTask = dataSourceConfig.tasks === 'real' ? realApi.getTask : mockBackend.getTask;

export const getTaskStats =
  dataSourceConfig.tasks === 'real' ? realApi.getTaskStats : mockBackend.getTaskStats;

export const createTask =
  dataSourceConfig.tasks === 'real' ? realApi.createTask : mockBackend.createTask;

export const updateTask =
  dataSourceConfig.tasks === 'real' ? realApi.updateTask : mockBackend.updateTask;

export const startTask =
  dataSourceConfig.tasks === 'real' ? realApi.startTask : mockBackend.startTask;

export const requestClarification =
  dataSourceConfig.tasks === 'real' ? realApi.requestClarification : mockBackend.requestClarification;

export const answerClarification =
  dataSourceConfig.tasks === 'real' ? realApi.answerClarification : mockBackend.answerClarification;

export const submitDeliverable =
  dataSourceConfig.tasks === 'real' ? realApi.submitDeliverable : mockBackend.submitDeliverable;

export const reviewTask =
  dataSourceConfig.tasks === 'real' ? realApi.reviewTask : mockBackend.reviewTask;
