/**
 * Minimal, dependency-free Markdown renderer.
 *
 * Supports the doc-authoring subset: fenced code blocks, ATX headings
 * (with anchor ids), GFM pipe tables, blockquotes, hr, ordered/unordered
 * lists (one nesting level), paragraphs, and inline code / bold / italic /
 * links. All raw text is HTML-escaped BEFORE markdown tokens are applied,
 * so admin-authored content cannot inject markup.
 *
 * Isomorphic (no server-only imports) — reused by the admin live preview.
 */

const CODE_PLACEHOLDER = '\u0000CODE';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/** Inline: `code`, **bold**, *italic*, [text](url). Input is already escaped. */
function renderInline(raw: string): string {
  let s = raw;
  // Links [text](url) — url restricted to safe schemes.
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g, (_m, text: string, url: string) => {
    const external = url.startsWith('http');
    const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${url}"${attrs} class="font-medium text-primary underline underline-offset-4 hover:text-primary/80">${text}</a>`;
  });
  // Bold then italic then inline code. Operate on escaped strings: tokens are
  // matched literally, so no HTML attribute can be forged.
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  s = s.replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">$1</code>');
  return s;
}

export interface RenderOptions {
  /** Replace code fence contents? No — only {{vars}} inside prose are handled by the caller. */
}

export function renderMarkdown(markdown: string): string {
  const text = markdown.replace(/\r\n/g, '\n');

  // 1. Extract fenced code blocks (protect from inline processing).
  const blocks: string[] = [];
  const withoutCode = text.replace(/```([^\n]*)\n([\s\S]*?)```/g, (_m, lang: string, code: string) => {
    const language = lang.trim();
    const safeCode = escapeCode(code.replace(/\n$/, ''));
    const label = language
      ? `<div class="flex items-center justify-between border-b border-border/60 px-4 py-1.5 text-[11px] uppercase tracking-wide text-muted-foreground"><span>${escapeHtml(language)}</span></div>`
      : '';
    blocks.push(
      `<div class="my-4 overflow-hidden rounded-lg border bg-muted/40">${label}<pre class="overflow-x-auto p-4 text-[13px] leading-relaxed"><code class="font-mono">${safeCode}</code></pre></div>`,
    );
    return `${CODE_PLACEHOLDER}${blocks.length - 1}\u0000`;
  });

  // 2. Split into block-level lines.
  const lines = withoutCode.split('\n');
  const html: string[] = [];
  let i = 0;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      html.push(
        `<p class="leading-7 text-muted-foreground">${renderInline(escapeHtml(paragraph.join(' ')))}</p>`,
      );
      paragraph = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i]!;
    const trimmed = line.trim();

    // Restored code block placeholder
    const codeMatch = trimmed.match(new RegExp(`^${CODE_PLACEHOLDER}(\\d+)\u0000$`));
    if (codeMatch) {
      flushParagraph();
      html.push(blocks[Number(codeMatch[1])]!);
      i += 1;
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      i += 1;
      continue;
    }

    // Heading
    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      const level = heading[1]!.length;
      const content = escapeHtml(heading[2]!);
      const id = slugify(heading[2]!);
      const size: Record<number, string> = {
        1: 'mt-10 mb-4 text-3xl font-bold tracking-tight',
        2: 'mt-10 mb-3 text-2xl font-bold tracking-tight border-b pb-2',
        3: 'mt-8 mb-2 text-lg font-semibold',
        4: 'mt-6 mb-2 text-base font-semibold',
        5: 'mt-4 mb-1 text-sm font-semibold',
        6: 'mt-4 mb-1 text-sm font-semibold text-muted-foreground',
      };
      html.push(
        `<h${level} id="${id}" class="${size[level]} scroll-mt-20"><a href="#${id}" class="text-inherit hover:text-primary">${renderInline(content)}</a></h${level}>`,
      );
      i += 1;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(trimmed)) {
      flushParagraph();
      html.push('<hr class="my-8 border-border" />');
      i += 1;
      continue;
    }

    // Pipe table
    if (trimmed.includes('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]!)) {
      flushParagraph();
      const header = splitRow(trimmed);
      i += 2; // skip header + delimiter
      const rows: string[][] = [];
      while (i < lines.length && lines[i]!.trim().includes('|')) {
        rows.push(splitRow(lines[i]!.trim()));
        i += 1;
      }
      html.push(renderTable(header, rows));
      continue;
    }

    // Blockquote (consecutive '>' lines)
    if (trimmed.startsWith('>')) {
      flushParagraph();
      const quote: string[] = [];
      while (i < lines.length && lines[i]!.trim().startsWith('>')) {
        quote.push(lines[i]!.trim().replace(/^>\s?/, ''));
        i += 1;
      }
      html.push(
        `<blockquote class="my-4 border-l-4 border-primary/50 bg-muted/40 py-2 pl-4 pr-3 text-sm text-muted-foreground">${renderInline(escapeHtml(quote.join(' ')))}</blockquote>`,
      );
      continue;
    }

    // Lists
    const ul = /^[-*]\s+(.*)$/.exec(trimmed);
    const ol = /^(\d+)\.\s+(.*)$/.exec(trimmed);
    if (ul || ol) {
      flushParagraph();
      const ordered = Boolean(ol);
      const items: string[] = [];
      while (i < lines.length) {
        const l = lines[i]!.trim();
        const u = /^[-*]\s+(.*)$/.exec(l);
        const o = /^(\d+)\.\s+(.*)$/.exec(l);
        if (ordered && o) {
          items.push(renderInline(escapeHtml(o[2]!)));
        } else if (!ordered && u) {
          items.push(renderInline(escapeHtml(u[1]!)));
        } else if (!l) {
          // allow one blank line inside loose lists
          if (i + 1 < lines.length && /^[-*]\s|^\d+\.\s/.test(lines[i + 1]!.trim())) {
            i += 1;
            continue;
          }
          break;
        } else {
          break;
        }
        i += 1;
      }
      const tag = ordered ? 'ol' : 'ul';
      const cls = ordered
        ? 'my-4 ml-5 list-decimal space-y-2 leading-7 text-muted-foreground marker:text-foreground'
        : 'my-4 ml-5 list-disc space-y-2 leading-7 text-muted-foreground marker:text-foreground';
      html.push(`<${tag} class="${cls}">${items.map((it) => `<li>${it}</li>`).join('')}</${tag}>`);
      continue;
    }

    paragraph.push(trimmed);
    i += 1;
  }
  flushParagraph();

  // 3. Restore code blocks.
  return html
    .join('\n')
    .replace(new RegExp(`${CODE_PLACEHOLDER}(\\d+)\u0000`, 'g'), (_m, n: string) => blocks[Number(n)]!);
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

function renderTable(header: string[], rows: string[][]): string {
  const thead = `<thead><tr class="border-b bg-muted/40">${header
    .map((h) => `<th class="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">${renderInline(escapeHtml(h))}</th>`)
    .join('')}</tr></thead>`;
  const tbody = `<tbody>${rows
    .map(
      (r) =>
        `<tr class="border-b last:border-0">${r
          .map((c) => `<td class="px-3 py-2 align-top text-sm">${renderInline(escapeHtml(c))}</td>`)
          .join('')}</tr>`,
    )
    .join('')}</tbody>`;
  return `<div class="my-4 overflow-x-auto rounded-lg border"><table class="w-full min-w-[480px] text-sm">${thead}${tbody}</table></div>`;
}

/** Code contents: keep newlines/tabs, escape only markup-significant chars. */
function escapeCode(code: string): string {
  return escapeHtml(code);
}
