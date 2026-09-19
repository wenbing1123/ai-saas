/**
 * Unified API response shape — CLIENT-SAFE shared module.
 *
 * This file must stay free of any server-only import (no `next/headers`,
 * no pino/logger, no db): it is imported both by Route Handlers on the
 * server AND by client components / the browser fetch helper.
 *
 * Every Web backend endpoint under `/api/**` returns:
 *   { code: string; msg: string; data: T }
 *   - code === '0000' → success
 *   - otherwise       → a 4-digit business error code (see ErrorCodes)
 *
 * Server-side logging lives in `wrappers.ts` (`handleServerError`).
 */

import { AppError, ErrorCodes } from './errors';

export interface ApiResponse<T = unknown> {
  /** '0000' = success; otherwise a 4-digit business error code. */
  code: string;
  /** Human-readable message. */
  msg: string;
  /** Payload on success; structured error context (e.g. { fieldErrors }) on failure. */
  data: T;
}

/** Build a success response. */
export function ok<T>(data: T, msg = 'OK'): ApiResponse<T> {
  return { code: ErrorCodes.OK, msg, data };
}

/** Build a failure response without throwing. `data` is intentionally unknown. */
export function fail<T = unknown>(code: string, msg: string, data?: unknown): ApiResponse<T> {
  return { code, msg, data: (data ?? {}) as T };
}

/**
 * Sentinel code for the "request not sent yet" UI state. Distinct from
 * `'0000'` so success panels never render on first paint.
 */
export const INITIAL_CODE = '';

/** Neutral initial state for client-side request state (`useState`). */
export function initialApiResponse<T = unknown>(): ApiResponse<T> {
  return { code: INITIAL_CODE, msg: '', data: {} as T };
}

/** Extract `fieldErrors` from an ApiResponse's data payload (if present). */
export function fieldErrorsOf(res: ApiResponse): Record<string, string> | undefined {
  return (res.data as { fieldErrors?: Record<string, string> })?.fieldErrors;
}

/**
 * Pure conversion of a thrown value into an ApiResponse (no I/O, no logging).
 * AppError keeps its code/msg/data; anything else becomes INTERNAL.
 * Server callers that want logging use `handleServerError` from `wrappers.ts`.
 */
export function toApiResponse<TResult = unknown>(err: unknown): ApiResponse<TResult> {
  if (err instanceof AppError) {
    return { code: err.code, msg: err.msg, data: (err.data ?? {}) as TResult };
  }
  return { code: ErrorCodes.INTERNAL, msg: '服务器内部错误', data: {} as TResult };
}
