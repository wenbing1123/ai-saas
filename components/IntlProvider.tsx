'use client';

import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';

export function IntlProvider({
  children,
  locale,
  messages,
  timeZone,
}: {
  children: ReactNode;
  locale: string;
  messages: Record<string, unknown>;
  timeZone: string;
}) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
      {children}
    </NextIntlClientProvider>
  );
}