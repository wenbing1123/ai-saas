'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/server/auth';
import { refundOrder } from '@/lib/server/payments/order-service';
import type { ActionResult } from '@/lib/validators';

export async function refundOrderAction(orderId: string, amountCents?: number): Promise<ActionResult> {
  await requireAdmin();
  try {
    const order = await refundOrder(orderId, amountCents);
    if (!order) return { ok: false, error: 'Order not found.' };
    revalidatePath('/admin/orders');
    revalidatePath('/admin');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Refund failed.' };
  }
}
