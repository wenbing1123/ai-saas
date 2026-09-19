/**
 * Unified application error model.
 *
 * Inspired by Java AOP exception chains (`@ControllerAdvice` / `@RestControllerAdvice`):
 * business code throws a typed `AppError`; the wrapper layer catches it and
 * serializes it into the unified response shape `{ code, msg, data }`. Any
 * non-AppError is treated as `INTERNAL` (HTTP 500) and logged with stack.
 *
 * Code conventions (fixed 4-digit strings)
 * -----------------------------------------
 *   0000     OK                  success
 *   1xxx     Client-side errors (4xx HTTP)
 *   2xxx     Server-side errors (5xx HTTP)
 *
 * Adding a new code:
 *   1. Append it to `ErrorCodes` below.
 *   2. Add a helper constructor if the code is thrown from many places.
 *   3. Map an HTTP status in `httpStatusFor(code)` if not the default 400.
 */

/**
 * Canonical business/HTTP error codes.
 * All values are 4-digit strings so the JSON response shows a fixed-width code.
 * Keep stable — clients may switch on these.
 */
export const ErrorCodes = {
  /** Success. */
  OK: '0000',

  // ---- 1xxx — Client-side (4xx) ----
  /** 401 — not signed in / session expired. */
  UNAUTHENTICATED: '1001',
  /** 403 — signed in but lacks the required role / permission. */
  FORBIDDEN: '1002',
  /** 400 — request body / form failed schema validation. */
  VALIDATION_FAILED: '1003',
  /** 404 — resource not found. */
  NOT_FOUND: '1004',
  /** 402 — would result in a negative balance. */
  INSUFFICIENT_BALANCE: '1005',
  /** 503 — platform is in maintenance mode. */
  MAINTENANCE: '1006',
  /** 429 — rate limited (RPM / concurrency). */
  RATE_LIMITED: '1007',
  /** 409 — unique-constraint / state-transition violation. */
  CONFLICT: '1008',
  /** 410 — token expired / revoked / already used. */
  TOKEN_INVALID: '1009',
  /** 422 — business rule violation (e.g. selling price < cost). */
  BUSINESS_RULE: '1010',

  // ---- 2xxx — Server-side (5xx) ----
  /** 500 — unexpected internal error. */
  INTERNAL: '2001',
  /** 502 — upstream provider call failed. */
  UPSTREAM: '2002',
  /** 503 — dependent service (Redis / PG) unavailable. */
  SERVICE_UNAVAILABLE: '2003',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/** Default HTTP status for a given business code. Falls back to 400. */
export function httpStatusFor(code: string): number {
  switch (code) {
    case ErrorCodes.OK:
      return 200;
    case ErrorCodes.UNAUTHENTICATED:
      return 401;
    case ErrorCodes.FORBIDDEN:
      return 403;
    case ErrorCodes.NOT_FOUND:
      return 404;
    case ErrorCodes.INSUFFICIENT_BALANCE:
      return 402;
    case ErrorCodes.MAINTENANCE:
      return 503;
    case ErrorCodes.RATE_LIMITED:
      return 429;
    case ErrorCodes.CONFLICT:
    case ErrorCodes.BUSINESS_RULE:
      return 409;
    case ErrorCodes.TOKEN_INVALID:
      return 410;
    case ErrorCodes.INTERNAL:
      return 500;
    case ErrorCodes.UPSTREAM:
      return 502;
    case ErrorCodes.SERVICE_UNAVAILABLE:
      return 503;
    default:
      return 400;
  }
}

/**
 * Typed application error. Throw from anywhere in a wrapped handler; the
 * wrapper converts it to the unified JSON response.
 *
 * @example
 *   throw notFound('Document not found');
 *   throw forbidden('需要 doc:manage 权限');
 *   throw new AppError(ErrorCodes.BUSINESS_RULE, '售价不能低于成本', 409, { field: 'sellInputPer1m' });
 */
export class AppError extends Error {
  readonly code: string;
  readonly httpStatus: number;
  readonly data: unknown;
  /** Public alias for `Error.message` so callers can read `err.msg`. */
  readonly msg: string;

  constructor(
    code: string,
    msg: string,
    httpStatus?: number,
    data?: unknown,
  ) {
    super(msg);
    this.name = 'AppError';
    this.msg = msg;
    this.code = code;
    this.httpStatus = httpStatus ?? httpStatusFor(code);
    this.data = data;
  }
}

// ---- Helper constructors (most common cases) ----

export const unauthorized = (msg = '请先登录', data?: unknown): AppError =>
  new AppError(ErrorCodes.UNAUTHENTICATED, msg, undefined, data);

export const forbidden = (msg = '权限不足', data?: unknown): AppError =>
  new AppError(ErrorCodes.FORBIDDEN, msg, undefined, data);

export const notFound = (msg = '资源不存在', data?: unknown): AppError =>
  new AppError(ErrorCodes.NOT_FOUND, msg, undefined, data);

export const badRequest = (msg = '请求参数有误', data?: unknown): AppError =>
  new AppError(ErrorCodes.VALIDATION_FAILED, msg, undefined, data);

export const conflict = (msg = '资源冲突', data?: unknown): AppError =>
  new AppError(ErrorCodes.CONFLICT, msg, undefined, data);

export const businessRule = (msg: string, data?: unknown): AppError =>
  new AppError(ErrorCodes.BUSINESS_RULE, msg, undefined, data);

export const insufficientBalance = (msg = '余额不足', data?: unknown): AppError =>
  new AppError(ErrorCodes.INSUFFICIENT_BALANCE, msg, undefined, data);

export const rateLimited = (msg = '请求过于频繁，请稍后再试', data?: unknown): AppError =>
  new AppError(ErrorCodes.RATE_LIMITED, msg, undefined, data);

export const internal = (msg = '服务器内部错误', data?: unknown): AppError =>
  new AppError(ErrorCodes.INTERNAL, msg, undefined, data);

export const upstream = (msg = '上游服务调用失败', data?: unknown): AppError =>
  new AppError(ErrorCodes.UPSTREAM, msg, undefined, data);

/** Type guard — useful inside catch blocks. */
export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
