// Real backend for the task delegation / Kanban module (milestone 3,
// PLAN_PHASE_H.md §5, BP-2 — the LAST mock module). Signature-compatible
// with the mock's `listTasks` / `getTask` / `getTaskStats` / `createTask` /
// `updateTask` / `startTask` / `requestClarification` / `answerClarification`
// / `submitDeliverable` / `reviewTask` (`src/lib/mock-backend/index.ts`) so
// `src/lib/data/tasks.ts` can re-export either implementation unchanged.
//
// Error translation: business-rule violations come back from the API as a
// 422 `{ code, message }` body (`bootstrap/app.php` on the backend). We
// reuse the mock's own `TaskValidationError` / `MockNetworkError` classes
// (framework-agnostic — no localStorage dependency) so every consumer's
// `err instanceof TaskValidationError` check works identically against
// either backend.
//
// Actor: every mutation here accepts an `_actorUuid` parameter purely for
// signature compatibility with the mock — the real backend always acts as
// the AUTHENTICATED user's own employee (`request.user().employee_uuid`),
// never a client-supplied uuid (same privilege-escalation guard as
// `src/lib/api/letters.ts`).

import {
  MockNetworkError,
  TaskValidationError,
  type TaskValidationCode,
} from '@/lib/mock-backend/errors';
import type { FileMeta, TaskEntity, TaskPriority, TaskStatus } from '@/types/domain';
import { apiFetch, ApiError } from './client';

const KNOWN_CODES: readonly TaskValidationCode[] = [
  'not-assigner',
  'not-assignee',
  'out-of-scope',
  'wrong-status',
  'reason-required',
  'self-assign',
];

function isTaskValidationCode(code: string | undefined): code is TaskValidationCode {
  return !!code && (KNOWN_CODES as readonly string[]).includes(code);
}

/** Rethrows `err` translated to the mock's error vocabulary; always throws. */
function rethrow(err: unknown): never {
  if (err instanceof ApiError) {
    if (isTaskValidationCode(err.code)) throw new TaskValidationError(err.code);
    if (err.status === 0) throw new MockNetworkError();
  }
  throw err;
}

export interface TaskFilters {
  box: 'assigned-by-me' | 'assigned-to-me';
  status?: TaskStatus;
  priority?: TaskPriority;
  overdueOnly?: boolean;
  search?: string;
}

export async function listTasks(filters: TaskFilters, _actingUuid: string): Promise<TaskEntity[]> {
  const params = new URLSearchParams();
  params.set('box', filters.box);
  if (filters.status) params.set('status', filters.status);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.overdueOnly) params.set('overdueOnly', 'true');
  if (filters.search) params.set('search', filters.search);

  try {
    return await apiFetch<TaskEntity[]>(`/tasks?${params.toString()}`);
  } catch (err) {
    rethrow(err);
  }
}

export interface TaskDetail extends TaskEntity {
  assignerName: string;
  assigneeName: string;
  assigneePositionUz?: string;
  assigneeUnitNameUz?: string;
  attachedDocumentNumber?: string;
  attachedDocumentTitle?: string;
  deliverableDocumentNumber?: string;
  commentAuthors: Record<string, string>;
}

export async function getTask(uuid: string): Promise<TaskDetail | null> {
  try {
    return await apiFetch<TaskDetail>(`/tasks/${uuid}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    rethrow(err);
  }
}

export interface TaskStats {
  byStatus: Record<TaskStatus, number>;
  overdueCount: number;
  loadPerAssignee: { assigneeUuid: string; assigneeName: string; openCount: number }[];
}

export async function getTaskStats(_actingUuid: string): Promise<TaskStats> {
  try {
    return await apiFetch<TaskStats>('/me/task-stats');
  } catch (err) {
    rethrow(err);
  }
}

export interface CreateTaskInput {
  title: string;
  description: string;
  priority: TaskPriority;
  assigneeUuid: string;
  deadline: string;
  attachedDocumentUuid?: string;
  attachedFile?: FileMeta;
}

export async function createTask(input: CreateTaskInput, _actorUuid: string): Promise<TaskEntity> {
  try {
    return await apiFetch<TaskEntity>('/tasks', { method: 'POST', body: input });
  } catch (err) {
    rethrow(err);
  }
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  deadline?: string;
}

export async function updateTask(
  uuid: string,
  input: UpdateTaskInput,
  _actorUuid: string,
): Promise<TaskEntity> {
  try {
    return await apiFetch<TaskEntity>(`/tasks/${uuid}`, { method: 'PATCH', body: input });
  } catch (err) {
    rethrow(err);
  }
}

export async function startTask(uuid: string, _actorUuid: string): Promise<TaskEntity> {
  try {
    return await apiFetch<TaskEntity>(`/tasks/${uuid}/start`, { method: 'POST' });
  } catch (err) {
    rethrow(err);
  }
}

export async function requestClarification(
  uuid: string,
  body: string,
  _actorUuid: string,
): Promise<TaskEntity> {
  try {
    return await apiFetch<TaskEntity>(`/tasks/${uuid}/clarification-request`, {
      method: 'POST',
      body: { body },
    });
  } catch (err) {
    rethrow(err);
  }
}

export async function answerClarification(
  uuid: string,
  body: string,
  _actorUuid: string,
): Promise<TaskEntity> {
  try {
    return await apiFetch<TaskEntity>(`/tasks/${uuid}/clarification-answer`, {
      method: 'POST',
      body: { body },
    });
  } catch (err) {
    rethrow(err);
  }
}

export interface SubmitDeliverableInput {
  summary: string;
  file?: FileMeta;
  documentUuid?: string;
}

export async function submitDeliverable(
  uuid: string,
  input: SubmitDeliverableInput,
  _actorUuid: string,
): Promise<TaskEntity> {
  try {
    return await apiFetch<TaskEntity>(`/tasks/${uuid}/submit`, { method: 'POST', body: input });
  } catch (err) {
    rethrow(err);
  }
}

export type TaskReviewDecision = 'ACCEPT' | 'ACCEPT_WITH_NOTE' | 'RETURN' | 'REJECT';

export interface ReviewTaskInput {
  decision: TaskReviewDecision;
  text?: string;
}

export async function reviewTask(
  uuid: string,
  input: ReviewTaskInput,
  _actorUuid: string,
): Promise<TaskEntity> {
  try {
    return await apiFetch<TaskEntity>(`/tasks/${uuid}/review`, { method: 'POST', body: input });
  } catch (err) {
    rethrow(err);
  }
}

