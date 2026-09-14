import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { getCurrentUser } from '@/lib/server/auth';
import { getLocale } from '@/lib/i18n/server';
import { getDict } from '@/lib/i18n';

/**
 * Shared marketing footer used by the landing page and all public pages
 * (pricing, docs, etc.). Friend links are placeholders — replace with real
 * partner URLs before going live.
 */
export async function SiteFooter() {
  const user = await getCurrentUser();
  const locale = getLocale();
  const t = getDict(locale).marketing;
  const f = t.landing.footer;
  const year = new Date().getFullYear();

  const friendLinks = [
    { href: 'https://openai.com', label: 'OpenAI' },
    { href: 'https://anthropic.com', label: 'Anthropic' },
    { href: 'https://ai.google.dev', label: 'Google AI' },
    { href: 'https://deepseek.com', label: 'DeepSeek' },
  ];

  return (
    <footer className="border-t bg-muted/30">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold tracking-tight">Nebula API</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">{f.tagline}</p>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">{f.product}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/" className="hover:text-foreground">{t.header.home}</Link></li>
              <li><Link href="/pricing" className="hover:text-foreground">{t.header.pricing}</Link></li>
              <li><Link href="/docs" className="hover:text-foreground">{t.header.docs}</Link></li>
              <li>
                <Link href={user ? '/dashboard' : '/login'} className="hover:text-foreground">
                  {user ? t.header.dashboard : t.header.signIn}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">{f.resources}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/docs/quickstart" className="hover:text-foreground">{t.header.docs}</Link></li>
              <li><Link href="/docs" className="hover:text-foreground">API Reference</Link></li>
              <li><Link href="/pricing" className="hover:text-foreground">{t.header.pricing}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">{f.friends}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {friendLinks.map((l) => (
                <li key={l.href}>
                  <a href={l.href} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t pt-6 text-center text-xs text-muted-foreground">
          <span>{f.copyright.replace('{year}', String(year))}</span>
        </div>
      </div>
    </footer>
  );
}
