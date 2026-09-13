'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/server/auth';
import { getPlanById } from '@/lib/repositories/plans';
import { createOrder, markOrderPaid } from '@/lib/repositories/orders';
import type { ActionResult } from '@/lib/validators';
import { PaymentChannel } from '@/lib/db/enums';

/**
 * Buy a package.
 *
 * Current flow is "manual / sandbox": the order is created and immediately
 * marked paid, so the product is fully testable end-to-end. When Stripe (or
 * another PSP) is wired in, createOrder() stays exactly the same — only the
 * markOrderPaid() call moves into the verified webhook handler
 * (lib/server/webhooks/stripe.ts) along with the PSP payment reference.
 */
export async function purchasePlanAction(planId: string): Promise<ActionResult<{ orderNo: string }>> {
  const user = await requireUser();
  const plan = await getPlanById(planId);
  if (!plan || !plan.active) {
    return { ok: false, error: 'This package is no longer available.' };
  }

  const order = await createOrder(user, plan, PaymentChannel.Manual);
  const paid = await markOrderPaid(order.id, 'sandbox-payment');
  if (!paid) return { ok: false, error: 'Payment could not be processed.' };

  revalidatePath('/dashboard/billing');
  revalidatePath('/dashboard');
  return { ok: true, data: { orderNo: paid.orderNo } };
}
