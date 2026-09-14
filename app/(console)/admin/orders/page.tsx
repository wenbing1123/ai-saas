import { PageHeader } from '@/components/console/StatCard';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { requireAdmin } from '@/lib/server/auth';
import { listOrders } from '@/lib/repositories/orders';
import { getLocale } from '@/lib/i18n/server';
import { getDict } from '@/lib/i18n';
import { formatUsd } from '@/lib/server/pricing';
import { OrderStatus, PaymentChannel } from '@/lib/db/enums';
import { RefundOrderButton } from '@/components/admin/RefundOrderButton';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
  await requireAdmin();
  const locale = getLocale();
  const t = getDict(locale);
  const o = t.admin.orders;
  const orders = await listOrders(undefined, 200);

  const statusLabel: Record<number, string> = {
    [OrderStatus.Pending]: o.statusPending,
    [OrderStatus.Paid]: o.statusPaid,
    [OrderStatus.Canceled]: o.statusCanceled,
    [OrderStatus.Refunded]: o.statusRefunded,
  };
  const channelLabel: Record<number, string> = {
    [PaymentChannel.Stripe]: o.channelStripe,
    [PaymentChannel.Manual]: o.channelManual,
  };
  const statusVariant: Record<number, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    [OrderStatus.Pending]: 'secondary',
    [OrderStatus.Paid]: 'default',
    [OrderStatus.Canceled]: 'outline',
    [OrderStatus.Refunded]: 'destructive',
  };

  return (
    <>
      <PageHeader title={o.title} subtitle={o.subtitle} />
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">{o.table.orderNo}</th>
                  <th className="py-2 pr-4 font-medium">{o.table.pkg}</th>
                  <th className="py-2 pr-4 text-right font-medium">{o.table.amount}</th>
                  <th className="py-2 pr-4 font-medium">{o.table.channel}</th>
                  <th className="py-2 pr-4 font-medium">{o.table.status}</th>
                  <th className="py-2 pr-4 font-medium">{o.table.created}</th>
                  <th className="py-2 pr-4 font-medium">{o.table.paidAt}</th>
                  <th className="py-2 text-right font-medium">{o.table.action}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((od) => (
                  <tr key={od.id} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-mono text-xs">{od.orderNo}</td>
                    <td className="py-3 pr-4">{od.planName ?? '-'}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">{formatUsd(od.amountCents)}</td>
                    <td className="py-3 pr-4">{channelLabel[od.paymentChannel] ?? '-'}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={statusVariant[od.status] ?? 'outline'}>
                        {statusLabel[od.status] ?? String(od.status)}
                      </Badge>
                      {od.status === OrderStatus.Refunded && od.refundedAmountCents > 0 && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          −{formatUsd(od.refundedAmountCents)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">
                      {new Date(od.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">
                      {od.paidAt ? new Date(od.paidAt).toLocaleString() : '-'}
                    </td>
                    <td className="py-3 text-right">
                      {od.status === OrderStatus.Paid ? (
                        <RefundOrderButton orderId={od.id} locale={locale} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      {o.empty}
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
