'use server';

import { cookies } from 'next/headers';
import { LOCALE_COOKIE, type Locale } from '@/lib/i18n/types';

/** Persist the user's explicit language choice (wins over auto-detection). */
export async function setLocaleAction(locale: Locale): Promise<void> {
  if (locale !== 'zh' && locale !== 'en') return;
  cookies().set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
}
