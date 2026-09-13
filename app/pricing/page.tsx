import Link from 'next/link';
import { PublicHeader } from '@/components/site/PublicChrome';
import { ModelPriceTable } from '@/components/marketing/ModelPriceTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatUsd } from '@/lib/server/pricing';
import { getEnabledCatalog } from '@/lib/repositories/models';
import { listPlans } from '@/lib/repositories/plans';
import { getCurrentUser } from '@/lib/server/auth';
import { getLocale } from '@/lib/i18n/server';
import { getDict } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Pricing' };

export default async function PricingPage() {
  const locale = getLocale();
  const t = getDict(locale).marketing;
  const [models, plans, user] = await Promise.all([
    getEnabledCatalog(),
    listPlans(true, locale),
    getCurrentUser(),
  ]);

  return (
    <main>
      <PublicHeader />
      <div className="container py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight">{t.pricing.title}</h1>
          <p className="mt-4 text-muted-foreground">{t.pricing.subtitle}</p>
        </div>

        <section className="mt-14">
          <h2 className="mb-4 text-xl font-semibold">{t.pricing.tokenPrices}</h2>
          <ModelPriceTable models={models} t={t} />
          <div className="mt-4 grid gap-4 text-sm text-muted-foreground md:grid-cols-2">
            <p>
              <span className="font-medium text-foreground">{t.pricing.inputTitle}</span> {t.pricing.inputBody}
            </p>
            <p>
              <span className="font-medium text-foreground">{t.pricing.retriesTitle}</span> {t.pricing.retriesBody}
            </p>
          </div>
        </section>

        <section className="mt-20">
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

        <section className="mt-20">
          <h2 className="mb-4 text-xl font-semibold">{t.pricing.costFloorTitle}</h2>
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              {t.pricing.costFloorBody}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
