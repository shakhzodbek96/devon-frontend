import { create } from 'zustand';

/**
 * Global "an unhandled backend exception happened" signal. `apiFetch`
 * (`src/lib/api/client.ts`) reports here for anything that isn't one of the
 * app's ~20 intentional business-error classes — a real PHP exception, a
 * 500, a route/model-not-found, etc. `ExceptionModal` (mounted once in
 * `App.tsx`) renders whatever's here full-detail, independent of whether the
 * calling feature's own try/catch also shows its own toast.
 */
export interface CapturedException {
  status: number;
  method: string;
  path: string;
  message: string;
  exception?: string;
  file?: string;
  line?: number;
  trace?: unknown;
  raw: unknown;
  occurredAt: string;
}

interface ExceptionState {
  current: CapturedException | null;
  report: (e: Omit<CapturedException, 'occurredAt'>) => void;
  clear: () => void;
}

export const useExceptionStore = create<ExceptionState>((set) => ({
  current: null,
  report: (e) => set({ current: { ...e, occurredAt: new Date().toISOString() } }),
  clear: () => set({ current: null }),
}));
