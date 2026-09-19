/**
 * Browser-side fetch client for the Web backend REST API (`/api/**`).
 *
 * Client-safe: only imports from `@/lib/server/api-response` (no server-only
 * modules). Every call resolves to the unified `ApiResponse<T>` shape — the
 * promise never rejects on a business/HTTP error (those are returned as a
 * normal ApiResponse), only the helper fills a synthetic response on network
 * failure.
 *
 * Requests show up in Chrome DevTools → Network → Fetch/XHR as plain JSON:
 *   POST /api/tokens → { "code": "0000", "msg": "OK", "data": { ... } }
 */
'use client';

import { fail, type ApiResponse } from '@/lib/server/api-response';

type Json = Record<string, unknown> | unknown[];

async function request<T>(
  method: string,
  url: string,
  body?: FormData | Json,
): Promise<ApiResponse<T>> {
  let res: Response;
  try {
    const init: RequestInit = { method, credentials: 'same-origin' };
    if (body !== undefined) {
      if (body instanceof FormData) {
        // Let the browser set the multipart boundary.
        init.body = body;
      } else {
        init.headers = { 'content-type': 'application/json' };
        init.body = JSON.stringify(body);
      }
    }
    res = await fetch(url, init);
  } catch {
    return fail<T>('2001', '网络异常，请检查连接后重试');
  }

  try {
    return (await res.json()) as ApiResponse<T>;
  } catch {
    return fail<T>('2001', `服务返回异常（HTTP ${res.status}）`);
  }
}

export const apiGet = <T = unknown>(url: string) => request<T>('GET', url);

export const apiPostForm = <T = unknown>(url: string, form: FormData) =>
  request<T>('POST', url, form);
export const apiPutForm = <T = unknown>(url: string, form: FormData) =>
  request<T>('PUT', url, form);

export const apiPostJson = <T = unknown>(url: string, body?: Json) =>
  request<T>('POST', url, body ?? {});
export const apiPutJson = <T = unknown>(url: string, body?: Json) =>
  request<T>('PUT', url, body ?? {});
export const apiPatchJson = <T = unknown>(url: string, body?: Json) =>
  request<T>('PATCH', url, body ?? {});

export const apiDelete = <T = unknown>(url: string) => request<T>('DELETE', url);
