import Link from 'next/link';
import {
  Sparkles,
  Terminal,
  KeyRound,
  Wallet,
  Gauge,
  ShieldCheck,
  Code2,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ModelPriceTable } from './ModelPriceTable';
import { HeroCarousel } from './HeroCarousel';
import { MobileMenu } from '@/components/site/MobileMenu';
import { SiteFooter } from '@/components/site/SiteFooter';
import { PROVIDER_LABELS } from '@/lib/db/enums';
import { formatUsd } from '@/lib/server/pricing';
import type { Model, Plan, User } from '@/lib/types';
import type { marketingEn } from '@/lib/i18n/dict-marketing';
import { LocaleSwitcher } from '@/components/i18n/LocaleSwitcher';
import type { Locale } from '@/lib/i18n/types';

type MarketingDict = typeof marketingEn;

export function Landing({
  models,
  plans,
  user,
  t,
  locale,
  forexRate,
  forexBuffer = 0,
}: {
  models: Model[];
  plans: Plan[];
  user: User | null;
  t: MarketingDict;
  locale: Locale;
  forexRate?: number;
  forexBuffer?: number;
}) {
  return (
    <>
    <main className="flex flex-col">
      <Nav user={user} t={t} locale={locale} />
      <HeroCarousel hero={t.landing.hero} stats={t.landing.stats} />
      <ProviderStrip models={models} t={t} />
      <ModelSection models={models} t={t} forexRate={forexRate} forexBuffer={forexBuffer} />
      <Features t={t} />
      <HowItWorks t={t} />
      <PackageSection plans={plans} user={user} t={t} />
      <Faq t={t} />
    </main>
    <SiteFooter />
    </>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Sparkles className="h-4 w-4" />
      </div>
      <span className="text-lg font-bold tracking-tight">Nebula API</span>
    </div>
  );
}

function Nav({ user, t, locale }: { user: User | null; t: MarketingDict; locale: Locale }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" aria-label="Nebula API home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            {t.header.pricing}
          </Link>
          <Link href="/docs" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            {t.header.docs}
          </Link>
          <a href="#models" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            {t.header.models}
          </a>
          <a href="#packages" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            {t.header.packages}
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <LocaleSwitcher current={locale} />
          {user ? (
            <Button size="sm" asChild className="hidden sm:inline-flex">
              <Link href="/dashboard">{t.header.dashboard}</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                <Link href="/login">{t.header.signIn}</Link>
              </Button>
              <Button size="sm" asChild className="hidden sm:inline-flex">
                <Link href="/register">{t.header.getApiKey}</Link>
              </Button>
            </>
          )}
          <MobileMenu
            menuLabel={t.header.menu}
            items={[
              { href: '/', label: t.header.home },
              { href: '/pricing', label: t.header.pricing },
              { href: '/docs', label: t.header.docs },
              { href: '/#models', label: t.header.models },
              { href: '/#packages', label: t.header.packages },
              user
                ? { href: '/dashboard', label: t.header.dashboard, primary: true }
                : { href: '/register', label: t.header.getApiKey, primary: true },
            ]}
          />
        </div>
      </div>
    </header>
  );
}

function ProviderStrip({ models, t }: { models: Model[]; t: MarketingDict }) {
  const providers = Array.from(new Set(models.map((m) => PROVIDER_LABELS[m.provider])));
  return (
    <section className="border-y bg-muted/30">
      <div className="container flex flex-wrap items-center justify-center gap-x-10 gap-y-3 py-6 text-sm font-medium uppercase tracking-wider text-muted-foreground">
        <span className="text-xs normal-case tracking-normal">{t.landing.providerStrip.label}</span>
        {providers.map((p) => (
          <span key={p} className="capitalize">
            {p}
          </span>
        ))}
      </div>
    </section>
  );
}

function ModelSection({
  models,
  t,
  forexRate,
  forexBuffer = 0,
}: {
  models: Model[];
  t: MarketingDict;
  forexRate?: number;
  forexBuffer?: number;
}) {
  return (
    <section id="models" className="py-24">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.landing.modelSection.title}</h2>
          <p className="mt-4 text-muted-foreground">{t.landing.modelSection.subtitle}</p>
        </div>
        <div className="mt-12">
          <ModelPriceTable models={models} t={t} forexRate={forexRate} forexBuffer={forexBuffer} />
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t.landing.modelSection.footnote}{' '}
          <Link href="/pricing" className="font-medium text-primary underline underline-offset-4">
            {t.landing.modelSection.fullPricingLink}
          </Link>
        </p>
      </div>
    </section>
  );
}

const FEATURE_ICONS = [Code2, Terminal, Wallet, Eye, Gauge, ShieldCheck];

function Features({ t }: { t: MarketingDict }) {
  return (
    <section className="border-t bg-muted/40 py-24">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.landing.features.title}</h2>
          <p className="mt-4 text-muted-foreground">{t.landing.features.subtitle}</p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {t.landing.features.items.map((f, i) => {
            const Icon = FEATURE_ICONS[i];
            return (
              <Card key={f.title}>
                <CardContent className="pt-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const STEP_ICONS = [Wallet, KeyRound, Terminal];

function HowItWorks({ t }: { t: MarketingDict }) {
  return (
    <section className="py-24">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.landing.steps.title}</h2>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {t.landing.steps.items.map((s, i) => {
            const Icon = STEP_ICONS[i];
            return (
              <Card key={s.title}>
                <CardContent className="pt-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PackageSection({ plans, user, t }: { plans: Plan[]; user: User | null; t: MarketingDict }) {
  return (
    <section id="packages" className="border-t bg-muted/40 py-24">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.landing.packages.title}</h2>
          <p className="mt-4 text-muted-foreground">{t.landing.packages.subtitle}</p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className={`relative flex flex-col ${plan.highlighted ? 'border-primary shadow-lg' : ''}`}>
              {plan.highlighted && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">{t.landing.packages.mostPopular}</Badge>
              )}
              <CardContent className="flex flex-1 flex-col pt-6">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-4xl font-bold tracking-tight">{formatUsd(plan.priceCents)}</span>
                  <span className="text-sm text-muted-foreground">
                    → {formatUsd(plan.creditCents)} {t.landing.packages.creditSuffix}
                  </span>
                </div>
                <ul className="mt-6 space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button className="mt-6" variant={plan.highlighted ? 'default' : 'outline'} asChild>
                  <Link href={user ? '/dashboard/billing' : '/register'}>
                    {t.landing.packages.buy.replace('{plan}', plan.name)}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq({ t }: { t: MarketingDict }) {
  return (
    <section className="py-24">
      <div className="container max-w-3xl">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">{t.landing.faq.title}</h2>
        <div className="mt-10 space-y-4">
          {t.landing.faq.items.map((f) => (
            <Card key={f.q}>
              <CardContent className="pt-6">
                <h3 className="font-semibold">{f.q}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
