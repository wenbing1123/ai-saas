import type { Metadata, Viewport } from 'next';
import { getLocale } from '@/lib/i18n/server';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Nebula API — Cheaper Claude, GPT & Gemini tokens for coding agents',
    template: '%s | Nebula API',
  },
  description:
    'Pay-as-you-go AI tokens with OpenAI- and Anthropic-compatible endpoints. Built for Claude Code, Codex and any OpenAI client — lower prices, no subscriptions lock-in.',
  keywords: ['ai api', 'llm tokens', 'claude code', 'codex', 'openai compatible', 'anthropic compatible', 'cheap gpt', 'cheap claude'],
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">{children}</body>
    </html>
  );
}
