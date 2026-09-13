import { commonEn, commonZh } from './dict-common';
import { marketingEn, marketingZh } from './dict-marketing';
import { consoleEn, consoleZh } from './dict-console';
import { adminEn, adminZh } from './dict-admin';
import type { Locale } from './types';

export type Dictionary = {
  common: typeof commonEn;
  marketing: typeof marketingEn;
  console: typeof consoleEn;
  admin: typeof adminEn;
};

const en: Dictionary = {
  common: commonEn,
  marketing: marketingEn,
  console: consoleEn,
  admin: adminEn,
};

const zh: Dictionary = {
  common: commonZh,
  marketing: marketingZh,
  console: consoleZh,
  admin: adminZh,
};

/** Pure function — safe in both server and client components. */
export function getDict(locale: Locale): Dictionary {
  return locale === 'zh' ? zh : en;
}

export { type Locale, LOCALE_COOKIE } from './types';
