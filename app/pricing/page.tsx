import Link from 'next/link';
import { PublicHeader } from '@/components/site/PublicChrome';
import { SiteFooter } from '@/components/site/SiteFooter';
import { ModelPriceTable } from '@/components/marketing/ModelPriceTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatUsd } from '@/lib/server/pricing';
import { getEnabledCatalog } from '@/lib/repositories/models';
import { listPlans } from '@/lib/repositories/plans';
import { getSettings } from '@/lib/repositories/settings';
import { getCurrentUser } from '@/lib/server/auth';
import { getLocale } from '@/lib/i18n/server';
import { getDict } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Pricing' };

export default async function PricingPage() {
  const locale = getLocale();
  const t = getDict(locale).marketing;
  const [models, plans, user, settings] = await Promise.all([
    getEnabledCatalog(),
    listPlans(true, locale),
    getCurrentUser(),
    getSettings(),
  ]);

  return (
    <>
    <main>
      <PublicHeader />
      <div className="container py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight">{t.pricing.title}</h1>
          <p className="mt-4 text-muted-foreground">{t.pricing.subtitle}</p>
        </div>

        <section className="mt-14">
          <h2 className="mb-6 text-xl font-semibold">{t.pricing.creditPackages}</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.id} className={`flex flex-col ${plan.highlighted ? 'border-primary shadow-lg' : ''}`}>
                <CardContent className="flex flex-1 flex-col pt-6">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                  <div className="mt-5 flex items-baseline gap-2">
                    <span className="text-4xl font-bold tracking-tight">{formatUsd(plan.priceCents)}</span>
                    <span className="text-sm text-muted-foreground">
                      → {formatUsd(plan.creditCents)} {t.pricing.creditSuffix}
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
                      {t.pricing.choose.replace('{plan}', plan.name)}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-16 border-t pt-12">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="text-base font-semibold text-muted-foreground">{t.pricing.tokenPrices}</h2>
            <span className="text-xs text-muted-foreground/70">{t.pricing.retriesTitle}</span>
          </div>
          <div className="text-sm text-muted-foreground/80">
            <ModelPriceTable
              models={models}
              t={t}
              forexRate={settings.forex_rate_rmb_per_usd}
              forexBuffer={settings.forex_buffer_percent}
            />
          </div>
        </section>

        <section className="mt-16">
          <h2 className="mb-4 text-base font-semibold text-muted-foreground">{t.pricing.costFloorTitle}</h2>
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              {t.pricing.costFloorBody}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
    <SiteFooter />
    </>
  );
}
