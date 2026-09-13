import Link from 'next/link';
import { PageHeader, StatCard } from '@/components/console/StatCard';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { requireAdmin } from '@/lib/server/auth';
import { listUsage, getUsageTotals } from '@/lib/repositories/usage';
import { getEnabledCatalog } from '@/lib/repositories/models';
import { formatUsd, formatNumber } from '@/lib/server/pricing';
import { formatDate } from '@/lib/utils';
import { Activity, Coins, FileText } from 'lucide-react';
import { getLocale } from '@/lib/i18n/server';
import { getDict } from '@/lib/i18n';
import { UsageStatus } from '@/lib/db/enums';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

function daysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000);
}

export default async function AdminUsagePage({
  searchParams,
}: {
  searchParams: { days?: string; model?: string; page?: string };
}) {
  await requireAdmin();
  const locale = getLocale();
  const t = getDict(locale);
  const a = t.admin;
  const days = searchParams.days === '7' ? 7 : searchParams.days === '90' ? 90 : 30;
  const modelFilter = searchParams.model || '';
  const page = Math.max(1, Number(searchParams.page ?? '1') || 1);
  const since = daysAgo(days);

  const [catalog, totals, data] = await Promise.all([
    getEnabledCatalog(),
    getUsageTotals({ since, modelId: modelFilter || undefined }),
    listUsage({
      since,
      modelId: modelFilter || undefined,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
  ]);

  const margin = totals.chargeCents - totals.costCents;
  const href = (next: number) => {
    const params = new URLSearchParams();
    if (days !== 30) params.set('days', String(days));
    if (modelFilter) params.set('model', modelFilter);
    if (next > 1) params.set('page', String(next));
    const qs = params.toString();
    return `/admin/usage${qs ? `?${qs}` : ''}`;
  };

  return (
    <>
      <PageHeader title={a.usage.title} subtitle={a.usage.subtitle(days)} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={a.usage.requests} value={formatNumber(totals.requests)} icon={Activity} />
        <StatCard label={a.usage.tokensInOut} value={`${formatNumber(totals.inputTokens)} / ${formatNumber(totals.outputTokens)}`} icon={FileText} />
        <StatCard label={a.usage.charged} value={formatUsd(totals.chargeCents)} icon={Coins} />
        <StatCard label={a.usage.margin} value={formatUsd(margin)} hint={a.usage.costHint(formatUsd(totals.costCents, { fractionDigits: 4 }))} accent={margin < 0 ? 'warn' : 'good'} />
      </div>

      <Card className="mt-6">
        <CardContent className="pt-6">
          <form method="GET" className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{a.usage.filterModel}</label>
              <select name="model" defaultValue={modelFilter}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">{a.usage.allModels}</option>
                {catalog.map((m) => (
                  <option key={m.id} value={m.modelId}>{m.displayName}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{a.usage.filterPeriod}</label>
              <select name="days" defaultValue={String(days)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="7">{a.usage.last7Days}</option>
                <option value="30">{a.usage.last30Days}</option>
                <option value="90">{a.usage.last90Days}</option>
              </select>
            </div>
            <Button type="submit" variant="secondary">{a.usage.apply}</Button>
            <Button type="button" variant="ghost" asChild>
              <Link href="/admin/usage">{a.usage.reset}</Link>
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="pt-6">
          {data.records.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{a.usage.empty}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">{a.usage.table.timeUtc}</th>
                    <th className="py-2 pr-4 font-medium">{a.usage.table.user}</th>
                    <th className="py-2 pr-4 font-medium">{a.usage.table.model}</th>
                    <th className="py-2 pr-4 text-right font-medium">{a.usage.table.inOut}</th>
                    <th className="py-2 pr-4 text-right font-medium">{a.usage.table.cost}</th>
                    <th className="py-2 pr-4 text-right font-medium">{a.usage.table.charged}</th>
                    <th className="py-2 pr-4 text-right font-medium">{a.usage.table.latency}</th>
                    <th className="py-2 text-right font-medium">{t.common.misc.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.records.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="whitespace-nowrap py-2.5 pr-4 text-muted-foreground">{formatDate(r.createdAt)}</td>
                      <td className="py-2.5 pr-4">
                        <Link href={`/admin/users/${r.userId}`} className="font-mono text-xs hover:underline">
                          {r.userId.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-xs">{r.modelId}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">
                        {formatNumber(r.inputTokens)} / {formatNumber(r.outputTokens)}
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
                        <Badge variant={r.status === UsageStatus.Success ? 'secondary' : 'destructive'}>{t.common.enums.usageStatus[r.status]}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>{a.usage.pageInfo(page, data.total)}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild={page > 1} disabled={page <= 1}>
                {page > 1 ? <Link href={href(page - 1)}>{a.usage.previous}</Link> : a.usage.previous}
              </Button>
              <Button variant="outline" size="sm" asChild={data.total > page * PAGE_SIZE} disabled={data.total <= page * PAGE_SIZE}>
                {data.total > page * PAGE_SIZE ? <Link href={href(page + 1)}>{a.usage.next}</Link> : a.usage.next}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
