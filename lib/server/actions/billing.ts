'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/server/auth';
import { getPlanById } from '@/lib/repositories/plans';
import type { ActionResult } from '@/lib/validators';
import { PaymentChannel } from '@/lib/db/enums';
import { createOrderAndCheckout } from '@/lib/server/payments/order-service';
import { listConfiguredGateways } from '@/lib/server/payments/registry';
import { getOrderById, markOrderPaid } from '@/lib/repositories/orders';
import { appConfig } from '@/config/app';

/**
 * Buy a package.
 *
 * Picks the first configured non-sandbox gateway (currently Stripe if
 * STRIPE_SECRET_KEY is set), otherwise falls back to manual/sandbox so the
 * flow stays testable without a PSP.
 *
 * Returns a redirectUrl for the hosted checkout page; the caller should
 * window.location.assign it. For sandbox the order is paid instantly and
 * redirectUrl is empty.
 */
export async function purchasePlanAction(planId: string): Promise<ActionResult<{ orderNo: string; redirectUrl: string }>> {
  const user = await requireUser();
  const plan = await getPlanById(planId);
  if (!plan || !plan.active) {
    return { ok: false, error: 'This package is no longer available.' };
  }

  const channel =
    listConfiguredGateways().find((g) => g.channel !== PaymentChannel.Manual)?.channel ??
    PaymentChannel.Manual;

  const base = appConfig.appUrl.replace(/\/+$/, '');
  const { order, redirectUrl } = await createOrderAndCheckout(
    user,
    plan,
    channel,
    `${base}/dashboard/billing?paid={orderId}`,
    `${base}/dashboard/billing?canceled={orderId}`,
  );

  revalidatePath('/dashboard/billing');
  revalidatePath('/dashboard');
  return { ok: true, data: { orderNo: order.orderNo, redirectUrl } };
}

/**
 * Sandbox "pay now" — simulates a successful PSP callback for Manual orders.
 * In production this is replaced by the verified Stripe webhook.
 */
export async function payOrderAction(orderId: string): Promise<ActionResult<{ orderNo: string }>> {
  const user = await requireUser();
  const found = await getOrderById(orderId);
  if (!found) return { ok: false, error: 'Order not found.' };
  const { order } = found;
  if (order.userId !== user.id) return { ok: false, error: 'Order does not belong to you.' };
  if (order.paymentChannel !== PaymentChannel.Manual) {
    return { ok: false, error: 'This order must be paid through its payment provider.' };
  }
  const paid = await markOrderPaid(order.id, `sandbox-${order.id}`);
  if (!paid) return { ok: false, error: 'Payment could not be processed.' };
  revalidatePath('/dashboard/billing');
  revalidatePath('/dashboard');
  return { ok: true, data: { orderNo: paid.orderNo } };
}
