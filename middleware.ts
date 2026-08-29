import { NextRequest, NextResponse } from 'next/server';

const SUPPORTED_LOCALES = ['en', 'zh'] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

function detectLocale(request: NextRequest): Locale {
  const cookieLocale = request.cookies.get('next-intl-locale')?.value;
  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale as Locale)) {
    return cookieLocale as Locale;
  }

  const acceptLanguage = request.headers.get('accept-language') ?? '';
  const preferred = acceptLanguage
    .split(',')[0]
    .trim()
    .split('-')[0]
    .toLowerCase();

  if (preferred.startsWith('zh')) {
    return 'zh';
  }

  return 'en';
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api') || pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  const locale = detectLocale(request);
  const response = NextResponse.next();

  if (!request.cookies.has('next-intl-locale')) {
    response.cookies.set('next-intl-locale', locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};