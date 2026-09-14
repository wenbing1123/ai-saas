import Link from 'next/link';
import { CreditCard, Loader2 } from 'lucide-react';
import { PublicHeader } from '@/components/site/PublicChrome';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { requireUser } from '@/lib/server/auth';
import { getOrderById } from '@/lib/repositories/orders';
import { getLocale } from '@/lib/i18n/server';
import { getDict } from '@/lib/i18n';
import { formatUsd } from '@/lib/server/pricing';
import { OrderStatus, PaymentChannel } from '@/lib/db/enums';
import { CheckoutPayButton } from '@/components/console/CheckoutPayButton';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage({ params }: { params: { orderId: string } }) {
  const user = await requireUser();
  const locale = getLocale();
  const t = getDict(locale).common.checkout;
  const found = await getOrderById(params.orderId);

  if (!found || found.order.userId !== user.id) {
    return (
      <>
        <PublicHeader />
        <main className="container flex min-h-[60vh] items-center justify-center py-16">
          <p className="text-muted-foreground">{t.notFound}</p>
        </main>
      </>
    );
  }

  const { order, plan } = found;
  const alreadyPaid = order.status === OrderStatus.Paid;

  return (
    <>
      <PublicHeader />
      <main className="container flex min-h-[70vh] items-center justify-center py-16">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">{t.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{t.subtitle}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t.orderNo}</dt>
                <dd className="font-mono">{order.orderNo}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t.package}</dt>
                <dd>{plan.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t.amount}</dt>
                <dd className="font-semibold">{formatUsd(order.amountCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t.credit}</dt>
                <dd>{formatUsd(order.creditCents)}</dd>
              </div>
            </dl>

            {order.paymentChannel === PaymentChannel.Manual && (
              <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">{t.sandboxNotice}</p>
            )}

            {alreadyPaid ? (
              <p className="text-center text-sm text-emerald-600 dark:text-emerald-400">{t.alreadyPaid}</p>
            ) : (
              <CheckoutPayButton orderId={order.id} locale={locale} />
            )}

            <div className="text-center">
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/billing">{t.cancel}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
