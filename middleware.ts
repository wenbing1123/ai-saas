import { NextRequest, NextResponse } from 'next/server';

const LOCALE_COOKIE = 'nebula_locale';

/**
 * Auto-detect locale on first visit:
 *   - geo country headers (Vercel / Cloudflare): CN → Chinese
 *   - fallback: Accept-Language preference starting with zh
 * The result is exposed to server components via the `x-nebula-locale`
 * request header (correct first paint) and persisted in a cookie.
 * An existing cookie (user's explicit choice) always wins.
 */
function detectLocale(req: NextRequest): 'zh' | 'en' {
  const country =
    req.headers.get('x-vercel-ip-country') ?? req.headers.get('cf-ipcountry');
  if (country) return country.toUpperCase() === 'CN' ? 'zh' : 'en';

  const lang = req.headers.get('accept-language') ?? '';
  return /(?:^|,)\s*zh(?:[-_;,\s)]|$)/i.test(lang) ? 'zh' : 'en';
}

export function middleware(req: NextRequest) {
  const locale = detectLocale(req);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nebula-locale', locale);

  const res = NextResponse.next({ request: { headers: requestHeaders } });

  const existing = req.cookies.get(LOCALE_COOKIE)?.value;
  if (existing !== 'zh' && existing !== 'en') {
    res.cookies.set(LOCALE_COOKIE, locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  }
  return res;
}

export const config = {
  matcher: [
    // All pages except Next internals, static assets, and API/gateway routes.
    '/((?!_next/static|_next/image|favicon\\.ico|api/|v1/|anthropic/|[^?]*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)',
  ],
};
