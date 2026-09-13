import Link from 'next/link';
import { PageHeader, StatCard } from '@/components/console/StatCard';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { requireUser } from '@/lib/server/auth';
import { getLocale } from '@/lib/i18n/server';
import { getDict } from '@/lib/i18n';
import { UsageStatus } from '@/lib/db/enums';
import { listUsage, getUsageTotals } from '@/lib/repositories/usage';
import { getEnabledCatalog } from '@/lib/repositories/models';
import { formatUsd, formatNumber } from '@/lib/server/pricing';
import { formatDate } from '@/lib/utils';
import { Activity, Coins, FileText } from 'lucide-react';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;

function daysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000);
}

export default async function UsagePage({
  searchParams,
}: {
  searchParams: { days?: string; model?: string; page?: string };
}) {
  const user = await requireUser();
  const d = getDict(getLocale());
  const t = d.console;
  const days = searchParams.days === '7' ? 7 : searchParams.days === '90' ? 90 : 30;
  const modelFilter = searchParams.model || '';
  const page = Math.max(1, Number(searchParams.page ?? '1') || 1);

  const since = daysAgo(days);
  const [catalog, totals, data] = await Promise.all([
    getEnabledCatalog(),
    getUsageTotals({ userId: user.id, since, modelId: modelFilter || undefined }),
    listUsage({
      userId: user.id,
      since,
      modelId: modelFilter || undefined,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
  ]);

  const buildHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (days !== 30) params.set('days', String(days));
    if (modelFilter) params.set('model', modelFilter);
    if (nextPage > 1) params.set('page', String(nextPage));
    const qs = params.toString();
    return `/dashboard/usage${qs ? `?${qs}` : ''}`;
  };

  const hasPrev = page > 1;
  const hasNext = data.total > page * PAGE_SIZE;

  return (
    <>
      <PageHeader title={t.nav.usage} subtitle={t.usage.subtitle.replace('{days}', String(days))} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t.usage.statRequests} value={formatNumber(totals.requests)} icon={Activity} />
        <StatCard
          label={t.usage.statTokens}
          value={`${formatNumber(totals.inputTokens)} / ${formatNumber(totals.outputTokens)}`}
          icon={FileText}
        />
        <StatCard
          label={t.usage.statCharged}
          value={formatUsd(totals.chargeCents)}
          hint={t.usage.costBasisHint.replace('{amount}', formatUsd(totals.costCents, { fractionDigits: 4 }))}
          icon={Coins}
        />
      </div>

      <Card className="mt-6">
        <CardContent className="pt-6">
          <form method="GET" className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t.usage.filterModel}</label>
              <select
                name="model"
                defaultValue={modelFilter}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">{t.usage.allModels}</option>
                {catalog.map((m) => (
                  <option key={m.id} value={m.modelId}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t.usage.filterPeriod}</label>
              <select
                name="days"
                defaultValue={String(days)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="7">{t.usage.last7}</option>
                <option value="30">{t.usage.last30}</option>
                <option value="90">{t.usage.last90}</option>
              </select>
            </div>
            <Button type="submit" variant="secondary">{t.usage.apply}</Button>
            <Button type="button" variant="ghost" asChild>
              <Link href="/dashboard/usage">{t.usage.reset}</Link>
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="pt-6">
          {data.records.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{t.usage.empty}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">{t.usage.colTime}</th>
                    <th className="py-2 pr-4 font-medium">{t.usage.colModel}</th>
                    <th className="py-2 pr-4 text-right font-medium">{t.usage.colInput}</th>
                    <th className="py-2 pr-4 text-right font-medium">{t.usage.colOutput}</th>
                    <th className="py-2 pr-4 text-right font-medium">{t.usage.colCache}</th>
                    <th className="py-2 pr-4 text-right font-medium">{t.usage.colCostBasis}</th>
                    <th className="py-2 pr-4 text-right font-medium">{t.usage.colCharged}</th>
                    <th className="py-2 pr-4 text-right font-medium">{t.usage.colLatency}</th>
                    <th className="py-2 text-right font-medium">{d.common.misc.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.records.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2.5 pr-4 whitespace-nowrap text-muted-foreground">{formatDate(r.createdAt)}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs">{r.modelId}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{formatNumber(r.inputTokens)}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{formatNumber(r.outputTokens)}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-muted-foreground">
                        {r.cacheReadTokens || r.cacheWriteTokens
                          ? `${formatNumber(r.cacheReadTokens)}r / ${formatNumber(r.cacheWriteTokens)}w`
                          : '—'}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-muted-foreground">
                        {formatUsd(r.costCents, { fractionDigits: 4 })}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-medium tabular-nums">
                        {formatUsd(r.chargeCents, { fractionDigits: 4 })}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-muted-foreground">
                        {r.latencyMs ? `${(r.latencyMs / 1000).toFixed(1)}s` : '—'}
                      </td>
                      <td className="py-2.5 text-right">
                        <Badge variant={r.status === UsageStatus.Success ? 'secondary' : 'destructive'}>{d.common.enums.usageStatus[r.status]}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>{t.usage.pageInfo.replace('{page}', String(page)).replace('{total}', String(data.total))}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild={hasPrev} disabled={!hasPrev}>
                {hasPrev ? <Link href={buildHref(page - 1)}>{t.usage.previous}</Link> : t.usage.previous}
              </Button>
              <Button variant="outline" size="sm" asChild={hasNext} disabled={!hasNext}>
                {hasNext ? <Link href={buildHref(page + 1)}>{t.usage.next}</Link> : t.usage.next}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
