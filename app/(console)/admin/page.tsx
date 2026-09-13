import Link from 'next/link';
import { Users, DollarSign, Activity, TrendingUp, Landmark, Cpu } from 'lucide-react';
import { PageHeader, StatCard } from '@/components/console/StatCard';
import { BarsChart } from '@/components/console/BarsChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { requireAdmin } from '@/lib/server/auth';
import { getUserStats } from '@/lib/repositories/users';
import { getPaidRevenue } from '@/lib/repositories/orders';
import { getUsageTotals, getDailyUsage, getUsageByModel } from '@/lib/repositories/usage';
import { formatUsd, formatNumber } from '@/lib/server/pricing';
import { getLocale } from '@/lib/i18n/server';
import { getDict } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

function daysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000);
}

export default async function AdminOverview() {
  await requireAdmin();
  const locale = getLocale();
  const t = getDict(locale);
  const a = t.admin;
  const [userStats, revenue, usage30, daily, byModel] = await Promise.all([
    getUserStats(),
    getPaidRevenue(daysAgo(30)),
    getUsageTotals({ since: daysAgo(30) }),
    getDailyUsage(undefined, 30),
    getUsageByModel(daysAgo(30)),
  ]);

  const marginCents = usage30.chargeCents - usage30.costCents;
  const marginPct = usage30.chargeCents > 0 ? (marginCents / usage30.chargeCents) * 100 : 0;

  return (
    <>
      <PageHeader title={a.overview.title} subtitle={a.overview.subtitle} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label={a.overview.revenue30d} value={formatUsd(revenue.amountCents)} hint={a.overview.paidOrdersHint(revenue.orders)} icon={DollarSign} />
        <StatCard label={a.overview.charged30d} value={formatUsd(usage30.chargeCents)} hint={a.overview.requestsHint(formatNumber(usage30.requests))} icon={Activity} />
        <StatCard
          label={a.overview.grossMargin30d}
          value={formatUsd(marginCents)}
          hint={a.overview.marginPctHint(marginPct.toFixed(1))}
          icon={TrendingUp}
          accent="good"
        />
        <StatCard label={a.overview.users} value={formatNumber(userStats.total)} hint={a.overview.usersHint(userStats.active, userStats.suspended)} icon={Users} />
        <StatCard label={a.overview.outstandingCredit} value={formatUsd(userStats.outstandingCreditCents)} hint={a.overview.outstandingCreditHint} icon={Landmark} />
        <StatCard
          label={a.overview.costBasis30d}
          value={formatUsd(usage30.costCents)}
          hint={a.overview.tokensHint(formatNumber(usage30.inputTokens + usage30.outputTokens))}
          icon={Cpu}
        />
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{a.overview.dailyRevenueCost}</CardTitle>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-primary/70" /> {a.overview.charged}</span>
          </div>
        </CardHeader>
        <CardContent>
          <BarsChart
            points={daily.map((d) => ({ label: d.day, value: d.chargeCents }))}
            formatValue={(v) => `$${(v / 100).toFixed(3)}`}
          />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">{a.overview.marginByModel}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">{a.overview.table.model}</th>
                  <th className="py-2 pr-4 text-right font-medium">{a.overview.table.requests}</th>
                  <th className="py-2 pr-4 text-right font-medium">{a.overview.table.cost}</th>
                  <th className="py-2 pr-4 text-right font-medium">{a.overview.table.charged}</th>
                  <th className="py-2 pr-4 text-right font-medium">{a.overview.table.grossMargin}</th>
                  <th className="py-2 text-right font-medium">{a.overview.table.marginPct}</th>
                </tr>
              </thead>
              <tbody>
                {byModel.map((m) => {
                  const margin = m.chargeCents - m.costCents;
                  const pct = m.chargeCents > 0 ? (margin / m.chargeCents) * 100 : 0;
                  return (
                    <tr key={m.modelId} className="border-b last:border-0">
                      <td className="py-2.5 pr-4 font-mono text-xs">{m.modelId}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{formatNumber(m.requests)}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-muted-foreground">{formatUsd(m.costCents, { fractionDigits: 4 })}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{formatUsd(m.chargeCents, { fractionDigits: 4 })}</td>
                      <td className={`py-2.5 pr-4 text-right tabular-nums ${margin < 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {formatUsd(margin, { fractionDigits: 4 })}
                      </td>
                      <td className="py-2.5 text-right">
                        <Badge variant={pct < 0 ? 'destructive' : 'secondary'}>{pct.toFixed(1)}%</Badge>
                      </td>
                    </tr>
                  );
                })}
                {byModel.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      {a.overview.empty} <Link href="/admin/models" className="underline underline-offset-4">{a.overview.emptyLink}</Link>{a.overview.emptySuffix}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
