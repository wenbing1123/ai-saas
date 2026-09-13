'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDict } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n/types';

export function CodeBlock({
  code,
  language,
  className,
  locale = 'en',
}: {
  code: string;
  language?: string;
  className?: string;
  locale?: Locale;
}) {
  const [copied, setCopied] = useState(false);
  const t = getDict(locale).marketing.codeBlock;

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={cn('group relative overflow-hidden rounded-lg border bg-zinc-950', className)}>
      {language && (
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
          <span className="text-xs uppercase tracking-wider text-zinc-400">{language}</span>
          <button
            type="button"
            onClick={copy}
            className="flex items-center gap-1 text-xs text-zinc-400 transition hover:text-white"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? t.copied : t.copy}
          </button>
        </div>
      )}
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed text-zinc-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}
