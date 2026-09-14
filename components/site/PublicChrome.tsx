import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { getCurrentUser } from '@/lib/server/auth';
import { getLocale } from '@/lib/i18n/server';
import { getDict } from '@/lib/i18n';
import { LocaleSwitcher } from '@/components/i18n/LocaleSwitcher';
import { MobileMenu } from '@/components/site/MobileMenu';
import { Button } from '@/components/ui/button';

export async function PublicHeader() {
  const user = await getCurrentUser();
  const locale = getLocale();
  const t = getDict(locale);
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-lg font-bold tracking-tight">Nebula API</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          <Link href="/" className="hover:text-foreground">{t.marketing.header.home}</Link>
          <Link href="/pricing" className="hover:text-foreground">{t.marketing.header.pricing}</Link>
          <Link href="/docs" className="hover:text-foreground">{t.marketing.header.docs}</Link>
          {user ? (
            <Button size="sm" asChild>
              <Link href="/dashboard">{t.marketing.header.dashboard}</Link>
            </Button>
          ) : (
            <>
              <Link href="/login" className="hover:text-foreground">{t.marketing.header.signIn}</Link>
              <Button size="sm" asChild>
                <Link href="/register">{t.marketing.header.getStarted}</Link>
              </Button>
            </>
          )}
          <LocaleSwitcher current={locale} />
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          <LocaleSwitcher current={locale} />
          <MobileMenu
            menuLabel={t.marketing.header.menu}
            items={[
              { href: '/', label: t.marketing.header.home },
              { href: '/pricing', label: t.marketing.header.pricing },
              { href: '/docs', label: t.marketing.header.docs },
              user
                ? { href: '/dashboard', label: t.marketing.header.dashboard, primary: true }
                : { href: '/register', label: t.marketing.header.getStarted, primary: true },
            ]}
          />
        </div>
      </div>
    </header>
  );
}
