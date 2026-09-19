/**
 * Server-side AOP wrapper for the Web backend REST API (`/api/**`).
 *
 * TS equivalent of Spring annotations:
 *   @PreAuthorize            → withApi({ role | permission })
 *   @Valid(Schema)           → withApi({ schema })
 *   @RestControllerAdvice    → handleServerError (unified {code,msg,data})
 *
 * NOTE: This module is SERVER-ONLY (imports `next/headers` via auth, pino via
 * logger). Client components must import the shared types/helpers from
 * `@/lib/server/api-response` and call endpoints through `@/lib/client/api`.
 *
 * The external LLM gateway for Claude/Codex lives OUTSIDE `/api`
 * (`/v1/**`, `/anthropic/**`) and is intentionally not wrapped here.
 */

import type { ZodSchema } from 'zod';
import {
  AppError,
  ErrorCodes,
  forbidden,
  unauthorized,
  businessRule,
  httpStatusFor,
} from './errors';
import { fieldErrorsFromZod } from '@/lib/validators';
import { getCurrentUser } from './auth';
import { hasPermission, hasRole } from '@/lib/permissions';
import type { AuthUser } from '@/lib/types';
import { logger } from './logger';
import { ok, toApiResponse, type ApiResponse } from './api-response';

// Re-export the shared surface so server code has a single import point.
export {
  type ApiResponse,
  ok,
  fail,
  initialApiResponse,
  INITIAL_CODE,
  fieldErrorsOf,
  toApiResponse,
} from './api-response';
export {
  AppError,
  ErrorCodes,
  isAppError,
  httpStatusFor,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  conflict,
  businessRule,
  insufficientBalance,
  rateLimited,
  internal,
  upstream,
} from './errors';

// ---------------------------------------------------------------------------
// Error normalization WITH logging (server-only)
// ---------------------------------------------------------------------------

/**
 * Next.js implements redirect/notFound via a thrown control-flow error with a
 * `digest`. Such errors must propagate untouched.
 */
function isNextControlFlow(err: unknown): boolean {
  const digest = (err as { digest?: unknown } | null)?.digest;
  return (
    typeof digest === 'string' &&
    (digest.startsWith('NEXT_REDIRECT') || digest.startsWith('NEXT_NOT_FOUND'))
  );
}

/** Log a thrown error and convert it to the unified shape. */
export function handleServerError<TResult = unknown>(err: unknown): ApiResponse<TResult> {
  if (isNextControlFlow(err)) throw err;
  if (err instanceof AppError) {
    if (err.httpStatus >= 500) {
      logger.error({ err }, '[api] server error');
    } else {
      logger.warn({ code: err.code, msg: err.msg, data: err.data }, '[api] business error');
    }
  } else {
    logger.error({ err }, '[api] unhandled error');
  }
  return toApiResponse<TResult>(err);
}

// ---------------------------------------------------------------------------
// Route Handler wrapper — `withApi`
// ---------------------------------------------------------------------------

export interface RouteContext {
  req: Request;
  /** Resolved dynamic route params. */
  params: Record<string, string>;
  /** Authenticated user (null for public routes). */
  user: AuthUser | null;
  /** Parsed body (validated when `schema` is set). */
  input?: unknown;
  /** Raw FormData when the request was a form/urlencoded POST/PUT. */
  formData?: FormData;
}

export interface WithApiOptions {
  /** RBAC permission code (`module:action`); verified when present. */
  permission?: string;
  /** Role gate. */
  role?: 'admin' | 'user';
  /** Zod schema applied to the parsed body (JSON object or form object). */
  schema?: ZodSchema;
  /** Parse the body even without a schema. JSON → object, form → Object.fromEntries. */
  body?: 'json' | 'form';
  /** Pre-process raw FormData before schema validation (e.g. checkbox 'on' → bool). */
  transformFormData?: (formData: FormData) => unknown;
}

type RouteHandler = (
  ctx: RouteContext,
) => Promise<ApiResponse | Response | void>;

/**
 * Wrap a Route Handler with auth/RBAC, body parsing + validation, unified
 * error handling, and a one-line structured access log.
 */
export function withApi(options: WithApiOptions, handler: RouteHandler) {
  return async (
    req: Request,
    ctx: { params?: Promise<Record<string, string>> } = {},
  ): Promise<Response> => {
    const startedAt = Date.now();
    const path = (() => {
      try {
        return new URL(req.url).pathname;
      } catch {
        return req.url;
      }
    })();

    let user: AuthUser | null = null;
    let outcomeCode: string = ErrorCodes.OK;
    let response: Response;

    try {
      // ---- 1. Auth / RBAC gate ------------------------------------------
      if (options.role || options.permission) {
        user = await getCurrentUser();
        if (!user) throw unauthorized();
        if (options.role === 'admin' && !hasRole(user, 'admin')) throw forbidden();
        if (options.permission && !hasPermission(user, options.permission)) throw forbidden();
      }

      // ---- 2. Body parsing + validation ---------------------------------
      let input: unknown;
      let formData: FormData | undefined;
      if (options.schema || options.body) {
        const contentType = req.headers.get('content-type') ?? '';
        if (contentType.includes('application/json')) {
          try {
            input = await req.json();
          } catch {
            throw businessRule('请求体不是有效的 JSON');
          }
        } else {
          formData = await req.formData();
          input = options.transformFormData
            ? options.transformFormData(formData)
            : Object.fromEntries(formData);
        }

        if (options.schema) {
          const parsed = options.schema.safeParse(input);
          if (!parsed.success) {
            throw new AppError(
              ErrorCodes.VALIDATION_FAILED,
              '参数校验失败',
              undefined,
              { fieldErrors: fieldErrorsFromZod(parsed.error) },
            );
          }
          input = parsed.data;
        }
      }

      // ---- 3. Run handler -----------------------------------------------
      const params = ctx.params ? await ctx.params : {};
      const result = await handler({ req, params, user, input, formData });

      if (result instanceof Response) {
        response = result; // handler bypassed the envelope (e.g. raw webhook)
      } else {
        const body = result ?? ok({}, 'OK');
        outcomeCode = body.code;
        response = Response.json(body, { status: 200 });
      }
    } catch (err) {
      if (isNextControlFlow(err)) throw err;
      const body = handleServerError(err);
      outcomeCode = body.code;
      const status =
        err instanceof AppError ? err.httpStatus : httpStatusFor(body.code);
      response = Response.json(body, { status });
    }

    logger.info(
      {
        method: req.method,
        path,
        userId: user?.id,
        code: outcomeCode,
        status: response.status,
        durationMs: Date.now() - startedAt,
      },
      '[api:access]',
    );
    return response;
  };
}
