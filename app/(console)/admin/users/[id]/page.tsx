import { notFound } from 'next/navigation';
import { PageHeader, StatCard } from '@/components/console/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AdjustBalanceForm } from '@/components/admin/AdjustBalanceForm';
import { UserActions } from '@/components/admin/UserActions';
import { requireAdmin } from '@/lib/server/auth';
import { getUserById, listLedger, getActiveEntitlement } from '@/lib/repositories/users';
import { listOrders } from '@/lib/repositories/orders';
import { listTokens } from '@/lib/repositories/tokens';
import { getUsageTotals, listUsage } from '@/lib/repositories/usage';
import { formatUsd, formatNumber } from '@/lib/server/pricing';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import { DollarSign, Activity, KeyRound } from 'lucide-react';
import { getLocale } from '@/lib/i18n/server';
import { getDict } from '@/lib/i18n';
import { UserStatus, TokenStatus, OrderStatus } from '@/lib/db/enums';

export const dynamic = 'force-dynamic';

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const locale = getLocale();
  const t = getDict(locale);
  const a = t.admin;
  const user = await getUserById(params.id);
  if (!user) notFound();

  const since = new Date(Date.now() - 30 * 86_400_000);
  const [entitlement, totals, ledger, orders, tokens, usage] = await Promise.all([
    getActiveEntitlement(user.id),
    getUsageTotals({ userId: user.id, since }),
    listLedger(user.id, 20),
    listOrders(user.id, 10),
    listTokens(user.id),
    listUsage({ userId: user.id, limit: 10 }),
  ]);

  return (
    <>
      <PageHeader
        title={user.name}
        subtitle={user.email}
        action={<UserActions locale={locale} userId={user.id} roles={user.roles} status={user.status} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t.common.misc.balance} value={formatUsd(user.balanceCents)} icon={DollarSign} accent="good" />
        <StatCard label={a.userDetail.spend30d} value={formatUsd(totals.chargeCents)} hint={a.userDetail.requestsHint(formatNumber(totals.requests))} icon={Activity} />
        <StatCard label={a.userDetail.entitlement} value={entitlement ? formatDate(entitlement.expireAt) : a.userDetail.none}
          hint={entitlement ? a.userDetail.rpmHint(entitlement.rateLimitRpm) : a.userDetail.defaultLimits} icon={KeyRound} />
        <StatCard label={a.userDetail.joined} value={formatDate(user.createdAt)}
          hint={<Badge variant={user.status === UserStatus.Active ? 'secondary' : 'destructive'}>{t.common.enums.userStatus[user.status]}</Badge>} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">{a.userDetail.adjustBalance.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <AdjustBalanceForm locale={locale} userId={user.id} />
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{a.userDetail.apiKeys(tokens.length)}</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <tbody>
                {tokens.map((tk) => (
                  <tr key={tk.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      <div className="font-medium">{tk.name}</div>
                      <div className="font-mono text-xs text-muted-foreground">{tk.prefix}</div>
                    </td>
                    <td className="py-2 pr-4 text-right text-xs text-muted-foreground">
                      {a.userDetail.reqs(tk.requestCount)} · {tk.lastUsedAt ? formatRelativeTime(tk.lastUsedAt) : a.userDetail.neverUsed}
                    </td>
                    <td className="py-2 text-right">
                      <Badge variant={tk.status === TokenStatus.Active ? 'secondary' : 'destructive'}>{t.common.enums.tokenStatus[tk.status]}</Badge>
                    </td>
                  </tr>
                ))}
                {tokens.length === 0 && (
                  <tr><td className="py-4 text-center text-sm text-muted-foreground">{a.userDetail.noKeys}</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{a.userDetail.recentOrders}</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      <div className="font-mono text-xs">{o.orderNo}</div>
                      <div className="text-xs text-muted-foreground">{o.planName} · {formatDate(o.createdAt)}</div>
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatUsd(o.amountCents)}</td>
                    <td className="py-2 text-right">
                      <Badge variant={o.status === OrderStatus.Paid ? 'secondary' : 'outline'}>{t.common.enums.orderStatus[o.status]}</Badge>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td className="py-4 text-center text-sm text-muted-foreground">{a.userDetail.noOrders}</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{a.userDetail.creditLedger}</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <tbody>
                {ledger.map((l) => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      <Badge variant="outline" className="mr-2">{t.common.enums.ledgerType[l.type]}</Badge>
                      <span className="text-xs text-muted-foreground">{l.note}</span>
                    </td>
                    <td className="whitespace-nowrap py-2 pr-4 text-xs text-muted-foreground">{formatDate(l.createdAt)}</td>
                    <td className={`py-2 text-right tabular-nums ${l.amountCents < 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {l.amountCents > 0 ? '+' : ''}{formatUsd(l.amountCents)}
                    </td>
                  </tr>
                ))}
                {ledger.length === 0 && (
                  <tr><td className="py-4 text-center text-sm text-muted-foreground">{a.userDetail.noLedger}</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{a.userDetail.recentRequests}</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <tbody>
                {usage.records.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      <div className="font-mono text-xs">{r.modelId}</div>
                      <div className="text-xs text-muted-foreground">{formatRelativeTime(r.createdAt)}</div>
                    </td>
                    <td className="py-2 pr-4 text-right text-xs text-muted-foreground">
                      {formatNumber(r.inputTokens)}→{formatNumber(r.outputTokens)}
                    </td>
                    <td className="py-2 text-right tabular-nums">{formatUsd(r.chargeCents, { fractionDigits: 4 })}</td>
                  </tr>
                ))}
                {usage.records.length === 0 && (
                  <tr><td className="py-4 text-center text-sm text-muted-foreground">{a.userDetail.noRequests}</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
