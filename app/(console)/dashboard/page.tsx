import Link from 'next/link';
import { AlertTriangle, KeyRound, CreditCard, Activity, DollarSign, ArrowRight } from 'lucide-react';
import { PageHeader, StatCard } from '@/components/console/StatCard';
import { BarsChart } from '@/components/console/BarsChart';
import { UsageTable } from '@/components/console/UsageTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireUser } from '@/lib/server/auth';
import { getLocale } from '@/lib/i18n/server';
import { getDict } from '@/lib/i18n';
import { getActiveEntitlement } from '@/lib/repositories/users';
import { getUsageTotals, getDailyUsage, getUsageByModel, listUsage } from '@/lib/repositories/usage';
import { formatUsd, formatNumber } from '@/lib/server/pricing';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function daysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000);
}

export default async function DashboardOverview() {
  const user = await requireUser();
  const locale = getLocale();
  const t = getDict(locale).console;
  const [entitlement, totals30, totalsToday, daily, topModels, recent] = await Promise.all([
    getActiveEntitlement(user.id),
    getUsageTotals({ userId: user.id, since: daysAgo(30) }),
    getUsageTotals({ userId: user.id, since: daysAgo(1) }),
    getDailyUsage(user.id, 14),
    getUsageByModel(daysAgo(30), user.id),
    listUsage({ userId: user.id, limit: 8 }),
  ]);

  return (
    <>
      <PageHeader
        title={t.overview.welcomeBack.replace('{name}', user.name.split(' ')[0])}
        subtitle={t.overview.subtitle}
        action={
          <Button asChild>
            <Link href="/dashboard/billing">
              <CreditCard className="mr-2 h-4 w-4" /> {t.overview.topUpCta}
            </Link>
          </Button>
        }
      />

      {user.balanceCents < 500 && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {user.balanceCents <= 0
            ? t.overview.emptyBalance
            : t.overview.lowBalance.replace('{amount}', formatUsd(user.balanceCents))}
          <Link href="/dashboard/billing" className="ml-auto font-medium underline underline-offset-4">
            {t.overview.topUp}
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t.overview.creditBalance} value={formatUsd(user.balanceCents)} hint={t.overview.creditBalanceHint} icon={DollarSign} accent="good" />
        <StatCard label={t.overview.spend30} value={formatUsd(totals30.chargeCents)} hint={t.overview.spend30Hint} icon={Activity} />
        <StatCard
          label={t.overview.requests30}
          value={formatNumber(totals30.requests)}
          hint={t.overview.requestsHint.replace('{count}', formatNumber(totalsToday.requests))}
          icon={Activity}
        />
        <StatCard
          label={t.overview.package}
          value={entitlement ? t.overview.packageActive : t.overview.packageDefault}
          hint={
            entitlement
              ? t.overview.renews.replace('{date}', formatDate(entitlement.expireAt))
              : `${user.packageExpireAt ? t.overview.packageExpired : t.overview.packageNone} · ${t.overview.packageDefaultLimits}`
          }
          icon={KeyRound}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{t.overview.dailySpend}</CardTitle>
            <span className="text-xs text-muted-foreground">
              {t.overview.total.replace('{amount}', formatUsd(daily.reduce((s, d) => s + d.chargeCents, 0)))}
            </span>
          </CardHeader>
          <CardContent>
            <BarsChart
              points={daily.map((d) => ({ label: d.day, value: d.chargeCents }))}
              formatValue={(v) => `$${(v / 100).toFixed(3)}`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.overview.topModels}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topModels.length === 0 && <p className="text-sm text-muted-foreground">{t.overview.noUsageYet}</p>}
            {topModels.slice(0, 6).map((m) => (
              <div key={m.modelId} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{m.modelId}</div>
                  <div className="text-xs text-muted-foreground">{t.overview.requests.replace('{count}', formatNumber(m.requests))}</div>
                </div>
                <div className="shrink-0 tabular-nums text-muted-foreground">{formatUsd(m.chargeCents)}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t.overview.recentRequests}</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/usage">
              {t.overview.viewAll} <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recent.records.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t.overview.noRequestsYet}{' '}
              <Link href="/docs" className="font-medium underline underline-offset-4">
                {t.overview.readQuickstart}
              </Link>
            </p>
          ) : (
            <UsageTable records={recent.records} />
          )}
        </CardContent>
      </Card>
    </>
  );
}
