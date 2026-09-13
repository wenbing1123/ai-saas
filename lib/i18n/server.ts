import { cookies, headers } from 'next/headers';
import { LOCALE_COOKIE, type Locale } from './types';

/**
 * Resolve the active locale:
 *   1. explicit choice persisted in the `nebula_locale` cookie
 *   2. auto-detection provided by middleware (geo country / Accept-Language)
 *      via the `x-nebula-locale` request header
 *   3. English fallback
 */
export function getLocale(): Locale {
  const cookie = cookies().get(LOCALE_COOKIE)?.value;
  if (cookie === 'zh' || cookie === 'en') return cookie;

  const detected = headers().get('x-nebula-locale');
  if (detected === 'zh' || detected === 'en') return detected;

  return 'en';
}
