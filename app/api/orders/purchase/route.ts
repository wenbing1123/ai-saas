import { revalidatePath } from 'next/cache';
import { withApi, ok, notFound } from '@/lib/server/wrappers';
import { getPlanById } from '@/lib/repositories/plans';
import { PaymentChannel } from '@/lib/db/enums';
import { createOrderAndCheckout } from '@/lib/server/payments/order-service';
import { listConfiguredGateways } from '@/lib/server/payments/registry';
import { appConfig } from '@/config/app';

/**
 * POST /api/orders/purchase  { planId }
 * Buys a package. Returns { orderNo, redirectUrl }; a non-empty redirectUrl
 * points at the hosted PSP checkout (Stripe). Sandbox orders are paid now.
 */
export const POST = withApi({ role: 'user', body: 'json' }, async ({ user, input }) => {
  const planId = String((input as { planId?: string }).planId ?? '');
  const plan = await getPlanById(planId);
  if (!plan || !plan.active) throw notFound('This package is no longer available.');

  const channel =
    listConfiguredGateways().find((g) => g.channel !== PaymentChannel.Manual)?.channel ??
    PaymentChannel.Manual;

  const base = appConfig.appUrl.replace(/\/+$/, '');
  const { order, redirectUrl } = await createOrderAndCheckout(
    user!,
    plan,
    channel,
    `${base}/dashboard/billing?paid={orderId}`,
    `${base}/dashboard/billing?canceled={orderId}`,
  );

  revalidatePath('/dashboard/billing');
  revalidatePath('/dashboard');
  return ok({ orderNo: order.orderNo, redirectUrl });
});
