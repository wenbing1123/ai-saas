import type { Metadata, Viewport } from 'next';
import { getMessages, getLocale } from 'next-intl/server';
import { IntlProvider } from '@/components/IntlProvider';
import { timeZone } from '@/i18n/request';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'AI SaaS Platform',
    template: '%s | AI SaaS Platform',
  },
  description: 'Enterprise-grade AI agent platform powered by LangGraph',
  keywords: ['ai', 'saas', 'langgraph', 'agents', 'llm'],
  authors: [{ name: 'AI SaaS Team' }],
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans">
        <IntlProvider locale={locale} messages={messages} timeZone={timeZone}>
          {children}
        </IntlProvider>
      </body>
    </html>
  );
}