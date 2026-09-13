import { PageHeader, StatCard } from '@/components/console/StatCard';
import { PurchaseButton } from '@/components/console/PurchaseButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { requireUser } from '@/lib/server/auth';
import { getLocale } from '@/lib/i18n/server';
import { getDict } from '@/lib/i18n';
import { OrderStatus } from '@/lib/db/enums';
import { listPlans } from '@/lib/repositories/plans';
import { listOrders } from '@/lib/repositories/orders';
import { listLedger, getActiveEntitlement } from '@/lib/repositories/users';
import { formatUsd } from '@/lib/server/pricing';
import { formatDate } from '@/lib/utils';
import { DollarSign, Gauge, CalendarClock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function BillingPage() {
  const user = await requireUser();
  const locale = getLocale();
  const d = getDict(locale);
  const t = d.console;
  const [plans, orders, ledger, entitlement] = await Promise.all([
    listPlans(true, locale),
    listOrders(user.id, 20),
    listLedger(user.id, 20),
    getActiveEntitlement(user.id),
  ]);

  return (
    <>
      <PageHeader title={t.billing.title} subtitle={t.billing.subtitle} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t.billing.currentBalance} value={formatUsd(user.balanceCents)} icon={DollarSign} accent="good" />
        <StatCard
          label={t.billing.rateLimitTier}
          value={entitlement ? t.billing.rpm.replace('{count}', String(entitlement.rateLimitRpm)) : t.billing.tierDefault}
          hint={entitlement ? t.billing.concurrencyHint.replace('{count}', String(entitlement.maxConcurrency)) : t.billing.noActivePackage}
          icon={Gauge}
        />
        <StatCard
          label={t.billing.entitlementUntil}
          value={entitlement ? formatDate(entitlement.expireAt) : '—'}
          hint={t.billing.entitlementHint}
          icon={CalendarClock}
        />
      </div>

      <h2 className="mb-4 mt-10 text-lg font-semibold">{t.billing.buyCredit}</h2>
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className={`flex flex-col ${plan.highlighted ? 'border-primary shadow-lg' : ''}`}>
            <CardContent className="flex flex-1 flex-col pt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                {plan.highlighted && <Badge>{t.billing.popular}</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-4xl font-bold tracking-tight">{formatUsd(plan.priceCents)}</span>
                <span className="text-sm text-muted-foreground">
                  {t.billing.creditSuffix.replace('{amount}', formatUsd(plan.creditCents))}
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
              <div className="mt-auto pt-6">
                <PurchaseButton plan={plan} variant={plan.highlighted ? 'default' : 'outline'} locale={locale} />
                <p className="mt-2 text-center text-xs text-muted-foreground">{t.billing.sandboxNote}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.billing.orders}</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t.billing.noOrders}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">{t.billing.colOrder}</th>
                      <th className="py-2 pr-4 font-medium">{t.billing.colPackage}</th>
                      <th className="py-2 pr-4 text-right font-medium">{t.billing.colAmount}</th>
                      <th className="py-2 pr-4 text-right font-medium">{t.billing.colDate}</th>
                      <th className="py-2 text-right font-medium">{d.common.misc.status}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} className="border-b last:border-0">
                        <td className="py-2.5 pr-4 font-mono text-xs">{o.orderNo}</td>
                        <td className="py-2.5 pr-4">{o.planName}</td>
                        <td className="py-2.5 pr-4 text-right tabular-nums">{formatUsd(o.amountCents)}</td>
                        <td className="py-2.5 pr-4 text-right text-muted-foreground">{formatDate(o.createdAt)}</td>
                        <td className="py-2.5 text-right">
                          <Badge variant={o.status === OrderStatus.Paid ? 'secondary' : 'outline'}>{d.common.enums.orderStatus[o.status]}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.billing.ledger}</CardTitle>
          </CardHeader>
          <CardContent>
            {ledger.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t.billing.noMovements}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">{t.billing.colWhen}</th>
                      <th className="py-2 pr-4 font-medium">{t.billing.colType}</th>
                      <th className="py-2 pr-4 font-medium">{t.billing.colNote}</th>
                      <th className="py-2 pr-4 text-right font-medium">{t.billing.colAmount}</th>
                      <th className="py-2 text-right font-medium">{d.common.misc.balance}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((l) => (
                      <tr key={l.id} className="border-b last:border-0">
                        <td className="py-2.5 pr-4 whitespace-nowrap text-muted-foreground">{formatDate(l.createdAt)}</td>
                        <td className="py-2.5 pr-4">
                          <Badge variant="outline">{d.common.enums.ledgerType[l.type]}</Badge>
                        </td>
                        <td className="max-w-[200px] truncate pr-4 text-muted-foreground" title={l.note ?? ''}>
                          {l.note}
                        </td>
                        <td className={`py-2.5 pr-4 text-right tabular-nums ${l.amountCents < 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {l.amountCents > 0 ? '+' : ''}
                          {formatUsd(l.amountCents)}
                        </td>
                        <td className="py-2.5 text-right tabular-nums">{formatUsd(l.balanceAfterCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
