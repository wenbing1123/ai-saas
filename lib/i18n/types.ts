export type Locale = 'en' | 'zh';

export const LOCALES: Locale[] = ['en', 'zh'];

/** Cookie that stores the user's explicit language choice (overrides auto-detection). */
export const LOCALE_COOKIE = 'nebula_locale';
