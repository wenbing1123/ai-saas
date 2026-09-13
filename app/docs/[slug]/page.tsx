import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DocsChrome } from '@/components/docs/DocsChrome';
import { listEnabledDocs, getDocBySlug } from '@/lib/repositories/docs';
import { getEnabledCatalog } from '@/lib/repositories/models';
import { renderMarkdown } from '@/lib/server/markdown';
import { gatewayBaseUrl } from '@/config/app';
import { getLocale } from '@/lib/i18n/server';
import { getDict } from '@/lib/i18n';
import { PROVIDER_LABELS, PROTOCOL_LABELS } from '@/lib/db/enums';

export const dynamic = 'force-dynamic';

async function renderDocBody(markdown: string): Promise<string> {
  const base = gatewayBaseUrl();
  const models = await getEnabledCatalog();

  const modelsTableHtml = `<div class="my-4 overflow-x-auto rounded-lg border"><table class="w-full min-w-[560px] text-sm"><thead><tr class="border-b bg-muted/40"><th class="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">Model</th><th class="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">Provider</th><th class="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">Protocol</th><th class="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide">Context</th></tr></thead><tbody>${models
    .map(
      (m) =>
        `<tr class="border-b last:border-0"><td class="px-3 py-2"><div class="font-medium">${m.displayName}</div><div class="font-mono text-xs text-muted-foreground">${m.modelId}</div></td><td class="px-3 py-2 capitalize text-muted-foreground">${PROVIDER_LABELS[m.provider]}</td><td class="px-3 py-2 font-mono text-xs">${PROTOCOL_LABELS[m.protocol]}</td><td class="px-3 py-2 text-right tabular-nums text-muted-foreground">${m.contextWindow ? Math.round(m.contextWindow / 1000) + 'K' : '—'}</td></tr>`,
    )
    .join('')}</tbody></table></div>`;

  let html = renderMarkdown(markdown.replaceAll('{{base_url}}', base));
  // The placeholder sits alone on its own line → wrapped in a <p> by the renderer.
  html = html.replace(/<p[^>]*>\{\{models_table\}\}<\/p>/g, modelsTableHtml);
  return html;
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const locale = getLocale();
  const doc = await getDocBySlug(params.slug, locale);
  return { title: doc ? `${doc.title} — Nebula API Docs` : 'Docs' };
}

export default async function DocPage({ params }: { params: { slug: string } }) {
  const locale = getLocale();
  const t = getDict(locale);
  const [pages, doc] = await Promise.all([listEnabledDocs(locale), getDocBySlug(params.slug, locale)]);
  if (!doc) notFound();

  const html = await renderDocBody(doc.content);
  const index = pages.findIndex((p) => p.slug === doc.slug);
  const prev = index > 0 ? pages[index - 1] : null;
  const next = index >= 0 && index < pages.length - 1 ? pages[index + 1] : null;

  return (
    <DocsChrome
      pages={pages}
      activeSlug={doc.slug}
      html={html}
      navLabel={t.marketing.docs.navTitle}
      prev={prev}
      next={next}
    />
  );
}
