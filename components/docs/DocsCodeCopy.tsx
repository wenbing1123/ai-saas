'use client';

import { useEffect, useRef } from 'react';

const LABELS = {
  zh: { copy: '复制', copied: '已复制' },
  en: { copy: 'Copy', copied: 'Copied' },
} as const;

/** Inline SVG bodies (lucide-compatible, stroke uses currentColor). */
const ICONS = {
  copy:
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
  check:
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
} as const;

/**
 * Renders the docs markdown HTML and injects a copy icon at the top-right of
 * every code block (same pattern as markdown docs sites). Icon-only, flashes
 * to a check mark for 1.5s after copying.
 */
export function DocsCodeCopy({ html, locale }: { html: string; locale: 'en' | 'zh' }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const L = LABELS[locale];
    const disposables: Array<() => void> = [];

    for (const pre of Array.from(root.querySelectorAll('pre'))) {
      pre.style.position = 'relative';
      const text = pre.textContent ?? '';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.title = L.copy;
      btn.setAttribute('aria-label', L.copy);
      btn.innerHTML = ICONS.copy;
      Object.assign(btn.style, {
        position: 'absolute',
        top: '8px',
        right: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '28px',
        height: '28px',
        padding: '0',
        borderRadius: '6px',
        border: '1px solid rgba(128,128,128,0.35)',
        background: 'rgba(127,127,127,0.14)',
        color: 'inherit',
        cursor: 'pointer',
        backdropFilter: 'blur(4px)',
        opacity: '0.75',
        transition: 'opacity 0.15s ease, background 0.15s ease',
      } satisfies Partial<CSSStyleDeclaration>);
      btn.onmouseenter = () => (btn.style.opacity = '1');
      btn.onmouseleave = () => (btn.style.opacity = '0.75');
      btn.onclick = async () => {
        await navigator.clipboard.writeText(text);
        btn.innerHTML = ICONS.check;
        btn.title = L.copied;
        setTimeout(() => {
          btn.innerHTML = ICONS.copy;
          btn.title = L.copy;
        }, 1500);
      };

      pre.appendChild(btn);
      disposables.push(() => btn.remove());
    }

    return () => disposables.forEach((fn) => fn());
  }, [html, locale]);

  return <div ref={ref} className="docs-body" dangerouslySetInnerHTML={{ __html: html }} />;
}
