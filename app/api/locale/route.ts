import { cookies } from 'next/headers';
import { withApi, ok, badRequest } from '@/lib/server/wrappers';
import { LOCALE_COOKIE, type Locale } from '@/lib/i18n/types';

/** Persist the user's explicit language choice (wins over auto-detection). */
export const POST = withApi({ body: 'json' }, async ({ input }) => {
  const locale = (input as { locale?: string }).locale;
  if (locale !== 'zh' && locale !== 'en') {
    throw badRequest('Unsupported locale.');
  }
  cookies().set(LOCALE_COOKIE, locale as Locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
  return ok({ locale });
});
