import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PublicHeader } from '@/components/site/PublicChrome';
import { SiteFooter } from '@/components/site/SiteFooter';
import { cn } from '@/lib/utils';
import type { DocPageRow } from '@/lib/db/schema';

interface NavNode {
  category: string;
  pages: DocPageRow[];
}

/** Group flat page rows into category sections preserving order. */
function groupByCategory(pages: DocPageRow[]): NavNode[] {
  const groups: NavNode[] = [];
  for (const p of pages) {
    let g = groups.find((x) => x.category === p.category);
    if (!g) {
      g = { category: p.category, pages: [] };
      groups.push(g);
    }
    g.pages.push(p);
  }
  return groups;
}

export function DocsChrome({
  pages,
  activeSlug,
  html,
  navLabel,
  prev,
  next,
}: {
  pages: DocPageRow[];
  activeSlug: string;
  html: string;
  navLabel: string;
  prev?: DocPageRow | null;
  next?: DocPageRow | null;
}) {
  const groups = groupByCategory(pages);
  return (
    <>
    <main>
      <PublicHeader />
      <div className="container grid gap-10 py-10 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav className="sticky top-24 space-y-6">
            <div className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {navLabel}
            </div>
            {groups.map((g) => (
              <div key={g.category}>
                <div className="px-3 pb-1.5 text-xs font-semibold text-foreground">{g.category}</div>
                <ul className="space-y-0.5 border-l border-border">
                  {g.pages.map((p) => {
                    const active = p.slug === activeSlug;
                    return (
                      <li key={p.id}>
                        <Link
                          href={`/docs/${p.slug}`}
                          className={cn(
                            '-ml-px block border-l-2 py-1 pl-3 pr-2 text-sm transition-colors',
                            active
                              ? 'border-primary font-medium text-primary'
                              : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
                          )}
                        >
                          {p.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <article className="min-w-0 max-w-3xl pb-16">
          <div className="docs-body" dangerouslySetInnerHTML={{ __html: html }} />
          {(prev || next) && (
            <div className="mt-12 grid gap-3 border-t pt-6 sm:grid-cols-2">
              {prev ? (
                <Link
                  href={`/docs/${prev.slug}`}
                  className="group rounded-lg border p-3 hover:border-primary/50 hover:bg-muted/40"
                >
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ChevronLeft className="h-3 w-3" />
                  </div>
                  <div className="mt-1 text-sm font-medium group-hover:text-primary">{prev.title}</div>
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link
                  href={`/docs/${next.slug}`}
                  className="group rounded-lg border p-3 text-right hover:border-primary/50 hover:bg-muted/40"
                >
                  <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                    <ChevronRight className="h-3 w-3" />
                  </div>
                  <div className="mt-1 text-sm font-medium group-hover:text-primary">{next.title}</div>
                </Link>
              )}
            </div>
          )}
        </article>
      </div>
    </main>
    <SiteFooter />
    </>
  );
}
