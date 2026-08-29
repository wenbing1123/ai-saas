import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export const locales = ['en', 'zh'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

/**
 * Pinned so the server and the client render identical markup regardless of the
 * host machine's local zone. Shared with the client provider in `app/layout.tsx`.
 */
export const timeZone = 'UTC';

function isLocale(value: string | undefined): value is Locale {
  return !!value && locales.includes(value as Locale);
}

export default getRequestConfig(async () => {
  // There is no `[locale]` segment in the routes, so the locale never comes
  // from the pathname. Resolve it from the cookie the middleware sets and fall
  // back to the default instead of 404-ing.
  const cookieLocale = cookies().get('next-intl-locale')?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  return {
    locale,
    timeZone,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
